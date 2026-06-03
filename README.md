# CMCC IPTV Auto Docker

基于 melody0709/cmcc_iptv_auto_py 的 WebUI + Docker 封装版本。

项目目标不是重写上游抓取逻辑，而是在尽量保留上游核心流程的前提下，补齐以下能力：

- 可视化配置管理
- WebUI 手动执行任务
- 任务历史与日志查看
- 产物在线预览、下载与公开地址复制
- Cron 定时执行
- Docker / Compose 持久化部署

当前产物仍然由上游抓取内核生成，Web 层负责配置、任务编排、日志、调度和下载分发。

## 主要能力

- 广东移动 IPTV JSON 抓取
- 自定义频道合并
- 外部 M3U 合并与分组映射
- 流检测与可选 ffprobe 深探
- 生成 tv.m3u、tv2.m3u、ku9.m3u、aptv.m3u
- 可选生成 t.xml 和 t.xml.gz
- 自动暴露产物下载地址
- 可手动配置 M3U 顶部的 x-tvg-url

## 架构说明

- backend/app/api: FastAPI 接口层，对外提供配置、任务、产物、调度 API
- backend/app/services: 配置管理、任务执行、调度、产物处理、runtime 文件读写
- backend/app/core/reference: 引入的上游抓取核心代码
- backend/app/static: Vue 3 + Element Plus WebUI
- runtime/config: 配置文件
- runtime/output: 生成的 M3U / XML 产物
- runtime/log: 任务日志与运行日志
- runtime/cache: 缓存文件
- runtime/data: 任务状态、公开基址等持久化数据

运行任务时，后端会以子进程方式调用上游 tv.py，并把配置、日志、缓存和产物目录全部重定向到 runtime，方便本地与容器统一持久化。

## 目录结构

```text
.
├── backend
│   └── app
│       ├── api
│       ├── core
│       ├── services
│       └── static
├── runtime
│   ├── cache
│   ├── config
│   ├── data
│   ├── log
│   └── output
├── Dockerfile
└── docker-compose.yml
```

## 运行前提

- 宿主机或容器必须能访问广东移动 IPTV 相关网络资源
- 如果启用深度探测，本地环境需要 ffprobe
- Docker 镜像已经内置 ffmpeg，因此容器模式下无需额外安装
- 当前实现限制同一时间只运行一个抓取任务，避免并发写坏同一批产物

## 本地运行

### 1. 创建虚拟环境并安装依赖

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r backend/requirements.txt
```

### 2. 启动服务

```bash
uvicorn backend.app.main:app --host 0.0.0.0 --port 8080
```

### 3. 打开控制台

```text
http://127.0.0.1:8080
```

## Docker 运行

本仓库的 Docker 用法默认基于已经发布到 Docker Hub 的镜像，不需要本地 `build`。

当前公开镜像仓库为：

```text
cheukfung/cmcc-iptv-auto-docker:<tag>
```

可用 tag 由工作流自动发布，通常至少包括：

- `latest`
- 语义化版本号，例如 `1.0.0`
- 次版本号，例如 `1.0`

建议先准备持久化目录：

```bash
mkdir -p runtime/config runtime/output runtime/log runtime/cache runtime/data
```

### 1. 使用 docker run 启动

```bash
docker pull cheukfung/cmcc-iptv-auto-docker:latest

docker run -d \
	--name cmcc_iptv_auto_docker \
	--restart unless-stopped \
	-p 8080:8080 \
	-e TZ=Asia/Shanghai \
	-v "$(pwd)/runtime/config:/app/runtime/config" \
	-v "$(pwd)/runtime/output:/app/runtime/output" \
	-v "$(pwd)/runtime/log:/app/runtime/log" \
	-v "$(pwd)/runtime/cache:/app/runtime/cache" \
	-v "$(pwd)/runtime/data:/app/runtime/data" \
	cheukfung/cmcc-iptv-auto-docker:latest
