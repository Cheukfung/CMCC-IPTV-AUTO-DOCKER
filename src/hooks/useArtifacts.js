import { useState, useCallback } from "react";
import { api } from "../api/client";

export function useArtifacts() {
  const [artifacts, setArtifacts] = useState([]);

  const loadArtifacts = useCallback(async () => {
    const result = await api("/api/artifacts");
    setArtifacts(result);
    return result;
  }, []);

  const previewArtifact = useCallback(async (name) => {
    const result = await api(`/api/artifacts/${encodeURIComponent(name)}/preview?lines=220`);
    return result;
  }, []);

  const resolveDownloadUrl = useCallback((artifact, artifactUrls) => {
    return artifact.download_url || artifactUrls?.[artifact.name] || `/api/artifacts/${encodeURIComponent(artifact.name)}/download`;
  }, []);

  return { artifacts, loadArtifacts, previewArtifact, resolveDownloadUrl };
}