import test from 'node:test';
import assert from 'node:assert/strict';
import '../game-core.js';
import '../game-chart.js';

const {
  CONFIG,
  judgeOffsetMs,
  buildBeatSchedule,
  createScoreState,
  applyJudgement,
  calculateMusicProgress,
  calculateRoundMetrics,
  buildCompletionDetail,
  formatHudScore,
  validateChart,
  travelProgress,
  combineHoldJudgements,
  applyNoteResult,
  calculateChartMaxScore,
} = globalThis.RhythmGameCore;

test('judgeOffsetMs includes both positive and negative Perfect boundaries', () => {
  assert.equal(judgeOffsetMs(-100), 'perfect');
  assert.equal(judgeOffsetMs(100), 'perfect');
});

test('judgeOffsetMs includes both positive and negative Good boundaries', () => {
  assert.equal(judgeOffsetMs(-200), 'good');
  assert.equal(judgeOffsetMs(200), 'good');
});

test('judgeOffsetMs returns none immediately outside the Good window', () => {
  assert.equal(judgeOffsetMs(-201), 'none');
  assert.equal(judgeOffsetMs(201), 'none');
});

test('buildBeatSchedule creates the 116 playable beats for the default round', () => {
  const schedule = buildBeatSchedule();

  assert.equal(CONFIG.bpm, 120);
  assert.equal(CONFIG.durationSeconds, 60);
  assert.equal(CONFIG.travelTimeSeconds, 2);
  assert.equal(schedule.length, 116);
  assert.equal(schedule[0].spawnTime, 0);
  assert.equal(schedule[0].hitTime, 2);
  assert.equal(schedule[1].hitTime - schedule[0].hitTime, 0.5);
  assert.equal(schedule.at(-1).hitTime, 59.5);
});

test('applyJudgement updates score, combo, best combo and hit counters', () => {
  let state = createScoreState();

  state = applyJudgement(state, 'perfect');
  assert.deepEqual(state, {
    score: 100,
    combo: 1,
    maxCombo: 1,
    perfect: 1,
    good: 0,
    miss: 0,
    resolvedMaxScore: 100,
  });

  state = applyJudgement(state, 'good');
  assert.deepEqual(state, {
    score: 150,
    combo: 2,
    maxCombo: 2,
    perfect: 1,
    good: 1,
    miss: 0,
    resolvedMaxScore: 200,
  });
});

test('Miss resets current combo without reducing score or maximum combo', () => {
  const beforeMiss = applyJudgement(
    applyJudgement(createScoreState(), 'perfect'),
    'good',
  );
  const afterMiss = applyJudgement(beforeMiss, 'miss');

  assert.deepEqual(afterMiss, {
    score: 150,
    combo: 0,
    maxCombo: 2,
    perfect: 1,
    good: 1,
    miss: 1,
    resolvedMaxScore: 300,
  });
});

test('none represents an empty press and leaves score state unchanged', () => {
  const state = applyJudgement(createScoreState(), 'perfect');
  const afterEmptyPress = applyJudgement(state, 'none');

  assert.deepEqual(afterEmptyPress, state);
  assert.notEqual(afterEmptyPress, state);
});

test('calculateMusicProgress clamps the audio-clock position to the round', () => {
  assert.equal(calculateMusicProgress(-1, 60), 0);
  assert.equal(calculateMusicProgress(0, 60), 0);
  assert.equal(calculateMusicProgress(30, 60), 0.5);
  assert.equal(calculateMusicProgress(60, 60), 1);
  assert.equal(calculateMusicProgress(61, 60), 1);
});

test('calculateRoundMetrics uses weighted accuracy and actual schedule capacity', () => {
  const metrics = calculateRoundMetrics({
    score: 250,
    combo: 0,
    maxCombo: 2,
    perfect: 2,
    good: 1,
    miss: 1,
  }, 5);

  assert.deepEqual(metrics, {
    accuracy: 62.5,
    repairPercent: 50,
    starRating: 2,
  });
});

test('calculateRoundMetrics applies the approved grade boundaries', () => {
  const stateForPercent = (percent) => ({
    score: percent,
    combo: 0,
    maxCombo: 0,
    perfect: 0,
    good: 0,
    miss: 0,
  });

  assert.equal(calculateRoundMetrics(stateForPercent(19.99), 1).starRating, 0);
  assert.equal(calculateRoundMetrics(stateForPercent(20), 1).starRating, 1);
  assert.equal(calculateRoundMetrics(stateForPercent(40), 1).starRating, 2);
  assert.equal(calculateRoundMetrics(stateForPercent(60), 1).starRating, 3);
  assert.equal(calculateRoundMetrics(stateForPercent(75), 1).starRating, 4);
  assert.equal(calculateRoundMetrics(stateForPercent(90), 1).starRating, 5);
});

