# PLAY → 游戏 → 结算集成验收

日期：2026-10-06。环境：Windows、bundled Node、bundled Playwright、headless Microsoft Edge。仅本地开发与生产预览验收，没有向外部站点部署。

## 可重复执行

在项目根目录运行；脚本从真实 App 加载页点击进入，经过大厅、角色选择与 PLAY，不能用独立游戏页代替该验收。

```powershell
npm run dev -- --host 127.0.0.1 --port 4176
node scripts/play-session-browser-qa.cjs
npm run build
npm run preview -- --host 127.0.0.1 --port 4180
$env:BASE_URL = 'http://127.0.0.1:4180'
node scripts/play-session-browser-qa.cjs
```

`BASE_URL` 默认是 `http://127.0.0.1:4176`。优先寻找已安装的 Playwright，找不到则使用 `C:/Users/25283/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright`，不安装新依赖。单独验证弹窗可设置 `QA_CASES=dialogs`；默认完整验收约四分钟，包括自然播放一局和独立故障上下文。

最终证据是 [开发 JSON](play-session/development/report.json) 与 [生产 JSON](play-session/production/report.json)：最终脚本均通过，分别在04:13:10.513Z、04:13:08.913Z结束。每个 case 分开记录 consoleErrors、pageErrors、requestfailed、媒体取消请求与 HTTP 错误。`initial-*`、`strictmode-injection-failure.json` 是诊断历史，不是最终验收结果。正常路径必须四类错误均为空；预期故障绝不并入正常路径后统一“忽略”。

## 自然媒体与真实成绩

开发和生产均自然完整播放原始前置视频至 `ended`（12.064 秒），之后才进入倒计时；视频期间 iframe BGM 时间为 0、倒计时隐藏、无游戏 HUD。属性为 `muted=false`、`volume=1`、`loop=false`、`controls=false`，Space/Escape 没有跳过。离开前置阶段记录视频暂停、时间归零、从 DOM 卸载。

首局以无游戏输入方式自然播放 BGM 至音乐结束（实际 duration 69.218005 秒），游戏自己发出 `rhythmgame:complete`。捕获而非替代的十个字段为：

```json
{
  "finalScore": 0, "maxCombo": 0,
  "perfect": 0, "good": 0, "miss": 80,
  "accuracy": 0, "repairPercent": 0, "starRating": 0,
  "totalNotes": 80, "judgedNotes": 80
}
```

正式结算 DOM 的得分、星级、Perfect、Good、Miss、Max Combo 与捕获值逐项一致，第一局没有 NEW RECORD。BGM 自然推进记录、真实焦点切换造成暂停及冻结时间、恢复、结算后旧 BGM 暂停均在 JSON 中。结算开场/循环在 Retry 离开后均暂停并从父 DOM 卸载。首局没有伪造 complete，也没有更改谱面时钟。

Retry 创建新 iframe、新 runId，无前置视频，直接准备并倒计时。这个第二局明确使用 **受控 BGM seek 到末尾**，由游戏自身自然 ended 发 complete；它只验证重试生命周期，不代表又完成了 69 秒实时间游玩。Next 返回大厅保留 PIKO，再次 PLAY 重播前置视频。

## 九项验收证据映射

| 规格项 | 浏览器证据 | 补充单元/契约证据与限制 |
| --- | --- | --- |
| 1 仅 PIKO 可保存 | 未确认 PLAY 打开角色页；保存 PIKO 后浏览 RIFF，SELECT 弹窗关闭后仍是 RIFF；回大厅直接启动 PIKO | App/hero-selection 测试覆盖拒绝角色不清空确认值 |
| 2 有声前置/失败/策略/后台 | 正常真实媒体推进；真实媒体请求 HTTP404 能进入游戏；注入 NotAllowedError 必須真实点击“点击继续播放”；注入 hidden 冻结、visible 恢复 | 实际系统后台 hidden、真实浏览器策略拒绝未知；注入不是实际后台证据 |
| 3 双条件/去重 | 自然 ready-first；延迟 iframe 形成 video-first，最后帧等待；重复 start、同当前来源同步 duplicate complete | PlaySession 两种顺序单元；桥接只启动/完成一次 |
| 4 超时/重载 | iframe HTML 延迟 26 秒，视频 ended 保留12.064秒最后帧，LOADING 后10秒超时；重新加载新局，不重播前置 | 返回大厅出口在非法成绩 case 中实际点击；精确9999/10000ms边界由单元覆盖 |
| 5 自动倒计时/焦点/清理 | 无第二START；iframe实际获焦；前置残留Space不导致得分；真实焦点切走暂停；视频、BGM、结算离开暂停 | 音效节点停止/输入监听清理由 Node 与 App 生命周期测试覆盖；扬声器重叠听感未知 |
| 6 全字段/来源/非法成绩 | 自然十字段全等与UI匹配；旧runId、父window错误源、错误origin不改变新局；负分非法成绩错误界面 | 每字段缺失、NaN/Infinity、整数、范围、计数未完成由result单元覆盖 |
| 7 Retry/Next/会话纪录 | 新iframe、跳视频、Next保PIKO和再次前置；首次/相等无纪录，更高显示纪录 | 更高/相等/duplicate成绩 case 是 **synthetic MessageEvent**，仅验证宿主纪录规则，绝非真实通关成绩 |
| 8 四尺寸/焦点/资源 | 2048×1152、1920×1080、1366×768、1280×720截图；舞台与HUD完整；正常路径无console/pageerror/requestfailed/HTTP错误 | 鼠标、键盘覆盖；真实触屏未覆盖 |
| 9 回归/发布/完整闭环 | 完整Vitest、Node游戏/runtime、类型、资产、生产build与4180自然闭环；HTTP/MIME/SHA256检查 | 这是本地生产预览验收，不是公网发布 |

