import React, { useRef } from "react";
import { Button, ScrollShadow } from "@heroui/react";
import { RefreshCw } from "lucide-react";
import { AppSwitch } from "../components/AppSwitch";
import { HeroSelect } from "../components/HeroSelect";
import { statusColor, statusText, sourceText } from "../utils/format";

export function LogsView({ tasks, activeTaskId, setActiveTaskId, logContent, autoRefresh, setAutoRefresh, autoScroll, setAutoScroll, loadLog }) {
  const consoleRef = useRef(null);

  React.useEffect(() => {
    if (autoScroll && consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [logContent, autoScroll]);

  const activeTask = tasks.find((task) => task.id === activeTaskId) || null;

  return (
    <div className="view-content">
      <div className="card card-span-12">
        <div className="card-heading">
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
                loadLog(taskId || "");
              }}
            />
            <Button variant="secondary" onPress={() => loadLog()}><RefreshCw size={16} />刷新日志</Button>
            <AppSwitch size="sm" isSelected={autoRefresh} onChange={setAutoRefresh}>自动刷新</AppSwitch>
          </div>
        </div>
        <div className="card-body gap-4">
          {activeTask ? (
            <div className="chip-row">
              <span className="badge badge-primary">{activeTask.id}</span>
              <span className={`badge badge-${statusColor(activeTask.status)}`}>{statusText(activeTask.status)}</span>
              <span className="badge badge-neutral">来源 {sourceText(activeTask.source)}</span>
              <span className="badge badge-neutral">退出码 {activeTask.exit_code ?? "-"}</span>
              <span className="badge badge-neutral">{activeTask.message || "-"}</span>
            </div>
          ) : (
            <div className="empty-state">
              <span>请选择任务</span>
            </div>
          )}
          <div className="console-head">
            <span>日志输出</span>
            <AppSwitch size="sm" isSelected={autoScroll} onChange={setAutoScroll}>自动滚动</AppSwitch>
          </div>
          <div ref={consoleRef} className="console-scroll">
            <pre>{logContent || "暂无日志。"}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}