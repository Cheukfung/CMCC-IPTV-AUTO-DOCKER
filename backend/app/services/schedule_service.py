from __future__ import annotations

import logging
from typing import Any

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from .runtime import SCHEDULE_FILE, load_json_file, save_json_file
from .task_manager import TaskManager, normalize_task_options

logger = logging.getLogger(__name__)

DEFAULT_SCHEDULE = {
    "enabled": False,
    "cron": "0 5 * * *",
    "options": {
        "skip_epg": False,
        "skip_check": False,
        "skip_probe": False,
    },
}


class ScheduleService:
    JOB_ID = "cmcc-iptv-auto-job"

    def __init__(self, task_manager: TaskManager) -> None:
        self.task_manager = task_manager
        self.scheduler = AsyncIOScheduler(timezone="Asia/Shanghai")

    def start(self) -> None:
        if not self.scheduler.running:
            self.scheduler.start()
        self.sync_job(self.load_schedule())

    def shutdown(self) -> None:
        if self.scheduler.running:
            self.scheduler.shutdown(wait=False)

    def load_schedule(self) -> dict[str, Any]:
        payload = load_json_file(SCHEDULE_FILE, DEFAULT_SCHEDULE)
        if not isinstance(payload, dict):
            payload = DEFAULT_SCHEDULE.copy()
        return {
            "enabled": bool(payload.get("enabled", False)),
            "cron": str(payload.get("cron", DEFAULT_SCHEDULE["cron"])),
            "options": normalize_task_options(payload.get("options", {})),
        }

    def save_schedule(self, payload: dict[str, Any]) -> dict[str, Any]:
        normalized = {
            "enabled": bool(payload.get("enabled", False)),
            "cron": str(payload.get("cron", DEFAULT_SCHEDULE["cron"])).strip(),
            "options": normalize_task_options(payload.get("options", {})),
        }
        CronTrigger.from_crontab(normalized["cron"], timezone="Asia/Shanghai")
        save_json_file(SCHEDULE_FILE, normalized)
        self.sync_job(normalized)
        return normalized

    def sync_job(self, config: dict[str, Any]) -> None:
        try:
            self.scheduler.remove_job(self.JOB_ID)
        except Exception:
            pass

        if not config.get("enabled"):
            return

        trigger = CronTrigger.from_crontab(config["cron"], timezone="Asia/Shanghai")
        self.scheduler.add_job(self._run_scheduled_task, trigger=trigger, id=self.JOB_ID, replace_existing=True)

    def trigger_now(self, options: dict[str, Any] | None = None) -> dict[str, Any]:
        return self.task_manager.start_task(options or self.load_schedule()["options"], source="schedule-manual")

    def _run_scheduled_task(self) -> None:
        config = self.load_schedule()
        try:
            self.task_manager.start_task(config["options"], source="schedule")
        except Exception as exc:
            logger.warning("scheduled task skipped: %s", exc)
