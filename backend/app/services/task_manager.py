from __future__ import annotations

import os
import subprocess
import sys
import threading
import uuid
import signal
from pathlib import Path
from typing import Any

from .artifact_service import list_artifacts
from .runtime import DATA_DIR, LOG_DIR, REFERENCE_DIR, RUNTIME_ROOT, TASKS_FILE, TV_SCRIPT, ensure_runtime_dirs, load_json_file, load_public_base_url, save_json_file, utc_now_iso

TASK_STATUSES = {"pending", "running", "success", "failed"}


def normalize_task_options(payload: dict[str, Any] | None) -> dict[str, bool]:
    payload = payload or {}
    return {
        "skip_epg": bool(payload.get("skip_epg", False)),
        "skip_check": bool(payload.get("skip_check", False)),
        "skip_probe": bool(payload.get("skip_probe", False)),
    }


class TaskManager:
    def __init__(self) -> None:
        ensure_runtime_dirs()
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        self._lock = threading.RLock()
        self._processes: dict[str, subprocess.Popen[str]] = {}
        raw_tasks = load_json_file(TASKS_FILE, [])
        self._tasks: dict[str, dict[str, Any]] = {}
        if isinstance(raw_tasks, list):
            for item in raw_tasks:
                if isinstance(item, dict) and item.get("id"):
                    self._tasks[item["id"]] = item
        self._reconcile_loaded_tasks()

    def list_tasks(self) -> list[dict[str, Any]]:
        with self._lock:
            tasks = [self._serialize_task(task) for task in self._tasks.values()]
        return sorted(tasks, key=lambda item: item.get("created_at", ""), reverse=True)

    def get_task(self, task_id: str) -> dict[str, Any] | None:
        with self._lock:
            task = self._tasks.get(task_id)
            return self._serialize_task(task) if task else None

    def start_task(self, options: dict[str, Any] | None = None, source: str = "manual") -> dict[str, Any]:
        normalized_options = normalize_task_options(options)
        with self._lock:
            running_task = next((task for task in self._tasks.values() if task.get("status") in {"pending", "running"}), None)
            if running_task:
                raise RuntimeError(f"已有任务正在运行: {running_task['id']}")

            task_id = uuid.uuid4().hex[:12]
            log_file = LOG_DIR / f"task_{task_id}.log"
            task = {
                "id": task_id,
                "status": "pending",
                "source": source,
                "options": normalized_options,
                "created_at": utc_now_iso(),
                "started_at": None,
                "finished_at": None,
                "exit_code": None,
                "message": "任务已创建，等待执行。",
                "log_file": str(log_file.relative_to(RUNTIME_ROOT.parent)),
                "artifacts": [],
                "pid": None,
            }
            self._tasks[task_id] = task
            self._persist_locked()

        worker = threading.Thread(target=self._run_task, args=(task_id,), daemon=True)
        worker.start()
        return self.get_task(task_id) or task

    def read_task_log(self, task_id: str, tail: int = 200) -> str:
        task = self.get_task(task_id)
        if not task:
            raise FileNotFoundError(task_id)

        log_path = RUNTIME_ROOT.parent / task["log_file"]
        if not log_path.exists():
            return ""

        with log_path.open("r", encoding="utf-8", errors="ignore") as handle:
            lines = handle.readlines()
        return "".join(lines[-max(tail, 1):])

    def _run_task(self, task_id: str) -> None:
        with self._lock:
            task = self._tasks[task_id]
            task["status"] = "running"
            task["started_at"] = utc_now_iso()
            task["message"] = "任务执行中。"
            self._persist_locked()

        command = [sys.executable, str(TV_SCRIPT)]
        options = task["options"]
        if options["skip_epg"]:
            command.append("--skip-epg")
        if options["skip_check"]:
            command.append("--skip-check")
        if options["skip_probe"]:
            command.append("--skip-probe")

        env = os.environ.copy()
        env["CMCC_IPTV_RUNTIME_DIR"] = str(RUNTIME_ROOT)
        env["PYTHONUNBUFFERED"] = "1"
        if public_base_url := load_public_base_url():
            env["CMCC_IPTV_PUBLIC_BASE_URL"] = public_base_url

        log_path = LOG_DIR / f"task_{task_id}.log"
        log_path.parent.mkdir(parents=True, exist_ok=True)

        try:
            with log_path.open("w", encoding="utf-8") as log_handle:
                log_handle.write(f"$ {' '.join(command)}\n\n")
                log_handle.flush()

                process = subprocess.Popen(
                    command,
                    cwd=str(REFERENCE_DIR),
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                    env=env,
                    text=True,
                    bufsize=1,
                )

                with self._lock:
                    task = self._tasks[task_id]
                    task["pid"] = process.pid
                    self._processes[task_id] = process
                    self._persist_locked()

                assert process.stdout is not None
                for line in process.stdout:
                    log_handle.write(line)
                    log_handle.flush()

                exit_code = process.wait()

            with self._lock:
                task = self._tasks[task_id]
                task["status"] = "success" if exit_code == 0 else "failed"
                task["finished_at"] = utc_now_iso()
                task["exit_code"] = exit_code
                task["message"] = "任务执行完成。" if exit_code == 0 else f"任务执行失败，退出码 {exit_code}。"
                task["artifacts"] = [artifact["name"] for artifact in list_artifacts()]
                task["pid"] = None
                self._processes.pop(task_id, None)
                self._persist_locked()
        except Exception as exc:
            with log_path.open("a", encoding="utf-8") as log_handle:
                log_handle.write(f"\n[task-manager] {exc}\n")

            with self._lock:
                task = self._tasks[task_id]
                task["status"] = "failed"
                task["finished_at"] = utc_now_iso()
                task["exit_code"] = -1
                task["message"] = f"任务管理器异常: {exc}"
                task["pid"] = None
                self._processes.pop(task_id, None)
                self._persist_locked()

    def _serialize_task(self, task: dict[str, Any] | None) -> dict[str, Any] | None:
        if task is None:
            return None
        result = dict(task)
        result["running"] = result.get("status") in {"pending", "running"}
        return result

    def _reconcile_loaded_tasks(self) -> None:
        changed = False
        for task in self._tasks.values():
            if task.get("status") not in {"pending", "running"}:
                continue

            pid = task.get("pid")
            if pid and self._is_pid_alive(int(pid)):
                continue

            task["status"] = "failed"
            task["finished_at"] = task.get("finished_at") or utc_now_iso()
            task["exit_code"] = -2
            task["pid"] = None
            task["message"] = "服务重启后发现未完成旧任务，已标记为中断。"
            changed = True

        if changed:
            self._persist_locked()

    @staticmethod
    def _is_pid_alive(pid: int) -> bool:
        try:
            os.kill(pid, 0)
        except ProcessLookupError:
            return False
        except PermissionError:
            return True
        except OSError:
            return False
        return True

    def _persist_locked(self) -> None:
        tasks = sorted(self._tasks.values(), key=lambda item: item.get("created_at", ""), reverse=True)
        save_json_file(TASKS_FILE, tasks)
