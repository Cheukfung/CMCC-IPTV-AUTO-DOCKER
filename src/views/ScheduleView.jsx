import React from "react";
import { Button, Input } from "@heroui/react";
import { Save } from "lucide-react";
import { AppSwitch } from "../components/AppSwitch";
import { notify } from "../utils/notify";

export function ScheduleView({ scheduleForm, setScheduleForm, onSaveSchedule }) {
  const [scheduleStatus, setScheduleStatus] = React.useState("默认每天 05:00 执行。");

  async function handleSave() {
    try {
      await onSaveSchedule(scheduleForm);
      setScheduleStatus("定时配置已保存。");
      notify("success", "定时配置已保存。");
    } catch (error) {
      setScheduleStatus(error.message);
      notify("danger", error.message);
    }
  }

  return (
    <div className="view-content">
      <div className="card">
        <div className="card-heading">
          <div>
            <h2>定时任务</h2>
            <p>保存 Cron 表达式和定时执行参数。</p>
          </div>
        </div>
        <div className="card-body gap-5">
          <div className="schedule-hero">
            <div>
              <strong>启用定时</strong>
              <p>按 Cron 表达式自动执行频道更新。</p>
            </div>
            <AppSwitch aria-label="启用定时" isSelected={scheduleForm.enabled} onChange={(value) => setScheduleForm((current) => ({ ...current, enabled: value }))} />
          </div>
          <label className="field-label">
            <span>Cron 表达式</span>
            <Input value={scheduleForm.cron} onChange={(event) => setScheduleForm((current) => ({ ...current, cron: event.target.value }))} placeholder="0 5 * * *" />
          </label>
          <div className="option-grid">
            <div className="option-card">
              <div>
                <strong>跳过 EPG</strong>
                <p>不下载节目单，运行更快</p>
              </div>
              <AppSwitch isSelected={scheduleForm.options.skip_epg} onChange={(value) => setScheduleForm((current) => ({ ...current, options: { ...current.options, skip_epg: value } }))} />
            </div>
            <div className="option-card">
              <div>
                <strong>跳过检测</strong>
                <p>不检测频道流可用性</p>
              </div>
              <AppSwitch isSelected={scheduleForm.options.skip_check} onChange={(value) => setScheduleForm((current) => ({ ...current, options: { ...current.options, skip_check: value } }))} />
            </div>
            <div className="option-card">
              <div>
                <strong>跳过深探</strong>
                <p>不执行 ffprobe 分辨率探测</p>
              </div>
              <AppSwitch isSelected={scheduleForm.options.skip_probe} onChange={(value) => setScheduleForm((current) => ({ ...current, options: { ...current.options, skip_probe: value } }))} />
            </div>
          </div>
          <div className="action-row">
            <Button color="primary" onPress={handleSave}><Save size={16} />保存定时配置</Button>
          </div>
          <p className="status-copy">{scheduleStatus}</p>
        </div>
      </div>
    </div>
  );
}