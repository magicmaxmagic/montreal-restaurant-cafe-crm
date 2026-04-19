import { NextResponse } from "next/server";
import { fetchMontrealBusinesses } from "@/lib/google-places";
import { mockBusinesses } from "@/lib/mock-data";
import type { BusinessResponse } from "@/types/business";

export const dynamic = "force-dynamic";

export async function GET() {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  const lastSynced = new Date().toISOString();

  if (!apiKey) {
    const response: BusinessResponse = {
      businesses: mockBusinesses,
      lastSynced,
      source: "mock",
      warning: "GOOGLE_MAPS_API_KEY is missing. Showing demo data."
    };

    return NextResponse.json(response);
  }

  try {
    const businesses = await fetchMontrealBusinesses(apiKey);
    const response: BusinessResponse = {
      businesses,
      lastSynced,
      source: "google_places"
    };

    return NextResponse.json(response);
  } catch (error) {
    const response: BusinessResponse = {
      businesses: mockBusinesses,
      lastSynced,
      source: "mock",
      warning: error instanceof Error ? error.message : "Google Places request failed. Showing demo data."
    };

    return NextResponse.json(response, { status: 200 });
  }
}
