from __future__ import annotations

import gzip
from datetime import datetime
from pathlib import Path
from typing import Any
from urllib.parse import quote

from .runtime import ARTIFACT_DIR, TEXT_PREVIEW_SUFFIXES

PUBLISHED_ARTIFACT_NAMES = ("tv.m3u", "tv2.m3u", "ku9.m3u", "aptv.m3u", "t.xml", "t.xml.gz")


def resolve_artifact(name: str) -> Path:
    target = (ARTIFACT_DIR / name).resolve()
    if target.parent != ARTIFACT_DIR.resolve() or not target.exists() or not target.is_file():
        raise FileNotFoundError(name)
    return target


def artifact_download_path(name: str) -> str:
    return f"/api/artifacts/{quote(name, safe='')}/download"


def artifact_download_url(name: str, public_base_url: str | None = None) -> str:
    path = artifact_download_path(name)
    if not public_base_url:
        return path
    return f"{public_base_url}{path}"


def build_artifact_url_map(public_base_url: str | None = None) -> dict[str, str]:
    return {name: artifact_download_url(name, public_base_url) for name in PUBLISHED_ARTIFACT_NAMES}


def list_artifacts(public_base_url: str | None = None) -> list[dict[str, Any]]:
    artifacts: list[dict[str, Any]] = []
    if not ARTIFACT_DIR.exists():
        return artifacts

    for path in sorted(ARTIFACT_DIR.iterdir(), key=lambda item: item.stat().st_mtime, reverse=True):
        if not path.is_file() or path.name.startswith('.'):
            continue
        stat = path.stat()
        artifacts.append(
            {
                "name": path.name,
                "size": stat.st_size,
                "updated_at": datetime.fromtimestamp(stat.st_mtime).astimezone().isoformat(timespec="seconds"),
                "previewable": is_previewable(path),
                "download_url": artifact_download_url(path.name, public_base_url),
                "download_path": artifact_download_path(path.name),
            }
        )
    return artifacts


def is_previewable(path: Path) -> bool:
    return path.suffix in TEXT_PREVIEW_SUFFIXES or path.name.endswith(".gz")


def read_artifact_preview(name: str, lines: int = 200) -> dict[str, Any]:
    path = resolve_artifact(name)
    if not is_previewable(path):
        raise ValueError("该文件类型不支持预览。")

    open_func = gzip.open if path.name.endswith(".gz") else open
    preview_lines: list[str] = []
    with open_func(path, "rt", encoding="utf-8", errors="ignore") as handle:
        for _, line in zip(range(max(lines, 1)), handle):
            preview_lines.append(line.rstrip("\n"))

    return {
        "name": path.name,
        "content": "\n".join(preview_lines),
        "truncated": len(preview_lines) >= max(lines, 1),
    }
