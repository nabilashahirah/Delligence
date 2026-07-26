"""
Background scheduler for periodic tasks (reminders, etc).

Runs in-process via APScheduler's AsyncIOScheduler. Started/stopped
from the FastAPI lifespan in app/main.py.
"""
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from loguru import logger

from app.config import settings
from app.services import reminders

_scheduler: AsyncIOScheduler | None = None


async def _reminder_job():
    try:
        await reminders.scan_and_send()
    except Exception:
        logger.exception("[scheduler] reminder job failed")


def start() -> None:
    global _scheduler
    if _scheduler:
        return
    _scheduler = AsyncIOScheduler()
    _scheduler.add_job(
        _reminder_job,
        "interval",
        minutes=settings.scheduler_interval_minutes,
        id="reminders_24h",
        max_instances=1,
        coalesce=True,
    )
    _scheduler.start()
    logger.info(f"[scheduler] started (every {settings.scheduler_interval_minutes} min)")


def stop() -> None:
    global _scheduler
    if _scheduler:
        _scheduler.shutdown(wait=False)
        _scheduler = None
        logger.info("[scheduler] stopped")
