import type { BusinessLead } from "@/types/business";

const headers: Array<keyof BusinessLead> = [
  "id",
  "name",
  "category",
  "address",
  "borough",
  "phone",
  "website",
  "openingHours",
  "email",
  "emailSource",
  "emailEnrichmentCheckedAt",
  "latitude",
  "longitude",
  "osmUrl",
  "notes",
  "emailed",
  "visited",
  "leadStatus",
  "source",
  "createdAt"
];

function escapeCsvValue(value: unknown): string {
  const normalized = value ?? "";
  const text = String(normalized);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function toCsv(businesses: BusinessLead[]): string {
  return [
    headers.join(","),
    ...businesses.map((business) => headers.map((header) => escapeCsvValue(business[header])).join(","))
  ].join("\n");
}

export function downloadCsv(businesses: BusinessLead[], filename = "montreal-restaurant-cafe-leads.csv") {
  const blob = new Blob([toCsv(businesses)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
