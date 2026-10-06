import test from 'node:test';
import assert from 'node:assert/strict';
import '../game-chart.js';

const { META, NOTES } = globalThis.RhythmGameChart;

test('the approved chart has exact duration, counts, and boundaries', () => {
  assert.deepEqual(META, {
    bpm: 120,
    beatSeconds: 0.4992,
    audioDuration: 69.218005,
    firstHitTime: 4.981,
    lastHitTime: 66.8818,
    travelTimeSeconds: 2,
  });
  assert.equal(NOTES.length, 80);
  assert.equal(NOTES.filter((note) => note.type === 'normal').length, 48);
  assert.equal(NOTES.filter((note) => note.type === 'speed').length, 20);
  assert.equal(NOTES.filter((note) => note.type === 'hold').length, 12);
  assert.deepEqual(NOTES.map((note) => note.beatIndex), [
    0, 2, 4, 6, 8, 10, 11, 13, 14, 16, 17, 19, 20, 21, 23, 24,
    25, 27, 28, 29, 31, 32, 33, 35, 36, 37, 39, 40, 41, 43, 44, 45,
    47, 48, 49, 51, 52, 53, 55, 56, 57, 59, 60, 61, 63, 64, 65, 67,
    68, 69, 71, 72, 73, 74, 75, 76, 79, 80, 83, 84, 87, 88, 91, 92,
    95, 96, 99, 100, 103, 104, 107, 108, 111, 112, 115, 116, 119, 120,
    123, 124,
  ]);
  assert.deepEqual(NOTES.filter((note) => note.type === 'speed').map((note) => note.beatIndex), [
    21, 25, 29, 33, 37, 41, 45, 49, 53, 57, 61, 65, 69, 73, 79, 87, 95, 103, 111, 119,
  ]);
  assert.deepEqual(NOTES.filter((note) => note.type === 'hold').map((note) => note.beatIndex), [
    76, 80, 84, 88, 92, 96, 100, 104, 108, 112, 116, 120,
  ]);
  assert.deepEqual(NOTES[0], {
    id: 0, beatIndex: 0, type: 'normal', spawnTime: 2.981, hitTime: 4.981,
    holdEndTime: null, accelerationAt: null,
  });
  assert.deepEqual(NOTES.find((note) => note.beatIndex === 21), {
    id: 13, beatIndex: 21, type: 'speed', spawnTime: 13.4642, hitTime: 15.4642,
    holdEndTime: null, accelerationAt: 14.7642,
  });
  assert.equal(NOTES.at(-1).hitTime, 66.8818);
  assert.equal(Object.isFrozen(globalThis.RhythmGameChart), true);
  assert.equal(Object.isFrozen(META), true);
  assert.equal(Object.isFrozen(NOTES), true);

  NOTES.forEach((note, index) => {
    assert.equal(note.id, index);
    assert.equal(Object.isFrozen(note), true);
    assert.equal(note.hitTime, Number((4.981 + note.beatIndex * 0.4992).toFixed(4)));
    assert.equal(note.spawnTime, Number((note.hitTime - 2).toFixed(4)));
    assert.equal(note.accelerationAt, note.type === 'speed'
      ? Number((note.spawnTime + 1.3).toFixed(4))
      : null);
    if (note.type !== 'hold') assert.equal(note.holdEndTime, null);
  });
});

test('holds last two beats and never overlap another judgement', () => {
  for (const note of NOTES.filter((entry) => entry.type === 'hold')) {
    assert.equal(note.holdEndTime, Number((note.hitTime + 0.9984).toFixed(4)));
    assert.equal(
      NOTES.some((other) => other.id !== note.id
        && other.hitTime > note.hitTime
        && other.hitTime <= note.holdEndTime),
      false,
    );
  }
});
