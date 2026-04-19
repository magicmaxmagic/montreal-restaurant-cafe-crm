import { Badge, Select, Textarea } from "@/components/ui";
import { leadStatuses, type BusinessLead, type LeadStatus } from "@/types/business";

export type SortKey = keyof Pick<BusinessLead, "name" | "category" | "borough" | "rating" | "leadStatus" | "createdAt">;

type CrmTableProps = {
  businesses: BusinessLead[];
  sortKey: SortKey;
  sortDirection: "asc" | "desc";
  onSort: (key: SortKey) => void;
  onOpenBusiness: (business: BusinessLead) => void;
  onLeadStatusChange: (id: string, leadStatus: LeadStatus) => void;
  onNotesChange: (id: string, notes: string) => void;
};

const columns: Array<{ key: SortKey; label: string }> = [
  { key: "name", label: "Business name" },
  { key: "category", label: "Category" },
  { key: "borough", label: "Borough" },
  { key: "rating", label: "Rating" },
  { key: "leadStatus", label: "Lead status" },
  { key: "createdAt", label: "Created" }
];

export function CrmTable({
  businesses,
  sortKey,
  sortDirection,
  onSort,
  onOpenBusiness,
  onLeadStatusChange,
  onNotesChange
}: CrmTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.045]">
      <div className="overflow-x-auto">
        <table className="min-w-[1700px] divide-y divide-white/10 text-left text-sm">
          <thead className="bg-white/[0.04] text-xs uppercase tracking-[0.16em] text-slate-500">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className="px-4 py-4">
                  <button className="flex items-center gap-2 hover:text-slate-200" onClick={() => onSort(column.key)}>
                    {column.label}
                    {sortKey === column.key ? <span>{sortDirection === "asc" ? "↑" : "↓"}</span> : null}
                  </button>
                </th>
              ))}
              <th className="px-4 py-4">Address</th>
              <th className="px-4 py-4">Phone number</th>
              <th className="px-4 py-4">Website</th>
              <th className="px-4 py-4">Opening hours</th>
              <th className="px-4 py-4">Google Maps</th>
              <th className="px-4 py-4">Business status</th>
              <th className="px-4 py-4">Email</th>
              <th className="px-4 py-4">Notes</th>
              <th className="px-4 py-4">Source</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {businesses.map((business) => (
              <tr key={business.id} className="align-top text-slate-300 transition hover:bg-white/[0.035]">
                <td className="px-4 py-4">
                  <button className="max-w-64 text-left font-medium text-white hover:text-accent-400" onClick={() => onOpenBusiness(business)}>
                    {business.name}
                  </button>
                </td>
                <td className="px-4 py-4">{business.category}</td>
                <td className="px-4 py-4">{business.borough}</td>
                <td className="px-4 py-4">{business.rating ?? "—"}</td>
                <td className="px-4 py-4">
                  <Select
                    value={business.leadStatus}
                    onChange={(event) => onLeadStatusChange(business.id, event.target.value as LeadStatus)}
                    className="min-w-36"
                  >
                    {leadStatuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </Select>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">{new Date(business.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-4">
                  <span className="block max-w-72">{business.address || "—"}</span>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">{business.phone ?? "—"}</td>
                <td className="px-4 py-4">
                  {business.website ? (
                    <a className="text-accent-400 hover:underline" href={business.website} target="_blank" rel="noreferrer">
                      Website
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-4">
                  <span className="line-clamp-3 block max-w-64">
                    {business.openingHours.length ? business.openingHours.join(" | ") : "—"}
                  </span>
                </td>
                <td className="px-4 py-4">
                  {business.googleMapsUrl ? (
                    <a className="text-accent-400 hover:underline" href={business.googleMapsUrl} target="_blank" rel="noreferrer">
                      Maps
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-4">
                  <Badge>{business.businessStatus ?? "—"}</Badge>
                </td>
                <td className="px-4 py-4">{business.email ?? "Not available from Google Places"}</td>
                <td className="px-4 py-4">
                  <Textarea
                    rows={2}
                    value={business.notes}
                    placeholder="Lead notes"
                    onChange={(event) => onNotesChange(business.id, event.target.value)}
                    className="min-w-64"
                  />
                </td>
                <td className="px-4 py-4">{business.source}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
