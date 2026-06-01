import { useState, useCallback } from "react";
import { api } from "../api/client";

export function useHealth(autoRefresh = false) {
  const [health, setHealth] = useState({ status: "检查中", running_task: null, task_count: 0, artifact_count: 0 });

  const refreshHealth = useCallback(async () => {
    try {
      const data = await api("/api/health");
      setHealth(data);
      return data;
    } catch {
      return undefined;
    }
  }, []);

  return { health, refreshHealth };
}