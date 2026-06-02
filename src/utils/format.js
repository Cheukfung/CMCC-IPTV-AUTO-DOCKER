export function formatSize(size) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(2)} MB`;
}

export function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}:${String(date.getSeconds()).padStart(2, "0")}`;
}

export function statusColor(status) {
  if (status === "success") return "success";
  if (status === "failed") return "danger";
  if (status === "running" || status === "pending") return "warning";
  return "default";
}

export function statusText(status) {
  const textMap = {
    success: "成功",
    failed: "失败",
    running: "执行中",
    pending: "等待执行",
  };
  return textMap[status] || status || "-";
}

export function sourceText(source) {
  const textMap = {
    manual: "手动触发",
    schedule: "定时",
    "schedule-manual": "定时触发",
  };
  return textMap[source] || source || "-";
}