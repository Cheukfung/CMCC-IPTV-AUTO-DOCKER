import React, { useState } from "react";
import { Copy, Download, Eye } from "lucide-react";
import { formatSize, formatDateTime } from "../utils/format";
import { copyText } from "../utils/notify";

export function ArtifactsView({ artifacts, publicDownloadEntries, getDownloadUrl, onPreviewPreview }) {
  const [previewContent, setPreviewContent] = useState("选择支持预览的文本文件后显示内容。");

  async function handlePreview(name) {
    try {
      const result = await onPreviewPreview(name);
      setPreviewContent(result.content || "文件为空。");
    } catch (error) {
      setPreviewContent(error.message);
    }
  }

  return (
    <div className="view-content">
      <div className="artifacts-grid">
        <div className="card card-artifact-list">
          <div className="card-heading">
            <div>
              <h2>输出文件</h2>
              <p>下载、预览当前 runtime/output 中的产物。</p>
            </div>
          </div>
          <div className="card-body">
            <table className="data-table">
              <thead>
                <tr>
                  <th>名称</th>
                  <th>更新时间</th>
                  <th>大小</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {artifacts.length ? artifacts.map((artifact) => (
                  <tr key={artifact.name} className="data-row">
                    <td><span className="mono">{artifact.name}</span></td>
                    <td>{formatDateTime(artifact.updated_at)}</td>
                    <td>{formatSize(artifact.size)}</td>
                    <td>
                      <div className="table-actions">
                        {artifact.previewable && (
                          <button className="btn-icon" title="预览" onClick={() => handlePreview(artifact.name)}>
                            <Eye size={14} />
                          </button>
                        )}
                        <a className="btn-primary-sm" href={getDownloadUrl(artifact)} target="_blank" rel="noopener noreferrer">
                          <Download size={14} />下载
                        </a>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={4} className="empty-cell">暂无输出文件</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card card-artifact-urls">
          <div className="card-heading">
            <div>
              <h2>公开下载地址</h2>
              <p>用于播放器、订阅或反向代理后的公开访问。</p>
            </div>
          </div>
          <div className="card-body gap-3">
            {publicDownloadEntries.length ? publicDownloadEntries.map((entry) => (
              <div className="public-url" key={entry.name}>
                <div>
                  <strong>{entry.name}</strong>
                  <a href={entry.url} target="_blank" rel="noopener noreferrer" className="url-link">{entry.url}</a>
                </div>
                <button className="btn-icon" title="复制地址" onClick={() => copyText(entry.url)}>
                  <Copy size={16} />
                </button>
              </div>
            )) : (
              <div className="empty-state">
                <span>暂无公开地址</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-heading">
          <div>
            <h2>文件预览</h2>
            <p>支持文本和 gzip 文本文件。</p>
          </div>
        </div>
        <div className="card-body">
          <div className="console-scroll preview-scroll">
            <pre>{previewContent}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}