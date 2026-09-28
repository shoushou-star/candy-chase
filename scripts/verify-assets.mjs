import { readFileSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const backgroundNames = ['piko', 'riff', 'bongo', 'nibby', 'mira'];
const cardNames = ['hamster', 'girl', 'piko', 'rabbit', 'bear'];

const requiredFiles = [
  ...backgroundNames.map((name) => `src/assets/figma/hero-${name}-background.png`),
  ...cardNames.map((name) => `src/assets/figma/card-${name}.png`),
  ...backgroundNames.map((name) => `src/assets/hero-logos/${name}-transparent.png`),
  'src/assets/figma/icon-coins.svg',
  'src/assets/figma/icon-energy.svg',
  'src/assets/figma/icon-gems.svg',
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

console.log(`Verified ${requiredFiles.length} required assets.`);
