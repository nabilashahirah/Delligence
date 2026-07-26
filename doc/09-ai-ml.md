# 09 - AI & ML

## AI Chat (Google Gemini)

### Service — [app/services/ai_chat.py](../app/services/ai_chat.py)

- Uses **`gemini-flash-latest`** via the `google-genai` SDK. This alias tracks whichever current model Google recommends — safer than pinning a version that may be retired or drop from your free-tier quota. `max_output_tokens` is 1024 to leave headroom for the model's internal thinking overhead.
- Requires `GEMINI_API_KEY` in `.env`.
- Each request:
  1. Fetches today's appointments (status counts, active queue, avg wait time).
  2. Serialises the snapshot as JSON context.
  3. Sends a system prompt instructing the model to answer **only** from that context.
  4. Returns the model's text response.

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
