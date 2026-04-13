from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import audio, circle, daily, progress, reflection, tafsir, verse

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

# Health check endpoint
@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "version": "1.0.0"}


# Include routers
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
