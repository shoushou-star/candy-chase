# 糖果追击 (Candy Chase) — 代码地图

> 本文件是整个仓库的架构地图，由代码探索汇总而成。**新增/移动文件、新增功能模块或入口时请同步更新本文件。**
> 仓库地址：https://github.com/shoushou-star/candy-chase · 部署目标：Netlify（个人作品集配套游戏站）
> 回滚锚点：`backup-20261007-main` 标签 / `backup/main-pre-game-flow-merge` 分支 = 游戏流程整合合并前的 main（7366c31）

---

## 1. 项目概览

| 项 | 内容 |
|---|---|
| 技术栈 | Vite 8 + React 19 + TypeScript 7 + Phaser 4（依赖另含 @fontsource/montserrat） |
| 构建/测试 | `npm run build`（tsc + vite build + **copy-game-runtime 拷贝游戏运行时**）、`npm run test:run`（Vitest，仅 src/）、`npm run test:game`（node --test，rhythm-game/）、`npm run test:runtime`（拷贝脚本测试） |
| 应用形态 | 主入口 `index.html` 承载**完整游戏流程**（单一 React SPA，屏幕间状态切换）；`gameplay.html` 为独立灰盒原型页（遗留） |
| 独立子项目 | `rhythm-game/`：零构建原生 JS 节奏游戏运行时，支持**独立模式**与 **embed 嵌入模式**（iframe + postMessage），构建时由脚本拷入 dist |
| 设计分辨率 | 2048×1152（StageFrame 等比缩放）；游戏画布 1920×1080 |

## 2. 目录速览

```
candy-chase/
├─ index.html                 # 唯一主入口 → src/main.tsx → <App/>（完整流程状态机）
├─ gameplay.html              # 灰盒原型入口（遗留） → src/gameplay-main.tsx
├─ vite.config.ts             # 三入口：app + gameplay + media.ts（游戏流程视频）；emptyOutDir:false
├─ netlify.toml               # Netlify 构建（build=npm run build, publish=dist）
├─ rhythm-game/               # 原生 JS 游戏运行时（见 §4，构建时拷入 dist/rhythm-game/）
├─ scripts/                   # copy-game-runtime + verify-assets + 5 个 Playwright QA 脚本（见 §6）
├─ assets/                    # 根级素材（hero-logos、结算标题抠图等）
├─ src/                       # React 应用源码（见 §3）
└─ docs/                      # 规格/计划/QA 证据 + 本代码地图
```

## 3. React 应用层（src/）

### 3.1 模块清单

```
src/
├─ main.tsx / gameplay-main.tsx     # 两个入口挂载文件
├─ App.tsx                          # ★ 完整游戏流程状态机（见 3.2）
├─ components/                      # GameButton / StageFrame / StoreUnavailableDialog
│                                   #   StartGameDialog（开始游戏确认）/ HeroUnavailableDialog / useDialogFocus(焦点圈定Hook)
├─ features/game-flow/              # ★ 流程衔接核心：PlaySession（一局游戏的所有者）
│                                   #   GameplayFrame（iframe 宿主） PregameVideo（前置视频）
│                                   #   ScreenTransition（屏幕转场） bridge(postMessage 协议)
│                                   #   media.ts（视频资源入口） result.ts（结算数据转换）
├─ features/loading/                # LoadingPage（启动加载页 + 进度）
├─ features/settlement/             # SettlementPage / SettlementSequence（结算编排 + 视频）/ sessionRecord
├─ features/hero-select/            # 英雄选择（5 英雄轮播、视频背景、资产预载）
├─ features/lobby/                  # 大厅（PLAY/菜单/货币；onAction 路由 hero→onOpenHeroSelect、play→onPlay）
├─ gameplay/                        # Phaser 灰盒原型模块（gameplay.html 专用，遗留）
├─ pages/                           # 旧占位页（TemporaryHome/GamePlaceholder，hero-select 内部）
├─ styles/                          # tokens/global + 各屏 css（settlement.css 最大）
└─ test/setup.ts                    # Vitest setup
```

### 3.2 完整游戏流程（App.tsx 状态机）

```
loading → lobby → hero-select（仅 PIKO 可确认） → pregame-video → gameplay(iframe) → settlement → lobby
```

- 屏幕切换经 `useScreenTransition`（350ms 转场动画）；一局游戏 = 一个 `runId`，`PlaySession` 拥有 iframe 与全部计时器；游戏事件（ready/start/complete）经 `bridge.ts` postMessage 传递，迟到的导航请求按 runId 丢弃。
- 大厅 PLAY：未确认英雄 → 打开英雄选择；已确认 PIKO → StartGameDialog → 前置视频 → 内嵌游戏。
- 结算：`SettlementSequence` 播结算视频并展示成绩（本局 + 会话最佳/新纪录），来源 `rhythmgame:complete` 事件（十字段契约，见 rhythm-game/README）。
- 测试：`src/App.test.tsx` 覆盖完整流；`PlaySession/PregameVideo/SettlementSequence` 均有组件测试。

