import { NextRequest, NextResponse } from "next/server";
import { updateLeadOverrideInDb } from "@/lib/business-db";
import { leadStatuses, type LeadOverride } from "@/types/business";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function isValidLeadOverride(value: unknown): value is LeadOverride {
  if (!value || typeof value !== "object") return false;
  const update = value as LeadOverride;

  return (
    (update.notes === undefined || typeof update.notes === "string") &&
    (update.emailed === undefined || typeof update.emailed === "boolean") &&
    (update.visited === undefined || typeof update.visited === "boolean") &&
    (update.leadStatus === undefined || leadStatuses.includes(update.leadStatus))
  );
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const update = (await request.json()) as unknown;

  if (!isValidLeadOverride(update)) {
    return NextResponse.json({ error: "Invalid lead override payload." }, { status: 400 });
  }

  const result = await updateLeadOverrideInDb(decodeURIComponent(id), update);
  return NextResponse.json(result);
}
