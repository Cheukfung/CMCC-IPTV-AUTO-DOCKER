from __future__ import annotations

import json
from pathlib import Path
from typing import Any

PROJECT_ROOT = Path(__file__).resolve().parents[3]
BACKEND_ROOT = PROJECT_ROOT / "backend"
APP_ROOT = BACKEND_ROOT / "app"
RUNTIME_ROOT = PROJECT_ROOT / "runtime"
CONFIG_DIR = RUNTIME_ROOT / "config"
OUTPUT_DIR = RUNTIME_ROOT / "output"
LOG_DIR = RUNTIME_ROOT / "log"
CACHE_DIR = RUNTIME_ROOT / "cache"
DATA_DIR = RUNTIME_ROOT / "data"
REFERENCE_DIR = APP_ROOT / "core" / "reference"
TV_SCRIPT = REFERENCE_DIR / "tv.py"
BUILTIN_DEFAULT_CONFIG_FILE = REFERENCE_DIR / "default_config.json"
TASKS_FILE = DATA_DIR / "tasks.json"
PUBLIC_BASE_URL_FILE = DATA_DIR / "public_base_url.json"
DEFAULT_CONFIG_FILE = CONFIG_DIR / "config.json"
USER_CONFIG_FILE = CONFIG_DIR / "myconfig.json"
CHANNEL_ORDER_FILE = CONFIG_DIR / "channel_order.json"
CUSTOM_CHANNELS_FILE = CONFIG_DIR / "custom_channels.json"
SCHEDULE_FILE = CONFIG_DIR / "schedule.json"
ARTIFACT_DIR = OUTPUT_DIR
TEXT_PREVIEW_SUFFIXES = {".m3u", ".xml", ".json", ".log", ".txt", ".md"}


def ensure_runtime_dirs() -> None:
    for path in (CONFIG_DIR, OUTPUT_DIR, LOG_DIR, CACHE_DIR, DATA_DIR):
        path.mkdir(parents=True, exist_ok=True)


def load_json_file(path: Path, default: Any) -> Any:
    if not path.exists():
        return default
    try:
        with path.open("r", encoding="utf-8") as handle:
            return json.load(handle)
    except Exception:
        return default


def save_json_file(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        json.dump(data, handle, ensure_ascii=False, indent=2)


def normalize_public_base_url(url: str | None) -> str | None:
    if not url:
        return None

    normalized = str(url).strip()
    if not normalized:
        return None

    return normalized.rstrip("/")


def load_public_base_url() -> str | None:
    payload = load_json_file(PUBLIC_BASE_URL_FILE, {})
    if isinstance(payload, dict):
        return normalize_public_base_url(payload.get("url"))
    if isinstance(payload, str):
        return normalize_public_base_url(payload)
    return None


def save_public_base_url(url: str | None) -> str | None:
    normalized = normalize_public_base_url(url)
    if not normalized:
        return None

    if load_public_base_url() == normalized:
        return normalized

    save_json_file(PUBLIC_BASE_URL_FILE, {"url": normalized})
    return normalized


def utc_now_iso() -> str:
    from datetime import datetime, timezone

    return datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds")
