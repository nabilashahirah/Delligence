"""
Demo-day seed script for the 2026-07-28 presentation.

Seeds appointments across 3 days:
  - 2026-07-27 (yesterday): 8 completed appointments across 3 dentists
  - 2026-07-28 (DEMO DAY): live queue — 1 in-progress + 2 checked-in + 4 scheduled
  - 2026-07-29 (tomorrow): 6 scheduled appointments (for "check availability" demo)

Safe to re-run: wipes existing appointments in this 3-day window first.

Usage:
    venv\\Scripts\\python seed_demo_28jul.py
"""

import asyncio
import random
from datetime import datetime, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
import bcrypt

from app.config import settings
from app.models.staff import Staff, StaffRole
from app.models.patient import Patient, ContactInfo, MedicalHistory, Gender, IdType
from app.models.appointment import Appointment, AppointmentType, AppointmentStatus


_today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
DEMO_DATE = _today                          # today — recording day
YESTERDAY = DEMO_DATE - timedelta(days=1)
TOMORROW  = DEMO_DATE + timedelta(days=1)

DENTISTS = ["Dr. Amir", "Dr. Sarah", "Dr. Wong", "Dr. Priya"]

# Patients used for the demo. If they already exist by IC, we reuse them.
PATIENTS = [
    ("Ahmad",    "bin Razak",    "860312145678", "1986-03-12", "male",   "+60 12-345 6789"),
    ("Nurul",    "binti Hassan", "920815075432", "1992-08-15", "female", "+60 11-234 5678"),
    ("Wei Ming", "Tan",          "880620083456", "1988-06-20", "male",   "+60 16-789 0123"),
    ("Priya",    "Subramaniam",  "950101125432", "1995-01-01", "female", "+60 17-456 7890"),
    ("Hafiz",    "bin Othman",   "910430106543", "1991-04-30", "male",   "+60 18-901 2345"),
    ("Mei Ling", "Loh",          "830725026789", "1983-07-25", "female", "+60 12-678 9012"),
    ("Rajesh",   "Kumar",        "970214135678", "1997-02-14", "male",   "+60 14-321 6543"),
    ("Siti",     "binti Aziz",   "001105236543", "2000-11-05", "female", "+60 19-876 5432"),
]

DURATION = {
    "checkup": 30, "cleaning": 45, "filling": 45, "extraction": 30,
    "root-canal": 60, "consultation": 20, "other": 30,
}


async def ensure_patients() -> list[Patient]:
    docs = []
    for first, last, ic, dob, gender, phone in PATIENTS:
        existing = await Patient.find_one({"id_number": ic})
        if existing:
            docs.append(existing)
            continue
        p = Patient(
            first_name=first, last_name=last,
            date_of_birth=datetime.fromisoformat(dob),
            gender=Gender(gender), id_type=IdType.ic, id_number=ic,
            contact=ContactInfo(phone=phone),
            medical_history=MedicalHistory(),
        )
        await p.insert()
        docs.append(p)
        print(f"  + patient {first} {last}")
    return docs


async def ensure_admin():
    if await Staff.find_one({"role": "admin"}):
        return
    hashed = bcrypt.hashpw(b"Admin@123", bcrypt.gensalt()).decode()
    admin = Staff(name="Admin User", email="admin@dentelligence.com",
                  password=hashed, role=StaffRole.admin)
    await admin.insert()
    print("  + admin admin@dentelligence.com / Admin@123")


async def wipe_window():
    """Wipe the 3-day demo window so re-runs stay clean. History (>1 day back) is preserved."""
    start = YESTERDAY.replace(hour=0, minute=0, second=0)
    end = TOMORROW.replace(hour=23, minute=59, second=59)
    deleted = await Appointment.find(
        {"scheduled_at": {"$gte": start, "$lte": end}}
    ).delete()
    print(f"  - wiped {deleted.deleted_count} existing appointments in {start.date()}..{end.date()}")


def slot(day: datetime, hour: int, minute: int = 0) -> datetime:
    return day.replace(hour=hour, minute=minute, second=0, microsecond=0)


