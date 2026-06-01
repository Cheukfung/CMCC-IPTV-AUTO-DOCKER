import React from "react";
import { NumberField } from "@heroui/react";

export function HeroNumberField({ value, onChange, step = 1 }) {
  const numericValue = Number(value);
  return (
    <NumberField value={Number.isFinite(numericValue) ? numericValue : 0} onChange={(nextValue) => onChange(nextValue)} step={step} className="number-field">
      <NumberField.Group>
        <NumberField.DecrementButton>-</NumberField.DecrementButton>
        <NumberField.Input />
        <NumberField.IncrementButton>+</NumberField.IncrementButton>
      </NumberField.Group>
    </NumberField>
  );
}