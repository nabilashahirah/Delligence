from fastapi import APIRouter, Depends, Query
from app.schemas.treatment import CreateTreatmentSchema, UpdateTreatmentSchema
from app.services import treatment as treatment_service
from app.dependencies.auth import get_current_user
from app.utils.response import success, created

router = APIRouter(prefix="/treatments", tags=["treatments"])
protected = Depends(get_current_user)


@router.post("", status_code=201)
async def create(body: CreateTreatmentSchema, _=protected):
    result = await treatment_service.create_treatment(body)
    return created(result, "Treatment recorded")


@router.get("/patient/{patient_id}")
async def get_by_patient(
    patient_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    _=protected,
):
    result = await treatment_service.get_treatments_by_patient(patient_id, page, limit)
    return success(result)


@router.patch("/{treatment_id}")
async def update(treatment_id: str, body: UpdateTreatmentSchema, _=protected):
    result = await treatment_service.update_treatment(treatment_id, body)
    return success(result, "Treatment updated")


@router.get("/{treatment_id}")
async def get_one(treatment_id: str, _=protected):
    result = await treatment_service.get_treatment_by_id(treatment_id)
    return success(result)
