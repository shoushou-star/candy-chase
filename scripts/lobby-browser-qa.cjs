const { mkdirSync, writeFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { chromium } = require("playwright");

const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const outputDir = resolve("docs/qa");
mkdirSync(outputDir, { recursive: true });

const viewports = [
  [2048, 1152],
  [1920, 1080],
  [1600, 900],
  [1366, 768],
  [1280, 720],
  [1400, 900],
];

(async () => {
  const browser = await chromium.launch({ executablePath: edgePath, headless: true });
  const page = await browser.newPage({ viewport: { width: 2048, height: 1152 } });
  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("requestfailed", (request) => failedRequests.push(`${request.url()} ${request.failure()?.errorText ?? "failed"}`));

  await page.goto("http://127.0.0.1:4173/", { waitUntil: "networkidle" });
  await page.getByRole("main", { name: "游戏大厅" }).waitFor();
  await page.waitForFunction(() => document.querySelector("main")?.getAttribute("aria-busy") !== "true");

  const buttonNames = await page.getByRole("button").evaluateAll((buttons) =>
    buttons.map((button) => button.getAttribute("aria-label")),
  );

  const viewportResults = [];
  for (const [width, height] of viewports) {
    await page.setViewportSize({ width, height });
    await page.waitForFunction(
      ({ viewportWidth, viewportHeight }) => {
        const stage = document.querySelector('[aria-label="游戏画面"]');
        if (!(stage instanceof HTMLElement)) return false;
        const expectedScale = Math.min(viewportWidth / 2048, viewportHeight / 1152);
        return Math.abs(stage.getBoundingClientRect().width - 2048 * expectedScale) < 1;
      },
      { viewportWidth: width, viewportHeight: height },
    );
    const stage = await page.getByRole("region", { name: "游戏画面" }).boundingBox();
    viewportResults.push({ width, height, stage });
  }

  await page.setViewportSize({ width: 2048, height: 1152 });
  const play = page.getByRole("button", { name: "开始游戏" });
  await play.hover();
  await page.waitForTimeout(220);
  const hoverTransform = await play.evaluate((element) => getComputedStyle(element).transform);
  const box = await play.boundingBox();
  if (!box) throw new Error("Play button has no bounding box");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(90);
  const pressedTransform = await play.evaluate((element) => getComputedStyle(element).transform);
  await page.mouse.up();

  await page.reload({ waitUntil: "networkidle" });
  await page.waitForFunction(() => document.querySelectorAll('button').length === 12);
  const tabOrder = [];
  for (let index = 0; index < 12; index += 1) {
    await page.keyboard.press("Tab");
    tabOrder.push(await page.evaluate(() => document.activeElement?.getAttribute("aria-label")));
  }

  const playBefore = await play.getAttribute("class");
  await play.focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Space");
  const playAfter = await play.getAttribute("class");

  const focusResults = [];
  for (const name of buttonNames) {
    const button = page.getByRole("button", { name });
    await button.focus();
    focusResults.push(await button.evaluate((element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      const outlineSpace = Number.parseFloat(style.outlineWidth) + Number.parseFloat(style.outlineOffset);
      return {
        name: element.getAttribute("aria-label"),
        outlineStyle: style.outlineStyle,
        outlineWidth: style.outlineWidth,
        withinStage: rect.left - outlineSpace >= 0 && rect.top - outlineSpace >= 0
          && rect.right + outlineSpace <= 2048 && rect.bottom + outlineSpace <= 1152,
      };
    }));
  }

  await page.emulateMedia({ reducedMotion: "reduce" });
  const reducedMotionTransition = await play.evaluate((element) => getComputedStyle(element).transitionDuration);

  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  });
  await page.mouse.move(1000, 1000);
  await page.waitForTimeout(220);
  await page.screenshot({ path: resolve(outputDir, "lobby-2048x1152.png") });

  const report = {
    buttonNames,
    viewportResults,
    hoverTransform,
    pressedTransform,
    tabOrder,
    playClassStableAfterKeyboardActivation: playBefore === playAfter,
    focusResults,
    reducedMotionTransition,
    consoleErrors,
    pageErrors,
    failedRequests,
  };
  writeFileSync(resolve(outputDir, "lobby-browser-qa.json"), `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