async def seed_yesterday(patients: list[Patient]):
    """8 completed appointments for the day before demo — proves the queue & ML have real history."""
    print(f"\n[{YESTERDAY.date()}] Yesterday (completed)")
    plan = [
        ("Dr. Amir",  9,  0, "cleaning",     0),
        ("Dr. Amir",  10, 0, "filling",      1),
        ("Dr. Sarah", 9,  30, "checkup",     2),
        ("Dr. Sarah", 11, 0, "root-canal",   3),
        ("Dr. Wong",  10, 0, "extraction",   4),
        ("Dr. Wong",  13, 0, "consultation", 5),
        ("Dr. Priya", 14, 0, "cleaning",     6),
        ("Dr. Priya", 15, 30, "checkup",     7),
    ]
    for dentist, hour, minute, appt_type, patient_idx in plan:
        sched = slot(YESTERDAY, hour, minute)
        dur = DURATION[appt_type]
        checked_in = sched - timedelta(minutes=random.randint(5, 15))
        started = sched + timedelta(minutes=random.randint(0, 8))
        completed = started + timedelta(minutes=dur + random.randint(-5, 10))
        wait = int((started - checked_in).total_seconds() / 60)

        await Appointment(
            patient_id=patients[patient_idx].id,
            dentist=dentist, scheduled_at=sched, duration=dur,
            type=AppointmentType(appt_type),
            status=AppointmentStatus.completed,
            checked_in_at=checked_in, started_at=started, completed_at=completed,
            actual_wait_minutes=max(0, wait), updated_at=completed,
        ).insert()
    print(f"  + 8 completed")


async def seed_demo_day(patients: list[Patient]):
    """Demo day = today. Dashboard should look full:
      - 6 completed appointments in the morning (drives completion rate + avg wait)
      - Live queue anchored to NOW so the "in-progress" patient feels live
      - Plenty of upcoming scheduled across all dentists
    """
    print(f"\n[{DEMO_DATE.date()}] DEMO DAY (dashboard-ready)")
    now = datetime.utcnow().replace(second=0, microsecond=0)
    status_map = {
        "scheduled":   AppointmentStatus.scheduled,
        "checked-in":  AppointmentStatus.checked_in,
        "in-progress": AppointmentStatus.in_progress,
    }

    # ── (a) Morning completed — makes the dashboard non-empty ──────────────
    morning = [
        ("Dr. Amir",  8,  0,  "cleaning",     0),
        ("Dr. Amir",  8,  45, "checkup",      1),
        ("Dr. Sarah", 8,  0,  "filling",      2),
        ("Dr. Sarah", 9,  0,  "consultation", 3),
        ("Dr. Wong",  8,  30, "extraction",   4),
        ("Dr. Priya", 9,  0,  "checkup",      5),
    ]
    for dentist, hour, minute, appt_type, pi in morning:
        sched = slot(DEMO_DATE, hour, minute)
        # Only mark completed if the scheduled time is in the past
        if sched >= now:
            continue
        dur = DURATION[appt_type]
        ci = sched - timedelta(minutes=random.randint(5, 12))
        st = sched + timedelta(minutes=random.randint(0, 6))
        cp = st + timedelta(minutes=dur + random.randint(-5, 8))
        wait = int((st - ci).total_seconds() / 60)
        await Appointment(
            patient_id=patients[pi].id,
            dentist=dentist, scheduled_at=sched, duration=dur,
            type=AppointmentType(appt_type),
            status=AppointmentStatus.completed,
            checked_in_at=ci, started_at=st, completed_at=cp,
            actual_wait_minutes=max(0, wait), updated_at=cp,
        ).insert()
    print(f"  + morning completed batch")

    # ── (b) Live queue anchored to NOW (Dr. Amir) ──────────────────────────
    live = [
        # (offset_min, status,          type,          checkin_offset_min)
        (-20, "in-progress", "root-canal",   -40),
        (  0, "checked-in",  "filling",       -8),
        ( 15, "checked-in",  "cleaning",      -2),
        ( 45, "scheduled",   "checkup",     None),
        ( 90, "scheduled",   "consultation",None),
        (120, "scheduled",   "extraction",  None),
        (180, "scheduled",   "cleaning",    None),
    ]
    demo_dentist = "Dr. Amir"
    for i, (offset, status_str, appt_type, ci_offset) in enumerate(live):
        sched = now + timedelta(minutes=offset)
        dur = DURATION[appt_type]
        checked_in = sched + timedelta(minutes=ci_offset) if ci_offset is not None else None
        started = sched - timedelta(minutes=random.randint(5, 15)) if status_str == "in-progress" else None
        await Appointment(
            patient_id=patients[i].id,
            dentist=demo_dentist, scheduled_at=sched, duration=dur,
            type=AppointmentType(appt_type),
            status=status_map[status_str],
            checked_in_at=checked_in, started_at=started, updated_at=now,
        ).insert()
        print(f"  + [{status_str:11s}] {patients[i].first_name} — {appt_type} @ {sched.strftime('%H:%M')}")

    # ── (c) Other dentists' schedules for today (fills the calendar view) ──
    others = [
        ("Dr. Sarah", 10, 30, "checkup",     0),
        ("Dr. Sarah", 13, 0,  "cleaning",    1),
        ("Dr. Sarah", 15, 0,  "filling",     2),
        ("Dr. Wong",  10, 0,  "cleaning",    3),
        ("Dr. Wong",  11, 30, "extraction",  4),
        ("Dr. Wong",  14, 30, "checkup",     5),
        ("Dr. Priya", 10, 0,  "consultation",6),
        ("Dr. Priya", 13, 30, "filling",     7),
        ("Dr. Priya", 16, 0,  "checkup",     0),
    ]
    for dentist, hour, minute, appt_type, pi in others:
        sched = slot(DEMO_DATE, hour, minute)
        if sched < now - timedelta(minutes=15):
            continue  # skip anything already past — keeps it "future scheduled"
        await Appointment(
            patient_id=patients[pi].id,
            dentist=dentist, scheduled_at=sched, duration=DURATION[appt_type],
            type=AppointmentType(appt_type),
            status=AppointmentStatus.scheduled,
            updated_at=now,
        ).insert()
    print(f"  + other-dentist schedule filled")


