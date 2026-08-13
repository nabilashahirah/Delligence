# 14 - Features & Progress

A living roadmap of every feature in the system. Update the **Status** column when the state changes.

**Status legend:** ✅ Done · 🟡 Partial / in progress · 🔴 Planned / not started

## Core features

| # | Feature | Status | Notes |
| --- | --- | --- | --- |
| 1 | Staff authentication (JWT + roles) | ✅ | admin / dentist / receptionist. See [07-auth.md](07-auth.md) |
| 2 | Patient CRUD | ✅ | IC & name search, soft-deactivate |
| 3 | Appointment booking (staff) | ✅ | Conflict detection, walk-in support |
| 4 | Calendar view | ✅ | |
| 5 | Live queue (staff) | ✅ | Auto-updates via WebSocket |
| 6 | Appointment status transitions | ✅ | State machine enforced |
| 7 | Reschedule / cancel | ✅ | |
| 8 | Treatment records with per-tooth surfaces | ✅ | |
| 9 | Prescriptions | ✅ | Drug, dosage, frequency, duration |
| 10 | Dashboard stats | ✅ | Today's appointments, avg wait, completion rate |

## Customer portal (public, no auth)

| # | Feature | Status | Notes |
| --- | --- | --- | --- |
| 11 | Customer lookup by IC | ✅ | |
| 12 | Self-service booking | ✅ | Auto-registers new customers |
| 13 | Slot availability picker | ✅ | 15-minute slots, 9am–5pm |
| 14 | Self check-in | ✅ | Confirmation page |
| 15 | Self cancellation | ✅ | With optional reason |
| 16 | Live queue visible to customer | ✅ | Own position highlighted |
| 17 | Walk-in booking flow | ✅ | |

## AI & ML

| # | Feature | Status | Notes |
| --- | --- | --- | --- |
| 18 | AI chat widget (Gemini) | ✅ | Grounded in today's clinic snapshot. Uses `gemini-flash-latest` |
| 19 | ML wait-time prediction | ✅ | GradientBoostingRegressor |
| 20 | Historical-avg fallback | ✅ | ≥3 samples required |
| 21 | Scheduled-duration fallback | ✅ | Last-resort |
| 36 | AI-drafted promo text (Gemini) | ✅ | "✨ Draft with AI" button — 4 tone presets |

## Real-time

| # | Feature | Status | Notes |
| --- | --- | --- | --- |
| 22 | WebSocket `refresh` broadcast | ✅ | On CRUD + status change |
| 23 | WebSocket `queue_update` broadcast | ✅ | On queue recalc |
| 24 | Auto-reconnect on client | ✅ | 3-second retry |

## Telegram notifications

| # | Feature | Status | Notes |
| --- | --- | --- | --- |
| 25 | Telegram bot integration | ✅ | See [13-notifications.md](13-notifications.md) |
| 26 | Customer linking via deep link | ✅ | `t.me/<bot>?start=<token>` |
| 27 | Telegram webhook | ✅ | `/api/v1/telegram/webhook` |
| 28 | 24h reminder | ✅ | APScheduler every 5 min |
| 29 | Check-in confirmation | ✅ | Sent on status → checked-in |
| 30 | "You're next" alert | ✅ | Fires when position = 1 |
| 31 | "Called in" alert | ✅ | Sent on status → in-progress |
| 32 | Manual promo broadcast (staff) | ✅ | Segments: all / upcoming / dormant |
| 33 | Message log & audit | ✅ | Every attempt recorded |
| 34 | Customer opt-out (`/stop`) | ✅ | Persisted on Patient model |
| 35 | Deduplication per event | ✅ | Enforced via MessageLog |
| 49 | Live Telegram preview in composer | ✅ | Renders `<b>`, `<i>`, `<u>`, `<s>`, `<code>` safely |

## Branding & UI polish

| # | Feature | Status | Notes |
| --- | --- | --- | --- |
| 50 | Public landing page | ✅ | Dark hero, dual CTAs, feature strip |
| 51 | Dark theme for all public pages | ✅ | Landing / portal / login-left share `#0D0B21` + glow blobs |
| 52 | Domain-agnostic copy | ✅ | No "clinic" or "dental" in public marketing pages |
| 53 | Brand logo across app | ✅ | `Delligence2.png` in nav, sidebar, portal, login |
| 54 | Messages page UI redesign | ✅ | Gradient audience cards, live bubble preview, filter |
| 55 | AI chat widget redesign | ✅ | Brand-gradient bubble, speech tails, typing dots |
| 56 | Auth-aware landing redirect | ✅ | Logged-in staff skip landing, go to `/dashboard` |

## Nice-to-haves (not started)

