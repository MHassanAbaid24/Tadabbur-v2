from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
import logging

from app.config import settings
from app.routers import audio, auth, circle, daily, progress, reflection, tafsir, verse

logger = logging.getLogger(__name__)

app = FastAPI(
    title="Tadabbur API",
    description="Quran reflection & community app",
    version="1.0.0",
)

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


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
