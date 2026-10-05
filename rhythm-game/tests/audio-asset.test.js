import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const audioPath = path.join(projectDir, 'assets', 'audio', 'game-bgm.m4a');
const html = fs.readFileSync(path.join(projectDir, 'index.html'), 'utf8');

test('the complete BGM is packaged and wired with a relative URL', () => {
  assert.equal(fs.existsSync(audioPath), true);
  assert.ok(fs.statSync(audioPath).size > 500_000);
  assert.match(html, /<audio[^>]+id="gameBgm"[^>]+preload="auto"[^>]+src="assets\/audio\/game-bgm\.m4a"/);
  assert.doesNotMatch(html, /C:\\Users\\25283/);
});
