import test from 'node:test';
import assert from 'node:assert/strict';
import '../embed-bridge.js';

function harness() {
  const window = new EventTarget();
  const sent = [];
  window.location = { origin: 'https://game.example' };
  window.parent = { postMessage(data, origin) { sent.push({ data, origin }); } };
  let finishPreparation;
  const preparation = new Promise((resolve) => { finishPreparation = resolve; });
  let starts = 0;
  let cleanups = 0;
  const bridge = globalThis.RhythmEmbedBridge.createEmbedBridge({
    window, runId: 7, prepare: () => preparation,
    start: () => { starts += 1; }, dispose: () => { cleanups += 1; },
  });
  function message(data, source = window.parent, origin = window.location.origin) {
    const event = new Event('message');
    Object.assign(event, { data, source, origin });
    window.dispatchEvent(event);
  }
  return { window, sent, bridge, message, finishPreparation,
    get starts() { return starts; }, get cleanups() { return cleanups; } };
}

test('waits for preparation before announcing ready exactly once with the same-origin target', async () => {
  const game = harness();
  assert.deepEqual(game.sent, []);
  game.message({ type: 'rhythmgame:start', runId: 7 });
  assert.equal(game.starts, 0);
  game.finishPreparation();
  await game.bridge.ready;
  assert.deepEqual(game.sent, [{ data: { type: 'rhythmgame:ready', runId: 7 }, origin: 'https://game.example' }]);
  game.bridge.dispose();
});

test('only the current same-origin parent start can start the round, once', async () => {
  const game = harness();
  game.finishPreparation();
  await game.bridge.ready;
  game.message({ type: 'rhythmgame:start', runId: 7 }, {});
  game.message({ type: 'rhythmgame:start', runId: 7 }, game.window.parent, 'https://other.example');
  game.message({ type: 'rhythmgame:start', runId: 6 });
  game.message({ type: 'rhythmgame:ready', runId: 7 });
  game.message(null);
  assert.equal(game.starts, 0);
  game.message({ type: 'rhythmgame:start', runId: 7 });
  game.message({ type: 'rhythmgame:start', runId: 7 });
  assert.equal(game.starts, 1);
  game.bridge.dispose();
});

test('forwards the original complete result once only after the round has started', async () => {
  const game = harness();
  const result = { finalScore: 80, maxCombo: 1, perfect: 0, good: 1, miss: 0,
    accuracy: 80, repairPercent: 80, starRating: 4, totalNotes: 1, judgedNotes: 1 };
  const complete = () => {
    const event = new Event('rhythmgame:complete');
    event.detail = result;
    game.window.dispatchEvent(event);
  };
  complete();
  game.finishPreparation();
  await game.bridge.ready;
  assert.equal(game.sent.length, 1);
  game.message({ type: 'rhythmgame:start', runId: 7 });
  complete();
  complete();
  assert.equal(game.sent.length, 2);
  assert.strictEqual(game.sent[1].data.result, result);
  assert.deepEqual(game.sent[1], { data: { type: 'rhythmgame:complete', runId: 7, result }, origin: 'https://game.example' });
  game.bridge.dispose();
});

test('dispose cancels pending ready and all input, and cleans the game once', async () => {
  const game = harness();
  game.bridge.dispose();
  game.bridge.dispose();
  game.finishPreparation();
  await game.bridge.ready;
  game.message({ type: 'rhythmgame:start', runId: 7 });
  game.window.dispatchEvent(new Event('rhythmgame:complete'));
  assert.deepEqual(game.sent, []);
  assert.equal(game.starts, 0);
  assert.equal(game.cleanups, 1);
});

test('pagehide disposes an active bridge and stops future messages', async () => {
  const game = harness();
  game.finishPreparation();
  await game.bridge.ready;
  game.window.dispatchEvent(new Event('pagehide'));
  game.message({ type: 'rhythmgame:start', runId: 7 });
  assert.equal(game.starts, 0);
  assert.equal(game.cleanups, 1);
});
