import { useEffect, useMemo, useState } from "react";

export type LobbyAssetStatus = "loading" | "ready" | "error";

export function useLobbyAssets(sources: readonly string[]): LobbyAssetStatus {
  const signature = JSON.stringify(sources);
  const stableSources = useMemo<readonly string[]>(() => JSON.parse(signature) as string[], [signature]);
  const [status, setStatus] = useState<LobbyAssetStatus>(stableSources.length === 0 ? "ready" : "loading");

  useEffect(() => {
    let active = true;
    let completed = 0;
    let failed = false;
    setStatus(stableSources.length === 0 ? "ready" : "loading");

    for (const src of stableSources) {
      const asset = new Image();
      let settled = false;
      asset.onload = () => {
        if (!active || settled || failed) return;
        settled = true;
        completed += 1;
        if (completed === stableSources.length) setStatus("ready");
      };
      asset.onerror = () => {
        if (!active || settled || failed) return;
        settled = true;
        failed = true;
        console.error("Failed to load lobby asset", { src });
        setStatus("error");
      };
      asset.src = src;
    }

    return () => {
      active = false;
    };
  }, [stableSources]);

  return status;
}
