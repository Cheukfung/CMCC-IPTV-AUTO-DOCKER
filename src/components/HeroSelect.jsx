import React from "react";
import { Select, Label, ListBox } from "@heroui/react";

export function HeroSelect({ label, value, options, onChange, placeholder = "请选择", className = "" }) {
  return (
    <Select className={className} value={value || null} onChange={onChange} placeholder={placeholder}>
      <Label className="control-label">{label}</Label>
      <Select.Trigger className="select-trigger">
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover className="select-popover">
        <ListBox>
          {options.map((option) => (
            <ListBox.Item key={option.value} id={option.value} textValue={option.label} className="select-option">
              {option.label}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}