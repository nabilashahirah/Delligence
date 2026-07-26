from pydantic import BaseModel, ConfigDict, model_validator
from pydantic.alias_generators import to_camel
from typing import Optional, List
from datetime import datetime
from app.models.patient import Gender, IdType


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class ContactSchema(CamelModel):
    phone: str
    email: Optional[str] = None
    address: Optional[str] = None


class MedicalHistorySchema(CamelModel):
    allergies: List[str] = []
    conditions: List[str] = []
    medications: List[str] = []
    notes: Optional[str] = None


class CreatePatientSchema(CamelModel):
    first_name: str
    last_name: str
    date_of_birth: datetime
    gender: Gender
    id_type: IdType = IdType.ic
    id_number: str
    contact: ContactSchema
    medical_history: Optional[MedicalHistorySchema] = None

    @model_validator(mode="after")
    def validate_id_format(self):
        if self.id_type == IdType.ic:
            clean = self.id_number.replace("-", "")
            if not clean.isdigit() or len(clean) != 12:
                raise ValueError("IC number must be exactly 12 digits")
            self.id_number = clean
        else:
            if len(self.id_number) < 6:
                raise ValueError("Passport number must be at least 6 characters")
        return self


class UpdatePatientSchema(CamelModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    date_of_birth: Optional[datetime] = None
    gender: Optional[Gender] = None
    id_type: Optional[IdType] = None
    id_number: Optional[str] = None
    contact: Optional[ContactSchema] = None
    medical_history: Optional[MedicalHistorySchema] = None

    @model_validator(mode="after")
    def validate_id_format(self):
        if self.id_type and self.id_number:
            if self.id_type == IdType.ic:
                clean = self.id_number.replace("-", "")
                if not clean.isdigit() or len(clean) != 12:
                    raise ValueError("IC number must be exactly 12 digits")
                self.id_number = clean
            else:
                if len(self.id_number) < 6:
                    raise ValueError("Passport number must be at least 6 characters")
        return self
