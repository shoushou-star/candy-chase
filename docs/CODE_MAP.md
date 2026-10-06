# 糖果追击 (Candy Chase) — 代码地图

> 本文件是整个仓库的架构地图，由代码探索汇总而成。**新增/移动文件、新增功能模块或入口时请同步更新本文件。**
> 仓库地址：https://github.com/shoushou-star/candy-chase · 部署目标：Netlify（个人作品集配套游戏站）

---

## 1. 项目概览

| 项 | 内容 |
|---|---|
| 技术栈 | Vite 8 + React 19 + TypeScript 7 + Phaser 4（依赖另含 @fontsource/montserrat） |
| 构建/测试 | `npm run build`（tsc 类型检查 + vite build）、`npm run test:run`（Vitest + Testing Library + jsdom） |
| 应用形态 | **双入口 MPA**：`index.html`（主应用）+ `gameplay.html`（玩法原型页） |
| 另有独立子项目 | `rhythm-game/`：零构建、零依赖的原生 JS 正式版节奏游戏（自有 HTML/JS/CSS/素材/测试） |
| 设计分辨率 | 2048×1152（`StageFrame` 等比缩放适配视口，两侧留黑边）；玩法页 1920×1080（Phaser Scale.FIT） |

## 2. 目录速览

```
游戏操作文件/
├─ index.html                 # 入口 1 → src/main.tsx → <App/>（当前渲染大厅页）
├─ gameplay.html              # 入口 2 → src/gameplay-main.tsx → <GameplayPrototypePage/>
├─ vite.config.ts             # Vite+Vitest 共用配置；rollup 双 HTML 入口；未设自定义 base
├─ tsconfig{,.app,.node}.json # TS project references（src / vite.config 两域）
├─ netlify.toml               # Netlify 构建配置（build=npm run build, publish=dist）
├─ assets/                    # 根级静态素材（hero-logos、大厅黑胶、结算标题抠图）
├─ src/                       # React 应用源码（见 §3）
├─ rhythm-game/               # 独立原生 JS 正式版节奏游戏（见 §4）
├─ scripts/                   # 资源校验 + 3 个 Playwright 浏览器 QA 脚本（见 §6）
└─ docs/                      # 设计规格/实现计划/QA 证据 + 本代码地图（见 §7）
```

## 3. React 应用层（src/）

### 3.1 文件清单

```
src/
├─ main.tsx / gameplay-main.tsx     # 两个入口的挂载文件
├─ App.tsx (+test)                  # 根组件 = StageFrame + LobbyPage（暂未传 onAction）
├─ components/                      # GameButton / StageFrame(2048×1152 缩放容器) / StoreUnavailableDialog
├─ pages/                           # TemporaryHomePage / GamePlaceholderPage（占位页）
├─ features/hero-select/            # 英雄选择模块：HeroSelectExperience 容器 + 页面/卡片/货币组件
│                                   #   heroes.ts(5 英雄静态数据) selection.ts(纯函数) useHeroAssets.ts(预加载)
├─ features/lobby/                  # 大厅模块：LobbyPage + 资料条/货币/按钮 + lobby-data.ts + useLobbyAssets.ts
├─ gameplay/                        # Phaser 玩法原型（gameplay.html 专用，见 §4.2）
├─ styles/                          # tokens.css(设计变量) global.css(两入口共享) + 各页面 css
├─ assets/                          # figma 图/英雄 logo/英雄视频 mp4/大厅素材（组件 import，经 Vite 处理）
└─ test/setup.ts                    # Vitest setup：jest-dom + 每例后 cleanup
```

### 3.2 页面流程与导航

1. **游戏大厅**（index.html 当前唯一屏幕）：视频背景、玩家资料条、三货币、PLAY、菜单/每日/工具按钮。按钮 `onAction` 回调契约已就绪但**暂未接线**。
2. **英雄选择流**（`HeroSelectExperience`，已实现已测试，**暂未被入口挂载**）：临时首页 → 英雄选择页（视频背景+轮播+SELECT）→ 游戏占位页。
3. **玩法原型**（gameplay.html 直接访问）：开始遮罩 → 2s 倒计时 + HUD（修复率/倒计时/COMBO/判定）→ 结算遮罩。

⚠️ 两个 HTML 入口之间**没有任何代码级跳转**（无路由库、无 window.location、无 `<a>`）；`index.html` 标题仍为"角色选择"，实际渲染的是大厅（历史遗留）。大厅 PLAY → 游戏的衔接计划见 `docs/superpowers/plans/2026-10-06-play-game-settlement-integration-implementation.md`（**尚未实施**，embed-bridge.js 不存在）。

### 3.3 架构模式

- **状态管理**：无全局状态库；容器组件 useState + props 下行/回调上行；无持久化。
- **资源加载**：自定义 Hook（useHeroAssets/useLobbyAssets）用 `new Image()` 预加载，输出 idle/loading/ready/error。
- **Phaser 集成**：仅 `src/gameplay/ui/GameplayPrototypePage.tsx` 包裹 Phaser，经 `createGameplayGame()` 工厂返回 `GameplayController{start/restart/subscribe/destroy}`；场景每 ≥50ms 推 `SessionSnapshot` 给 React 渲染 DOM HUD；输入在 Phaser 侧捕获，规则委托给框架无关的 `RhythmSession`。

## 4. 节奏游戏：两套实现并存

