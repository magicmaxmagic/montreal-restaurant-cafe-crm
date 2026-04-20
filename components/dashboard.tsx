"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import dynamic from "next/dynamic";
import { BusinessDetailDrawer } from "@/components/business-detail-drawer";
import { CrmTable, type SortKey } from "@/components/crm-table";
import { FilterBar } from "@/components/filter-bar";
import { StatsCards } from "@/components/stats-cards";
import { Badge, Card, PrimaryButton } from "@/components/ui";
import { downloadCsv } from "@/lib/csv";
import { applyLeadOverrides, loadLeadOverrides, persistLeadOverride } from "@/lib/storage";
import type { BusinessLead, BusinessResponse, LeadOverride, LeadStatus } from "@/types/business";

const PAGE_SIZE = 50;
const LeadMap = dynamic(() => import("@/components/lead-map").then((mod) => mod.LeadMap), {
  ssr: false,
  loading: () => <Card className="h-[560px] p-5 text-sm text-slate-400">Loading map...</Card>
});

export function Dashboard() {
  const [businesses, setBusinesses] = useState<BusinessLead[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [borough, setBorough] = useState("");
  const [leadStatus, setLeadStatus] = useState<"" | LeadStatus>("");
  const [hasEmailOnly, setHasEmailOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [enrichingEmails, setEnrichingEmails] = useState(false);
  const [enrichingAllEmails, setEnrichingAllEmails] = useState(false);
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

  const scrapeBusinesses = useCallback(async () => {
    setScraping(true);
    setError(null);

    try {
      const response = await fetch("/api/businesses/scrape", { method: "POST", cache: "no-store" });
      const data = (await response.json()) as BusinessResponse;

      if (!response.ok) {
        throw new Error(data.warning ?? `Scrape failed with status ${response.status}`);
      }

      setBusinesses(applyLeadOverrides(data.businesses, loadLeadOverrides()));
      setLastSynced(data.lastSynced);
      setWarning(data.warning ?? null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to scrape OpenStreetMap.");
    } finally {
      setScraping(false);
    }
  }, []);

  const enrichEmails = useCallback(async () => {
    setEnrichingEmails(true);
    setError(null);

    try {
      const response = await fetch("/api/businesses/enrich-emails?limit=80", {
        method: "POST",
        cache: "no-store"
      });
      const data = (await response.json()) as { checked: number; found: number; remaining: number };

      if (!response.ok) {
        throw new Error(`Email enrichment failed with status ${response.status}`);
      }

      setWarning(`Checked ${data.checked} websites and found ${data.found} new emails. ${Math.max(0, data.remaining)} sites remain.`);
      await fetchBusinesses();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to enrich emails.");
    } finally {
      setEnrichingEmails(false);
    }
  }, [fetchBusinesses]);

  const enrichAllEmails = useCallback(async () => {
    setEnrichingAllEmails(true);
    setError(null);

    let checked = 0;
    let found = 0;

    try {
      for (let batch = 0; batch < 40; batch += 1) {
        const response = await fetch("/api/businesses/enrich-emails?limit=80", {
          method: "POST",
          cache: "no-store"
        });
        const data = (await response.json()) as { checked: number; found: number; remaining: number };

        if (!response.ok) {
          throw new Error(`Email enrichment failed with status ${response.status}`);
        }

        checked += data.checked;
        found += data.found;
        setWarning(`Finding all emails: checked ${checked} websites, found ${found}. ${Math.max(0, data.remaining)} sites remain.`);

        if (data.checked === 0 || data.remaining <= 0) break;
      }

      await fetchBusinesses();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to enrich all emails.");
    } finally {
      setEnrichingAllEmails(false);
    }
  }, [fetchBusinesses]);

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
          business.openingHours,
          business.email,
          business.notes,
          business.source
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return (
          (!normalizedQuery || searchable.includes(normalizedQuery)) &&
          (!category || business.category === category) &&
          (!borough || business.borough === borough) &&
          (!leadStatus || business.leadStatus === leadStatus) &&
          (!hasEmailOnly || Boolean(business.email))
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
  }, [borough, businesses, category, hasEmailOnly, leadStatus, query, sortDirection, sortKey]);

  useEffect(() => {
    setPage(1);
  }, [borough, category, hasEmailOnly, leadStatus, query, sortDirection, sortKey]);

  const totalPages = Math.max(1, Math.ceil(filteredBusinesses.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedBusinesses = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredBusinesses.slice(start, start + PAGE_SIZE);
  }, [currentPage, filteredBusinesses]);

  const resultLabel = useMemo(() => {
    const area = borough || "Montreal";
    const categoryLabel = category ? `${category.toLowerCase()} leads` : "restaurant and cafe leads";
    const statusLabel = leadStatus ? ` with ${leadStatus} status` : "";
    const emailLabel = hasEmailOnly ? " with email" : "";

    return `${filteredBusinesses.length} ${categoryLabel} in ${area}${statusLabel}${emailLabel}`;
  }, [borough, category, filteredBusinesses.length, hasEmailOnly, leadStatus]);

  async function persistServerOverride(id: string, update: LeadOverride) {
    const response = await fetch(`/api/businesses/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(update)
    });

    if (!response.ok) {
      throw new Error(`Override save failed with status ${response.status}`);
    }
  }

  function updateBusiness(id: string, update: LeadOverride) {
    setBusinesses((current) =>
      current.map((business) => (business.id === id ? { ...business, ...update } : business))
    );
    void persistServerOverride(id, update).catch(() => {
      persistLeadOverride(id, update);
      setWarning("Could not save this lead update to the server database. Saved locally in this browser instead.");
    });
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
              Montreal cafe and restaurant leads.
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-400">
              Search real Montreal hospitality leads, filter by neighborhood, qualify prospects, and export the
              current result set. OpenStreetMap data is read-only; notes and status persist locally.
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
          hasEmailOnly={hasEmailOnly}
          categories={categories}
          boroughs={boroughs}
          onQueryChange={setQuery}
          onCategoryChange={setCategory}
          onBoroughChange={setBorough}
          onLeadStatusChange={setLeadStatus}
          onHasEmailOnlyChange={setHasEmailOnly}
          onRefresh={fetchBusinesses}
          onScrape={scrapeBusinesses}
          onEnrichEmails={enrichEmails}
          onEnrichAllEmails={enrichAllEmails}
          onExport={() => downloadCsv(filteredBusinesses)}
          loading={loading}
          scraping={scraping}
          enrichingEmails={enrichingEmails}
          enrichingAllEmails={enrichingAllEmails}
        />

        <section className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Current results</p>
            <h2 className="mt-1 text-xl font-semibold text-white">{resultLabel}</h2>
            <p className="mt-1 text-sm text-slate-500">
              Showing {paginatedBusinesses.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0}-
              {Math.min(currentPage * PAGE_SIZE, filteredBusinesses.length)} of {filteredBusinesses.length}
            </p>
          </div>
          <p className="max-w-2xl text-sm text-slate-400">
            Use the Montreal neighborhood buttons above to jump straight to Plateau, Mile End, Old Montreal,
            Griffintown, Rosemont, Verdun, Little Italy, Outremont, Hochelaga, Saint-Henri, Villeray, or NDG.
          </p>
        </section>

        <LeadMap
          businesses={filteredBusinesses}
          activeBorough={borough}
          onBoroughChange={setBorough}
          onOpenBusiness={(business) => setSelectedBusinessId(business.id)}
        />

        {loading ? (
          <StateCard title="Loading businesses" message="Fetching and enriching Montreal restaurant and cafe leads..." />
        ) : error ? (
          <StateCard title="Unable to load data" message={error} action={<PrimaryButton onClick={fetchBusinesses}>Retry</PrimaryButton>} />
        ) : filteredBusinesses.length === 0 ? (
          <StateCard title="No matching leads" message="Adjust filters or refresh the OpenStreetMap data." />
        ) : (
          <CrmTable
            businesses={paginatedBusinesses}
            sortKey={sortKey}
            sortDirection={sortDirection}
            onSort={handleSort}
            page={currentPage}
            totalPages={totalPages}
            totalBusinesses={filteredBusinesses.length}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
            onOpenBusiness={(business) => setSelectedBusinessId(business.id)}
            onEmailedChange={(id, emailed) => updateBusiness(id, { emailed })}
            onVisitedChange={(id, visited) => updateBusiness(id, { visited })}
            onLeadStatusChange={(id, status) => updateBusiness(id, { leadStatus: status })}
            onNotesChange={(id, notes) => updateBusiness(id, { notes })}
          />
        )}
      </div>

      <BusinessDetailDrawer
        business={selectedBusiness}
        onClose={() => setSelectedBusinessId(null)}
        onEmailedChange={(id, emailed) => updateBusiness(id, { emailed })}
        onVisitedChange={(id, visited) => updateBusiness(id, { visited })}
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
