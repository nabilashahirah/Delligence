# CLAUDE.md

Delligence — clinic practice management: FastAPI + MongoDB (Beanie) backend in `app/`, React 19 + Vite frontend in `client/`, Gemini tool-calling agent, scikit-learn wait-time model. Overview in [README.md](README.md); full docs in [doc/](doc/README.md).

## Run locally

```powershell
venv\Scripts\uvicorn app.main:app --reload --port 8000   # backend (needs .env, see .env.example)
cd client; npm run dev                                    # frontend on :3000, proxies /api and /ws to :8000
venv\Scripts\python seed_demo.py                          # reseed demo data + admin login
cd client; npm run lint; npm run build                    # frontend checks (no test suite yet)
```

## Rules

- **Docs are part of every change.** `doc/` is the source of truth. Update the relevant `doc/*.md` and add a dated entry at the top of [doc/12-changelog.md](doc/12-changelog.md) in the same change. Update [doc/14-features-progress.md](doc/14-features-progress.md) when a roadmap item moves.
- **AI agent tools stay read-only.** `TOOL_REGISTRY` in [app/services/ai_tools.py](app/services/ai_tools.py) must only query data. Do not add tools that create, update, cancel or delete records, or send messages, unless the user explicitly asks for Phase 1b. Any write tool must only *propose* a change; staff confirm it in the UI before anything is saved. Reason: an LLM can misread a request, and wrong bookings or deleted records affect real patients.
- **One backend worker.** The WebSocket manager ([app/utils/ws_manager.py](app/utils/ws_manager.py)) and the reminder scheduler ([app/scheduler.py](app/scheduler.py)) are in-process. Multiple workers split broadcasts and send duplicate reminders.
- **No hardcoded hosts.** Frontend gets the backend URL from `VITE_API_URL` via [client/src/config.js](client/src/config.js); backend CORS from `CORS_ORIGINS`. Never reintroduce `localhost:8000` in client code.
- **Never commit secrets.** `.env` is gitignored; add new settings to [app/config.py](app/config.py), `.env.example`, and `render.yaml`. `reset_password.py` and `fix_staff.py` are local-only and untracked.
- Demo/seed data must be fake — never real patient data.

## Layout

- `app/routers/` HTTP + WebSocket endpoints (all under `/api/v1`, `ws` at `/ws`) → `app/services/` business logic → `app/models/` Beanie documents.
- `client/src/api/` axios calls, `pages/` routes, `hooks/useRealtimeSync.js` WebSocket → TanStack Query cache, `store/` Zustand auth.
- `models/wait_time_model.pkl` is trained by `scripts/generate_and_train.py`.

## Deployment

Frontend on Vercel (root `client/`), backend on Render ([render.yaml](render.yaml)), MongoDB Atlas. Walkthrough in [doc/11-deployment.md](doc/11-deployment.md).
