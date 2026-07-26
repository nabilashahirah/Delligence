from pydantic import BaseModel, ConfigDict, EmailStr
from pydantic.alias_generators import to_camel
from app.models.staff import StaffRole


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class RegisterSchema(CamelModel):
    name: str
    email: EmailStr
    password: str
    role: StaffRole = StaffRole.receptionist


class LoginSchema(CamelModel):
    email: EmailStr
    password: str
