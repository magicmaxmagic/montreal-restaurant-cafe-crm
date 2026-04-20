import { NextResponse } from "next/server";
import { writeBusinessesToDb } from "@/lib/business-db";
import { fetchMontrealBusinessesFromOsm } from "@/lib/osm-overpass";
import type { BusinessResponse } from "@/types/business";

export const dynamic = "force-dynamic";

export async function POST() {
  const lastSynced = new Date().toISOString();

  try {
    const businesses = await fetchMontrealBusinessesFromOsm();
    const source = await writeBusinessesToDb(businesses);

    const response: BusinessResponse = {
      businesses,
      lastSynced,
      source
    };

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      {
        businesses: [],
        lastSynced,
        source: "osm",
        warning: error instanceof Error ? error.message : "OpenStreetMap scraping failed."
      } satisfies BusinessResponse,
      { status: 502 }
    );
  }
}
