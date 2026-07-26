from datetime import datetime
from fastapi import APIRouter, Depends, Query
from app.schemas.appointment import CreateAppointmentSchema, UpdateStatusSchema, RescheduleAppointmentSchema, UpdateAppointmentSchema
from app.services import appointment as appt_service
from app.dependencies.auth import get_current_user
from app.utils.response import success, created

router = APIRouter(prefix="/appointments", tags=["appointments"])
protected = Depends(get_current_user)


@router.get("")
async def get_all(
    date: str = Query(None),
    dentist: str = Query(None),
    status: str = Query(None),
    patient_id: str = Query(None),
    search: str = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    _=protected,
):
    result = await appt_service.get_appointments(date, dentist, status, patient_id, search, page, limit)
    return success(result)


@router.get("/conflict")
async def conflict_check(
    dentist: str = Query(...),
    scheduled_at: str = Query(...),
    duration: int = Query(30),
    _=protected,
):
    dt = datetime.fromisoformat(scheduled_at)
    conflict = await appt_service.check_conflict(dentist, dt, duration)
    if conflict:
        from datetime import timedelta
        end = conflict.scheduled_at + timedelta(minutes=conflict.duration)
        return success({
            "hasConflict": True,
            "conflictsWith": {
                "scheduledAt": conflict.scheduled_at.isoformat(),
                "endsAt": end.isoformat(),
                "duration": conflict.duration,
            },
        })
    return success({"hasConflict": False, "conflictsWith": None})


@router.post("", status_code=201)
async def create(body: CreateAppointmentSchema, _=protected):
    result = await appt_service.create_appointment(body)
    return created(result, "Appointment booked")


@router.get("/{appt_id}")
async def get_one(appt_id: str, _=protected):
    result = await appt_service.get_appointment_by_id(appt_id)
    return success(result)


@router.patch("/{appt_id}")
async def update_appt(appt_id: str, body: UpdateAppointmentSchema, _=protected):
    result = await appt_service.update_appointment(appt_id, body)
    return success(result, "Appointment updated")


@router.patch("/{appt_id}/status")
async def update_status(appt_id: str, body: UpdateStatusSchema, _=protected):
    result = await appt_service.update_status(appt_id, body)
    return success(result, "Status updated")


@router.patch("/{appt_id}/reschedule")
async def reschedule(appt_id: str, body: RescheduleAppointmentSchema, _=protected):
    result = await appt_service.reschedule_appointment(appt_id, body)
    return success(result, "Appointment rescheduled")
