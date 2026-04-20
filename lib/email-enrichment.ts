import type { BusinessLead } from "@/types/business";

type EnrichmentResult = {
  businessId: string;
  email: string | null;
  checkedUrls: string[];
};

const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const CONTACT_PATHS = [
  "contact",
  "contact-us",
  "nous-joindre",
  "a-propos"
];
const BLOCKED_EMAIL_DOMAINS = new Set([
  "example.com",
  "mystore.com",
  "domain.com",
  "yourdomain.com",
  "sentry.io",
  "wixpress.com",
  "shopify.com"
]);
const BLOCKED_DOMAINS = new Set([
  "example.com",
  "facebook.com",
  "instagram.com",
  "ubereats.com",
  "doordash.com",
  "skipthedishes.com",
  "google.com",
  "goo.gl",
  "linktr.ee"
]);

function isUsefulWebsite(rawUrl: string | null) {
  if (!rawUrl) return false;

  try {
    const host = new URL(rawUrl).hostname.replace(/^www\./, "");
    return !Array.from(BLOCKED_DOMAINS).some((domain) => host === domain || host.endsWith(`.${domain}`));
  } catch {
    return false;
  }
}

function normalizeEmail(email: string) {
  return email
    .trim()
    .replace(/^mailto:/i, "")
    .replace(/[).,;:]+$/, "")
    .toLowerCase();
}

function isValidEmail(email: string) {
  const domain = email.split("@")[1] ?? "";
  if (email.length > 120) return false;
  if (BLOCKED_EMAIL_DOMAINS.has(domain)) return false;
  if (domain.endsWith(".sentry.io") || domain.endsWith(".wixpress.com") || domain.endsWith(".shopify.com")) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function extractEmails(html: string) {
  const mailtoEmails = Array.from(html.matchAll(/mailto:([^"'?#>\s]+)/gi)).map((match) => normalizeEmail(match[1]));
  const visibleEmails = Array.from(html.matchAll(EMAIL_PATTERN)).map((match) => normalizeEmail(match[0]));

  return Array.from(new Set([...mailtoEmails, ...visibleEmails])).filter(isValidEmail);
}

function decodeHtml(value: string) {
  return value
    .replaceAll("&#64;", "@")
    .replaceAll("&commat;", "@")
    .replaceAll("&#46;", ".")
    .replaceAll("&period;", ".");
}

function buildCandidateUrls(website: string) {
  const base = new URL(website);
  const origin = base.origin;
  const urls = new Set<string>([base.toString(), origin]);

  for (const path of CONTACT_PATHS) {
    urls.add(`${origin}/${path}`);
  }

  return Array.from(urls).slice(0, 8);
}

async function fetchPage(url: string, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "montreal-restaurant-cafe-crm/1.0 email enrichment",
        Accept: "text/html,application/xhtml+xml"
      },
      redirect: "follow",
      signal: controller.signal
    });

    const contentType = response.headers.get("content-type") ?? "";
    if (!response.ok || !contentType.includes("text/html")) return null;
    return decodeHtml(await response.text());
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function enrichBusinessEmail(
  business: BusinessLead,
  options: { timeoutMs?: number } = {}
): Promise<EnrichmentResult> {
  const website = business.website;
  if (business.email || !website || !isUsefulWebsite(website)) {
    return { businessId: business.id, email: business.email, checkedUrls: [] };
  }

  const checkedUrls: string[] = [];
  const candidateUrls = buildCandidateUrls(website);

  checkedUrls.push(...candidateUrls);
  const pages = await Promise.all(candidateUrls.map((url) => fetchPage(url, options.timeoutMs ?? 4500)));

  for (const html of pages) {
    if (!html) continue;
    const [email] = extractEmails(html);
    if (email) return { businessId: business.id, email, checkedUrls };
  }

  return { businessId: business.id, email: null, checkedUrls };
}

export function selectBusinessesForEmailEnrichment(businesses: BusinessLead[], limit: number, offset: number) {
  return businesses
    .filter((business) => !business.email && !business.emailEnrichmentCheckedAt && isUsefulWebsite(business.website))
    .slice(offset, offset + limit);
}
