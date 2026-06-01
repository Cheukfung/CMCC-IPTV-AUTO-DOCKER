import React from "react";
import { Chip, Button, Accordion } from "@heroui/react";
import { RefreshCw, Save, CheckCircle2, RotateCcw, Settings, ListRestart, Sparkles } from "lucide-react";
import { ConfigField } from "../components/ConfigField";
import { formatFieldPreview } from "../utils/config-helpers";
import { CONFIG_SECTIONS } from "../config/sections";
import { notify } from "../utils/notify";

export function ConfigView({
  configBundle,
  configForm,
  validation,
  visibleOverrideCount,
  unknownOverrideCount,
  unknownConfigOverrides,
  isFieldOverridden,
  getDefaultFieldValue,
  updateConfigField,
  updateArrayItem,
  updateMappingItem,
  addArrayItem,
  removeArrayItem,
  addMappingItem,
  removeMappingItem,
  loadConfig,
  saveConfig,
  validateConfig,
  resetVisibleConfig,
}) {
  async function handleSave() {
    try {
      await saveConfig();
      notify("success", "配置已保存。");
    } catch (error) {
      notify("danger", error.message);
    }
  }

  async function handleValidate() {
    try {
      const result = await validateConfig();
      if (result.valid && !result.warnings.length) {
        notify("success", "配置校验通过。");
      }
    } catch (error) {
      notify("danger", error.message);
    }
  }

  async function handleReset() {
    if (!window.confirm("这会清空当前页面可编辑项的覆盖配置，并恢复为默认值。是否继续？")) return;
    try {
      await resetVisibleConfig();
      notify("success", "可视化配置已恢复默认值。");
    } catch (error) {
      notify("danger", error.message);
    }
  }

  return (
    <div className="view-content">
      <div className="card">
        <div className="card-heading config-header">
          <h2>可视化配置</h2>
          <div className="header-actions">
            {validation.valid && !validation.errors.length && !validation.warnings.length ? (
              <Chip color="success" variant="flat" size="sm">配置校验通过</Chip>
            ) : null}
            <Button variant="secondary" size="sm" onPress={handleValidate}><CheckCircle2 size={14} />校验</Button>
            <Button variant="secondary" size="sm" onPress={resetVisibleConfig}><RotateCcw size={14} />重置覆盖</Button>
            <Button color="primary" size="sm" onPress={handleSave}><Save size={14} />保存配置</Button>
          </div>
        </div>
        <div className="card-body gap-5">
          <div className="summary-row">
            <div className="summary-item">
              <Settings size={15} />
              <span>覆盖项</span>
              <strong>{visibleOverrideCount}</strong>
              <span className="summary-detail">将写入 myconfig.json</span>
            </div>
            <div className="summary-item">
              <ListRestart size={15} />
              <span>默认继承项</span>
              <strong>{CONFIG_SECTIONS.flatMap((s) => s.fields).length - visibleOverrideCount}</strong>
              <span className="summary-detail">仍沿用默认配置</span>
            </div>
            <div className="summary-item">
              <Sparkles size={15} />
              <span>未知自定义键</span>
              <strong>{unknownOverrideCount}</strong>
              <span className="summary-detail">{unknownOverrideCount ? "保存时原样保留" : "当前没有额外自定义键"}</span>
            </div>
          </div>
          {unknownOverrideCount ? (
            <div className="status-bar status-bar-warning">
              <span>检测到未纳入可视化表单的自定义键，保存时会自动保留。</span>
            </div>
          ) : null}
          {validation.errors.length || validation.warnings.length ? (
            <div className="validation-stack">
              {validation.errors.map((item) => (
                <div key={`error-${item}`} className="status-bar status-bar-danger">{item}</div>
              ))}
              {validation.warnings.map((item) => (
                <div key={`warning-${item}`} className="status-bar status-bar-warning">{item}</div>
              ))}
            </div>
          ) : null}
          <Accordion allowsMultipleExpanded defaultExpandedKeys={["network"]} variant="surface" className="config-section-stack">
            {CONFIG_SECTIONS.map((section) => (
              <Accordion.Item id={section.id} key={section.id} className="config-section">
                <Accordion.Heading>
                  <Accordion.Trigger className="config-trigger">
                    <div className="section-title">
                      <strong>{section.title}</strong>
                      <span>{section.description}</span>
                    </div>
                    <Accordion.Indicator />
                  </Accordion.Trigger>
                </Accordion.Heading>
                <Accordion.Panel>
                  <Accordion.Body>
                    <div className="config-grid">
                      {section.fields.map((field) => (
                        <ConfigField
                          key={field.key}
                          field={field}
                          value={configForm[field.key]}
                          overridden={isFieldOverridden(field)}
                          defaultPreview={formatFieldPreview(field, getDefaultFieldValue(field))}
                          onChange={(value) => updateConfigField(field.key, value)}
                          onArrayChange={updateArrayItem}
                          onMappingChange={updateMappingItem}
                          onAddArray={() => addArrayItem(field)}
                          onRemoveArray={(index) => removeArrayItem(field, index)}
                          onAddMapping={() => addMappingItem(field)}
                          onRemoveMapping={(index) => removeMappingItem(field, index)}
                        />
                      ))}
                    </div>
                  </Accordion.Body>
                </Accordion.Panel>
              </Accordion.Item>
            ))}
          </Accordion>
        </div>
      </div>
    </div>
  );
}