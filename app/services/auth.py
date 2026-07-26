from datetime import datetime, timedelta
import bcrypt
from jose import jwt
from app.models.staff import Staff
from app.utils.errors import AppError
from app.config import settings
from app.schemas.auth import RegisterSchema, LoginSchema


def _hash(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def _verify(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def _sign_token(user_id: str) -> str:
    exp = datetime.utcnow() + timedelta(minutes=settings.jwt_expires_minutes)
    return jwt.encode({"sub": str(user_id), "exp": exp}, settings.jwt_secret, algorithm="HS256")


def _staff_payload(staff: Staff) -> dict:
    return {"id": str(staff.id), "name": staff.name, "email": staff.email, "role": staff.role}


async def register(data: RegisterSchema) -> dict:
    existing = await Staff.find_one(Staff.email == data.email)
    if existing:
        raise AppError.conflict("Email already registered")

    staff = await Staff.insert(Staff(
        name=data.name, email=data.email,
        password=_hash(data.password), role=data.role,
    ))
    return {"token": _sign_token(staff.id), "staff": _staff_payload(staff)}


async def login(data: LoginSchema) -> dict:
    staff = await Staff.find_one(Staff.email == data.email, Staff.is_active == True)
    if not staff or not _verify(data.password, staff.password):
        raise AppError.bad_request("Invalid email or password")

    return {"token": _sign_token(staff.id), "staff": _staff_payload(staff)}


async def get_me(staff: Staff) -> dict:
    return _staff_payload(staff)
