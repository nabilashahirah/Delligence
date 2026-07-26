# 03 - Backend

FastAPI application located in [app/](../app/).

## Entry Point — [app/main.py](../app/main.py)

- Creates the `FastAPI` app instance (title: **Dentelligence API v1.0.0**).
- `lifespan` async context manager:
  - On startup: `init_db()` (connects to Mongo + registers Beanie models) and loads the ML predictor.
  - On shutdown: closes the Mongo client.
- Registers global exception handlers for validation errors and generic runtime errors → structured JSON error responses.
- Mounts all routers under `/api/v1`.
- Exposes:
  - `GET /health` — liveness probe
  - `GET /api/docs` — Swagger UI

## Config — [app/config.py](../app/config.py)

Pydantic `BaseSettings` reads from `.env`. Case-insensitive. See [02-getting-started.md](02-getting-started.md) for the full list of env vars.

## Database — [app/database.py](../app/database.py)

- Async MongoDB via **Motor**.
- **Beanie** is initialised with the four `Document` models (Patient, Staff, Appointment, Treatment).
- TLS settings currently allow invalid certificates for the Atlas connection — revisit before production hardening.

## Routers ([app/routers/](../app/routers/))

| Router | Prefix | Purpose |
| --- | --- | --- |
| `auth.py` | `/api/v1/auth` | Register, login, /me |
| `patients.py` | `/api/v1/patients` | Patient CRUD |
| `appointments.py` | `/api/v1/appointments` | Appointment CRUD, conflict, status, reschedule |
| `queue.py` | `/api/v1/queue` | Live queue |
| `treatments.py` | `/api/v1/treatments` | Treatment records |
| `portal.py` | `/api/v1/public` | Patient self-service (no auth) |
| `dashboard.py` | `/api/v1/dashboard` | Aggregated stats |
| `ai.py` | `/api/v1/ai` | Gemini-powered chat |
| `telegram.py` | `/api/v1/telegram` | Telegram webhook + link tokens |
| `messages.py` | `/api/v1/messages` | Promo broadcast + message log |
| `ws.py` | `/ws` | WebSocket for realtime updates |

Full endpoint reference: [06-api-reference.md](06-api-reference.md).

## Services ([app/services/](../app/services/))

Business logic lives here — routers stay thin.

| Service | Responsibility |
| --- | --- |
| `auth.py` | Password hashing, JWT issuance, register/login |
| `patient.py` | Patient CRUD + search/pagination |
| `appointment.py` | CRUD + status transitions + conflict detection; broadcasts queue changes via WS |
| `queue.py` | Fetch active queue for a given dentist/day |
| `treatment.py` | Record and query treatments |
| `portal.py` | Patient lookup, slot calculation, self-booking |
| `dashboard.py` | Aggregate stats (today's appointments, avg wait, etc.) |
| `ai_chat.py` | Build clinic context JSON and call Gemini 2.0 Flash |
| `ml_predictor.py` | Load `wait_time_model.pkl` and predict appointment durations |
| `prediction.py` | Recalculate predicted waits for all queued patients; broadcast update; fire "you're next" notification |
| `telegram.py` | Low-level Telegram Bot API client (sendMessage, setWebhook) |
| `notifications.py` | Event templates + dedup + opt-out enforcement + MessageLog persistence |
| `reminders.py` | Periodic scanner that finds appointments due for 24h reminder |

## Schemas ([app/schemas/](../app/schemas/))

Pydantic v2 models used for **request validation** and **response serialisation**.

All extend `CamelModel`, which enables `populate_by_name=True` and applies a camelCase alias generator so responses look like `{"firstName": "..."}` while Python code uses `first_name`.

## Dependencies ([app/dependencies/auth.py](../app/dependencies/auth.py))

- `get_current_user` — decodes the `Authorization: Bearer <token>` header, loads the Staff document, and injects it into route handlers.
- `require_role(*roles)` — factory that returns a dependency asserting the current user has one of the given roles.

## Utilities ([app/utils/](../app/utils/))

- `errors.py` — `AppError` class with helpers (`bad_request`, `unauthorized`, `forbidden`, `not_found`, `conflict`).
- `response.py` — `serialize()` converts Beanie docs to camelCase dicts; `success()` and `created()` wrap responses in a consistent envelope.
- `ws_manager.py` — `ConnectionManager` maintains a set of active WebSocket clients and broadcasts JSON messages.

## Status Transition Rules

Appointment status transitions are enforced in `services/appointment.py`:

| From | Allowed Next |
| --- | --- |
| `scheduled` | `checked-in`, `cancelled`, `no-show` |
| `checked-in` | `in-progress`, `cancelled`, `no-show` |
| `in-progress` | `completed`, `cancelled` |
| `completed` | (terminal) |
| `cancelled` / `no-show` | (terminal) |

Any invalid transition returns HTTP 400.
