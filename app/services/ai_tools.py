"""Tool implementations exposed to the LLM via Gemini function calling.

All tools are read-only. Write tools (booking, sending messages) will be
introduced in Phase 1b behind an explicit confirmation UX.
"""
from datetime import datetime, timedelta, time
from typing import Optional
from beanie import PydanticObjectId
from google.genai import types

from app.models.patient import Patient
from app.models.appointment import Appointment, AppointmentStatus
from app.models.treatment import Treatment


CLINIC_OPEN_HOUR = 9
CLINIC_CLOSE_HOUR = 17
SLOT_MINUTES = 30


def _parse_date(date_str: str) -> datetime:
    return datetime.strptime(date_str, "%Y-%m-%d")


def _day_bounds(date_str: str) -> tuple[datetime, datetime]:
    d = _parse_date(date_str)
    start = d.replace(hour=0, minute=0, second=0, microsecond=0)
    end = d.replace(hour=23, minute=59, second=59, microsecond=0)
    return start, end


async def find_patient(query: str, limit: int = 5) -> dict:
    q = (query or "").strip()
    if not q:
        return {"matches": []}

    regex = {"$regex": q, "$options": "i"}
    patients = await Patient.find({
        "$or": [
            {"id_number": regex},
            {"first_name": regex},
            {"last_name": regex},
            {"contact.phone": regex},
        ]
    }).limit(limit).to_list()

    return {
        "matches": [
            {
                "patient_id": str(p.id),
                "name": f"{p.first_name} {p.last_name}",
                "id_number": p.id_number,
                "phone": p.contact.phone,
                "date_of_birth": p.date_of_birth.strftime("%Y-%m-%d"),
                "is_active": p.is_active,
            }
            for p in patients
        ]
    }


async def get_patient_history(patient_id: str, limit: int = 10) -> dict:
    try:
        pid = PydanticObjectId(patient_id)
    except Exception:
        return {"error": "invalid patient_id"}

    patient = await Patient.get(pid)
    if not patient:
        return {"error": "patient not found"}

    appts = await Appointment.find({"patient_id": pid}).sort(
        [("scheduled_at", -1)]
    ).limit(limit).to_list()

    treatments = await Treatment.find({"patient_id": pid}).sort(
        [("created_at", -1)]
    ).limit(limit).to_list()

    return {
        "patient": {
            "name": f"{patient.first_name} {patient.last_name}",
            "id_number": patient.id_number,
            "allergies": patient.medical_history.allergies,
            "conditions": patient.medical_history.conditions,
            "medications": patient.medical_history.medications,
        },
        "appointments": [
            {
                "scheduled_at": a.scheduled_at.strftime("%Y-%m-%d %H:%M"),
                "dentist": a.dentist,
                "type": a.type.value,
                "status": a.status.value,
                "notes": a.notes,
            }
            for a in appts
        ],
        "treatments": [
            {
                "date": t.created_at.strftime("%Y-%m-%d"),
                "procedure": t.procedure,
                "diagnosis": t.diagnosis,
                "dentist": t.dentist,
                "cost": t.cost.amount,
                "is_paid": t.cost.is_paid,
            }
            for t in treatments
        ],
    }


async def get_queue_status() -> dict:
    now = datetime.utcnow()
    start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    end = now.replace(hour=23, minute=59, second=59, microsecond=0)

    active_statuses = ["checked-in", "in-progress", "scheduled"]
    appts = await Appointment.find({
        "scheduled_at": {"$gte": start, "$lte": end},
        "status": {"$in": active_statuses},
    }).to_list()

    order = {"in-progress": 0, "checked-in": 1, "scheduled": 2}
    appts.sort(key=lambda a: (order.get(a.status.value, 9), a.checked_in_at or a.scheduled_at))

    return {
        "current_time_utc": now.strftime("%Y-%m-%d %H:%M"),
        "queue": [
            {
                "position": i + 1,
                "status": a.status.value,
                "dentist": a.dentist,
                "type": a.type.value,
                "scheduled_at": a.scheduled_at.strftime("%H:%M"),
                "predicted_wait_minutes": a.predicted_wait_minutes,
            }
            for i, a in enumerate(appts[:20])
        ],
    }


