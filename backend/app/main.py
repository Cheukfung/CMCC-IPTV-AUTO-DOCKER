from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from .api.routes import router
from .services.runtime import APP_ROOT, ensure_runtime_dirs
from .services.schedule_service import ScheduleService
from .services.task_manager import TaskManager

STATIC_DIR = APP_ROOT / "static"


@asynccontextmanager
async def lifespan(app: FastAPI):
    ensure_runtime_dirs()
    task_manager = TaskManager()
    schedule_service = ScheduleService(task_manager)
    schedule_service.start()

    app.state.task_manager = task_manager
    app.state.schedule_service = schedule_service
    yield
    schedule_service.shutdown()


app = FastAPI(
    title="CMCC IPTV Auto Docker",
    version="0.1.0",
    summary="WebUI + Docker wrapper for cmcc_iptv_auto_py",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(router)


@app.get("/", include_in_schema=False)
def index() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/{asset_path:path}", include_in_schema=False)
def frontend_asset(asset_path: str) -> FileResponse:
    if asset_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="Not found")

    target = (STATIC_DIR / asset_path).resolve()
    if target.parent == STATIC_DIR.resolve() and target.exists() and target.is_file():
        return FileResponse(target)

    return FileResponse(STATIC_DIR / "index.html")
