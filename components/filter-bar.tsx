import { Button, Card, Input, PrimaryButton, Select } from "@/components/ui";
import { leadStatuses, type LeadStatus } from "@/types/business";

type FilterBarProps = {
  query: string;
  category: string;
  borough: string;
  leadStatus: "" | LeadStatus;
  categories: string[];
  boroughs: string[];
  onQueryChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onBoroughChange: (value: string) => void;
  onLeadStatusChange: (value: "" | LeadStatus) => void;
  onRefresh: () => void;
  onExport: () => void;
  loading: boolean;
};

export function FilterBar({
  query,
  category,
  borough,
  leadStatus,
  categories,
  boroughs,
  onQueryChange,
  onCategoryChange,
  onBoroughChange,
  onLeadStatusChange,
  onRefresh,
  onExport,
  loading
}: FilterBarProps) {
  return (
    <Card className="p-4">
      <div className="grid gap-3 lg:grid-cols-[1.6fr_1fr_1fr_1fr_auto_auto]">
        <Input
          aria-label="Search businesses"
          placeholder="Search by name, address, phone, notes..."
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
        <Select aria-label="Filter borough" value={borough} onChange={(event) => onBoroughChange(event.target.value)}>
          <option value="">All boroughs</option>
          {boroughs.map((item) => (
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
        <PrimaryButton onClick={onRefresh} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh data"}
        </PrimaryButton>
      </div>
    </Card>
  );
}
