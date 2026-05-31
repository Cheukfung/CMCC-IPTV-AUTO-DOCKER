# cmcc_iptv_auto_docker 实施方案（基于 cmcc_iptv_auto_py）

## 1. 目标与范围

### 1.1 总体目标
在保留上游项目核心抓取与清洗能力的前提下，构建一个可通过 Docker 一键运行、带 WebUI 管理界面的版本，支持：

- 一键触发抓取任务
- 在线修改配置
- 查看任务日志与结果统计
- 下载/预览产物（tv.m3u、tv2.m3u、ku9.m3u、aptv.m3u、t.xml、t.xml.gz）
- 定时任务管理

### 1.2 与上游保持一致的核心能力
参考上游项目，必须保留：

- JSON 频道抓取与过滤
- 自定义频道合并
- 外部 M3U 合并（含分组提取/模糊匹配）
- 智能测活与可选 ffprobe 画质探测
- 多份 M3U 输出
- 可选 EPG 下载与 XML 生成

### 1.3 本项目新增能力

- Web 控制台（任务、配置、日志、产物）
- Docker/Compose 标准化部署
- API 层（供 WebUI 调用）
- 运行状态与历史任务追踪

## 2. 推荐技术方案

## 2.1 技术栈

- 后端: Python 3.11 + FastAPI + Uvicorn
- 任务调度: APScheduler
- WebUI: Vue 3 + Vite + Element Plus（或 React + Ant Design，二选一）
- 日志: structlog 或标准 logging（按文件分级）
- 运行容器: Docker + docker-compose
- 进程模型: 单容器多进程（API + Worker 同进程线程池）或双容器（api/worker）

优先建议：单容器 + 后端内置任务队列，先快跑通，后续再演进为多容器。

## 2.2 目录规划

```
cmcc_iptv_auto_docker/
  backend/
    app/
      api/
      core/
      services/
      scheduler/
      models/
      main.py
    requirements.txt
  frontend/
    src/
    package.json
  runtime/
    config/
    output/
    log/
    cache/
  scripts/
  Dockerfile
  docker-compose.yml
  .env.example
  README.md
```

说明：

- runtime 作为持久化挂载目录，避免容器重建导致数据丢失。
- 上游核心逻辑落在 backend/app/core，尽量与 UI/API 解耦。

## 3. 核心架构设计

## 3.1 分层

- Core 层: 迁移/封装上游 tv.py + iptv_checker_v3 的能力（纯业务）
- Service 层: 任务编排、状态管理、结果落盘
- API 层: 对外 REST 接口
- UI 层: 配置与运行可视化

## 3.2 任务执行模型

- 每次执行生成唯一 task_id
- 状态机：pending -> running -> success/failed
- 任务元数据保存到 runtime/log/tasks.jsonl（或 sqlite）
- 实时日志写入 runtime/log/task_<task_id>.log

## 3.3 配置模型

按上游配置概念拆分为：

- 系统配置（镜像内默认）
- 用户配置（runtime/config/myconfig.json）
- WebUI 临时运行参数（如 skip-epg、skip-check、skip-probe）

合并优先级：

1. 默认配置
2. 持久化用户配置
3. 本次任务临时参数

## 3.4 产物管理

- 输出目录统一到 runtime/output
- API 提供文件列表、大小、更新时间、下载链接
- 可选增加 m3u 频道数和分组统计的摘要接口

## 4. API 设计草案

## 4.1 任务相关

- POST /api/tasks/run
  - 入参: skip_epg/skip_check/skip_probe 等
  - 出参: task_id
- GET /api/tasks
  - 列表查询
- GET /api/tasks/{task_id}
  - 任务详情与状态
- GET /api/tasks/{task_id}/logs
  - 日志内容（支持 tail）

## 4.2 配置相关

- GET /api/config
- PUT /api/config
- POST /api/config/validate

## 4.3 产物相关

- GET /api/artifacts
- GET /api/artifacts/{name}/download
- GET /api/artifacts/{name}/preview（文本型）

