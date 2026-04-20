import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";
import type { BusinessLead, BusinessResponse, LeadOverride, LeadOverrides } from "@/types/business";

const DB_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "businesses.json");
const OVERRIDES_PATH = path.join(DB_DIR, "lead-overrides.json");
const TEMP_DB_PATH = path.join(DB_DIR, "businesses.tmp.json");
const TEMP_OVERRIDES_PATH = path.join(DB_DIR, "lead-overrides.tmp.json");

let sqlClient: ReturnType<typeof postgres> | null = null;
let schemaReady = false;

export type BusinessQuery = {
  query?: string;
  category?: string;
  borough?: string;
  emailOnly?: boolean;
  limit?: number;
  offset?: number;
};

function getPostgresUrl() {
  return process.env.POSTGRES_URL ?? process.env.DATABASE_URL ?? null;
}

function getSql() {
  const url = getPostgresUrl();
  if (!url) return null;

  sqlClient ??= postgres(url, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false
  });

  return sqlClient;
}

async function ensureSchema() {
  const sql = getSql();
  if (!sql || schemaReady) return;

  await sql`
    create table if not exists businesses (
      id text primary key,
      data jsonb not null,
      updated_at timestamptz not null default now()
    )
  `;
  await sql`
    create table if not exists lead_overrides (
      business_id text primary key,
      notes text,
      emailed boolean,
      visited boolean,
      lead_status text,
      updated_at timestamptz not null default now()
    )
  `;
  schemaReady = true;
}

function applyOverrides(businesses: BusinessLead[], overrides: LeadOverrides) {
  return businesses.map((business) => ({
    ...business,
    emailSource: business.emailSource ?? (business.email ? "osm" : null),
    emailEnrichmentCheckedAt: business.emailEnrichmentCheckedAt ?? null,
    notes: overrides[business.id]?.notes ?? business.notes,
    emailed: overrides[business.id]?.emailed ?? business.emailed,
    visited: overrides[business.id]?.visited ?? business.visited,
    leadStatus: overrides[business.id]?.leadStatus ?? business.leadStatus
  }));
}

