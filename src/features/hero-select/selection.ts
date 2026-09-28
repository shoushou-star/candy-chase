import { HEROES } from "./heroes";
import type { Hero, HeroDirection, HeroId } from "./types";

export function getAdjacentHeroId(currentId: HeroId, direction: HeroDirection): HeroId {
  const currentIndex = HEROES.findIndex((hero) => hero.id === currentId);
  if (currentIndex < 0) {
    throw new Error(`Unknown hero: ${currentId}`);
  }

  const nextIndex = (currentIndex + direction + HEROES.length) % HEROES.length;
  return HEROES[nextIndex].id;
}

export function getHeroById(heroId: HeroId): Hero {
  const hero = HEROES.find((candidate) => candidate.id === heroId);
  if (!hero) {
    throw new Error(`Unknown hero: ${heroId}`);
  }
  return hero;
}
