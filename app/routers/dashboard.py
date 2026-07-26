from fastapi import APIRouter, Depends
from app.services import dashboard as dashboard_service
from app.utils.response import success
from app.dependencies.auth import get_current_user

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats")
async def get_stats(_=Depends(get_current_user)):
    data = await dashboard_service.get_stats()
    return success(data)
