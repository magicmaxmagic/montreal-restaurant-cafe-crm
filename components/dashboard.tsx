"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { BusinessDetailDrawer } from "@/components/business-detail-drawer";
import { CrmTable, type SortKey } from "@/components/crm-table";
import { FilterBar } from "@/components/filter-bar";
import { StatsCards } from "@/components/stats-cards";
import { Badge, Card, PrimaryButton } from "@/components/ui";
import { downloadCsv } from "@/lib/csv";
import { applyLeadOverrides, loadLeadOverrides, persistLeadOverride } from "@/lib/storage";
import type { BusinessLead, BusinessResponse, LeadStatus } from "@/types/business";

export function Dashboard() {
  const [businesses, setBusinesses] = useState<BusinessLead[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [borough, setBorough] = useState("");
  const [leadStatus, setLeadStatus] = useState<"" | LeadStatus>("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBusinesses = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/businesses", { cache: "no-store" });
      if (!response.ok) throw new Error(`Request failed with status ${response.status}`);

      const data = (await response.json()) as BusinessResponse;
      setBusinesses(applyLeadOverrides(data.businesses, loadLeadOverrides()));
      setLastSynced(data.lastSynced);
      setWarning(data.warning ?? null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load businesses.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchBusinesses();
  }, [fetchBusinesses]);

  const selectedBusiness = useMemo(
    () => businesses.find((business) => business.id === selectedBusinessId) ?? null,
    [businesses, selectedBusinessId]
  );

  const categories = useMemo(
    () => Array.from(new Set(businesses.map((business) => business.category))).sort(),
    [businesses]
  );
  const boroughs = useMemo(
    () => Array.from(new Set(businesses.map((business) => business.borough))).sort(),
    [businesses]
  );

  const filteredBusinesses = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return businesses
      .filter((business) => {
        const searchable = [
          business.name,
          business.category,
          business.address,
          business.borough,
          business.phone,
          business.website,
          business.notes,
          business.businessStatus,
          business.source
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return (
          (!normalizedQuery || searchable.includes(normalizedQuery)) &&
          (!category || business.category === category) &&
          (!borough || business.borough === borough) &&
          (!leadStatus || business.leadStatus === leadStatus)
        );
      })
      .sort((left, right) => {
        const leftValue = left[sortKey] ?? "";
        const rightValue = right[sortKey] ?? "";
        const multiplier = sortDirection === "asc" ? 1 : -1;

        if (typeof leftValue === "number" && typeof rightValue === "number") {
          return (leftValue - rightValue) * multiplier;
        }

        return String(leftValue).localeCompare(String(rightValue)) * multiplier;
      });
  }, [borough, businesses, category, leadStatus, query, sortDirection, sortKey]);

  function updateBusiness(id: string, update: Partial<Pick<BusinessLead, "notes" | "leadStatus">>) {
    setBusinesses((current) =>
      current.map((business) => (business.id === id ? { ...business, ...update } : business))
    );
    persistLeadOverride(id, update);
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(key);
    setSortDirection("asc");
  }

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1800px] flex-col gap-6">
        <header className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <Badge>Montreal lead-generation CRM</Badge>
            <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight text-white md:text-6xl">
              Restaurant and cafe intelligence dashboard.
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-400">
              Search, qualify, export, and manage Montreal hospitality leads. Google data is read-only;
              notes and status persist locally for a Supabase-ready migration path.
            </p>
          </div>
          <Card className="p-4 text-sm text-slate-400">
            <p className="text-slate-500">Last synced</p>
            <p className="mt-1 font-medium text-white">{lastSynced ? new Date(lastSynced).toLocaleString() : "Not synced yet"}</p>
          </Card>
        </header>

        {warning ? (
          <Card className="border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100">{warning}</Card>
        ) : null}

        <StatsCards businesses={filteredBusinesses} />

        <FilterBar
          query={query}
          category={category}
          borough={borough}
          leadStatus={leadStatus}
          categories={categories}
          boroughs={boroughs}
          onQueryChange={setQuery}
          onCategoryChange={setCategory}
          onBoroughChange={setBorough}
          onLeadStatusChange={setLeadStatus}
          onRefresh={fetchBusinesses}
          onExport={() => downloadCsv(filteredBusinesses)}
          loading={loading}
        />

        {loading ? (
          <StateCard title="Loading businesses" message="Fetching and enriching Montreal restaurant and cafe leads..." />
        ) : error ? (
          <StateCard title="Unable to load data" message={error} action={<PrimaryButton onClick={fetchBusinesses}>Retry</PrimaryButton>} />
        ) : filteredBusinesses.length === 0 ? (
          <StateCard title="No matching leads" message="Adjust filters or refresh the Places data." />
        ) : (
          <CrmTable
            businesses={filteredBusinesses}
            sortKey={sortKey}
            sortDirection={sortDirection}
            onSort={handleSort}
            onOpenBusiness={(business) => setSelectedBusinessId(business.id)}
            onLeadStatusChange={(id, status) => updateBusiness(id, { leadStatus: status })}
            onNotesChange={(id, notes) => updateBusiness(id, { notes })}
          />
        )}
      </div>

      <BusinessDetailDrawer
        business={selectedBusiness}
        onClose={() => setSelectedBusinessId(null)}
        onLeadStatusChange={(id, status) => updateBusiness(id, { leadStatus: status })}
        onNotesChange={(id, notes) => updateBusiness(id, { notes })}
      />
    </main>
  );
}

function StateCard({ title, message, action }: { title: string; message: string; action?: ReactNode }) {
  return (
    <Card className="flex min-h-72 flex-col items-center justify-center p-8 text-center">
      <h2 className="text-xl font-semibold text-white">{title}</h2>
      <p className="mt-2 max-w-md text-sm text-slate-400">{message}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </Card>
  );
}
