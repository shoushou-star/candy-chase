# PLAY → 游戏 → 结算集成验收

日期：2026-10-06。环境：Windows、bundled Node、bundled Playwright、headless Microsoft Edge。仅本地开发与生产预览验收，没有向外部站点部署。

交付行为：未确认角色时 PLAY 打开角色页；仅 PIKO 可保存；大厅 PLAY 先播放前置视频，在视频结束且游戏 ready 后自动倒计时；游戏自然完成后传递真实十字段到正式结算。Retry 创建新局并跳过前置，Next 回大厅保留 PIKO。最高分仅存在当前 App 内存中，Retry/Next 保留；刷新或 App 重建后清空，没有持久排行榜。主流程没有接入 SettlementDemo 假成绩。

本页浏览器和全量测试证据来自 Task 7 的本集成工作树实测，时间如下；Task 8 仅核对交付文档、来源、资源和预览，没有再次运行约四分钟的闭环，也没有把来源游戏对话的旧报告作为本次实测。按执行账本，Task 1–7 的任务审查已通过；Task 8 与整个分支的最终审查尚待父代理执行。

## 可重复执行

在项目根目录运行；脚本从真实 App 加载页点击进入，经过大厅、角色选择与 PLAY，不能用独立游戏页代替该验收。

```powershell
npm run dev -- --host 127.0.0.1 --port 4176
node scripts/play-session-browser-qa.cjs
npm run build
npm run preview -- --host 127.0.0.1 --port 4180
$env:BASE_URL = 'http://127.0.0.1:4180'
$env:QA_MODE = 'production'
node scripts/play-session-browser-qa.cjs
```

`BASE_URL` 默认是 `http://127.0.0.1:4176`。`QA_MODE` 仅接受 `development|production`，显式 production 在任何端口执行 HTTP/MIME/hash 检查；省略时保留兼容默认（4180 生产，其他端口开发），无效值在浏览器启动前报错。优先寻找已安装的 Playwright，找不到则使用 `C:/Users/25283/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright`，不安装新依赖。单独验证弹窗可设置 `QA_CASES=dialogs`；默认完整验收约四分钟，包括自然播放一局和独立故障上下文。

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

## 未覆盖的观察与待审查项

扬声器真实听感、主观节拍质量、实际系统后台切换hidden及真实策略拒绝均未知；不由headless播放属性和控制注入推定。实际DOM失焦暂停已覆盖。触屏输入、其他浏览器和设备未覆盖。game-playtest引用的共享架构/完整checklist资源缺失，按技能正文、现存UI提示及本规格九验收项核对。本Task7不执行Task8最终独立复审，也不改源项目、既有大厅脏改动、旧QA或计划文件。

低优先级视觉观察：1280×720的超时/策略恢复按钮约33px高，文字比主要弹窗关闭按钮小，桌面点击可完成且没有裁切；实际触屏可用性未知。本次授权CSS修复限定在共享商店/角色弹窗，不扩展修改这些会话恢复按钮。另保留Task3清理中已移除note DOM引用是否释放的最终审查项，未做无关游戏改动。

QA 脚本另有两个低优先级待审查项：`waitForFunction` 的部分 timeout 作为第二个参数传入，失败路径可能等待默认超时；生产环境标签目前由端口 4180 推定，其他生产预览端口可能被误标。现有成功记录明确使用开发 4176、生产 4180，不能将标签推定当作任意端口都可靠的环境检测。本 Task 8 不修改脚本或产品，这些问题与小恢复按钮、动态 note 监听引用一并交最终分支审查。

## Task 8 交付快照与预览

来源清单为 [play-session-source-manifest.json](play-session-source-manifest.json)。原顶层 `capturedAt`、`task`、`files`、`runtime`、`build`、`validation` 和限制均保留 Task 1 历史；新增 `finalSnapshot` 是 2026-10-06T04:33:36.9126683Z 的交付核对，代码 HEAD 为 `ddf941130dc3d8b37e305dd30840167b49fe9186`，即 Task 1–7 实现版本。该 HEAD 不冒充包含清单的 Task 8 文档提交；实际文档提交由 Git 历史与本地 Task 8 报告确定。

本次独立重新计算 53 个原始来源文件 SHA256，全部仍匹配 Task 1；游戏与结算来源工作区 HEAD 和 `git status --short --branch` 也均与 Task 1 相同。当前集成 11 个游戏运行文件（含新增 `embed-bridge.js`）逐项保存 SHA256、字节数和 dist 对照；29 个实际素材（15 个游戏、12 个结算、前置视频及既有大厅视频）逐项记录当前哈希。运行代码在集成过程中有授权更改，不能将 Task 1 的迁入哈希误称为最终代码哈希。

生产 4180 的 35 项资源本次重新 HTTP 请求，全部 200，MIME、响应字节 SHA256 与当前 dist 及 Task 7 记录一致。开发 4176 的页面本次 HTTP 200。开发/生产报告、测试日志和构建摘录的文件哈希及 UTC 修改时间也已记录；它们证明证据文件未变，不表示本 Task 8 重新执行了这些测试。

