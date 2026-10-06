import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const backgroundNames = ['piko', 'riff', 'bongo', 'nibby', 'mira'];
const cardNames = ['hamster', 'girl', 'piko', 'rabbit', 'bear'];
const loadingAssets = [
  'src/assets/loading/control-candy-circle.svg',
  'src/assets/loading/loading-background.png',
  'src/assets/loading/loading-logo.png',
  'src/assets/loading/loading-intro.mp4',
  'src/assets/loading/loading-loop.mp4',
  'src/assets/loading/ambient-glow.svg',
  'src/assets/loading/icon-sound.svg',
  'src/assets/loading/icon-music.svg',
  'src/assets/loading/icon-settings.svg',
  'src/assets/loading/icon-account.svg',
  'src/assets/loading/icon-notice.svg',
  'src/assets/loading/progress-star.svg',
];
const lobbySvgNames = [
  'icon-coins',
  'icon-energy',
  'icon-gems',
  'icon-mail',
  'icon-gift',
  'icon-crown-utility',
  'chevron-daily',
  'icon-settings',
  'icon-halo',
  'icon-songs',
  'chevron-menu',
  'icon-challenges',
  'icon-hero',
  'icon-play',
  'action-rays',
  'avatar-slot',
  'icon-level-crown',
  'profile-avatar-frame',
  'unread-badge',
];

const gameRuntimeFiles = [
  'index.html', 'app.js', 'embed-bridge.js', 'game-core.js', 'game-chart.js', 'audio-clock.js',
  'styles.css', 'countdown-assets.js', 'countdown-assets.css',
  'magic-attack-d.js', 'magic-attack-d.css',
];
const settlementAssets = [
  'background.png', 'stage-clear.png', 'star-lit.png', 'crown.svg',
  'good-note.svg', 'miss-note.svg', 'next.svg', 'perfect-note.svg',
  'record-crown.svg', 'retry.svg', 'settlement-intro.mp4', 'settlement-loop.mp4',
];

function filesUnder(relativeDirectory) {
  const directory = resolve(projectRoot, relativeDirectory);
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const relativePath = `${relativeDirectory}/${entry.name}`;
    return entry.isDirectory() ? filesUnder(relativePath) : [relativePath];
  });
}

const gameAssets = filesUnder('rhythm-game/assets');
const gameReferenceFiles = [
  ...readFileSync(resolve(projectRoot, 'rhythm-game/index.html'), 'utf8')
    .matchAll(/(?:src|href)=["']([^"']+)["']/g),
].map((match) => match[1].split('?')[0]);
const indirectGameAssets = gameRuntimeFiles.flatMap((file) => [
  ...readFileSync(resolve(projectRoot, 'rhythm-game', file), 'utf8')
    .matchAll(/["'](assets\/[^"']+)["']/g),
].map((match) => match[1]));

const requiredFiles = [
  ...backgroundNames.map((name) => `src/assets/figma/hero-${name}-background.png`),
  ...cardNames.map((name) => `src/assets/figma/card-${name}.png`),
  ...backgroundNames.map((name) => `src/assets/hero-logos/${name}-transparent.png`),
  ...backgroundNames.map((name) => `src/assets/videos/hero-${name}.mp4`),
  'src/assets/figma/icon-coins.svg',
  'src/assets/figma/icon-energy.svg',
  'src/assets/figma/icon-gems.svg',
  'src/assets/lobby/lobby-background.png',
  'src/assets/lobby/lobby-background.mp4',
  'src/assets/lobby/daily-challenge-art.png',
  'src/assets/lobby/profile-avatar.png',
  ...lobbySvgNames.map((name) => `src/assets/lobby/${name}.svg`),
  ...loadingAssets,
  'src/assets/lobby/lobby-background.mp4',
  'src/assets/game-flow/pregame-intro.mp4',
  ...settlementAssets.map((name) => `src/assets/settlement/${name}`),
  ...gameRuntimeFiles.map((name) => `rhythm-game/${name}`),
  ...gameReferenceFiles.map((name) => `rhythm-game/${name}`),
  ...indirectGameAssets.map((name) => `rhythm-game/${name}`),
  ...gameAssets,
];

const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function pngDimensions(path) {
  const header = readFileSync(path).subarray(0, 24);
  if (header.length < 24 || !header.subarray(0, 8).equals(pngSignature)) {
    throw new Error(`Invalid PNG header: ${path}`);
  }
  if (header.toString('ascii', 12, 16) !== 'IHDR') {
    throw new Error(`Missing PNG IHDR chunk: ${path}`);
  }
  return [header.readUInt32BE(16), header.readUInt32BE(20)];
}

for (const relativePath of new Set(requiredFiles)) {
  const path = resolve(projectRoot, relativePath);
  let info;
  try {
    info = statSync(path);
  } catch {
    throw new Error(`Missing required asset: ${relativePath}`);
  }
  if (!info.isFile() || info.size === 0) {
    throw new Error(`Empty or invalid asset: ${relativePath}`);
  }
}

for (const name of backgroundNames) {
  const relativePath = `src/assets/figma/hero-${name}-background.png`;
  const dimensions = pngDimensions(resolve(projectRoot, relativePath));
  if (dimensions[0] !== 2048 || dimensions[1] !== 1152) {
    throw new Error(`Background ${relativePath} is ${dimensions.join('×')}; expected 2048×1152`);
  }
  console.log(`${relativePath}: 2048×1152`);
}

const lobbyBackground = 'src/assets/lobby/lobby-background.png';
const lobbyDimensions = pngDimensions(resolve(projectRoot, lobbyBackground));
if (lobbyDimensions[0] !== 2048 || lobbyDimensions[1] !== 1152) {
  throw new Error(`Background ${lobbyBackground} is ${lobbyDimensions.join('×')}; expected 2048×1152`);
}
console.log(`${lobbyBackground}: 2048×1152`);

for (const relativePath of [
  'src/assets/loading/loading-background.png',
  'src/assets/loading/loading-logo.png',
]) {
  const dimensions = pngDimensions(resolve(projectRoot, relativePath));
  if (dimensions[0] !== 2048 || dimensions[1] !== 1152) {
    throw new Error(`Loading asset ${relativePath} is ${dimensions.join('×')}; expected 2048×1152`);
  }
  console.log(`${relativePath}: 2048×1152`);
}

console.log(`Verified ${new Set(requiredFiles).size} required assets, including the game reference closure and settlement media.`);
