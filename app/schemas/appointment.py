from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel
from typing import Optional
from datetime import datetime
from app.models.appointment import AppointmentType, AppointmentStatus


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class CreateAppointmentSchema(CamelModel):
    patient_id: str
    dentist: str
    scheduled_at: datetime
    duration: int = 30
    type: AppointmentType
    notes: Optional[str] = None
    walk_in: bool = False


class UpdateStatusSchema(CamelModel):
    status: AppointmentStatus
    cancellation_reason: Optional[str] = None


class RescheduleAppointmentSchema(CamelModel):
    dentist: str
    scheduled_at: datetime
    duration: int = 30


class UpdateAppointmentSchema(CamelModel):
    dentist: Optional[str] = None
    type: Optional[AppointmentType] = None
