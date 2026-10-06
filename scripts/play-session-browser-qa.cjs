/* Real App integration QA. No package installation; use local or bundled Playwright. */
const { mkdirSync, writeFileSync, readFileSync, readdirSync } = require('node:fs');
const { resolve, join } = require('node:path');
const { createHash } = require('node:crypto');
const assert = require('node:assert/strict');
let playwright;
try { playwright = require('playwright'); }
catch { playwright = require('C:/Users/25283/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'); }
const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:4176';
const mode = process.env.QA_MODE ?? (new URL(BASE_URL).port === '4180' ? 'production' : 'development');
if (!['development', 'production'].includes(mode)) throw new Error('QA_MODE must be development or production');
const onlyDialogs = process.env.QA_CASES === 'dialogs';
const onlySettlement = process.env.QA_CASES === 'settlement';
const output = resolve('docs/qa/play-session', onlySettlement ? `final-fix-${mode}` : onlyDialogs ? `${mode}-dialog-regression` : mode);
mkdirSync(output, { recursive: true });
const sizes = [[2048, 1152], [1920, 1080], [1366, 768], [1280, 720]];
const fields = ['finalScore', 'maxCombo', 'perfect', 'good', 'miss', 'accuracy', 'repairPercent', 'starRating', 'totalNotes', 'judgedNotes'];
const zero = { finalScore: 0, maxCombo: 0, perfect: 0, good: 0, miss: 80, accuracy: 0, repairPercent: 0, starRating: 0, totalNotes: 80, judgedNotes: 80 };
const report = { baseUrl: BASE_URL, mode, startedAt: new Date().toISOString(), cases: [], screenshots: [], resources: [], limits: ['Headless Edge: speaker listening and touchscreen not tested.', 'Actual OS/background hidden state and actual browser-policy denial are not established by injected cases.'] };
let browser;
const progress = (message) => process.stdout.write(`[${mode}] ${message}\n`);
async function context(name, setup) {
  const ctx = await browser.newContext({ viewport: { width: 2048, height: 1152 } });
  await ctx.addInitScript(() => {
    window.__qa = { messages: [], media: [] };
    window.addEventListener('message', (event) => {
      if (event.data?.type?.startsWith('rhythmgame:')) window.__qa.messages.push({ at: performance.now(), data: event.data, sameOrigin: event.origin === location.origin, fromCurrentFrame: event.source === document.querySelector('iframe')?.contentWindow });
    });
    for (const type of ['play', 'playing', 'pause', 'ended', 'error']) document.addEventListener(type, (event) => {
      if (!(event.target instanceof HTMLMediaElement)) return;
      const media = event.target;
      window.__qa.media.push({ at: performance.now(), type, src: media.currentSrc || media.src, time: media.currentTime, duration: media.duration, muted: media.muted, volume: media.volume });
    }, true);
  });
  if (setup) await setup(ctx);
  const page = await ctx.newPage();
  const item = { name, consoleErrors: [], pageErrors: [], requestfailed: [], abortedMediaRequests: [], httpErrors: [] };
  report.cases.push(item);
  page.on('console', msg => { if (msg.type() === 'error') item.consoleErrors.push(msg.text()); });
  page.on('pageerror', error => item.pageErrors.push(error.message));
  page.on('requestfailed', req => {
    const entry = { url: req.url(), error: req.failure()?.errorText, resourceType: req.resourceType() };
    if (entry.error === 'net::ERR_ABORTED' && entry.resourceType === 'media') item.abortedMediaRequests.push(entry);
    else item.requestfailed.push(entry);
  });
  page.on('response', res => { if (res.status() >= 400) item.httpErrors.push({ url: res.url(), status: res.status() }); });
  return { ctx, page, item };
}
async function idle(page) { await page.locator('[data-testid="screen-transition"][data-phase="idle"]').waitFor(); }
async function screen(page, value) { await page.locator(`[data-testid="app-screen"][data-screen="${value}"]`).waitFor({ state: 'attached', timeout: 25000 }); await idle(page); }
async function boot(page) {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: '开始加载', exact: true }).click();
  await page.getByRole('button', { name: 'CLICK TO START', exact: true }).click({ timeout: 20000 });
  await screen(page, 'lobby');
}
async function select(page, exercise = false) {
  await boot(page);
  await page.getByRole('button', { name: '开始游戏', exact: true }).click();
  await screen(page, 'hero-select');
  await page.getByRole('button', { name: '确认选择 PIKO', exact: true }).click();
  await page.getByRole('button', { name: '已选择 PIKO', exact: true }).waitFor();
  if (exercise) {
    await page.getByRole('button', { name: '选择 RIFF', exact: true }).click();
    await page.getByRole('button', { name: '确认选择 RIFF', exact: true }).click();
    await page.getByRole('dialog').waitFor();
    await shots(page, 'hero-dialog');
    await page.getByRole('button', { name: '知道了', exact: true }).click();
    assert.equal(await page.getByRole('button', { name: '选择 RIFF', exact: true }).getAttribute('aria-pressed'), 'true');
  }
  await page.getByRole('button', { name: '返回首页', exact: true }).click();
  await screen(page, 'lobby');
}
async function play(page) { await page.getByRole('button', { name: '开始游戏', exact: true }).click(); await page.locator('[data-screen="pregame-video"], [data-screen="gameplay"]').waitFor({ state: 'attached' }); await idle(page); }
async function frame(page) { await page.locator('iframe[title="节奏游戏"]').waitFor({ state: 'attached' }); return await page.locator('iframe').elementHandle().then(h => h.contentFrame()); }
async function media(frameOrPage, selector) { return frameOrPage.locator(selector).evaluate(m => ({ time: m.currentTime, duration: m.duration, muted: m.muted, volume: m.volume, paused: m.paused, ended: m.ended, loop: m.loop, controls: m.controls, error: m.error?.code, src: m.currentSrc })); }
async function shots(page, phase) {
  for (const [width, height] of sizes) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(100);
    const path = join(output, `${phase}-${width}x${height}.png`);
    await page.screenshot({ path });
    report.screenshots.push({ phase, width, height, path, stage: await page.getByRole('region', { name: '游戏画面' }).boundingBox() });
  }
  await page.setViewportSize({ width: 2048, height: 1152 });
}
async function running(page) {
  await screen(page, 'gameplay');
  const game = await frame(page);
  // Recovery is a real click, needed if this browser actually denies the iframe audio context.
  if (await game.locator('#audioRecoveryButton').isVisible()) await game.locator('#audioRecoveryButton').click();
  await game.waitForFunction(() => !document.querySelector('#countdown').hidden, null, { timeout: 12000 });
  return game;
}
async function waitBgm(game) { await game.waitForFunction(() => document.querySelector('#gameBgm').currentTime > 0.4, null, { timeout: 15000 }); }
async function settlement(page, expected) {
  await screen(page, 'settlement');
  const gesture = page.getByRole('button', { name: '播放结算动画', exact: true });
  if (await gesture.isVisible()) await gesture.click();
  await page.waitForFunction(() => !document.querySelector('.settlement-action--next')?.disabled, null, { timeout: 12000 });
  assert.equal(await page.getByRole('region', { name: `得分 ${expected.finalScore.toLocaleString('en-US')}`, exact: true }).count(), 1);
  for (const [label, key] of [['PERFECT', 'perfect'], ['GOOD', 'good'], ['MISS', 'miss']]) assert.equal(await page.getByRole('article', { name: `${label} ${expected[key]}`, exact: true }).count(), 1);
  assert.equal(await page.getByRole('region', { name: `最大连击 ${expected.maxCombo}`, exact: true }).count(), 1);
  assert.equal(await page.getByRole('img', { name: `获得 ${expected.starRating} 颗星，共 5 颗`, exact: true }).count(), 1);
}
async function messages(page) { return page.evaluate(() => window.__qa); }
async function inject(page, result, options = {}) {
  await page.evaluate(({ result, options }) => {
    const target = document.querySelector('iframe').contentWindow;
    const runId = Number(new URL(document.querySelector('iframe').src).searchParams.get('runId'));
    const event = new MessageEvent('message', { source: options.wrongSource ? window : target, origin: options.wrongOrigin ? 'https://wrong.example' : location.origin, data: { type: 'rhythmgame:complete', runId: options.oldRun ? runId - 1 : runId, result } });
    window.dispatchEvent(event);
    if (options.duplicate) window.dispatchEvent(event);
  }, { result, options });
}
async function controlledFinish(game) { await waitBgm(game); await game.locator('#gameBgm').evaluate(m => { m.currentTime = m.duration - 0.25; }); }
async function dialogs() {
  const { ctx, page, item } = await context('real hero/store dialogs: readable close target at all four sizes');
  await boot(page); await page.getByRole('button', { name: '打开角色', exact: true }).click(); await screen(page, 'hero-select');
  item.buttons = [];
  for (const kind of ['hero', 'store']) {
    if (kind === 'hero') { await page.getByRole('button', { name: '选择 RIFF', exact: true }).click(); await page.getByRole('button', { name: '确认选择 RIFF', exact: true }).click(); }
    else await page.getByRole('button', { name: '打开金币商店', exact: true }).click();
    await page.getByRole('dialog').waitFor();
    for (const [width, height] of [...sizes].reverse()) {
      await page.setViewportSize({ width, height });
      await page.waitForTimeout(100);
      const button = page.getByRole('button', { name: '知道了', exact: true });
      const box = await button.boundingBox();
      const style = await button.evaluate(m => { const s = getComputedStyle(m); const scale = m.getBoundingClientRect().width / m.offsetWidth; return { fontSizeRendered: parseFloat(s.fontSize) * scale, background: s.backgroundColor, color: s.color }; });
      item.buttons.push({ kind, width, height, box, style }); progress(`弹窗 ${kind} ${width}x${height}: ${JSON.stringify({ box, style })}`);
      assert.ok(box.height >= 44, `${kind} close target height ${box.height}px <44px at ${width}x${height}`);
      assert.ok(box.width >= 80); assert.ok(style.fontSizeRendered >= 14); assert.equal(style.background, 'rgb(255, 199, 53)'); assert.equal(style.color, 'rgb(32, 19, 63)');
    }
    await shots(page, `${kind}-dialog-fixed`);
    assert.ok(await page.getByRole('button', { name: '知道了', exact: true }).evaluate(m => m === document.activeElement));
    await page.getByRole('button', { name: '知道了', exact: true }).click(); assert.equal(await page.getByRole('dialog').count(), 0);
  }
  assert.equal(item.consoleErrors.length, 0); assert.equal(item.pageErrors.length, 0); await ctx.close();
}
async function natural() {
  const { ctx, page, item } = await context('natural App video/game + Retry/Next; controlled seek only on Retry');
  await select(page, true); item.unconfirmedPlayOpensHero = true; item.unavailableHeroPreservesPiko = true;
  await play(page);
  const video = page.locator('video[aria-label="游戏开场视频"]');
  await video.evaluate(m => { window.__qaIntro = m; window.__qaFirstFrame = document.querySelector('iframe'); });
  await page.waitForFunction(() => window.__qaIntro.currentTime > 0.5);
  item.introEarly = await media(page, 'video[aria-label="游戏开场视频"]');
  assert.equal(item.introEarly.muted, false); assert.equal(item.introEarly.volume, 1); assert.equal(item.introEarly.loop, false); assert.equal(item.introEarly.controls, false);
  const preload = await frame(page);
  assert.equal((await media(preload, '#gameBgm')).time, 0);
  assert.equal(await preload.locator('#countdown').isHidden(), true);
  await shots(page, 'pregame-video');
  await page.keyboard.press('Space'); await page.keyboard.press('Escape');
  assert.equal(await page.locator('[data-screen="pregame-video"]').count(), 1);
  item.noKeyboardSkip = true;
  progress('自然前置视频推进中；等待 ended 后倒计时。');
  const game = await running(page);
  item.focusedFrame = await page.evaluate(() => document.activeElement === document.querySelector('iframe'));
  assert.equal(item.focusedFrame, true);
  item.countdown = await game.locator('#countdown').textContent();
  item.introNaturalEnded = (await messages(page)).media.find(e => e.type === 'ended' && e.src.includes('pregame-intro'));
  assert.ok(item.introNaturalEnded); assert.ok(item.introNaturalEnded.time >= 12);
  item.introAfterExit = await page.evaluate(() => ({ paused: window.__qaIntro.paused, time: window.__qaIntro.currentTime, connected: window.__qaIntro.isConnected }));
  assert.equal(item.introAfterExit.paused, true); assert.equal(item.introAfterExit.time, 0); assert.equal(item.introAfterExit.connected, false);
  assert.equal(await game.locator('#startOverlay').isHidden(), true);
  await waitBgm(game); item.bgmEarly = await media(game, '#gameBgm');
  await shots(page, 'gameplay');
  await page.waitForTimeout(1000); item.bgmLater = await media(game, '#gameBgm');
  assert.ok(item.bgmLater.time > item.bgmEarly.time); assert.equal(item.bgmLater.muted, false);
  await game.locator('#gameBgm').evaluate(m => { parent.__qaBgm = m; });
  // Move focus by an actual DOM focus call, rather than synthesizing the blur event.
  await page.evaluate(() => { window.__qaFocus = document.createElement('button'); window.__qaFocus.textContent = 'QA focus target'; window.__qaFocus.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0'; document.body.append(window.__qaFocus); window.__qaFocus.focus({ preventScroll: true }); });
  await game.locator('#pauseOverlay').waitFor({ state: 'visible' });
  const paused1 = await media(game, '#gameBgm'); await page.waitForTimeout(700); const paused2 = await media(game, '#gameBgm');
  assert.ok(Math.abs(paused2.time - paused1.time) < 0.05); item.actualFocusPause = { paused1, paused2 };
  await shots(page, 'game-pause');
  await page.evaluate(() => window.__qaFocus.remove());
  await game.locator('#resumeButton').click(); await waitBgm(game);
  for (let i = 0; i < 5 && await page.locator('iframe').count(); i++) {
    await page.waitForTimeout(15000);
    if (await page.locator('iframe').count()) progress(`自然游戏 BGM ${JSON.stringify(await media(game, '#gameBgm'))}`);
  }
  await settlement(page, zero);
  item.bgmAfterComplete = await page.evaluate(() => ({ paused: window.__qaBgm.paused, time: window.__qaBgm.currentTime, ended: window.__qaBgm.ended, connected: window.__qaBgm.isConnected }));
  assert.equal(item.bgmAfterComplete.paused, true);
  await page.evaluate(() => { window.__qaSettlement = [...document.querySelectorAll('.settlement-media video')]; });
  item.capture = await messages(page);
  item.naturalResult = item.capture.messages.find(e => e.data.type === 'rhythmgame:complete').data.result;
  assert.deepEqual(Object.keys(item.naturalResult).sort(), [...fields].sort()); assert.deepEqual(item.naturalResult, zero);
  assert.equal(await page.getByText('NEW RECORD!', { exact: true }).count(), 0);
  await shots(page, 'settlement');
  await page.getByRole('button', { name: '重新挑战', exact: true }).click();
  const retry = await running(page);
  item.settlementAfterRetry = await page.evaluate(() => window.__qaSettlement.map(m => ({ paused: m.paused, connected: m.isConnected })));
  assert.ok(item.settlementAfterRetry.every(m => m.paused && !m.connected));
  item.retryNewFrame = await page.evaluate(() => document.querySelector('iframe') !== window.__qaFirstFrame);
  assert.ok(item.retryNewFrame); assert.equal(await page.locator('video[aria-label="游戏开场视频"]').count(), 0);
  await inject(page, zero, { oldRun: true }); await inject(page, zero, { wrongSource: true }); await inject(page, zero, { wrongOrigin: true });
  await page.waitForTimeout(200); assert.equal(await page.locator('[data-screen="gameplay"]').count(), 1);
  item.rejectedMessages = ['old runId', 'wrong source', 'wrong origin'];
  await retry.evaluate(() => { const id = Number(new URL(location.href).searchParams.get('runId')); window.dispatchEvent(new MessageEvent('message', { source: parent, origin: location.origin, data: { type: 'rhythmgame:start', runId: id } })); });
  item.duplicateStartSent = true;
  await controlledFinish(retry); await settlement(page, zero);
  item.retryResult = (await messages(page)).messages.filter(e => e.data.type === 'rhythmgame:complete').at(-1).data.result;
  assert.deepEqual(item.retryResult, zero); assert.equal(await page.getByText('NEW RECORD!', { exact: true }).count(), 0);
  // Old source remains incapable of overwriting an accepted settlement.
  await page.evaluate(() => window.dispatchEvent(new MessageEvent('message', { source: window.__qaFirstFrame.contentWindow, origin: location.origin, data: { type: 'rhythmgame:complete', runId: 1, result: { finalScore: 99999 } } })));
  assert.equal(await page.getByRole('region', { name: '得分 0', exact: true }).count(), 1);
  await page.getByRole('button', { name: '继续', exact: true }).click(); await screen(page, 'lobby');
  await page.getByRole('button', { name: '打开角色', exact: true }).click(); await screen(page, 'hero-select');
  assert.equal(await page.getByRole('button', { name: '已选择 PIKO', exact: true }).count(), 1);
  await page.getByRole('button', { name: '返回首页', exact: true }).click(); await screen(page, 'lobby'); await play(page);
  await page.waitForFunction(() => document.querySelector('video[aria-label="游戏开场视频"]').currentTime > 0.3);
  item.nextRetainsPikoAndPlayReplaysIntro = true;
  item.finalCapture = await messages(page);
  assert.equal(item.consoleErrors.length, 0); assert.equal(item.pageErrors.length, 0); assert.equal(item.requestfailed.length, 0); assert.equal(item.httpErrors.length, 0);
  await ctx.close(); progress('自然闭环与 Retry/Next 验证完成。');
}
async function faults() {
  {
    const { ctx, page, item } = await context('controlled pregame HTTP404 fallback', async ctx => ctx.route(/pregame-intro.*\.mp4/, route => route.request().resourceType() === 'media' ? route.fulfill({ status: 404, contentType: 'video/mp4', body: '' }) : route.continue()));
    await select(page); await play(page); const game = await running(page); await waitBgm(game);
    item.fallbackBgm = await media(game, '#gameBgm'); item.expectedHttp404 = true; item.capture = await messages(page);
    assert.ok(item.httpErrors.some(e => e.status === 404)); assert.equal(item.pageErrors.length, 0); await ctx.close();
  }
  {
    const { ctx, page, item } = await context('controlled NotAllowedError and visibility hidden/visible', async ctx => ctx.addInitScript(() => {
      const original = HTMLMediaElement.prototype.play;
      document.addEventListener('click', event => {
        if (event.target.closest?.('button')?.textContent.includes('点击继续播放')) window.__qaAllowPregame = true;
      }, true);
      HTMLMediaElement.prototype.play = function () {
        if (this.getAttribute('aria-label') === '游戏开场视频' && !window.__qaAllowPregame) return Promise.reject(new DOMException('QA controlled policy denial', 'NotAllowedError'));
        return original.call(this);
      };
    }));
    await select(page); await play(page); await page.getByRole('button', { name: '点击继续播放', exact: true }).waitFor();
    assert.equal(await page.locator('[data-screen="pregame-video"]').count(), 1);
    await shots(page, 'policy-gesture'); await page.getByRole('button', { name: '点击继续播放', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('video[aria-label="游戏开场视频"]').currentTime > 0.5);
    await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); });
    const a = await media(page, 'video[aria-label="游戏开场视频"]'); await page.waitForTimeout(700); const b = await media(page, 'video[aria-label="游戏开场视频"]');
    assert.equal(b.paused, true); assert.ok(Math.abs(a.time - b.time) < 0.05);
    await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' }); document.dispatchEvent(new Event('visibilitychange')); });
    await page.waitForTimeout(700); const c = await media(page, 'video[aria-label="游戏开场视频"]'); assert.ok(c.time > b.time);
    item.injectedVisibility = { a, b, c }; item.actualPolicyDenial = 'unknown'; item.actualBackgroundHidden = 'unknown'; await ctx.close();
  }
  {
    let delay = true;
    const { ctx, page, item } = await context('controlled game-ready delay: final frame, 10s timeout, reload', async ctx => ctx.route(/\/rhythm-game\/index\.html/, async route => { if (delay) { await new Promise(r => setTimeout(r, 26000)); } await route.continue(); }));
    await select(page); await play(page);
    await page.getByRole('status').filter({ hasText: 'LOADING...' }).waitFor({ timeout: 20000 });
    item.lastVideoFrame = await media(page, 'video[aria-label="游戏开场视频"]');
    assert.equal(item.lastVideoFrame.ended, true); assert.ok(item.lastVideoFrame.time >= 12);
    await page.getByRole('alert').waitFor({ timeout: 13000 }); assert.ok((await page.getByRole('alert').textContent()).includes('超时'));
    await shots(page, 'ready-timeout'); delay = false;
    await page.getByRole('button', { name: '重新加载', exact: true }).click(); const game = await running(page); await waitBgm(game);
    assert.equal(await page.locator('video[aria-label="游戏开场视频"]').count(), 0); item.reloadedWithoutVideo = true; await ctx.close();
  }
  {
    const { ctx, page, item } = await context('controlled invalid result, error exits and NEW RECORD/duplicate complete', async ctx => ctx.route(/pregame-intro.*\.mp4/, route => route.request().resourceType() === 'media' ? route.fulfill({ status: 404, contentType: 'video/mp4', body: '' }) : route.continue()));
    await select(page); await play(page); let game = await running(page); await waitBgm(game);
    await inject(page, { ...zero, finalScore: -1 }); await page.getByRole('alert').waitFor(); assert.ok((await page.getByRole('alert').textContent()).includes('成绩数据无效'));
    await page.getByRole('button', { name: '返回大厅', exact: true }).click(); await screen(page, 'lobby'); await play(page); game = await running(page); await waitBgm(game);
    await inject(page, zero); await settlement(page, zero); assert.equal(await page.getByText('NEW RECORD!', { exact: true }).count(), 0);
    await page.getByRole('button', { name: '重新挑战', exact: true }).click(); game = await running(page); await waitBgm(game);
    const high = { ...zero, finalScore: 100, maxCombo: 1, perfect: 1, miss: 79, accuracy: 100 / 92, repairPercent: 100 / 92 };
    await inject(page, high, { duplicate: true }); await settlement(page, high); assert.equal(await page.getByText('NEW RECORD!', { exact: true }).count(), 1);
    await page.evaluate(() => window.dispatchEvent(new MessageEvent('message', { source: window, origin: location.origin, data: { type: 'rhythmgame:complete', runId: 3, result: { finalScore: 99999 } } })));
    assert.equal(await page.getByRole('region', { name: '得分 100', exact: true }).count(), 1);
    await page.getByRole('button', { name: '重新挑战', exact: true }).click(); game = await running(page); await waitBgm(game); await inject(page, high); await settlement(page, high);
    assert.equal(await page.getByText('NEW RECORD!', { exact: true }).count(), 0); item.firstEqualHigherRecordAndDuplicate = true;
    item.label = 'Synthetic MessageEvents test host rejection/record branches only; these scores are not real playthrough evidence.';
    assert.equal(item.pageErrors.length, 0); await ctx.close();
  }
  progress('受控资源、策略、延迟、来源及成绩分支完成。');
}
async function resources() {
  if (mode !== 'production') return;
  const root = resolve('dist');
  const runtime = readdirSync(join(root, 'rhythm-game')).filter(f => /\.(?:html|js|css)$/.test(f)).map(f => `rhythm-game/${f}`);
  const appRuntime = readdirSync(join(root, 'assets')).filter(f => /\.(?:js|css)$/.test(f)).map(f => `assets/${f}`);
  const videos = readdirSync(join(root, 'assets')).filter(f => /(?:pregame-intro|settlement-intro|settlement-loop|lobby-background|loading-intro|loading-loop|hero-).*\.mp4$/.test(f)).map(f => `assets/${f}`);
  for (const path of ['index.html', ...runtime, ...appRuntime, 'rhythm-game/assets/audio/game-bgm.m4a', ...videos]) {
    const response = await fetch(`${BASE_URL}/${path}`);
    const data = Buffer.from(await response.arrayBuffer());
    const mime = response.headers.get('content-type');
    const expected = path.endsWith('.html') ? 'text/html' : path.endsWith('.js') ? /(?:javascript)/ : path.endsWith('.css') ? 'text/css' : path.endsWith('.m4a') ? /audio\/(?:mp4|x-m4a)/ : 'video/mp4';
    assert.equal(response.status, 200); assert.ok(typeof expected === 'string' ? mime?.includes(expected) : expected.test(mime));
    const hash = createHash('sha256').update(data).digest('hex'); assert.equal(hash, createHash('sha256').update(readFileSync(join(root, path))).digest('hex'));
    report.resources.push({ path, status: response.status, mime, bytes: data.length, sha256: hash });
  }
  assert.ok(videos.some(p => p.includes('pregame-intro'))); assert.ok(runtime.includes('rhythm-game/embed-bridge.js'));
}
async function settlementSmoke() {
  const enter = async page => { await select(page); await play(page); const game = await running(page); await waitBgm(game); await inject(page, zero); await screen(page, 'settlement'); };
  {
    const { ctx, page, item } = await context('final fix: natural settlement media, real Retry/Next, controlled host result');
    await enter(page);
    const gesture = page.getByRole('button', { name: '播放结算动画', exact: true });
    if (await gesture.isVisible()) await gesture.click();
    await page.waitForFunction(() => document.querySelector('.settlement-media__intro').currentTime > 0.3, null, { timeout: 12000 });
    item.intro = await media(page, '.settlement-media__intro');
    assert.equal(item.intro.muted, false);
    await page.waitForFunction(() => document.querySelector('.settlement-ui').classList.contains('settlement-ui--visible'), null, { timeout: 12000 });
    assert.ok(await page.getByRole('button', { name: '继续', exact: true }).isDisabled());
    await settlement(page, zero);
    item.loop = await media(page, '.settlement-media__loop');
    assert.equal(item.loop.muted, true);
    await page.evaluate(() => { window.__finalFixMedia = [...document.querySelectorAll('.settlement-media video')]; });
    await page.screenshot({ path: join(output, 'settlement-normal.png') });
    await page.getByRole('button', { name: '重新挑战', exact: true }).click();
    const retry = await running(page); await waitBgm(retry);
    item.detached = await page.evaluate(() => window.__finalFixMedia.map(m => ({ connected: m.isConnected, paused: m.paused, time: m.currentTime })));
    assert.ok(item.detached.every(m => !m.connected && m.paused && m.time === 0));
    assert.equal(await page.locator('video[aria-label="游戏开场视频"]').count(), 0);
    await inject(page, zero); await settlement(page, zero);
    await page.getByRole('button', { name: '继续', exact: true }).click(); await screen(page, 'lobby');
    item.label = 'Settlement videos played naturally; host complete results were synthetic MessageEvents; real Retry/Next clicks.';
    assert.equal(item.consoleErrors.length, 0); assert.equal(item.pageErrors.length, 0); assert.equal(item.requestfailed.length, 0); assert.equal(item.httpErrors.length, 0);
    await ctx.close();
  }
  {
    const { ctx, page, item } = await context('final fix: actual intro HTTP404 plus controlled pending play late rejection', async ctx => {
      await ctx.route(/settlement-intro.*\.mp4/, route => route.request().resourceType() === 'media' ? route.fulfill({ status: 404, contentType: 'video/mp4', body: '' }) : route.continue());
      await ctx.addInitScript(() => {
        const original = HTMLMediaElement.prototype.play;
        window.__finalFixRejects = [];
        HTMLMediaElement.prototype.play = function () {
          if (this.getAttribute('aria-label') === '结算开场动画') return new Promise((resolve, reject) => window.__finalFixRejects.push(reject));
          return original.call(this);
        };
      });
    });
    await enter(page); await settlement(page, zero);
    await page.evaluate(() => window.__finalFixRejects.forEach(reject => reject(new DOMException('controlled late decode rejection', 'NotSupportedError'))));
    await settlement(page, zero);
    assert.equal(await page.getByRole('button', { name: '播放结算动画', exact: true }).count(), 0);
    await page.screenshot({ path: join(output, 'settlement-error-late-reject.png') });
    assert.ok(item.httpErrors.some(e => e.status === 404)); assert.equal(item.pageErrors.length, 0);
    await page.getByRole('button', { name: '重新挑战', exact: true }).click(); await running(page);
    item.label = 'Real HTTP404 media failure; intro play Promises and late rejection are controlled; results synthetic; Retry real click.';
    await ctx.close();
  }
  {
    const { ctx, page, item } = await context('final fix: controlled policy click/error/late successful gesture play', async ctx => ctx.addInitScript(() => {
      const original = HTMLMediaElement.prototype.play;
      window.__finalFixAllow = false;
      document.addEventListener('click', event => { if (event.target.closest?.('button')?.getAttribute('aria-label') === '播放结算动画') window.__finalFixAllow = true; }, true);
      HTMLMediaElement.prototype.play = function () {
        if (this.getAttribute('aria-label') !== '结算开场动画') return original.call(this);
        if (!window.__finalFixAllow) return Promise.reject(new DOMException('controlled policy', 'NotAllowedError'));
        window.__finalFixIntro = this;
        return new Promise(resolve => { window.__finalFixResolve = resolve; });
      };
    }));
    await enter(page); await page.getByRole('button', { name: '播放结算动画', exact: true }).click();
    await page.evaluate(() => window.__finalFixIntro.dispatchEvent(new Event('error')));
    await settlement(page, zero);
    await page.evaluate(() => window.__finalFixResolve());
    await settlement(page, zero);
    assert.equal(await page.getByRole('button', { name: '播放结算动画', exact: true }).count(), 0);
    await page.getByRole('button', { name: '继续', exact: true }).click(); await screen(page, 'lobby');
    item.label = 'Policy rejection, media error event and play Promise resolution controlled; gesture/Next are real clicks; actual OS policy unknown.';
    assert.equal(item.pageErrors.length, 0); await ctx.close();
  }
}
(async () => {
  browser = await playwright.chromium.launch({ channel: 'msedge', headless: true });
  if (onlySettlement) { await resources(); await settlementSmoke(); }
  else if (onlyDialogs) await dialogs();
  else { await resources(); await dialogs(); await natural(); await faults(); }
  report.status = 'passed'; report.finishedAt = new Date().toISOString(); progress('全部脚本断言通过。');
})().catch(error => { report.status = 'failed'; report.error = error.stack; process.exitCode = 1; console.error(error); })
  .finally(async () => { writeFileSync(join(output, 'report.json'), `${JSON.stringify(report, null, 2)}\n`); await browser?.close(); });