```

### 2. 使用 docker compose 启动

仓库里的 [docker-compose.yml](docker-compose.yml) 默认直接拉取：

```text
cheukfung/cmcc-iptv-auto-docker:latest
```

直接执行即可：

```bash
docker compose pull
docker compose up -d
```

如果你想切换到其他 tag，直接把命令里的 `latest` 改成目标 tag 即可，例如：

```bash
docker pull cheukfung/cmcc-iptv-auto-docker:1.0.0
```

或者把 [docker-compose.yml](docker-compose.yml) 里的镜像 tag 改成你要的版本后再执行：

```bash
docker compose up -d
```

### 3. 访问 WebUI

```text
http://127.0.0.1:8080
```

### 4. 持久化目录

compose 默认映射以下目录：

- runtime/config
- runtime/output
- runtime/log
- runtime/cache
- runtime/data

这样容器重建后，配置、日志、缓存、任务历史和产物仍然保留。

## 配置文件说明

### 核心配置文件

- runtime/config/config.json: 默认配置
- runtime/config/myconfig.json: 用户覆盖配置
- runtime/config/myconfig.example.json: 覆盖配置示例
- runtime/config/schedule.json: 定时任务配置
- runtime/config/channel_order.json: 频道排序规则
- runtime/config/custom_channels.json: 自定义频道

### 配置策略

- config.json 保存项目默认值
- myconfig.json 只建议放与你环境相关的覆盖项
- WebUI 保存配置时，会把用户修改写入覆盖配置
- 如果 myconfig.json 不存在，系统会按空覆盖处理

### 当前默认值中的几个关键项

- IS_HWURL: true，默认优先使用 hwurl，zteurl 作为回退
- REPLACEMENT_IP: http://192.168.0.1:7088/udp
- M3U_EPG_URL: 空字符串，表示不写入 x-tvg-url；需要时请手动填写
- ENABLE_EPG_DOWNLOAD: true
- EPG_DOWNLOAD_MODE: M3U_ONLY
- ENABLE_EXTERNAL_M3U_MERGE: false

## 定时任务配置

schedule.json 当前结构如下：

```json
{
	"enabled": false,
	"cron": "0 5 * * *",
	"options": {
		"skip_epg": false,
		"skip_check": false,
		"skip_probe": false
	}
}
```

- enabled: 是否启用定时任务
- cron: 五段式 Cron 表达式
- options: 定时执行时传给任务的开关项

## 公开下载地址与 x-tvg-url

系统会记住最近一次访问 WebUI 或调用运行接口时所使用的公开基址，并将其用于：

- 生成产物的绝对下载地址
- 在 /api/artifacts 中返回 download_url

这意味着：

- 如果你通过反向代理域名访问系统，建议通过最终对外地址打开 WebUI 并执行一次任务
- M3U 顶部 x-tvg-url 不会自动使用公开基址；需要写入时请手动填写 M3U_EPG_URL

## 产物说明

默认输出目录为 runtime/output，常见产物包括：

- tv.m3u: 主 M3U 列表
- tv2.m3u: 替换地址后的精简列表
- ku9.m3u: 兼容另一种分发场景的列表
- aptv.m3u: 适配特定播放器场景的列表
- t.xml: EPG XML
- t.xml.gz: 压缩后的 EPG XML

WebUI 中可以直接：

- 查看产物更新时间和大小
- 预览文本型产物内容
- 下载产物
- 复制公开下载地址

## 常用 API

- GET /api/health: 健康检查
- GET /api/config: 获取配置、默认值、覆盖值、公开基址和产物地址
- PUT /api/config: 保存配置
- POST /api/tasks/run: 手动启动任务
- GET /api/tasks: 查询任务列表
- GET /api/tasks/{task_id}/logs: 查看任务日志
- GET /api/artifacts: 获取产物列表与下载地址
- GET /api/artifacts/{name}/download: 下载指定产物
- GET /api/artifacts/{name}/preview: 预览文本型产物
- GET /api/schedules: 查询定时配置
- PUT /api/schedules: 保存定时配置
- POST /api/schedules/trigger: 立即触发一次定时任务配置

## 故障排查

### 任务启动后很快失败

优先检查网络环境是否真的能访问广东移动 IPTV 相关地址。这个问题不是 WebUI 层能兜底的，最终会直接反映为抓取失败。

### 深探或流检测异常

如果启用了深度探测，请确认本地环境存在 ffprobe。Docker 镜像已内置 ffmpeg，本地模式则需要自行安装。

### M3U 顶部没有 x-tvg-url

M3U_EPG_URL 留空时不会写入 x-tvg-url。需要播放器读取节目单时，请在配置中手动填写 M3U_EPG_URL。

### 修改配置后没有看到预期效果

先确认配置已经保存成功，再重新执行任务。大多数配置只会影响下一次生成，不会回写已经存在的产物。

## 上游参考

- https://github.com/melody0709/cmcc_iptv_auto_py
