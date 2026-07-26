"""
Telegram integration endpoints.

Flow:
  1. Frontend calls POST /api/v1/telegram/link-token with a patient IC.
     Backend generates a one-time token, stores it on the patient, and
     returns a deep link `https://t.me/<bot_username>?start=<token>`.
  2. Patient taps the link → Telegram opens the bot → sends `/start <token>`.
  3. Telegram POSTs an update to /api/v1/telegram/webhook.
     Backend matches the token to a patient, saves the chat_id, and
     replies with a confirmation message.
"""
import secrets
from datetime import datetime
from fastapi import APIRouter, Request, Header, Depends, Query
from pydantic import BaseModel

from app.config import settings
from app.models.patient import Patient
from app.services import telegram
from app.utils.errors import AppError
from app.utils.response import success

router = APIRouter(prefix="/telegram", tags=["telegram"])


# ─────────────────────────────────────────────────────────────
# Link-token generator (called from patient portal)
# ─────────────────────────────────────────────────────────────

class LinkTokenBody(BaseModel):
    ic: str


@router.post("/link-token")
async def create_link_token(body: LinkTokenBody):
    patient = await Patient.find_one({"id_number": body.ic})
    if not patient:
        raise AppError.not_found("Patient not found for that IC")

    token = secrets.token_urlsafe(16)
    await patient.set({"telegram_link_token": token})

    if not settings.telegram_bot_username:
        raise AppError.bad_request(
            "Telegram bot username is not configured. Set TELEGRAM_BOT_USERNAME in .env."
        )

    deep_link = f"https://t.me/{settings.telegram_bot_username}?start={token}"
    return success({
        "deepLink": deep_link,
        "botUsername": settings.telegram_bot_username,
        "alreadyLinked": bool(patient.telegram_chat_id),
    })


@router.get("/status")
async def link_status(ic: str = Query(...)):
    patient = await Patient.find_one({"id_number": ic})
    if not patient:
        raise AppError.not_found("Patient not found")
    return success({
        "linked": bool(patient.telegram_chat_id),
        "linkedAt": patient.telegram_linked_at.isoformat() if patient.telegram_linked_at else None,
        "optout": patient.telegram_optout,
    })


@router.post("/optout")
async def optout(body: LinkTokenBody):
    patient = await Patient.find_one({"id_number": body.ic})
    if not patient:
        raise AppError.not_found("Patient not found")
    await patient.set({"telegram_optout": True})
    return success({"optout": True})


# ─────────────────────────────────────────────────────────────
# Telegram webhook — receives updates from Telegram servers
# ─────────────────────────────────────────────────────────────

@router.post("/webhook")
async def telegram_webhook(
    request: Request,
    x_telegram_bot_api_secret_token: str | None = Header(default=None),
):
    # Optional shared-secret verification (recommended for production)
    if settings.telegram_webhook_secret:
        if x_telegram_bot_api_secret_token != settings.telegram_webhook_secret:
            raise AppError.forbidden("Invalid webhook secret")

    update = await request.json()
    message = update.get("message") or update.get("edited_message")
    if not message:
        return {"ok": True}

    chat_id = str(message.get("chat", {}).get("id"))
    text = message.get("text", "")

    # Handle /start <token>
    if text.startswith("/start"):
        parts = text.split(maxsplit=1)
        token = parts[1].strip() if len(parts) > 1 else ""
        if not token:
            await telegram.send_message(
                chat_id,
                "👋 Welcome to Dentelligence!\n\nOpen the patient portal and tap "
                "<b>Link Telegram</b> to connect this chat to your account.",
            )
            return {"ok": True}

        patient = await Patient.find_one({"telegram_link_token": token})
        if not patient:
            await telegram.send_message(
                chat_id,
                "❌ This link has expired. Please open the portal and request a new one.",
            )
            return {"ok": True}

        await patient.set({
            "telegram_chat_id": chat_id,
            "telegram_linked_at": datetime.utcnow(),
            "telegram_link_token": None,
            "telegram_optout": False,
        })
        await telegram.send_message(
            chat_id,
            f"✅ Hi <b>{patient.first_name}</b>! You're all set.\n\n"
            f"You'll get reminders 24h before your appointment and live queue "
            f"updates on the day.\n\nSend /stop anytime to opt out.",
        )
        return {"ok": True}

    if text.strip().lower() == "/stop":
        patient = await Patient.find_one({"telegram_chat_id": chat_id})
        if patient:
            await patient.set({"telegram_optout": True})
            await telegram.send_message(
                chat_id, "You've been unsubscribed. Send /start to re-enable notifications."
            )
        return {"ok": True}

    if text.strip().lower() == "/help":
        await telegram.send_message(
            chat_id,
            "<b>Dentelligence bot</b>\n\n"
            "You'll receive:\n"
            "• Appointment reminders (24h before)\n"
            "• Check-in confirmation\n"
            "• A 'you're next' alert\n\n"
            "Commands:\n/start &lt;token&gt; — link your account\n"
            "/stop — unsubscribe\n/help — this message",
        )

    return {"ok": True}
