import { businessCategories, MAX_DETAIL_CONCURRENCY, MAX_RESULTS_PER_QUERY, montrealAreas } from "@/lib/search-config";
import type { BusinessLead } from "@/types/business";

type PlaceSearchResult = {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  rating?: number;
  googleMapsUri?: string;
  businessStatus?: string;
  primaryTypeDisplayName?: { text?: string };
};

type PlaceDetailResult = PlaceSearchResult & {
  nationalPhoneNumber?: string;
  websiteUri?: string;
  regularOpeningHours?: {
    weekdayDescriptions?: string[];
  };
};

type SearchContext = {
  category: string;
  area: string;
};

const searchFieldMask = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.rating",
  "places.googleMapsUri",
  "places.businessStatus",
  "places.primaryTypeDisplayName"
].join(",");

const detailFieldMask = [
  "id",
  "displayName",
  "formattedAddress",
  "nationalPhoneNumber",
  "websiteUri",
  "regularOpeningHours",
  "rating",
  "googleMapsUri",
  "businessStatus",
  "primaryTypeDisplayName"
].join(",");

async function searchPlaces(apiKey: string, context: SearchContext): Promise<PlaceSearchResult[]> {
  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": searchFieldMask
    },
    body: JSON.stringify({
      textQuery: `${context.category} in ${context.area}, Montreal, Quebec`,
      includedType: undefined,
      maxResultCount: MAX_RESULTS_PER_QUERY,
      locationBias: {
        circle: {
          center: { latitude: 45.5019, longitude: -73.5674 },
          radius: 15000
        }
      }
    }),
    next: { revalidate: 0 }
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Google Places search failed: ${response.status} ${message}`);
  }

  const data = (await response.json()) as { places?: PlaceSearchResult[] };
  return data.places ?? [];
}

async function getPlaceDetails(apiKey: string, placeId: string): Promise<PlaceDetailResult> {
  const response = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
    headers: {
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": detailFieldMask
    },
    next: { revalidate: 0 }
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Google Places details failed: ${response.status} ${message}`);
  }

  return (await response.json()) as PlaceDetailResult;
}

async function mapWithConcurrency<T, R>(
  values: T[],
  limit: number,
  mapper: (value: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  let cursor = 0;

  async function worker() {
    while (cursor < values.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(values[index], index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, worker));
  return results;
}

function toBusinessLead(place: PlaceDetailResult, context: SearchContext): BusinessLead {
  const createdAt = new Date().toISOString();

  return {
    id: place.id,
    name: place.displayName?.text ?? "Unnamed business",
    category: place.primaryTypeDisplayName?.text ?? context.category,
    address: place.formattedAddress ?? "",
    borough: context.area,
    phone: place.nationalPhoneNumber ?? null,
    website: place.websiteUri ?? null,
    openingHours: place.regularOpeningHours?.weekdayDescriptions ?? [],
    rating: place.rating ?? null,
    googleMapsUrl: place.googleMapsUri ?? null,
    businessStatus: place.businessStatus ?? null,
    email: null,
    notes: "",
    leadStatus: "new",
    source: "Google Places",
    createdAt
  };
}

export async function fetchMontrealBusinesses(apiKey: string): Promise<BusinessLead[]> {
  const contexts = businessCategories.flatMap((category) =>
    montrealAreas.map((area) => ({ category, area }))
  );

  const searchResponses = await Promise.all(
    contexts.map(async (context) => ({
      context,
      places: await searchPlaces(apiKey, context)
    }))
  );

  const uniquePlaces = new Map<string, { place: PlaceSearchResult; context: SearchContext }>();

  for (const response of searchResponses) {
    for (const place of response.places) {
      if (place.id && !uniquePlaces.has(place.id)) {
        uniquePlaces.set(place.id, { place, context: response.context });
      }
    }
  }

  const entries = Array.from(uniquePlaces.values());
  const details = await mapWithConcurrency(entries, MAX_DETAIL_CONCURRENCY, async ({ place, context }) => {
    const enriched = await getPlaceDetails(apiKey, place.id);
    return toBusinessLead({ ...place, ...enriched }, context);
  });

  return details.sort((a, b) => a.name.localeCompare(b.name));
}