本次查看分支与工作树 diff，没有删除路径；没有写入原 D 盘游戏来源或结算来源工作区。5 个既有用户文件 SHA256 全部仍匹配 Task 1，保留未提交状态：旧 `game-flow-browser-qa.json`、大厅 TSX/test/CSS 与大厅背景 MP4。当前生产构建包含这些保留的用户修改；本任务只提交交付文档、来源清单和已授权的计划接口/复选项更新，不暂存这些文件。所有历史 QA 与 scratch 记录保留。

开发服务仍为 `http://127.0.0.1:4176/`（session 36618），生产预览为 `http://127.0.0.1:4180/`（session 51763）。HTTP 核对后已请求在 Codex 打开 `http://127.0.0.1:4176/?delivery=task8-20261006T043336Z`；工具返回 `queued`，因此仅确认打开请求已排队，尚未确认可见标签页。

置信度：来源/保护哈希、HTTP/资源与文档边界为高；Task 7 桌面截图的视觉判断为中；实际扬声器听感、主观节拍、真实系统后台 hidden、真实浏览器策略拒绝、触屏体验为未知。最终全分支复审与这些人工观察仍未完成。

## 最终修复波次：迟到播放 Promise 与 QA 参数

此前最终审查确认结算媒体错误之后，旧 intro.play() 拒绝可能把已显示的成绩和启用的出口退回等待手势。现加入 effect 生命周期、请求身份和同步阶段检查；error/ended/unmount 使旧请求失效。只有当前有效 NotAllowedError 在 intro 尚未显示成绩时请求真实手势；decode 错误继续到循环或静态 fallback。离开时 intro/loop 均暂停归零，迟到成功也停止已卸载或已放弃的媒体；StrictMode 旧请求不暂停正在播放的第二轮 intro。2.75 秒显示、3.9 秒预播、自然 ended 启用正常出口及既有约120ms CSS 交叉淡化未改变。

TDD：首轮结算14例中7例按预期失败，直接断言可见成绩、可用出口和卸载媒体状态；QA4例全部失败。自审另捕获 StrictMode 第一轮迟到成功在当前 error 后复活 intro，17例中该1例 RED 后补终态保护。最终结算 Sequence/Page、App、PlaySession 共4文件62例通过；QA参数4例通过；typecheck 与非删除 build（129模块、11运行文件）通过。全量220 React/57游戏/1运行发布/97素材回归在最后两条终态条件修正前通过；该修正后以62例覆盖复验，提交后的最终全量门禁由主控执行，不能把此前220例冒充该门禁。

QA参数测试实际执行脚本的资源函数与等待边界：4197显式 production 执行 HTTP/MIME/hash，4180显式 development 跳过资源检查，兼容端口默认保留，无效模式同步失败；倒计时/BGM/结算的12000/15000/12000ms分别作为第三 options 参数。它们不是源码字符串或仅语法检查。

新证据单独保存在 [开发结算 smoke](play-session/final-fix-development/report.json) 和 [最终生产结算 smoke](play-session/final-fix-production/report.json)。开发在05:31:47.966Z通过；最终重建版本生产在05:36:25.892Z通过，37项 HTTP/MIME/SHA256 全匹配当前 dist（非删除构建保留的旧 JS/CSS 也在资源清单中，不冒充当前入口）。两环境正常结算视频自然播放至 ended（intro duration 4.062993秒，loop 4.064秒），Retry 真实点击后两媒体均 detached、paused、time=0，Next真实点击回大厅。正常四类错误均为0。新2048×1152截图保存成绩与完整Retry/Next；已直接查看开发正常截图，显示没有裁切。

错误 case 的媒体HTTP404是真实网络失败，但 pending play与迟到拒绝是控制注入；策略 case 的 NotAllowedError、媒体error事件、迟到成功也是控制注入，恢复/Next是实际点击。三个 case 均用 synthetic MessageEvent 交付零分成绩，以聚焦结算；本波次未重复69秒自然游戏流，Task7的自然十字段证据继续作为历史保留。开发 smoke 与 `pre-self-review-*` 生产报告来自最后 StrictMode 终态条件修正前，最新生产 report来自修正后的重建版；既有 development/production/checks历史文件无diff，未覆盖。

复现新smoke：设置 `QA_MODE=development`、`BASE_URL=http://127.0.0.1:4176` 或 `QA_MODE=production`、实际生产预览URL，再设置 `QA_CASES=settlement` 执行 `node scripts/play-session-browser-qa.cjs`。参数行为回归执行 `node --test scripts/play-session-browser-qa.test.cjs`。README现明确来源项目专属QA脚本未迁入，提供这里真实存在的集成入口。计划Task2–7复选项按账本完成记录核对，Task3真实策略拒绝的未知限制保留。

来源清单新增 `finalFixSnapshot`，使用实际变更源码hash及提交前HEAD `41bf9859d5fece50b775a14c12e6f0f5a5609b27`，该HEAD不是本修复内容的SHA；原Task8快照不改写。53个原始来源与5个保护文件SHA256仍匹配Task1。保护的大厅MP4仍未跟踪，本次不暂存它或大厅旧修改，因此仅交付当前本地工作树，独立纯Git重建/合并仍需大厅依赖归属授权。动态note监听引用、小恢复按钮、media独立entry及环境诊断噪声为审查后延期的Minor；实际扬声器、真实OS hidden/策略拒绝、触屏仍未知。最终修复的独立复审尚待主控一次定向复审。
