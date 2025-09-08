# Deploying to Cloudflare Pages (Free)

This repo is ready for Cloudflare Pages + Functions.

What you get:

- Static frontend built from `cleanup-tracker-app/client`.
- Cloudflare Functions proxy for `/api/v2/*` forwarding to your backend origin.

## 1) Create a Cloudflare Pages project

1. In Cloudflare Dashboard → Pages → Create project → Connect to Git → select this repo.
2. Build config:
   - Framework preset: None
   - Build command: `npm --prefix cleanup-tracker-app/client ci || npm --prefix cleanup-tracker-app/client install && npm --prefix cleanup-tracker-app/client run build`
   - Build output directory: `cleanup-tracker-app/client/build`
   - Root directory: leave blank

## 2) Add environment variables (Pages → Settings → Environment Variables)

Required:

- `API_BASE` → Your backend API base URL (e.g., `https://your-api.onrender.com`)

Optional (only if you host backend on Cloudflare Workers/another origin that needs CORS tweaks): none; proxy sets `access-control-allow-origin: *`.

## 3) Functions routing

The `functions` folder enables Pages Functions:

- `functions/api/health.js` → `/api/health`
- `functions/api/v2/[[path]].js` → `/api/v2/*` → proxies to `${API_BASE}/api/v2/*`

## 4) Client configuration

When deployed on Pages with the Functions proxy, the React app can call `/api/v2/...` directly (no REACT_APP_API_URL needed).

## 5) Backend hosting

You can host your existing Node/Express API on Render/Railway/Fly.io. Set its base URL as `API_BASE` above.

## 6) Trigger first deploy

Push to `main` or use Cloudflare Pages to trigger a deploy. After deploy, visit your Pages URL; the app should load and API calls route via Functions.
