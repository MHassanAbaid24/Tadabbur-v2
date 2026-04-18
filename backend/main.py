from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
import logging

from app.config import settings
from app.routers import audio, auth, circle, daily, events, profile, progress, reflection, tafsir, verse
from app.models.schemas import APIResponse
from app.services.reminder_scheduler import start_reminder_scheduler, stop_reminder_scheduler

logger = logging.getLogger(__name__)

app = FastAPI(
    title="Tadabbur API",
    description="Quran reflection & community app",
    version="1.0.0",
)

@app.on_event("startup")
async def startup_event():
    start_reminder_scheduler()

@app.on_event("shutdown")
def shutdown_event():
    stop_reminder_scheduler()

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

# Custom exception handler for validation errors
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    """Log validation errors with details for debugging."""
    logger.error(f"Validation error on {request.method} {request.url.path}")
    for error in exc.errors():
        logger.error(f"  Field: {error['loc']}, Error: {error['msg']}")
    
    return JSONResponse(
        status_code=422,
        content={
            "detail": exc.errors(),
            "message": "Validation failed. Check 'detail' for field errors."
        }
    )

# Custom exception handler for HTTPException
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """Convert HTTPException to APIResponse format with error code detection."""
    # Extract error code from detail if present (format: "ERROR_CODE: message")
    detail = exc.detail or "Unknown error"
    error_code = None
    
    # Check if detail contains our error code prefix
    if isinstance(detail, str):
        if detail.startswith("QF_ACCOUNT_NOT_CONNECTED"):
            error_code = "QF_ACCOUNT_NOT_CONNECTED"
        elif detail.startswith("QF_"):
            # Extract any QF error code
            parts = detail.split(":", 1)
            error_code = parts[0].strip()
    
    response = APIResponse(
        success=False,
        error=str(detail),
        code=error_code
    )
    
    return JSONResponse(
        status_code=exc.status_code,
        content=response.model_dump(exclude_none=True)
    )

# Health check endpoint
@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "version": "1.0.0"}


# Include routers
app.include_router(auth.router)
app.include_router(verse.router, prefix="/api/verse", tags=["Verse"])
app.include_router(tafsir.router, prefix="/api/tafsir", tags=["Tafsir"])
app.include_router(audio.router, prefix="/api/audio", tags=["Audio"])
app.include_router(reflection.router, prefix="/api/reflection", tags=["Reflection"])
app.include_router(circle.router, prefix="/api/circle", tags=["Circle"])
app.include_router(progress.router, prefix="/api/progress", tags=["Progress"])
app.include_router(daily.router, prefix="/api/daily", tags=["Daily"])
app.include_router(events.router, prefix="/api/events", tags=["Events"])
app.include_router(profile.router)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
