/* Exercise both real entry points with natural intro playback. */
const fs = require('node:fs');
const original = fs.readFileSync('scripts/play-session-browser-qa.cjs', 'utf8');
const prefix = original.slice(0, original.search(/\(async \(\) => \{\s*browser =/))
  .replace(/^const output = .*$/m, "const output = resolve('docs/qa/hero-start', mode);");
eval(prefix + `;
(async () => {
  browser = await playwright.chromium.launch({channel:'msedge',headless:true});
  for (const entry of ['打开角色','开始游戏']) {
    const {ctx,page,item} = await context(entry + ' -> SELECT -> direct start');
    await boot(page);
    await page.getByRole('button',{name:entry,exact:true}).click();
    await screen(page,'hero-select');
    await page.getByRole('button',{name:'确认选择 PIKO',exact:true}).click();
    const dialog = page.getByRole('dialog',{name:'是否立即开始游戏？'});
    await dialog.waitFor();
    assert.equal(await page.locator('.hero-select-page').evaluate(m=>m.closest('[inert]')!==null),true);
    const start = dialog.getByRole('button',{name:'开始游戏',exact:true});
    assert.equal(await start.evaluate(b=>b===document.activeElement),true);
    await page.keyboard.press('Tab');
    assert.equal(await dialog.getByRole('button',{name:'继续选角色'}).evaluate(b=>b===document.activeElement),true);
    await page.keyboard.press('Tab');
    assert.equal(await start.evaluate(b=>b===document.activeElement),true);
    if(entry==='打开角色') await shots(page,'start-dialog');
    await dialog.getByRole('button',{name:'继续选角色'}).click();
    const selected = page.getByRole('button',{name:'已选择 PIKO',exact:true});
    assert.equal(await selected.isEnabled(),true);
    assert.equal(await selected.evaluate(b=>b===document.activeElement),true);
    await selected.click(); await dialog.waitFor();
    await page.keyboard.press('Escape'); await dialog.waitFor({state:'detached'});
    assert.equal(await selected.evaluate(b=>b===document.activeElement),true);
    await selected.click(); await dialog.waitFor();
    await start.click();
    await page.locator('[data-screen="pregame-video"]').waitFor({state:'attached'});
    await idle(page);
    await page.waitForFunction(()=>document.querySelector('video[aria-label="游戏开场视频"]').currentTime>0.2);
    item.intro = await media(page,'video[aria-label="游戏开场视频"]');
    assert.equal(item.intro.controls,false); assert.equal(item.intro.loop,false);
    const game = await running(page);
    assert.equal(await page.locator('iframe').count(),1);
    assert.equal(await game.locator('#startOverlay').isVisible(),false);
    assert.equal(await game.locator('#countdown').isVisible(),true);
    await waitBgm(game);
    item.playbackRate=await game.locator('#gameBgm').evaluate(m=>m.playbackRate);
    assert.equal(item.playbackRate,1);
    item.starts = await game.evaluate(()=>window.__qa.messages.filter(m=>m.data.type==='rhythmgame:start'));
    assert.equal(item.starts.length,1);
    assert.equal(item.starts[0].data.runId,1);
    assert.equal(item.consoleErrors.length,0); assert.equal(item.pageErrors.length,0);
    assert.equal(item.httpErrors.length,0); assert.equal(item.requestfailed.length,0);
    item.status='passed'; await ctx.close();
  }
  // The updated existing helper dismisses the start dialog; lobby PLAY must
  // still start directly after confirmation has been saved.
  const {ctx,page,item} = await context('saved selection / unavailable hero / lobby PLAY');
  await select(page,true); await play(page);
  await page.locator('video[aria-label="游戏开场视频"]').waitFor();
  assert.equal(await page.getByRole('dialog').count(),0);
  item.status='passed'; await ctx.close();
  report.status='passed'; report.finishedAt=new Date().toISOString();
})().catch(error=>{report.status='failed';report.error=error.stack;process.exitCode=1;console.error(error);})
.finally(async()=>{writeFileSync(join(output,'report.json'),JSON.stringify(report,null,2));await browser?.close();});
`);
