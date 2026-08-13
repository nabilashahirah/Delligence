# 09 - AI & ML

## AI Chat (Google Gemini) — tool-calling agent

### Service — [app/services/ai_chat.py](../app/services/ai_chat.py)

- Uses **`gemini-flash-latest`** via the `google-genai` SDK. This alias tracks whichever current model Google recommends — safer than pinning a version that may be retired or drop from your free-tier quota. `max_output_tokens` is 1024 to leave headroom for the model's internal thinking overhead.
- Requires `GEMINI_API_KEY` in `.env`.
- **Architecture: tool-calling loop** (Phase 1a of the AI-automation roadmap). Instead of pre-building a JSON context blob, the LLM is given a set of **read-only tools** and decides which to call. The service loops (up to `MAX_TOOL_ITERATIONS = 6`) — model call → execute any function calls → feed results back → repeat until the model produces a plain text answer.
- This makes the assistant an **agent**, not a chatbot: it takes actions (queries Mongo through tools) rather than answering from a fixed context.

### Tools — [app/services/ai_tools.py](../app/services/ai_tools.py)

All read-only. Registered in `TOOL_REGISTRY` and declared to Gemini via `TOOL_DECLARATIONS`.

| Tool | Purpose |
| --- | --- |
| `find_patient(query, limit=5)` | Search patients by name substring, IC/passport, or phone |
| `get_patient_history(patient_id, limit=10)` | Recent appointments + treatments + medical history for one patient |
| `get_queue_status()` | Current live queue snapshot (scheduled / checked-in / in-progress today) |
| `get_appointments_for(date, dentist=None)` | Schedule for a specific date, optionally filtered by dentist |
| `check_availability(date, dentist)` | Open 30-min slots for a dentist on a date (clinic hours 9–17) |

Write tools (booking, sending messages, cancelling) are deliberately **out of scope for Phase 1a** — they arrive in Phase 1b with a confirmation UX.

### Cost / latency note

Each user question now costs 2–4 Gemini calls (one per loop iteration). Expect ~2–5s end-to-end latency vs. ~1s for the old single-shot. The tradeoff is factual grounding: the model can no longer hallucinate a patient because it must call `find_patient` first.

### Route

`POST /api/v1/ai/chat` — body `{ "message": "How many patients are waiting right now?" }`.

### Frontend

Rendered by `AIChatWidget` (floating panel). Uses `client/src/api/ai.api.js`.

## AI Promo Drafting

Staff can turn a short brief into a polished Telegram promo message.

- Endpoint: `POST /api/v1/messages/draft` — body `{brief, tone}` where `tone ∈ {friendly, professional, playful, urgent}`.
- Backend: `ai_chat.draft_promo` — same Gemini 2.0 Flash client, different system prompt (`_PROMO_SYSTEM`).
- Frontend: **"✨ Draft with AI"** button on the Messages page opens a dialog. On generation, the returned text is placed in the compose textarea for staff review before sending.

The system prompt enforces:
- 2–4 short sentences
- One optional starting emoji
- Telegram HTML only (`<b>`, `<i>`)
- No made-up prices/dates/URLs
- Soft call-to-action ending

## Wait-Time Prediction (ML)

### Model — `models/wait_time_model.pkl`

Trained by [scripts/generate_and_train.py](../scripts/generate_and_train.py).

- **Algorithm:** `GradientBoostingRegressor` (scikit-learn).
- **Features:** appointment type, dentist, hour of day, day of week, queue depth.
- **Target:** actual duration in minutes.
- **Training data:** 2000 synthetic appointments with realistic type-duration distributions and per-dentist speed multipliers.

Regenerate:
```powershell
python scripts/generate_and_train.py
```

### Predictor — [app/services/ml_predictor.py](../app/services/ml_predictor.py)

- Loaded once at startup (see [app/main.py](../app/main.py) lifespan).
- Falls back gracefully if `wait_time_model.pkl` is missing.
- Called by `services/prediction.recalculate_queue` for every active appointment.

### Prediction Priority — [app/services/prediction.py](../app/services/prediction.py)

For each active appointment:
1. **ML model** (if loaded).
2. **Historical average** — mean `actual_wait_minutes` for the same appointment type (requires ≥3 completed samples).
3. **Scheduled duration** — fallback.

Results are written to `appointment.predicted_wait_minutes` and broadcast via `queue_update`.

### Recording Ground Truth

When an appointment transitions to `in-progress`, the service records `actual_wait_minutes = started_at - checked_in_at`. This grows the training corpus for future retraining.
