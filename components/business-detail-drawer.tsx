import { Badge, Button, Select, Textarea } from "@/components/ui";
import { leadStatuses, type BusinessLead, type LeadStatus } from "@/types/business";
import type { ReactNode } from "react";

type BusinessDetailDrawerProps = {
  business: BusinessLead | null;
  onClose: () => void;
  onLeadStatusChange: (id: string, leadStatus: LeadStatus) => void;
  onNotesChange: (id: string, notes: string) => void;
};

export function BusinessDetailDrawer({
  business,
  onClose,
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
            <p className="mt-2 text-sm text-slate-400">{business.address}</p>
          </div>
          <Button onClick={onClose} aria-label="Close details">
            Close
          </Button>
        </div>

        <div className="mt-8 grid gap-4 text-sm">
          <Detail label="Borough" value={business.borough} />
          <Detail label="Phone" value={business.phone ?? "—"} />
          <Detail
            label="Website"
            value={
              business.website ? (
                <a className="text-accent-400 hover:underline" href={business.website} target="_blank" rel="noreferrer">
                  {business.website}
                </a>
              ) : (
                "—"
              )
            }
          />
          <Detail
            label="Google Maps"
            value={
              business.googleMapsUrl ? (
                <a className="text-accent-400 hover:underline" href={business.googleMapsUrl} target="_blank" rel="noreferrer">
                  Open listing
                </a>
              ) : (
                "—"
              )
            }
          />
          <Detail label="Rating" value={business.rating?.toString() ?? "—"} />
          <Detail label="Business status" value={business.businessStatus ?? "—"} />
          <Detail label="Email" value={business.email ?? "Not available from Google Places"} />
          <Detail label="Source" value={business.source} />
          <Detail label="Created" value={new Date(business.createdAt).toLocaleString()} />
        </div>

        <div className="mt-8">
          <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Opening hours</h3>
          <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300">
            {business.openingHours.length ? (
              <ul className="space-y-1">
                {business.openingHours.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ) : (
              "No hours available."
            )}
          </div>
        </div>

        <div className="mt-8 grid gap-4">
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
