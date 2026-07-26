from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel
from typing import Optional, List
from datetime import datetime
from app.models.treatment import ToothSurface


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class ToothRecordSchema(CamelModel):
    tooth_number: Optional[int] = None
    surface: List[ToothSurface] = []


class PrescriptionSchema(CamelModel):
    drug: Optional[str] = None
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    duration: Optional[str] = None


class CostSchema(CamelModel):
    amount: float = 0.0
    currency: str = "MYR"
    is_paid: bool = False


class CreateTreatmentSchema(CamelModel):
    appointment_id: str
    patient_id: str
    dentist: str
    procedure: str
    teeth: List[ToothRecordSchema] = []
    diagnosis: Optional[str] = None
    findings: Optional[str] = None
    prescription: List[PrescriptionSchema] = []
    cost: CostSchema = CostSchema()
    follow_up_date: Optional[datetime] = None


class UpdateTreatmentSchema(CamelModel):
    procedure: Optional[str] = None
    teeth: Optional[List[ToothRecordSchema]] = None
    diagnosis: Optional[str] = None
    findings: Optional[str] = None
    prescription: Optional[List[PrescriptionSchema]] = None
    cost: Optional[CostSchema] = None
    follow_up_date: Optional[datetime] = None
