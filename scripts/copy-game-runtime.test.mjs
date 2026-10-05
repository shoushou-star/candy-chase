import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const scriptPath = resolve(dirname(fileURLToPath(import.meta.url)), 'copy-game-runtime.mjs');

test('publishes the standalone runtime and nested assets without publishing tests or clearing existing output', () => {
  const root = mkdtempSync(resolve(tmpdir(), 'game-runtime-publication-'));
  const files = ['index.html', 'app.js', 'game-core.js', 'game-chart.js', 'audio-clock.js',
    'styles.css', 'countdown-assets.js', 'countdown-assets.css', 'magic-attack-d.js', 'magic-attack-d.css'];
  mkdirSync(resolve(root, 'rhythm-game/assets/ui/countdown'), { recursive: true });
  mkdirSync(resolve(root, 'rhythm-game/tests'), { recursive: true });
  mkdirSync(resolve(root, 'dist/rhythm-game'), { recursive: true });
  for (const file of files) writeFileSync(resolve(root, 'rhythm-game', file), `fixture:${file}`);
  writeFileSync(resolve(root, 'rhythm-game/assets/ui/countdown/3.png'), Buffer.from([1, 2, 3]));
  writeFileSync(resolve(root, 'rhythm-game/tests/private.test.js'), 'not runtime');
  writeFileSync(resolve(root, 'rhythm-game/effect-preview.html'), 'not runtime');
  writeFileSync(resolve(root, 'dist/rhythm-game/preserved.txt'), 'existing output');

  const result = spawnSync(process.execPath, [scriptPath], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  for (const file of files) assert.equal(readFileSync(resolve(root, 'dist/rhythm-game', file), 'utf8'), `fixture:${file}`);
  assert.deepEqual(readFileSync(resolve(root, 'dist/rhythm-game/assets/ui/countdown/3.png')), Buffer.from([1, 2, 3]));
  assert.equal(readFileSync(resolve(root, 'dist/rhythm-game/preserved.txt'), 'utf8'), 'existing output');
  assert.equal(existsSync(resolve(root, 'dist/rhythm-game/tests')), false);
  assert.equal(existsSync(resolve(root, 'dist/rhythm-game/effect-preview.html')), false);
});
