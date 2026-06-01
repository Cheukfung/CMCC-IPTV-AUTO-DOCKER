from __future__ import annotations

from copy import deepcopy
from typing import Any

from .artifact_service import build_artifact_url_map
from .runtime import DEFAULT_CONFIG_FILE, USER_CONFIG_FILE, load_json_file, load_public_base_url, save_json_file

URL_KEYS = {
    "REPLACEMENT_IP",
    "REPLACEMENT_IP_TV",
    "M3U_EPG_URL",
    "JSON_URL",
    "CATCHUP_SOURCE_PREFIX",
    "NGINX_PROXY_PREFIX",
    "EXTERNAL_M3U_URL",
}
LIST_KEYS = {"EPG_BASE_URLS", "CHECK_TARGET_GROUPS"}
TEXT_KEYS = {"CACHE_M3U_FILENAME"}
BOOL_KEYS = {
    "IS_HWURL",
    "ENABLE_EPG_DOWNLOAD",
    "ENABLE_NGINX_PROXY_FOR_TV",
    "ENABLE_EXTERNAL_M3U_MERGE",
    "ENABLE_STREAM_CHECK",
    "ENABLE_PROBE",
    "XML_SKIP_CHANNELS_WITHOUT_EPG",
    "EPG_RANDOM_DELAY",
}
FLOAT_KEYS = {"EPG_REQUEST_DELAY"}
INT_KEYS = {
    "EPG_DOWNLOAD_RETRY_COUNT",
    "EPG_DOWNLOAD_RETRY_DELAY",
    "EPG_DOWNLOAD_TIMEOUT",
    "MAX_CONCURRENT_DOWNLOADS",
    "CHECK_TIMEOUT",
    "CHECK_WORKERS",
    "CHECK_CACHE_EXPIRE",
}
VALID_EPG_MODES = {"M3U_ONLY", "ALL"}
DEFAULT_EPG_ARTIFACT_NAME = "t.xml.gz"
DEPRECATED_CONFIG_KEYS = {
    "DEFAULT_EPG_DAY_OFFSETS": "EPG_DAY_OFFSETS",
}


def validate_epg_day_offsets(value: Any, errors: list[str]) -> None:
    if value is None:
        return
    if not isinstance(value, list):
        errors.append("EPG_DAY_OFFSETS 必须是数组。")
        return
    if not value:
        errors.append("EPG_DAY_OFFSETS 不能为空。")
        return

    normalized: list[int] = []
    for item in value:
        if isinstance(item, bool) or not isinstance(item, int):
            errors.append("EPG_DAY_OFFSETS 中的每一项都必须是整数。")
            return
        normalized.append(item)

    if len(normalized) == 1 and normalized[0] > 0 and normalized[0] < 2:
        errors.append("EPG_DAY_OFFSETS 使用单个正数时必须大于等于 2。")


def load_default_config() -> dict[str, Any]:
    return load_json_file(DEFAULT_CONFIG_FILE, {})


def load_user_config() -> dict[str, Any]:
    return load_json_file(USER_CONFIG_FILE, {})


def merge_configs() -> dict[str, Any]:
    merged = deepcopy(load_default_config())
    merged.update(load_user_config())
    return merged


def _resolve_public_context(public_base_url: str | None = None) -> tuple[str | None, dict[str, str]]:
    resolved_base_url = public_base_url or load_public_base_url()
    artifact_urls = build_artifact_url_map(resolved_base_url) if resolved_base_url else {}
    return resolved_base_url, artifact_urls


