from datetime import datetime, timedelta
from app.models.appointment import Appointment


async def get_stats() -> dict:
    now       = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end   = now.replace(hour=23, minute=59, second=59, microsecond=0)
    week_start  = today_start - timedelta(days=6)

    # ── Today's appointments ─────────────────────────────────────────────────
    today_appts = await Appointment.find({
        "scheduled_at": {"$gte": today_start, "$lte": today_end},
    }).to_list()

    total_today  = len(today_appts)
    completed    = sum(1 for a in today_appts if a.status.value == "completed")
    in_progress  = sum(1 for a in today_appts if a.status.value == "in-progress")
    checked_in   = sum(1 for a in today_appts if a.status.value == "checked-in")
    scheduled    = sum(1 for a in today_appts if a.status.value == "scheduled")

    # ── Avg wait time today (completed appointments only) ────────────────────
    waited = [a.actual_wait_minutes for a in today_appts
              if a.status.value == "completed" and a.actual_wait_minutes is not None]
    avg_wait_today = round(sum(waited) / len(waited)) if waited else None

    # ── Busiest dentist today ────────────────────────────────────────────────
    dentist_counts: dict[str, int] = {}
    for a in today_appts:
        dentist_counts[a.dentist] = dentist_counts.get(a.dentist, 0) + 1
    busiest_dentist = max(dentist_counts, key=dentist_counts.get) if dentist_counts else None

    # ── This week's completed appointments ───────────────────────────────────
    week_appts = await Appointment.find({
        "scheduled_at": {"$gte": week_start, "$lte": today_end},
        "status": "completed",
    }).to_list()

    # Daily counts for sparkline (last 7 days)
    daily_counts = {}
    for i in range(7):
        day = (today_start - timedelta(days=6 - i)).date().isoformat()
        daily_counts[day] = 0
    for a in week_appts:
        day = a.scheduled_at.date().isoformat()
        if day in daily_counts:
            daily_counts[day] += 1

    # ── Avg wait this week ───────────────────────────────────────────────────
    week_waited = [a.actual_wait_minutes for a in week_appts if a.actual_wait_minutes is not None]
    avg_wait_week = round(sum(week_waited) / len(week_waited)) if week_waited else None

    # ── Treatment type breakdown today ───────────────────────────────────────
    type_counts: dict[str, int] = {}
    for a in today_appts:
        type_counts[a.type.value] = type_counts.get(a.type.value, 0) + 1

    return {
        "today": {
            "total":       total_today,
            "completed":   completed,
            "inProgress":  in_progress,
            "checkedIn":   checked_in,
            "scheduled":   scheduled,
            "avgWaitMinutes": avg_wait_today,
            "busiestDentist": busiest_dentist,
            "typeBreakdown": type_counts,
        },
        "week": {
            "totalCompleted": len(week_appts),
            "avgWaitMinutes": avg_wait_week,
            "dailyCounts": [{"date": d, "count": c} for d, c in daily_counts.items()],
        },
    }
