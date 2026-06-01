import React from "react";
import { createRoot } from "react-dom/client";
import { I18nProvider } from "@heroui/react";
import App from "./App.jsx";
import "./styles.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <I18nProvider locale="zh-CN">
      <App />
    </I18nProvider>
  </React.StrictMode>
);