test('buildCompletionDetail exposes the complete future result-page contract', () => {
  const detail = buildCompletionDetail({
    score: 250,
    combo: 0,
    maxCombo: 3,
    perfect: 2,
    good: 1,
    miss: 1,
  }, 5);

  assert.deepEqual(detail, {
    finalScore: 250,
    maxCombo: 3,
    perfect: 2,
    good: 1,
    miss: 1,
    accuracy: 62.5,
    repairPercent: 50,
    starRating: 2,
    totalNotes: 5,
    judgedNotes: 4,
  });
});

test('formatHudScore uses readable thousands separators without legacy zero padding', () => {
  assert.equal(formatHudScore(0), '0');
  assert.equal(formatHudScore(7200), '7,200');
  assert.equal(formatHudScore(623736), '623,736');
  assert.equal(formatHudScore(-50), '0');
  assert.equal(formatHudScore(Number.NaN), '0');
});

test('validateChart accepts the approved chart and rejects overlapping hold judgements', () => {
  assert.equal(validateChart(globalThis.RhythmGameChart.NOTES, globalThis.RhythmGameChart.META), true);
  assert.throws(() => validateChart([
    { id: 0, type: 'hold', spawnTime: 0, hitTime: 2, holdEndTime: 3, accelerationAt: null },
    { id: 1, type: 'normal', spawnTime: 1, hitTime: 2.5, holdEndTime: null, accelerationAt: null },
  ], { audioDuration: 10 }), /hold judgement overlap/);
});

test('validateChart enforces note identity, type, finite times and chart ordering', () => {
  const note = { id: 0, type: 'normal', spawnTime: 0, hitTime: 2 };
  const invalidCharts = [
    { notes: null, error: /non-empty array/ },
    { notes: [], error: /non-empty array/ },
    { notes: [note, { ...note, hitTime: 3 }], error: /duplicate chart note id/ },
    { notes: [{ ...note, type: 'unknown' }], error: /unknown chart note type/ },
    { notes: [{ ...note, spawnTime: NaN }], error: /times must be finite/ },
    { notes: [{ ...note, hitTime: Infinity }], error: /times must be finite/ },
    { notes: [{ ...note, spawnTime: 3 }], error: /must be ordered/ },
    { notes: [note, { ...note, id: 1, hitTime: 1 }], error: /must be ordered/ },
    { notes: [{ ...note, hitTime: 11 }], error: /exceeds audio/ },
  ];
  for (const { notes, error } of invalidCharts) {
    assert.throws(() => validateChart(notes, { audioDuration: 10 }), error);
  }
  assert.equal(validateChart([{ ...note, hitTime: 10 }], { audioDuration: 10 }), true);
});

test('validateChart requires a hold end after its head and protects the release boundary', () => {
  const hold = { id: 0, type: 'hold', spawnTime: 0, hitTime: 2, holdEndTime: 3 };
  for (const holdEndTime of [undefined, NaN, Infinity, 1, 2]) {
    assert.throws(() => validateChart([{ ...hold, holdEndTime }], { audioDuration: 10 }), /hold end must follow hit time/);
  }
  assert.throws(() => validateChart([
    hold, { id: 1, type: 'normal', spawnTime: 1, hitTime: 3 },
  ], { audioDuration: 10 }), /hold judgement overlap/);
  assert.equal(validateChart([
    hold, { id: 1, type: 'normal', spawnTime: 1.01, hitTime: 3.01 },
  ], { audioDuration: 10 }), true);
});

test('validateChart requires speed acceleration strictly inside its travel interval', () => {
  const speed = { id: 0, type: 'speed', spawnTime: 0, hitTime: 2, accelerationAt: 1.3 };
  for (const accelerationAt of [undefined, NaN, Infinity, -1, 0, 2, 3]) {
    assert.throws(() => validateChart([{ ...speed, accelerationAt }], { audioDuration: 10 }), /speed acceleration must occur during travel/);
  }
  assert.equal(validateChart([speed], { audioDuration: 10 }), true);
});

test('speed progress is slow before 65 percent and still reaches one on time', () => {
  const note = { type: 'speed', spawnTime: 10, hitTime: 12 };
  assert.equal(travelProgress(note, 10, 2), 0);
  assert.equal(travelProgress(note, 11.3, 2), 0.35);
  assert.equal(travelProgress(note, 12, 2), 1);
});

