"""
Reminder scanner.

Runs periodically via APScheduler. Finds appointments whose scheduled_at falls
inside the "24h from now ± window" band and sends a Telegram reminder if:
- the patient has a linked telegram_chat_id
- no reminder_24h has already been logged for the appointment
- the appointment is still active (scheduled / checked-in)
"""
from datetime import datetime, timedelta
from loguru import logger

from app.config import settings
from app.models.appointment import Appointment
from app.models.patient import Patient
from app.services import notifications, telegram


async def scan_and_send() -> int:
    """Return the number of reminders successfully dispatched."""
    if not telegram.is_configured():
        return 0

    now = datetime.utcnow()
    window_minutes = settings.scheduler_interval_minutes
    target = now + timedelta(hours=settings.reminder_hours_before)
    lower = target - timedelta(minutes=window_minutes)
    upper = target + timedelta(minutes=window_minutes)

    appts = await Appointment.find({
        "scheduled_at": {"$gte": lower, "$lte": upper},
        "status": {"$in": ["scheduled", "checked-in"]},
    }).to_list()

    sent = 0
    for appt in appts:
        patient = await Patient.get(appt.patient_id)
        if not patient or not patient.telegram_chat_id:
            continue
        if await notifications.send_reminder_24h(appt, patient):
            sent += 1

    if sent:
        logger.info(f"[reminders] sent {sent} reminder(s) in window {lower}..{upper}")
    return sent