def validate_config_payload(payload: Any) -> dict[str, Any]:
    errors: list[str] = []
    warnings: list[str] = []

    if not isinstance(payload, dict):
        return {"valid": False, "errors": ["配置必须是 JSON 对象。"], "warnings": []}

    for key, canonical_key in DEPRECATED_CONFIG_KEYS.items():
        if key in payload:
            errors.append(f"{key} 不是有效配置项，请使用 {canonical_key}。")

    for key in URL_KEYS:
        value = payload.get(key)
        if value is None or value == "":
            continue
        if not isinstance(value, str):
            errors.append(f"{key} 必须是字符串。")
        elif "://" not in value:
            warnings.append(f"{key} 看起来不是完整 URL，建议包含协议头。")

    for key in LIST_KEYS:
        value = payload.get(key)
        if value is None:
            continue
        if not isinstance(value, list):
            errors.append(f"{key} 必须是数组。")

    validate_epg_day_offsets(payload.get("EPG_DAY_OFFSETS"), errors)

    for key in TEXT_KEYS:
        value = payload.get(key)
        if value is None:
            continue
        if not isinstance(value, str):
            errors.append(f"{key} 必须是字符串。")

    for key in BOOL_KEYS:
        value = payload.get(key)
        if value is None:
            continue
        if not isinstance(value, bool):
            errors.append(f"{key} 必须是布尔值。")

    for key in FLOAT_KEYS:
        value = payload.get(key)
        if value is None:
            continue
        if not isinstance(value, (int, float)) or isinstance(value, bool):
            errors.append(f"{key} 必须是数字。")
        elif value < 0:
            errors.append(f"{key} 不能小于 0。")

    for key in INT_KEYS:
        value = payload.get(key)
        if value is None:
            continue
        if not isinstance(value, int) or isinstance(value, bool):
            errors.append(f"{key} 必须是整数。")
        elif value < 0:
            errors.append(f"{key} 不能小于 0。")

    epg_mode = payload.get("EPG_DOWNLOAD_MODE")
    if epg_mode is not None and epg_mode not in VALID_EPG_MODES:
        errors.append("EPG_DOWNLOAD_MODE 仅支持 M3U_ONLY 或 ALL。")

    external_group_titles = payload.get("EXTERNAL_GROUP_TITLES")
    if external_group_titles is not None:
        if not isinstance(external_group_titles, (list, dict)):
            errors.append("EXTERNAL_GROUP_TITLES 必须是数组或对象。")
        elif isinstance(external_group_titles, list):
            if not all(isinstance(item, str) and item.strip() for item in external_group_titles):
                errors.append("EXTERNAL_GROUP_TITLES 数组中的值必须是非空字符串。")
        else:
            if not all(isinstance(key, str) and isinstance(value, str) for key, value in external_group_titles.items()):
                errors.append("EXTERNAL_GROUP_TITLES 对象的键和值都必须是字符串。")

    epg_base_urls = payload.get("EPG_BASE_URLS")
    if isinstance(epg_base_urls, list) and not epg_base_urls:
        warnings.append("EPG_BASE_URLS 为空时将无法下载 EPG。")

    json_url = payload.get("JSON_URL")
    if isinstance(json_url, str) and "183.235." not in json_url:
        warnings.append("JSON_URL 看起来不是默认广东移动 IPTV 地址，请确认网络环境和抓取目标。")

    return {"valid": not errors, "errors": errors, "warnings": warnings}


def get_config_bundle(public_base_url: str | None = None) -> dict[str, Any]:
    default_config = deepcopy(load_default_config())
    user_config = load_user_config()
    resolved_base_url, artifact_urls = _resolve_public_context(public_base_url)

    if not default_config.get("M3U_EPG_URL") and artifact_urls.get(DEFAULT_EPG_ARTIFACT_NAME):
        default_config["M3U_EPG_URL"] = artifact_urls[DEFAULT_EPG_ARTIFACT_NAME]

    merged = deepcopy(default_config)
    merged.update(user_config)

    return {
        "default": default_config,
        "overrides": user_config,
        "merged": merged,
        "validation": validate_config_payload(user_config),
        "public_base_url": resolved_base_url,
        "artifact_urls": artifact_urls,
        "default_epg_url": artifact_urls.get(DEFAULT_EPG_ARTIFACT_NAME),
    }


def save_user_config(payload: dict[str, Any], public_base_url: str | None = None) -> dict[str, Any]:
    validation = validate_config_payload(payload)
    if not validation["valid"]:
        raise ValueError("; ".join(validation["errors"]))
    save_json_file(USER_CONFIG_FILE, payload)
    return get_config_bundle(public_base_url)
