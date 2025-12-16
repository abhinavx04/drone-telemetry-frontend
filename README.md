# Drone Telemetry Frontend (Vite + React + TypeScript)

Production-ready UI for live drone telemetry against the backend at `http://<YOUR_VPS_PUBLIC_IP>:8000`.

## Features
- Dashboard list with status, mode, battery bar, last-seen, GPS/emergency flags.
- Drone detail view with live WebSocket telemetry, staleness indicator, and 5s REST polling fallback.
- Map (Leaflet/OpenStreetMap) with markers and selection.
- KPIs (altitude, battery, heading, speeds) plus lightweight sparklines.
- Backend health banner and reconnect/backoff for WS.

## Quick start
```bash
npm install
```

Create `.env` (dev) or inject env at build/deploy:
```
VITE_API_BASE=http://<YOUR_VPS_PUBLIC_IP>:8000
```

Run locally (uses Vite proxy for `/api`):
```bash
npm run dev
```

Production build:
```bash
npm run build
npm run preview   # optional local check
```

## Connectivity checklist
- From your laptop (not the VPS), verify:
  ```bash
  curl http://<YOUR_VPS_PUBLIC_IP>:8000/api/v1/health
  ```
- Browser must use the VPS host, **not** `localhost:8000`.
- If CORS blocks requests, allow your frontend origin on the backend or keep using the Vite proxy for dev.
- For HTTPS frontends, switch WS to `wss://<host>:8000/...`; otherwise `ws://`.
- Ensure firewall/security groups allow inbound TCP 8000 (and 80/443 if using a reverse proxy).

## Env + proxy notes
- `VITE_API_BASE` drives REST and WS hosts; trailing slashes are trimmed.
- Vite dev server proxies `/api/*` to `VITE_API_BASE` so you avoid CORS locally.

## Project structure
- `src/api` – typed clients for REST.
- `src/hooks/useLiveTelemetry` – WebSocket with exponential backoff + polling fallback and history buffer.
- `src/components` – dashboard list, map, detail panel, sparklines.
- `src/config.ts` – shared thresholds and base URLs.

## Expected endpoints
- `GET /api/v1/health`
- `GET /api/v1/drones`
- `GET /api/v1/drones/{id}/telemetry/latest`
- `WS /api/v1/drones/{id}/telemetry/stream`

## Operational tips
- Staleness threshold: 10s since last telemetry → marked `STALE`.
- If WS drops, auto-reconnect with backoff; REST polling (5s) continues while closed.
- Use absolute time on hover (browser default title) and relative time in UI.
