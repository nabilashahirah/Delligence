from fastapi import Depends, Header
from jose import JWTError, jwt
from app.config import settings
from app.models.staff import Staff, StaffRole
from app.utils.errors import AppError


async def get_current_user(authorization: str = Header(...)) -> Staff:
    if not authorization.startswith("Bearer "):
        raise AppError.unauthorized("No token provided")

    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
        user_id: str = payload.get("sub")
        if not user_id:
            raise AppError.unauthorized("Invalid token")
    except JWTError:
        raise AppError.unauthorized("Invalid or expired token")

    staff = await Staff.get(user_id)
    if not staff or not staff.is_active:
        raise AppError.unauthorized("Account not found or inactive")

    return staff


def require_role(*roles: StaffRole):
    """Factory that returns a dependency checking the user's role."""
    async def check(current_user: Staff = Depends(get_current_user)) -> Staff:
        if current_user.role not in roles:
            raise AppError.forbidden(f"Role '{current_user.role}' is not authorized")
        return current_user
    return check
