# 01 - Overview & Architecture

> **Brand note:** the shipping product name is **Delligence** (what the logo reads and what appears on all public pages). "Dentelligence" is the internal working name kept in code, routes, docs, and the repo folder. Public-facing copy uses **Delligence** and avoids domain-specific words like "clinic" or "dental" so the product is adaptable to any appointment-based business.

## Tech Stack

### Backend
- **Framework:** FastAPI 0.111 (async Python)
- **Server:** Uvicorn (ASGI)
- **Database:** MongoDB (Atlas or local)
- **ODM:** Beanie 1.26 (built on Motor async driver)
- **Auth:** JWT via `python-jose` + bcrypt password hashing
- **Validation:** Pydantic v2 (camelCase-serialized responses)
- **ML:** scikit-learn (GradientBoostingRegressor)
- **AI:** Google Gemini 2.0 Flash via `google-genai` SDK
- **Logging:** loguru

### Frontend
- **Framework:** React 19 + Vite
- **Routing:** react-router-dom v7
- **State:** Zustand (auth) + TanStack React Query v5 (server state)
- **HTTP:** Axios (JWT interceptor)
- **Styling:** Tailwind CSS v4
- **Icons:** lucide-react
- **Notifications:** react-hot-toast

## High-Level Architecture

```
┌──────────────────────┐         HTTP (REST)          ┌────────────────────────┐
│   React Frontend     │ ───────────────────────────► │  FastAPI Backend       │
│   (Vite, port 3000)  │ ◄─────────────────────────── │  (Uvicorn, port 8000)  │
│                      │                              │                        │
│  - Pages/Components  │         WebSocket            │  - Routers             │
│  - React Query cache │ ◄──────────────────────────► │  - Services            │
│  - Zustand auth      │         (/ws)                │  - Beanie models       │
│  - Axios (JWT)       │                              │  - ML predictor        │
└──────────────────────┘                              │  - Gemini AI chat      │
                                                       └───────────┬────────────┘
                                                                   │
                                                                   ▼
                                                       ┌────────────────────────┐
                                                       │  MongoDB (Atlas/local) │
                                                       │  Collections:          │
                                                       │  - patients            │
                                                       │  - staff               │
                                                       │  - appointments        │
                                                       │  - treatments          │
                                                       └────────────────────────┘
```

## Repository Layout

```
Dentelligence/
├── app/                          # FastAPI backend
│   ├── main.py                   # Entry point + lifespan
│   ├── config.py                 # Pydantic settings from .env
│   ├── database.py               # Motor + Beanie init
│   ├── models/                   # Beanie Document classes
│   │   ├── patient.py
│   │   ├── staff.py
│   │   ├── appointment.py
│   │   └── treatment.py
│   ├── routers/                  # HTTP + WS route handlers
│   │   ├── auth.py
│   │   ├── patients.py
│   │   ├── appointments.py
│   │   ├── queue.py
│   │   ├── treatments.py
│   │   ├── portal.py
│   │   ├── dashboard.py
│   │   ├── ai.py
│   │   └── ws.py
│   ├── schemas/                  # Pydantic request/response
│   ├── services/                 # Business logic
│   ├── dependencies/             # FastAPI DI (auth)
│   └── utils/                    # Errors, response, ws_manager
├── client/                       # React frontend
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   ├── pages/
│   │   ├── components/
│   │   ├── api/                  # Axios modules
│   │   ├── store/                # Zustand
│   │   ├── hooks/                # useRealtimeSync, etc.
│   │   └── styles/
│   ├── package.json
│   └── vite.config.js
├── models/                       # ML artefacts (wait_time_model.pkl)
├── scripts/                      # generate_and_train.py
├── seed.py                       # Create admin
├── seed_demo.py                  # Demo data
├── reset_password.py             # Admin pwd reset
├── fix_staff.py                  # Bulk activate staff
├── requirements.txt
├── .env                          # Secrets (DO NOT COMMIT)
└── doc/                          # This documentation
```

## Core Concepts

- **Queue-driven UX:** the queue view is the operational heart. Predictions update automatically as statuses change and are broadcast over WebSocket.
- **camelCase responses:** all Pydantic schemas extend a `CamelModel` base so the API speaks camelCase to the JS frontend.
- **API versioning:** all REST routes live under `/api/v1`.
- **Public portal:** the `/api/v1/public/*` routes are unauthenticated and allow patients to self-service.
