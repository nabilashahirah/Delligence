from datetime import datetime, timedelta
from beanie import PydanticObjectId
from app.models.appointment import Appointment, AppointmentStatus, VALID_TRANSITIONS
from app.models.patient import Patient
from app.schemas.appointment import CreateAppointmentSchema, UpdateStatusSchema, RescheduleAppointmentSchema, UpdateAppointmentSchema
from app.utils.errors import AppError
from app.utils.response import serialize
from app.services.prediction import recalculate_queue
from app.services import notifications
from app.utils.ws_manager import manager as ws


async def check_conflict(
    dentist: str, scheduled_at: datetime, duration: int, exclude_id: str = None
) -> Appointment | None:
    """Return the conflicting appointment if the slot overlaps an existing one, else None."""
    new_end = scheduled_at + timedelta(minutes=duration)
    day_start = scheduled_at.replace(hour=0, minute=0, second=0, microsecond=0)
    day_end = scheduled_at.replace(hour=23, minute=59, second=59, microsecond=0)

    candidates = await Appointment.find({
        "dentist": dentist,
        "scheduled_at": {"$gte": day_start, "$lte": day_end},
        "status": {"$nin": ["cancelled", "no-show", "completed"]},
    }).to_list()

    for appt in candidates:
        if exclude_id and str(appt.id) == exclude_id:
            continue
        existing_end = appt.scheduled_at + timedelta(minutes=appt.duration)
        if scheduled_at < existing_end and new_end > appt.scheduled_at:
            return appt
    return None


def _with_patient(appt_dict: dict, patient: Patient | None) -> dict:
    if patient:
        appt_dict["patient"] = {
            "_id": str(patient.id),
            "firstName": patient.first_name,
            "lastName": patient.last_name,
            "contact": {"phone": patient.contact.phone},
        }
    return appt_dict


async def create_appointment(data: CreateAppointmentSchema) -> dict:
    patient = await Patient.get(data.patient_id)
    if not patient:
        raise AppError.not_found("Patient not found")

    now = datetime.utcnow()
    slot_time = now if data.walk_in else data.scheduled_at
    conflict = await check_conflict(data.dentist, slot_time, data.duration)
    if conflict:
        end = conflict.scheduled_at + timedelta(minutes=conflict.duration)
        raise AppError.bad_request(
            f"{data.dentist} already has an appointment from "
            f"{conflict.scheduled_at.strftime('%H:%M')} to {end.strftime('%H:%M')}. "
            f"Please choose a different time."
        )

    appt = Appointment(
        patient_id=PydanticObjectId(data.patient_id),
        dentist=data.dentist,
        scheduled_at=data.scheduled_at,
        duration=data.duration,
        type=data.type,
        notes=data.notes,
        walk_in=data.walk_in,
        status=AppointmentStatus.checked_in if data.walk_in else AppointmentStatus.scheduled,
        checked_in_at=now if data.walk_in else None,
    )
    await appt.insert()
    if data.walk_in:
        await recalculate_queue(dentist=appt.dentist)
    await ws.broadcast({"event": "refresh"})
    return _with_patient(serialize(appt), patient)


