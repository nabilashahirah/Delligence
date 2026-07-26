from fastapi import APIRouter, Depends, Query
from app.schemas.patient import CreatePatientSchema, UpdatePatientSchema
from app.services import patient as patient_service
from app.dependencies.auth import get_current_user
from app.utils.response import success, created

router = APIRouter(prefix="/patients", tags=["patients"])
protected = Depends(get_current_user)


@router.get("")
async def get_all(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: str = Query(None),
    _=protected,
):
    result = await patient_service.get_all_patients(page, limit, search)
    return success(result)


@router.post("", status_code=201)
async def create(body: CreatePatientSchema, _=protected):
    result = await patient_service.create_patient(body)
    return created(result, "Patient registered")


@router.get("/{patient_id}")
async def get_one(patient_id: str, _=protected):
    result = await patient_service.get_patient_by_id(patient_id)
    return success(result)


@router.patch("/{patient_id}")
async def update(patient_id: str, body: UpdatePatientSchema, _=protected):
    result = await patient_service.update_patient(patient_id, body)
    return success(result, "Patient updated")


@router.delete("/{patient_id}")
async def delete(patient_id: str, _=protected):
    await patient_service.delete_patient(patient_id)
    return success(None, "Patient deactivated")