async function readBusinessesFromJson(): Promise<BusinessLead[]> {
  try {
    const raw = await readFile(DB_PATH, "utf8");
    const parsed = JSON.parse(raw) as BusinessLead[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeBusinessesToJson(businesses: BusinessLead[]) {
  await mkdir(DB_DIR, { recursive: true });
  await writeFile(TEMP_DB_PATH, `${JSON.stringify(businesses, null, 2)}\n`, "utf8");
  await rename(TEMP_DB_PATH, DB_PATH);
}

async function readOverridesFromJson(): Promise<LeadOverrides> {
  try {
    const raw = await readFile(OVERRIDES_PATH, "utf8");
    const parsed = JSON.parse(raw) as LeadOverrides;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

async function writeOverridesToJson(overrides: LeadOverrides) {
  await mkdir(DB_DIR, { recursive: true });
  await writeFile(TEMP_OVERRIDES_PATH, `${JSON.stringify(overrides, null, 2)}\n`, "utf8");
  await rename(TEMP_OVERRIDES_PATH, OVERRIDES_PATH);
}

function filterBusinesses(businesses: BusinessLead[], filters: BusinessQuery) {
  const normalizedQuery = filters.query?.trim().toLowerCase();

  return businesses.filter((business) => {
    const searchable = [
      business.name,
      business.category,
      business.address,
      business.borough,
      business.phone,
      business.website,
      business.email,
      business.openingHours
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return (
      (!normalizedQuery || searchable.includes(normalizedQuery)) &&
      (!filters.category || business.category === filters.category) &&
      (!filters.borough || business.borough === filters.borough) &&
      (!filters.emailOnly || Boolean(business.email))
    );
  });
}

export function hasPostgresDatabase() {
  return Boolean(getPostgresUrl());
}

export async function readBusinessesFromDb(filters: BusinessQuery = {}): Promise<{
  businesses: BusinessLead[];
  source: BusinessResponse["source"];
  total: number;
}> {
  const sql = getSql();
  if (!sql) {
    const businesses = await readBusinessesFromJson();
    const overrides = await readOverridesFromJson();

    const filtered = filterBusinesses(applyOverrides(businesses, overrides), filters);
    return {
      businesses: filtered.slice(filters.offset ?? 0, filters.limit ? (filters.offset ?? 0) + filters.limit : undefined),
      source: "json",
      total: filtered.length
    };
  }

  await ensureSchema();
  const query = filters.query?.trim() ? `%${filters.query.trim().toLowerCase()}%` : null;
  const limit = filters.limit ?? null;
  const offset = filters.offset ?? 0;
  const rows = await sql<{ data: BusinessLead; total: string }[]>`
    select
      data
      || jsonb_build_object(
        'notes', coalesce(lead_overrides.notes, data->>'notes', ''),
        'emailed', coalesce(lead_overrides.emailed, ((data->>'emailed')::boolean), false),
        'visited', coalesce(lead_overrides.visited, ((data->>'visited')::boolean), false),
        'leadStatus', coalesce(lead_overrides.lead_status, data->>'leadStatus', 'new')
      ) as data,
      count(*) over() as total
    from businesses
    left join lead_overrides on lead_overrides.business_id = businesses.id
    where (${query}::text is null or lower(concat_ws(' ', data->>'name', data->>'category', data->>'address', data->>'borough', data->>'phone', data->>'website', data->>'email', data->>'openingHours')) like ${query})
      and (${filters.category ?? null}::text is null or data->>'category' = ${filters.category ?? null})
      and (${filters.borough ?? null}::text is null or data->>'borough' = ${filters.borough ?? null})
      and (${filters.emailOnly ?? false}::boolean = false or coalesce(data->>'email', '') <> '')
    order by lower(data->>'name') asc
    limit coalesce(${limit}::int, 2147483647)
    offset ${offset}
  `;

  return {
    businesses: rows.map((row) => row.data),
    source: "postgres",
    total: Number(rows[0]?.total ?? 0)
  };
}

export async function updateLeadOverrideInDb(id: string, update: LeadOverride): Promise<{
  override: LeadOverride;
  source: BusinessResponse["source"];
}> {
  const sql = getSql();
  if (!sql) {
    const overrides = await readOverridesFromJson();
    const next = {
      ...overrides,
      [id]: {
        ...overrides[id],
        ...update
      }
    };

    await writeOverridesToJson(next);
    return { override: next[id], source: "json" };
  }

  await ensureSchema();
  const rows = await sql<LeadOverride[]>`
    insert into lead_overrides (business_id, notes, emailed, visited, lead_status, updated_at)
    values (
      ${id},
      ${update.notes ?? null},
      ${update.emailed ?? null},
      ${update.visited ?? null},
      ${update.leadStatus ?? null},
      now()
    )
    on conflict (business_id) do update
    set notes = coalesce(excluded.notes, lead_overrides.notes),
        emailed = coalesce(excluded.emailed, lead_overrides.emailed),
        visited = coalesce(excluded.visited, lead_overrides.visited),
        lead_status = coalesce(excluded.lead_status, lead_overrides.lead_status),
        updated_at = now()
    returning
      notes,
      emailed,
      visited,
      lead_status as "leadStatus"
  `;

  return { override: rows[0] ?? update, source: "postgres" };
}

export async function updateBusinessEmailInDb(id: string, email: string): Promise<BusinessResponse["source"]> {
  const sql = getSql();
  if (!sql) {
    const businesses = await readBusinessesFromJson();
    await writeBusinessesToJson(
      businesses.map((business) =>
        business.id === id
          ? { ...business, email, emailSource: "website", emailEnrichmentCheckedAt: new Date().toISOString() }
          : business
      )
    );
    return "json";
  }

  await ensureSchema();
  await sql`
    update businesses
    set data = jsonb_set(
          jsonb_set(
            jsonb_set(data, '{email}', to_jsonb(${email}::text), true),
            '{emailSource}', to_jsonb('website'::text), true
          ),
          '{emailEnrichmentCheckedAt}', to_jsonb(${new Date().toISOString()}::text), true
        ),
        updated_at = now()
    where id = ${id}
  `;
  return "postgres";
}

export async function updateBusinessEmailsInDb(
  updates: Array<{ id: string; email: string }>
): Promise<BusinessResponse["source"]> {
  if (updates.length === 0) return hasPostgresDatabase() ? "postgres" : "json";

  const sql = getSql();
  if (!sql) {
    const checkedAt = new Date().toISOString();
    const updateMap = new Map(updates.map((update) => [update.id, update.email]));
    const businesses = await readBusinessesFromJson();
    await writeBusinessesToJson(
      businesses.map((business) => {
        const email = updateMap.get(business.id);
        return email ? { ...business, email, emailSource: "website", emailEnrichmentCheckedAt: checkedAt } : business;
      })
    );
    return "json";
  }

  await ensureSchema();
  await sql.begin(async (transaction) => {
    for (const update of updates) {
      await transaction`
        update businesses
        set data = jsonb_set(
              jsonb_set(
                jsonb_set(data, '{email}', to_jsonb(${update.email}::text), true),
                '{emailSource}', to_jsonb('website'::text), true
              ),
              '{emailEnrichmentCheckedAt}', to_jsonb(${new Date().toISOString()}::text), true
            ),
            updated_at = now()
        where id = ${update.id}
      `;
    }
  });
  return "postgres";
}

export async function markBusinessEmailCheckedInDb(id: string): Promise<BusinessResponse["source"]> {
  const checkedAt = new Date().toISOString();
  const sql = getSql();
  if (!sql) {
    const businesses = await readBusinessesFromJson();
    await writeBusinessesToJson(
      businesses.map((business) =>
        business.id === id ? { ...business, emailEnrichmentCheckedAt: checkedAt } : business
      )
    );
    return "json";
  }

  await ensureSchema();
  await sql`
    update businesses
    set data = jsonb_set(data, '{emailEnrichmentCheckedAt}', to_jsonb(${checkedAt}::text), true),
        updated_at = now()
    where id = ${id}
  `;
  return "postgres";
}

export async function markBusinessesEmailCheckedInDb(ids: string[]): Promise<BusinessResponse["source"]> {
  if (ids.length === 0) return hasPostgresDatabase() ? "postgres" : "json";

  const checkedAt = new Date().toISOString();
  const sql = getSql();
  if (!sql) {
    const idSet = new Set(ids);
    const businesses = await readBusinessesFromJson();
    await writeBusinessesToJson(
      businesses.map((business) =>
        idSet.has(business.id) ? { ...business, emailEnrichmentCheckedAt: checkedAt } : business
      )
    );
    return "json";
  }

  await ensureSchema();
  await sql`
    update businesses
    set data = jsonb_set(data, '{emailEnrichmentCheckedAt}', to_jsonb(${checkedAt}::text), true),
        updated_at = now()
    where id = any(${ids})
  `;
  return "postgres";
}

export async function writeBusinessesToDb(businesses: BusinessLead[]): Promise<BusinessResponse["source"]> {
  const sql = getSql();
  if (!sql) {
    await writeBusinessesToJson(businesses);
    return "json";
  }

  await ensureSchema();
  await sql.begin(async (transaction) => {
    await transaction`truncate table businesses`;
    for (const business of businesses) {
      await transaction`
        insert into businesses (id, data, updated_at)
        values (${business.id}, ${JSON.stringify(business)}::jsonb, now())
        on conflict (id) do update
        set data = excluded.data,
            updated_at = now()
      `;
    }
  });

  return "postgres";
}
