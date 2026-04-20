import type { BusinessLead, LeadOverride, LeadOverrides } from "@/types/business";

const STORAGE_KEY = "montreal-crm-lead-overrides-v1";

export function loadLeadOverrides(): LeadOverrides {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as LeadOverrides) : {};
  } catch {
    return {};
  }
}

function saveLeadOverrides(overrides: LeadOverrides) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
}

export function applyLeadOverrides(businesses: BusinessLead[], overrides: LeadOverrides): BusinessLead[] {
  return businesses.map((business) => ({
    ...business,
    notes: overrides[business.id]?.notes ?? business.notes,
    emailed: overrides[business.id]?.emailed ?? business.emailed,
    visited: overrides[business.id]?.visited ?? business.visited,
    leadStatus: overrides[business.id]?.leadStatus ?? business.leadStatus
  }));
}

export function persistLeadOverride(id: string, update: LeadOverride) {
  const overrides = loadLeadOverrides();
  saveLeadOverrides({
    ...overrides,
    [id]: {
      ...overrides[id],
      ...update
    }
  });
}
