import React from "react";
import { formatSize, formatDateTime, statusColor, statusText, sourceText } from "../utils/format";
import { FileText, Wifi, Terminal, FolderOpen } from "lucide-react";

export function DashboardView({ health, tasks, artifacts, onOpenTaskLogs, onPreviewArtifact, onGoToArtifacts }) {
  const runningTask = health.running_task || null;
  const latestTasks = tasks.slice(0, 10);
  const latestArtifacts = artifacts.slice(0, 8);

  return (
    <div className="view-content">
      <div className="metric-row">
        <div className="metric-card">
          <div className="metric-icon metric-icon-ok">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>
          </div>
          <div className="metric-info">
            <span className="metric-label">系统状态</span>
            <strong className="metric-value">{health.status === "ok" ? "正常" : health.status}</strong>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon metric-icon-task">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <div className="metric-info">
            <span className="metric-label">当前任务</span>
            <strong className="metric-value">{runningTask ? statusText(runningTask.status) : "空闲"}</strong>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon metric-icon-artifact">
            <FolderOpen size={16} />
          </div>
          <div className="metric-info">
            <span className="metric-label">产物数量</span>
            <strong className="metric-value">{artifacts.length}</strong>
            <span className="metric-detail">{tasks.length} 条任务记录</span>
          </div>
        </div>
      </div>

      {runningTask && (
        <div className="status-bar status-bar-warning status-bar-inline">
          <div className="spin-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
          </div>
          <div>
            <strong>正在执行任务 {runningTask.id}</strong>
            <span>当前状态: {runningTask.status}</span>
          </div>
        </div>
      )}

      <div className="dashboard-grid">
        <div className="card card-span-8">
          <div className="card-heading">
            <div>
              <h2>最近任务</h2>
              <p>点击任务行查看日志。</p>
            </div>
          </div>
          <div className="card-body">
            <table className="data-table">
              <thead>
                <tr>
                  <th>任务 ID</th>
                  <th>状态</th>
                  <th>来源</th>
                  <th>创建时间</th>
                </tr>
              </thead>
              <tbody>
                {latestTasks.length ? latestTasks.map((task) => (
                  <tr key={task.id} className="data-row clickable" onClick={() => onOpenTaskLogs(task)}>
                    <td><span className="mono">{task.id}</span></td>
                    <td><span className={`badge badge-${statusColor(task.status)}`}>{statusText(task.status)}</span></td>
                    <td>{sourceText(task.source)}</td>
                    <td>{formatDateTime(task.created_at)}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={4} className="empty-cell">暂无任务记录</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card card-span-4">
          <div className="card-heading">
            <div>
              <h2>运行要求</h2>
            </div>
          </div>
          <div className="card-body">
            <div className="requirement-list">
              <div className="requirement">
                <Wifi size={16} />
                <span>容器或宿主机可访问广东移动 IPTV 目标网段。</span>
              </div>
              <div className="requirement">
                <Terminal size={16} />
                <span>启用深度探测时，系统内需要 ffprobe。</span>
              </div>
              <div className="requirement">
                <FolderOpen size={16} />
                <span>输出、日志、缓存落在 runtime 目录，可直接映射卷。</span>
              </div>
            </div>
          </div>
        </div>

        {latestArtifacts.length ? (
          <div className="card card-span-12">
            <div className="card-heading">
              <div>
                <h2>最近产物</h2>
                <p>点击预览文件内容，或进入产物页复制下载地址。</p>
              </div>
            </div>
            <div className="card-body">
              <div className="artifact-grid">
                {latestArtifacts.map((artifact) => (
                  <div key={artifact.name} className="artifact-tile" role="button" tabIndex={0} onClick={() => {
                    if (onPreviewArtifact) {
                      onPreviewArtifact(artifact.name);
                    }
                    if (onGoToArtifacts) {
                      onGoToArtifacts();
                    }
                  }}>
                    <FileText size={16} />
                    <div className="artifact-tile-info">
                      <strong>{artifact.name}</strong>
                      <span>{formatSize(artifact.size)} · {formatDateTime(artifact.updated_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="card card-span-12">
            <div className="card-body">
              <div className="empty-state">
                <span>暂无输出文件，任务完成后会在这里出现。</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}