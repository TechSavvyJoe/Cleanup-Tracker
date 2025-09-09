# Deploying on Cloudflare Pages

This repository runs entirely on Cloudflare Pages using Pages Functions and a D1 database. No external backend is required.

## 1) Create a Cloudflare Pages project
1. In the Cloudflare Dashboard go to **Pages** → **Create project** and connect to this Git repository.
2. Build configuration:
   - **Framework preset:** None
   - **Build command:** `npm install && npm run build`
   - **Build output directory:** `cleanup-tracker-app/client/build`
   - **Root directory:** leave blank
3. This builds the React client and deploys the serverless functions under `/functions`.

## 2) Create and bind a D1 database
1. Cloudflare Dashboard → **D1** → create a database (e.g. `cleanup-tracker`).
2. Pages → your project → **Settings** → **Functions** → **D1 bindings**: add a binding with
   - **Variable name:** `DB`
   - **Database:** the database created above
3. Redeploy if prompted. Tables are created on first API call automatically.

## 3) Optional environment variables
- `INVENTORY_CSV_URL` – public CSV URL used by the inventory refresh endpoint.

## 4) Functions overview
- `functions/api/v2/[[path]].js` implements:
  - `GET /api/v2/diag` — diagnostic information (binding name and table counts)
  - `POST /api/v2/init` — ensure schema and seed defaults idempotently
  - `GET /api/v2/users` — list users; auto-seeds if empty
  - `POST /api/v2/users` — create detailer (unique 4-digit PIN enforced)
  - `PUT /api/v2/users/:id` — update user name/PIN
  - `DELETE /api/v2/users/:id` — delete user
  - `GET /api/v2/jobs` — list jobs with technician assignments
  - `POST /api/v2/jobs` — create job (starts “In Progress” and records events)
  - `PUT /api/v2/jobs/:id/complete` — finish job and set duration
  - `PUT /api/v2/jobs/:id/join` — start a technician timer for a job
  - `PUT /api/v2/jobs/:id/stop` — stop a technician timer for a job
  - `PUT /api/v2/vehicles/join-by-vin` — find active job by VIN and join
  - `GET /api/v2/vehicles/search?q=...` — search by full VIN or partial VIN/stock
  - `POST /api/v2/vehicles/refresh` — fetch CSV from `INVENTORY_CSV_URL` and upsert
- `functions/api/health.js` — `/api/health` returns `{ ok: true }`

## 5) Client configuration
The React app calls relative `/api/v2` paths by default, so no additional configuration is needed.

## 6) First run tips
- After deploy, open your Pages URL; the app will attempt to load users.
- If the list is empty, it will auto-seed via `/api/v2/init` and reload.
- Use **Reports → "Refresh Vehicle Inventory from CSV"** to import vehicles from your CSV.

## 7) Local development (optional)
- Install Wrangler: `npm i -g wrangler`
- Build the client locally first, or point Pages dev to the client build folder:
  `wrangler pages dev cleanup-tracker-app/client/build`
- To use D1 locally, see Wrangler docs for binding a local D1 database and pass `--d1=DB@<binding>`.