## 4.4 调度相关

- GET /api/schedules
- PUT /api/schedules
- POST /api/schedules/trigger

## 5. WebUI 功能规划

## 5.1 页面

- 仪表盘: 最近任务状态、产物更新时间
- 运行页: 一键执行 + 高级开关
- 配置页: JSON 可视编辑 + 字段表单
- 日志页: 任务日志查看（自动刷新）
- 产物页: 文件下载、文本预览
- 调度页: Cron 配置

## 5.2 用户体验要求

- 关键操作有加载态与失败提示
- 长任务页面不阻塞，可离开页面继续运行
- 日志支持关键字过滤

## 6. Docker 运行方案

## 6.1 Dockerfile 要点

- 基础镜像: python:3.11-slim
- 安装系统依赖: ffmpeg、curl、tzdata
- 安装 Python 依赖
- 构建前端并拷贝静态文件到后端静态目录
- 暴露端口: 8080

## 6.2 docker-compose.yml 要点

- 服务: app
- 端口映射: 8080:8080
- 卷挂载:
  - ./runtime/config:/app/runtime/config
  - ./runtime/output:/app/runtime/output
  - ./runtime/log:/app/runtime/log
  - ./runtime/cache:/app/runtime/cache
- 环境变量:
  - TZ=Asia/Shanghai
  - APP_AUTH_ENABLED=false（后续可开启）

## 6.3 网络与可达性注意

上游依赖可访问广东移动 IPTV 网段，Docker 化后仍需保证容器网络能访问目标地址。若宿主网络策略限制，需要在部署文档中明确：

- 仅在具备相同网络条件的环境可成功抓取
- 非目标网络环境下可做 UI 演示，但抓取会失败

## 7. 分阶段实施计划

## Phase 0: 初始化与基线

- 建立 backend/frontend/runtime 目录
- 导入上游核心逻辑（先最小改造跑通 CLI）
- 建立统一配置加载器

验收标准：

- 本地命令可生成 M3U（不带 UI）

## Phase 1: 后端 API 化

- 封装 run_pipeline() 服务接口
- 实现任务状态、日志、产物 API
- 增加配置读写与校验 API

验收标准：

- 可通过 API 触发任务并查看日志/下载产物

## Phase 2: WebUI

- 完成仪表盘/运行/配置/日志/产物页面
- 接入任务轮询与错误提示

验收标准：

- 可在浏览器完成完整流程（改配置 -> 运行 -> 看日志 -> 下载结果）

## Phase 3: Docker 化与部署

- 完成 Dockerfile + Compose
- 首次启动自动初始化 runtime 目录
- 补充 README 部署与排障章节

验收标准：

- 新机器通过 docker compose up -d 可启动并访问 WebUI

## Phase 4: 稳定性与增强

- 定时任务
- 基础鉴权（可选）
- 历史任务清理策略
- 失败重试策略优化

验收标准：

- 连续运行稳定，日志和历史记录可控

## 8. 风险与对策

- 网络环境风险: 非广东移动目标网络无法抓取
  - 对策: 文档明确前置条件，UI 给出可解释错误
- ffprobe 风险: 容器缺少 ffprobe 导致探测能力降级
  - 对策: 镜像强制安装 ffmpeg，启动时健康检查
- 上游更新风险: 上游脚本快速迭代
  - 对策: 核心逻辑尽量少改，做 adapter 层，便于同步
- 长任务阻塞风险:
  - 对策: 后台任务 + 非阻塞日志查看

## 9. 首版交付清单

- 可运行的 Docker 化应用（API + WebUI）
- 可持久化的配置/日志/产物目录
- 可在 WebUI 触发与观测任务
- README（部署、配置、常见问题）

## 10. 后续建议

- 增加多配置模板（家庭宽带/NAS/轻量模式）
- 增加频道质量变化对比报表
- 增加 Webhook 通知（任务成功/失败）