## 视觉问题与最小修复

截图发现既有商店弹窗缺少基础按钮样式；新增角色弹窗复用同样结构，因此也显示小原生按钮。这不是角色选择新逻辑回归。真实1280×720 RED断言测得关闭按钮 56×23、约8.33px字体；历史报告 [red-before-css.json](play-session/development-dialog-regression/red-before-css.json) 保留失败。

仅给 `controls.css` 的 `.store-dialog-panel .game-button` 增加现有黄/墨色/字体tokens及尺寸。GREEN与最终开发/生产实际测量如下，两个弹窗都一致：

| 视口 | 实际按钮宽×高 | 实际字体 |
| --- | --- | --- |
| 2048×1152 | 180×72 | 24px |
| 1920×1080 | 168.75×67.5 | 22.5px |
| 1366×768 | 120×48 | 16px |
| 1280×720 | 112.5×45 | 15px |

关闭按钮保留自动焦点、点击关闭和输入隔离。App与Store定向回归31/31，最终全量Vitest209/209。未修改通用GameButton、游戏HUD或大厅。

每种环境的专属目录包含四种尺寸的 `hero-dialog-fixed`、`store-dialog-fixed`、`hero-dialog`、`pregame-video`、`gameplay`、`game-pause`、`settlement`、`policy-gesture`、`ready-timeout` 共36张截图。实际查看了前置、游戏、结算、两类弹窗和恢复覆盖层；视频按完整画幅显示，游戏HUD/暂停控件不阻断中央路径，Retry/Next完整可读，弹窗文字/按钮没有裁切。JSON保存每张截图和stage测量。

## 发布资源、检查与诊断

生产35项资源证据逐项包含路径、HTTP200、MIME、字节数和SHA256，远端响应字节与本次 `dist` 文件完全相等；覆盖根HTML、包含rhythm-game HTML在内的11个游戏运行文件、App JS/CSS、BGM及前置/结算/加载/大厅/角色视频。因此游戏HTML、脚本和媒体不是SPA回退HTML。保留 `emptyOutDir=false` 下的既有输出，不删除任何文件；额外旧JS/CSS亦核对HTTP/MIME/hash，不能将存在的旧产物当作当前入口。

`verify-assets.mjs` 显式加入 `embed-bridge.js`，除HTML引用闭包之外也检查该运行文件的间接资源引用。最终验证 `npm test -- --run` 21files/209tests、`npm run test:game`57tests、`npm run test:runtime`1test、类型、97资产检查和diff检查均退出0；全量原输出在 [checks.txt](play-session/checks.txt)。CSS修复后生产build成功，129模块，发布11游戏运行文件。`vite`的 `built in 471ms` 是耗时而非告警；Vitest的jsdom性能建议和Git LF/CRLF提示按原文保存，它们不是断言失败或diff空白错误。

历史QA脚本曾错误拦截Vite `.mp4?import`（把模块导入当媒体），导致开发App不能挂载；修正为只拦截resourceType=media。另一次只拒绝首次play的注入在开发StrictMode二次effect中被正常替代，因此改为真实恢复手势前持续拒绝。两个都是测试注入问题，失败JSON保留；未将它们当作产品通过。最初开发端口未监听，启动4176后恢复。

现有 `vite.config.ts` 的media named entry仍保留。App现在引用前置media，结算组件直接引用结算视频，常规应用依赖图已包含三资源；独立entry的资产保底作用已不再是当前App的唯一引用来源。移除entry会改变构建分块，本Task7未做无关构建整理。

`rhythm-game/README.md` 的 `rhythm-game/tests/hud-browser-qa.cjs`、`gameplay-note-types-qa.cjs` 指的是源游戏项目验证脚本，它们没有迁入本集成工作树；不能按README声称本工作树已运行。此集成的正式入口是 `scripts/play-session-browser-qa.cjs`；现有Node回归文件实际存在并已运行。

## 未覆盖的观察

扬声器真实听感、主观节拍质量、实际系统后台切换hidden及真实策略拒绝均未知；不由headless播放属性和控制注入推定。实际DOM失焦暂停已覆盖。触屏输入、其他浏览器和设备未覆盖。game-playtest引用的共享架构/完整checklist资源缺失，按技能正文、现存UI提示及本规格九验收项核对。本Task7不执行Task8最终独立复审，也不改源项目、既有大厅脏改动、旧QA或计划文件。

低优先级视觉观察：1280×720的超时/策略恢复按钮约33px高，文字比主要弹窗关闭按钮小，桌面点击可完成且没有裁切；实际触屏可用性未知。本次授权CSS修复限定在共享商店/角色弹窗，不扩展修改这些会话恢复按钮。另保留Task3清理中已移除note DOM引用是否释放的最终审查项，未做无关游戏改动。
