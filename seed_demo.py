"""
Demo seed script — run once before a demo to populate realistic data.

Usage:
    python seed_demo.py

What it creates:
  - 8 patients
  - ~60 completed appointments over the past 3 weeks (gives prediction engine real history)
  - Today's live queue: 1 in-progress + 2 checked-in + 3 scheduled
"""

import asyncio
import random
from datetime import datetime, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie, PydanticObjectId
import bcrypt

from app.config import settings
from app.models.staff import Staff, StaffRole
from app.models.patient import Patient, ContactInfo, MedicalHistory, Gender, IdType
from app.models.appointment import Appointment, AppointmentType, AppointmentStatus

# ── Realistic duration ranges per type (min, max) in minutes ─────────────────
DURATION_RANGES = {
    "checkup":      (20, 35),
    "cleaning":     (30, 50),
    "filling":      (40, 65),
    "extraction":   (25, 45),
    "root-canal":   (55, 90),
    "consultation": (12, 22),
    "other":        (20, 40),
}

# Actual wait tends to be 80-120% of scheduled duration
WAIT_VARIANCE = (0.8, 1.2)

DENTISTS = ["Dr. Amir", "Dr. Sarah", "Dr. Wong", "Dr. Priya"]

PATIENTS = [
    ("Ahmad",    "bin Razak",   "860312145678", "1986-03-12", "male",   "+60 12-345 6789"),
    ("Nurul",    "binti Hassan","920815075432", "1992-08-15", "female", "+60 11-234 5678"),
    ("Wei Ming", "Tan",         "880620083456", "1988-06-20", "male",   "+60 16-789 0123"),
    ("Priya",    "Subramaniam", "950101125432", "1995-01-01", "female", "+60 17-456 7890"),
    ("Hafiz",    "bin Othman",  "910430106543", "1991-04-30", "male",   "+60 18-901 2345"),
    ("Mei Ling", "Loh",         "830725026789", "1983-07-25", "female", "+60 12-678 9012"),
    ("Rajesh",   "Kumar",       "970214135678", "1997-02-14", "male",   "+60 14-321 6543"),
    ("Siti",     "binti Aziz",  "001105236543", "2000-11-05", "female", "+60 19-876 5432"),
]


def rand_duration(appt_type: str) -> int:
    lo, hi = DURATION_RANGES[appt_type]
    return random.randint(lo, hi)


def rand_actual(scheduled: int) -> int:
    lo, hi = WAIT_VARIANCE
    return max(5, int(scheduled * random.uniform(lo, hi)))


