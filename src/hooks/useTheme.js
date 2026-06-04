import { useState, useEffect, useCallback } from "react";

const THEME_KEY = "cmcc-iptv-theme";
const THEME_MODES = new Set(["system", "light", "dark"]);

function getSystemTheme() {
  if (window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
  return "light";
}

function getInitialThemeMode() {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (THEME_MODES.has(stored)) return stored;
  } catch {}
  return "system";
}

export function useTheme() {
  const [themeMode, setThemeMode] = useState(getInitialThemeMode);
  const [systemTheme, setSystemTheme] = useState(getSystemTheme);
  const resolvedTheme = themeMode === "system" ? systemTheme : themeMode;

  const applyTheme = useCallback((next) => {
    const root = document.documentElement;
    if (next === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => setSystemTheme(media.matches ? "dark" : "light");
    handleChange();
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    applyTheme(resolvedTheme);
    try {
      localStorage.setItem(THEME_KEY, themeMode);
    } catch {}
  }, [themeMode, resolvedTheme, applyTheme]);

  return { themeMode, resolvedTheme, setThemeMode };
}
