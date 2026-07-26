import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings


async def fix():
    client = AsyncIOMotorClient(settings.mongo_uri, tlsAllowInvalidCertificates=True)
    db = client.get_default_database()
    result = await db["staff"].update_many(
        {},
        {"$set": {"is_active": True}}
    )
    print(f"Updated {result.modified_count} staff document(s) — is_active set to True")
    client.close()


asyncio.run(fix())
