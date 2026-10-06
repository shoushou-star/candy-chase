# PLAY → 视频 → 游戏 → 结算 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. 本计划默认在当前会话内串行执行；用户明确选择委派后才使用 subagent-driven-development。

**Goal:** 仅 PIKO 可从大厅进入有声前置视频、自动倒计时和真实节奏游戏，完成后进入正式成绩结算，Retry 直接重开，Next 返回大厅。

**Architecture:** React 主流程管理状态和会话纪录。同源 iframe 保留现有 rhythm-game，通过 ready/start/complete 消息桥接；前置视频结束和 iframe ready 同时成立后才启动。选择性复用 SettlementSequence，成绩来自游戏事件。

**Tech Stack:** React、TypeScript、Vite、Vitest、现有原生 JavaScript rhythm-game、HTMLMediaElement、postMessage；浏览器验收使用已配置的自动化运行时。

**Spec:** `docs/superpowers/specs/2026-10-06-play-game-settlement-integration-design.md`（用户已确认）。

## Global Constraints

- 不删除任何文件，不递归或批量删除文件夹。保护所有原有未提交内容。
- 执行目录：`C:/Users/25283/.codex/worktrees/game-flow-integration/游戏操作文件`，先核对现有状态；该目录的写操作需按工具权限请求必要审批。
- 游戏源：`D:/05 ai作品集/04/游戏操作文件/rhythm-game`，已报告提交 `1bef9d58e8cee553c4ede5ff33f6cfacdaf669ed`；实施前核对实际版本与未提交依赖。
- 结算源：`C:/Users/25283/.codex/worktrees/settlement-page/游戏操作文件/src`，包括未提交动画修复；固定文件哈希。
- 前置视频源：`D:/05 ai作品集/04/素材储存/游戏资产1/视频节点 17 - 副本.mp4`；12.064 秒、1920×1080、24fps，保留声音与源文件。
- 仅 `piko` 可确认；其他 SELECT 提示暂未开发并保持当前角色，不覆盖已有 PIKO。
- 每次大厅 PLAY 完整播放前置视频；无跳过。Retry 跳过视频、直接倒计时；Next 返回大厅保留角色与会话最高分。
- 前置视频结束后等待 ready 最多 10 秒，显示可重试/返回界面；策略拒绝播放用手势恢复，不冒充媒体失败。
- 接口传递全部 10 个字段；不得读取 HUD 文本或采用 Demo 假成绩。
- 媒体、异步回调与 iframe 生命周期按 runId 隔离，离开后无残留音频。
- 独立游戏入口继续可用；桥接仅作用于 `embed=1` 模式。
- 每个任务提交只包含自己修改且确认归属的文件；不使用 `git add .`。源工作树不提交/修改，除非用户另行授权。

## 文件职责与依赖

新增 `src/features/game-flow/result.ts` 定义/校验成绩、映射与会话纪录；`src/features/game-flow/bridge.ts` 定义消息及来源校验；`GameplayFrame.tsx` 管理 iframe、监听、焦点及启动；`PregameVideo.tsx` 管理有声视频、恢复和就绪等待；`PlaySession.tsx` 编排单次启动和重试。`App.tsx` 保留顶层页面转场并接入这些组件。

新增 `src/components/HeroUnavailableDialog.tsx`，复用现有弹窗样式与焦点模式。迁入 `src/features/settlement` 实际使用的组件/测试、`src/styles/settlement.css` 和 `src/assets/settlement`；不接入 SettlementDemo。迁入完整游戏运行目录，新增 `rhythm-game/embed-bridge.js`。`scripts/copy-game-runtime.mjs` 将明确白名单运行文件及素材复制到 dist；不删除既有构建文件。

新增视频 `src/assets/game-flow/pregame-intro.mp4`，新增 `src/styles/play-session.css`。新增 `scripts/play-session-browser-qa.cjs` 和 `docs/qa/play-session-integration.md` 保存验收证据。

任务依赖：1 → 2 → 3 → 4/5 → 6 → 7 → 8；串行执行，避免 App 与共享游戏文件并发修改。

### Task 1: 固定来源并发布运行资源

**Files:** 游戏运行目录；结算依赖目录；前置视频；`scripts/copy-game-runtime.mjs`、`scripts/verify-assets.mjs`、`package.json`、`vite.config.ts`；`docs/qa/play-session-source-manifest.json`。

**Interfaces:** 生产与开发均在 `/rhythm-game/index.html` 提供同源游戏；视频通过 Vite import；结算入口 `SettlementSequence(props)`。

