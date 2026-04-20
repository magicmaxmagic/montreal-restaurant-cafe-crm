import { Badge, Button, Select, Textarea } from "@/components/ui";
import { leadStatuses, type BusinessLead, type LeadStatus } from "@/types/business";
import type { ReactNode } from "react";

type BusinessDetailDrawerProps = {
  business: BusinessLead | null;
  onClose: () => void;
  onEmailedChange: (id: string, emailed: boolean) => void;
  onVisitedChange: (id: string, visited: boolean) => void;
  onLeadStatusChange: (id: string, leadStatus: LeadStatus) => void;
  onNotesChange: (id: string, notes: string) => void;
};

export function BusinessDetailDrawer({
  business,
  onClose,
  onEmailedChange,
  onVisitedChange,
  onLeadStatusChange,
  onNotesChange
}: BusinessDetailDrawerProps) {
  if (!business) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm" role="dialog" aria-modal="true">
      <aside className="h-full w-full max-w-xl overflow-y-auto border-l border-white/10 bg-ink-950 p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Badge>{business.category}</Badge>
            <h2 className="mt-4 text-2xl font-semibold text-white">{business.name}</h2>
            <p className="mt-2 text-sm text-slate-400">{business.address || "Not available"}</p>
          </div>
          <Button onClick={onClose} aria-label="Close details">
            Close
          </Button>
        </div>

        <div className="mt-8 grid gap-4 text-sm">
          <Detail label="Borough" value={business.borough} />
          <Detail label="Address" value={business.address || "Not available"} />
          <Detail label="Phone" value={business.phone ?? "Not available"} />
          <Detail
            label="Email"
            value={
              business.email ? (
                <a className="text-accent-400 hover:underline" href={`mailto:${business.email}`}>
                  {business.email}
                </a>
              ) : (
                "Not available"
              )
            }
          />
          <Detail label="Email source" value={business.emailSource ?? "Not available"} />
          <Detail
            label="Website"
            value={
              business.website ? (
                <a className="text-accent-400 hover:underline" href={business.website} target="_blank" rel="noreferrer">
                  {business.website}
                </a>
              ) : (
                "Not available"
              )
            }
          />
          <Detail label="Mail sent" value={business.emailed ? "Yes" : "No"} />
          <Detail label="Visited" value={business.visited ? "Yes" : "No"} />
          <Detail
            label="Coordinates"
            value={
              business.latitude !== null && business.longitude !== null
                ? `${business.latitude.toFixed(5)}, ${business.longitude.toFixed(5)}`
                : "Not available"
            }
          />
          <Detail label="Source" value={business.source} />
          <Detail label="Created" value={new Date(business.createdAt).toLocaleString()} />
        </div>

        <div className="mt-8">
          <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Opening hours</h3>
          <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300">
            {business.openingHours ?? "Not available"}
          </div>
        </div>

        <div className="mt-8 grid gap-4">
          <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300 sm:grid-cols-2">
            <label className="inline-flex items-center gap-3">
              <input
                type="checkbox"
                checked={business.emailed}
                onChange={(event) => onEmailedChange(business.id, event.target.checked)}
                className="h-4 w-4 accent-accent-500"
              />
              Mail sent
            </label>
            <label className="inline-flex items-center gap-3">
              <input
                type="checkbox"
                checked={business.visited}
                onChange={(event) => onVisitedChange(business.id, event.target.checked)}
                className="h-4 w-4 accent-accent-500"
              />
              Visited
            </label>
          </div>
          <label className="grid gap-2 text-sm font-medium text-slate-300">
            Lead status
            <Select
              value={business.leadStatus}
              onChange={(event) => onLeadStatusChange(business.id, event.target.value as LeadStatus)}
            >
              {leadStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </Select>
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-300">
            Notes
            <Textarea
              rows={6}
              value={business.notes}
              placeholder="Add outreach notes, owner details, call history..."
              onChange={(event) => onNotesChange(business.id, event.target.value)}
            />
          </label>
        </div>
      </aside>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid gap-1 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
      <dt className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</dt>
      <dd className="break-words text-slate-200">{value}</dd>
    </div>
  );
}
