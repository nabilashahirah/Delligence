"""
Public (unauthenticated) portal service.
Handles: IC lookup, slot availability, self-booking, self-check-in, queue status.
"""
from datetime import datetime, timedelta
from beanie import PydanticObjectId
from app.models.patient import Patient, ContactInfo, MedicalHistory, Gender, IdType
from app.models.appointment import Appointment, AppointmentStatus, AppointmentType, VALID_TRANSITIONS
from app.schemas.portal import PublicBookSchema
from app.utils.errors import AppError
from app.utils.response import serialize
from app.services.prediction import recalculate_queue
from app.services import notifications
from app.utils.ws_manager import manager as ws


DENTISTS = ["Dr. Amir", "Dr. Sarah", "Dr. Wong", "Dr. Priya"]
WORK_START_HOUR = 9
WORK_END_HOUR = 17
SLOT_MINUTES = 15


async def lookup_patient(ic: str) -> dict:
    """Return patient basic info if found, else found=False."""
    patient = await Patient.find_one({"id_number": ic, "is_active": True})
    if not patient:
        return {"found": False}
    return {
        "found": True,
        "patientId": str(patient.id),
        "firstName": patient.first_name,
        "lastName": patient.last_name,
        "phone": patient.contact.phone,
    }


async def get_available_slots(dentist: str, date: str) -> list[str]:
    """Return list of ISO datetime strings for free 30-min slots on a given day."""
    day = datetime.fromisoformat(date).replace(hour=WORK_START_HOUR, minute=0, second=0, microsecond=0)
    end = day.replace(hour=WORK_END_HOUR)

    # Fetch all booked slots for this dentist on this day
    booked = await Appointment.find({
        "dentist": dentist,
        "scheduled_at": {
            "$gte": day,
            "$lt": end,
        },
        "status": {"$nin": ["cancelled", "no-show", "completed"]},
    }).to_list()

    booked_times = {a.scheduled_at.replace(second=0, microsecond=0) for a in booked}

    slots = []
    cursor = day
    while cursor < end:
        if cursor not in booked_times:
            slots.append(cursor.isoformat())
        cursor += timedelta(minutes=SLOT_MINUTES)

    return slots


async def book_appointment(data: PublicBookSchema) -> dict:
    """Look up or create patient, then create appointment."""
    # 1. Look up patient by IC
    patient = await Patient.find_one({"id_number": data.ic_number, "is_active": True})

    if not patient:
        # Patient not found — require patient_info in the payload
        if not data.patient_info:
            raise AppError.bad_request("Patient not found. Please provide patient details to register.")

        info = data.patient_info
        try:
            dob = datetime.fromisoformat(info.date_of_birth)
        except ValueError:
            raise AppError.bad_request("Invalid date_of_birth format. Use YYYY-MM-DD.")

        patient = Patient(
            first_name=info.first_name,
            last_name=info.last_name,
            date_of_birth=dob,
            gender=Gender(info.gender),
            id_type=IdType.ic,
            id_number=data.ic_number,
            contact=ContactInfo(phone=info.phone, email=info.email),
            medical_history=MedicalHistory(
                allergies=info.allergies,
                conditions=info.conditions,
                medications=info.medications,
            ),
        )
        await patient.insert()

    now = datetime.utcnow()
    scheduled_at = now if data.walk_in else data.scheduled_at
    if not scheduled_at:
        raise AppError.bad_request("scheduled_at is required for non-walk-in bookings.")

    # 2. Check no duplicate active appointment on same day
    day_start = scheduled_at.replace(hour=0, minute=0, second=0, microsecond=0)
    day_end   = scheduled_at.replace(hour=23, minute=59, second=59, microsecond=0)
    existing = await Appointment.find_one({
        "patient_id": patient.id,
        "dentist": data.dentist,
        "scheduled_at": {"$gte": day_start, "$lte": day_end},
        "status": {"$nin": ["cancelled", "no-show"]},
    })
    if existing:
        raise AppError.bad_request("This patient already has an active appointment with this dentist today.")

    # 3. Create appointment
    appt = Appointment(
        patient_id=patient.id,
        dentist=data.dentist,
        scheduled_at=scheduled_at,
        duration=data.duration,
        type=data.type,
        notes=data.notes,
        walk_in=data.walk_in,
        status=AppointmentStatus.checked_in if data.walk_in else AppointmentStatus.scheduled,
        checked_in_at=now if data.walk_in else None,
    )
    await appt.insert()
    await recalculate_queue(dentist=data.dentist)
    await ws.broadcast({"event": "refresh"})

    return {
        "appointmentId": str(appt.id),
        "patientId": str(patient.id),
        "firstName": patient.first_name,
        "lastName": patient.last_name,
        "dentist": appt.dentist,
        "scheduledAt": appt.scheduled_at.isoformat(),
        "duration": appt.duration,
        "type": appt.type.value,
        "status": appt.status.value,
    }


