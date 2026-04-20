import { Button, Card, Input, PrimaryButton, Select } from "@/components/ui";
import { montrealNeighborhoods } from "@/lib/search-config";
import { leadStatuses, type LeadStatus } from "@/types/business";

type FilterBarProps = {
  query: string;
  category: string;
  borough: string;
  leadStatus: "" | LeadStatus;
  hasEmailOnly: boolean;
  categories: string[];
  boroughs: string[];
  onQueryChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onBoroughChange: (value: string) => void;
  onLeadStatusChange: (value: "" | LeadStatus) => void;
  onHasEmailOnlyChange: (value: boolean) => void;
  onRefresh: () => void;
  onScrape: () => void;
  onEnrichEmails: () => void;
  onEnrichAllEmails: () => void;
  onExport: () => void;
  loading: boolean;
  scraping: boolean;
  enrichingEmails: boolean;
  enrichingAllEmails: boolean;
};

export function FilterBar({
  query,
  category,
  borough,
  leadStatus,
  hasEmailOnly,
  categories,
  boroughs,
  onQueryChange,
  onCategoryChange,
  onBoroughChange,
  onLeadStatusChange,
  onHasEmailOnlyChange,
  onRefresh,
  onScrape,
  onEnrichEmails,
  onEnrichAllEmails,
  onExport,
  loading,
  scraping,
  enrichingEmails,
  enrichingAllEmails
}: FilterBarProps) {
  const neighborhoodOptions = Array.from(new Set([...montrealNeighborhoods, ...boroughs])).sort();

  return (
    <Card className="p-4">
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-medium text-white">Montreal filters</p>
          <p className="text-xs text-slate-500">Start with a neighborhood, then refine by category, status, or keyword.</p>
        </div>
        <Button
          type="button"
          onClick={() => {
            onQueryChange("");
            onCategoryChange("");
            onBoroughChange("");
            onLeadStatusChange("");
          }}
        >
          All Montreal
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {montrealNeighborhoods.map((neighborhood) => (
          <button
            key={neighborhood}
            type="button"
            onClick={() => onBoroughChange(neighborhood)}
            className={[
              "rounded-full border px-3 py-1.5 text-xs font-medium transition",
              borough === neighborhood
                ? "border-accent-400 bg-accent-500 text-white"
                : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
            ].join(" ")}
          >
            {neighborhood}
          </button>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.6fr_1fr_1fr_1fr_auto_auto_auto_auto_auto]">
        <Input
          aria-label="Search businesses"
          placeholder="Search Montreal by name, address, phone, notes..."
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
        />
        <Select aria-label="Filter category" value={category} onChange={(event) => onCategoryChange(event.target.value)}>
          <option value="">All categories</option>
          {categories.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </Select>
        <Select aria-label="Filter Montreal neighborhood" value={borough} onChange={(event) => onBoroughChange(event.target.value)}>
          <option value="">All Montreal neighborhoods</option>
          {neighborhoodOptions.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Filter lead status"
          value={leadStatus}
          onChange={(event) => onLeadStatusChange(event.target.value as "" | LeadStatus)}
        >
          <option value="">All statuses</option>
          {leadStatuses.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </Select>
        <Button onClick={onExport}>Export CSV</Button>
        <Button onClick={onScrape} disabled={scraping || loading}>
          {scraping ? "Scraping..." : "Scrape OSM"}
        </Button>
        <Button onClick={onEnrichEmails} disabled={enrichingEmails || loading || scraping}>
          {enrichingEmails ? "Finding..." : "Find emails"}
        </Button>
        <Button onClick={onEnrichAllEmails} disabled={enrichingAllEmails || enrichingEmails || loading || scraping}>
          {enrichingAllEmails ? "Finding all..." : "Find all emails"}
        </Button>
        <PrimaryButton onClick={onRefresh} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh data"}
        </PrimaryButton>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200">
          <input
            type="checkbox"
            checked={hasEmailOnly}
            onChange={(event) => onHasEmailOnlyChange(event.target.checked)}
            className="h-4 w-4 accent-accent-500"
          />
          Emails only
        </label>
      </div>
    </Card>
  );
}
