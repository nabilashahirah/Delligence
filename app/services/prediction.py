"""
Wait-time prediction service.

Priority order for estimating each appointment's duration:
  1. ML model (GradientBoostingRegressor) — loaded from models/wait_time_model.pkl
  2. Historical average from completed appointments (same type, ≥3 samples)
  3. Appointment's scheduled duration field (hard fallback)

Train / retrain the model:
    python scripts/generate_and_train.py
"""

from datetime import datetime
from app.models.appointment import Appointment
from app.utils.ws_manager import manager as ws
from app.services import ml_predictor
from app.services import notifications


async def _historical_avg_durations() -> dict[str, int]:
    """
    Returns {appointment_type: avg_actual_minutes} from all completed appointments
    that have both started_at and completed_at recorded.
    """
    pipeline = [
        {
            "$match": {
                "status": "completed",
                "started_at":   {"$exists": True, "$ne": None},
                "completed_at": {"$exists": True, "$ne": None},
            }
        },
        {
            "$project": {
                "type": 1,
                "actual_minutes": {
                    "$divide": [
                        {"$subtract": ["$completed_at", "$started_at"]},
                        60000,   # milliseconds → minutes
                    ]
                },
            }
        },
        {
            "$group": {
                "_id": "$type",
                "avg_minutes": {"$avg": "$actual_minutes"},
                "sample_size": {"$sum": 1},
            }
        },
    ]
    results = await Appointment.aggregate(pipeline).to_list()
    # Only trust averages with at least 3 samples
    return {
        r["_id"]: int(r["avg_minutes"])
        for r in results
        if r["sample_size"] >= 3 and r["avg_minutes"] > 0
    }


def _sort_key(appt: Appointment):
    order = {"in-progress": 0, "checked-in": 1, "scheduled": 2}
    return (order.get(appt.status.value, 9), appt.checked_in_at or appt.scheduled_at)


async def recalculate_queue(dentist: str = None) -> None:
    """
    Recalculate and persist predicted_wait_minutes for every active appointment
    today.  Called automatically after each status transition.
    """
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end   = now.replace(hour=23, minute=59, second=59, microsecond=0)

    mongo_filter = {
        "scheduled_at": {"$gte": today_start, "$lte": today_end},
        "status": {"$in": ["scheduled", "checked-in", "in-progress"]},
    }
    if dentist:
        mongo_filter["dentist"] = dentist

    appointments = await Appointment.find(mongo_filter).to_list()
    if not appointments:
        return

    appointments.sort(key=_sort_key)

    # Skip the DB aggregate when the ML model is available
    avg_durations = {} if ml_predictor.is_loaded() else await _historical_avg_durations()

    queue_payload = []
    cumulative = 0
    for i, appt in enumerate(appointments):
        if appt.status.value == "in-progress":
            predicted = 0
        else:
            predicted = cumulative

        await appt.set({"predicted_wait_minutes": predicted})
        queue_payload.append({
            "appointmentId": str(appt.id),
            "position": i + 1,
            "status": appt.status.value,
            "estimatedWait": predicted,
        })

        # Duration estimate: ML model → historical average → scheduled duration
        ml_est = ml_predictor.predict_duration(
            appt_type   = appt.type.value,
            dentist     = appt.dentist,
            hour        = appt.scheduled_at.hour,
            day_of_week = appt.scheduled_at.weekday(),
            queue_depth = i,
        )
        estimated_duration = (
            ml_est
            or avg_durations.get(appt.type.value)
            or appt.duration
        )
        cumulative += estimated_duration

    await ws.broadcast({"event": "queue_update", "queue": queue_payload})

    # Telegram notification hook — fires "you're next" when a patient becomes #1
    try:
        await notifications.on_queue_recalculated(appointments)
    except Exception:
        # Never let a notification failure break the queue update
        from loguru import logger
        logger.exception("Notification hook failed")