| | ① `rhythm-game/`（**正式版**） | ② `src/gameplay/`（灰盒原型） |
|---|---|---|
| 技术 | 原生 JS + DOM/SVG + Canvas 特效，零构建 | React + Phaser 4 Graphics 矢量绘制 |
| 入口 | `rhythm-game/index.html`（静态服务器直接访问） | 根 `gameplay.html`（Vite 构建） |
| 谱面 | 80 事件（48 normal/20 speed/12 hold），BPM120，69.2s | 30 事件（20 normal/6 rush/4 hold），45s |
| 判定 | Perfect ±100ms / Good ±200ms | ±90ms / ±180ms |
| 计分 | 满分 9200，星级阈值 20/40/60/75/90% | 加权修复率，三档标题 |
| 音频 | **真实 BGM** `assets/audio/game-bgm.m4a` + AudioClock（媒体 currentTime 即游戏时钟）+ 独立 SFX AudioContext | 程序化 WebAudio 节拍器（无音频文件），无暂停功能 |
| 暂停 | 完整：失焦/隐藏页自动暂停，长按重进（reengaging，1.5s 窗口），lifecycleVersion 并发防护 | 无 |
| 核心文件 | `app.js`(状态机+渲染) `game-core.js`(纯逻辑,UMD) `game-chart.js` `audio-clock.js` `magic-attack-d.js`(闪粉魔法光波特效,监听 rhythmgame:* 事件) `countdown-assets.js/css`(寄生式倒计时 PNG 替换层) | `render/GameplayScene.ts` `render/createGameplayGame.ts` `render/motion.ts` `domain/{RhythmSession,chart,judgement,score}.ts` `audio/PrototypeAudio.ts` `styles/gameplay.css` |
| 测试 | `rhythm-game/tests/`（6 文件：判定/计分/谱面/时钟/BGM 打包/2 个浏览器回归 .cjs） | `src/gameplay/**` 内 6 个 .test 文件 |

素材清单（`rhythm-game/assets/`，共 15 文件）：audio 1（BGM 1.1MB）、backgrounds 1、candies 3（粉=normal/黄=speed/蓝=hold）、characters 3（企鹅 idle/success/miss）、ui 7（判定点 + 倒计时 1~3 + 判定图 perfect/good/miss）。`effect-preview.html` 是 4 种攻击特效的决策样片，与运行时无关。

## 5. 音频架构要点（正式版）

- 双时钟：BGM 用 `AudioClock` 直读媒体元素时间；SFX 用独立 AudioContext（880/660Hz 正弦命中音）。
- 启动链：whenReady(等 metadata) → unlock(静音 play/pause 保住用户手势) → 3s 倒计时 → playFromStart。
- 暂停恢复：冻结媒体 + suspend SFX + 派发 `rhythmgame:pause` 清粒子；长按中暂停则进入 reengaging 态（显示 HOLD，1.5s 内重新按住可续，超时判 Miss）。
- 并发防护：`lifecycleVersion` 丢弃过期异步续体（commit 54078b1 修复：suspend 列表补上 `reengaging` 态）。

## 6. 脚本工具（scripts/）

| 脚本 | 用途 | 调用 |
|---|---|---|
| `verify-assets.mjs` | 校验 src/assets 约 50 个必需资源存在/非空，PNG 头校验 2048×1152 | `npm run verify:assets` |
| `gameplay-browser-qa.cjs` | 无头 Edge 多视口截图 gameplay.html，输出 docs/qa/* | `node scripts/...`（需先 `vite preview`，端口 4174） |
| `gameplay-hud-qa.cjs` | 测量 HUD 元素相对舞台的尺寸/字号比例 | 同上 |
| `lobby-browser-qa.cjs` | 大厅背景视频自动播放/循环验证（注意：require 的是 playwright 而非 playwright-core，且硬编码 dev 端口 4173） | 需 dev server |

## 7. 文档索引（docs/）

- `superpowers/specs/`（7 份设计规格）与 `superpowers/plans/`（7 份实现计划），按日期命名，覆盖：英雄选择(09-28)、大厅(09-30)、流程整合(10-01)、玩法原型(10-01)、HUD(10-03)、BGM+音符类型(10-05)、PLAY→结算衔接(10-06，**待实施**)。
- `qa/`：2 份 MD 报告 + 5 份 JSON 机器报告 + 约 31 张 PNG 截图（大厅/HUD/玩法流程/长按/BGM 音符类型）。
- `CODE_MAP.md`：本文件。

## 8. 构建与部署（Netlify）

- 配置见根目录 `netlify.toml`：`command = "npm run build"`，`publish = "dist"`。
- `dist/` 含两个入口（index.html + gameplay.html）及全部 src 引用素材。
- ⚠️ **已知缺口**：`rhythm-game/` 正式版不在 Vite 构建产物中（不在 public/ 目录，Vite 不拷贝）。上线正式版需二选一：移入 `public/rhythm-game/`（dev/build 均可访问），或构建后追加拷贝步骤。若按 10-06 计划改为 iframe 嵌入则需一并处理。
- ⚠️ `package.json` name 仍为 `hero-select-web`，与仓库名 candy-chase 不一致（不影响构建）。
- vite 未设 `base`：如将来部署到子路径（如 作品集域名/game/）需添加 `base` 后重build。

## 9. 维护约定

- 新增组件/模块 → 更新 §3.1；玩法逻辑变更 → 更新 §4；新增脚本 → §6；新增规格/计划 → §7；部署配置变更 → §8。
- 完成某项"待实施/未接线"工作后，请删除对应 ⚠️ 标记。
