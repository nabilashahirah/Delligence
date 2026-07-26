from beanie import Document, PydanticObjectId
from pydantic import BaseModel, Field
from pymongo import IndexModel, ASCENDING, DESCENDING
from datetime import datetime
from typing import Optional, List
from enum import Enum


class ToothSurface(str, Enum):
    mesial = "mesial"
    distal = "distal"
    occlusal = "occlusal"
    buccal = "buccal"
    lingual = "lingual"


class ToothRecord(BaseModel):
    tooth_number: Optional[int] = None
    surface: List[ToothSurface] = []


class Prescription(BaseModel):
    drug: Optional[str] = None
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    duration: Optional[str] = None


class CostInfo(BaseModel):
    amount: float = 0.0
    currency: str = "MYR"
    is_paid: bool = False


class Treatment(Document):
    appointment_id: PydanticObjectId
    patient_id: PydanticObjectId
    dentist: str
    procedure: str
    teeth: List[ToothRecord] = []
    diagnosis: Optional[str] = None
    findings: Optional[str] = None
    prescription: List[Prescription] = []
    cost: CostInfo = Field(default_factory=CostInfo)
    follow_up_date: Optional[datetime] = None
    attachments: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "treatments"
        indexes = [
            IndexModel([("patient_id", ASCENDING), ("created_at", DESCENDING)]),
            IndexModel([("appointment_id", ASCENDING)], unique=True),
        ]
