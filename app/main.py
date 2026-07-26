from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from contextlib import asynccontextmanager
from loguru import logger

from app.database import init_db
from app.config import settings
from app.routers import (
    auth, patients, appointments, queue, treatments, portal,
    dashboard, ai, ws, telegram as telegram_router, messages,
)
from app.services import ml_predictor, telegram as telegram_service
from app import scheduler as background_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    ml_predictor.load()
    if telegram_service.is_configured():
        background_scheduler.start()
        logger.info("Telegram notifications enabled")
    else:
        logger.info("Telegram notifications disabled (no TELEGRAM_BOT_TOKEN)")
    logger.info(f"Dentelligence API started [{settings.env}]")
    yield
    background_scheduler.stop()
    logger.info("Shutting down")


app = FastAPI(
    title="Dentelligence API",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan,
)

# CORS — allow React dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Pydantic / FastAPI validation errors → 422 with readable details
@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError):
    details = [f"{' -> '.join(str(l) for l in e['loc'])}: {e['msg']}" for e in exc.errors()]
    return JSONResponse(
        status_code=422,
        content={"success": False, "message": "Validation error", "details": details},
    )


# AppError / HTTPException → structured JSON
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    from fastapi import HTTPException
    if isinstance(exc, HTTPException):
        detail = exc.detail
        if isinstance(detail, dict):
            return JSONResponse(status_code=exc.status_code, content={"success": False, **detail})
        return JSONResponse(status_code=exc.status_code, content={"success": False, "message": str(detail)})
    logger.exception(exc)
    return JSONResponse(status_code=500, content={"success": False, "message": "Internal server error"})


# Health check
@app.get("/health")
async def health():
    return {"status": "ok", "service": "dentelligence-api"}


# Versioned routes
PREFIX = "/api/v1"
app.include_router(auth.router,             prefix=PREFIX)
app.include_router(patients.router,         prefix=PREFIX)
app.include_router(appointments.router,     prefix=PREFIX)
app.include_router(queue.router,            prefix=PREFIX)
app.include_router(treatments.router,       prefix=PREFIX)
app.include_router(portal.router,           prefix=PREFIX)
app.include_router(dashboard.router,        prefix=PREFIX)
app.include_router(ai.router,               prefix=PREFIX)
app.include_router(telegram_router.router,  prefix=PREFIX)
app.include_router(messages.router,         prefix=PREFIX)
app.include_router(ws.router)
