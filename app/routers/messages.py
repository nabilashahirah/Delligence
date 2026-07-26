"""
Staff-facing messaging endpoints.

- POST /messages/promo   → broadcast a manual message to a patient segment
- GET  /messages         → paginated log of all sent messages
"""
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime, timedelta

from app.dependencies.auth import get_current_user
from app.models.staff import Staff
from app.models.patient import Patient
from app.models.appointment import Appointment
from app.models.message_log import MessageLog
from app.services import notifications, ai_chat
from app.utils.response import success, created
from app.utils.errors import AppError

router = APIRouter(prefix="/messages", tags=["messages"])


class PromoBody(BaseModel):
    message: str = Field(..., min_length=3, max_length=4000)
    segment: Literal["all_linked", "with_upcoming", "no_visit_6mo"] = "all_linked"


class DraftBody(BaseModel):
    brief: str = Field(..., min_length=3, max_length=500)
    tone: Literal["friendly", "professional", "playful", "urgent"] = "friendly"


@router.post("/draft")
async def draft_promo(body: DraftBody, current_user: Staff = Depends(get_current_user)):
    """Generate a polished Telegram promo message from a short staff brief."""
    try:
        text = await ai_chat.draft_promo(body.brief, body.tone)
    except Exception as e:
        raise AppError.bad_request(f"AI draft failed: {str(e)}")
    if not text:
        raise AppError.bad_request("AI returned empty response")
    return success({"message": text})


async def _segment_patients(segment: str) -> list[Patient]:
    """Return patients matching the segment who have Telegram linked and no opt-out."""
    base_filter = {
        "telegram_chat_id": {"$ne": None},
        "telegram_optout": {"$ne": True},
        "is_active": True,
    }

    if segment == "all_linked":
        return await Patient.find(base_filter).to_list()

    if segment == "with_upcoming":
        now = datetime.utcnow()
        upcoming = await Appointment.find({
            "scheduled_at": {"$gte": now},
            "status": {"$in": ["scheduled", "checked-in"]},
        }).to_list()
        ids = list({a.patient_id for a in upcoming})
        if not ids:
            return []
        return await Patient.find({**base_filter, "_id": {"$in": ids}}).to_list()

    if segment == "no_visit_6mo":
        six_months_ago = datetime.utcnow() - timedelta(days=180)
        recent = await Appointment.find({
            "scheduled_at": {"$gte": six_months_ago},
            "status": "completed",
        }).to_list()
        recent_ids = {a.patient_id for a in recent}
        all_linked = await Patient.find(base_filter).to_list()
        return [p for p in all_linked if p.id not in recent_ids]

    return []


@router.post("/promo", status_code=201)
async def send_promo(body: PromoBody, current_user: Staff = Depends(get_current_user)):
    patients = await _segment_patients(body.segment)
    sent, failed = 0, 0
    for p in patients:
        ok = await notifications.send_promo(p, body.message)
        if ok:
            sent += 1
        else:
            failed += 1
    return created({
        "targeted": len(patients),
        "sent": sent,
        "failed": failed,
        "segment": body.segment,
    }, f"Promo dispatched to {sent} patient(s)")


@router.get("")
async def list_messages(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    event: Optional[str] = Query(None),
    current_user: Staff = Depends(get_current_user),
):
    mongo_filter = {}
    if event:
        mongo_filter["event"] = event
    query = MessageLog.find(mongo_filter).sort(-MessageLog.sent_at)
    total = await query.count()
    logs = await query.skip((page - 1) * limit).limit(limit).to_list()

    items = []
    for log in logs:
        patient = await Patient.get(log.patient_id) if log.patient_id else None
        items.append({
            "id": str(log.id),
            "event": log.event.value,
            "channel": log.channel.value,
            "text": log.text,
            "status": log.status.value,
            "error": log.error,
            "sentAt": log.sent_at.isoformat(),
            "patientName": (f"{patient.first_name} {patient.last_name}" if patient else None),
            "patientId": str(log.patient_id) if log.patient_id else None,
            "appointmentId": str(log.appointment_id) if log.appointment_id else None,
        })

    return success({
        "messages": items,
        "total": total,
        "page": page,
        "totalPages": -(-total // limit),
    })


@router.get("/stats")
async def stats(current_user: Staff = Depends(get_current_user)):
    linked = await Patient.find({
        "telegram_chat_id": {"$ne": None},
        "telegram_optout": {"$ne": True},
    }).count()
    total = await Patient.find({"is_active": True}).count()
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    sent_today = await MessageLog.find({"sent_at": {"$gte": today_start}, "status": "sent"}).count()
    return success({
        "linkedPatients": linked,
        "totalPatients": total,
        "sentToday": sent_today,
    })