async def get_appointments(
    date: str = None, dentist: str = None, status: str = None,
    patient_id: str = None, search: str = None, page: int = 1, limit: int = 20,
) -> dict:
    mongo_filter = {}
    if date:
        start = datetime.fromisoformat(date).replace(hour=0, minute=0, second=0)
        end   = datetime.fromisoformat(date).replace(hour=23, minute=59, second=59)
        mongo_filter["scheduled_at"] = {"$gte": start, "$lte": end}
    if dentist:
        mongo_filter["dentist"] = dentist
    if status:
        mongo_filter["status"] = status
    if patient_id:
        mongo_filter["patient_id"] = PydanticObjectId(patient_id)
    if search:
        # find patients matching name or IC, then filter appointments to those IDs
        import re
        rx = re.compile(re.escape(search.strip()), re.IGNORECASE)
        matched = await Patient.find({
            "$or": [
                {"first_name": rx}, {"last_name": rx}, {"id_number": rx},
                {"$expr": {"$regexMatch": {
                    "input": {"$concat": ["$first_name", " ", "$last_name"]},
                    "regex": re.escape(search.strip()), "options": "i",
                }}},
            ]
        }).to_list()
        if not matched:
            return {"appointments": [], "total": 0, "page": page, "total_pages": 0}
        mongo_filter["patient_id"] = {"$in": [p.id for p in matched]}

    query = Appointment.find(mongo_filter)
    total = await query.count()
    appts = await query.sort(Appointment.scheduled_at).skip((page - 1) * limit).limit(limit).to_list()

    results = []
    for appt in appts:
        patient = await Patient.get(appt.patient_id)
        results.append(_with_patient(serialize(appt), patient))

    return {"appointments": results, "total": total, "page": page, "total_pages": -(-total // limit)}


async def update_appointment(appt_id: str, data: UpdateAppointmentSchema) -> dict:
    appt = await Appointment.get(appt_id)
    if not appt:
        raise AppError.not_found("Appointment not found")

    if data.dentist is not None and data.dentist != appt.dentist:
        conflict = await check_conflict(data.dentist, appt.scheduled_at, appt.duration)
        if conflict:
            end = conflict.scheduled_at + timedelta(minutes=conflict.duration)
            raise AppError.bad_request(
                f"{data.dentist} already has an appointment from "
                f"{conflict.scheduled_at.strftime('%H:%M')} to {end.strftime('%H:%M')}. "
                f"Please choose a different dentist."
            )

    old_dentist = appt.dentist
    updates: dict = {"updated_at": datetime.utcnow()}
    if data.dentist is not None:
        updates["dentist"] = data.dentist
    if data.type is not None:
        updates["type"] = data.type.value

    await appt.set(updates)
    if data.dentist and data.dentist != old_dentist:
        await recalculate_queue(dentist=old_dentist)
        await recalculate_queue(dentist=data.dentist)
    await ws.broadcast({"event": "refresh"})
    patient = await Patient.get(appt.patient_id)
    return _with_patient(serialize(appt), patient)


async def reschedule_appointment(appt_id: str, data: RescheduleAppointmentSchema) -> dict:
    appt = await Appointment.get(appt_id)
    if not appt:
        raise AppError.not_found("Appointment not found")

    if appt.status.value in ("completed", "cancelled", "no-show"):
        raise AppError.bad_request(f"Cannot reschedule a {appt.status.value} appointment")

    conflict = await check_conflict(data.dentist, data.scheduled_at, data.duration, exclude_id=appt_id)
    if conflict:
        end = conflict.scheduled_at + timedelta(minutes=conflict.duration)
        raise AppError.bad_request(
            f"{data.dentist} already has an appointment from "
            f"{conflict.scheduled_at.strftime('%H:%M')} to {end.strftime('%H:%M')}. "
            f"Please choose a different time."
        )

    old_dentist = appt.dentist
    updates = {
        "dentist": data.dentist,
        "scheduled_at": data.scheduled_at,
        "duration": data.duration,
        "status": AppointmentStatus.scheduled.value,
        "checked_in_at": None,
        "started_at": None,
        "updated_at": datetime.utcnow(),
    }
    await appt.set(updates)
    await recalculate_queue(dentist=old_dentist)
    if data.dentist != old_dentist:
        await recalculate_queue(dentist=data.dentist)
    await ws.broadcast({"event": "refresh"})
    patient = await Patient.get(appt.patient_id)
    return _with_patient(serialize(appt), patient)


async def get_appointment_by_id(appt_id: str) -> dict:
    appt = await Appointment.get(appt_id)
    if not appt:
        raise AppError.not_found("Appointment not found")
    patient = await Patient.get(appt.patient_id)
    return _with_patient(serialize(appt), patient)


async def update_status(appt_id: str, data: UpdateStatusSchema) -> dict:
    appt = await Appointment.get(appt_id)
    if not appt:
        raise AppError.not_found("Appointment not found")

    new_status = data.status.value
    allowed = VALID_TRANSITIONS.get(appt.status.value, [])
    if new_status not in allowed:
        raise AppError.bad_request(f"Cannot transition from '{appt.status.value}' to '{new_status}'")

    now = datetime.utcnow()
    updates: dict = {"status": new_status, "updated_at": now}

    if new_status == "checked-in":
        updates["checked_in_at"] = now
    elif new_status == "in-progress":
        updates["started_at"] = now
    elif new_status == "completed":
        updates["completed_at"] = now
        if appt.checked_in_at:
            checked_in = appt.checked_in_at.replace(tzinfo=None)
            updates["actual_wait_minutes"] = int((now - checked_in).total_seconds() / 60)
    elif new_status in ("cancelled", "no-show") and data.cancellation_reason:
        updates["cancellation_reason"] = data.cancellation_reason

    await appt.set(updates)
    await recalculate_queue(dentist=appt.dentist)
    await ws.broadcast({"event": "refresh"})
    patient = await Patient.get(appt.patient_id)

    # Telegram notifications on status transitions
    if patient and patient.telegram_chat_id:
        try:
            if new_status == "checked-in":
                await notifications.send_checked_in(
                    appt, patient,
                    position=1,  # UI shows position from queue; we send a friendly text
                    wait_minutes=appt.predicted_wait_minutes or 0,
                )
            elif new_status == "in-progress":
                await notifications.send_called_in(appt, patient)
        except Exception:
            from loguru import logger
            logger.exception("Notification on status transition failed")

    return _with_patient(serialize(appt), patient)
