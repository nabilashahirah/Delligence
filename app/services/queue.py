from datetime import datetime
from app.models.appointment import Appointment
from app.models.patient import Patient


async def get_active_queue(dentist: str = None) -> list:
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end   = now.replace(hour=23, minute=59, second=59, microsecond=0)

    query = {
        "scheduled_at": {"$gte": today_start, "$lte": today_end},
        "status": {"$in": ["checked-in", "in-progress", "scheduled"]},
    }
    if dentist:
        query["dentist"] = dentist

    appointments = await Appointment.find(query).to_list()

    def sort_key(a: Appointment):
        order = {"in-progress": 0, "checked-in": 1, "scheduled": 2}
        return (order.get(a.status.value, 9), a.checked_in_at or a.scheduled_at)

    appointments.sort(key=sort_key)

    queue = []
    for i, appt in enumerate(appointments):
        patient = await Patient.get(appt.patient_id)
        queue.append({
            "position": i + 1,
            "appointmentId": str(appt.id),
            "patient": {
                "_id": str(patient.id),
                "firstName": patient.first_name,
                "lastName": patient.last_name,
            } if patient else None,
            "dentist": appt.dentist,
            "type": appt.type.value,
            "status": appt.status.value,
            "scheduledAt": appt.scheduled_at.isoformat(),
            "checkedInAt": appt.checked_in_at.isoformat() if appt.checked_in_at else None,
            "estimatedWaitMinutes": appt.predicted_wait_minutes or (i * appt.duration),
            "walkIn": appt.walk_in,
        })

    return queue


async def set_predicted_wait(appointment_id: str, minutes: int) -> None:
    appt = await Appointment.get(appointment_id)
    if appt:
        await appt.set({"predicted_wait_minutes": minutes})
