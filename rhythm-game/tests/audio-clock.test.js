import test from 'node:test';
import assert from 'node:assert/strict';
import '../audio-clock.js';

class FakeMedia extends EventTarget {
  constructor() {
    super();
    this.readyState = 1;
    this.currentTime = 0;
    this.duration = 69.218005;
    this.paused = true;
    this.ended = false;
    this.muted = false;
    this.error = null;
    this.playError = null;
    this.playCalls = 0;
    this.loadCalls = 0;
  }

  async play() {
    this.playCalls += 1;
    if (this.playError) throw this.playError;
    this.paused = false;
  }

  pause() { this.paused = true; }
  load() { this.loadCalls += 1; }
}

const createClock = (media) => new globalThis.RhythmAudioClock.AudioClock(media);

test('AudioClock starts, pauses, resumes, and resets the injected media', async () => {
  const media = new FakeMedia();
  const clock = createClock(media);
  assert.equal(await clock.whenReady(), 69.218005);
  await clock.unlock();
  await clock.playFromStart();
  assert.equal(clock.paused, false);
  media.currentTime = 12.5;
  clock.pause();
  assert.equal(clock.currentTime, 12.5);
  assert.equal(clock.paused, true);
  await clock.resume();
  assert.equal(clock.paused, false);
  assert.equal(clock.currentTime, 12.5);
  clock.reset();
  assert.equal(clock.currentTime, 0);
  assert.equal(clock.paused, true);
});

test('media timestamps and end state are authoritative on every read', () => {
  const media = new FakeMedia();
  const clock = createClock(media);
  media.currentTime = 31.25;
  assert.equal(clock.currentTime, 31.25);
  media.currentTime = 4.75;
  media.duration = 72;
  media.ended = true;
  assert.equal(clock.currentTime, 4.75);
  assert.equal(clock.duration, 72);
  assert.equal(clock.ended, true);
  media.duration = NaN;
  media.currentTime = NaN;
  assert.equal(clock.duration, 0);
  assert.equal(clock.currentTime, 0);
});

test('whenReady waits for metadata before resolving the loaded duration', async () => {
  const media = new FakeMedia();
  media.readyState = 0;
  media.duration = NaN;
  const clock = createClock(media);
  let resolved = false;
  const ready = clock.whenReady().then((duration) => { resolved = true; return duration; });
  await Promise.resolve();
  assert.equal(resolved, false);
  assert.equal(media.loadCalls, 1);
  media.readyState = 1;
  media.duration = 69.218005;
  media.dispatchEvent(new Event('loadedmetadata'));
  assert.equal(await ready, 69.218005);
});

test('whenReady exposes asynchronous media loading failure', async () => {
  const media = new FakeMedia();
  media.readyState = 0;
  const ready = createClock(media).whenReady();
  const rejected = assert.rejects(ready, /metadata failed to load/i);
  media.error = { code: 4 };
  media.dispatchEvent(new Event('error'));
  await rejected;
});

test('whenReady rejects an existing media error without waiting for another event', async () => {
  const media = new FakeMedia();
  media.error = { code: 4 };
  await assert.rejects(createClock(media).whenReady(), /metadata failed to load/i);
});

test('loaded metadata with no positive finite duration fails readiness', async () => {
  for (const duration of [0, -1, NaN, Infinity]) {
    const media = new FakeMedia();
    media.readyState = 0;
    media.duration = duration;
    const ready = createClock(media).whenReady();
    const rejected = assert.rejects(ready, /duration/i);
    media.dispatchEvent(new Event('loadedmetadata'));
    await rejected;
  }
});

test('unlock starts muted playback synchronously and restores the prior mute state', async () => {
  for (const muted of [false, true]) {
    const media = new FakeMedia();
    media.muted = muted;
    media.currentTime = 8;
    const clock = createClock(media);
    const unlocked = clock.unlock();
    assert.equal(media.playCalls, 1);
    assert.equal(media.muted, true);
    await unlocked;
    assert.equal(clock.currentTime, 0);
    assert.equal(clock.paused, true);
    assert.equal(media.muted, muted);
  }
});

test('unlock restores the prior mute state when playback is denied', async () => {
  const media = new FakeMedia();
  media.currentTime = 8;
  media.playError = new Error('Playback denied');
  await assert.rejects(createClock(media).unlock(), (error) => error === media.playError);
  assert.equal(media.muted, false);
  assert.equal(media.currentTime, 8);
  assert.equal(media.paused, true);
});

test('playFromStart rewinds before playback and exposes a playback rejection', async () => {
  const media = new FakeMedia();
  const clock = createClock(media);
  media.currentTime = 12.5;
  await clock.playFromStart();
  assert.equal(clock.currentTime, 0);
  assert.equal(clock.paused, false);
  clock.pause();
  media.currentTime = 7;
  media.playError = new Error('Playback denied');
  await assert.rejects(clock.playFromStart(), (error) => error === media.playError);
  assert.equal(clock.currentTime, 0);
  assert.equal(clock.paused, true);
});

test('resume preserves the timestamp and exposes a playback rejection', async () => {
  const media = new FakeMedia();
  media.currentTime = 12.5;
  media.playError = new Error('Playback denied');
  const clock = createClock(media);
  await assert.rejects(clock.resume(), (error) => error === media.playError);
  assert.equal(clock.currentTime, 12.5);
  assert.equal(clock.paused, true);
});

test('AudioClock requires an injected media element', () => {
  assert.throws(() => createClock(null), TypeError);
});
