(function () {
  'use strict';

  const Core = globalThis.RhythmGameCore;
  const Chart = globalThis.RhythmGameChart;
  const Audio = globalThis.RhythmAudioClock;
  if (!Core || !Chart || !Audio) {
    throw new Error('RhythmGameCore, RhythmGameChart, and RhythmAudioClock must be loaded before app.js');
  }
  const { AudioClock } = Audio;
  const bgmClock = new AudioClock(document.querySelector('#gameBgm'));
  Core.validateChart(Chart.NOTES, Chart.META);
  const chartMaxScore = Core.calculateChartMaxScore(Chart.NOTES);

  const DESIGN = Object.freeze({ width: 2048, height: 1152 });
  const CANDY_SOURCES = Object.freeze([
    'assets/candies/candy-pink.png',
    'assets/candies/candy-yellow.png',
    'assets/candies/candy-blue.png',
  ]);
  const JUDGEMENT_SOURCES = Object.freeze({
    perfect: 'assets/ui/judgements/perfect.png',
    good: 'assets/ui/judgements/good.png',
    miss: 'assets/ui/judgements/miss.png',
  });
  const COUNTDOWN_SECONDS = 3;
  const SPAWN_GROW_SECONDS = 0.2;
  const SUCCESS_POSE_MS = 250;
  const MISS_POSE_MS = 450;

  const elements = {
    stage: document.querySelector('#gameStage'),
    path: document.querySelector('#travelPath'),
    notes: document.querySelector('#notesLayer'),
    score: document.querySelector('#scoreValue'),
    combo: document.querySelector('#comboValue'),
    pauseButton: document.querySelector('#pauseButton'),
    pauseOverlay: document.querySelector('#pauseOverlay'),
    resumeButton: document.querySelector('#resumeButton'),
    progressHud: document.querySelector('#rhythmProgressHud'),
    ratingStars: Array.from(document.querySelectorAll('[data-rating-star]')),
    ratingStarsLabel: document.querySelector('#ratingStars'),
    musicProgress: document.querySelector('#musicProgress'),
    musicProgressFill: document.querySelector('#musicProgressFill'),
    judgement: document.querySelector('#judgementText'),
    judgementImage: document.querySelector('#judgementImage'),
    countdown: document.querySelector('#countdown'),
    startOverlay: document.querySelector('#startOverlay'),
    startButton: document.querySelector('#startButton'),
    audioLoadError: document.querySelector('#audioLoadError'),
    resultOverlay: document.querySelector('#resultOverlay'),
    resultScore: document.querySelector('#resultScore'),
    resultCombo: document.querySelector('#resultCombo'),
    restartButton: document.querySelector('#restartButton'),
    characterIdle: document.querySelector('#characterIdle'),
    characterHit: document.querySelector('#characterHit'),
    characterMiss: document.querySelector('#characterMiss'),
  };

  const missingElement = Object.entries(elements).find(([, value]) => !value);
  if (missingElement) {
    throw new Error(`Missing required element: ${missingElement[0]}`);
  }
  if (elements.ratingStars.length !== 5) {
    throw new Error(`Expected 5 rating stars, found ${elements.ratingStars.length}`);
  }

  let sfxContext = null;
  let animationFrame = 0;
  let countdownEndTime = 0;
  let status = 'idle';
  let notes = [];
  let scoreState = Core.createScoreState();
  let pathLength = 0;
  let endTangent = { x: -1, y: 0 };
  let characterVersion = 0;
  let judgementVersion = 0;
  let pausedFromStatus = null;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function smoothstep(value) {
    const t = clamp(value, 0, 1);
    return t * t * (3 - 2 * t);
  }

  function configurePath() {
    pathLength = elements.path.getTotalLength();
    const end = elements.path.getPointAtLength(pathLength);
    const beforeEnd = elements.path.getPointAtLength(Math.max(0, pathLength - 8));
    const dx = end.x - beforeEnd.x;
    const dy = end.y - beforeEnd.y;
    const magnitude = Math.hypot(dx, dy) || 1;
    endTangent = { x: dx / magnitude, y: dy / magnitude };
  }

  function resetScore() {
    scoreState = Core.createScoreState();
    renderHud();
  }

  function renderHud() {
    elements.score.textContent = Core.formatHudScore(scoreState.score);
    elements.combo.textContent = String(scoreState.combo);
    renderRatingStars();
  }

  function renderRatingStars() {
    const metrics = Core.calculateRoundMetrics(scoreState, notes.length, chartMaxScore);
    elements.ratingStars.forEach((star, index) => {
      star.classList.toggle('is-earned', index < metrics.starRating);
    });
    elements.ratingStarsLabel.setAttribute(
      'aria-label',
      `Current grade: ${metrics.starRating} of 5 stars`,
    );
  }

  function renderMusicProgress(progress) {
    const value = clamp(progress, 0, 1);
    elements.progressHud.style.setProperty('--music-progress', String(value));
    elements.musicProgress.setAttribute('aria-valuenow', String(Math.round(value * 100)));
  }

  function resetProgressHud() {
    renderMusicProgress(0);
    renderRatingStars();
  }

  function setPauseUi(isPaused) {
    elements.pauseButton.setAttribute('aria-pressed', String(isPaused));
    elements.pauseButton.setAttribute('aria-label', isPaused ? 'Resume game' : 'Pause game');
    elements.pauseOverlay.hidden = !isPaused;
  }

  async function pauseGame() {
    if (status !== 'countdown' && status !== 'playing') return;
    pausedFromStatus = status;
    status = 'paused';
    bgmClock.pause();
    setPauseUi(true);
    window.dispatchEvent(new CustomEvent('rhythmgame:pause'));
    if (sfxContext?.state === 'running') {
      await sfxContext.suspend();
    }
  }

  async function resumeGame() {
    if (status !== 'paused' || !pausedFromStatus) return;
    try {
      if (sfxContext?.state !== 'running') {
        await sfxContext.resume();
      }
      if (pausedFromStatus === 'playing') {
        await bgmClock.resume();
      }
    } catch (error) {
      showAudioLoadError(error);
      return;
    }
    status = pausedFromStatus;
    pausedFromStatus = null;
    setPauseUi(false);
  }

  function setCharacter(kind, durationMs = 0) {
    characterVersion += 1;
    const version = characterVersion;
    elements.characterIdle.classList.toggle('is-active', kind === 'idle');
    elements.characterHit.classList.toggle('is-active', kind === 'hit');
    elements.characterMiss.classList.toggle('is-active', kind === 'miss');

    if (durationMs > 0) {
      window.setTimeout(() => {
        if (characterVersion === version && status !== 'result') {
          setCharacter('idle');
        }
      }, durationMs);
    }
  }

  function showJudgement(value) {
    judgementVersion += 1;
    const version = judgementVersion;
    const label = value === 'perfect' ? 'Perfect' : value === 'good' ? 'Good' : 'Miss';
    elements.judgementImage.src = JUDGEMENT_SOURCES[value];
    elements.judgementImage.alt = label;
    elements.judgement.setAttribute('aria-label', label);
    if (value === 'perfect') {
      elements.judgement.removeAttribute('data-grade');
    } else {
      elements.judgement.dataset.grade = value;
    }
    elements.judgement.classList.remove('is-visible');
    void elements.judgement.offsetWidth;
    elements.judgement.classList.add('is-visible');

    window.setTimeout(() => {
      if (judgementVersion === version) {
        elements.judgement.classList.remove('is-visible');
      }
    }, value === 'miss' ? 450 : 320);
  }

  function createSfxContext() {
    if (!sfxContext) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        throw new Error('This browser does not support Web Audio.');
      }
      sfxContext = new AudioContextClass();
    }
    return sfxContext.resume();
  }

  function playTone(when, frequency, duration, volume, type = 'sine') {
    if (!sfxContext || sfxContext.state !== 'running') return;
    const oscillator = sfxContext.createOscillator();
    const gain = sfxContext.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, when);
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(volume, when + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    oscillator.connect(gain).connect(sfxContext.destination);
    oscillator.start(when);
    oscillator.stop(when + duration + 0.02);
  }

  function fireAttack(strength) {
    window.dispatchEvent(new CustomEvent('rhythmgame:attack', {
      detail: { strength },
    }));
  }

  function createNoteElement(note) {
    const image = document.createElement('img');
    image.className = 'note';
    image.alt = '';
    image.draggable = false;
    const colorIndex = note.id % CANDY_SOURCES.length;
    image.src = CANDY_SOURCES[colorIndex];
    image.addEventListener('error', () => {
      image.removeAttribute('src');
      image.classList.add('note-fallback', `note-fallback-${colorIndex}`);
    }, { once: true });
    image.style.left = '0px';
    image.style.top = '0px';
    elements.notes.appendChild(image);
    note.element = image;
    note.state = 'active';
  }

  function removeNote(note) {
    if (note.element) {
      note.element.remove();
      note.element = null;
    }
  }

  function clearNotes() {
    for (const note of notes) removeNote(note);
    elements.notes.replaceChildren();
  }

  function pointForNote(note, gameTime) {
    const elapsed = gameTime - note.spawnTime;
    if (elapsed <= Core.CONFIG.travelTimeSeconds) {
      const progress = clamp(elapsed / Core.CONFIG.travelTimeSeconds, 0, 1);
      return elements.path.getPointAtLength(pathLength * progress);
    }

    const end = elements.path.getPointAtLength(pathLength);
    const speed = pathLength / Core.CONFIG.travelTimeSeconds;
    const overshoot = (elapsed - Core.CONFIG.travelTimeSeconds) * speed;
    return {
      x: end.x + endTangent.x * overshoot,
      y: end.y + endTangent.y * overshoot,
    };
  }

  function renderNotes(gameTime) {
    for (const note of notes) {
      if (note.state === 'queued' && gameTime >= note.spawnTime) {
        createNoteElement(note);
      }
      if (note.state !== 'active' || !note.element) continue;

      const point = pointForNote(note, gameTime);
      const grow = smoothstep((gameTime - note.spawnTime) / SPAWN_GROW_SECONDS);
      note.element.style.left = `${(point.x / DESIGN.width) * 100}%`;
      note.element.style.top = `${(point.y / DESIGN.height) * 100}%`;
      note.element.style.transform = `scale(${grow})`;
    }
  }

  function resolveNote(note, judgement) {
    note.state = judgement === 'miss' ? 'missed' : 'hit';
    removeNote(note);
    scoreState = Core.applyJudgement(scoreState, judgement);
    renderHud();
    showJudgement(judgement);

    if (judgement === 'miss') {
      setCharacter('miss', MISS_POSE_MS);
    } else {
      setCharacter('hit', SUCCESS_POSE_MS);
      playTone(sfxContext.currentTime, judgement === 'perfect' ? 880 : 660, 0.09, 0.06, 'sine');
    }
  }

  function handleHitInput() {
    if (status !== 'playing') return;
    const gameTime = bgmClock.currentTime;
    let candidate = null;
    let smallestDifference = Infinity;

    for (const note of notes) {
      if (note.state !== 'active') continue;
      const difference = Math.abs(gameTime - note.hitTime);
      if (difference < smallestDifference) {
        smallestDifference = difference;
        candidate = note;
      }
    }

    if (!candidate) {
      fireAttack('weak');
      return;
    }
    const judgement = Core.judgeOffsetMs((gameTime - candidate.hitTime) * 1000);
    if (judgement === 'none') {
      fireAttack('weak');
      return;
    }
    fireAttack(judgement);
    resolveNote(candidate, judgement);
  }

  function expireMissedNotes(gameTime) {
    const lateWindow = Core.CONFIG.goodWindowMs / 1000;
    for (const note of notes) {
      if (note.state === 'active' && gameTime > note.hitTime + lateWindow) {
        resolveNote(note, 'miss');
      }
    }
  }

  function endGame() {
    if (status !== 'playing' && status !== 'paused') return;
    status = 'result';
    pausedFromStatus = null;
    const completionDetail = Core.buildCompletionDetail(scoreState, notes.length, chartMaxScore);
    bgmClock.pause();
    clearNotes();
    setCharacter('idle');
    elements.judgement.classList.remove('is-visible');
    elements.resultScore.textContent = String(scoreState.score);
    elements.resultCombo.textContent = String(scoreState.maxCombo);
    renderMusicProgress(1);
    renderRatingStars();
    elements.progressHud.hidden = true;
    elements.pauseButton.disabled = true;
    setPauseUi(false);
    elements.resultOverlay.hidden = false;
    window.dispatchEvent(new CustomEvent('rhythmgame:complete', {
      detail: completionDetail,
    }));
  }

  function frame() {
    if (status === 'countdown') {
      const remaining = countdownEndTime - sfxContext.currentTime;
      if (remaining > 0) {
        elements.countdown.textContent = String(Math.max(1, Math.ceil(remaining)));
      } else {
        elements.countdown.hidden = true;
        status = 'starting-audio';
        void beginBgmPlayback();
      }
    }

    if (status === 'playing') {
      const gameTime = bgmClock.currentTime;
      renderMusicProgress(Core.calculateMusicProgress(gameTime, bgmClock.duration));
      renderNotes(gameTime);
      expireMissedNotes(gameTime);
    }

    animationFrame = window.requestAnimationFrame(frame);
  }

  function prepareNotes() {
    notes = Chart.NOTES.map((definition) => ({
      ...definition,
      state: 'queued',
      element: null,
      tailElement: null,
      startJudgement: null,
    }));
  }

  function showAudioLoadError(error) {
    status = 'idle';
    pausedFromStatus = null;
    bgmClock.reset();
    clearNotes();
    elements.countdown.hidden = true;
    elements.progressHud.hidden = true;
    elements.pauseButton.disabled = true;
    setPauseUi(false);
    elements.resultOverlay.hidden = true;
    elements.startOverlay.hidden = false;
    elements.audioLoadError.hidden = false;
    elements.startButton.textContent = 'RETRY';
    elements.startButton.disabled = false;
    console.error(error);
  }

  async function beginBgmPlayback() {
    if (status !== 'starting-audio') return;
    try {
      await bgmClock.playFromStart();
      if (status === 'starting-audio') status = 'playing';
    } catch (error) {
      showAudioLoadError(error);
    }
  }

  async function startGame() {
    if (status !== 'idle' && status !== 'result') return;
    try {
      // A failed load needs a fresh media load before readiness can be retried.
      if (bgmClock.media.error) bgmClock.media.load();
      // Start metadata loading before unlock: a later load() cancels pending play.
      const readyPromise = bgmClock.whenReady();
      const unlockPromise = bgmClock.unlock();
      status = 'arming';
      elements.startButton.disabled = true;
      await Promise.all([readyPromise, unlockPromise, createSfxContext()]);
    } catch (error) {
      showAudioLoadError(error);
      return;
    }
    elements.audioLoadError.hidden = true;
    clearNotes();
    resetScore();
    prepareNotes();
    resetProgressHud();
    setCharacter('idle');
    elements.resultOverlay.hidden = true;
    elements.startOverlay.hidden = true;
    elements.progressHud.hidden = false;
    elements.pauseButton.disabled = false;
    setPauseUi(false);
    elements.countdown.hidden = false;
    elements.countdown.textContent = '3';
    countdownEndTime = sfxContext.currentTime + COUNTDOWN_SECONDS;
    status = 'countdown';
  }

  elements.startButton.addEventListener('click', (event) => {
    event.stopPropagation();
    startGame();
  });

  elements.restartButton.addEventListener('click', (event) => {
    event.stopPropagation();
    startGame();
  });

  elements.pauseButton.addEventListener('click', (event) => {
    event.stopPropagation();
    if (status === 'paused') {
      resumeGame();
    } else {
      pauseGame();
    }
  });

  elements.resumeButton.addEventListener('click', (event) => {
    event.stopPropagation();
    resumeGame();
  });

  window.addEventListener('keydown', (event) => {
    if (event.code !== 'Space') return;
    event.preventDefault();
    if (event.repeat) return;
    handleHitInput();
  });

  elements.stage.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || event.target.closest('button')) return;
    handleHitInput();
  });

  window.addEventListener('pagehide', () => {
    bgmClock.pause();
    window.cancelAnimationFrame(animationFrame);
  });

  bgmClock.media.addEventListener('ended', endGame);
  bgmClock.media.addEventListener('error', () => {
    if (['countdown', 'starting-audio', 'playing', 'paused'].includes(status)) {
      showAudioLoadError(new Error('BGM playback failed'));
    }
  });

  configurePath();
  resetScore();
  resetProgressHud();
  elements.progressHud.hidden = true;
  elements.pauseButton.disabled = true;
  setPauseUi(false);
  setCharacter('idle');
  elements.startButton.disabled = true;
  bgmClock.whenReady().then(() => {
    elements.startButton.disabled = false;
  }).catch(showAudioLoadError);
  animationFrame = window.requestAnimationFrame(frame);
})();
