import { NextRequest, NextResponse } from "next/server";
import { hasPostgresDatabase } from "@/lib/business-db";
import { runEmailEnrichmentBatch } from "@/lib/email-enrichment-job";

export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 40;
const MAX_LIMIT = 120;

export async function POST(request: NextRequest) {
  if (process.env.VERCEL && !hasPostgresDatabase()) {
    return NextResponse.json(
      {
        checked: 0,
        found: 0,
        remaining: 0,
        offset: 0,
        limit: 0,
        updated: [],
        warning: "POSTGRES_URL or DATABASE_URL is required for persistent email enrichment on Vercel."
      },
      { status: 409 }
    );
  }

  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? DEFAULT_LIMIT), MAX_LIMIT);
  const offset = Math.max(Number(url.searchParams.get("offset") ?? 0), 0);
  return NextResponse.json(await runEmailEnrichmentBatch({ limit, offset }));
}
