import nibbyBackground from "../../assets/figma/hero-nibby-background.png";
import pikoBackground from "../../assets/figma/hero-piko-background.png";
import miraBackground from "../../assets/figma/hero-mira-background.png";
import riffBackground from "../../assets/figma/hero-riff-background.png";
import bongoBackground from "../../assets/figma/hero-bongo-background.png";
import nibbyLogo from "../../assets/hero-logos/nibby-transparent.png";
import pikoLogo from "../../assets/hero-logos/piko-transparent.png";
import miraLogo from "../../assets/hero-logos/mira-transparent.png";
import riffLogo from "../../assets/hero-logos/riff-transparent.png";
import bongoLogo from "../../assets/hero-logos/bongo-transparent.png";
import nibbyCard from "../../assets/figma/card-hamster.png";
import pikoCard from "../../assets/figma/card-piko.png";
import miraCard from "../../assets/figma/card-girl.png";
import riffCard from "../../assets/figma/card-rabbit.png";
import bongoCard from "../../assets/figma/card-bear.png";
import type { Hero } from "./types";

export const HEROES: Hero[] = [
  { id: "nibby", displayName: "NIBBY", backgroundSrc: nibbyBackground, logoSrc: nibbyLogo, cardSrc: nibbyCard },
  { id: "piko", displayName: "PIKO", backgroundSrc: pikoBackground, logoSrc: pikoLogo, cardSrc: pikoCard },
  { id: "mira", displayName: "MIRA", backgroundSrc: miraBackground, logoSrc: miraLogo, cardSrc: miraCard },
  { id: "riff", displayName: "RIFF", backgroundSrc: riffBackground, logoSrc: riffLogo, cardSrc: riffCard },
  { id: "bongo", displayName: "BONGO", backgroundSrc: bongoBackground, logoSrc: bongoLogo, cardSrc: bongoCard },
];
