from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, Query, Request, Response
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from ..services.artifact_service import list_artifacts, read_artifact_preview, resolve_artifact
from ..services.config_service import get_config_bundle, save_user_config, validate_config_payload
from ..services.runtime import save_public_base_url
from ..services.schedule_service import ScheduleService
from ..services.task_manager import TaskManager, normalize_task_options

router = APIRouter(prefix="/api")


def remember_public_base_url(request: Request) -> str:
    forwarded_proto = request.headers.get("x-forwarded-proto", "").split(",", 1)[0].strip()
    forwarded_host = request.headers.get("x-forwarded-host", "").split(",", 1)[0].strip()
    forwarded_prefix = request.headers.get("x-forwarded-prefix", "").strip().rstrip("/")

    if forwarded_proto and forwarded_host:
        return save_public_base_url(f"{forwarded_proto}://{forwarded_host}{forwarded_prefix}") or f"{forwarded_proto}://{forwarded_host}{forwarded_prefix}"

    return save_public_base_url(str(request.base_url).rstrip("/")) or str(request.base_url).rstrip("/")


class TaskRunRequest(BaseModel):
    skip_epg: bool = False
    skip_check: bool = False
    skip_probe: bool = False


class ScheduleRequest(BaseModel):
    enabled: bool = False
    cron: str = "0 5 * * *"
    options: TaskRunRequest = Field(default_factory=TaskRunRequest)


@router.get("/health")
def health(request: Request) -> dict[str, Any]:
    task_manager: TaskManager = request.app.state.task_manager
    tasks = task_manager.list_tasks()
    running_task = next((task for task in tasks if task["running"]), None)
    return {
        "status": "ok",
        "running_task": running_task,
        "task_count": len(tasks),
        "artifact_count": len(list_artifacts()),
    }


@router.get("/config")
def get_config(request: Request) -> dict[str, Any]:
    return get_config_bundle(remember_public_base_url(request))


@router.put("/config")
def update_config(payload: dict[str, Any], request: Request) -> dict[str, Any]:
    try:
        return save_user_config(payload, remember_public_base_url(request))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/config/validate")
def validate_config(payload: dict[str, Any]) -> dict[str, Any]:
    return validate_config_payload(payload)


@router.get("/tasks")
def get_tasks(request: Request) -> list[dict[str, Any]]:
    task_manager: TaskManager = request.app.state.task_manager
    return task_manager.list_tasks()


@router.post("/tasks/run")
def run_task(request: Request, payload: TaskRunRequest) -> dict[str, Any]:
    task_manager: TaskManager = request.app.state.task_manager
    remember_public_base_url(request)
    try:
        return task_manager.start_task(payload.model_dump(), source="manual")
    except RuntimeError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.get("/tasks/{task_id}")
def get_task(task_id: str, request: Request) -> dict[str, Any]:
    task_manager: TaskManager = request.app.state.task_manager
    task = task_manager.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在。")
    return task


@router.get("/tasks/{task_id}/logs")
def get_task_logs(task_id: str, request: Request, response: Response, tail: int = Query(default=200, ge=1, le=2000)) -> dict[str, Any]:
    task_manager: TaskManager = request.app.state.task_manager
    task = task_manager.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在。")
    response.headers["Cache-Control"] = "no-store"
    return {"task_id": task_id, "content": task_manager.read_task_log(task_id, tail=tail)}


@router.get("/artifacts")
def get_artifacts(request: Request) -> list[dict[str, Any]]:
    return list_artifacts(remember_public_base_url(request))


@router.get("/artifacts/{name}/download")
def download_artifact(name: str) -> FileResponse:
    try:
        path = resolve_artifact(name)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="输出文件不存在。") from exc
    return FileResponse(path, filename=path.name)


@router.get("/artifacts/{name}/preview")
def preview_artifact(name: str, lines: int = Query(default=200, ge=1, le=1000)) -> dict[str, Any]:
    try:
        return read_artifact_preview(name, lines=lines)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="输出文件不存在。") from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/schedules")
def get_schedule(request: Request) -> dict[str, Any]:
    schedule_service: ScheduleService = request.app.state.schedule_service
    return schedule_service.load_schedule()


@router.put("/schedules")
def update_schedule(request: Request, payload: ScheduleRequest) -> dict[str, Any]:
    schedule_service: ScheduleService = request.app.state.schedule_service
    try:
        return schedule_service.save_schedule(
            {
                "enabled": payload.enabled,
                "cron": payload.cron,
                "options": normalize_task_options(payload.options.model_dump()),
            }
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"定时配置无效: {exc}") from exc


@router.post("/schedules/trigger")
def trigger_schedule(request: Request) -> dict[str, Any]:
    schedule_service: ScheduleService = request.app.state.schedule_service
    remember_public_base_url(request)
    try:
        return schedule_service.trigger_now()
    except RuntimeError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
