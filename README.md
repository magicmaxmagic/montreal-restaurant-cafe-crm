# Montreal Restaurant & Cafe CRM

Production-ready lead-generation CRM dashboard for Montreal restaurants, cafes, bakeries, coffee shops, and brunch spots.

The project now uses OpenStreetMap data through the public Overpass API. No paid API, API key, billing account, or credit card is required.

## Features

- Next.js 15 App Router with TypeScript and Tailwind CSS.
- Server-side OpenStreetMap / Overpass fetching under `app/api/`.
- Montreal hospitality search across Downtown Montreal, Plateau Mont-Royal, Mile End, Old Montreal, Griffintown, Rosemont, Verdun, Little Italy, Outremont, and Hochelaga.
- Food-related OSM tag coverage including `amenity=restaurant`, `amenity=cafe`, `shop=bakery`, and brunch/coffee cuisine tags when available.
- Normalized CRM model with name, category, address, borough, phone, website, opening hours, email, coordinates, OSM URL, source, notes, lead status, and created date.
- Deduplication by OSM id, name + address, and name + coordinates.
- Searchable, filterable, sortable CRM table.
- Emails-only lead filter for outreach.
- Visual lead map and neighborhood density panel.
- Editable lead notes and lead status with `localStorage` persistence.
- Optional PostgreSQL persistence through `POSTGRES_URL` or `DATABASE_URL`, with local JSON fallback.
- Detail drawer, stats cards, CSV export, refresh button, last synced indicator.
- Loading, error, empty, and mock fallback states.
- Vercel-ready with no required runtime environment variables.

## Data Notes

OpenStreetMap data quality depends on community completeness. Some businesses may not have phone numbers, websites, emails, addresses, or opening hours. The app allows these fields to be `null` and displays `Not available` when OSM does not provide a value.

OpenStreetMap-sourced business fields are treated as read-only in the UI. Only `notes` and `leadStatus` are editable and persisted locally.

The `email` field is included for future enrichment and Supabase/Postgres migration readiness, but many OSM listings do not include email addresses.

## Local Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

No API key is needed. If `POSTGRES_URL` or `DATABASE_URL` is not set, the app reads and writes `data/businesses.json`.

## Environment Variables with Vercel CLI

This project includes a Vercel CLI setup script so environment variables can be managed from the terminal instead of manually through the Vercel dashboard.

Run the setup script:

```bash
bash scripts/vercel-setup.sh
```

The script installs the Vercel CLI if needed, logs in when no `VERCEL_TOKEN` is provided, links the project with `vercel link --yes`, pulls environment variables into `.env`, and sets `DEMO_VAR` for production, preview, and development.

To add or update a variable manually, use Vercel CLI commands:

```bash
vercel env add VARIABLE_NAME
echo "VALUE" | vercel env add VARIABLE_NAME production
echo "VALUE" | vercel env update VARIABLE_NAME production --yes
```

To sync Vercel environment variables locally:

```bash
vercel env pull .env --yes
npm run vercel:env
```

Vercel CLI supports listing, adding, updating, removing, pulling, and running commands with project environment variables. See the official Vercel CLI env documentation: https://vercel.com/docs/cli/env

Safety notes:

- Do not commit `.env`.
- Keep secrets in Vercel and GitHub Actions secrets, not in source control.
- Use `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` as GitHub secrets for CI/CD.
- Prefer piping values into `vercel env add` or `vercel env update`; avoid putting real secrets directly in shell history.

## Database Persistence

The CRM supports two storage modes:

- PostgreSQL: set `POSTGRES_URL` or `DATABASE_URL` for Supabase, Neon, Vercel Postgres, or any compatible provider.
- Local JSON fallback: when no Postgres URL is configured, the app reads and writes `data/businesses.json`.

The scraper endpoint is:

```bash
curl -X POST http://localhost:3000/api/businesses/scrape
```

Email enrichment can run manually:

```bash
curl -X POST "http://localhost:3000/api/businesses/enrich-emails?limit=80"
```

When Postgres is configured, the app automatically creates a `businesses` table with `id`, `data`, and `updated_at`, then stores each normalized OpenStreetMap lead as JSONB. On Vercel, add your Postgres URL with:

```bash
echo "postgres://USER:PASSWORD@HOST:5432/DB?sslmode=require" | vercel env add POSTGRES_URL production
echo "postgres://USER:PASSWORD@HOST:5432/DB?sslmode=require" | vercel env add POSTGRES_URL preview
```