async def get_appointments_for(date: str, dentist: Optional[str] = None) -> dict:
    try:
        start, end = _day_bounds(date)
    except ValueError:
        return {"error": "date must be YYYY-MM-DD"}

    query: dict = {"scheduled_at": {"$gte": start, "$lte": end}}
    if dentist:
        query["dentist"] = dentist

    appts = await Appointment.find(query).sort([("scheduled_at", 1)]).to_list()

    return {
        "date": date,
        "count": len(appts),
        "appointments": [
            {
                "time": a.scheduled_at.strftime("%H:%M"),
                "dentist": a.dentist,
                "type": a.type.value,
                "status": a.status.value,
                "duration_minutes": a.duration,
            }
            for a in appts
        ],
    }


async def check_availability(date: str, dentist: str) -> dict:
    try:
        start, end = _day_bounds(date)
    except ValueError:
        return {"error": "date must be YYYY-MM-DD"}

    booked = await Appointment.find({
        "scheduled_at": {"$gte": start, "$lte": end},
        "dentist": dentist,
        "status": {"$nin": ["cancelled", "no-show"]},
    }).to_list()

    booked_times = {a.scheduled_at.strftime("%H:%M") for a in booked}

    open_slots = []
    day_start = start.replace(hour=CLINIC_OPEN_HOUR)
    day_end = start.replace(hour=CLINIC_CLOSE_HOUR)
    slot = day_start
    while slot < day_end:
        label = slot.strftime("%H:%M")
        if label not in booked_times:
            open_slots.append(label)
        slot += timedelta(minutes=SLOT_MINUTES)

    return {"date": date, "dentist": dentist, "open_slots": open_slots}


TOOL_REGISTRY = {
    "find_patient": find_patient,
    "get_patient_history": get_patient_history,
    "get_queue_status": get_queue_status,
    "get_appointments_for": get_appointments_for,
    "check_availability": check_availability,
}


TOOL_DECLARATIONS = [
    types.FunctionDeclaration(
        name="find_patient",
        description="Search for patients by name, IC/passport number, or phone. Returns up to 5 matches.",
        parameters={
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Name substring, IC number, or phone"},
                "limit": {"type": "integer", "description": "Max matches (default 5)"},
            },
            "required": ["query"],
        },
    ),
    types.FunctionDeclaration(
        name="get_patient_history",
        description="Get a patient's recent appointments, treatments, and medical history. Call find_patient first to get patient_id.",
        parameters={
            "type": "object",
            "properties": {
                "patient_id": {"type": "string", "description": "MongoDB ObjectId as string"},
                "limit": {"type": "integer", "description": "Max records per list (default 10)"},
            },
            "required": ["patient_id"],
        },
    ),
    types.FunctionDeclaration(
        name="get_queue_status",
        description="Get the current live queue: patients checked in, in progress, or scheduled for today, in queue order.",
        parameters={"type": "object", "properties": {}},
    ),
    types.FunctionDeclaration(
        name="get_appointments_for",
        description="List appointments scheduled on a specific date, optionally filtered by dentist.",
        parameters={
            "type": "object",
            "properties": {
                "date": {"type": "string", "description": "YYYY-MM-DD"},
                "dentist": {"type": "string", "description": "Optional dentist name filter"},
            },
            "required": ["date"],
        },
    ),
    types.FunctionDeclaration(
        name="check_availability",
        description="List open 30-minute appointment slots for a given dentist on a given date (clinic hours 9-17).",
        parameters={
            "type": "object",
            "properties": {
                "date": {"type": "string", "description": "YYYY-MM-DD"},
                "dentist": {"type": "string", "description": "Dentist name"},
            },
            "required": ["date", "dentist"],
        },
    ),
]
