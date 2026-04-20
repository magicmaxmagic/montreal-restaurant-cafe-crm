import {
  OVERPASS_CACHE_TTL_MS,
  OVERPASS_ENDPOINTS,
  OVERPASS_TIMEOUT_MS,
  montrealAreas,
  type MontrealArea
} from "@/lib/search-config";
import type { BusinessLead } from "@/types/business";

type OsmElementType = "node" | "way" | "relation";

type OsmTags = Record<string, string | undefined>;

type OsmElement = {
  type: OsmElementType;
  id: number;
  lat?: number;
  lon?: number;
  center?: {
    lat?: number;
    lon?: number;
  };
  tags?: OsmTags;
};

type OverpassResponse = {
  elements?: OsmElement[];
  remark?: string;
};

let memoryCache: { businesses: BusinessLead[]; expiresAt: number } | null = null;

function buildMontrealQuery() {
  return `
[out:json][timeout:25];
(
  node(45.42,-73.70,45.60,-73.48)["amenity"~"^(restaurant|cafe)$"];
  node(45.42,-73.70,45.60,-73.48)["shop"~"^(bakery|coffee)$"];
  node(45.42,-73.70,45.60,-73.48)["amenity"~"^(restaurant|cafe)$"]["cuisine"~"(brunch|breakfast|coffee|coffee_shop)",i];
);
out body;
`.trim();
}

async function fetchWithTimeout(endpoint: string, query: string, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        "User-Agent": "montreal-restaurant-cafe-crm/1.0"
      },
      body: new URLSearchParams({ data: query }),
      signal: controller.signal,
      next: { revalidate: 0 }
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchOverpassElements(query: string, attempt = 1): Promise<OsmElement[]> {
  const endpoint = OVERPASS_ENDPOINTS[attempt - 1] ?? OVERPASS_ENDPOINTS[0];
  let response: Response;

  try {
    response = await fetchWithTimeout(endpoint, query, OVERPASS_TIMEOUT_MS);
  } catch (error) {
    if (attempt < OVERPASS_ENDPOINTS.length) {
      await new Promise((resolve) => setTimeout(resolve, 900));
      return fetchOverpassElements(query, attempt + 1);
    }

    throw error;
  }

  if (!response.ok) {
    if ((response.status === 429 || response.status >= 500) && attempt < OVERPASS_ENDPOINTS.length) {
      await new Promise((resolve) => setTimeout(resolve, 900));
      return fetchOverpassElements(query, attempt + 1);
    }

    const message = await response.text();
    throw new Error(`Overpass request failed at ${endpoint}: ${response.status} ${message.slice(0, 180)}`);
  }

  const data = (await response.json()) as OverpassResponse;
  if (data.remark) {
    throw new Error(`Overpass returned a warning: ${data.remark}`);
  }

  return data.elements ?? [];
}

function getCoordinate(element: OsmElement) {
  return {
    latitude: element.lat ?? element.center?.lat ?? null,
    longitude: element.lon ?? element.center?.lon ?? null
  };
}

function normalizeWebsite(tags: OsmTags) {
  const website = tags.website ?? tags["contact:website"] ?? tags.url;
  if (!website) return null;
  return website.startsWith("http://") || website.startsWith("https://") ? website : `https://${website}`;
}

function normalizeEmail(tags: OsmTags) {
  const value = tags.email ?? tags["contact:email"] ?? tags["operator:email"];
  if (!value) return null;

  const email = value
    .split(/[;, ]/)
    .map((item) => item.trim())
    .find((item) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item));

  return email ?? null;
}

function normalizePhone(tags: OsmTags) {
  return tags.phone ?? tags["contact:phone"] ?? tags["contact:mobile"] ?? null;
}

function normalizeName(tags: OsmTags) {
  return (tags["name:fr"] ?? tags.name ?? tags.brand ?? tags.operator ?? "").trim();
}

function formatAddress(tags: OsmTags) {
  const explicitAddress = tags["addr:full"];
  if (explicitAddress) return explicitAddress;

  const streetNumber = tags["addr:housenumber"];
  const street = tags["addr:street"];
  const place = tags["addr:place"];
  const unit = tags["addr:unit"];
  const city = tags["addr:city"];
  const province = tags["addr:province"] ?? tags["addr:state"];
  const postcode = tags["addr:postcode"];

  const streetLine = [streetNumber, street ?? place].filter(Boolean).join(" ");
  const address = [streetLine, unit ? `Unit ${unit}` : null, city, province, postcode].filter(Boolean).join(", ");

  return address;
}

