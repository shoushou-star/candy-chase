/* Reuse real UI helpers without running/overwriting the historical QA suite. */
const fs = require('node:fs');
const original = fs.readFileSync('scripts/play-session-browser-qa.cjs', 'utf8');
const prefix = original.slice(0, original.search(/\(async \(\) => \{\s*browser =/))
  .replace(/^const output = .*$/m, "const output = resolve('docs/qa/video-handoff', mode);");
eval(prefix + `;
(async () => {
  browser = await playwright.chromium.launch({ channel: 'msedge', headless: true });
  const {ctx, page, item} = await context('natural intro / controlled settlement result / actual video frames', async ctx => {
    await ctx.addInitScript(() => {
      window.__handoff = [];
      const descriptor = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'currentTime');
      Object.defineProperty(HTMLMediaElement.prototype, 'currentTime', {...descriptor, set(value) {
        if (this.getAttribute('aria-label') === '游戏开场视频') window.__handoff.push({event:'seek', before:this.currentTime, after:value, connected:this.isConnected});
        descriptor.set.call(this,value);
      }});
      const callback = HTMLVideoElement.prototype.requestVideoFrameCallback;
      HTMLVideoElement.prototype.requestVideoFrameCallback = function (present) {
        return callback.call(this, (now, metadata) => {
          if (this.getAttribute('aria-label') === '结算开场动画') {
            window.__releaseIntro = () => present(now, metadata);
            window.__handoff.push({event:'decoded-settlement-frame', time:metadata.mediaTime});
          } else present(now, metadata);
        });
      };
    });
  });
  await select(page); await play(page);
  const game = await running(page); await waitBgm(game);
  await page.locator('video[aria-label="游戏开场视频"]').waitFor({state:'detached'});
  item.seeks = await page.evaluate(() => window.__handoff.filter(e=>e.event==='seek'));
  assert.equal(item.seeks.length, 0, 'intro must not seek back to frame zero, including StrictMode cleanup');
  const standalone = await ctx.newPage();
  const particleSize = async (surface, width, height) => {
    await surface.waitForFunction(() => document.querySelector('.magic-attack-stage'));
    return await surface.evaluate(() => {
      const c = document.querySelector('.magic-attack-stage');
      return {width:c.width, height:c.height};
    });
  };
  item.particles = [];
  for (const [width,height] of sizes) {
    await page.setViewportSize({width,height});
    await standalone.setViewportSize({width,height});
    await standalone.goto(BASE_URL + '/rhythm-game/index.html');
    await page.bringToFront();
    await page.waitForFunction(([width,height]) => {
      const rect=document.querySelector('iframe').getBoundingClientRect();
      const scale=Math.min(width/2048,height/1152);
      return Math.abs(rect.width-2048*scale)<1 && Math.abs(rect.height-1152*scale)<1;
    }, [width,height]);
    await game.waitForFunction(() => {
      const frame = window.frameElement;
      const canvas = document.querySelector('.magic-attack-stage');
      const rect = frame.getBoundingClientRect();
      return Math.abs(canvas.width - rect.width) <= 1 && Math.abs(canvas.height - rect.height) <= 1;
    });
    const embedded = await particleSize(game);
    const direct = await particleSize(standalone);
    assert.ok(Math.abs(embedded.width-direct.width)<=1 && Math.abs(embedded.height-direct.height)<=1,
      'equal displayed scene sizes need equal particle canvas resolution (allow letterbox rounding)');
    item.particles.push({width,height,embedded,direct});
  }
  await page.setViewportSize({width:1280,height:720});
  await page.waitForTimeout(150);
  await game.evaluate(() => window.dispatchEvent(new CustomEvent('rhythmgame:attack',{detail:{strength:'perfect',phase:'hold-start'}})));
  await page.waitForTimeout(100);
  await page.screenshot({path:join(output,'particles-1280x720.png')});
  report.screenshots.push({phase:'particles',path:join(output,'particles-1280x720.png')});
  await standalone.close();
  await inject(page, zero); await screen(page, 'settlement');
  await page.waitForFunction(() => typeof window.__releaseIntro === 'function');
  item.beforeFrame = await page.locator('.settlement-media').evaluate(m=>({ready:m.dataset.frameReady, background:getComputedStyle(m).backgroundColor}));
  assert.equal(item.beforeFrame.ready,'false');
  assert.notEqual(item.beforeFrame.background,'rgba(0, 0, 0, 0)');
  await page.screenshot({path:join(output,'settlement-before-frame.png')});
  await page.evaluate(() => window.__releaseIntro());
  await page.waitForFunction(() => document.querySelector('.settlement-media').dataset.frameReady==='true');
  await page.screenshot({path:join(output,'settlement-first-frame.png')});
  await settlement(page,zero);
  assert.equal(await page.locator('.settlement-media').getAttribute('data-loop-ready'),'true');
  await page.getByRole('button',{name:'重新挑战',exact:true}).click();
  const retry = await running(page); await waitBgm(retry);
  assert.equal(await page.locator('video[aria-label="游戏开场视频"]').count(),0);
  assert.equal(item.consoleErrors.length,0); assert.equal(item.pageErrors.length,0);
  assert.equal(item.httpErrors.length,0); assert.equal(item.requestfailed.length,0);
  report.status='passed'; report.finishedAt=new Date().toISOString();
  await ctx.close();
})().catch(error=>{ report.status='failed'; report.error=error.stack; process.exitCode=1; console.error(error); })
.finally(async()=>{writeFileSync(join(output,'report.json'),JSON.stringify(report,null,2));await browser?.close();});
`);
