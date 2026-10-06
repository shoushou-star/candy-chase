export const GAMEPLAY_ASSETS = {
  pikoIdle: "char_piko_idle",
  pikoAttack: "char_piko_attack",
  pikoHold: "char_piko_hold",
  pikoMiss: "char_piko_miss",
  candyNormal: "candy_normal",
  candyRush: "candy_rush",
  candyHold: "candy_hold",
  hitPoint: "fx_hit_point",
  depthMarker: "fx_depth_marker",
} as const;

export type GameplayAssetKey = (typeof GAMEPLAY_ASSETS)[keyof typeof GAMEPLAY_ASSETS];
