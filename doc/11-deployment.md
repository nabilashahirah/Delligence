# 11 - Deployment

## Hosted demo: Vercel + Render + MongoDB Atlas (free tiers)

| Part | Host | Config in repo |
| --- | --- | --- |
| React frontend (`client/`) | Vercel | [client/vercel.json](../client/vercel.json) (SPA rewrite) |
| FastAPI backend | Render | [render.yaml](../render.yaml) (Blueprint) |
| Database | MongoDB Atlas M0 | — |

Vercel can't host the backend: its serverless functions can't hold the `/ws` WebSocket or run the in-process reminder scheduler. Render runs a normal long-lived process.

1. **Atlas.** Create a free M0 cluster, a database user, and allow `0.0.0.0/0` under Network Access (Render's free IPs aren't static). Copy the `mongodb+srv://.../dentelligence` URI.
2. **Seed.** Put that URI in your local `.env` and run `venv\Scripts\python seed_demo.py`.
3. **Render.** New → Blueprint → select the GitHub repo. Fill in `MONGO_URI` and `GEMINI_API_KEY`; leave `CORS_ORIGINS` / `PUBLIC_PORTAL_URL` blank for now. `JWT_SECRET` is generated. Wait for `https://<service>.onrender.com/health` to return ok.
4. **Vercel.** Add New → Project → same repo. Set **Root Directory** to `client`, framework Vite, and env var `VITE_API_URL=https://<service>.onrender.com` (no trailing slash). Deploy.
5. **Back to Render.** Set `CORS_ORIGINS=https://<project>.vercel.app` and `PUBLIC_PORTAL_URL=https://<project>.vercel.app/portal`. Render redeploys automatically.
6. **Telegram (optional).** Add the bot env vars on Render and point the webhook at `https://<service>.onrender.com/api/v1/telegram/webhook`.

The frontend reads the backend location from `VITE_API_URL` via [client/src/config.js](../client/src/config.js); the WebSocket URL is derived from it (`https` → `wss`). Locally, leave it unset and Vite proxies `/api` and `/ws` to `localhost:8000`.

**Free-tier caveats:** Render sleeps after ~15 min idle and takes ~50 s to wake — open the site a minute before a live demo. The reminder scheduler doesn't run while asleep.

## Environment Variables (Production)

Set the following on the host:

```
ENV=production
PORT=8000
MONGO_URI=mongodb+srv://<user>:<pass>@<cluster>/dentelligence
LOG_LEVEL=INFO
JWT_SECRET=<long_random_secret>
JWT_EXPIRES_MINUTES=10080
GEMINI_API_KEY=<google_gemini_key>
CORS_ORIGINS=https://<frontend-host>          # comma-separated
PUBLIC_PORTAL_URL=https://<frontend-host>/portal
```

**Never commit `.env`.** Only `.env.example` should be in version control.

## Backend

Run under a production ASGI server:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Or behind Gunicorn:
```bash
gunicorn app.main:app -k uvicorn.workers.UvicornWorker -w 1 -b 0.0.0.0:8000
```

Keep to **one worker**: WebSocket connections and the reminder scheduler are in-process, so multiple workers would split broadcasts and send duplicate reminders.

Put a reverse proxy (nginx / Caddy) in front to terminate TLS and forward `/api/v1/*` and `/ws` to the app.

## Frontend

```bash
cd client
npm ci
npm run build
```

Serve `client/dist/` as static assets. Configure the proxy so that:
- `/api/v1/*` → FastAPI backend
- `/ws` → FastAPI backend (WebSocket upgrade)

## MongoDB

- Production uses MongoDB Atlas. Ensure the network access list allows the app host.
- `app/database.py` verifies Atlas TLS against `certifi`'s CA bundle for `mongodb+srv://` URIs.

## ML Model

Ship `models/wait_time_model.pkl` alongside the app. Without it, the fallback logic (historical average → scheduled duration) still works.

## Health Checks

- `GET /health` returns `{"status": "ok"}`.

## Security Checklist

- [ ] Strong `JWT_SECRET` (32+ random bytes).
- [ ] TLS terminated at the proxy.
- [ ] Set `CORS_ORIGINS` to your real frontend host.
- [ ] Set a usage quota on the Gemini key — the AI chat is reachable by anyone with a demo login.
- [ ] Rotate `GEMINI_API_KEY` if leaked.
- [ ] Change default admin password after `seed.py`.
