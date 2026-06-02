export function getHashView(NAV_TAB_IDS) {
  const hash = window.location.hash.replace(/^#/, "");
  return NAV_TAB_IDS.includes(hash) ? hash : "dashboard";
}

export function cloneValue(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

export function isPlainObject(value) {
  return Object.prototype.toString.call(value) === "[object Object]";
}

export function stableSerialize(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerialize(item)).join(",")}]`;
  }
  if (isPlainObject(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function expandEpgDayOffsets(values) {
  if (!Array.isArray(values)) return [];
  const normalized = values
    .map((item) => Number.parseInt(item, 10))
    .filter((item) => Number.isFinite(item));
  if (normalized.length === 1 && normalized[0] > 0) {
    return normalized[0] >= 2 ? Array.from({ length: normalized[0] }, (_, index) => index - (normalized[0] - 2)) : [];
  }
  return [...new Set(normalized)].sort((left, right) => left - right);
}

export function normalizeFieldUiValue(field, value) {
  const fallback = cloneValue(field.defaultValue);
  const source = value === undefined ? fallback : value;
  if (field.type === "boolean") return Boolean(source);
  if (field.type === "number") {
    const parsed = Number.parseInt(source, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (field.type === "float") {
    const parsed = Number.parseFloat(source);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (field.type === "text" || field.type === "select") return String(source ?? "");
  if (field.type === "array") {
    const values = Array.isArray(source) ? source : [];
    return values.map((item) => {
      if (field.itemType === "number") {
        const parsed = Number.parseInt(item, 10);
        return Number.isFinite(parsed) ? parsed : 0;
      }
      return String(item ?? "");
    });
  }
  if (field.type === "mapping") {
    const entries = isPlainObject(source) ? Object.entries(source) : [];
    return entries.map(([sourceText, targetText]) => ({
      source: String(sourceText ?? ""),
      target: String(targetText ?? ""),
    }));
  }
  return cloneValue(source);
}

export function normalizeFieldPayloadValue(field, value) {
  if (field.type === "boolean") return Boolean(value);
  if (field.type === "number") {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (field.type === "float") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (field.type === "text" || field.type === "select") return String(value ?? "").trim();
  if (field.type === "array") {
    const source = Array.isArray(value) ? value : [];
    return source
      .map((item) => {
        if (field.itemType === "number") {
          const parsed = Number.parseInt(item, 10);
          return Number.isFinite(parsed) ? parsed : null;
        }
        const text = String(item ?? "").trim();
        return text || null;
      })
      .filter((item) => item !== null);
  }
  if (field.type === "mapping") {
    const rows = Array.isArray(value) ? value : [];
    return Object.fromEntries(
      rows
        .map((row) => [String(row.source ?? "").trim(), String(row.target ?? "").trim()])
        .filter(([sourceText, targetText]) => sourceText && targetText)
    );
  }
  return value;
}

export function formatFieldPreview(field, value) {
  const normalized = normalizeFieldPayloadValue(field, value);
  if (field.type === "boolean") return normalized ? "开启" : "关闭";
  if (field.key === "EPG_DAY_OFFSETS") {
    const expanded = expandEpgDayOffsets(normalized);
    if (!normalized.length) return "空列表";
    if (expanded.length && stableSerialize(expanded) !== stableSerialize(normalized)) {
      return `${normalized.join(" / ")}，运行时展开为 ${expanded.join(" / ")}`;
    }
  }
  if (field.type === "array") return normalized.length ? normalized.join(" / ") : "空列表";
  if (field.type === "mapping") {
    const entries = Object.entries(normalized);
    return entries.length ? entries.map(([left, right]) => `${left} -> ${right}`).join("；") : "无映射";
  }
  const text = String(normalized ?? "");
  return text || "未设置";
}