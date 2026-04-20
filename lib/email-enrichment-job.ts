import { markBusinessesEmailCheckedInDb, readBusinessesFromDb, updateBusinessEmailsInDb } from "@/lib/business-db";
import { enrichBusinessEmail, selectBusinessesForEmailEnrichment } from "@/lib/email-enrichment";

const EMAIL_ENRICHMENT_CONCURRENCY = 5;

async function mapWithConcurrency<T, R>(
  values: T[],
  limit: number,
  mapper: (value: T) => Promise<R>
) {
  const results: R[] = [];
  let cursor = 0;

  async function worker() {
    while (cursor < values.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(values[index]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, worker));
  return results;
}

export async function runEmailEnrichmentBatch({ limit, offset }: { limit: number; offset: number }) {
  const { businesses, source } = await readBusinessesFromDb();
  const candidates = selectBusinessesForEmailEnrichment(businesses, limit, offset);
  const results = await mapWithConcurrency(candidates, EMAIL_ENRICHMENT_CONCURRENCY, async (business) => {
    const result = await enrichBusinessEmail(business);
    return result.email ? { id: business.id, email: result.email } : null;
  });
  const found = results.filter((result): result is { id: string; email: string } => result !== null);
  const foundIds = new Set(found.map((result) => result.id));
  const checkedWithoutEmail = candidates.map((business) => business.id).filter((id) => !foundIds.has(id));

  await updateBusinessEmailsInDb(found);
  await markBusinessesEmailCheckedInDb(checkedWithoutEmail);
  const remaining = businesses.filter(
    (business) => !business.email && !business.emailEnrichmentCheckedAt && business.website
  ).length - candidates.length;

  return {
    checked: candidates.length,
    found: found.length,
    remaining: Math.max(0, remaining),
    offset,
    limit,
    source,
    updated: found
  };
}
