from beanie import Document, PydanticObjectId
from pydantic import Field
from pymongo import IndexModel, ASCENDING, DESCENDING
from datetime import datetime
from typing import Optional
from enum import Enum


class AppointmentStatus(str, Enum):
    scheduled = "scheduled"
    checked_in = "checked-in"
    in_progress = "in-progress"
    completed = "completed"
    cancelled = "cancelled"
    no_show = "no-show"


class AppointmentType(str, Enum):
    checkup = "checkup"
    cleaning = "cleaning"
    filling = "filling"
    extraction = "extraction"
    root_canal = "root-canal"
    consultation = "consultation"
    other = "other"


# Valid status transitions
VALID_TRANSITIONS: dict[str, list[str]] = {
    "scheduled":   ["checked-in", "cancelled", "no-show"],
    "checked-in":  ["in-progress", "cancelled"],
    "in-progress": ["completed"],
    "completed":   [],
    "cancelled":   [],
    "no-show":     [],
}


class Appointment(Document):
    patient_id: PydanticObjectId
    dentist: str
    scheduled_at: datetime
    duration: int = 30          # minutes
    type: AppointmentType
    status: AppointmentStatus = AppointmentStatus.scheduled
    notes: Optional[str] = None
    cancellation_reason: Optional[str] = None
    walk_in: bool = False

    # Queue tracking
    checked_in_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    # AI wait-time hook
    predicted_wait_minutes: Optional[int] = None
    actual_wait_minutes: Optional[int] = None

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "appointments"
        indexes = [
            IndexModel([("scheduled_at", ASCENDING), ("status", ASCENDING)]),
            IndexModel([("patient_id", ASCENDING), ("scheduled_at", DESCENDING)]),
            IndexModel([("dentist", ASCENDING), ("scheduled_at", ASCENDING)]),
        ]