async def seed_tomorrow(patients: list[Patient]):
    """6 scheduled appointments for the day after demo — showcases the check_availability tool."""
    print(f"\n[{TOMORROW.date()}] Tomorrow (scheduled)")
    plan = [
        ("Dr. Amir",  9,  0, "cleaning",     0),
        ("Dr. Amir",  11, 30, "filling",     1),
        ("Dr. Amir",  14, 0, "root-canal",   2),
        ("Dr. Sarah", 9,  30, "checkup",     3),
        ("Dr. Sarah", 15, 0, "consultation", 4),
        ("Dr. Wong",  10, 0, "extraction",   5),
    ]
    for dentist, hour, minute, appt_type, patient_idx in plan:
        sched = slot(TOMORROW, hour, minute)
        await Appointment(
            patient_id=patients[patient_idx].id,
            dentist=dentist, scheduled_at=sched, duration=DURATION[appt_type],
            type=AppointmentType(appt_type),
            status=AppointmentStatus.scheduled,
            updated_at=datetime.utcnow(),
        ).insert()
    print(f"  + 6 scheduled")


async def main():
    client = AsyncIOMotorClient(settings.mongo_uri)
    db = client.get_default_database()
    await init_beanie(database=db, document_models=[Staff, Patient, Appointment])
    print("Connected to MongoDB.\n")

    await ensure_admin()
    patients = await ensure_patients()
    await wipe_window()
    await seed_yesterday(patients)
    await seed_demo_day(patients)
    await seed_tomorrow(patients)

    print("\nDone. Log in as admin@dentelligence.com / Admin@123")
    client.close()


if __name__ == "__main__":
    asyncio.run(main())