## Vercel Cron Email Enrichment

`vercel.json` schedules a daily cron job:

```text
17 7 * * * -> /api/cron/enrich-emails
```

The cron runs one conservative email-enrichment batch per day. It checks businesses with a website, no email, and no previous enrichment check, then stores any discovered email in the active storage backend.

For persistent production enrichment, configure `POSTGRES_URL` or `DATABASE_URL`; otherwise Vercel can only use the JSON data bundled with each deployment and the cron will return `skipped: true`.

Optional protection:

```bash
echo "a-long-random-secret" | vercel env add CRON_SECRET production
```

Manual protected test:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://your-domain.vercel.app/api/cron/enrich-emails
```

## OpenStreetMap / Overpass

The API route calls a reusable utility in `lib/osm-overpass.ts`.

It:

- Queries Overpass from the server, not the browser.
- Searches a bounded Montreal area and assigns each result to the nearest configured neighborhood.
- Normalizes raw OSM elements into the CRM `BusinessLead` model.
- Uses a safe request timeout and one retry for rate-limit/server failures.
- Keeps a short in-memory cache to reduce repeated Overpass traffic.
- Falls back to mock data when Overpass is unavailable.
- Saves scraped results to Postgres when configured, otherwise to `data/businesses.json`.

Please avoid aggressive refresh loops. Overpass is a public community service.

## Vercel Deployment

1. Push this repository to GitHub.
2. Import it in Vercel, or run `bash scripts/vercel-setup.sh` to link from the CLI.
3. Deploy through GitHub Actions or the Vercel CLI.

No business-data environment variables are required in Vercel for the bundled JSON data. Add `POSTGRES_URL` or `DATABASE_URL` if you want the production scraper to write to a persistent database.

## CI/CD Setup

This project includes two GitHub Actions workflows:

- `.github/workflows/ci.yml` runs on pushes to `main` and on every pull request. It checks out the repo, sets up Node.js 20, installs dependencies, then runs lint, typecheck, and production build checks.
- `.github/workflows/deploy.yml` runs on every push. Pushes to feature branches create Vercel preview deployments, while pushes to `main` deploy to production.

Preview deployments produce unique Vercel preview URLs for each branch/commit. Production deployments are reserved for the `main` branch.

For strict release control, configure GitHub branch protection so `main` requires the CI workflow to pass before merging pull requests.

## Vercel Setup For GitHub Actions

Add these GitHub repository secrets for GitHub Actions deployment:

```bash
VERCEL_TOKEN=your_vercel_token
VERCEL_ORG_ID=your_vercel_org_id
VERCEL_PROJECT_ID=your_vercel_project_id
```

`VERCEL_TOKEN` can be created from Vercel Account Settings. `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` are available in `.vercel/project.json` after running `vercel link`, or from the Vercel project settings.

The deployment workflow installs Vercel CLI with `npm i -g vercel`, pulls Vercel project configuration, exports Vercel environment variables to `.env`, builds with `vercel build`, and deploys the prebuilt output. On `main`, it uses production environment config plus `vercel deploy --prebuilt --prod`; on other branches, it uses preview environment config plus `vercel deploy --prebuilt`.

If Vercel Git auto-deployments are also enabled, Vercel may deploy the same push twice. Use either Vercel's built-in Git integration or this GitHub Actions workflow as the deployment source of truth.

## Scripts

```bash
npm run dev
npm run build
npm run typecheck
npm run lint
npm run vercel:env
```

## Project Structure

```text
app/
  api/businesses/route.ts   API endpoint for saved leads or mock fallback
  api/businesses/scrape/    API endpoint that scrapes OSM and writes to storage
  layout.tsx                App shell and metadata
  page.tsx                  Dashboard page
components/                 Dashboard, table, filters, drawer, UI primitives
data/                       JSON lead database fallback
lib/                        DB adapter, OSM/Overpass client, CSV, storage, mock data
scripts/                    Vercel CLI setup script
types/                      Shared TypeScript business models
```

## Future CRM Persistence

The scraped business dataset can already be stored in Postgres. The current lead overlay is still intentionally isolated in `lib/storage.ts`; to persist `notes`, `emailed`, `visited`, and `leadStatus` across users, move those local override functions into a server-backed table keyed by business id.
