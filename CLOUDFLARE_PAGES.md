# Deploying to Cloudflare Pages (All-in-Cloudflare)

This repo runs entirely on Cloudflare Pages + Functions + D1 (SQLite). No external backend needed.

What you get:

- Static React frontend built from `cleanup-tracker-app/client`.
- Serverless API at `/api/v2/*` implemented in Pages Functions.
- D1 database for users, jobs, and vehicles.

## 1) Create a Cloudflare Pages project

1. In Cloudflare Dashboard → Pages → Create project → Connect to Git → select this repo.
2. Build config:
   - Framework preset: None
   - Build command:
     `npm --prefix cleanup-tracker-app/client ci || npm --prefix cleanup-tracker-app/client install && npm --prefix cleanup-tracker-app/client run build && touch cleanup-tracker-app/client/build/.nojekyll`
   - Build output directory: `cleanup-tracker-app/client/build`
   - Root directory: leave blank

3. Routing (avoid 405 on /api/*):
   - Ensure Functions are picked up at repo root. If you still see 405 responses for API calls, add `_routes.json` at the repo root with:

     {
       "version": 1,
       "description": "Route API requests to Pages Functions",
       "include": [ "/api/*" ]
     }

   This tells Pages to route /api/* to Functions even when static assets exist.

## 2) Create and bind a D1 database

1. Cloudflare Dashboard → D1 → Create database (e.g., `cleanup-tracker`).
2. Pages → Your Project → Settings → Functions → D1 Bindings: Add a binding with Variable name `DB` and select the database.
3. Redeploy if prompted. Tables are created on first API call automatically.

## 3) Optional environment variables

- `INVENTORY_CSV_URL` → Public CSV URL the app will import from when you click “Refresh Inventory”. Set this under Pages → Settings → Environment Variables.

No `API_BASE` is required—the frontend calls the built-in API.

## 4) Functions overview

- `functions/api/v2/[[path]].js` implements:
  - `GET /api/v2/diag` — diagnostic (binding name and table counts).
  - `POST /api/v2/init` — ensure schema and seed defaults idempotently.
  - `GET /api/v2/users` — list users; auto-seeds if empty.
  - `POST /api/v2/users` — create detailer (unique 4-digit PIN enforced).
  - `PUT /api/v2/users/:id` — update user name/PIN.
  - `DELETE /api/v2/users/:id` — delete user.
  - `GET /api/v2/jobs` — list jobs with technician assignments.
  - `POST /api/v2/jobs` — create job (starts “In Progress” and records events).
  - `PUT /api/v2/jobs/:id/complete` — finish job and set duration.
  - `PUT /api/v2/jobs/:id/join` — start a technician timer for a job.
  - `PUT /api/v2/jobs/:id/stop` — stop a technician timer for a job.
  - `PUT /api/v2/vehicles/join-by-vin` — find active job by VIN and join.
  - `GET /api/v2/vehicles/search?q=...` — search by full VIN or partial VIN/stock.
  - `POST /api/v2/vehicles/refresh` — fetch CSV from `INVENTORY_CSV_URL` and upsert.
- `functions/api/health.js` → `/api/health` returns `{ ok: true }`.

## 5) Client configuration

The React app calls relative `/api/v2` paths by default, so no extra config is needed for Pages.

## 6) First run tips

- After deploy, open your Pages URL. The app will attempt to load users.
- If the list is empty, it will auto-seed via `/api/v2/init` and reload.
- Use Reports → “Refresh Vehicle Inventory from CSV” to import vehicles from your CSV.

## 7) Local development (optional)

You can test with Wrangler:

- Install Wrangler: `npm i -g wrangler`
- Build client locally first, or point Pages dev to the client build folder:
  `wrangler pages dev cleanup-tracker-app/client/build`
- To use D1 locally, see Wrangler docs for binding a local D1 database and pass `--d1=DB@<binding>`.
