# CloudCost Guard
Cloud FinOps tracker for Indian and global teams. Logs AWS/Azure/GCP/Oracle/Cloudflare spend in USD/EUR/INR, converts to ₹ with optional 18% GST, forecasts month-end spend, enforces a budget and flags unusual daily spikes (mean + 2σ).

**Stack:** Cloudflare Workers (API) · D1 (SQLite) · static frontend served from the same Worker.

## Deploy
```bash
npm i -g wrangler && wrangler login
wrangler d1 create cloudcost          # copy database_id into wrangler.toml
wrangler d1 execute cloudcost --remote --file=schema.sql
wrangler secret put API_KEY           # choose a strong key
wrangler deploy
```
Open the printed URL, paste your API key, start logging spend.

## API (header `x-api-key`)
`POST /api/spend` · `GET /api/spend` · `DELETE /api/spend/:id` · `PUT /api/budget` · `GET /api/summary`

## Notes
FX rates live in the `settings` table (defaults USD=88, EUR=95); update them with `wrangler d1 execute`. GST handling is a simple 18% toggle, not tax advice.
## Roadmap
Multi-tenant auth, AWS Cost Explorer import, Slack alerts, live FX.
