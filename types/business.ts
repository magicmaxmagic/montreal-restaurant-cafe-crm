export type LeadStatus = "new" | "contacted" | "qualified" | "closed";

export type LeadOverride = {
  notes?: string;
  emailed?: boolean;
  visited?: boolean;
  leadStatus?: LeadStatus;
};

export type LeadOverrides = Record<string, LeadOverride>;

export interface BusinessLead {
  id: string;
  name: string;
  category: string;
  address: string;
  borough: string;
  phone: string | null;
  website: string | null;
  openingHours: string | null;
  email: string | null;
  emailSource: "osm" | "website" | null;
  emailEnrichmentCheckedAt?: string | null;
  latitude: number | null;
  longitude: number | null;
  osmUrl: string;
  notes: string;
  emailed: boolean;
  visited: boolean;
  leadStatus: LeadStatus;
  source: "OpenStreetMap";
  createdAt: string;
}

export interface BusinessResponse {
  businesses: BusinessLead[];
  lastSynced: string;
  source: "postgres" | "json" | "osm" | "mock";
  total?: number;
  warning?: string;
}

export const leadStatuses: LeadStatus[] = ["new", "contacted", "qualified", "closed"];
