from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from loguru import logger
from app.config import settings


async def init_db():
    client = AsyncIOMotorClient(settings.mongo_uri, tlsAllowInvalidCertificates=True)
    # database name is taken from the URI path (e.g. /dentelligence)
    db = client.get_default_database()

    from app.models.staff import Staff
    from app.models.patient import Patient
    from app.models.appointment import Appointment
    from app.models.treatment import Treatment
    from app.models.message_log import MessageLog

    await init_beanie(database=db, document_models=[Staff, Patient, Appointment, Treatment, MessageLog])
    logger.info(f"MongoDB connected: {db.name}")
