import { useState, useCallback } from "react";
import { api } from "../api/client";

export function useSchedule() {
  const [scheduleForm, setScheduleForm] = useState({ enabled: false, cron: "0 5 * * *", options: { skip_epg: false, skip_check: false, skip_probe: false } });

  const loadSchedule = useCallback(async () => {
    const result = await api("/api/schedules");
    setScheduleForm(result);
    return result;
  }, []);

  const saveSchedule = useCallback(async (form) => {
    const result = await api("/api/schedules", {
      method: "PUT",
      body: JSON.stringify(form),
    });
    setScheduleForm(result);
    return result;
  }, []);

  const triggerSchedule = useCallback(async () => {
    const task = await api("/api/schedules/trigger", { method: "POST" });
    return task;
  }, []);

  return { scheduleForm, setScheduleForm, loadSchedule, saveSchedule, triggerSchedule };
}