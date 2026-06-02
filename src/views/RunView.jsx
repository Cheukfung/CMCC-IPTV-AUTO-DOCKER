import React, { useState } from "react";
import { Button } from "@heroui/react";
import { Play, Zap } from "lucide-react";
import { AppSwitch } from "../components/AppSwitch";
import { notify } from "../utils/notify";

export function RunView({ onRunTask, onTriggerSchedule }) {
  const [runForm, setRunForm] = useState({ skip_epg: false, skip_check: false, skip_probe: false });
  const [runStatus, setRunStatus] = useState("等待执行。");

  async function handleRunTask() {
    try {
      const task = await onRunTask(runForm);
      setRunStatus(`任务已开始: ${task.id}`);
      notify("success", `任务已开始: ${task.id}`);
    } catch (error) {
      setRunStatus(error.message);
      notify("danger", error.message);
    }
  }

  async function handleTriggerSchedule() {
    try {
      const task = await onTriggerSchedule();
      setRunStatus(`已按定时配置触发任务: ${task.id}`);
      notify("success", `已按定时配置触发任务: ${task.id}`);
    } catch (error) {
      setRunStatus(error.message);
      notify("danger", error.message);
    }
  }

  return (
    <div className="view-content">
      <div className="card">
        <div className="card-heading">
          <div>
            <h2>手动运行</h2>
            <p>选择本次运行要跳过的步骤，然后启动任务。</p>
          </div>
        </div>
        <div className="card-body gap-5">
          <div className="option-grid">
            <div className="option-card">
              <div>
                <strong>跳过 EPG</strong>
                <p>不下载节目单，运行更快</p>
              </div>
              <AppSwitch isSelected={runForm.skip_epg} onChange={(value) => setRunForm((current) => ({ ...current, skip_epg: value }))} />
            </div>
            <div className="option-card">
              <div>
                <strong>跳过检测</strong>
                <p>不检测频道流可用性</p>
              </div>
              <AppSwitch isSelected={runForm.skip_check} onChange={(value) => setRunForm((current) => ({ ...current, skip_check: value }))} />
            </div>
            <div className="option-card">
              <div>
                <strong>跳过深探</strong>
                <p>不执行 ffprobe 分辨率探测</p>
              </div>
              <AppSwitch isSelected={runForm.skip_probe} onChange={(value) => setRunForm((current) => ({ ...current, skip_probe: value }))} />
            </div>
          </div>
          <div className="action-row">
            <Button color="primary" onPress={handleRunTask}><Play size={16} />启动任务</Button>
            <Button variant="secondary" onPress={handleTriggerSchedule}><Zap size={16} />按定时配置立即执行</Button>
          </div>
          <p className="status-copy">{runStatus}</p>
        </div>
      </div>
    </div>
  );
}