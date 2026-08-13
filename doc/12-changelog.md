# 12 - Documentation Changelog

Track meaningful documentation changes here. Newest first.

## 2026-07-26 (AI chat → tool-calling agent, Phase 1a)

- **New:** [app/services/ai_tools.py](../app/services/ai_tools.py) — 5 read-only tool executors (`find_patient`, `get_patient_history`, `get_queue_status`, `get_appointments_for`, `check_availability`) plus their Gemini `FunctionDeclaration` schemas.
- **Rewritten:** [app/services/ai_chat.py](../app/services/ai_chat.py) `answer()` is now a tool-calling loop (max 6 iterations) instead of a pre-built JSON context blob. The LLM decides which tools to invoke, sees the results, and produces a grounded answer. `draft_promo()` is unchanged.
- Updated [doc/09-ai-ml.md](09-ai-ml.md) with the new architecture, tool table, and latency/cost note.
- Marks item #60 in the [roadmap](14-features-progress.md) as delivered. Item #59 (RAG) intentionally deferred — for structured Mongo data, tools are simpler and more accurate than embeddings.

## 2026-07-23 (patient detail full-width)

- Reverted `PatientDetailPage` to fill the container (was `max-w-4xl mx-auto`, now no cap). Detail pages have richer content (info card + treatment history) and read better spanning the full 1600px layout container, matching list pages like `PatientsPage`.

## 2026-07-23 (portal registration entry)

- **New:** third quick-action on the portal landing: **"New here? Register & book"** — routes to `/portal/book` with `state: { newCustomer: true }`.
- Updated `PortalBookPage` — accepts `newCustomer` mode (no IC lookup required), collects IC as a field inside the registration section, uses `form.icNumber` when `state.ic` is absent. Existing lookup flow unchanged.
- Copy: heading now differentiates "Welcome! Fill in your details to register and book." for new-customer entry vs. "New here — please complete your details." for lookup-not-found fallback.

## 2026-07-23 (form centering)

- All form pages (`NewAppointmentPage`, `NewPatientPage`, `EditPatientPage`, `PatientDetailPage`, `NewTreatmentPage`) now use `mx-auto` on their top wrapper so they sit centered inside the 1600px layout container instead of hugging the left edge. Bumped `NewAppointmentPage` from `max-w-xl` → `max-w-2xl` and `PatientDetailPage` from `max-w-3xl` → `max-w-4xl` for a more balanced look on wide monitors.

## 2026-07-23 (layout fix)

- **AppLayout** now wraps the `<Outlet />` in a `max-w-[1600px] mx-auto` container so all staff pages get a consistent width on wide monitors. Individual pages should no longer set their own `max-w-*` on the top-level wrapper.
- Removed `max-w-6xl` from `DashboardPage` and `MessagesPage` — they were the only pages capped at 1152px, causing an inconsistent look next to `PatientsPage`, `AppointmentsPage`, `QueuePage`, `CalendarPage` which had no cap.
- `Card` component now has `overflow-hidden` so children respect the rounded corners.
- Wrapped `PatientsPage` table in `overflow-x-auto` with `min-w-[640px]` so it scrolls horizontally on narrow viewports instead of breaking the layout.

## 2026-07-23 (docs sync)

- Refreshed [04-frontend.md](04-frontend.md) — reorganised routing table (public vs staff), expanded design-system section (dark public pages, brand colors, glassmorphism, radial glow pattern), added copy-tone note.
- Refreshed [14-features-progress.md](14-features-progress.md) — added "Branding & UI polish" section, updated decisions log with all 2026-07-23 calls (Gemini model swap, dark public theme, domain-agnostic copy, bot username), added `PortalBookPage` etc. as partial dark-theme migration, added "dashboard de-clinic" as todo.
- Added brand-name clarification to [01-overview.md](01-overview.md) — public name is **Delligence**, internal code stays "Dentelligence".
- [README.md](README.md) — added rows for route/design changes to the update-mapping table.
- [09-ai-ml.md](09-ai-ml.md) — noted `gemini-flash-latest` alias and 1024 token headroom.
- [13-notifications.md](13-notifications.md) — noted live Telegram preview + `renderTelegramHtml` helper.

