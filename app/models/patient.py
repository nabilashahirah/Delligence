from beanie import Document
from pydantic import BaseModel, Field
from pymongo import IndexModel, ASCENDING
from datetime import datetime
from typing import Optional, List
from enum import Enum


class Gender(str, Enum):
    male = "male"
    female = "female"
    other = "other"


class IdType(str, Enum):
    ic = "ic"
    passport = "passport"


class ContactInfo(BaseModel):
    phone: str
    email: Optional[str] = None
    address: Optional[str] = None


class MedicalHistory(BaseModel):
    allergies: List[str] = []
    conditions: List[str] = []
    medications: List[str] = []
    notes: Optional[str] = None


class Patient(Document):
    first_name: str
    last_name: str
    date_of_birth: datetime
    gender: Gender
    id_type: IdType = IdType.ic
    id_number: str
    contact: ContactInfo
    medical_history: MedicalHistory = Field(default_factory=MedicalHistory)
    is_active: bool = True
    registered_at: datetime = Field(default_factory=datetime.utcnow)

    # Telegram integration (linked via portal deep-link)
    telegram_chat_id: Optional[str] = None
    telegram_link_token: Optional[str] = None       # one-time token for /start payload
    telegram_linked_at: Optional[datetime] = None
    telegram_optout: bool = False

    class Settings:
        name = "patients"
        indexes = [
            IndexModel([("id_number", ASCENDING)], unique=True, sparse=True),
            IndexModel([("last_name", ASCENDING), ("first_name", ASCENDING)]),
            IndexModel([("contact.phone", ASCENDING)]),
        ]
