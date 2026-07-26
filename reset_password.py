"""Reset admin password to Admin@123"""
import asyncio
import bcrypt
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.config import settings
from app.models.staff import Staff


async def reset():
    client = AsyncIOMotorClient(settings.mongo_uri, tlsAllowInvalidCertificates=True)
    db = client.get_default_database()
    await init_beanie(database=db, document_models=[Staff])

    staff = await Staff.find_one(Staff.email == "admin@dentelligence.com")
    if not staff:
        print("No admin found!")
        return

    new_hash = bcrypt.hashpw(b"Admin@123", bcrypt.gensalt()).decode()
    await staff.set({"password": new_hash})
    print(f"Password reset successfully for {staff.email}")
    print("  Email:    admin@dentelligence.com")
    print("  Password: Admin@123")
    client.close()


asyncio.run(reset())
