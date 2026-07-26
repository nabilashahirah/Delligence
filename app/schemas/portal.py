from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel
from typing import Optional, List
from datetime import datetime
from app.models.appointment import AppointmentType


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class PatientInfoSchema(CamelModel):
    """Filled only when patient is NEW (not found by IC)."""
    first_name: str
    last_name: str
    date_of_birth: str          # ISO date string e.g. "1990-01-15"
    gender: str                 # male / female / other
    phone: str
    email: Optional[str] = None
    allergies: List[str] = []
    conditions: List[str] = []
    medications: List[str] = []


class PublicBookSchema(CamelModel):
    ic_number: str              # used to look up existing patient
    dentist: str
    scheduled_at: Optional[datetime] = None   # omit for walk-ins (uses now)
    duration: int = 30
    type: AppointmentType
    notes: Optional[str] = None
    walk_in: bool = False       # True = skip scheduling, set checked-in immediately
    # Only required when patient is not found in DB
    patient_info: Optional[PatientInfoSchema] = None
