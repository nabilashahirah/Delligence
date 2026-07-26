from fastapi import APIRouter, Depends, Query
from app.services import queue as queue_service
from app.dependencies.auth import get_current_user
from app.utils.response import success

router = APIRouter(prefix="/queue", tags=["queue"])
protected = Depends(get_current_user)


@router.get("")
async def get_queue(dentist: str = Query(None), _=protected):
    queue = await queue_service.get_active_queue(dentist)
    return success({"count": len(queue), "queue": queue})
