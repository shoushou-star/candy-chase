const { mkdirSync, writeFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { chromium } = require("playwright-core");

const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const targetUrl = process.argv[2] ?? "http://127.0.0.1:4174/gameplay.html";
const outputDir = resolve("docs/qa");
mkdirSync(outputDir, { recursive: true });

async function measureViewport(browser, width, height) {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.goto(targetUrl, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "开始节奏测试" }).click();
  await page.getByRole("region", { name: "玩法状态" }).waitFor();
  await page.waitForTimeout(2200);

  const metrics = await page.evaluate(() => {
    const stage = document.querySelector(".gameplay-prototype__stage");
    const selectors = [
      ".gameplay-hud__score-card",
      ".gameplay-hud__time",
      ".gameplay-hud__combo",
      ".gameplay-debug",
    ];
    const stageRect = stage.getBoundingClientRect();
    const elements = Object.fromEntries(selectors.map((selector) => {
      const element = document.querySelector(selector);
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      const strong = element.querySelector("strong");
      const label = element.querySelector("span");
      const strongFontSize = strong ? Number.parseFloat(getComputedStyle(strong).fontSize) : null;
      const labelFontSize = label ? Number.parseFloat(getComputedStyle(label).fontSize) : null;
      return [selector, {
        width: rect.width,
        height: rect.height,
        widthRatio: rect.width / stageRect.width,
        heightRatio: rect.height / stageRect.height,
        fontSize: style.fontSize,
        strongFontSize,
        strongFontWidthRatio: strongFontSize === null ? null : strongFontSize / stageRect.width,
        labelFontSize,
        labelFontWidthRatio: labelFontSize === null ? null : labelFontSize / stageRect.width,
      }];
    }));
    return {
      innerWidth,
      innerHeight,
      devicePixelRatio,
      stage: { width: stageRect.width, height: stageRect.height },
      elements,
    };
  });

  await page.screenshot({ path: resolve(outputDir, `rhythm-gameplay-hud-${width}x${height}.png`) });
  await page.close();
  return metrics;
}

(async () => {
  const browser = await chromium.launch({
    executablePath: edgePath,
    headless: true,
    args: ["--autoplay-policy=no-user-gesture-required"],
  });
  const report = {
    targetUrl,
    viewports: [
      await measureViewport(browser, 1920, 1080),
      await measureViewport(browser, 2480, 1340),
    ],
  };
  const hudScalesWithStage = report.viewports.every(({ elements, stage }) => (
    elements[".gameplay-hud__score-card"].labelFontWidthRatio >= 0.011
    && elements[".gameplay-hud__time"].labelFontWidthRatio >= 0.011
    && elements[".gameplay-hud__combo"].strongFontWidthRatio >= 0.045
    && Number.parseFloat(elements[".gameplay-debug"].fontSize) / stage.width >= 0.0065
  ));
  report.hudScalesWithStage = hudScalesWithStage;
  writeFileSync(resolve(outputDir, "rhythm-gameplay-hud-qa.json"), `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  await browser.close();
  if (!hudScalesWithStage) process.exitCode = 1;
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
