# 13 - Notifications (Telegram)

Dentelligence sends automated messages to patients via a **Telegram Bot**.

## What patients receive

| Event | When | Deduplicated? |
| --- | --- | --- |
| **24h reminder** | ~24h before `scheduled_at` (scanned every 5 min) | Yes — 1 per appointment |
| **Check-in confirmation** | On status → `checked-in` (staff or portal) | Yes — 1 per appointment |
| **You're next** | On queue recalculation, when patient becomes #1 in the queue | Yes — 1 per appointment |
| **Called in** | On status → `in-progress` | Yes — 1 per appointment |
| **Promo / broadcast** | Manually sent by staff from the Messages page | No — can send repeatedly |

**Deduplication** is enforced by scanning [`MessageLog`](05-database-models.md) for a prior `sent` entry with the same `appointment_id` + `event`.

**Opt-out:** patients can send `/stop` to the bot, which flips `patient.telegram_optout = true`. Staff messages are then skipped and logged with `status = skipped`.

## Architecture

```
┌────────────────────┐    scheduler_interval    ┌──────────────────────┐
│  APScheduler       │  ────── every 5 min ───► │  reminders.scan()    │
│  (in-process)      │                          │  finds due appts,    │
└────────────────────┘                          │  sends via telegram  │
                                                 └──────────────────────┘
                                                            │
Appointment status change ───────► notifications.send_*  ──┤
Queue recalculated       ───────► notifications.on_queue_recalculated
                                                            │
                                                            ▼
                                        ┌──────────────────────────────┐
                                        │  services/telegram.py        │
                                        │  → api.telegram.org/bot...   │
                                        └──────────────────────────────┘
                                                            │
                                                            ▼
                                        ┌──────────────────────────────┐
                                        │  MessageLog (audit + dedup)  │
                                        └──────────────────────────────┘

Patient sends /start <token> ────► Telegram POST → /api/v1/telegram/webhook
                                              → look up token → save chat_id
```

## 1. Create the bot (one-time)

1. Open Telegram and message **@BotFather**.
2. Send `/newbot`. Choose a name and username (must end in `bot`, e.g. `DentelligenceBot`).
3. BotFather returns a **token** like `123456789:AAH...`. Copy it.
4. Optionally send `/setdescription`, `/setuserpic`, `/setcommands`:
   ```
   start - Link your patient account
   stop - Unsubscribe from notifications
   help - Show help
   ```

## 2. Configure `.env`

```
TELEGRAM_BOT_TOKEN=123456789:AAH...
TELEGRAM_BOT_USERNAME=DentelligenceBot        # no @, no https://
TELEGRAM_WEBHOOK_SECRET=any_random_string     # optional but recommended
PUBLIC_PORTAL_URL=https://your-portal.example.com/portal
REMINDER_HOURS_BEFORE=24
SCHEDULER_INTERVAL_MINUTES=5
```

If `TELEGRAM_BOT_TOKEN` is empty the scheduler is not started and all Telegram calls become no-ops — the app runs normally.

## 3. Register the webhook

Telegram needs a public HTTPS URL to POST updates to. In development use **ngrok** (or Cloudflare Tunnel).

```bash
# Terminal 1 — run the backend
uvicorn app.main:app --reload --port 8000

# Terminal 2 — expose port 8000 publicly
ngrok http 8000
# note the https URL, e.g. https://abcd-1234.ngrok-free.app

# Terminal 3 — register the webhook with Telegram
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
     -H "Content-Type: application/json" \
     -d '{
       "url": "https://abcd-1234.ngrok-free.app/api/v1/telegram/webhook",
       "secret_token": "any_random_string"
     }'
```

Check registration:
```bash
curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
```

## 4. Patient linking flow

Implemented on [PortalConfirmationPage.jsx](../client/src/pages/portal/PortalConfirmationPage.jsx) via [`LinkTelegramButton`](../client/src/components/LinkTelegramButton.jsx).

```
Patient opens portal confirmation page
        │
        ▼
Frontend calls POST /api/v1/telegram/link-token   (body: {ic})
        │
        ▼
Backend generates one-time token, stores it on patient
Returns deep link: https://t.me/DentelligenceBot?start=<token>
        │
        ▼
Frontend opens deep link → Telegram app opens the bot
        │
        ▼
Patient taps Start → Telegram sends /start <token>
        │
        ▼
Telegram POSTs update → /api/v1/telegram/webhook
Backend looks up the token, sets patient.telegram_chat_id,
clears the token, sends confirmation message.
```

## 5. Endpoints reference

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/api/v1/telegram/link-token` | No | Generate one-time link token + deep link |
| GET  | `/api/v1/telegram/status?ic=...` | No | Check if patient is linked |
| POST | `/api/v1/telegram/optout` | No | Flip `telegram_optout = true` |
| POST | `/api/v1/telegram/webhook` | No (secret header) | Telegram → us |
| POST | `/api/v1/messages/promo` | Yes | Staff broadcast to a segment |
| POST | `/api/v1/messages/draft` | Yes | AI-draft a promo from a short brief |

The staff **Messages page** ([client/src/pages/messages/MessagesPage.jsx](../client/src/pages/messages/MessagesPage.jsx)) also renders a **live Telegram-style preview** underneath the composer. The `renderTelegramHtml` helper escapes all HTML and only re-enables the tags Telegram itself supports (`b`, `strong`, `i`, `em`, `u`, `s`, `code`) so what you see is exactly what patients will get.
| GET  | `/api/v1/messages` | Yes | Paginated log of sent messages |
| GET  | `/api/v1/messages/stats` | Yes | Linked patients count + sent today |

### Promo segments

| Segment | Description |
| --- | --- |
| `all_linked` | Every patient with a Telegram chat_id and no opt-out |
| `with_upcoming` | Only patients with at least one upcoming scheduled/checked-in appointment |
| `no_visit_6mo` | Patients who have NOT had a completed appointment in the last 180 days |

## 6. Files

- [app/services/telegram.py](../app/services/telegram.py) — Bot API client (sendMessage, setWebhook)
- [app/services/notifications.py](../app/services/notifications.py) — event templates + dedup
- [app/services/reminders.py](../app/services/reminders.py) — periodic reminder scanner
- [app/scheduler.py](../app/scheduler.py) — APScheduler wrapper
- [app/routers/telegram.py](../app/routers/telegram.py) — webhook + link endpoints
- [app/routers/messages.py](../app/routers/messages.py) — promo + history
- [app/models/message_log.py](../app/models/message_log.py) — audit log
- [client/src/components/LinkTelegramButton.jsx](../client/src/components/LinkTelegramButton.jsx)
- [client/src/pages/messages/MessagesPage.jsx](../client/src/pages/messages/MessagesPage.jsx)

## 7. Troubleshooting

| Symptom | Fix |
| --- | --- |
| Backend logs "Telegram notifications disabled" | Set `TELEGRAM_BOT_TOKEN` in `.env` and restart |
| `/start <token>` replies "This link has expired" | Portal issues single-use tokens — generate a new one |
| Patient never receives anything | Confirm `telegram_optout` is false in Mongo, and that webhook `getWebhookInfo` shows no errors |
| Webhook 403 | `TELEGRAM_WEBHOOK_SECRET` mismatch — either update `.env` or re-register the webhook |
| Reminder didn't fire | Check the scheduler is running (`[scheduler] started` in logs) and that `scheduled_at` really falls within the ±window |
