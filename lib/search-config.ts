export const businessCategories = [
  "cafe",
  "coffee shop",
  "restaurant",
  "bakery",
  "brunch"
] as const;

export type MontrealArea = {
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
};

export const MIN_RESULTS_PER_NEIGHBORHOOD = 2;
export const MAX_RESULTS_PER_NEIGHBORHOOD = 2;

export const montrealAreas: MontrealArea[] = [
  { name: "Downtown", latitude: 45.5017, longitude: -73.5673, radiusMeters: 1600 },
  { name: "Plateau Mont-Royal", latitude: 45.5232, longitude: -73.587, radiusMeters: 1700 },
  { name: "Mile End", latitude: 45.5249, longitude: -73.601, radiusMeters: 1100 },
  { name: "Old Montreal", latitude: 45.5075, longitude: -73.5544, radiusMeters: 1100 },
  { name: "Griffintown", latitude: 45.4914, longitude: -73.5602, radiusMeters: 1100 },
  { name: "Rosemont", latitude: 45.5483, longitude: -73.5833, radiusMeters: 1800 },
  { name: "Verdun", latitude: 45.4594, longitude: -73.5659, radiusMeters: 1800 },
  { name: "Little Italy", latitude: 45.5323, longitude: -73.6154, radiusMeters: 1000 },
  { name: "Outremont", latitude: 45.5162, longitude: -73.6087, radiusMeters: 1300 },
  { name: "Hochelaga", latitude: 45.5448, longitude: -73.5456, radiusMeters: 1800 },
  { name: "Saint-Henri", latitude: 45.4795, longitude: -73.5857, radiusMeters: 1100 },
  { name: "Villeray", latitude: 45.5428, longitude: -73.6221, radiusMeters: 1500 },
  { name: "NDG", latitude: 45.4738, longitude: -73.6158, radiusMeters: 1800 }
];

export const montrealNeighborhoods = montrealAreas.map((area) => area.name);

export const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter"
] as const;
export const OVERPASS_TIMEOUT_MS = 28_000;
export const OVERPASS_CACHE_TTL_MS = 1000 * 60 * 20;
