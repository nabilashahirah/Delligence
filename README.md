# Delligence

**AI-powered practice management for any appointment-based business.**

Delligence is a full-stack platform that replaces spreadsheets, missed calls, and manual scheduling with a live queue, ML wait-time predictions, and an **AI agent** that queries your data through tools instead of guessing.

Originally built for dental clinics — the same platform runs unchanged for salons, physio, spas, or any service business.

---

## Highlights

- 🤖 **AI agent, not a chatbot.** Staff ask questions in plain English; the agent calls real tools (`find_patient`, `get_queue_status`, `check_availability`, ...) against MongoDB via Gemini function-calling. No hallucinated patient data.
- ⏱ **ML wait-time prediction.** A scikit-learn `GradientBoostingRegressor` trained on historical appointments feeds the live queue with per-patient wait estimates that update in real time.
- 📡 **Real-time queue.** WebSocket broadcast keeps every staff dashboard in sync — status changes, new walk-ins, and revised predictions propagate instantly.
- 📱 **Telegram integration.** Patients receive appointment reminders and "you're next" notifications; staff can draft promo messages with an AI copywriter.
- 🌐 **Public self-service portal.** Patients look up records by IC, book slots, or check into an appointment — no account required.

---

## Tech Stack

| Layer | Choice |
| --- | --- |
| Backend | FastAPI 0.111 (async Python), Uvicorn |
| Database | MongoDB (Atlas or local) via Beanie ODM + Motor |
| Auth | JWT (`python-jose`) + bcrypt |
| ML | scikit-learn GradientBoostingRegressor |
| LLM | Google Gemini via `google-genai` SDK, function calling |
| Frontend | React 19 + Vite, Tailwind CSS v4 |
| State | Zustand (auth) + TanStack Query (server state) |
| Realtime | Native WebSocket |
| Bot | Telegram Bot API (webhook) |

---

## Quick Start

**Prerequisites:** Python 3.11+, Node 18+, MongoDB (local or Atlas), Google Gemini API key.

```powershell
# 1. Clone
git clone https://github.com/nabilashahirah/Delligence.git
cd Delligence

# 2. Backend
python -m venv venv
venv\Scripts\pip install -r requirements.txt
copy .env.example .env    # fill in MONGO_URI, GEMINI_API_KEY, JWT_SECRET
venv\Scripts\python seed_demo.py       # creates admin + demo data
venv\Scripts\uvicorn app.main:app --port 8000

# 3. Frontend (new terminal)
cd client
npm install
npm run dev
```

Log in as `admin@dentelligence.com` / `Admin@123` — created by the seed script.

---

## Architecture

```
┌──────────────────────┐         HTTP (REST)          ┌────────────────────────┐
│   React Frontend     │ ───────────────────────────► │  FastAPI Backend       │
│   (Vite, port 5173)  │ ◄─────────────────────────── │  (Uvicorn, port 8000)  │
│                      │                              │                        │
│  - Staff app         │         WebSocket            │  - Routers             │
│  - Patient portal    │ ◄──────────────────────────► │  - Services            │
│  - AI Chat widget    │         (/ws)                │  - Beanie models       │
│  - Zustand + RQ      │                              │  - ML predictor        │
│  - Axios (JWT)       │                              │  - Gemini agent        │
└──────────────────────┘                              └───────────┬────────────┘
                                                                  │
                              ┌───────────────────────────────────┼───────────────┐
                              ▼                                   ▼               ▼
                    ┌─────────────────┐              ┌─────────────────┐   ┌──────────────┐
                    │  MongoDB Atlas  │              │  Google Gemini  │   │  Telegram    │
                    │  - patients     │              │  (function      │   │  Bot API     │
                    │  - staff        │              │   calling)      │   │  (webhook)   │
                    │  - appointments │              └─────────────────┘   └──────────────┘
                    │  - treatments   │
                    └─────────────────┘
```

---

## Documentation

Deep-dive docs live in [`doc/`](doc/):

- [01 - Overview & architecture](doc/01-overview.md)
- [02 - Getting started](doc/02-getting-started.md)
- [03 - Backend](doc/03-backend.md) · [04 - Frontend](doc/04-frontend.md)
- [05 - Database models](doc/05-database-models.md) · [06 - API reference](doc/06-api-reference.md)
- [07 - Auth](doc/07-auth.md) · [08 - Realtime (WebSocket)](doc/08-realtime.md)
- [09 - AI & ML](doc/09-ai-ml.md) — **tool-calling agent architecture**
- [13 - Telegram notifications](doc/13-notifications.md)
- [14 - Features & roadmap](doc/14-features-progress.md)
- [12 - Changelog](doc/12-changelog.md)

---

## Project Status

Active project. Currently on the **AI automation roadmap**:

- ✅ Phase 1a — read-only tool calling (5 tools)
- 🔜 Phase 1b — write tools (`book_appointment`, `send_reminder`, `cancel_visit`) with confirmation UX
- 🔜 Multi-channel — WhatsApp / SMS alongside Telegram
- 🔜 Autonomous nightly agent — drafts next-day reminders, flags no-show risk

See [doc/14-features-progress.md](doc/14-features-progress.md) for the full roadmap.

---

## License

Private / internal. Not currently open source.
