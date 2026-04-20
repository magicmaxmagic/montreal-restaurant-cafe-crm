import { NextRequest, NextResponse } from "next/server";
import { readBusinessesFromDb } from "@/lib/business-db";
import { mockBusinesses } from "@/lib/mock-data";
import type { BusinessResponse } from "@/types/business";

export const dynamic = "force-dynamic";

function fallbackResponse(lastSynced: string, warning: string) {
  const response: BusinessResponse = {
    businesses: mockBusinesses,
    lastSynced,
    source: "mock",
    warning
  };

  return NextResponse.json(response, { status: 200 });
}

export async function GET(request: NextRequest) {
  const lastSynced = new Date().toISOString();
  const url = new URL(request.url);

  try {
    const { businesses, source, total } = await readBusinessesFromDb({
      query: url.searchParams.get("q") ?? undefined,
      category: url.searchParams.get("category") ?? undefined,
      borough: url.searchParams.get("borough") ?? undefined,
      emailOnly: url.searchParams.get("emailOnly") === "true",
      limit: url.searchParams.get("limit") ? Number(url.searchParams.get("limit")) : undefined,
      offset: url.searchParams.get("offset") ? Number(url.searchParams.get("offset")) : undefined
    });

    if (businesses.length === 0) {
      return fallbackResponse(
        lastSynced,
        `The local business database has ${businesses.length} saved leads. Run the OpenStreetMap scraper to fill it. Showing fallback data for now.`
      );
    }

    const response: BusinessResponse = {
      businesses,
      lastSynced,
      source,
      total
    };

    return NextResponse.json(response);
  } catch (error) {
    return fallbackResponse(
      lastSynced,
      error instanceof Error
        ? `${error.message} Showing fallback data.`
        : "Could not read the local business database. Showing fallback data."
    );
  }
}