- [ ] 记录三个工作区 `git status --short --branch` 与 `git rev-parse HEAD`，列出游戏 index.html 中引用的脚本、样式和素材，按引用闭包同步，包括未跟踪的倒计时与角色素材。保留旧集成背景改动。复制规格/计划到执行工作树，状态改为已确认。
- [ ] 对源与复制件用 SHA256 校验并写来源清单；复制二进制使用 Copy-Item，文本编辑使用 apply_patch，不覆盖内容不一致的目标文件前先检查 diff。源文件保持原样。
- [ ] 迁入 SettlementSequence、SettlementPage、sessionRecord、相应测试和实际 import 的素材/样式，不迁入 Demo 假成绩作为主入口。
- [ ] 在 `copy-game-runtime.mjs` 中采用如下白名单复制结构，实际 runtimeFiles 从 HTML 引用核对：

```js
import { cpSync, mkdirSync } from 'node:fs';
const runtimeFiles = ['index.html', 'app.js', 'game-core.js', 'game-chart.js',
  'audio-clock.js', 'styles.css', 'countdown-assets.js', 'countdown-assets.css',
  'magic-attack-d.js', 'magic-attack-d.css'];
mkdirSync('dist/rhythm-game', { recursive: true });
for (const file of runtimeFiles) cpSync(`rhythm-game/${file}`, `dist/rhythm-game/${file}`);
cpSync('rhythm-game/assets', 'dist/rhythm-game/assets', { recursive: true });
```

- [ ] build 脚本在 Vite build 后调用复制脚本；Task 3 加入 embed-bridge.js 白名单。Vitest include 限定 `src/**/*.test.{ts,tsx}`，Node 原生测试单独运行，防止误报无 Vitest suite。
- [ ] 执行 `npm run verify:assets`、`npm run build`；确认 dist 的游戏 HTML、BGM、倒计时、JS/CSS 和结算视频非空。记录原有失败与新增失败；提交明确资源/配置文件，不把无关 package 变化纳入。

### Task 2: 成绩与消息契约

**Files:** Create `src/features/game-flow/result.ts`、`bridge.ts`、`result.test.ts`、`bridge.test.ts`。

**Interfaces:** `RhythmGameResult` 全字段类型；`parseResult(value: unknown): RhythmGameResult | null`；`toSettlementProps(result)`；`recordResult(result, previousBest: number | null)` 返回 `{ bestScore, isNewRecord }`；`isCurrentGameMessage(event, frameWindow, origin, runId): boolean`。

- [ ] 写行为测试，先观察失败：

```ts
const completed = { finalScore: 9200, maxCombo: 80, perfect: 80, good: 0,
  miss: 0, accuracy: 100, repairPercent: 100, starRating: 5,
  totalNotes: 80, judgedNotes: 80 };
it('rejects unfinished counts and non-finite scores', () => {
  expect(parseResult({ ...completed, judgedNotes: 79 })).toBeNull();
  expect(parseResult({ ...completed, finalScore: Infinity })).toBeNull();
});
it('compares before updating the session best', () => {
  expect(recordResult(completed, null)).toEqual({ bestScore: 9200, isNewRecord: false });
  expect(recordResult(completed, 9000)).toEqual({ bestScore: 9200, isNewRecord: true });
  expect(recordResult(completed, 9200).isNewRecord).toBe(false);
});
```

- [ ] 实现字段存在、有限、非负、计数整数、星级 0–5、百分比 0–100、计数相等与 maxCombo ≤ totalNotes 校验；不依赖当前谱面常量。将 finalScore/starRating 映射到 score/stars。
- [ ] 消息定义 ready/start/complete 判别联合；当前来源必须同时满足 `event.source === frameWindow`、`event.origin === origin`、对象 runId 等于当前整数 runId。测试错 origin、错 source、旧 runId、非对象及缺字段。
- [ ] 运行 `npm test -- --run src/features/game-flow/result.test.ts src/features/game-flow/bridge.test.ts`，修正至通过。提交本任务 4 个文件。

### Task 3: 游戏嵌入桥接

**Files:** Modify `rhythm-game/app.js`、`index.html`；Create `rhythm-game/embed-bridge.js`、`rhythm-game/tests/embed-bridge.test.js`；更新复制脚本。

**Interfaces:** URL `/rhythm-game/index.html?embed=1&runId=N`；ready/start/complete 协议同 Task 2。桥接模块暴露 `createEmbedBridge({ window, runId, prepare, start, dispose })`，start 调用现有启动函数。

- [ ] 写实际桥接行为测试（Node test、fake parent 与可控制的 prepare promise）：prepare 未完成不发送 ready；完成后发送一次；错误 parent/origin/runId 不启动；两个合法 start 仅调用一次；游戏完成事件原样传出 result；dispose 后不处理输入。
- [ ] 执行 `node --test rhythm-game/tests/embed-bridge.test.js`，确认失败点来自缺失桥接功能。
- [ ] 在 app 初始化底部接入桥接，嵌入模式隐藏 START/result overlay、等待资源及 BGM metadata 可用后 ready；启动调用原有音频解锁与倒计时入口并 resetInput。不要通过点击隐藏按钮替代生命周期接口。

