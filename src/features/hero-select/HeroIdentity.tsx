import type { Hero, AssetStatus } from "./types";

interface HeroIdentityProps {
  hero: Hero;
  status: AssetStatus;
}

export function HeroIdentity({ hero, status }: HeroIdentityProps) {
  return (
    <section className="hero-identity" aria-label="当前角色">
      <div className="hero-identity__copy">
        <h1 className="hero-identity__title">SELECT HERO</h1>
        <p className="hero-identity__subtitle">Choose your hero</p>
        <span className="hero-identity__rarity">EPIC</span>
      </div>
      {status === "ready" ? (
        <img className="hero-identity__logo" src={hero.logoSrc} alt={`${hero.displayName}角色标志`} />
      ) : (
        <p className="hero-identity__fallback" role="status">
          {status === "error" ? `无法加载 ${hero.displayName}` : `正在加载 ${hero.displayName}`}
        </p>
      )}
    </section>
  );
}