test('travelProgress clamps all note types and uses the approved speed curve', () => {
  for (const type of ['normal', 'hold', 'speed']) {
    const note = { type, spawnTime: 10, hitTime: 12 };
    assert.equal(travelProgress(note, 9), 0);
    assert.equal(travelProgress(note, 13), 1);
  }
  assert.equal(travelProgress({ type: 'normal', spawnTime: 10 }, 11), 0.5);
  assert.equal(travelProgress({ type: 'hold', spawnTime: 10 }, 12, 4), 0.5);
  const speed = { type: 'speed', spawnTime: 10 };
  assert.equal(travelProgress(speed, 10.65, 2), 0.175);
  assert.equal(travelProgress(speed, 11.65, 2), 0.675);
});

test('combineHoldJudgements applies the approved score matrix', () => {
  assert.deepEqual(combineHoldJudgements('perfect', 'perfect'), {
    judgement: 'perfect', points: 200, maxPoints: 200,
  });
  assert.deepEqual(combineHoldJudgements('perfect', 'good'), {
    judgement: 'good', points: 150, maxPoints: 200,
  });
  assert.deepEqual(combineHoldJudgements('good', 'miss'), {
    judgement: 'miss', points: 50, maxPoints: 200,
  });
  for (const [start, end, judgement, points] of [
    ['good', 'perfect', 'good', 150],
    ['good', 'good', 'good', 100],
    ['perfect', 'miss', 'miss', 100],
    ['miss', 'perfect', 'miss', 100],
    ['miss', 'good', 'miss', 50],
    ['miss', 'miss', 'miss', 0],
  ]) {
    assert.deepEqual(combineHoldJudgements(start, end), { judgement, points, maxPoints: 200 });
  }
});

test('applyNoteResult increments combo once for a completed hold', () => {
  const initial = createScoreState();
  assert.equal(initial.resolvedMaxScore, 0);
  const next = applyNoteResult(initial, {
    judgement: 'perfect', points: 200, maxPoints: 200,
  });
  assert.equal(next.score, 200);
  assert.equal(next.combo, 1);
  assert.equal(next.maxCombo, 1);
  assert.equal(next.perfect, 1);
  assert.equal(next.good, 0);
  assert.equal(next.miss, 0);
  assert.equal(next.resolvedMaxScore, 200);
  assert.equal(initial.score, 0);
  assert.equal(initial.resolvedMaxScore, 0);
});

test('applyNoteResult keeps partial hold points but counts a miss once and resets combo', () => {
  const before = applyNoteResult(createScoreState(), { judgement: 'good', points: 150, maxPoints: 200 });
  const after = applyNoteResult(before, { judgement: 'miss', points: 50, maxPoints: 200 });
  assert.deepEqual(after, {
    score: 200, combo: 0, maxCombo: 1, perfect: 0, good: 1, miss: 1, resolvedMaxScore: 400,
  });
  assert.equal(before.score, 150);
  assert.equal(before.combo, 1);
  assert.throws(() => applyNoteResult(before, { judgement: 'unknown', points: 0, maxPoints: 100 }), /Unknown judgement/);
  assert.throws(() => applyJudgement(before, 'unknown'), /Unknown judgement/);
});

test('the approved chart maximum is 9200', () => {
  assert.equal(calculateChartMaxScore(globalThis.RhythmGameChart.NOTES), 9200);
  assert.equal(calculateChartMaxScore([]), 0);
  assert.equal(calculateChartMaxScore([{ type: 'normal' }, { type: 'speed' }, { type: 'hold' }]), 400);
});

test('weighted metrics use earned points and resolved capacity, including partial hold misses', () => {
  const state = {
    score: 200, combo: 0, maxCombo: 1, perfect: 0, good: 1, miss: 1, resolvedMaxScore: 400,
  };
  assert.deepEqual(calculateRoundMetrics(state, 80, 9200), {
    accuracy: 50, repairPercent: 2.17, starRating: 0,
  });
  assert.deepEqual(buildCompletionDetail(state, 80, 9200), {
    finalScore: 200, maxCombo: 1, perfect: 0, good: 1, miss: 1,
    accuracy: 50, repairPercent: 2.17, starRating: 0, totalNotes: 80, judgedNotes: 2,
  });
});

test('metrics handle empty rounds and clamp excessive points', () => {
  assert.deepEqual(calculateRoundMetrics(createScoreState(), 0, 0), {
    accuracy: 0, repairPercent: 0, starRating: 0,
  });
  assert.deepEqual(calculateRoundMetrics({ ...createScoreState(), score: 300, resolvedMaxScore: 200 }, 1, 200), {
    accuracy: 100, repairPercent: 100, starRating: 5,
  });
});
