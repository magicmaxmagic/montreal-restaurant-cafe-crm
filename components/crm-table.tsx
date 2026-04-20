import { Button, Select, Textarea } from "@/components/ui";
import { leadStatuses, type BusinessLead, type LeadStatus } from "@/types/business";

export type SortKey = keyof Pick<BusinessLead, "name" | "category" | "borough" | "address" | "source" | "leadStatus" | "createdAt">;

type CrmTableProps = {
  businesses: BusinessLead[];
  sortKey: SortKey;
  sortDirection: "asc" | "desc";
  page: number;
  totalPages: number;
  totalBusinesses: number;
  pageSize: number;
  onSort: (key: SortKey) => void;
  onPageChange: (page: number) => void;
  onOpenBusiness: (business: BusinessLead) => void;
  onEmailedChange: (id: string, emailed: boolean) => void;
  onVisitedChange: (id: string, visited: boolean) => void;
  onLeadStatusChange: (id: string, leadStatus: LeadStatus) => void;
  onNotesChange: (id: string, notes: string) => void;
};

const columns: Array<{ key: SortKey; label: string }> = [
  { key: "name", label: "Business name" },
  { key: "category", label: "Category" },
  { key: "borough", label: "Borough" },
  { key: "address", label: "Address" }
];

export function CrmTable({
  businesses,
  sortKey,
  sortDirection,
  page,
  totalPages,
  totalBusinesses,
  pageSize,
  onSort,
  onPageChange,
  onOpenBusiness,
  onEmailedChange,
  onVisitedChange,
  onLeadStatusChange,
  onNotesChange
}: CrmTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.045]">
      <div className="flex flex-col gap-3 border-b border-white/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-400">
          Page {page} of {totalPages} · {totalBusinesses} leads · {pageSize} per page
        </p>
        <div className="flex items-center gap-2">
          <Button onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page <= 1}>
            Previous
          </Button>
          <Button onClick={() => onPageChange(Math.min(totalPages, page + 1))} disabled={page >= totalPages}>
            Next
          </Button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[1500px] divide-y divide-white/10 text-left text-sm">
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
              <th className="px-4 py-4">Email</th>
              <th className="px-4 py-4">Email source</th>
              <th className="px-4 py-4">Website</th>
              <th className="px-4 py-4">Mail sent</th>
              <th className="px-4 py-4">Visited</th>
              <th className="px-4 py-4">
                <button className="flex items-center gap-2 hover:text-slate-200" onClick={() => onSort("leadStatus")}>
                  Lead status
                  {sortKey === "leadStatus" ? <span>{sortDirection === "asc" ? "↑" : "↓"}</span> : null}
                </button>
              </th>
              <th className="px-4 py-4">Notes</th>
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
                <td className="px-4 py-4">
                  <span className="block max-w-72">{business.address || "Not available"}</span>
                </td>
                <td className="px-4 py-4">
                  {business.email ? (
                    <a className="text-accent-400 hover:underline" href={`mailto:${business.email}`}>
                      {business.email}
                    </a>
                  ) : (
                    "Not available"
                  )}
                </td>
                <td className="px-4 py-4">{business.emailSource ?? "Not available"}</td>
                <td className="px-4 py-4">
                  {business.website ? (
                    <a className="text-accent-400 hover:underline" href={business.website} target="_blank" rel="noreferrer">
                      Open site
                    </a>
                  ) : (
                    "Not available"
                  )}
                </td>
                <td className="px-4 py-4">
                  <label className="inline-flex items-center gap-2 whitespace-nowrap text-slate-200">
                    <input
                      type="checkbox"
                      checked={business.emailed}
                      onChange={(event) => onEmailedChange(business.id, event.target.checked)}
                      className="h-4 w-4 accent-accent-500"
                    />
                    {business.emailed ? "Done" : "No"}
                  </label>
                </td>
                <td className="px-4 py-4">
                  <label className="inline-flex items-center gap-2 whitespace-nowrap text-slate-200">
                    <input
                      type="checkbox"
                      checked={business.visited}
                      onChange={(event) => onVisitedChange(business.id, event.target.checked)}
                      className="h-4 w-4 accent-accent-500"
                    />
                    {business.visited ? "Done" : "No"}
                  </label>
                </td>
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
                <td className="px-4 py-4">
                  <Textarea
                    rows={2}
                    value={business.notes}
                    placeholder="Notes"
                    onChange={(event) => onNotesChange(business.id, event.target.value)}
                    className="min-w-64"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
