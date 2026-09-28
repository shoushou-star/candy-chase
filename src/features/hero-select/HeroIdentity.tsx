import type { Hero, AssetStatus } from "./types";

interface HeroIdentityProps {
  hero: Hero;
  status: AssetStatus;
}

export function HeroIdentity({ hero, status }: HeroIdentityProps) {
  return (
    <section className="hero-identity" aria-label="当前角色">
      <p className="hero-identity__eyebrow">CHOOSE YOUR HERO</p>
      {status === "ready" ? (
        <img className="hero-identity__logo" src={hero.logoSrc} alt={`${hero.displayName}角色标志`} />
      ) : (
        <p className="hero-identity__fallback" role="status">
          {status === "error" ? `无法加载 ${hero.displayName}` : `正在加载 ${hero.displayName}`}
        </p>
      )}
      <p className="hero-identity__caption">选择角色，开启冒险</p>
    </section>
  );
}
