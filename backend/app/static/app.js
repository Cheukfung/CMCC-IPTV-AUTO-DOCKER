const { createApp, reactive, computed, onMounted, toRefs, ref, nextTick } = Vue;
const { ElMessage } = ElementPlus;

const CONFIG_SECTIONS = [
  {
    id: "network",
    title: "网络与播放",
    description: "控制频道源地址、组播转单播前缀和回看代理。",
    fields: [
      { key: "IS_HWURL", label: "优先使用 HWURL", type: "boolean", description: "开启后优先用华为 hwurl；关闭后优先用中兴 zteurl。", defaultValue: true },
      { key: "JSON_URL", label: "频道 JSON 地址", type: "text", description: "主频道列表抓取入口。", placeholder: "http://183.235.xx.xx:8082/epg/api/custom/getAllChannel.json", defaultValue: "http://183.235.16.92:8082/epg/api/custom/getAllChannel.json" },
      { key: "REPLACEMENT_IP", label: "默认单播替换地址", type: "text", description: "用于 tv2.m3u、ku9.m3u、aptv.m3u 的组播转单播前缀。", placeholder: "http://host:port/udp", defaultValue: "http://c.cc.top:7088/udp" },
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
    description: "控制节目单下载、合成范围和防风控参数。",
    fields: [
      { key: "ENABLE_EPG_DOWNLOAD", label: "启用 EPG 下载", type: "boolean", description: "关闭后只生成 M3U，不下载 t.xml / t.xml.gz。", defaultValue: true },
      { key: "EPG_DOWNLOAD_MODE", label: "EPG 下载模式", type: "select", description: "M3U_ONLY 仅处理最终 M3U 中的频道；ALL 处理全部可用频道。", defaultValue: "M3U_ONLY", options: [{ value: "M3U_ONLY", label: "M3U_ONLY" }, { value: "ALL", label: "ALL" }] },
      { key: "EPG_DAY_OFFSETS", label: "EPG 日期偏移", type: "array", itemType: "number", addLabel: "新增日期偏移", description: "相对今天的天数，例如 -1、0、1。", defaultValue: [-5, -4, -3, -2, -1, 0, 1], fullWidth: true },
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
    description: "控制测活、分组筛选和 ffprobe 深度探测参数。",
    fields: [
      { key: "ENABLE_STREAM_CHECK", label: "启用底层流检测", type: "boolean", description: "开启后在生成 M3U 前清理失效源。", defaultValue: true },
      { key: "CHECK_TARGET_GROUPS", label: "检测目标分组", type: "array", itemType: "text", addLabel: "新增检测分组", description: "留空代表所有分组都参与检测。", defaultValue: ["港澳台"], fullWidth: true },
      { key: "CHECK_TIMEOUT", label: "检测超时（秒）", type: "number", description: "单个频道检测的超时值。", defaultValue: 5 },
      { key: "CHECK_WORKERS", label: "检测并发数", type: "number", description: "检测协程的最大并发量。", defaultValue: 4 },
      { key: "ENABLE_PROBE", label: "启用 ffprobe 深探", type: "boolean", description: "开启后会额外探测真实分辨率与编码。", defaultValue: true },
      { key: "CHECK_CACHE_EXPIRE", label: "探测缓存过期（小时）", type: "number", description: "ffprobe 结果缓存时长。", defaultValue: 24 },
    ],
  },
  {
    id: "external",
    title: "外部 M3U 合并",
    description: "补充外部频道源，并配置模糊匹配映射关系。",
    fields: [
      { key: "ENABLE_EXTERNAL_M3U_MERGE", label: "启用外部 M3U 合并", type: "boolean", description: "关闭后不会下载和合并额外频道源。", defaultValue: true },
      { key: "EXTERNAL_M3U_URL", label: "外部 M3U 地址", type: "text", description: "外部频道列表下载地址。", placeholder: "https://example.com/list.m3u", defaultValue: "https://raw.githubusercontent.com/Jsnzkpg/Jsnzkpg/Jsnzkpg/Jsnzkpg1.m3u", fullWidth: true },
      { key: "EXTERNAL_GROUP_TITLES", label: "外部分组映射", type: "mapping", description: "左侧写匹配关键词，右侧写最终分组名称。", defaultValue: { 港澳台: "港澳台" }, fullWidth: true, leftLabel: "匹配关键词", rightLabel: "目标分组", addLabel: "新增映射" },
      { key: "CACHE_M3U_FILENAME", label: "外部 M3U 缓存文件名", type: "text", description: "网络失败时回退的缓存文件名，写入 runtime/cache。", defaultValue: "cache.m3u" },
    ],
  },
];

const CONFIG_FIELDS = CONFIG_SECTIONS.flatMap((section) => section.fields);
const KNOWN_CONFIG_KEYS = new Set(CONFIG_FIELDS.map((field) => field.key));

function cloneValue(value) {
  if (value === undefined) {
    return undefined;
  }
  return JSON.parse(JSON.stringify(value));
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
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function statusTagType(status) {
  if (status === "success") return "success";
  if (status === "failed") return "danger";
  if (status === "running" || status === "pending") return "warning";
  return "info";
}

function normalizeFieldUiValue(field, value) {
  const fallback = cloneValue(field.defaultValue);
  const source = value === undefined ? fallback : value;

  if (field.type === "boolean") {
    return Boolean(source);
  }
  if (field.type === "number") {
    const parsed = Number.parseInt(source, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (field.type === "float") {
    const parsed = Number.parseFloat(source);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (field.type === "text" || field.type === "select") {
    return String(source ?? "");
  }
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
  if (field.type === "boolean") {
    return Boolean(value);
  }
  if (field.type === "number") {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (field.type === "float") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (field.type === "text" || field.type === "select") {
    return String(value ?? "").trim();
  }
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
  if (field.type === "boolean") {
    return normalized ? "开启" : "关闭";
  }
  if (field.type === "array") {
    return normalized.length ? normalized.join(" / ") : "空列表";
  }
  if (field.type === "mapping") {
    const entries = Object.entries(normalized);
    return entries.length ? entries.map(([left, right]) => `${left} → ${right}`).join("；") : "无映射";
  }
  const text = String(normalized ?? "");
  return text || "空值";
}

function buildInitialConfigForm() {
  return Object.fromEntries(CONFIG_FIELDS.map((field) => [field.key, normalizeFieldUiValue(field, field.defaultValue)]));
}

const _app = createApp({
  setup() {
    const state = reactive({
      activeView: "dashboard",
      health: { status: "检查中", running_task: null, task_count: 0, artifact_count: 0 },
      tasks: [],
      artifacts: [],
      activeTaskId: "",
      autoRefreshLogs: true,
      logContent: "暂无日志。",
      artifactPreview: "选择支持预览的文本文件后显示内容。",
      logAutoScroll: true,
      runForm: { skip_epg: false, skip_check: false, skip_probe: false },
      runStatus: "等待执行。",
      scheduleForm: { enabled: false, cron: "0 5 * * *", options: { skip_epg: false, skip_check: false, skip_probe: false } },
      scheduleStatus: "默认每天 05:00 执行。",
      configBundle: { default: {}, overrides: {}, merged: {}, validation: { valid: true, errors: [], warnings: [] } },
      configForm: buildInitialConfigForm(),
      unknownConfigOverrides: {},
    });

    const runningTask = computed(() => state.health.running_task || null);
    const activeTask = computed(() => state.tasks.find((task) => task.id === state.activeTaskId) || null);

    const logScrollbarRef = ref(null);
    const configValidation = computed(() => state.configBundle.validation || { valid: true, errors: [], warnings: [] });
    const publicDownloadEntries = computed(() =>
      Object.entries(state.configBundle.artifact_urls || {})
        .filter(([name]) => name.endsWith(".m3u") || name.endsWith(".xml") || name.endsWith(".xml.gz"))
        .map(([name, url]) => ({ name, url }))
    );

    function getDefaultFieldValue(field) {
      const source = Object.prototype.hasOwnProperty.call(state.configBundle.default || {}, field.key)
        ? state.configBundle.default[field.key]
        : field.defaultValue;
      return normalizeFieldPayloadValue(field, source);
    }

    function isFieldOverridden(field) {
      const currentValue = normalizeFieldPayloadValue(field, state.configForm[field.key]);
      const defaultValue = getDefaultFieldValue(field);
      return stableSerialize(currentValue) !== stableSerialize(defaultValue);
    }

    function collectConfigPayload() {
      const payload = { ...state.unknownConfigOverrides };
      CONFIG_FIELDS.forEach((field) => {
        const currentValue = normalizeFieldPayloadValue(field, state.configForm[field.key]);
        const defaultValue = getDefaultFieldValue(field);
        if (stableSerialize(currentValue) !== stableSerialize(defaultValue)) {
          payload[field.key] = currentValue;
        }
      });
      return payload;
    }

    const visibleOverrideCount = computed(() =>
      Object.keys(collectConfigPayload()).filter((key) => KNOWN_CONFIG_KEYS.has(key)).length
    );
    const unknownOverrideCount = computed(() => Object.keys(state.unknownConfigOverrides).length);

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
        } catch (_) {
          message = await response.text();
        }
        throw new Error(message);
      }

      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        return response.json();
      }
      return response.text();
    }

    function hydrateConfigBundle(bundle) {
      state.configBundle = bundle;
      state.unknownConfigOverrides = Object.fromEntries(
        Object.entries(bundle.overrides || {}).filter(([key]) => !KNOWN_CONFIG_KEYS.has(key))
      );

      CONFIG_FIELDS.forEach((field) => {
        const sourceValue = Object.prototype.hasOwnProperty.call(bundle.merged || {}, field.key)
          ? bundle.merged[field.key]
          : Object.prototype.hasOwnProperty.call(bundle.default || {}, field.key)
            ? bundle.default[field.key]
            : field.defaultValue;
        state.configForm[field.key] = normalizeFieldUiValue(field, sourceValue);
      });
    }

    async function loadHealth() {
      state.health = await api("/api/health");
    }

    async function loadTasks() {
      state.tasks = await api("/api/tasks");
      if (!state.tasks.length) {
        state.activeTaskId = "";
        return;
      }
      if (!state.activeTaskId || !state.tasks.some((task) => task.id === state.activeTaskId)) {
        state.activeTaskId = state.tasks[0].id;
      }
    }

    async function loadArtifacts() {
      state.artifacts = await api("/api/artifacts");
    }

    async function loadConfig() {
      const bundle = await api("/api/config");
      hydrateConfigBundle(bundle);
    }

    async function loadSchedule() {
      state.scheduleForm = await api("/api/schedules");
    }

    async function loadTaskLog() {
      if (!state.activeTaskId) {
        state.logContent = "暂无日志。";
        return;
      }
      try {
        const result = await api(`/api/tasks/${state.activeTaskId}/logs?tail=400`);
        state.logContent = result.content || "日志为空。";
        if (state.logAutoScroll) {
          await nextTick();
          logScrollbarRef.value?.setScrollTop(999999);
        }
      } catch (error) {
        state.logContent = error.message;
      }
    }

    async function previewArtifact(name) {
      try {
        const result = await api(`/api/artifacts/${encodeURIComponent(name)}/preview?lines=220`);
        state.artifactPreview = result.content || "文件为空。";
        state.activeView = "artifacts";
      } catch (error) {
        state.artifactPreview = error.message;
        state.activeView = "artifacts";
      }
    }

    async function refreshLiveData() {
      await Promise.all([loadHealth(), loadTasks(), loadArtifacts()]);
      if (state.autoRefreshLogs && state.activeTaskId) {
        await loadTaskLog();
      }
    }

    async function runTask() {
      try {
        const task = await api("/api/tasks/run", {
          method: "POST",
          body: JSON.stringify(state.runForm),
        });
        state.activeTaskId = task.id;
        state.activeView = "logs";
        state.runStatus = `任务已启动: ${task.id}`;
        ElMessage.success(state.runStatus);
        await refreshLiveData();
        await loadTaskLog();
      } catch (error) {
        state.runStatus = error.message;
        ElMessage.error(error.message);
      }
    }

    async function triggerSchedule() {
      try {
        const task = await api("/api/schedules/trigger", { method: "POST" });
        state.activeTaskId = task.id;
        state.activeView = "logs";
        state.runStatus = `已按定时配置触发任务: ${task.id}`;
        ElMessage.success(state.runStatus);
        await refreshLiveData();
        await loadTaskLog();
      } catch (error) {
        state.runStatus = error.message;
        ElMessage.error(error.message);
      }
    }

    async function validateConfig() {
      try {
        state.configBundle.validation = await api("/api/config/validate", {
          method: "POST",
          body: JSON.stringify(collectConfigPayload()),
        });
        if (state.configBundle.validation.valid && !state.configBundle.validation.warnings.length) {
          ElMessage.success("配置校验通过。");
        }
      } catch (error) {
        state.configBundle.validation = { valid: false, errors: [error.message], warnings: [] };
        ElMessage.error(error.message);
      }
    }

    async function saveConfig() {
      try {
        const bundle = await api("/api/config", {
          method: "PUT",
          body: JSON.stringify(collectConfigPayload()),
        });
        hydrateConfigBundle(bundle);
        ElMessage.success("配置已保存。");
      } catch (error) {
        state.configBundle.validation = { valid: false, errors: [error.message], warnings: [] };
        ElMessage.error(error.message);
      }
    }

    async function resetVisibleConfig() {
      if (!window.confirm("这会清空当前页面可编辑项的覆盖配置，并恢复为默认值。是否继续？")) {
        return;
      }
      try {
        const bundle = await api("/api/config", {
          method: "PUT",
          body: JSON.stringify({ ...state.unknownConfigOverrides }),
        });
        hydrateConfigBundle(bundle);
        ElMessage.success("可视化配置已恢复默认值。");
      } catch (error) {
        ElMessage.error(error.message);
      }
    }

    async function saveSchedule() {
      try {
        state.scheduleForm = await api("/api/schedules", {
          method: "PUT",
          body: JSON.stringify(state.scheduleForm),
        });
        state.scheduleStatus = "定时配置已保存。";
        ElMessage.success(state.scheduleStatus);
      } catch (error) {
        state.scheduleStatus = error.message;
        ElMessage.error(error.message);
      }
    }

    function artifactDownloadUrl(name) {
      return state.configBundle.artifact_urls?.[name] || `/api/artifacts/${encodeURIComponent(name)}/download`;
    }

    function resolveArtifactDownloadUrl(artifact) {
      return artifact.download_url || artifactDownloadUrl(artifact.name);
    }

    async function copyText(text) {
      try {
        if (!navigator.clipboard?.writeText) {
          throw new Error("当前浏览器不支持剪贴板写入。");
        }
        await navigator.clipboard.writeText(text);
        ElMessage.success("地址已复制。");
      } catch (error) {
        ElMessage.error(error.message || "复制失败，请手动复制。");
      }
    }

    function openTaskLogs(row) {
      state.activeTaskId = row.id;
      state.activeView = "logs";
      loadTaskLog();
    }

    function addArrayItem(fieldKey, itemType) {
      state.configForm[fieldKey].push(itemType === "number" ? 0 : "");
    }

    function removeArrayItem(fieldKey, index) {
      state.configForm[fieldKey].splice(index, 1);
    }

    function addMappingItem(fieldKey) {
      state.configForm[fieldKey].push({ source: "", target: "" });
    }

    function removeMappingItem(fieldKey, index) {
      state.configForm[fieldKey].splice(index, 1);
    }

    onMounted(async () => {
      try {
        await loadConfig();
        await loadSchedule();
        await refreshLiveData();
        setInterval(refreshLiveData, 5000);
      } catch (error) {
        state.runStatus = error.message;
        ElMessage.error(error.message);
      }
    });

    return {
      ...toRefs(state),
      logScrollbarRef,
      configSections: CONFIG_SECTIONS,
      runningTask,
      activeTask,
      configValidation,
      publicDownloadEntries,
      visibleOverrideCount,
      unknownOverrideCount,
      formatSize,
      formatDateTime,
      statusTagType,
      formatFieldPreview,
      getDefaultFieldValue,
      isFieldOverridden,
      runTask,
      triggerSchedule,
      loadTaskLog,
      previewArtifact,
      loadConfig,
      validateConfig,
      saveConfig,
      resetVisibleConfig,
      saveSchedule,
      refreshLiveData,
      loadArtifacts,
      copyText,
      artifactDownloadUrl,
      resolveArtifactDownloadUrl,
      openTaskLogs,
      addArrayItem,
      removeArrayItem,
      addMappingItem,
      removeMappingItem,
    };
  },
}).use(ElementPlus, { size: "small" });

if (typeof ElementPlusIconsVue !== "undefined") {
  for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
    _app.component(key, component);
  }
}

_app.mount("#app");