## 2026-07-23

- **Copy: Login page de-clinic'd** — "Intelligent Clinic Operations" → "Intelligent Operations", "Patient First / Care-centred" → "People First / User-centred", "Real-time clinic insights" → "Real-time insights", "manage patients" → "manage customers", `you@clinic.com` → `you@company.com`. Matches the domain-agnostic landing page.

- **UI: Portal switched to dark theme** — matches the landing page (`#0D0B21` background, pink/purple/gold glow blobs, glassmorphic card, translucent inputs, light text). All portal sub-pages inherit automatically via the shared `PortalShell`. Note: sub-pages that render their own content (e.g. `PortalConfirmationPage`) still use light body copy — they may look inconsistent until they're brought over too; ask to migrate them next if needed.

- **New: Public landing page** at `/` — hero, dual CTAs ("I'm a Customer" → `/portal`, "Staff Sign In" → `/login`), feature strip, stats. Dark navy hero with pink/purple gradient blobs. Uses `/Delligence2.png` logo in the nav (no text branding — logo already contains the name). Copy is domain-agnostic ("practice management", not "clinic"). Auto-redirects authenticated staff to `/dashboard`. New file: [client/src/pages/LandingPage.jsx](../client/src/pages/LandingPage.jsx).

- **UI: Messages page redesigned** — brand pink/purple theme, audience picker as gradient cards, live Telegram-style bubble preview, filterable history, gradient send button, refined AI-draft dialog.
- **UI: AI chat widget redesigned** — brand gradient bubble with pulse ring, glassmorphic header, chat bubbles with speech-bubble tails, animated typing dots, purple-tinted background.

- **Small: Live Telegram preview** under the compose textarea on the Messages page. Renders `<b>`, `<i>`, `<u>`, `<s>`, `<code>` safely via `renderTelegramHtml` helper.
- **Fix: Gemini model swap.** Old model `gemini-2.0-flash` returns 0-quota on some API keys; switched to `gemini-flash-latest` and bumped `max_output_tokens` to 1024 to account for thinking overhead. Fixes both AI chat and AI promo draft.

- **New: AI-drafted promos.**
  - Added `draft_promo` in [ai_chat.py](../app/services/ai_chat.py) — Gemini 2.0 Flash with a strict marketing system prompt.
  - New endpoint `POST /api/v1/messages/draft` — body `{brief, tone}`.
  - "✨ Draft with AI" button on the Messages page opens a dialog with 4 tone presets.
  - Updated [06-api-reference.md](06-api-reference.md), [09-ai-ml.md](09-ai-ml.md), [13-notifications.md](13-notifications.md), [14-features-progress.md](14-features-progress.md).

## 2026-07-22

- **New: Telegram notifications feature.**
  - Added [13-notifications.md](13-notifications.md) — full Telegram integration guide (bot setup, webhook, linking flow, events, endpoints, troubleshooting).
  - Added [14-features-progress.md](14-features-progress.md) — living feature roadmap with status column.
  - Updated [README.md](README.md) — index entries and update-mapping.
  - Updated [02-getting-started.md](02-getting-started.md) — new env vars: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`, `TELEGRAM_WEBHOOK_SECRET`, `PUBLIC_PORTAL_URL`, `REMINDER_HOURS_BEFORE`, `SCHEDULER_INTERVAL_MINUTES`.
  - Updated [03-backend.md](03-backend.md) — new routers (`telegram`, `messages`) and services (`telegram`, `notifications`, `reminders`).
  - Updated [04-frontend.md](04-frontend.md) — new `MessagesPage` route, new API modules, `LinkTelegramButton` component.
  - Updated [05-database-models.md](05-database-models.md) — Patient telegram fields; new `MessageLog` collection.
  - Updated [06-api-reference.md](06-api-reference.md) — `/telegram/*` and `/messages/*` endpoint tables.

## 2026-07-20

- Initial documentation set created:
  - Overview, getting started, backend, frontend, database, API reference, auth, real-time, AI/ML, scripts, deployment.
- Documented endpoints, models, WebSocket events, and ML prediction fallback chain based on current codebase state.
