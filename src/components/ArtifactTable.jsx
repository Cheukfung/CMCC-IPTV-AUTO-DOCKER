import React from "react";
import { formatSize, formatDateTime } from "../utils/format";
import { Copy, Download, Eye } from "lucide-react";

export function ArtifactTable({ artifacts, onPreview, getDownloadUrl, onCopy }) {
  return (
    <div className="hero-table-wrap">
      <table className="hero-table">
        <thead>
          <tr>
            <th>名称</th>
            <th>更新时间</th>
            <th>大小</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {artifacts.length ? (
            artifacts.map((artifact) => (
              <tr key={artifact.name} className="data-row">
                <td><span className="mono">{artifact.name}</span></td>
                <td>{formatDateTime(artifact.updated_at)}</td>
                <td>{formatSize(artifact.size)}</td>
                <td>
                  <div className="table-actions">
                    {artifact.previewable && (
                      <button className="btn-icon" title="预览" onClick={() => onPreview(artifact.name)}>
                        <Eye size={14} />
                      </button>
                    )}
                    <a className="btn-primary-sm" href={getDownloadUrl(artifact)} target="_blank" rel="noopener noreferrer">
                      <Download size={14} />下载
                    </a>
                  </div>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={4} className="empty-cell">暂无输出文件</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}