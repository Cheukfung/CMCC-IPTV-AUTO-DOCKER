import React from "react";
import { formatSize, formatDateTime, statusColor, statusText, sourceText } from "../utils/format";

export function TaskTable({ tasks, onOpen }) {
  return (
    <div className="hero-table-wrap">
      <table className="hero-table">
        <thead>
          <tr>
            <th>任务 ID</th>
            <th>状态</th>
            <th>来源</th>
            <th>创建时间</th>
          </tr>
        </thead>
        <tbody>
          {tasks.length ? (
            tasks.map((task) => (
              <tr key={task.id} className="data-row" onClick={() => onOpen(task)} style={{ cursor: "pointer" }}>
                <td><span className="mono">{task.id}</span></td>
                <td><span className={`badge badge-${statusColor(task.status)}`}>{statusText(task.status)}</span></td>
                <td>{sourceText(task.source)}</td>
                <td>{formatDateTime(task.created_at)}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={4} className="empty-cell">暂无任务记录</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}