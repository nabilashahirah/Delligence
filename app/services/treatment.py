from beanie import PydanticObjectId
from app.models.treatment import Treatment, ToothRecord, Prescription, CostInfo
from app.models.appointment import Appointment, AppointmentStatus
from app.schemas.treatment import CreateTreatmentSchema, UpdateTreatmentSchema
from app.utils.errors import AppError
from app.utils.response import serialize, serialize_list


async def create_treatment(data: CreateTreatmentSchema) -> dict:
    appt = await Appointment.get(data.appointment_id)
    if not appt:
        raise AppError.not_found("Appointment not found")
    if appt.status not in (AppointmentStatus.in_progress, AppointmentStatus.completed):
        raise AppError.bad_request("Treatment can only be recorded for in-progress or completed appointments")

    treatment = Treatment(
        appointment_id=PydanticObjectId(data.appointment_id),
        patient_id=PydanticObjectId(data.patient_id),
        dentist=data.dentist,
        procedure=data.procedure,
        teeth=[ToothRecord(**t.model_dump()) for t in data.teeth],
        diagnosis=data.diagnosis,
        findings=data.findings,
        prescription=[Prescription(**p.model_dump()) for p in data.prescription],
        cost=CostInfo(**data.cost.model_dump()),
        follow_up_date=data.follow_up_date,
    )
    await treatment.insert()
    return serialize(treatment)


async def update_treatment(treatment_id: str, data: UpdateTreatmentSchema) -> dict:
    treatment = await Treatment.get(treatment_id)
    if not treatment:
        raise AppError.not_found("Treatment not found")

    updates = {}
    if data.procedure is not None:
        updates["procedure"] = data.procedure
    if data.teeth is not None:
        updates["teeth"] = [ToothRecord(**t.model_dump()) for t in data.teeth]
    if data.diagnosis is not None:
        updates["diagnosis"] = data.diagnosis
    if data.findings is not None:
        updates["findings"] = data.findings
    if data.prescription is not None:
        updates["prescription"] = [Prescription(**p.model_dump()) for p in data.prescription]
    if data.cost is not None:
        updates["cost"] = CostInfo(**data.cost.model_dump())
    if data.follow_up_date is not None:
        updates["follow_up_date"] = data.follow_up_date

    if updates:
        await treatment.set(updates)
    return serialize(treatment)


async def get_treatments_by_patient(patient_id: str, page: int = 1, limit: int = 20) -> dict:
    query = Treatment.find({"patient_id": PydanticObjectId(patient_id)})
    total = await query.count()
    treatments = await query.sort(-Treatment.created_at).skip((page - 1) * limit).limit(limit).to_list()
    return {
        "treatments": serialize_list(treatments),
        "total": total,
        "page": page,
        "total_pages": -(-total // limit),
    }


async def get_treatment_by_id(treatment_id: str) -> dict:
    treatment = await Treatment.get(treatment_id)
    if not treatment:
        raise AppError.not_found("Treatment not found")
    return serialize(treatment)
