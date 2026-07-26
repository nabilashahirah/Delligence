"""Run once to create the initial admin account."""
import asyncio
import bcrypt
from dotenv import load_dotenv
load_dotenv()

from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.config import settings
from app.models.staff import Staff, StaffRole


async def seed():
    client = AsyncIOMotorClient(settings.mongo_uri)
    await init_beanie(database=client.get_default_database(), document_models=[Staff])

    existing = await Staff.find_one(Staff.email == "admin@dentelligence.com")
    if existing:
        print("Admin account already exists.")
        return

    hashed = bcrypt.hashpw(b"secret123", bcrypt.gensalt()).decode()
    await Staff.insert(Staff(
        name="Nabila Admin",
        email="admin@dentelligence.com",
        password=hashed,
        role=StaffRole.admin,
    ))
    print("✓ Admin account created")
    print("  Email:    admin@dentelligence.com")
    print("  Password: secret123")


asyncio.run(seed())
