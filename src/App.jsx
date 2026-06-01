import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  AlertContent,
  AlertDescription,
  AlertIndicator,
  AlertTitle,
  Button,
  Card,
  Chip,
  Input,
  Link,
  Label,
  ListBox,
  NumberField,
  Select,
  ScrollShadow,
  Switch,
  Table,
  Tabs,
  Toast,
  toast,
  Tooltip,
  Accordion,
  Separator,
} from "@heroui/react";
import {
  Activity,
  AlarmClock,
  CheckCircle2,
  Copy,
  Download,
  FileText,
  FolderOpen,
  Gauge,
  ListRestart,
  LoaderCircle,
  Play,
  RefreshCw,
  RotateCcw,
  Save,
  Settings,
  ShieldCheck,
  Sparkles,
  Terminal,
  Tv,
  Wifi,
  Zap,
} from "lucide-react";

const CONFIG_SECTIONS = [
  {
    id: "network",
    title: "网络与播放",
    description: "频道源、组播转单播、回看代理与 M3U 公开地址。",
    fields: [
      { key: "REPLACEMENT_IP", label: "默认单播替换地址", type: "text", description: "必须设置，用于 tv2.m3u、ku9.m3u、aptv.m3u 的组播转单播前缀。", placeholder: "http://host:port/udp", defaultValue: "http://192.168.0.1:7088/udp", required: true },
      { key: "IS_HWURL", label: "优先使用 HWURL", type: "boolean", description: "开启后优先用华为 hwurl；关闭后优先用中兴 zteurl。", defaultValue: true },
      { key: "JSON_URL", label: "频道 JSON 地址", type: "text", description: "主频道列表抓取入口。", placeholder: "http://183.235.xx.xx:8082/epg/api/custom/getAllChannel.json", defaultValue: "http://183.235.16.92:8082/epg/api/custom/getAllChannel.json" },
      { key: "REPLACEMENT_IP_TV", label: "tv.m3u 专用单播地址", type: "text", description: "仅影响 tv.m3u，未设置时保留原始地址。", placeholder: "留空则沿用原始地址", defaultValue: "" },
      { key: "CATCHUP_SOURCE_PREFIX", label: "回看源前缀", type: "text", description: "支持回看频道的基础前缀。", placeholder: "http://183.235.xx.xx:6610/190000002005", defaultValue: "http://183.235.162.80:6610/190000002005" },
      { key: "NGINX_PROXY_PREFIX", label: "Nginx 代理前缀", type: "text", description: "用于外网访问回看和 Logo 代理，留空则关闭。", placeholder: "http://your-domain:7077", defaultValue: "" },
      { key: "ENABLE_NGINX_PROXY_FOR_TV", label: "tv.m3u 也走代理", type: "boolean", description: "开启后 tv.m3u 同样使用 Nginx 代理前缀。", defaultValue: false },
      { key: "M3U_EPG_URL", label: "M3U EPG 地址", type: "text", description: "写入 M3U 顶部 x-tvg-url，默认跟随当前服务的 t.xml.gz 下载地址。", placeholder: "http://your-domain/api/artifacts/t.xml.gz/download", defaultValue: "" },
    ],
  },
  {
    id: "epg",
    title: "EPG 下载",
    description: "节目单下载、合成范围、请求重试与限流节奏。",
    fields: [
      { key: "ENABLE_EPG_DOWNLOAD", label: "启用 EPG 下载", type: "boolean", description: "关闭后只生成 M3U，不下载 t.xml / t.xml.gz。", defaultValue: true },
      { key: "EPG_DOWNLOAD_MODE", label: "EPG 下载模式", type: "select", description: "M3U_ONLY 仅处理最终 M3U 中的频道；ALL 处理全部可用频道。", defaultValue: "M3U_ONLY", options: [{ value: "M3U_ONLY", label: "M3U_ONLY" }, { value: "ALL", label: "ALL" }] },
      { key: "EPG_DAY_OFFSETS", label: "EPG 下载日期", type: "array", itemType: "number", addLabel: "新增日期项", description: "默认 [8]；单个正数表示最近 N 天，也可填写具体日期偏移。", defaultValue: [8], compactArray: true },
      { key: "EPG_BASE_URLS", label: "EPG 下载源", type: "array", itemType: "text", addLabel: "新增 EPG 地址", description: "多个下载源会轮询分担任务。", defaultValue: ["http://183.235.16.92:8082/epg/api/channel/", "http://183.235.11.39:8082/epg/api/channel/"], fullWidth: true },
      { key: "XML_SKIP_CHANNELS_WITHOUT_EPG", label: "跳过无节目数据频道", type: "boolean", description: "开启后，XML 中不写入没有节目单数据的频道。", defaultValue: true },
      { key: "EPG_DOWNLOAD_RETRY_COUNT", label: "重试次数", type: "number", description: "单个 EPG 请求失败后的最大重试次数。", defaultValue: 3 },
      { key: "EPG_DOWNLOAD_RETRY_DELAY", label: "重试间隔（秒）", type: "number", description: "重试前的等待时间。", defaultValue: 2 },
      { key: "EPG_DOWNLOAD_TIMEOUT", label: "请求超时（秒）", type: "number", description: "单个 EPG 请求超时时间。", defaultValue: 15 },
      { key: "EPG_REQUEST_DELAY", label: "基础延迟（秒）", type: "float", description: "每次 EPG 请求后的固定或随机延迟基准。", defaultValue: 0.3 },
      { key: "EPG_RANDOM_DELAY", label: "启用随机延迟", type: "boolean", description: "开启后会在基础延迟上下浮动，降低被限流概率。", defaultValue: true },
      { key: "MAX_CONCURRENT_DOWNLOADS", label: "最大并发下载数", type: "number", description: "EPG 线程池并发上限。", defaultValue: 4 },
    ],
  },
  {
    id: "checker",
    title: "流检测与探测",
    description: "频道测活、分组筛选、ffprobe 深度探测与缓存时效。",
    fields: [
      { key: "ENABLE_STREAM_CHECK", label: "启用底层流检测", type: "boolean", description: "开启后在生成 M3U 前清理失效源。", defaultValue: true },
      { key: "CHECK_TARGET_GROUPS", label: "检测目标分组", type: "array", itemType: "text", addLabel: "新增检测分组", description: "留空代表所有分组都参与检测。", defaultValue: ["港澳台"], compactArray: true },
      { key: "CHECK_TIMEOUT", label: "检测超时（秒）", type: "number", description: "单个频道检测的超时值。", defaultValue: 5 },
      { key: "CHECK_WORKERS", label: "检测并发数", type: "number", description: "检测协程的最大并发量。", defaultValue: 4 },
      { key: "ENABLE_PROBE", label: "启用 ffprobe 深探", type: "boolean", description: "开启后会额外探测真实分辨率与编码。", defaultValue: true },
      { key: "CHECK_CACHE_EXPIRE", label: "探测缓存过期（小时）", type: "number", description: "ffprobe 结果缓存时长。", defaultValue: 24 },
    ],
  },
  {
    id: "external",
    title: "外部 M3U 合并",
    description: "外部频道源、缓存文件与分组映射关系。",
    fields: [
      { key: "ENABLE_EXTERNAL_M3U_MERGE", label: "启用外部 M3U 合并", type: "boolean", description: "关闭后不会下载和合并额外频道源。", defaultValue: true },
      { key: "EXTERNAL_M3U_URL", label: "外部 M3U 地址", type: "text", description: "外部频道列表下载地址。", placeholder: "https://example.com/list.m3u", defaultValue: "https://raw.githubusercontent.com/Jsnzkpg/Jsnzkpg/Jsnzkpg/Jsnzkpg1.m3u" },
      { key: "EXTERNAL_GROUP_TITLES", label: "外部分组映射", type: "mapping", description: "左侧写匹配关键词，右侧写最终分组名称。", defaultValue: { 港澳台: "港澳台" }, fullWidth: true, leftLabel: "匹配关键词", rightLabel: "目标分组", addLabel: "新增映射" },
      { key: "CACHE_M3U_FILENAME", label: "外部 M3U 缓存文件名", type: "text", description: "网络失败时缓存到 runtime/cache 的文件名。", defaultValue: "cache.m3u" },
    ],
  },
];

