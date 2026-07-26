from beanie import Document
from pydantic import Field
from pymongo import IndexModel, ASCENDING
from datetime import datetime
from enum import Enum


class StaffRole(str, Enum):
    admin = "admin"
    dentist = "dentist"
    receptionist = "receptionist"


class Staff(Document):
    name: str
    email: str
    password: str = Field(exclude=True)  # never returned in responses
    role: StaffRole = StaffRole.receptionist
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "staff"
        indexes = [IndexModel([("email", ASCENDING)], unique=True)]
