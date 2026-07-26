"""
High-level notification dispatcher.

Responsibilities:
- Compose message text for each event type
- Deduplicate via MessageLog (never send the same event twice per appointment)
- Respect patient opt-out
- Log every attempt for auditing
"""
from datetime import datetime
from typing import Optional
from loguru import logger

from app.models.patient import Patient
from app.models.appointment import Appointment
from app.models.message_log import MessageLog, MessageChannel, MessageEvent, MessageStatus
from app.services import telegram


def _format_time(dt: datetime) -> str:
    return dt.strftime("%a %d %b, %I:%M %p")


def _appt_type_label(t: str) -> str:
    return t.replace("-", " ").title()


async def _already_sent(appointment_id, event: MessageEvent) -> bool:
    existing = await MessageLog.find_one({
        "appointment_id": appointment_id,
        "event": event.value,
        "status": MessageStatus.sent.value,
    })
    return existing is not None


async def _dispatch(
    *,
    patient: Patient,
    appointment: Optional[Appointment],
    event: MessageEvent,
    text: str,
) -> bool:
    """Send + log. Returns True if actually sent."""
    if not patient.telegram_chat_id:
        return False
    if patient.telegram_optout:
        await MessageLog(
            patient_id=patient.id,
            appointment_id=appointment.id if appointment else None,
            channel=MessageChannel.telegram,
            event=event,
            text=text,
            status=MessageStatus.skipped,
            error="patient opted out",
        ).insert()
        return False

    ok, err = await telegram.send_message(patient.telegram_chat_id, text)
    await MessageLog(
        patient_id=patient.id,
        appointment_id=appointment.id if appointment else None,
        channel=MessageChannel.telegram,
        event=event,
        text=text,
        status=MessageStatus.sent if ok else MessageStatus.failed,
        error=err,
    ).insert()
    if not ok:
        logger.warning(f"Telegram send failed for patient {patient.id}: {err}")
    return ok


# ─────────────────────────────────────────────────────────────
# Event-specific helpers
# ─────────────────────────────────────────────────────────────

async def send_reminder_24h(appointment: Appointment, patient: Patient) -> bool:
    if await _already_sent(appointment.id, MessageEvent.reminder_24h):
        return False
    text = (
        f"🦷 <b>Appointment reminder</b>\n\n"
        f"Hi {patient.first_name}, this is a reminder for your appointment:\n\n"
        f"👨‍⚕️ <b>{appointment.dentist}</b>\n"
        f"📅 {_format_time(appointment.scheduled_at)}\n"
        f"💊 {_appt_type_label(appointment.type.value)}\n\n"
        f"Reply if you need to reschedule."
    )
    return await _dispatch(
        patient=patient, appointment=appointment,
        event=MessageEvent.reminder_24h, text=text,
    )


async def send_checked_in(appointment: Appointment, patient: Patient, position: int, wait_minutes: int) -> bool:
    if await _already_sent(appointment.id, MessageEvent.checked_in):
        return False
    text = (
        f"✅ <b>Checked in</b>\n\n"
        f"You're #{position} in the queue for {appointment.dentist}.\n"
        f"Estimated wait: <b>~{wait_minutes} min</b>.\n\n"
        f"We'll message you when you're next."
    )
    return await _dispatch(
        patient=patient, appointment=appointment,
        event=MessageEvent.checked_in, text=text,
    )


async def send_you_are_next(appointment: Appointment, patient: Patient) -> bool:
    if await _already_sent(appointment.id, MessageEvent.you_are_next):
        return False
    text = (
        f"🔔 <b>You're next!</b>\n\n"
        f"Please be ready — {appointment.dentist} will call you shortly."
    )
    return await _dispatch(
        patient=patient, appointment=appointment,
        event=MessageEvent.you_are_next, text=text,
    )


async def send_called_in(appointment: Appointment, patient: Patient) -> bool:
    if await _already_sent(appointment.id, MessageEvent.called_in):
        return False
    text = (
        f"🦷 <b>Please come in</b>\n\n"
        f"{appointment.dentist} is ready for you now."
    )
    return await _dispatch(
        patient=patient, appointment=appointment,
        event=MessageEvent.called_in, text=text,
    )


async def send_promo(patient: Patient, text: str) -> bool:
    """Send a manual promo/broadcast to a patient."""
    return await _dispatch(
        patient=patient, appointment=None,
        event=MessageEvent.promo, text=text,
    )


# ─────────────────────────────────────────────────────────────
# Queue-change hook (called from services/prediction.recalculate_queue)
# ─────────────────────────────────────────────────────────────

async def on_queue_recalculated(queue_appts: list[Appointment]) -> None:
    """
    Called after each queue recalculation with the sorted list of active
    appointments (in queue order). Sends 'you_are_next' when a patient
    becomes #1 (checked-in and next to be seen).
    """
    if not queue_appts:
        return
    # First checked-in patient (not yet in-progress) is "next"
    for appt in queue_appts:
        if appt.status.value == "checked-in":
            patient = await Patient.get(appt.patient_id)
            if patient:
                await send_you_are_next(appt, patient)
            return
