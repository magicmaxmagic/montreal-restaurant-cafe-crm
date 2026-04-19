# Montreal Restaurant & Cafe CRM

Production-ready lead-generation CRM dashboard for Montreal restaurants, cafes, bakeries, coffee shops, and brunch restaurants.

## Features

- Next.js 15 App Router with TypeScript and Tailwind CSS.
- Google Places API integration using the new Places API endpoints and field masks.
- Text search across Montreal hospitality categories and boroughs.
- Place details enrichment for phone, website, opening hours, rating, Maps URL, and status.
- Deduplication by Google Place ID.
- Searchable, filterable, sortable CRM table.
- Editable lead notes and lead status with `localStorage` persistence.
- Detail drawer, stats cards, CSV export, refresh button, last synced indicator.
- Loading, error, empty, and demo fallback states.
- Mock data fallback when `GOOGLE_MAPS_API_KEY` is not configured.

## Data Notes

Google Places API does **not** return business email addresses. This app includes an `email` field in the type model, table, CSV export, and detail drawer, but sets it to `null` and displays `Not available from Google Places`. The architecture keeps this field ready for a future enrichment layer.

Google-sourced business fields are treated as read-only in the UI. Only `notes` and `leadStatus` are editable and persisted locally.

## Local Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

Without a Google API key, the app remains fully usable with mock demo data.

## Google Places Setup

1. Create or choose a Google Cloud project.
2. Enable billing on the project. Google Places API requires a billing-enabled Google Cloud project.
3. Enable the Places API (New).
4. Create an API key and restrict it for production use.
5. Add it to `.env.local`:

```bash
GOOGLE_MAPS_API_KEY=your_key_here
```

The API route uses:

- `places:searchText` for area/category discovery.
- `places/{placeId}` for detail enrichment.
- `X-Goog-FieldMask` to request only required fields and reduce cost.

## Vercel Deployment

1. Push this repository to GitHub.
2. Import it in Vercel.
3. Add the `GOOGLE_MAPS_API_KEY` environment variable in Vercel Project Settings.
4. Deploy.

If the key is absent in Vercel, the deployed app will use mock data.

## CI/CD Setup

This project includes two GitHub Actions workflows:

- `.github/workflows/ci.yml` runs on pushes to `main` and on every pull request. It checks out the repo, sets up Node.js 20, installs dependencies, then runs lint, typecheck, and production build checks.
- `.github/workflows/deploy.yml` runs on every push. Pushes to feature branches create Vercel preview deployments, while pushes to `main` deploy to production.

Preview deployments produce unique Vercel preview URLs for each branch/commit. Production deployments are reserved for the `main` branch.

For strict release control, configure GitHub branch protection so `main` requires the CI workflow to pass before merging pull requests.

## Vercel Setup

1. Connect the GitHub repository to Vercel.
2. Add the application environment variable in Vercel:

```bash
GOOGLE_MAPS_API_KEY=your_key_here
```

3. Add these GitHub repository secrets for GitHub Actions deployment:

```bash
VERCEL_TOKEN=your_vercel_token
VERCEL_ORG_ID=your_vercel_org_id
VERCEL_PROJECT_ID=your_vercel_project_id
```

`VERCEL_TOKEN` can be created from Vercel Account Settings. `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` are available in `.vercel/project.json` after running `vercel link`, or from the Vercel project settings.

The deployment workflow pulls the matching Vercel environment configuration, builds with `vercel build`, and deploys the prebuilt output. On `main`, it uses production environment config plus `vercel deploy --prebuilt --prod`; on other branches, it uses preview environment config plus `vercel deploy --prebuilt`.

If Vercel Git auto-deployments are also enabled, Vercel may deploy the same push twice. Use either Vercel's built-in Git integration or this GitHub Actions workflow as the deployment source of truth.

## Scripts

```bash
npm run dev
npm run build
npm run typecheck
npm run lint
```

## Project Structure

```text
app/
  api/businesses/route.ts   API endpoint for Google Places or mock fallback
  layout.tsx                App shell and metadata
  page.tsx                  Dashboard page
components/                 Dashboard, table, filters, drawer, UI primitives
lib/                        Google Places client, CSV, storage, mock data
types/                      Shared TypeScript business models
```

## Future Supabase/Postgres Migration

The current lead overlay is intentionally isolated in `lib/storage.ts`. To add Supabase or Postgres later, replace the local override functions with server-backed reads/writes for `notes` and `leadStatus`, while keeping Google Places data read-only or periodically synced into a normalized `businesses` table.
