import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const project = path.dirname(fileURLToPath(import.meta.url));
const appSource = fs.readFileSync(path.join(project, 'app.js'), 'utf8');
const effectSource = fs.readFileSync(path.join(project, 'magic-attack-d.js'), 'utf8');
const htmlSource = fs.readFileSync(path.join(project, 'index.html'), 'utf8');
const styleSource = fs.readFileSync(path.join(project, 'styles.css'), 'utf8');

function effectHarness({ hostWidth = 2048, hostHeight = 1152, outerScale = 1 } = {}) {
  const listeners = new Map();
  const frames = new Map();
  const painted = [];
  const classes = new Set();
  let nextFrame = 0;
  let currentPath = null;
  let parentMutation;
  const context = {
    setTransform() {}, save() {}, restore() {}, translate() {}, rotate() {},
    beginPath() { currentPath = null; }, moveTo() {}, lineTo() {}, quadraticCurveTo() {},
    arc(x, y, radius) { currentPath = { x, y, radius }; },
    fill() { painted.push({ ...currentPath, alpha: this.globalAlpha }); },
    stroke() { painted.push({ line: true, alpha: this.globalAlpha }); },
    clearRect() { painted.length = 0; },
  };
  const canvas = {
    classList: { add(value) { classes.add(value); }, remove(value) { classes.delete(value); } },
    setAttribute() {}, getContext() { return context; },
  };
  const host = {
    style: {}, appendChild() {},
    getBoundingClientRect() { return { x: 0, y: 0, left: 0, top: 0, width: hostWidth, height: hostHeight }; },
  };
  const sandbox = {
    document: {
      readyState: 'complete', images: [], body: host,
      querySelector(selector) { return selector.startsWith('.game-shell') ? host : null; },
      createElement() { return canvas; },
    },
    getComputedStyle() { return { position: 'relative' }; },
    matchMedia() { return { matches: false }; },
    performance: { now() { return 0; } },
    requestAnimationFrame(callback) { frames.set(++nextFrame, callback); return nextFrame; },
    cancelAnimationFrame(id) { frames.delete(id); },
    MutationObserver: class {
      constructor(callback) { parentMutation = callback; }
      observe() {} disconnect() {}
    },
  };
  sandbox.window = {
    devicePixelRatio: 1,
    frameElement: outerScale === 1 ? null : {
      clientWidth: hostWidth, clientHeight: hostHeight,
      getBoundingClientRect() { return { width: hostWidth * outerScale, height: hostHeight * outerScale }; },
    },
    parent: { addEventListener() {} },
    addEventListener(type, callback) { listeners.set(type, callback); },
  };
  vm.runInNewContext(effectSource, sandbox);
  return {
    painted, classes, frames, canvas,
    parentScale(value) { outerScale = value; parentMutation?.(); },
    emit(type, detail) { listeners.get(type)({ detail }); },
    advance(now) {
      const pending = [...frames.values()];
      frames.clear();
      pending.forEach((callback) => callback(now));
    },
  };
}

test('embedded attack canvas uses displayed pixels, matching standalone particles and endpoints', () => {
  const embedded = effectHarness({ outerScale: 0.625 });
  const standalone = effectHarness({ hostWidth: 1280, hostHeight: 720 });
  assert.equal(embedded.canvas.width, standalone.canvas.width);
  assert.equal(embedded.canvas.height, standalone.canvas.height);
  for (const effect of [embedded, standalone]) {
    effect.emit('rhythmgame:attack', { strength: 'perfect', phase: 'hold-start' });
    effect.advance(100);
  }
  assert.deepEqual(embedded.painted[4], standalone.painted[4], 'wave head size and position must match at equal displayed sizes');
});

test('updates particle resolution after the parent commits a new CSS transform', () => {
  const effect = effectHarness({ outerScale: 0.9 });
  effect.parentScale(0.625);
  effect.advance(0);
  assert.equal(effect.canvas.width, 1280);
  assert.equal(effect.canvas.height, 720);
});

for (const strength of ['perfect', 'good']) {
  test(`successful ${strength} hold-end immediately paints a bounded endpoint flash and cleans it`, () => {
    const effect = effectHarness();
    effect.emit('rhythmgame:attack', { strength, phase: 'hold-start' });
    effect.advance(100);
    assert.ok(effect.classes.has('is-holding'));
    effect.emit('rhythmgame:attack', { strength, phase: 'hold-end' });
    assert.equal(effect.classes.has('is-holding'), false);
    assert.ok(effect.painted.some((shape) => shape.alpha > 0 && shape.x === 1034 && shape.y === 548),
      'hold-end must visibly paint the judgement endpoint immediately');
    assert.ok(effect.painted.every((shape) => !shape.line), 'finish must replace the sustained connection');
    effect.advance(130);
    assert.ok(effect.painted.some((shape) => shape.alpha > 0), 'finish must remain visible during its short lifetime');
    assert.ok(effect.painted.filter((shape) => shape.radius).every((shape) =>
      Math.hypot(shape.x - 1034, shape.y - 548) + shape.radius < 60),
    'finish particles must stay near the judgement endpoint');
    effect.advance(400);
    assert.equal(effect.painted.length, 0, 'finish flash must be blank within 400ms');
    assert.equal(effect.frames.size, 0, 'finish flash must release its animation frame');
  });
}

test('Miss hold-end clears without success flash', () => {
  const effect = effectHarness();
  effect.emit('rhythmgame:attack', { strength: 'perfect', phase: 'hold-start' });
  effect.advance(100);
  effect.emit('rhythmgame:attack', { strength: 'miss', phase: 'hold-end' });
  assert.equal(effect.painted.length, 0);
  assert.equal(effect.frames.size, 0);
});

for (const type of ['rhythmgame:pause', 'rhythmgame:reset', 'rhythmgame:complete']) {
  test(`${type} clears the hold finish flash immediately`, () => {
    const effect = effectHarness();
    effect.emit('rhythmgame:attack', { strength: 'perfect', phase: 'hold-end' });
    assert.ok(effect.painted.length > 0, 'cleanup must start from a visible finish flash');
    effect.emit(type);
    assert.equal(effect.painted.length, 0);
    assert.equal(effect.frames.size, 0);
    assert.equal(effect.classes.has('is-holding'), false);
  });
}

test('app.js remains the only keyboard and pointer input owner', () => {
  assert.match(appSource, /listen\(window,\s*['"]keydown['"]/);
  assert.match(appSource, /listen\(elements\.stage,\s*['"]pointerdown['"]/);
  assert.doesNotMatch(effectSource, /addEventListener\(['"]keydown['"]/);
  assert.doesNotMatch(effectSource, /addEventListener\(['"]pointerdown['"]/);
});

test('valid gameplay input dispatches one semantic attack event with strength', () => {
  assert.match(appSource, /CustomEvent\(['"]rhythmgame:attack['"]/);
  assert.match(appSource, /detail:\s*\{\s*strength,\s*phase\s*\}/);
  assert.match(effectSource, /addEventListener\(['"]rhythmgame:attack['"]/);
});

test('app owns release input and exposes semantic hold phases', () => {
  assert.match(appSource, /listen\(window,\s*['"]keyup['"]/);
  assert.match(appSource, /listen\(window,\s*['"]pointerup['"]/);
  assert.match(appSource, /listen\(window,\s*['"]pointercancel['"]/);
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
