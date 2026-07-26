import json
from datetime import datetime
from google import genai
from google.genai import types
from app.config import settings
from app.models.appointment import Appointment

client = genai.Client(api_key=settings.gemini_api_key)

_SYSTEM = """You are Dentelligence Assistant, an AI helper embedded in a dental clinic management system.
You help clinic staff quickly understand today's schedule, queue status, and appointment metrics.
Answer concisely and factually using only the context data provided.
If asked about something not in the context, say you don't have that information.
Never invent patient names or data."""


async def _build_context() -> str:
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = now.replace(hour=23, minute=59, second=59, microsecond=0)

    appts = await Appointment.find({
        "scheduled_at": {"$gte": today_start, "$lte": today_end},
    }).to_list()

    status_counts: dict[str, int] = {}
    dentist_counts: dict[str, int] = {}
    for a in appts:
        s = a.status.value
        status_counts[s] = status_counts.get(s, 0) + 1
        dentist_counts[a.dentist] = dentist_counts.get(a.dentist, 0) + 1

    active = [a for a in appts if a.status.value in ("checked-in", "in-progress", "scheduled")]
    order = {"in-progress": 0, "checked-in": 1, "scheduled": 2}
    active.sort(key=lambda a: (order.get(a.status.value, 9), a.checked_in_at or a.scheduled_at))

    waited = [a.actual_wait_minutes for a in appts
              if a.status.value == "completed" and a.actual_wait_minutes is not None]

    ctx = {
        "current_time_utc": now.strftime("%Y-%m-%d %H:%M"),
        "today_total_appointments": len(appts),
        "status_breakdown": status_counts,
        "dentist_counts_today": dentist_counts,
        "active_queue": [
            {"position": i + 1, "status": a.status.value, "dentist": a.dentist, "type": a.type.value}
            for i, a in enumerate(active[:15])
        ],
        "avg_wait_minutes_today": round(sum(waited) / len(waited)) if waited else None,
    }
    return json.dumps(ctx, indent=2)


async def answer(question: str) -> str:
    context = await _build_context()

    resp = await client.aio.models.generate_content(
        model="gemini-flash-latest",
        contents=f"Clinic data (live):\n{context}\n\nQuestion: {question}",
        config=types.GenerateContentConfig(
            system_instruction=_SYSTEM,
            max_output_tokens=1024,
        ),
    )
    return resp.text


_PROMO_SYSTEM = """You are a marketing copywriter for a dental clinic writing promotional
Telegram messages to patients. Follow these rules strictly:

- Output ONLY the message text, no preamble like "Here's the message:".
- 2 to 4 short sentences. Warm, friendly, professional.
- One relevant emoji at the start is fine (🦷 ✨ 💫 🎉). Do not spam emojis.
- You MAY use Telegram HTML: <b>bold</b>, <i>italic</i>. No other tags.
- Never invent prices, dates, or offers not in the user's brief.
- End with a soft call-to-action (e.g. "Book via our portal.").
- Do NOT include phone numbers, URLs, or contact info unless the brief provides them."""


async def draft_promo(brief: str, tone: str = "friendly") -> str:
    """Turn a short staff brief into a polished Telegram promo message."""
    prompt = (
        f"Tone: {tone}\n"
        f"Brief from staff: {brief}\n\n"
        f"Write the promo message now."
    )
    resp = await client.aio.models.generate_content(
        model="gemini-flash-latest",
        contents=prompt,
        config=types.GenerateContentConfig(
            system_instruction=_PROMO_SYSTEM,
            max_output_tokens=1024,
        ),
    )
    return (resp.text or "").strip()
