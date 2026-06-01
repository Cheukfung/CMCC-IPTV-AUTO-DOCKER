import React from "react";
import { Chip, Button, Input } from "@heroui/react";
import { AppSwitch } from "./AppSwitch";
import { HeroSelect } from "./HeroSelect";
import { HeroNumberField } from "./HeroNumberField";
import { formatFieldPreview } from "../utils/config-helpers";

export function ConfigField({ field, value, overridden, defaultPreview, onChange, onArrayChange, onMappingChange, onAddArray, onRemoveArray, onAddMapping, onRemoveMapping }) {
  if (field.type === "boolean") {
    return (
      <div className={`config-field config-switch-field ${field.fullWidth ? "wide" : ""} ${overridden ? "overridden" : ""}`}>
        <div className="config-switch-copy">
          <h3>{field.label}</h3>
          <p>{field.description}</p>
          <div className="default-snippet">默认值：{defaultPreview}</div>
        </div>
        <div className="config-switch-control">
          <AppSwitch isSelected={Boolean(value)} onChange={onChange}>启用</AppSwitch>
          <Chip size="sm" color={overridden ? "warning" : "default"} variant="flat">{overridden ? "已覆盖" : "默认"}</Chip>
        </div>
      </div>
    );
  }

  return (
    <div className={`config-field ${field.fullWidth ? "wide" : ""} ${field.required ? "required" : ""} ${overridden ? "overridden" : ""}`}>
      <div className="field-head">
        <div>
          <h3>
            {field.label}
            {field.required ? <span className="required-mark">必填</span> : null}
          </h3>
          <p>{field.description}</p>
        </div>
        <Chip size="sm" color={overridden ? "warning" : "default"} variant="flat">{overridden ? "已覆盖" : "默认"}</Chip>
      </div>

      {field.type === "select" ? (
        <HeroSelect label={field.label} value={value} options={field.options} onChange={(nextValue) => onChange(nextValue || "")} />
      ) : null}

      {field.type === "number" || field.type === "float" ? (
        <HeroNumberField value={value} step={field.type === "float" ? 0.1 : 1} onChange={onChange} />
      ) : null}

      {field.type === "text" ? (
        <Input fullWidth value={value} onChange={(event) => onChange(event.target.value)} placeholder={field.placeholder || ""} />
      ) : null}

      {field.type === "array" ? (
        <div className={`dynamic-list ${field.compactArray ? "compact" : ""}`}>
          {value.map((item, index) => (
            <div className="dynamic-row" key={`${field.key}-${index}`}>
              {field.itemType === "number" ? (
                <HeroNumberField value={item} onChange={(nextValue) => onArrayChange(field.key, index, nextValue)} />
              ) : (
                <Input fullWidth value={String(item)} onChange={(event) => onArrayChange(field.key, index, event.target.value)} placeholder={field.placeholder || ""} />
              )}
              <Button variant="secondary" color="danger" onPress={() => onRemoveArray(index)}>删除</Button>
            </div>
          ))}
          {!value.length ? <p className="empty-line">当前没有条目，点击下方按钮新增。</p> : null}
          <Button variant="secondary" onPress={onAddArray}>{field.addLabel || "新增一项"}</Button>
        </div>
      ) : null}

      {field.type === "mapping" ? (
        <div className="dynamic-list">
          {value.map((row, index) => (
            <div className="dynamic-row mapping" key={`${field.key}-${index}`}>
              <Input fullWidth value={row.source} onChange={(event) => onMappingChange(field.key, index, "source", event.target.value)} placeholder={field.leftLabel || "匹配关键词"} />
              <Input fullWidth value={row.target} onChange={(event) => onMappingChange(field.key, index, "target", event.target.value)} placeholder={field.rightLabel || "目标值"} />
              <Button variant="secondary" color="danger" onPress={() => onRemoveMapping(index)}>删除</Button>
            </div>
          ))}
          {!value.length ? <p className="empty-line">当前没有映射，点击下方按钮新增。</p> : null}
          <Button variant="secondary" onPress={onAddMapping}>{field.addLabel || "新增映射"}</Button>
        </div>
      ) : null}

      <div className="default-snippet">默认值：{defaultPreview}</div>
    </div>
  );
}