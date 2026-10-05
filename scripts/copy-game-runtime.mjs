import { cpSync, mkdirSync } from 'node:fs';

const runtimeFiles = [
  'index.html', 'app.js', 'game-core.js', 'game-chart.js', 'audio-clock.js',
  'styles.css', 'countdown-assets.js', 'countdown-assets.css',
  'magic-attack-d.js', 'magic-attack-d.css',
];

mkdirSync('dist/rhythm-game', { recursive: true });
for (const file of runtimeFiles) {
  cpSync(`rhythm-game/${file}`, `dist/rhythm-game/${file}`);
}
cpSync('rhythm-game/assets', 'dist/rhythm-game/assets', { recursive: true });
console.log(`Published ${runtimeFiles.length} game runtime files and assets.`);
