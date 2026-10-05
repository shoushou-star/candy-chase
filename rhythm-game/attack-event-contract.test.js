import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const project = path.dirname(fileURLToPath(import.meta.url));
const appSource = fs.readFileSync(path.join(project, 'app.js'), 'utf8');
const effectSource = fs.readFileSync(path.join(project, 'magic-attack-d.js'), 'utf8');
const htmlSource = fs.readFileSync(path.join(project, 'index.html'), 'utf8');
const styleSource = fs.readFileSync(path.join(project, 'styles.css'), 'utf8');

test('app.js remains the only keyboard and pointer input owner', () => {
  assert.match(appSource, /addEventListener\(['"]keydown['"]/);
  assert.match(appSource, /addEventListener\(['"]pointerdown['"]/);
  assert.doesNotMatch(effectSource, /addEventListener\(['"]keydown['"]/);
  assert.doesNotMatch(effectSource, /addEventListener\(['"]pointerdown['"]/);
});

test('valid gameplay input dispatches one semantic attack event with strength', () => {
  assert.match(appSource, /CustomEvent\(['"]rhythmgame:attack['"]/);
  assert.match(appSource, /detail:\s*\{\s*strength,\s*phase\s*\}/);
  assert.match(effectSource, /addEventListener\(['"]rhythmgame:attack['"]/);
});

test('app owns release input and exposes semantic hold phases', () => {
  assert.match(appSource, /addEventListener\(['"]keyup['"]/);
  assert.match(appSource, /addEventListener\(['"]pointerup['"]/);
  assert.match(appSource, /addEventListener\(['"]pointercancel['"]/);
  assert.match(appSource, /fireAttack\([^;]+['"]hold-start['"]\)/);
  assert.match(appSource, /fireAttack\([^;]+['"]hold-end['"]\)/);
  assert.doesNotMatch(effectSource, /addEventListener\(['"]keyup['"]/);
  assert.doesNotMatch(effectSource, /addEventListener\(['"]pointerup['"]/);
  assert.doesNotMatch(effectSource, /addEventListener\(['"]pointercancel['"]/);
});

test('effect renderer cleans up sustained feedback at restart and audio failure', () => {
  assert.match(effectSource, /addEventListener\(['"]rhythmgame:reset['"],\s*clearEffects/);
  assert.match(appSource, /CustomEvent\(['"]rhythmgame:reset['"]/);
});

test('effect renderer clears on the existing game-complete event', () => {
  assert.match(effectSource, /addEventListener\(['"]rhythmgame:complete['"],\s*clearEffects/);
});

test('pausing dispatches a semantic event that clears active attack particles', () => {
  assert.match(appSource, /CustomEvent\(['"]rhythmgame:pause['"]/);
  assert.match(effectSource, /addEventListener\(['"]rhythmgame:pause['"],\s*clearEffects/);
});

test('legacy SVG attack renderer and layer are removed', () => {
  assert.doesNotMatch(appSource, /attackLayer|createAttackWavePath|addBladeAndGlitter/);
  assert.doesNotMatch(htmlSource, /id=['"]attackLayer['"]/);
  assert.doesNotMatch(styleSource, /\.attack-layer|\.attack-beam|\.attack-blade/);
});
