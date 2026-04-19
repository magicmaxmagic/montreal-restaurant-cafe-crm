export type LeadStatus = "new" | "contacted" | "qualified" | "closed";

export type BusinessStatus = "OPERATIONAL" | "CLOSED_TEMPORARILY" | "CLOSED_PERMANENTLY" | string;

export interface BusinessLead {
  id: string;
  name: string;
  category: string;
  address: string;
  borough: string;
  phone: string | null;
  website: string | null;
  openingHours: string[];
  rating: number | null;
  googleMapsUrl: string | null;
  businessStatus: BusinessStatus | null;
  email: string | null;
  notes: string;
  leadStatus: LeadStatus;
  source: "Google Places" | "Mock Data";
  createdAt: string;
}

export interface BusinessResponse {
  businesses: BusinessLead[];
  lastSynced: string;
  source: "google_places" | "mock";
  warning?: string;
}

export const leadStatuses: LeadStatus[] = ["new", "contacted", "qualified", "closed"];