## 4. rhythm-game/ 游戏运行时（原生 JS）

| 项 | 内容 |
|---|---|
| 模式 | 独立模式（直接访问 `/rhythm-game/`）与 embed 模式（iframe `?embed=1&runId=N`，遮罩交给宿主、经 embed-bridge 通信） |
| 核心文件 | `app.js`（状态机+渲染，含 embed 启动协议与音频恢复遮罩）· `embed-bridge.js`（postMessage 桥）· `game-core.js`（纯逻辑 UMD）· `game-chart.js`（80 事件谱面）· `audio-clock.js`（媒体时钟）· `magic-attack-d.js`（攻击特效，含 iframe 缩放与父页布局监听）· `countdown-assets.js/css`（倒计时 PNG 替换层） |
| 素材 | assets/：BGM 1 首（1.1MB/69.2s）、背景 1、糖果 3（粉=normal/黄=speed/蓝=hold）、企鹅 3 态、UI 7（判定点/倒计时 1~3/判定图 3） |
| 判定/计分 | Perfect ±100ms / Good ±200ms；满分 9200；星级阈值 20/40/60/75/90% |
| 暂停/恢复 | 失焦/隐藏自动暂停；长按重进（reengaging 1.5s 窗口）；lifecycleVersion 并发防护（含 disposed 态） |
| 测试 | `tests/`：4 个 node:test 单测 + attack-event-contract + embed-bridge 契约 + 2 个浏览器 QA（`npm run test:game`） |
| 发布 | `scripts/copy-game-runtime.mjs` 在 build 末尾拷贝 11 个运行时文件 + assets → `dist/rhythm-game/`（有快照测试） |

## 5. 音频架构

- 双时钟：BGM 用 `AudioClock` 直读媒体 currentTime；SFX 独立 AudioContext（正弦命中音）。
- 启动链：whenReady → unlock（保用户手势）→ 3s 倒计时 → playFromStart；embed 模式下由宿主 start 触发。
- embed 音频恢复：宿主转场可能导致音频中断，独立模式有 `audioRecoveryOverlay` 遮罩引导点击恢复。

## 6. 脚本工具（scripts/）

| 脚本 | 用途 |
|---|---|
| `copy-game-runtime.mjs` | build 末尾发布游戏运行时到 dist/rhythm-game/（`npm run test:runtime` 校验） |
| `verify-assets.mjs` | 校验 src/assets 必需资源存在与尺寸（`npm run verify:assets`） |
| `play-session-browser-qa.cjs` | 完整游玩会话浏览器 QA（dev+production） |
| `hero-start-browser-qa.cjs` / `video-handoff-browser-qa.cjs` | 英雄确认起点 / 前置视频→游戏交接 的专项 QA |
| `gameplay-browser-qa.cjs` / `gameplay-hud-qa.cjs` | 灰盒原型页 QA（遗留） |
| `lobby-browser-qa.cjs` | 大厅背景视频 QA |

QA 脚本用 playwright-core + Edge，产物写入 `docs/qa/`。

## 7. 文档索引（docs/）

- `superpowers/specs/`（8 份设计规格）与 `superpowers/plans/`（8 份实现计划）：英雄选择、大厅、流程整合、玩法原型、HUD、BGM 音符、**PLAY→游戏→结算整合（已实施 ✓）**。
- `qa/`：game-flow / play-session（development+production）/ hero-start / video-handoff / rhythm-gameplay / rhythm-game-hud / hold / bgm-note-types 等多组 MD+JSON+截图。
- `CODE_MAP.md`：本文件。

## 8. 构建与部署（Netlify）

- `netlify.toml`：`command = "npm run build"`（内部含类型检查、vite 构建、运行时拷贝三步）、`publish = "dist"`。
- dist 内容：`index.html`（完整流程）+ `gameplay.html`（灰盒原型）+ 哈希 JS/CSS/媒体（含 pregame/settlement 视频）+ `rhythm-game/` 运行时。
- vite `emptyOutDir: false`（配合拷贝脚本的既定行为）；未设 `base`，若部署到子路径需添加后重build。

## 9. 维护约定

- 新增组件/模块 → §3.1；流程变更 → §3.2；游戏运行时变更 → §4；新增脚本 → §6；新增规格/计划 → §7；部署配置变更 → §8。
- 完成某项"遗留/待办"后删除对应标记。当前遗留：`gameplay.html` 灰盒原型页（保留但非主线）。
