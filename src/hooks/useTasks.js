import { useState, useCallback } from "react";
import { api } from "../api/client";

export function useTasks() {
  const [tasks, setTasks] = useState([]);
  const [activeTaskId, setActiveTaskId] = useState("");

  const loadTasks = useCallback(async () => {
    const nextTasks = await api("/api/tasks");
    setTasks(nextTasks);
    setActiveTaskId((current) => {
      if (!nextTasks.length) return "";
      return current && nextTasks.some((task) => task.id === current) ? current : nextTasks[0].id;
    });
    return nextTasks;
  }, []);

  const runTask = useCallback(async (options) => {
    const task = await api("/api/tasks/run", {
      method: "POST",
      body: JSON.stringify(options),
    });
    return task;
  }, []);

  return { tasks, activeTaskId, setActiveTaskId, loadTasks, runTask };
}

export function useTaskLog(activeTaskId) {
  const [logContent, setLogContent] = useState("暂无日志。");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);

  const loadLog = useCallback(
    async (taskId) => {
      const id = taskId || activeTaskId;
      if (!id) {
        setLogContent("暂无日志。");
        return;
      }
      try {
        const result = await api(`/api/tasks/${id}/logs?tail=400`);
        setLogContent(result.content || "日志为空。");
      } catch (error) {
        setLogContent(error.message);
      }
    },
    [activeTaskId]
  );

  return { logContent, setLogContent, autoRefresh, setAutoRefresh, autoScroll, setAutoScroll, loadLog };
}