| # | Feature | Status | Notes |
| --- | --- | --- | --- |
| 37 | AI-personalised reminders | 🔴 | Gemini writes reminder using patient name/history |
| 38 | AI FAQ replies in bot | 🔴 | Bot answers "how much is a cleaning?" via Gemini |
| 39 | SMS fallback (Twilio) | 🔴 | For patients without Telegram |
| 40 | Email reminders | 🔴 | SendGrid / Resend |
| 41 | Post-visit feedback survey | 🔴 | Sent after completion |
| 42 | Recurring reminders (1h, 3h) | 🔴 | Just add env var and jobs |
| 43 | Rich media (images, buttons) | 🔴 | Telegram supports inline keyboards |
| 44 | Analytics dashboard for notifications | 🔴 | Sent/failed/opt-out charts |
| 45 | Multi-language templates | 🔴 | EN/BM/ZH |
| 46 | Two-factor auth for staff | 🔴 | |
| 47 | Payment / invoicing module | 🔴 | |
| 48 | Insurance claim workflow | 🔴 | |
| 57 | Migrate portal sub-pages to dark theme | 🟡 | Shell is dark; `PortalBookPage`, `PortalConfirmationPage`, `PortalQueuePage`, `PortalWalkInPage` still use light content |
| 58 | Dashboard copy de-clinic'd | 🔴 | Staff dashboard still says "clinic" in a few strings |

## Next-level upgrade roadmap (not processed yet)

Prioritised by impact-per-effort. All items 🔴 unless noted.

### Tier 1 — Turn the LLM into a real agent
| # | Feature | Status | Notes |
| --- | --- | --- | --- |
| 59 | RAG over MongoDB (patients, treatments, appointments) | 🔴 | Use Mongo Atlas Vector Search (already on Atlas) or Qdrant. Lets AI chat answer real patient-history questions instead of hallucinating |
| 60 | Tool-calling loop for Gemini (read-only tools) | ✅ | Phase 1a done 2026-07-26. 5 tools: `find_patient`, `get_patient_history`, `get_queue_status`, `get_appointments_for`, `check_availability`. See [09-ai-ml.md](09-ai-ml.md). Write tools + Telegram wiring = Phase 1b |

### Tier 2 — Make it feel autonomous
| # | Feature | Status | Notes |
| --- | --- | --- | --- |
| 61 | Nightly agent job: draft next-day reminders + flag no-show risk | 🔴 | Combine ML wait-time / no-show signals with LLM drafting; human one-click approval |
| 62 | Multi-channel messaging (WhatsApp Business / Twilio SMS) | 🔴 | Same agent brain, add channels beyond Telegram |

### Tier 3 — Production credibility
| # | Feature | Status | Notes |
| --- | --- | --- | --- |
| 63 | LLM eval suite | 🔴 | Fixed set of "user says X → bot should do Y" cases. Guards prompt/model changes |
| 64 | LLM observability (Langfuse / LangSmith / Helicone) | 🔴 | Trace every AI call for debugging + cost visibility |
| 65 | Auth hardening: refresh tokens + rate limits on `/public/*` and AI endpoints | 🔴 | LLM endpoints cost money — protect from abuse |
| 66 | Redis (pub/sub for multi-worker WS, LLM response cache, background jobs) | 🔴 | Unblocks horizontal scale; replaces in-process APScheduler when needed |
| 67 | Secret-scanning pre-commit hook (gitleaks / git-secrets) | 🔴 | Prevent repeat of the 2026-07-26 Telegram + Gemini key leak |

### Tier 4 — Product polish
| # | Feature | Status | Notes |
| --- | --- | --- | --- |
| 68 | ML explainability panel (feature importances, recent accuracy) | 🔴 | Turns wait-time black box into a trust feature |
| 69 | Provider-agnostic LLM adapter (Gemini / Claude / GPT behind one interface) | 🔴 | Enables A/B testing and vendor negotiation |

**Recommended first move:** #59 + #60 together — RAG + tool-calling on the Telegram bot. This is the jump from "AI-assisted CRUD app" to genuine AI automation product.

## Decisions log

| Date | Decision | Rationale |
| --- | --- | --- |
| 2026-07-20 | Documentation set created under `doc/` | Single source of truth per user request |
| 2026-07-22 | Telegram chosen over WhatsApp/SMS/Email | Free, easy to prototype, popular in Malaysia |
| 2026-07-22 | 24h-only reminders (not 1h + 3h) | Minimise spam; can add more later via env var |
| 2026-07-22 | Queue notifications limited to check-in + "next" + "called in" | Avoid position-change spam and delay anxiety |
| 2026-07-22 | Deep-link linking (not IC-in-chat) | Smoother UX; no manual typing |
| 2026-07-22 | APScheduler in-process (not Celery) | Simpler for single-server deploy |
| 2026-07-23 | Gemini model → `gemini-flash-latest` | Free-tier for `gemini-2.0-flash` was 0; `gemini-1.5-flash` retired. `-latest` alias tracks a current supported model |
| 2026-07-23 | Public pages go dark, staff app stays light | Marketing pages feel modern with the brand gradient on dark; staff need light for long working sessions |
| 2026-07-23 | Public marketing copy is domain-agnostic | User wants the product adaptable to any appointment-based business, even though internal features are dental |
| 2026-07-23 | Bot username `@DentelligenceBot` kept (not `@DelligenceBot`) | `DelligenceBot` was unavailable / not changed on BotFather; display name is `DelligenceBot` |