```js
const embedded = new URLSearchParams(location.search).get('embed') === '1';
// 桥接内部监听原有完成事件并转发，不重新计分。
window.addEventListener('rhythmgame:complete', event => {
  if (embedded) parent.postMessage({ type: 'rhythmgame:complete', runId,
    result: event.detail }, location.origin);
});
```

- [ ] 游戏退出执行清理入口，停止 BGM/SFX 和动画，并取消桥接监听；保留独立页面旧结果与 START。
- [ ] 运行 `node --test rhythm-game/tests/*.test.js rhythm-game/attack-event-contract.test.js` 和相关 `node --check`。浏览器验证隐藏预加载时无声、start 后倒计时且 BGM 推进；真实策略拒绝显示可点击的音频恢复入口，不能假称自动音频已验收。
- [ ] 提交桥接与必要 app/index 增量及测试，不修改判定或谱面。

### Task 4: PIKO 确认与未开发提示

**Files:** Create `src/components/HeroUnavailableDialog.tsx`；Modify `src/App.tsx`、`src/App.test.tsx`（若已有流程测试在其他文件，保留该文件并增加对应案例）。

**Interfaces:** `HeroUnavailableDialog({ open, triggerRef, onClose })`；确认分支仅 piko 调用 setConfirmedHeroId。

- [ ] 添加交互测试：选 riff → SELECT → 提示 → 关闭 → riff 仍选中；已确认 piko 后其他 SELECT 不覆盖；piko SELECT 保存但不自动跳转。
- [ ] 运行对应 React 测试观察失败。
- [ ] 复用 StoreUnavailableDialog 的样式和 focus/Escape/Tab 处理创建专用文案组件，打开时隔离底层输入，关闭回到 SELECT 触发按钮。App 中草稿与确认保持独立：

```ts
function confirmPlayableHero(heroId: HeroId) {
  if (heroId !== 'piko') { setHeroUnavailableOpen(true); return; }
  setConfirmedHeroId(heroId);
}
```

- [ ] 大厅 PLAY 对 confirmedHeroId 做 piko 检查，其他状态打开角色页。运行新增案例及原角色/大厅回归测试；提交只含本任务文件。

### Task 5: iframe 容器、有声视频与双条件启动

**Files:** Create `GameplayFrame.tsx`、`PregameVideo.tsx`、`PlaySession.tsx` 及各自 `.test.tsx`，均位于 `src/features/game-flow`；Create `src/styles/play-session.css`。

**Interfaces:** `GameplayFrame({runId, active, onReady, onComplete, onError})`；`PregameVideo({onFinished})`；`PlaySession({runId, playIntro, onComplete, onRetryLoad, onReturnToLobby})`。onComplete 参数为 RhythmGameResult，组件内先校验来源，再交给 Task 2 parseResult。

- [ ] 添加测试覆盖两种 ready/ended 顺序、重复事件、超时、Retry 跳视频、背景暂停和策略拒绝：

```ts
it('does not start until both video and game are ready', () => {
  const { getByLabelText } = render(<PlaySession runId={1} playIntro
    onComplete={vi.fn()} onRetryLoad={vi.fn()} onReturnToLobby={vi.fn()} />);
  fireEvent.ended(getByLabelText('游戏开场视频'));
  expect(screen.getByText('LOADING...')).toBeInTheDocument();
  // 发送 source 为该 iframe.contentWindow、同源 runId=1 的 ready。
  const frame = screen.getByTitle('节奏游戏') as HTMLIFrameElement;
  fireEvent(window, new MessageEvent('message', { origin: location.origin,
    source: frame.contentWindow, data: { type: 'rhythmgame:ready', runId: 1 } }));
  expect(frame).not.toHaveAttribute('aria-hidden', 'true');
});
```

- [ ] GameplayFrame 监听在挂载时安装，load 不代表 ready；为 iframe 设置同源 URL 与 autoplay 权限；预加载时隐藏并 inert，active 后焦点进入 iframe并只发送一次 start。拒绝旧局与重复 complete，无效合法来源成绩触发 onError。
- [ ] PregameVideo import MP4，使用 ref.play() 检查 promise：NotAllowedError 显示“点击继续播放”，媒体 error 则 onFinished；ended 去重。visibilitychange 隐藏暂停、可见续播，续播拒绝保留手势入口。等待交接时不归零；unmount 暂停并归零。
- [ ] PlaySession 维护 ready/finished/error，条件成立才 active；finished 且未 ready 开始 10000ms 计时，超时出现“重新加载”“返回大厅”；重新加载由 App 更新 runId，保存 intro 已完成状态，不重看视频。Retry 场景 playIntro=false，等待 ready 后直接 start。
- [ ] React 测试通过后用真实浏览器核对自动音频、窗口切换及媒体错误，不把 jsdom 媒体 mock 当作声音播放证据。提交本任务文件。

