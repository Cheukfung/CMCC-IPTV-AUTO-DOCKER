import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "../api/client";
import { normalizeFieldUiValue, normalizeFieldPayloadValue, stableSerialize } from "../utils/config-helpers";
import { CONFIG_FIELDS, KNOWN_CONFIG_KEYS } from "../config/sections";

export function useConfig() {
  const [configBundle, setConfigBundle] = useState({ default: {}, overrides: {}, merged: {}, validation: { valid: true, errors: [], warnings: [] } });
  const [configForm, setConfigForm] = useState(() =>
    Object.fromEntries(CONFIG_FIELDS.map((field) => [field.key, normalizeFieldUiValue(field, field.defaultValue)]))
  );
  const [unknownConfigOverrides, setUnknownConfigOverrides] = useState({});

  const hydrateConfigBundle = useCallback((bundle) => {
    setConfigBundle(bundle);
    setUnknownConfigOverrides(
      Object.fromEntries(Object.entries(bundle.overrides || {}).filter(([key]) => !KNOWN_CONFIG_KEYS.has(key)))
    );
    setConfigForm(
      Object.fromEntries(
        CONFIG_FIELDS.map((field) => {
          const sourceValue = Object.prototype.hasOwnProperty.call(bundle.merged || {}, field.key)
            ? bundle.merged[field.key]
            : Object.prototype.hasOwnProperty.call(bundle.default || {}, field.key)
              ? bundle.default[field.key]
              : field.defaultValue;
          return [field.key, normalizeFieldUiValue(field, sourceValue)];
        })
      )
    );
  }, []);

  const getDefaultFieldValue = useCallback(
    (field) => {
      const source = Object.prototype.hasOwnProperty.call(configBundle.default || {}, field.key)
        ? configBundle.default[field.key]
        : field.defaultValue;
      return normalizeFieldPayloadValue(field, source);
    },
    [configBundle.default]
  );

  const isFieldOverridden = useCallback(
    (field) => {
      const currentValue = normalizeFieldPayloadValue(field, configForm[field.key]);
      return stableSerialize(currentValue) !== stableSerialize(getDefaultFieldValue(field));
    },
    [configForm, getDefaultFieldValue]
  );

  const collectConfigPayload = useCallback(() => {
    const payload = { ...unknownConfigOverrides };
    CONFIG_FIELDS.forEach((field) => {
      const currentValue = normalizeFieldPayloadValue(field, configForm[field.key]);
      const defaultValue = getDefaultFieldValue(field);
      if (stableSerialize(currentValue) !== stableSerialize(defaultValue)) {
        payload[field.key] = currentValue;
      }
    });
    return payload;
  }, [configForm, unknownConfigOverrides, getDefaultFieldValue]);

  const visibleOverrideCount = Object.keys(collectConfigPayload()).filter((key) => KNOWN_CONFIG_KEYS.has(key)).length;
  const unknownOverrideCount = Object.keys(unknownConfigOverrides).length;

  const loadConfig = useCallback(async () => {
    const bundle = await api("/api/config");
    hydrateConfigBundle(bundle);
    return bundle;
  }, [hydrateConfigBundle]);

  const saveConfig = useCallback(async () => {
    const payload = collectConfigPayload();
    const bundle = await api("/api/config", { method: "PUT", body: JSON.stringify(payload) });
    hydrateConfigBundle(bundle);
    return bundle;
  }, [collectConfigPayload, hydrateConfigBundle]);

  const validateConfig = useCallback(async () => {
    const payload = collectConfigPayload();
    const result = await api("/api/config/validate", { method: "POST", body: JSON.stringify(payload) });
    setConfigBundle((current) => ({ ...current, validation: result }));
    return result;
  }, [collectConfigPayload]);

  const resetVisibleConfig = useCallback(async () => {
    const payload = { ...unknownConfigOverrides };
    const bundle = await api("/api/config", { method: "PUT", body: JSON.stringify(payload) });
    hydrateConfigBundle(bundle);
    return bundle;
  }, [unknownConfigOverrides, hydrateConfigBundle]);

  const updateConfigField = useCallback((key, value) => {
    setConfigForm((current) => ({ ...current, [key]: value }));
  }, []);

  const updateArrayItem = useCallback((key, index, value) => {
    setConfigForm((current) => ({
      ...current,
      [key]: current[key].map((item, itemIndex) => (itemIndex === index ? value : item)),
    }));
  }, []);

  const updateMappingItem = useCallback((key, index, fieldName, value) => {
    setConfigForm((current) => ({
      ...current,
      [key]: current[key].map((item, itemIndex) => (itemIndex === index ? { ...item, [fieldName]: value } : item)),
    }));
  }, []);

  const addArrayItem = useCallback((field) => {
    setConfigForm((current) => ({ ...current, [field.key]: [...current[field.key], field.itemType === "number" ? 0 : ""] }));
  }, []);

  const removeArrayItem = useCallback((field, index) => {
    setConfigForm((current) => ({ ...current, [field.key]: current[field.key].filter((_, itemIndex) => itemIndex !== index) }));
  }, []);

  const addMappingItem = useCallback((field) => {
    setConfigForm((current) => ({ ...current, [field.key]: [...current[field.key], { source: "", target: "" }] }));
  }, []);

  const removeMappingItem = useCallback((field, index) => {
    setConfigForm((current) => ({ ...current, [field.key]: current[field.key].filter((_, itemIndex) => itemIndex !== index) }));
  }, []);

  const publicDownloadEntries = Object.entries(configBundle.artifact_urls || {})
    .filter(([name]) => name.endsWith(".m3u") || name.endsWith(".xml") || name.endsWith(".xml.gz"))
    .map(([name, url]) => ({ name, url }));

  return {
    configBundle,
    configForm,
    unknownConfigOverrides,
    validation: configBundle.validation || { valid: true, errors: [], warnings: [] },
    visibleOverrideCount,
    unknownOverrideCount,
    publicDownloadEntries,
    getDefaultFieldValue,
    isFieldOverridden,
    collectConfigPayload,
    loadConfig,
    saveConfig,
    validateConfig,
    resetVisibleConfig,
    updateConfigField,
    updateArrayItem,
    updateMappingItem,
    addArrayItem,
    removeArrayItem,
    addMappingItem,
    removeMappingItem,
  };
}