async def get_appointment_public(appointment_id: str) -> dict:
    """Return appointment + patient info + live queue position for the confirmation page."""
    appt = await Appointment.get(appointment_id)
    if not appt:
        raise AppError.not_found("Appointment not found")

    patient = await Patient.get(appt.patient_id)

    # Build full queue snapshot for this dentist (same sort as staff queue)
    now = datetime.utcnow()
    day_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    day_end   = now.replace(hour=23, minute=59, second=59, microsecond=0)
    active_statuses = ["scheduled", "checked-in", "in-progress"]

    all_appts = await Appointment.find({
        "dentist": appt.dentist,
        "scheduled_at": {"$gte": day_start, "$lte": day_end},
        "status": {"$in": active_statuses},
    }).to_list()

    # Same sort as staff queue
    status_order = {"in-progress": 0, "checked-in": 1, "scheduled": 2}
    all_appts.sort(key=lambda a: (
        status_order.get(a.status.value, 9),
        a.checked_in_at or a.scheduled_at,
    ))

    # Build anonymised snapshot (first name only for privacy)
    queue_snapshot = []
    position = None
    for i, a in enumerate(all_appts):
        p = await Patient.get(a.patient_id)
        is_me = str(a.id) == appointment_id
        if is_me:
            position = i + 1
        queue_snapshot.append({
            "position": i + 1,
            "firstName": p.first_name if p else "Patient",
            "status": a.status.value,
            "type": a.type.value,
            "isMe": is_me,
            "predictedWaitMinutes": a.predicted_wait_minutes or 0,
        })

    return {
        "appointmentId": str(appt.id),
        "firstName": patient.first_name if patient else "Unknown",
        "lastName": patient.last_name if patient else "",
        "idNumber": patient.id_number if patient else None,
        "dentist": appt.dentist,
        "scheduledAt": appt.scheduled_at.isoformat(),
        "duration": appt.duration,
        "type": appt.type.value,
        "status": appt.status.value,
        "predictedWaitMinutes": appt.predicted_wait_minutes,
        "checkedInAt": appt.checked_in_at.isoformat() if appt.checked_in_at else None,
        "position": position,
        "queueSnapshot": queue_snapshot,
    }


async def self_checkin(appointment_id: str) -> dict:
    """Patient self-checks in. Transitions scheduled → checked-in."""
    appt = await Appointment.get(appointment_id)
    if not appt:
        raise AppError.not_found("Appointment not found")

    if appt.status.value not in VALID_TRANSITIONS:
        raise AppError.bad_request("Invalid appointment status")

    if "checked-in" not in VALID_TRANSITIONS.get(appt.status.value, []):
        if appt.status.value == "checked-in":
            raise AppError.bad_request("You have already checked in.")
        raise AppError.bad_request(
            f"Cannot check in — appointment is currently '{appt.status.value}'."
        )

    now = datetime.utcnow()
    await appt.set({
        "status": "checked-in",
        "checked_in_at": now,
        "updated_at": now,
    })
    await recalculate_queue(dentist=appt.dentist)
    await ws.broadcast({"event": "refresh"})

    # Telegram check-in confirmation
    patient = await Patient.get(appt.patient_id)
    if patient and patient.telegram_chat_id:
        try:
            await notifications.send_checked_in(
                appt, patient, position=1,
                wait_minutes=appt.predicted_wait_minutes or 0,
            )
        except Exception:
            from loguru import logger
            logger.exception("Portal check-in notification failed")

    return {
        "appointmentId": str(appt.id),
        "status": "checked-in",
        "checkedInAt": now.isoformat(),
    }


async def self_cancel(appointment_id: str, reason: str | None = None) -> dict:
    """Patient cancels their own scheduled appointment."""
    appt = await Appointment.get(appointment_id)
    if not appt:
        raise AppError.not_found("Appointment not found")

    if appt.status.value != "scheduled":
        raise AppError.bad_request(
            f"Cannot cancel — appointment is currently '{appt.status.value}'."
        )

    now = datetime.utcnow()
    updates: dict = {"status": "cancelled", "updated_at": now}
    if reason:
        updates["cancellation_reason"] = reason

    await appt.set(updates)
    await recalculate_queue(dentist=appt.dentist)
    await ws.broadcast({"event": "refresh"})
    return {"appointmentId": appointment_id, "status": "cancelled"}


async def get_queue_status(ic: str) -> dict:
    """Return today's appointment + live queue position for a patient."""
    patient = await Patient.find_one({"id_number": ic, "is_active": True})
    if not patient:
        raise AppError.not_found("No patient found with that IC number.")

    now = datetime.utcnow()
    day_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    day_end   = now.replace(hour=23, minute=59, second=59, microsecond=0)

    appt = await Appointment.find_one({
        "patient_id": patient.id,
        "scheduled_at": {"$gte": day_start, "$lte": day_end},
        "status": {"$nin": ["cancelled", "no-show", "completed"]},
    })

    if not appt:
        return {"found": False, "message": "No active appointment found for today."}

    # Count how many active appointments are ahead in the same dentist's queue
    ahead = await Appointment.find({
        "dentist": appt.dentist,
        "scheduled_at": {"$gte": day_start, "$lt": appt.scheduled_at},
        "status": {"$in": ["scheduled", "checked-in", "in-progress"]},
    }).count()

    return {
        "found": True,
        "appointmentId": str(appt.id),
        "dentist": appt.dentist,
        "scheduledAt": appt.scheduled_at.isoformat(),
        "type": appt.type.value,
        "status": appt.status.value,
        "position": ahead + 1,
        "predictedWaitMinutes": appt.predicted_wait_minutes or 0,
    }
