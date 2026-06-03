export const CONFIG_SECTIONS = [
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
      { key: "M3U_EPG_URL", label: "M3U EPG 地址", type: "text", description: "写入 M3U 顶部 x-tvg-url；留空则不写入。", placeholder: "http://your-domain/api/artifacts/t.xml.gz/download", defaultValue: "" },
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
      { key: "ENABLE_EXTERNAL_M3U_MERGE", label: "启用外部 M3U 合并", type: "boolean", description: "关闭后不会下载和合并额外频道源。", defaultValue: false },
      { key: "EXTERNAL_M3U_URL", label: "外部 M3U 地址", type: "text", description: "外部频道列表下载地址。", placeholder: "https://example.com/list.m3u", defaultValue: "https://raw.githubusercontent.com/Jsnzkpg/Jsnzkpg/Jsnzkpg/Jsnzkpg1.m3u" },
      { key: "EXTERNAL_GROUP_TITLES", label: "外部分组映射", type: "mapping", description: "左侧写匹配关键词，右侧写最终分组名称。", defaultValue: { 港澳台: "港澳台" }, leftLabel: "匹配关键词", rightLabel: "目标分组", addLabel: "新增映射" },
      { key: "CACHE_M3U_FILENAME", label: "外部 M3U 缓存文件名", type: "text", description: "网络失败时缓存到 runtime/cache 的文件名。", defaultValue: "cache.m3u" },
    ],
  },
];

export const CONFIG_FIELDS = CONFIG_SECTIONS.flatMap((section) => section.fields);
export const KNOWN_CONFIG_KEYS = new Set(CONFIG_FIELDS.map((field) => field.key));
export const NAV_TAB_IDS = ["dashboard", "run", "config", "logs", "artifacts", "schedule"];
