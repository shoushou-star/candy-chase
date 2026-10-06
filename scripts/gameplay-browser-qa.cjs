const { mkdirSync, writeFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { chromium } = require("playwright-core");

const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const targetUrl = process.argv[2] ?? "http://127.0.0.1:4174/gameplay.html";
const outputDir = resolve("docs/qa");
mkdirSync(outputDir, { recursive: true });

async function songTime(page) {
  return page.getByLabel("原型调试数据").evaluate((element) => {
    const match = element.textContent?.match(/TIME\s+([\d.]+)/);
    return match ? Number(match[1]) : 0;
  });
}

async function waitForSongTime(page, target) {
  await page.waitForFunction(
    (expected) => {
      const element = document.querySelector('[aria-label="原型调试数据"]');
      const match = element?.textContent?.match(/TIME\s+([\d.]+)/);
      return match ? Number(match[1]) >= expected : false;
    },
    target,
    { polling: 8, timeout: 50000 },
  );
}

(async () => {
  const browser = await chromium.launch({
    executablePath: edgePath,
    headless: true,
    args: ["--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];
  const httpErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push({ text: message.text(), location: message.location() });
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("requestfailed", (request) => failedRequests.push(`${request.url()} ${request.failure()?.errorText ?? "failed"}`));
  page.on("response", (response) => {
    if (response.status() >= 400) httpErrors.push(`${response.status()} ${response.url()}`);
  });

  await page.goto(targetUrl, { waitUntil: "networkidle" });
  await page.getByRole("main", { name: "糖果追击玩法原型" }).waitFor();
  await page.locator("canvas").waitFor();
  const canvasResolution = await page.locator("canvas").evaluate((canvas) => ({
    width: canvas.width,
    height: canvas.height,
  }));

  await page.setViewportSize({ width: 3840, height: 2160 });
  const largeStartOverlay = await page.evaluate(() => {
    const stage = document.querySelector(".gameplay-prototype__stage").getBoundingClientRect();
    const title = document.querySelector(".gameplay-overlay--start h1");
    const button = document.querySelector(".gameplay-overlay--start button").getBoundingClientRect();
    return {
      titleFontWidthRatio: Number.parseFloat(getComputedStyle(title).fontSize) / stage.width,
      buttonHeightRatio: button.height / stage.height,
    };
  });
  await page.screenshot({ path: resolve(outputDir, "rhythm-gameplay-start-large.png") });
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.screenshot({ path: resolve(outputDir, "rhythm-gameplay-start.png") });

  await page.getByRole("button", { name: "开始节奏测试" }).click();
  await page.getByRole("region", { name: "玩法状态" }).waitFor();
  await waitForSongTime(page, 0.2);
  await page.screenshot({ path: resolve(outputDir, "rhythm-gameplay-countdown.png") });

  await waitForSongTime(page, 3.96);
  await page.keyboard.down("Space");
  await page.waitForTimeout(24);
  await page.keyboard.up("Space");

  await waitForSongTime(page, 22.96);
  await page.keyboard.down("Space");
  await page.waitForTimeout(24);
  await page.keyboard.up("Space");

  await waitForSongTime(page, 30.5);
  await page.keyboard.press("Space");

  await waitForSongTime(page, 31.96);
  await page.keyboard.down("Space");
  await waitForSongTime(page, 32.98);
  await page.keyboard.up("Space");
  await page.screenshot({ path: resolve(outputDir, "rhythm-gameplay-hold.png") });

  await page.getByRole("region", { name: "游戏结算" }).waitFor({ timeout: 52000 });
  const result = {
    title: await page.getByRole("heading").textContent(),
    text: await page.getByRole("region", { name: "游戏结算" }).innerText(),
  };
  await page.screenshot({ path: resolve(outputDir, "rhythm-gameplay-result.png") });

  await page.setViewportSize({ width: 3840, height: 2160 });
  const largeResultOverlay = await page.evaluate(() => {
    const stage = document.querySelector(".gameplay-prototype__stage").getBoundingClientRect();
    const title = document.querySelector(".gameplay-overlay--result h1");
    const grid = document.querySelector(".result-grid").getBoundingClientRect();
    const button = document.querySelector(".gameplay-overlay--result button").getBoundingClientRect();
    return {
      titleFontWidthRatio: Number.parseFloat(getComputedStyle(title).fontSize) / stage.width,
      gridWidthRatio: grid.width / stage.width,
      buttonHeightRatio: button.height / stage.height,
    };
  });
  await page.screenshot({ path: resolve(outputDir, "rhythm-gameplay-result-large.png") });

  const viewportResults = [];
  for (const [width, height] of [[1280, 720], [1400, 900]]) {
    await page.setViewportSize({ width, height });
    const stage = await page.getByLabel("节奏游戏画面").boundingBox();
    viewportResults.push({ width, height, stage });
  }

  await page.setViewportSize({ width: 640, height: 512 });
  const narrowStage = await page.getByLabel("节奏游戏画面").boundingBox();
  const narrowHeading = await page.getByRole("heading").boundingBox();
  const narrowRestart = await page.getByRole("button", { name: "重新开始" }).boundingBox();
  const narrowResultFits = Boolean(
    narrowStage
      && narrowHeading
      && narrowRestart
      && narrowHeading.y >= narrowStage.y
      && narrowRestart.y + narrowRestart.height <= narrowStage.y + narrowStage.height,
  );
  await page.screenshot({ path: resolve(outputDir, "rhythm-gameplay-result-narrow.png") });

  await page.getByRole("button", { name: "重新开始" }).click();
  await waitForSongTime(page, 0.15);
  const restartTime = await songTime(page);

  const report = {
    targetUrl,
    canvasResolution,
    largeStartOverlay,
    result,
    largeResultOverlay,
    viewportResults,
    narrowResultFit: {
      fits: narrowResultFits,
      stage: narrowStage,
      heading: narrowHeading,
      restart: narrowRestart,
    },
    restartTime,
    consoleErrors,
    pageErrors,
    failedRequests,
    httpErrors,
  };
  writeFileSync(resolve(outputDir, "rhythm-gameplay-browser-qa.json"), `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  await browser.close();

  if (canvasResolution.width !== 1920 || canvasResolution.height !== 1080) process.exitCode = 1;
  if (consoleErrors.length || pageErrors.length || failedRequests.length || httpErrors.length) process.exitCode = 1;
  if (restartTime >= 1) process.exitCode = 1;
  if (!narrowResultFits) process.exitCode = 1;
  if (largeStartOverlay.titleFontWidthRatio < 0.055 || largeStartOverlay.buttonHeightRatio < 0.045) {
    process.exitCode = 1;
  }
  if (
    largeResultOverlay.titleFontWidthRatio < 0.05
    || largeResultOverlay.gridWidthRatio < 0.4
    || largeResultOverlay.buttonHeightRatio < 0.04
  ) {
    process.exitCode = 1;
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