const CONFIG_FIELDS = CONFIG_SECTIONS.flatMap((section) => section.fields);
const KNOWN_CONFIG_KEYS = new Set(CONFIG_FIELDS.map((field) => field.key));
const NAV_TAB_IDS = ["dashboard", "run", "config", "logs", "artifacts", "schedule"];

function getHashView() {
  const hash = window.location.hash.replace(/^#/, "");
  return NAV_TAB_IDS.includes(hash) ? hash : "dashboard";
}

function cloneValue(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function isPlainObject(value) {
  return Object.prototype.toString.call(value) === "[object Object]";
}

function stableSerialize(value) {
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

function formatSize(size) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(2)} MB`;
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}:${String(date.getSeconds()).padStart(2, "0")}`;
}

function statusColor(status) {
  if (status === "success") return "success";
  if (status === "failed") return "danger";
  if (status === "running" || status === "pending") return "warning";
  return "default";
}

function statusText(status) {
  const textMap = {
    success: "成功",
    failed: "失败",
    running: "运行中",
    pending: "等待中",
  };
  return textMap[status] || status || "-";
}

function sourceText(source) {
  const textMap = {
    manual: "手动",
    schedule: "定时",
  };
  return textMap[source] || source || "-";
}

function expandEpgDayOffsets(values) {
  if (!Array.isArray(values)) return [];
  const normalized = values
    .map((item) => Number.parseInt(item, 10))
    .filter((item) => Number.isFinite(item));
  if (normalized.length === 1 && normalized[0] > 0) {
    return normalized[0] >= 2 ? Array.from({ length: normalized[0] }, (_, index) => index - (normalized[0] - 2)) : [];
  }
  return [...new Set(normalized)].sort((left, right) => left - right);
}

function normalizeFieldUiValue(field, value) {
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

function normalizeFieldPayloadValue(field, value) {
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

function formatFieldPreview(field, value) {
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
  return text || "空值";
}

function buildInitialConfigForm() {
  return Object.fromEntries(CONFIG_FIELDS.map((field) => [field.key, normalizeFieldUiValue(field, field.defaultValue)]));
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!response.ok) {
    let message = response.statusText;
    try {
      const data = await response.json();
      message = data.detail || JSON.stringify(data);
    } catch {
      message = await response.text();
    }
    throw new Error(message);
  }

  const contentType = response.headers.get("content-type") || "";
  return contentType.includes("application/json") ? response.json() : response.text();
}

function StatCard({ icon: Icon, label, value, detail }) {
  return (
    <Card className="stat-card">
      <Card.Content className="gap-3">
        <div className="stat-icon"><Icon size={18} /></div>
        <div>
          <p className="text-tiny uppercase text-default-500">{label}</p>
          <strong className="stat-value">{value}</strong>
          {detail ? <p className="text-small text-default-500">{detail}</p> : null}
        </div>
      </Card.Content>
    </Card>
  );
}

function EmptyState({ title, detail }) {
  return (
    <div className="empty-state">
      <Sparkles size={18} />
      <div>
        <strong>{title}</strong>
        {detail ? <p>{detail}</p> : null}
      </div>
    </div>
  );
}

function AppAlert({ status = "primary", title, description, icon, className = "", onClose }) {
  const normalizedStatus = status === "danger" ? "error" : status === "primary" ? "info" : status;
  return (
    <Alert status={normalizedStatus} className={className}>
      {icon ? <AlertIndicator>{icon}</AlertIndicator> : null}
      <AlertContent>
        <AlertTitle>{title}</AlertTitle>
        {description ? <AlertDescription>{description}</AlertDescription> : null}
      </AlertContent>
      {onClose ? <Button isIconOnly size="sm" variant="light" aria-label="关闭提示" onPress={onClose}>×</Button> : null}
    </Alert>
  );
}

export default function App() {
  const [activeView, setActiveView] = useState(getHashView);
  const [health, setHealth] = useState({ status: "检查中", running_task: null, task_count: 0, artifact_count: 0 });
  const [tasks, setTasks] = useState([]);
  const [artifacts, setArtifacts] = useState([]);
  const [activeTaskId, setActiveTaskId] = useState("");
  const [autoRefreshLogs, setAutoRefreshLogs] = useState(true);
  const [logAutoScroll, setLogAutoScroll] = useState(true);
  const [logContent, setLogContent] = useState("暂无日志。");
  const [artifactPreview, setArtifactPreview] = useState("选择支持预览的文本文件后显示内容。");
  const [runForm, setRunForm] = useState({ skip_epg: false, skip_check: false, skip_probe: false });
  const [runStatus, setRunStatus] = useState("等待执行。");
  const [scheduleForm, setScheduleForm] = useState({ enabled: false, cron: "0 5 * * *", options: { skip_epg: false, skip_check: false, skip_probe: false } });
  const [scheduleStatus, setScheduleStatus] = useState("默认每天 05:00 执行。");
  const [configBundle, setConfigBundle] = useState({ default: {}, overrides: {}, merged: {}, validation: { valid: true, errors: [], warnings: [] } });
  const [configForm, setConfigForm] = useState(buildInitialConfigForm);
  const [unknownConfigOverrides, setUnknownConfigOverrides] = useState({});
  const consoleRef = useRef(null);

  const runningTask = health.running_task || null;
  const activeTask = tasks.find((task) => task.id === activeTaskId) || null;
  const validation = configBundle.validation || { valid: true, errors: [], warnings: [] };

  const publicDownloadEntries = useMemo(
    () =>
      Object.entries(configBundle.artifact_urls || {})
        .filter(([name]) => name.endsWith(".m3u") || name.endsWith(".xml") || name.endsWith(".xml.gz"))
        .map(([name, url]) => ({ name, url })),
    [configBundle.artifact_urls]
  );

  function notify(color, text) {
    if (color === "success") {
      toast.success(text);
      return;
    }
    if (color === "danger") {
      toast.danger(text);
      return;
    }
    if (color === "warning") {
      toast.warning(text);
      return;
    }
    toast.info(text);
  }

  function getDefaultFieldValue(field) {
    const source = Object.prototype.hasOwnProperty.call(configBundle.default || {}, field.key)
      ? configBundle.default[field.key]
      : field.defaultValue;
    return normalizeFieldPayloadValue(field, source);
  }

  function isFieldOverridden(field) {
    const currentValue = normalizeFieldPayloadValue(field, configForm[field.key]);
    return stableSerialize(currentValue) !== stableSerialize(getDefaultFieldValue(field));
  }

  function collectConfigPayload() {
    const payload = { ...unknownConfigOverrides };
    CONFIG_FIELDS.forEach((field) => {
      const currentValue = normalizeFieldPayloadValue(field, configForm[field.key]);
      const defaultValue = getDefaultFieldValue(field);
      if (stableSerialize(currentValue) !== stableSerialize(defaultValue)) {
        payload[field.key] = currentValue;
      }
    });
    return payload;
  }

  const visibleOverrideCount = Object.keys(collectConfigPayload()).filter((key) => KNOWN_CONFIG_KEYS.has(key)).length;
  const unknownOverrideCount = Object.keys(unknownConfigOverrides).length;

  function hydrateConfigBundle(bundle) {
    setConfigBundle(bundle);
    setUnknownConfigOverrides(Object.fromEntries(Object.entries(bundle.overrides || {}).filter(([key]) => !KNOWN_CONFIG_KEYS.has(key))));
    setConfigForm(
      Object.fromEntries(
        CONFIG_FIELDS.map((field) => {
          const sourceValue = Object.prototype.hasOwnProperty.call(bundle.merged || {}, field.key)
            ? bundle.merged[field.key]
            : Object.prototype.hasOwnProperty.call(bundle.default || {}, field.key)
              ? bundle.default[field.key]
              : field.defaultValue;
          return [field.key, normalizeFieldUiValue(field, sourceValue)];
        })
      )
    );
  }

  async function loadHealth() {
    setHealth(await api("/api/health"));
  }

  async function loadTasks() {
    const nextTasks = await api("/api/tasks");
    setTasks(nextTasks);
    setActiveTaskId((current) => {
      if (!nextTasks.length) return "";
      return current && nextTasks.some((task) => task.id === current) ? current : nextTasks[0].id;
    });
  }

  async function loadArtifacts() {
    setArtifacts(await api("/api/artifacts"));
  }

  async function loadConfig() {
    hydrateConfigBundle(await api("/api/config"));
  }

  async function loadSchedule() {
    setScheduleForm(await api("/api/schedules"));
  }

  async function loadTaskLog(taskId = activeTaskId) {
    if (!taskId) {
      setLogContent("暂无日志。");
      return;
    }
    try {
      const result = await api(`/api/tasks/${taskId}/logs?tail=400`);
      setLogContent(result.content || "日志为空。");
    } catch (error) {
      setLogContent(error.message);
    }
  }

  async function refreshLiveData() {
    await Promise.all([loadHealth(), loadTasks(), loadArtifacts()]);
  }

  async function runTask() {
    try {
      const task = await api("/api/tasks/run", {
        method: "POST",
        body: JSON.stringify(runForm),
      });
      setActiveTaskId(task.id);
      setActiveView("logs");
      setRunStatus(`任务已启动: ${task.id}`);
      notify("success", `任务已启动: ${task.id}`);
      await refreshLiveData();
      await loadTaskLog(task.id);
    } catch (error) {
      setRunStatus(error.message);
      notify("danger", error.message);
    }
  }

  async function triggerSchedule() {
    try {
      const task = await api("/api/schedules/trigger", { method: "POST" });
      setActiveTaskId(task.id);
      setActiveView("logs");
      setRunStatus(`已按定时配置触发任务: ${task.id}`);
      notify("success", `已按定时配置触发任务: ${task.id}`);
      await refreshLiveData();
      await loadTaskLog(task.id);
    } catch (error) {
      setRunStatus(error.message);
      notify("danger", error.message);
    }
  }

  async function validateConfig() {
    try {
      const nextValidation = await api("/api/config/validate", {
        method: "POST",
        body: JSON.stringify(collectConfigPayload()),
      });
      setConfigBundle((current) => ({ ...current, validation: nextValidation }));
      if (nextValidation.valid && !nextValidation.warnings.length) {
        notify("success", "配置校验通过。");
      }
    } catch (error) {
      setConfigBundle((current) => ({ ...current, validation: { valid: false, errors: [error.message], warnings: [] } }));
      notify("danger", error.message);
    }
  }

  async function saveConfig() {
    try {
      hydrateConfigBundle(await api("/api/config", {
        method: "PUT",
        body: JSON.stringify(collectConfigPayload()),
      }));
      notify("success", "配置已保存。");
    } catch (error) {
      setConfigBundle((current) => ({ ...current, validation: { valid: false, errors: [error.message], warnings: [] } }));
      notify("danger", error.message);
    }
  }

  async function resetVisibleConfig() {
    if (!window.confirm("这会清空当前页面可编辑项的覆盖配置，并恢复为默认值。是否继续？")) return;
    try {
      hydrateConfigBundle(await api("/api/config", {
        method: "PUT",
        body: JSON.stringify({ ...unknownConfigOverrides }),
      }));
      notify("success", "可视化配置已恢复默认值。");
    } catch (error) {
      notify("danger", error.message);
    }
  }

  async function saveSchedule() {
    try {
      const nextSchedule = await api("/api/schedules", {
        method: "PUT",
        body: JSON.stringify(scheduleForm),
      });
      setScheduleForm(nextSchedule);
      setScheduleStatus("定时配置已保存。");
      notify("success", "定时配置已保存。");
    } catch (error) {
      setScheduleStatus(error.message);
      notify("danger", error.message);
    }
  }

  function resolveArtifactDownloadUrl(artifact) {
    return artifact.download_url || configBundle.artifact_urls?.[artifact.name] || `/api/artifacts/${encodeURIComponent(artifact.name)}/download`;
  }

  async function previewArtifact(name) {
    try {
      const result = await api(`/api/artifacts/${encodeURIComponent(name)}/preview?lines=220`);
      setArtifactPreview(result.content || "文件为空。");
      setActiveView("artifacts");
    } catch (error) {
      setArtifactPreview(error.message);
      setActiveView("artifacts");
    }
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      notify("success", "地址已复制。");
    } catch (error) {
      notify("danger", error.message || "复制失败，请手动复制。");
    }
  }

  function updateConfigField(key, value) {
    setConfigForm((current) => ({ ...current, [key]: value }));
  }

  function updateArrayItem(key, index, value) {
    setConfigForm((current) => ({
      ...current,
      [key]: current[key].map((item, itemIndex) => (itemIndex === index ? value : item)),
    }));
  }

  function updateMappingItem(key, index, fieldName, value) {
    setConfigForm((current) => ({
      ...current,
      [key]: current[key].map((item, itemIndex) => (itemIndex === index ? { ...item, [fieldName]: value } : item)),
    }));
  }

  function addArrayItem(field) {
    setConfigForm((current) => ({ ...current, [field.key]: [...current[field.key], field.itemType === "number" ? 0 : ""] }));
  }

  function removeArrayItem(field, index) {
    setConfigForm((current) => ({ ...current, [field.key]: current[field.key].filter((_, itemIndex) => itemIndex !== index) }));
  }

  function addMappingItem(field) {
    setConfigForm((current) => ({ ...current, [field.key]: [...current[field.key], { source: "", target: "" }] }));
  }

  function removeMappingItem(field, index) {
    setConfigForm((current) => ({ ...current, [field.key]: current[field.key].filter((_, itemIndex) => itemIndex !== index) }));
  }

  useEffect(() => {
    let mounted = true;
    async function boot() {
      try {
        await loadConfig();
        await loadSchedule();
        await refreshLiveData();
      } catch (error) {
        if (mounted) {
          setRunStatus(error.message);
          notify("danger", error.message);
        }
      }
    }
    boot();
    const interval = window.setInterval(refreshLiveData, 5000);
    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (autoRefreshLogs && activeTaskId) {
      loadTaskLog(activeTaskId);
    }
  }, [activeTaskId, autoRefreshLogs]);

  useEffect(() => {
    if (logAutoScroll && consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [logContent, logAutoScroll]);

  useEffect(() => {
    const handleHashChange = () => setActiveView(getHashView());
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  useEffect(() => {
    if (window.location.hash !== `#${activeView}`) {
      window.history.replaceState(null, "", `#${activeView}`);
    }
  }, [activeView]);

  const latestArtifacts = artifacts.slice(0, 6);
  const navTabs = [
    { id: "dashboard", label: "概览", icon: Gauge },
    { id: "run", label: "运行", icon: Play },
    { id: "config", label: "配置", icon: Settings },
    { id: "logs", label: "日志", icon: Terminal },
    { id: "artifacts", label: "产物", icon: FolderOpen },
    { id: "schedule", label: "定时", icon: AlarmClock },
  ];

  return (
    <main>
      <Toast.Provider placement="top end" />
      <Tabs
        className="app-frame"
        selectedKey={activeView}
        onSelectionChange={(key) => setActiveView(String(key))}
        variant="primary"
      >
        <aside className="app-sidebar">
          <div className="sidebar-brand">
            <div className="brand-mark"><Tv size={18} /></div>
            <div>
              <strong>CMCC IPTV</strong>
              <span>Auto Docker</span>
            </div>
          </div>
          <Tabs.ListContainer>
            <Tabs.List aria-label="主导航" className="tab-list">
              {navTabs.map(({ id, label, icon: Icon }) => (
                <Tabs.Tab key={id} id={id} className="tab-item">
                  <Icon size={17} />
                  {label}
                </Tabs.Tab>
              ))}
            </Tabs.List>
          </Tabs.ListContainer>
          <div className="sidebar-footer">
            <span>系统状态</span>
            <Chip color={health.status === "ok" ? "success" : "warning"} variant="flat">{health.status === "ok" ? "正常" : health.status}</Chip>
          </div>
        </aside>
        <section className="app-main">

          {activeView === "dashboard" ? (
            <div className="metric-row">
              <StatCard icon={ShieldCheck} label="系统状态" value={health.status === "ok" ? "正常" : health.status} detail="FastAPI 服务在线" />
              <StatCard icon={runningTask ? LoaderCircle : Activity} label="当前任务" value={runningTask ? runningTask.status : "空闲"} detail={runningTask ? runningTask.id : "暂无运行中的任务"} />
              <StatCard icon={FolderOpen} label="产物数量" value={artifacts.length} detail={`${tasks.length} 条任务记录`} />
            </div>
          ) : null}

          {runningTask ? (
            <AppAlert
              className="running-alert"
              icon={<LoaderCircle className="spin" size={18} />}
              status="warning"
              title={`正在执行任务 ${runningTask.id}`}
              description={`当前状态: ${runningTask.status}`}
            />
          ) : null}

        {navTabs.map(({ id }) => (
          <Tabs.Panel key={id} id={id} className="tab-panel">
            {id === "dashboard" && (
              <div className="view-grid">
                <Card className="span-8">
                  <Card.Header className="card-heading">
                    <div>
                      <h2>最近任务</h2>
                      <p>点击任务行可直接查看日志。</p>
                    </div>
                    <Button variant="secondary" onPress={refreshLiveData}><RefreshCw size={16} />刷新</Button>
                  </Card.Header>
                  <Card.Content>
                    <TaskTable tasks={tasks} onOpen={(task) => { setActiveTaskId(task.id); setActiveView("logs"); loadTaskLog(task.id); }} />
                  </Card.Content>
                </Card>

                <Card className="span-4">
                  <Card.Header className="card-heading">
                    <div>
                      <h2>运行要求</h2>
                      <p>执行前需要确认的基础条件。</p>
                    </div>
                  </Card.Header>
                  <Card.Content>
                    <div className="requirement-list">
                      <Requirement icon={Wifi} text="容器或宿主机可访问广东移动 IPTV 目标网段。" />
                      <Requirement icon={Terminal} text="启用深度探测时，系统内需要 ffprobe。" />
                      <Requirement icon={FolderOpen} text="输出、日志、缓存落在 runtime 目录，可直接映射卷。" />
                    </div>
                  </Card.Content>
                </Card>

                <Card className="span-12">
                  <Card.Header className="card-heading">
                    <div>
                      <h2>最近产物</h2>
                      <p>预览文本产物，或进入产物页复制公开地址。</p>
                    </div>
                    <Button variant="secondary" onPress={loadArtifacts}><RefreshCw size={16} />刷新产物</Button>
                  </Card.Header>
                  <Card.Content>
                    {latestArtifacts.length ? (
                      <div className="artifact-grid">
                        {latestArtifacts.map((artifact) => (
                          <button key={artifact.name} className="artifact-tile" type="button" onClick={() => previewArtifact(artifact.name)}>
                            <FileText size={18} />
                            <strong>{artifact.name}</strong>
                            <span>{formatSize(artifact.size)} · {formatDateTime(artifact.updated_at)}</span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <EmptyState title="暂无输出文件" detail="任务完成后会在这里出现 M3U、XML 和压缩包。" />
                    )}
                  </Card.Content>
                </Card>
              </div>
            )}

            {id === "run" && (
              <Card>
                <Card.Header className="card-heading">
                  <div>
                    <h2>手动执行</h2>
                    <p>选择本次执行要跳过的步骤，然后启动任务。</p>
                  </div>
                </Card.Header>
                <Card.Content className="gap-5">
                  <div className="option-grid">
                    <OptionSwitch title="跳过 EPG" description="不下载节目单，运行更快" value={runForm.skip_epg} onChange={(value) => setRunForm((current) => ({ ...current, skip_epg: value }))} />
                    <OptionSwitch title="跳过检测" description="不检测频道流可用性" value={runForm.skip_check} onChange={(value) => setRunForm((current) => ({ ...current, skip_check: value }))} />
                    <OptionSwitch title="跳过深探" description="不执行 ffprobe 分辨率探测" value={runForm.skip_probe} onChange={(value) => setRunForm((current) => ({ ...current, skip_probe: value }))} />
                  </div>
                  <div className="action-row">
                    <Button color="primary" onPress={runTask}><Play size={16} />启动任务</Button>
                    <Button variant="secondary" onPress={triggerSchedule}><Zap size={16} />按定时配置立即执行</Button>
                  </div>
                  <p className="status-copy">{runStatus}</p>
                </Card.Content>
              </Card>
            )}

            {id === "config" && (
              <div className="config-page">
                <Card>
                  <Card.Header className="card-heading config-header">
                    <h2>可视化配置</h2>
                    <div className="header-actions">
                      {validation.valid && !validation.errors.length && !validation.warnings.length ? (
                        <Chip color="success" variant="flat" size="sm">配置校验通过</Chip>
                      ) : null}
                      <Button variant="secondary" size="sm" onPress={loadConfig}><RefreshCw size={14} />重新加载</Button>
                      <Button variant="secondary" size="sm" onPress={validateConfig}><CheckCircle2 size={14} />校验</Button>
                      <Button variant="secondary" size="sm" onPress={resetVisibleConfig}><RotateCcw size={14} />重置覆盖</Button>
                      <Button color="primary" size="sm" onPress={saveConfig}><Save size={14} />保存配置</Button>
                    </div>
                  </Card.Header>
                  <Card.Content className="gap-5">
                    <div className="summary-row">
                      <div className="summary-item">
                        <Settings size={15} />
                        <span>覆盖项</span>
                        <strong>{visibleOverrideCount}</strong>
                        <span className="summary-detail">将写入 myconfig.json</span>
                      </div>
                      <div className="summary-item">
                        <ListRestart size={15} />
                        <span>默认继承项</span>
                        <strong>{CONFIG_FIELDS.length - visibleOverrideCount}</strong>
                        <span className="summary-detail">仍沿用默认配置</span>
                      </div>
                      <div className="summary-item">
                        <Sparkles size={15} />
                        <span>未知自定义键</span>
                        <strong>{unknownOverrideCount}</strong>
                        <span className="summary-detail">{unknownOverrideCount ? "保存时原样保留" : "当前没有额外自定义键"}</span>
                      </div>
                    </div>
                    {unknownOverrideCount ? <AppAlert status="warning" title="检测到未纳入可视化表单的自定义键，保存时会自动保留。" /> : null}
                    <ValidationAlerts validation={validation} />
                    <Accordion allowsMultipleExpanded defaultExpandedKeys={["network"]} variant="surface" className="config-section-stack">
                      {CONFIG_SECTIONS.map((section) => (
                        <Accordion.Item id={section.id} key={section.id} className="config-section">
                          <Accordion.Heading>
                            <Accordion.Trigger className="config-trigger">
                              <SectionTitle title={section.title} description={section.description} />
                              <Accordion.Indicator />
                            </Accordion.Trigger>
                          </Accordion.Heading>
                          <Accordion.Panel>
                            <Accordion.Body>
                              <div className="config-grid">
                                {section.fields.map((field) => (
                                  <ConfigField
                                    key={field.key}
                                    field={field}
                                    value={configForm[field.key]}
                                    overridden={isFieldOverridden(field)}
                                    defaultPreview={formatFieldPreview(field, getDefaultFieldValue(field))}
                                    onChange={(value) => updateConfigField(field.key, value)}
                                    onArrayChange={updateArrayItem}
                                    onMappingChange={updateMappingItem}
                                    onAddArray={() => addArrayItem(field)}
                                    onRemoveArray={(index) => removeArrayItem(field, index)}
                                    onAddMapping={() => addMappingItem(field)}
                                    onRemoveMapping={(index) => removeMappingItem(field, index)}
                                  />
                                ))}
                              </div>
                            </Accordion.Body>
                          </Accordion.Panel>
                        </Accordion.Item>
                      ))}
                    </Accordion>
                  </Card.Content>
                </Card>
              </div>
            )}

            {id === "logs" && (
              <div className="view-grid">
                <Card className="span-12">
                  <Card.Header className="card-heading">
                    <div>
                      <h2>日志控制台</h2>
                      <p>选择任务查看最新输出。</p>
                    </div>
                    <div className="header-actions">
                      <HeroSelect
                        className="task-select"
                        label="选择任务"
                        placeholder="选择任务"
                        value={activeTaskId}
                        options={tasks.map((task) => ({ value: task.id, label: `${task.id} · ${statusText(task.status)}` }))}
                        onChange={(taskId) => {
                          setActiveTaskId(taskId || "");
                          loadTaskLog(taskId || "");
                        }}
                      />
                      <Button variant="secondary" onPress={() => loadTaskLog()}><RefreshCw size={16} />刷新日志</Button>
                      <AppSwitch size="sm" isSelected={autoRefreshLogs} onChange={setAutoRefreshLogs}>自动刷新</AppSwitch>
                    </div>
                  </Card.Header>
                  <Card.Content className="gap-4">
                    {activeTask ? (
                      <div className="chip-row">
                        <Chip color="primary" variant="flat">{activeTask.id}</Chip>
                        <Chip color={statusColor(activeTask.status)} variant="flat">{statusText(activeTask.status)}</Chip>
                        <Chip variant="flat">来源 {sourceText(activeTask.source)}</Chip>
                        <Chip variant="flat">退出码 {activeTask.exit_code ?? "-"}</Chip>
                        <Chip variant="flat">{activeTask.message || "-"}</Chip>
                      </div>
                    ) : (
                      <EmptyState title="请选择任务" />
                    )}
                    <div className="console-head">
                      <span>日志输出</span>
                      <AppSwitch size="sm" isSelected={logAutoScroll} onChange={setLogAutoScroll}>自动滚动</AppSwitch>
                    </div>
                    <ScrollShadow ref={consoleRef} className="console-scroll">
                      <pre>{logContent || "暂无日志。"}</pre>
                    </ScrollShadow>
                  </Card.Content>
                </Card>
              </div>
            )}

            {id === "artifacts" && (
              <div className="view-grid">
                <Card className="span-7">
                  <Card.Header className="card-heading">
                    <div>
                      <h2>输出文件</h2>
                      <p>下载、预览当前 runtime/output 中的产物。</p>
                    </div>
                  </Card.Header>
                  <Card.Content>
                    <ArtifactTable artifacts={artifacts} onPreview={previewArtifact} getDownloadUrl={resolveArtifactDownloadUrl} />
                  </Card.Content>
                </Card>
                <Card className="span-5">
                  <Card.Header className="card-heading">
                    <div>
                      <h2>公开下载地址</h2>
                      <p>用于播放器、订阅或反向代理后的公开访问。</p>
                    </div>
                  </Card.Header>
                  <Card.Content className="gap-3">
                    {publicDownloadEntries.length ? publicDownloadEntries.map((entry) => (
                      <div className="public-url" key={entry.name}>
                        <div>
                          <strong>{entry.name}</strong>
                          <Link href={entry.url} target="_blank" size="sm">{entry.url}</Link>
                        </div>
                        <Tooltip.Root>
                          <Tooltip.Trigger>
                            <Button isIconOnly variant="secondary" aria-label="复制地址" onPress={() => copyText(entry.url)}><Copy size={16} /></Button>
                          </Tooltip.Trigger>
                          <Tooltip.Content>复制地址</Tooltip.Content>
                        </Tooltip.Root>
                      </div>
                    )) : <EmptyState title="暂无公开地址" />}
                  </Card.Content>
                </Card>
                <Card className="span-12">
                  <Card.Header className="card-heading">
                    <div>
                      <h2>文件预览</h2>
                      <p>支持文本和 gzip 文本文件。</p>
                    </div>
                  </Card.Header>
                  <Card.Content>
                    <ScrollShadow className="console-scroll preview-scroll">
                      <pre>{artifactPreview}</pre>
                    </ScrollShadow>
                  </Card.Content>
                </Card>
              </div>
            )}

            {id === "schedule" && (
              <Card>
                <Card.Header className="card-heading">
                  <div>
                    <h2>定时任务</h2>
                    <p>保存 Cron 表达式和定时执行参数。</p>
                  </div>
                </Card.Header>
                <Card.Content className="gap-5">
                  <div className="schedule-hero">
                    <div>
                      <strong>启用定时</strong>
                      <p>按 Cron 表达式自动执行频道更新。</p>
                    </div>
                    <AppSwitch aria-label="启用定时" isSelected={scheduleForm.enabled} onChange={(value) => setScheduleForm((current) => ({ ...current, enabled: value }))} />
                  </div>
                  <label className="field-label">
                    <span>Cron 表达式</span>
                    <Input value={scheduleForm.cron} onChange={(event) => setScheduleForm((current) => ({ ...current, cron: event.target.value }))} placeholder="0 5 * * *" />
                  </label>
                  <div className="option-grid">
                    <OptionSwitch title="跳过 EPG" description="不下载节目单，运行更快" value={scheduleForm.options.skip_epg} onChange={(value) => setScheduleForm((current) => ({ ...current, options: { ...current.options, skip_epg: value } }))} />
                    <OptionSwitch title="跳过检测" description="不检测频道流可用性" value={scheduleForm.options.skip_check} onChange={(value) => setScheduleForm((current) => ({ ...current, options: { ...current.options, skip_check: value } }))} />
                    <OptionSwitch title="跳过深探" description="不执行 ffprobe 分辨率探测" value={scheduleForm.options.skip_probe} onChange={(value) => setScheduleForm((current) => ({ ...current, options: { ...current.options, skip_probe: value } }))} />
                  </div>
                  <div className="action-row">
                    <Button color="primary" onPress={saveSchedule}><Save size={16} />保存定时配置</Button>
                  </div>
                  <p className="status-copy">{scheduleStatus}</p>
                </Card.Content>
              </Card>
            )}
          </Tabs.Panel>
        ))}
        </section>
      </Tabs>
    </main>
  );
}

function Requirement({ icon: Icon, text }) {
  return (
    <div className="requirement">
      <Icon size={17} />
      <span>{text}</span>
    </div>
  );
}

function OptionSwitch({ title, description, value, onChange }) {
  return (
    <div className="option-card">
      <div>
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
      <AppSwitch aria-label={title} isSelected={value} onChange={onChange} />
    </div>
  );
}

function AppSwitch({ children, ...props }) {
  return (
    <Switch className="app-switch" {...props}>
      <Switch.Control>
        <Switch.Thumb />
      </Switch.Control>
      {children ? (
        <Switch.Content>
          <Label>{children}</Label>
        </Switch.Content>
      ) : null}
    </Switch>
  );
}

function HeroSelect({ label, value, options, onChange, placeholder = "请选择", className = "" }) {
  return (
    <Select className={className} value={value || null} onChange={onChange} placeholder={placeholder}>
      <Label className="control-label">{label}</Label>
      <Select.Trigger className="select-trigger">
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover className="select-popover">
        <ListBox>
          {options.map((option) => (
            <ListBox.Item key={option.value} id={option.value} textValue={option.label} className="select-option">
              {option.label}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}

function HeroNumberField({ value, onChange, step = 1 }) {
  const numericValue = Number(value);
  return (
    <NumberField value={Number.isFinite(numericValue) ? numericValue : 0} onChange={(nextValue) => onChange(nextValue)} step={step} className="number-field">
      <NumberField.Group>
        <NumberField.DecrementButton>-</NumberField.DecrementButton>
        <NumberField.Input />
        <NumberField.IncrementButton>+</NumberField.IncrementButton>
      </NumberField.Group>
    </NumberField>
  );
}

function TaskTable({ tasks, onOpen }) {
  return (
    <div className="hero-table-wrap">
      <Table className="hero-table">
        <Table.Content aria-label="最近任务" onRowAction={(key) => {
          const task = tasks.find((item) => item.id === key);
          if (task) onOpen(task);
        }}>
          <Table.Header>
            <Table.Column isRowHeader>任务 ID</Table.Column>
            <Table.Column>状态</Table.Column>
            <Table.Column>来源</Table.Column>
            <Table.Column>创建时间</Table.Column>
          </Table.Header>
          <Table.Body items={tasks}>
            {(task) => (
              <Table.Row id={task.id}>
                <Table.Cell><span className="mono">{task.id}</span></Table.Cell>
                <Table.Cell><Chip color={statusColor(task.status)} variant="flat" size="sm">{statusText(task.status)}</Chip></Table.Cell>
                <Table.Cell>{sourceText(task.source)}</Table.Cell>
                <Table.Cell>{formatDateTime(task.created_at)}</Table.Cell>
              </Table.Row>
            )}
          </Table.Body>
        </Table.Content>
      </Table>
      {!tasks.length ? <EmptyState title="暂无任务记录" /> : null}
    </div>
  );
}

function ArtifactTable({ artifacts, onPreview, getDownloadUrl }) {
  return (
    <div className="hero-table-wrap">
      <Table className="hero-table">
        <Table.Content aria-label="输出文件">
          <Table.Header>
            <Table.Column isRowHeader>名称</Table.Column>
            <Table.Column>更新时间</Table.Column>
            <Table.Column>大小</Table.Column>
            <Table.Column>操作</Table.Column>
          </Table.Header>
          <Table.Body items={artifacts}>
            {(artifact) => (
              <Table.Row id={artifact.name}>
                <Table.Cell><span className="mono">{artifact.name}</span></Table.Cell>
                <Table.Cell>{formatDateTime(artifact.updated_at)}</Table.Cell>
                <Table.Cell>{formatSize(artifact.size)}</Table.Cell>
                <Table.Cell>
                  <div className="table-actions">
                    {artifact.previewable ? <Button size="sm" variant="secondary" onPress={() => onPreview(artifact.name)}>预览</Button> : null}
                    <Button size="sm" color="primary" variant="secondary" onPress={() => window.open(getDownloadUrl(artifact), "_blank", "noopener,noreferrer")}><Download size={14} />下载</Button>
                  </div>
                </Table.Cell>
              </Table.Row>
            )}
          </Table.Body>
        </Table.Content>
      </Table>
      {!artifacts.length ? <EmptyState title="暂无输出文件" /> : null}
    </div>
  );
}

function SectionTitle({ title, description }) {
  return (
    <div className="section-title">
      <strong>{title}</strong>
      <span>{description}</span>
    </div>
  );
}

function ValidationAlerts({ validation }) {
  if (!validation.errors.length && !validation.warnings.length) {
    return null;
  }
  return (
    <div className="validation-stack">
      {validation.errors.map((item) => <AppAlert key={`error-${item}`} status="danger" title={item} />)}
      {validation.warnings.map((item) => <AppAlert key={`warning-${item}`} status="warning" title={item} />)}
    </div>
  );
}

function ConfigField({ field, value, overridden, defaultPreview, onChange, onArrayChange, onMappingChange, onAddArray, onRemoveArray, onAddMapping, onRemoveMapping }) {
  if (field.type === "boolean") {
    return (
      <div className={`config-field config-switch-field ${field.fullWidth ? "wide" : ""} ${overridden ? "overridden" : ""}`}>
        <div className="config-switch-copy">
          <h3>{field.label}</h3>
          <p>{field.description}</p>
          <div className="default-snippet">默认值：{defaultPreview}</div>
        </div>
        <div className="config-switch-control">
          <AppSwitch isSelected={Boolean(value)} onChange={onChange}>启用</AppSwitch>
          <Chip size="sm" color={overridden ? "warning" : "default"} variant="flat">{overridden ? "已覆盖" : "默认"}</Chip>
        </div>
      </div>
    );
  }

  return (
    <div className={`config-field ${field.fullWidth ? "wide" : ""} ${field.required ? "required" : ""} ${overridden ? "overridden" : ""}`}>
      <div className="field-head">
        <div>
          <h3>
            {field.label}
            {field.required ? <span className="required-mark">必填</span> : null}
          </h3>
          <p>{field.description}</p>
        </div>
        <Chip size="sm" color={overridden ? "warning" : "default"} variant="flat">{overridden ? "已覆盖" : "默认"}</Chip>
      </div>

      {field.type === "select" ? (
        <HeroSelect
          label={field.label}
          value={value}
          options={field.options}
          onChange={(nextValue) => onChange(nextValue || "")}
        />
      ) : null}

      {field.type === "number" || field.type === "float" ? (
        <HeroNumberField value={value} step={field.type === "float" ? 0.1 : 1} onChange={onChange} />
      ) : null}

      {field.type === "text" ? (
        <Input fullWidth value={value} onChange={(event) => onChange(event.target.value)} placeholder={field.placeholder || ""} />
      ) : null}

      {field.type === "array" ? (
        <div className={`dynamic-list ${field.compactArray ? "compact" : ""}`}>
          {value.map((item, index) => (
            <div className="dynamic-row" key={`${field.key}-${index}`}>
              {field.itemType === "number" ? (
                <HeroNumberField value={item} onChange={(nextValue) => onArrayChange(field.key, index, nextValue)} />
              ) : (
                <Input
                  fullWidth
                  value={String(item)}
                  onChange={(event) => onArrayChange(field.key, index, event.target.value)}
                  placeholder={field.placeholder || ""}
                />
              )}
              <Button variant="secondary" color="danger" onPress={() => onRemoveArray(index)}>删除</Button>
            </div>
          ))}
          {!value.length ? <p className="empty-line">当前没有条目，点击下方按钮新增。</p> : null}
          <Button variant="secondary" onPress={onAddArray}>{field.addLabel || "新增一项"}</Button>
        </div>
      ) : null}

      {field.type === "mapping" ? (
        <div className="dynamic-list">
          {value.map((row, index) => (
            <div className="dynamic-row mapping" key={`${field.key}-${index}`}>
              <Input fullWidth value={row.source} onChange={(event) => onMappingChange(field.key, index, "source", event.target.value)} placeholder={field.leftLabel || "匹配关键词"} />
              <Input fullWidth value={row.target} onChange={(event) => onMappingChange(field.key, index, "target", event.target.value)} placeholder={field.rightLabel || "目标值"} />
              <Button variant="secondary" color="danger" onPress={() => onRemoveMapping(index)}>删除</Button>
            </div>
          ))}
          {!value.length ? <p className="empty-line">当前没有映射，点击下方按钮新增。</p> : null}
          <Button variant="secondary" onPress={onAddMapping}>{field.addLabel || "新增映射"}</Button>
        </div>
      ) : null}

      <div className="default-snippet">默认值：{defaultPreview}</div>
    </div>
  );
}
