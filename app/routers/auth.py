from fastapi import APIRouter, Depends
from app.schemas.auth import RegisterSchema, LoginSchema
from app.services import auth as auth_service
from app.dependencies.auth import get_current_user
from app.models.staff import Staff
from app.utils.response import success, created

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", status_code=201)
async def register(body: RegisterSchema):
    result = await auth_service.register(body)
    return created(result, "Account created")


@router.post("/login")
async def login(body: LoginSchema):
    result = await auth_service.login(body)
    return success(result, "Login successful")


@router.get("/me")
async def me(current_user: Staff = Depends(get_current_user)):
    result = await auth_service.get_me(current_user)
    return success(result)
