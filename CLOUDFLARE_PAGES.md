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

## 2) Create and bind a D1 database

1. Cloudflare Dashboard → D1 → Create database (e.g., `cleanup-tracker`).
2. Pages → Your Project → Settings → Functions → D1 Bindings: Add a binding with Variable name `DB` and select the database.
3. Redeploy if prompted. Tables are created on first API call automatically.

## 3) Optional environment variables

- `INVENTORY_CSV_URL` → Public CSV URL the app will import from when you click “Refresh Inventory”. Set this under Pages → Settings → Environment Variables.

No `API_BASE` is required—the frontend calls the built-in API.

## 4) Functions overview

- `functions/api/v2/[[path]].js` implements:
   - `POST /api/v2/seed-users` — idempotently seeds a manager + sample detailers.
   - `GET /api/v2/users` — list users.
   - `POST /api/v2/users` — create detailer (unique 4-digit PIN).
   - `PUT /api/v2/users/:id` — update user name/PIN.
   - `DELETE /api/v2/users/:id` — delete user.
   - `GET /api/v2/jobs` — list jobs.
   - `POST /api/v2/jobs` — create job (starts in “In Progress”).
   - `PUT /api/v2/jobs/:id/complete` — finish job, set duration.
   - `GET /api/v2/vehicles/search?q=...` — search by full 17-char VIN or partial VIN/stock.
   - `POST /api/v2/vehicles/refresh` — fetch CSV from `INVENTORY_CSV_URL` and upsert.
- `functions/api/health.js` → `/api/health` returns `{ ok: true }`.

## 5) Client configuration

The React app calls relative `/api/v2` paths by default, so no extra config is needed for Pages.

## 6) First run tips

- After deploy, open your Pages URL. The app will attempt to load users.
- If the list is empty, it will call `POST /api/v2/seed-users` automatically and reload.
- Use Manager → Refresh Inventory to import vehicles from your CSV.

## 7) Local development (optional)

You can test with Wrangler:

- Install Wrangler: `npm i -g wrangler`
- Build client locally first, or point Pages dev to the client build folder:
   `wrangler pages dev cleanup-tracker-app/client/build`
- To use D1 locally, see Wrangler docs for binding a local D1 database and pass `--d1=DB@<binding>`.
