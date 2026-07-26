# 06 - API Reference

All routes are prefixed with `/api/v1` unless stated otherwise. Auth is via `Authorization: Bearer <JWT>` header.

Response envelope:
```json
{ "success": true, "data": {...} }
```

## Auth — `/auth`

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | `/register` | No | Create a new staff account. Body: `{name, email, password, role}` → `201` |
| POST | `/login` | No | Body: `{email, password}` → `{token, staff}` |
| GET | `/me` | Yes | Current authenticated staff |

## Patients — `/patients`

| Method | Path | Description |
| --- | --- | --- |
| GET | `/` | List patients (query: `search`, `page`, `limit`) |
| POST | `/` | Create patient |
| GET | `/{id}` | Get patient by id |
| PATCH | `/{id}` | Update patient |
| DELETE | `/{id}` | Soft-deactivate patient |

## Appointments — `/appointments`

| Method | Path | Description |
| --- | --- | --- |
| GET | `/` | List (filters: `date`, `dentist`, `status`, `patient_id`, `page`, `limit`) |
| GET | `/conflict` | Check dentist availability: `?dentist=&scheduled_at=&duration_minutes=` |
| POST | `/` | Create appointment (conflict-checked) |
| GET | `/{id}` | Detail |
| PATCH | `/{id}` | Update fields |
| PATCH | `/{id}/status` | Transition status. Body: `{status, reason?}` |
| PATCH | `/{id}/reschedule` | Reschedule. Body: `{scheduled_at, duration_minutes?}` |

## Queue — `/queue`

| Method | Path | Description |
| --- | --- | --- |
| GET | `/` | Today's active queue (`?dentist=` optional). Returns items sorted by status priority + check-in time |

## Treatments — `/treatments`

| Method | Path | Description |
| --- | --- | --- |
| POST | `/` | Record treatment |
| GET | `/patient/{id}` | Paginated treatments for a patient |
| GET | `/{id}` | Detail |
| PATCH | `/{id}` | Update |

## Public Portal — `/public` (no auth)

| Method | Path | Description |
| --- | --- | --- |
| GET | `/lookup?ic=` | Lookup patient by IC / passport |
| GET | `/slots?dentist=&date=` | Available slots for a date |
| POST | `/book` | Self-service booking |
| GET | `/appointment/{id}` | Public appointment view |
| PATCH | `/checkin/{id}` | Self check-in |
| PATCH | `/cancel/{id}` | Self cancellation |

## Dashboard — `/dashboard`

| Method | Path | Description |
| --- | --- | --- |
| GET | `/stats` | Totals: patients, today's appointments, completion rate, avg wait time, queue depth |

## AI — `/ai`

| Method | Path | Description |
| --- | --- | --- |
| POST | `/chat` | Body: `{message}` → Gemini reply grounded in live clinic context |

## Telegram — `/telegram`

See [13-notifications.md](13-notifications.md) for the full linking flow.

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | `/link-token` | No | Body: `{ic}` → generate deep link `t.me/<bot>?start=<token>` |
| GET | `/status?ic=` | No | `{linked, linkedAt, optout}` |
| POST | `/optout` | No | Body: `{ic}` → set `telegram_optout = true` |
| POST | `/webhook` | No (secret hdr) | Telegram → us. Not to be called manually |

## Messages — `/messages`

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | `/promo` | Yes | Body: `{message, segment}` — `segment ∈ {all_linked, with_upcoming, no_visit_6mo}` |
| POST | `/draft` | Yes | Body: `{brief, tone}` — Gemini writes a polished promo. `tone ∈ {friendly, professional, playful, urgent}` |
| GET | `` | Yes | Paginated `MessageLog` list. Query: `page`, `limit`, `event` |
| GET | `/stats` | Yes | `{linkedPatients, totalPatients, sentToday}` |

## WebSocket — `/ws`

Not under `/api/v1`. See [08-realtime.md](08-realtime.md).

## Errors

Errors return:
```json
{ "success": false, "error": "message", "status_code": 400 }
```

Common status codes: `400` invalid input, `401` unauthenticated, `403` forbidden, `404` not found, `409` conflict (e.g., duplicate IC or overlapping appointment).