### Task 6: 接入顶层流程与真实结算

**Files:** Modify `src/App.tsx`、`src/features/game-flow/types.ts`、`src/App.test.tsx`；复用迁入的 SettlementSequence。

**Interfaces:** AppScreen 加入 pregame-video/gameplay/settlement；使用 runId、latestResult、sessionBestScore、isNewRecord 和 playIntro。保留旧占位页文件，主流程不再使用它。

- [ ] 添加测试：确认 PIKO → 返回 → PLAY → 视频/ready → 游戏完成 → 真实结算；重复 complete 不更新纪录；Retry 新 runId 无前置视频；Next 保留 PIKO；首次/更高/相等分数纪录分支。
- [ ] 在屏幕状态中保持同一 PlaySession 实例从 pregame-video 进入 gameplay，不能转场时卸载预加载 iframe；只在 runId 改变、结算或返回大厅时卸载。
- [ ] 首次有效 result 到达时先 recordResult 再更新最高分，保留新纪录布尔值，映射结算 props：

```tsx
<SettlementSequence {...toSettlementProps(latestResult)}
  isNewRecord={isNewRecord} onRetry={retryGame} onNext={returnToLobby} />
```

- [ ] Retry 设置最新成绩为空、runId+1、playIntro=false；Next 回大厅保留 confirmedHeroId 与 sessionBestScore。预览中游戏开始后前置视频声音已停，结束后旧结果框不闪出。
- [ ] 执行 App、桥接、角色、结算序列定向测试；提交本任务文件。

### Task 7: 完整浏览器闭环与生产发布验证

**Files:** Create `scripts/play-session-browser-qa.cjs`；Update `scripts/verify-assets.mjs`；Create `docs/qa/play-session-integration.md` 与专属截图/报告。

- [ ] 脚本接受 `BASE_URL`，从加载页真实操作角色选择与 PLAY，不能仅绕过 App 在独立游戏页面验证。记录 console error、pageerror、requestfailed 与完成数据。
- [ ] 验证前置视频时间推进、声音属性、无跳过；视频结束才倒计时；BGM currentTime 推进；玩完一局确认结算数字与捕获成绩一致。可以增加受控谱面时间案例以测试满分，但必须另有真实媒体推进证据。
- [ ] 测试 Retry iframe 不同实例、Next 返回、旧 runId 消息忽略；资源错误/延迟、NotAllowedError、失焦暂停、重复完成和非法成绩分支。
- [ ] 2048×1152、1920×1080、1366×768、1280×720 截图检查舞台、视频完整度、按钮、iframe 与弹窗；记录人工听感与触屏未覆盖项。
- [ ] 运行 `npm test -- --run`、Node 游戏测试、`npm run typecheck`、`npm run verify:assets`、`npm run build`、`git diff --check`。构建后用 `npm run preview -- --host 127.0.0.1 --port 4180`，确认 `/rhythm-game/index.html`、BGM、每个运行脚本及视频均返回正确 MIME 与 HTTP 200，并在生产预览跑闭环。
- [ ] 若自动化依赖缺失先定位已有 bundled/runtime 依赖，不擅自改变项目 dependencies；若仍无法运行，报告实际缺口，不能声称浏览器验收通过。

### Task 8: 交付与预览

**Files:** `docs/qa/play-session-integration.md`、计划复选项及来源清单。

- [ ] 对照规格 9 条验收逐项写证据或具体限制；来源 manifest 记录最终版本与资源哈希。
- [ ] 查 final diff，保护已有 `docs/qa/game-flow-browser-qa.json` 修改，确认本任务未改变无关源工作区、未删除文件。
- [ ] 保持集成工作区 Vite 在 4176 运行；HTTP 检查后调用 open_in_codex 打开最新预览。若工具返回 queued，只报告已请求打开，不能声称确认了可见标签页。
- [ ] 交付说明已实现行为、测试结果、浏览器真实音频情况及仍未完成的人工复审项；不将游戏来源对话的旧测试报告作为本次新鲜验收。

## 自审与执行交接

规格全部章节已映射到任务：来源/生产资源 Task 1；通信/成绩 Task 2–3；角色 Task 4；视频/时序/错误 Task 5；主流程/纪录/出口 Task 6；生命周期与实际发布 Task 3、5、7；最终验收 Task 7–8。接口名称与 runId 在全部任务一致。

默认执行方式为当前会话逐任务执行（executing-plans）。用户明确要求子代理时才改用委派方式。计划准备完成，等待开始实施指令。
