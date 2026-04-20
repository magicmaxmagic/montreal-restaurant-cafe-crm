import { NextRequest, NextResponse } from "next/server";
import { hasPostgresDatabase } from "@/lib/business-db";
import { runEmailEnrichmentBatch } from "@/lib/email-enrichment-job";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const CRON_BATCH_LIMIT = 10;

function isAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;

  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized cron request." }, { status: 401 });
  }

  if (process.env.VERCEL && !hasPostgresDatabase()) {
    return NextResponse.json({
      ok: true,
      job: "email-enrichment",
      skipped: true,
      reason: "POSTGRES_URL or DATABASE_URL is required for persistent email enrichment on Vercel."
    });
  }

  const result = await runEmailEnrichmentBatch({
    limit: CRON_BATCH_LIMIT,
    offset: 0
  });

  return NextResponse.json({
    ok: true,
    job: "email-enrichment",
    ...result
  });
}