async def seed():
    client = AsyncIOMotorClient(settings.mongo_uri)
    db = client.get_default_database()

    await init_beanie(
        database=db,
        document_models=[Staff, Patient, Appointment],
    )

    print("Connected to MongoDB.")

    # ── 1. Ensure at least one admin staff exists ────────────────────────────
    existing_staff = await Staff.find_one({"role": "admin"})
    if not existing_staff:
        hashed = bcrypt.hashpw(b"Admin@123", bcrypt.gensalt()).decode()
        admin = Staff(name="Admin User", email="admin@dentelligence.com",
                      password=hashed, role=StaffRole.admin)
        await admin.insert()
        print(f"  Created staff: admin@dentelligence.com / Admin@123")
    else:
        print(f"  Staff already exists ({existing_staff.email}), skipping.")

    # ── 2. Create patients (skip if IC already exists) ───────────────────────
    patient_docs = []
    for first, last, ic, dob, gender, phone in PATIENTS:
        existing = await Patient.find_one({"id_number": ic})
        if existing:
            patient_docs.append(existing)
            print(f"  Patient exists: {first} {last}")
            continue

        p = Patient(
            first_name=first,
            last_name=last,
            date_of_birth=datetime.fromisoformat(dob),
            gender=Gender(gender),
            id_type=IdType.ic,
            id_number=ic,
            contact=ContactInfo(phone=phone),
            medical_history=MedicalHistory(),
        )
        await p.insert()
        patient_docs.append(p)
        print(f"  Created patient: {first} {last}")

    # ── 3. Historical completed appointments (past 3 weeks) ──────────────────
    now = datetime.utcnow()
    types = list(DURATION_RANGES.keys())

    print("\nSeeding historical appointments...")
    historical_count = 0

    for days_ago in range(1, 22):  # 21 days back
        day_start = (now - timedelta(days=days_ago)).replace(
            hour=8, minute=0, second=0, microsecond=0
        )
        # 3-5 appointments per day per dentist (random subset)
        for dentist in random.sample(DENTISTS, k=random.randint(2, 4)):
            slot_time = day_start.replace(hour=random.randint(8, 9))
            n_appts = random.randint(2, 5)
            for _ in range(n_appts):
                patient = random.choice(patient_docs)
                appt_type = random.choice(types)
                sched_duration = rand_duration(appt_type)
                actual_duration = rand_actual(sched_duration)

                # wait = 5-25 min after scheduled time
                wait_offset = random.randint(3, 20)
                checked_in = slot_time - timedelta(minutes=wait_offset)
                started    = slot_time + timedelta(minutes=random.randint(0, 10))
                completed  = started + timedelta(minutes=actual_duration)
                actual_wait = int((started - checked_in).total_seconds() / 60)

                appt = Appointment(
                    patient_id=patient.id,
                    dentist=dentist,
                    scheduled_at=slot_time,
                    duration=sched_duration,
                    type=AppointmentType(appt_type),
                    status=AppointmentStatus.completed,
                    checked_in_at=checked_in,
                    started_at=started,
                    completed_at=completed,
                    actual_wait_minutes=max(0, actual_wait),
                    updated_at=completed,
                )
                await appt.insert()
                historical_count += 1

                slot_time += timedelta(minutes=sched_duration + random.randint(5, 15))

    print(f"  Created {historical_count} historical appointments.")

    # ── 4. Today's live queue ─────────────────────────────────────────────────
    print("\nSeeding today's live queue...")

    today_base = now.replace(hour=9, minute=0, second=0, microsecond=0)
    demo_dentist = "Dr. Amir"

    live_slots = [
        # (offset_minutes, status, checked_in_offset)
        ( 0,  "in-progress", -15),
        (30,  "checked-in",   -5),
        (60,  "checked-in",   -2),
        (90,  "scheduled",    None),
        (120, "scheduled",    None),
        (150, "scheduled",    None),
    ]

    live_types = ["root-canal", "filling", "checkup", "cleaning", "consultation", "extraction"]

    for i, (offset, status_str, checkin_offset) in enumerate(live_slots):
        patient = patient_docs[i % len(patient_docs)]
        appt_type = live_types[i]
        sched_duration = rand_duration(appt_type)
        slot_time = today_base + timedelta(minutes=offset)

        checked_in_at = None
        started_at    = None

        if checkin_offset is not None:
            checked_in_at = slot_time + timedelta(minutes=checkin_offset)

        if status_str == "in-progress":
            started_at = slot_time - timedelta(minutes=random.randint(5, 15))

        status_map = {
            "scheduled":   AppointmentStatus.scheduled,
            "checked-in":  AppointmentStatus.checked_in,
            "in-progress": AppointmentStatus.in_progress,
        }

        appt = Appointment(
            patient_id=patient.id,
            dentist=demo_dentist,
            scheduled_at=slot_time,
            duration=sched_duration,
            type=AppointmentType(appt_type),
            status=status_map[status_str],
            checked_in_at=checked_in_at,
            started_at=started_at,
            updated_at=now,
        )
        await appt.insert()
        print(f"  [{status_str:12s}] {patient.first_name} {patient.last_name} — {appt_type} @ {slot_time.strftime('%H:%M')}")

    print("\nDemo data seeded successfully!")
    print("\nLogin credentials:")
    print("  Email:    admin@dentelligence.com")
    print("  Password: Admin@123")
    print("\nLive queue is under Dr. Amir for today.")

    client.close()


if __name__ == "__main__":
    asyncio.run(seed())
