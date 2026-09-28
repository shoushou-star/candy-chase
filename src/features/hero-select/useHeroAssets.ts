import { useEffect, useState } from "react";
import type { Hero, HeroAssetState } from "./types";

function loadingState(heroes: Hero[]): HeroAssetState {
  const state: HeroAssetState = {
    piko: "idle",
    riff: "idle",
    bongo: "idle",
    nibby: "idle",
    mira: "idle",
  };

  for (const hero of heroes) state[hero.id] = "loading";
  return state;
}

export function useHeroAssets(heroes: Hero[]): HeroAssetState {
  const [status, setStatus] = useState<HeroAssetState>(() => loadingState(heroes));
  const assetSignature = JSON.stringify(
    heroes.map(({ id, backgroundSrc, logoSrc, cardSrc }) => [
      id,
      backgroundSrc,
      logoSrc,
      cardSrc,
    ]),
  );

  useEffect(() => {
    let active = true;
    setStatus(loadingState(heroes));

    for (const hero of heroes) {
      let completed = 0;
      let failed = false;

      for (const src of [hero.backgroundSrc, hero.logoSrc, hero.cardSrc]) {
        const image = new Image();
        let settled = false;

        image.onload = () => {
          if (!active || settled) return;
          settled = true;
          completed += 1;
          if (completed === 3 && !failed) {
            setStatus((previous) => ({ ...previous, [hero.id]: "ready" }));
          }
        };

        image.onerror = () => {
          if (!active || settled) return;
          settled = true;
          failed = true;
          console.error("Failed to load hero asset", { heroId: hero.id, src });
          setStatus((previous) => ({ ...previous, [hero.id]: "error" }));
        };

        image.src = src;
      }
    }

    return () => {
      active = false;
    };
  }, [assetSignature]);

  return status;
}
