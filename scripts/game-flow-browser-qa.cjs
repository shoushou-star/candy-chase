const { mkdirSync, writeFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { chromium } = require("playwright");

const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const outputDir = resolve("docs/qa");
mkdirSync(outputDir, { recursive: true });

async function waitForTransition(page) {
  await page.locator('[data-testid="screen-transition"][data-phase="idle"]').waitFor();
}

(async () => {
  const browser = await chromium.launch({ executablePath: edgePath, headless: true });
  const page = await browser.newPage({ viewport: { width: 2048, height: 1152 } });
  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];
  const abortedMediaRequests = [];
  const httpErrors = [];

  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("requestfailed", (request) => {
    const failure = request.failure()?.errorText ?? "failed";
    const entry = `${request.url()} ${failure}`;
    if (failure === "net::ERR_ABORTED" && request.resourceType() === "media") {
      abortedMediaRequests.push(entry);
    } else {
      failedRequests.push(entry);
    }
  });
  page.on("response", (response) => {
    if (response.status() >= 400) httpErrors.push(`${response.status()} ${response.url()}`);
  });

  await page.goto("http://127.0.0.1:4176/", { waitUntil: "networkidle" });
  await page.getByRole("main", { name: "游戏加载" }).waitFor();
  await page.screenshot({ path: resolve(outputDir, "game-flow-loading.png") });

  await page.getByRole("button", { name: "开始加载" }).click();
  await page.getByRole("button", { name: "CLICK TO START" }).waitFor({ timeout: 10000 });
  await page.getByRole("button", { name: "CLICK TO START" }).click();
  await waitForTransition(page);
  await page.getByRole("main", { name: "游戏大厅" }).waitFor();
  await page.waitForFunction(() => document.querySelector("main")?.getAttribute("aria-busy") !== "true");
  await page.screenshot({ path: resolve(outputDir, "game-flow-lobby.png") });

  await page.getByRole("button", { name: "打开角色" }).click();
  await waitForTransition(page);
  await page.getByRole("main", { name: "角色选择" }).waitFor();
  await page.getByRole("button", { name: "选择 RIFF" }).click();
  await page.getByRole("button", { name: "确认选择 RIFF" }).click();
  await page.getByRole("button", { name: "已选择 RIFF" }).waitFor();
  await page.screenshot({ path: resolve(outputDir, "game-flow-hero-selected.png") });

  await page.getByRole("button", { name: "返回首页" }).click();
  await waitForTransition(page);
  await page.getByRole("button", { name: "开始游戏" }).click();
  await waitForTransition(page);
  await page.getByRole("heading", { name: "RIFF 已准备就绪" }).waitFor();
  await page.screenshot({ path: resolve(outputDir, "game-flow-placeholder.png") });

  await page.getByRole("button", { name: "返回大厅" }).click();
  await waitForTransition(page);
  await page.getByRole("button", { name: "打开角色" }).click();
  await waitForTransition(page);
  await page.getByRole("button", { name: "选择 MIRA" }).click();
  await page.getByRole("button", { name: "返回首页" }).click();
  await waitForTransition(page);
  await page.getByRole("button", { name: "打开角色" }).click();
  await waitForTransition(page);
  const confirmedHeroPreserved = await page.getByRole("button", { name: "选择 RIFF", exact: true }).getAttribute("aria-pressed");

  await page.reload({ waitUntil: "networkidle" });
  const refreshStartsAtLoading = await page.getByRole("main", { name: "游戏加载" }).isVisible();

  const stageMeasurements = [];
  for (const [width, height] of [[2048, 1152], [1366, 768], [1400, 900]]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(100);
    const box = await page.getByRole("region", { name: "游戏画面" }).boundingBox();
    stageMeasurements.push({ width, height, stage: box });
  }

  const report = {
    confirmedHeroPreserved,
    refreshStartsAtLoading,
    stageMeasurements,
    consoleErrors,
    pageErrors,
    failedRequests,
    abortedMediaRequests,
    httpErrors,
  };

  if (confirmedHeroPreserved !== "true") throw new Error("Unconfirmed MIRA draft replaced confirmed RIFF");
  if (!refreshStartsAtLoading) throw new Error("Refresh did not reset the demo to loading");
  if (consoleErrors.length || pageErrors.length || failedRequests.length || httpErrors.length) {
    throw new Error(`Browser errors detected: ${JSON.stringify({ consoleErrors, pageErrors, failedRequests, httpErrors })}`);
  }

  writeFileSync(resolve(outputDir, "game-flow-browser-qa.json"), `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
