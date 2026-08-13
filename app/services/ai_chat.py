from datetime import datetime
from google import genai
from google.genai import types
from app.config import settings
from app.services.ai_tools import TOOL_REGISTRY

client = genai.Client(api_key=settings.gemini_api_key)

_SYSTEM = """You are Dentelligence Assistant, an AI agent embedded in a dental clinic management system.
You help clinic staff by answering questions about patients, appointments, the queue, and availability.

You have tools available. Use them whenever a question requires live data — do not guess.
Typical patterns:
- "Who is patient X / when did X last visit?" -> find_patient, then get_patient_history
- "What's the queue like?" -> get_queue_status
- "Show me tomorrow's schedule" -> get_appointments_for
- "When is Dr. Y free on Friday?" -> check_availability

Rules:
- Answer concisely and factually using only tool results.
- Never invent patient names, IDs, times, or medical data.
- If a tool returns an error or no results, say so plainly.
- Today's date (UTC) is provided below; interpret relative dates against it.

Formatting:
- Output plain text only. No markdown — no **bold**, no *italics*, no #headings, no backticks.
- Use short paragraphs separated by blank lines.
- For lists, use a simple dash and space: "- item". No numbered lists unless order matters.
- Keep answers under 8 lines when possible."""


async def answer(question: str) -> str:
    """Tool-calling agent via SDK automatic function calling."""
    today = datetime.utcnow().strftime("%Y-%m-%d")
    prompt = f"Today (UTC): {today}\n\nQuestion: {question}"

    resp = await client.aio.models.generate_content(
        model="gemini-flash-latest",
        contents=prompt,
        config=types.GenerateContentConfig(
            system_instruction=_SYSTEM,
            tools=list(TOOL_REGISTRY.values()),
            max_output_tokens=1024,
        ),
    )
    return resp.text or ""


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
