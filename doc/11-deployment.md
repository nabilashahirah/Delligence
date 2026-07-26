# 11 - Deployment

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
```

**Never commit `.env`.** Only `.env.example` should be in version control.

## Backend

Run under a production ASGI server:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

Or behind Gunicorn:
```bash
gunicorn app.main:app -k uvicorn.workers.UvicornWorker -w 4 -b 0.0.0.0:8000
```

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
- The current `app/database.py` sets `tlsAllowInvalidCertificates=True` — **remove this** before shipping to production and provide the proper CA bundle.

## ML Model

Ship `models/wait_time_model.pkl` alongside the app. Without it, the fallback logic (historical average → scheduled duration) still works.

## Health Checks

- `GET /health` returns `{"status": "ok"}`.

## Security Checklist

- [ ] Strong `JWT_SECRET` (32+ random bytes).
- [ ] TLS terminated at the proxy.
- [ ] Remove `tlsAllowInvalidCertificates=True` from Mongo client.
- [ ] Restrict CORS origins in `app/main.py` to your real frontend host.
- [ ] Rotate `GEMINI_API_KEY` if leaked.
- [ ] Change default admin password after `seed.py`.
