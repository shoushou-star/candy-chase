import { readFileSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const backgroundNames = ['piko', 'riff', 'bongo', 'nibby', 'mira'];
const cardNames = ['hamster', 'girl', 'piko', 'rabbit', 'bear'];
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

for (const relativePath of requiredFiles) {
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

console.log(`Verified ${requiredFiles.length} required assets.`);
