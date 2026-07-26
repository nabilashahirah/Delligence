from fastapi import APIRouter, Query
from pydantic import BaseModel
from typing import Optional
from app.schemas.portal import PublicBookSchema
from app.services import portal as portal_service
from app.utils.response import success, created

router = APIRouter(prefix="/public", tags=["portal"])


@router.get("/lookup")
async def lookup(ic: str = Query(..., description="Patient IC number")):
    result = await portal_service.lookup_patient(ic)
    return success(result)


@router.get("/slots")
async def get_slots(
    dentist: str = Query(...),
    date: str = Query(..., description="ISO date string e.g. 2024-01-15"),
):
    slots = await portal_service.get_available_slots(dentist, date)
    return success({"slots": slots, "dentist": dentist, "date": date})


@router.post("/book", status_code=201)
async def book(body: PublicBookSchema):
    result = await portal_service.book_appointment(body)
    return created(result, "Appointment booked successfully")


@router.get("/appointment/{appointment_id}")
async def get_appointment(appointment_id: str):
    result = await portal_service.get_appointment_public(appointment_id)
    return success(result)


@router.patch("/checkin/{appointment_id}")
async def checkin(appointment_id: str):
    result = await portal_service.self_checkin(appointment_id)
    return success(result, "Checked in successfully")


class CancelBody(BaseModel):
    reason: Optional[str] = None


@router.patch("/cancel/{appointment_id}")
async def cancel(appointment_id: str, body: CancelBody = CancelBody()):
    result = await portal_service.self_cancel(appointment_id, body.reason)
    return success(result, "Appointment cancelled")


@router.get("/queue-status")
async def queue_status(ic: str = Query(..., description="Patient IC number")):
    result = await portal_service.get_queue_status(ic)
    return success(result)
