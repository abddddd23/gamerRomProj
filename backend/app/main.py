import logging
import sys
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import get_settings
from app.core.paths import ensure_app_directories
from app.db.session import Base, engine
from app.version import VERSION


settings = get_settings()
paths = ensure_app_directories()
logging.basicConfig(filename=paths["logs"] / "gaming-room.log", level=getattr(logging, settings.log_level.upper(), logging.INFO),
                    format="%(asctime)s %(levelname)s %(name)s %(message)s")

@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield

app = FastAPI(title="Gaming Room Management API", version=VERSION, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)

@app.exception_handler(Exception)
async def unhandled_exception_handler(_: Request, exc: Exception):
    logging.getLogger(__name__).exception("Unhandled request failure", exc_info=exc)
    return JSONResponse(status_code=500, content={"detail": "An unexpected server error occurred."})

if getattr(sys, "frozen", False):
    static_dir = Path(sys._MEIPASS) / "frontend_dist"
else:
    static_dir = Path(__file__).resolve().parents[1] / "frontend_dist"
if static_dir.is_dir():
    app.mount("/assets", StaticFiles(directory=static_dir / "assets"), name="assets")

    @app.get("/{path:path}", include_in_schema=False)
    def frontend(path: str):
        candidate = static_dir / path
        if path and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(static_dir / "index.html")
