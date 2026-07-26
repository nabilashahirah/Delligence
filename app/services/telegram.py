"""
Low-level Telegram Bot API client.

Docs: https://core.telegram.org/bots/api
Only wraps the endpoints we need — sendMessage + setWebhook + getMe.
"""
import httpx
from loguru import logger
from app.config import settings


def _base_url() -> str | None:
    if not settings.telegram_bot_token:
        return None
    return f"https://api.telegram.org/bot{settings.telegram_bot_token}"


def is_configured() -> bool:
    return bool(settings.telegram_bot_token)


async def send_message(chat_id: str, text: str, parse_mode: str = "HTML") -> tuple[bool, str | None]:
    """Send a Telegram message. Returns (ok, error_message_if_any)."""
    base = _base_url()
    if not base:
        return False, "Telegram bot token not configured"

    payload = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": parse_mode,
        "disable_web_page_preview": True,
    }
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(f"{base}/sendMessage", json=payload)
        data = resp.json()
        if not data.get("ok"):
            return False, data.get("description", "Unknown Telegram error")
        return True, None
    except Exception as e:
        logger.exception("Telegram send_message failed")
        return False, str(e)


async def set_webhook(url: str, secret: str | None = None) -> tuple[bool, str | None]:
    """Register the webhook URL that Telegram will POST updates to."""
    base = _base_url()
    if not base:
        return False, "Telegram bot token not configured"
    payload = {"url": url}
    if secret:
        payload["secret_token"] = secret
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(f"{base}/setWebhook", json=payload)
        data = resp.json()
        return data.get("ok", False), data.get("description")
    except Exception as e:
        return False, str(e)


async def get_me() -> dict | None:
    base = _base_url()
    if not base:
        return None
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(f"{base}/getMe")
        data = resp.json()
        return data.get("result") if data.get("ok") else None
    except Exception:
        return None
