from pymongo.errors import DuplicateKeyError
from app.models.patient import Patient, ContactInfo, MedicalHistory
from app.schemas.patient import CreatePatientSchema, UpdatePatientSchema
from app.utils.errors import AppError
from app.utils.response import serialize, serialize_list
async def create_patient(data: CreatePatientSchema) -> dict:
    existing = await Patient.find_one({"id_number": data.id_number})
    if existing:
        if existing.is_active:
            raise AppError.conflict("A patient with this ID number already exists")
        # Reactivate soft-deleted patient with updated info
        await existing.set({
            "first_name": data.first_name,
            "last_name": data.last_name,
            "date_of_birth": data.date_of_birth,
            "gender": data.gender,
            "id_type": data.id_type,
            "contact": ContactInfo(**data.contact.model_dump()),
            "medical_history": MedicalHistory(
                **(data.medical_history.model_dump() if data.medical_history else {})
            ),
            "is_active": True,
        })
        await existing.sync()
        return serialize(existing)

    patient = Patient(
        first_name=data.first_name,
        last_name=data.last_name,
        date_of_birth=data.date_of_birth,
        gender=data.gender,
        id_type=data.id_type,
        id_number=data.id_number,
        contact=ContactInfo(**data.contact.model_dump()),
        medical_history=MedicalHistory(
            **(data.medical_history.model_dump() if data.medical_history else {})
        ),
    )
    try:
        await patient.insert()
    except DuplicateKeyError as e:
        key = list(e.details.get("keyPattern", {}).keys())[0] if e.details else "field"
        raise AppError.conflict(f"A patient with this {key} already exists")
    return serialize(patient)


async def get_all_patients(page: int = 1, limit: int = 20, search: str = None) -> dict:
    base_filter = {"is_active": True}

    if search:
        regex = {"$regex": search, "$options": "i"}
        base_filter["$or"] = [
            {"first_name": regex},
            {"last_name": regex},
            {"id_number": regex},
            {"contact.phone": regex},
        ]

    query = Patient.find(base_filter)
    total = await query.count()
    patients = (
        await query.sort(Patient.last_name)
        .skip((page - 1) * limit)
        .limit(limit)
        .to_list()
    )

    return {
        "patients": serialize_list(patients),
        "total": total,
        "page": page,
        "totalPages": -(-total // limit),
    }


async def get_patient_by_id(patient_id: str) -> dict:
    patient = await Patient.get(patient_id)
    if not patient or not patient.is_active:
        raise AppError.not_found("Patient not found")
    return serialize(patient)


async def update_patient(patient_id: str, data: UpdatePatientSchema) -> dict:
    patient = await Patient.get(patient_id)
    if not patient:
        raise AppError.not_found("Patient not found")

    update_data = data.model_dump(exclude_none=True)
    if "contact" in update_data:
        update_data["contact"] = ContactInfo(**update_data["contact"])
    if "medical_history" in update_data:
        update_data["medical_history"] = MedicalHistory(**update_data["medical_history"])

    await patient.set(update_data)
    await patient.sync()
    return serialize(patient)


async def delete_patient(patient_id: str) -> None:
    patient = await Patient.get(patient_id)
    if not patient:
        raise AppError.not_found("Patient not found")
    await patient.set({"is_active": False})
