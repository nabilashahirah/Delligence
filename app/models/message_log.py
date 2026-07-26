from beanie import Document, PydanticObjectId
from pydantic import Field
from pymongo import IndexModel, ASCENDING, DESCENDING
from datetime import datetime
from typing import Optional
from enum import Enum


class MessageChannel(str, Enum):
    telegram = "telegram"


class MessageEvent(str, Enum):
    reminder_24h = "reminder_24h"
    checked_in = "checked_in"
    you_are_next = "you_are_next"
    called_in = "called_in"
    promo = "promo"


class MessageStatus(str, Enum):
    sent = "sent"
    failed = "failed"
    skipped = "skipped"


class MessageLog(Document):
    patient_id: Optional[PydanticObjectId] = None
    appointment_id: Optional[PydanticObjectId] = None
    channel: MessageChannel = MessageChannel.telegram
    event: MessageEvent
    text: str
    status: MessageStatus
    error: Optional[str] = None
    sent_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "message_logs"
        indexes = [
            IndexModel([("appointment_id", ASCENDING), ("event", ASCENDING)]),
            IndexModel([("patient_id", ASCENDING), ("sent_at", DESCENDING)]),
            IndexModel([("sent_at", DESCENDING)]),
        ]
