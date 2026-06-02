import React, { useState, useEffect, useRef, useCallback } from "react";
import { Chip, Toast } from "@heroui/react";
import {
  LoaderCircle,
  Moon,
  Play,
  Settings,
  Sun,
  Terminal,
  FolderOpen,
  Gauge,
  AlarmClock,
  Tv,
} from "lucide-react";
import { useConfig } from "./hooks/useConfig";
import { useHealth } from "./hooks/useHealth";
import { useTasks, useTaskLog } from "./hooks/useTasks";
import { useArtifacts } from "./hooks/useArtifacts";
import { useSchedule } from "./hooks/useSchedule";
import { useTheme } from "./hooks/useTheme";
import { NAV_TAB_IDS } from "./config/sections";
import { DashboardView } from "./views/DashboardView";
import { RunView } from "./views/RunView";
import { ConfigView } from "./views/ConfigView";
import { LogsView } from "./views/LogsView";
import { ArtifactsView } from "./views/ArtifactsView";
import { ScheduleView } from "./views/ScheduleView";
import "./styles.css";

function getHashView() {
  const hash = window.location.hash.replace(/^#/, "");
  return NAV_TAB_IDS.includes(hash) ? hash : "dashboard";
}

export default function App() {
  const [activeView, setActiveView] = useState(getHashView);
  const { health, refreshHealth } = useHealth(false);
  const { tasks, activeTaskId, setActiveTaskId, loadTasks, runTask: apiRunTask } = useTasks();
  const { logContent, autoRefresh, setAutoRefresh, autoScroll, setAutoScroll, loadLog } = useTaskLog(activeTaskId);
  const { artifacts, loadArtifacts, previewArtifact, resolveDownloadUrl } = useArtifacts();
  const { scheduleForm, setScheduleForm, loadSchedule, saveSchedule: apiSaveSchedule, triggerSchedule } = useSchedule();
  const configHook = useConfig();
  const { theme, toggleTheme } = useTheme();

  const runningTask = health.running_task || null;
  const publicDownloadEntries = configHook.publicDownloadEntries;
  const configBundle = configHook.configBundle;

  const refreshLiveData = useCallback(async () => {
    await Promise.all([refreshHealth(), loadTasks(), loadArtifacts()]);
  }, [refreshHealth, loadTasks, loadArtifacts]);

  useEffect(() => {
    let mounted = true;
    async function boot() {
      try {
        await configHook.loadConfig();
        await loadSchedule();
        await refreshLiveData();
      } catch (error) {
        if (mounted) {
          console.error(error);
        }
      }
    }
    boot();
  }, []);

  useEffect(() => {
    const interval = setInterval(refreshLiveData, 5000);
    return () => clearInterval(interval);
  }, [refreshLiveData]);

  useEffect(() => {
    if (autoRefresh && activeTaskId) {
      loadLog(activeTaskId);
    }
  }, [activeTaskId, autoRefresh, loadLog]);

  useEffect(() => {
    const handleHashChange = () => setActiveView(getHashView());
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  useEffect(() => {
    if (window.location.hash !== `#${activeView}`) {
      window.history.replaceState(null, "", `#${activeView}`);
    }
  }, [activeView]);

  async function handleRunTask(options) {
    try {
      const task = await apiRunTask(options);
      setActiveTaskId(task.id);
      setActiveView("logs");
      await refreshLiveData();
      await loadLog(task.id);
    } catch (error) {
      console.error(error);
    }
    return null;
  }

  async function handleTriggerSchedule() {
    try {
      const task = await triggerSchedule();
      setActiveTaskId(task.id);
      setActiveView("logs");
      await refreshLiveData();
      await loadLog(task.id);
    } catch (error) {
      console.error(error);
    }
    return null;
  }

  async function handleSaveSchedule(form) {
    return apiSaveSchedule(form);
  }

  async function handleOpenTaskLogs(task) {
    setActiveTaskId(task.id);
    setActiveView("logs");
    await loadLog(task.id);
  }

  async function handlePreviewArtifact(name) {
    try {
      await previewArtifact(name);
    } catch {
      // ignore, will be shown in artifacts view
    }
    setActiveView("artifacts");
  }

  const navTabs = [
    { id: "dashboard", label: "概览", icon: Gauge },
    { id: "run", label: "运行", icon: Play },
    { id: "config", label: "配置", icon: Settings },
    { id: "logs", label: "日志", icon: Terminal },
    { id: "artifacts", label: "输出", icon: FolderOpen },
    { id: "schedule", label: "定时", icon: AlarmClock },
  ];

  return (
    <main className="app-shell">
      <Toast.Provider placement="top end" />
      <header className="app-header">
        <div className="header-brand">
          <div className="brand-mark"><Tv size={18} /></div>
          <div className="brand-text">
            <strong>CMCC IPTV</strong>
            <span>Auto Docker</span>
          </div>
        </div>
        <nav className="header-nav">
          {navTabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`nav-item ${activeView === id ? "nav-item-active" : ""}`}
              onClick={() => setActiveView(id)}
            >
              <Icon size={16} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
            <div className="header-actions">
              <button className="theme-toggle" onClick={toggleTheme} title={theme === "dark" ? "切换亮色模式" : "切换暗色模式"}>
                {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
              </button>
            </div>
            <div className="header-status">
          <Chip color={health.status === "ok" ? "success" : "warning"} variant="flat" size="sm">
            {health.status === "ok" ? "正常" : health.status}
          </Chip>
        </div>
      </header>

      {runningTask && (
        <div className="status-bar status-bar-warning status-bar-inline">
          <LoaderCircle className="spin" size={16} />
          <div>
            <strong>正在执行任务 {runningTask.id}</strong>
            <span>当前状态: {runningTask.status}</span>
          </div>
        </div>
      )}

      <section className="app-body">
        {activeView === "dashboard" && (
          <DashboardView
            health={health}
            tasks={tasks}
            artifacts={artifacts}
            onOpenTaskLogs={handleOpenTaskLogs}
            onPreviewArtifact={handlePreviewArtifact}
            onGoToArtifacts={() => setActiveView("artifacts")}
          />
        )}
        {activeView === "run" && (
          <RunView onRunTask={handleRunTask} onTriggerSchedule={handleTriggerSchedule} />
        )}
        {activeView === "config" && (
          <ConfigView
            configBundle={configHook.configBundle}
            configForm={configHook.configForm}
            validation={configHook.validation}
            visibleOverrideCount={configHook.visibleOverrideCount}
            unknownOverrideCount={configHook.unknownOverrideCount}
            unknownConfigOverrides={configHook.unknownConfigOverrides}
            isFieldOverridden={configHook.isFieldOverridden}
            getDefaultFieldValue={configHook.getDefaultFieldValue}
            updateConfigField={configHook.updateConfigField}
            updateArrayItem={configHook.updateArrayItem}
            updateMappingItem={configHook.updateMappingItem}
            addArrayItem={configHook.addArrayItem}
            removeArrayItem={configHook.removeArrayItem}
            addMappingItem={configHook.addMappingItem}
            removeMappingItem={configHook.removeMappingItem}
            loadConfig={configHook.loadConfig}
            saveConfig={configHook.saveConfig}
            validateConfig={configHook.validateConfig}
            resetVisibleConfig={configHook.resetVisibleConfig}
          />
        )}
        {activeView === "logs" && (
          <LogsView
            tasks={tasks}
            activeTaskId={activeTaskId}
            setActiveTaskId={setActiveTaskId}
            logContent={logContent}
            autoRefresh={autoRefresh}
            setAutoRefresh={setAutoRefresh}
            autoScroll={autoScroll}
            setAutoScroll={setAutoScroll}
            loadLog={loadLog}
          />
        )}
        {activeView === "artifacts" && (
          <ArtifactsView
            artifacts={artifacts}
            publicDownloadEntries={publicDownloadEntries}
            getDownloadUrl={(artifact) => resolveDownloadUrl(artifact, configBundle.artifact_urls)}
            onPreviewPreview={previewArtifact}
          />
        )}
        {activeView === "schedule" && (
          <ScheduleView
            scheduleForm={scheduleForm}
            setScheduleForm={setScheduleForm}
            onSaveSchedule={handleSaveSchedule}
          />
        )}
      </section>
    </main>
  );
}