function formatCategory(tags: OsmTags) {
  const amenity = tags.amenity?.replaceAll("_", " ");
  const shop = tags.shop?.replaceAll("_", " ");
  const cuisine = tags.cuisine?.split(";").find(Boolean)?.replaceAll("_", " ");

  if (shop === "bakery") return "Bakery";
  if (shop === "coffee") return "Coffee Shop";
  if (shop === "pastry") return "Pastry Shop";
  if (shop === "deli") return "Deli";
  if (shop === "confectionery") return "Confectionery";
  if (cuisine?.toLowerCase().includes("brunch")) return "Brunch";
  if (amenity === "cafe" && cuisine?.toLowerCase().includes("coffee")) return "Coffee Shop";
  if (amenity === "cafe") return "Cafe";
  if (amenity === "fast food") return "Fast Food";
  if (amenity === "food court") return "Food Court";
  if (amenity === "ice cream") return "Ice Cream";
  if (amenity === "bar") return "Bar";
  if (amenity === "pub") return "Pub";
  if (amenity === "restaurant" && cuisine) return `${capitalize(cuisine)} Restaurant`;
  if (amenity === "restaurant") return "Restaurant";

  return "Restaurant";
}

function capitalize(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizeKey(value: string | null | undefined) {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function coordinateKey(latitude: number | null, longitude: number | null) {
  if (latitude === null || longitude === null) return null;
  return `${latitude.toFixed(5)},${longitude.toFixed(5)}`;
}

function distanceMeters(latitude: number, longitude: number, area: MontrealArea) {
  const earthRadiusMeters = 6_371_000;
  const latitudeDelta = ((area.latitude - latitude) * Math.PI) / 180;
  const longitudeDelta = ((area.longitude - longitude) * Math.PI) / 180;
  const originLatitude = (latitude * Math.PI) / 180;
  const areaLatitude = (area.latitude * Math.PI) / 180;
  const haversine =
    Math.sin(latitudeDelta / 2) * Math.sin(latitudeDelta / 2) +
    Math.cos(originLatitude) *
      Math.cos(areaLatitude) *
      Math.sin(longitudeDelta / 2) *
      Math.sin(longitudeDelta / 2);

  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function findNearestAreaName(latitude: number | null, longitude: number | null) {
  if (latitude === null || longitude === null) return "Montreal";

  return montrealAreas.reduce((nearest, area) =>
    distanceMeters(latitude, longitude, area) < distanceMeters(latitude, longitude, nearest) ? area : nearest
  ).name;
}

function toBusinessLead(element: OsmElement, areaName: string): BusinessLead | null {
  const tags = element.tags ?? {};
  const name = normalizeName(tags);
  if (!name) return null;

  const { latitude, longitude } = getCoordinate(element);
  const address = formatAddress(tags);
  const email = normalizeEmail(tags);

  return {
    id: `osm-${normalizeKey(areaName)}-${element.type}-${element.id}`,
    name,
    category: formatCategory(tags),
    address,
    borough: areaName,
    phone: normalizePhone(tags),
    website: normalizeWebsite(tags),
    openingHours: tags.opening_hours ?? null,
    email,
    emailSource: email ? "osm" : null,
    emailEnrichmentCheckedAt: null,
    latitude,
    longitude,
    osmUrl: `https://www.openstreetmap.org/${element.type}/${element.id}`,
    notes: "",
    emailed: false,
    visited: false,
    leadStatus: "new",
    source: "OpenStreetMap",
    createdAt: new Date().toISOString()
  };
}

export function dedupeBusinesses(businesses: BusinessLead[]) {
  const byOsmId = new Set<string>();
  const byNameAndAddress = new Set<string>();
  const byNameAndCoordinate = new Set<string>();
  const deduped: BusinessLead[] = [];

  for (const business of businesses) {
    const nameKey = normalizeKey(business.name);
    const addressKey = normalizeKey(business.address);
    const coords = coordinateKey(business.latitude, business.longitude);
    const nameAndAddress = addressKey ? `${nameKey}|${addressKey}` : null;
    const nameAndCoordinate = coords ? `${nameKey}|${coords}` : null;

    if (byOsmId.has(business.id)) continue;
    if (nameAndAddress && byNameAndAddress.has(nameAndAddress)) continue;
    if (nameAndCoordinate && byNameAndCoordinate.has(nameAndCoordinate)) continue;

    byOsmId.add(business.id);
    if (nameAndAddress) byNameAndAddress.add(nameAndAddress);
    if (nameAndCoordinate) byNameAndCoordinate.add(nameAndCoordinate);
    deduped.push(business);
  }

  return deduped.sort((left, right) => left.name.localeCompare(right.name));
}

export async function fetchMontrealBusinessesFromOsm(): Promise<BusinessLead[]> {
  if (memoryCache && memoryCache.expiresAt > Date.now()) {
    return memoryCache.businesses;
  }

  const elements = await fetchOverpassElements(buildMontrealQuery());
  const normalized = elements
    .map((element) => {
      const { latitude, longitude } = getCoordinate(element);
      return toBusinessLead(element, findNearestAreaName(latitude, longitude));
    })
    .filter((business): business is BusinessLead => business !== null);
  const businesses = dedupeBusinesses(normalized);

  memoryCache = {
    businesses,
    expiresAt: Date.now() + OVERPASS_CACHE_TTL_MS
  };

  return businesses;
}
