# PLAY、前置视频、游戏与结算衔接设计

日期：2026-10-06。状态：四部分行为设计及本文整体已获用户确认；实施已获授权，正在按执行计划推进。

## 目标与保留项

打通加载页、大厅、角色选择、有声前置视频、现有节奏游戏与正式结算页。保留现有视觉、大厅动态背景、角色展示动画、游戏判定/长按/暂停逻辑和结算动画。仅 PIKO 小企鹅可游玩。Demo 使用内存会话状态，无数据库、永久存档或下一关。

## 来源与版本

- 游戏大厅：codex://threads/01a0f11c-a35c-77d0-a1fc-f306030b781b。
- 三页面集成：`C:/Users/25283/.codex/worktrees/game-flow-integration/游戏操作文件`；已有动态大厅背景同步，仍需在实施前记录 HEAD 与未提交文件状态。
- 游戏本体：codex://threads/01a0fab7-fce9-7a32-81fd-38db40208fc6；目录 `D:/05 ai作品集/04/游戏操作文件/rhythm-game`。最新对话报告版本 `1bef9d58e8cee553c4ede5ff33f6cfacdaf669ed`，功能已提交并通过报告中的自动化验证，但最终独立复审未完成，不能称为正式验收完成。
- 结算页：codex://threads/01a105ba-a282-7273-a683-6c8eca0feee3；目录 `C:/Users/25283/.codex/worktrees/settlement-page/游戏操作文件`。需在实施前固定包含未提交动画修复的实际文件版本，不仅依赖 HEAD。
- 前置视频：`D:/05 ai作品集/04/素材储存/游戏资产1/视频节点 17 - 副本.mp4`。已检测 12.064 秒、1920×1080、24fps、H.264、AAC 双声道 32kHz、16918412 字节。保留原始声音及源文件。

实施前只读核对版本、哈希与工作区差异，选择性同步游戏目录及结算组件依赖。保护其他任务未提交文件，不整体覆盖源项目或合并无关改动。

## 页面与状态

主应用管理 `loading | lobby | hero-select | pregame-video | gameplay | settlement`，保存已确认角色、草稿角色、gameRunId、最新成绩和会话最高分。

```text
loading → lobby → hero-select → SELECT PIKO → 左上角返回 lobby
lobby PLAY → pregame-video → gameplay → settlement
settlement Retry → 新一局 gameplay
settlement Next → lobby（保留 PIKO 与会话最高分）
```

未确认 PIKO 时，PLAY 打开角色选择。每次从大厅启动均播放前置视频；Retry 跳过该视频。主应用统一处理转场与重复操作防护。

## 角色确认

PIKO 的 heroId 为 `piko`。点击 SELECT 保存确认结果，仍停留角色选择页，使用左上角返回大厅。其他角色可浏览及播放展示动画，但 SELECT 打开“该角色暂未开发，请选择 PIKO 开始游戏”提示，关闭后继续停留当前角色，不更新 confirmedHeroId，也不清除此前已确认的 PIKO。弹窗复用现有视觉、焦点管理与输入隔离模式。大厅 PLAY 二次检查 confirmedHeroId 必须为 piko。

## 前置视频与启动

进入前置视频时播放原始声音，不循环、无跳过入口，键盘/点击/触摸不能提前结束。不显示游戏 HUD，不接受游戏输入。同时创建隐藏的同源游戏 iframe，预加载游戏资源但不启动倒计时或 BGM。

启动同时要求前置视频自然结束（或确实加载/解码失败）和游戏 ready。视频自然结束后保持最后一帧直到交接，不能立即归零造成第一帧闪回；切换离开视频阶段时才暂停、归零、卸载。游戏未 ready 时在最后一帧显示轻量 LOADING。视频结束后等待 ready 超过 10 秒，显示重新加载及返回大厅入口。重新加载重建游戏实例并继续等待 ready，不要求重看已结束视频。

视频错误走相同倒计时入口。有声 play() 被浏览器策略阻止时提供“点击继续播放”重试手势，不能将策略拒绝当成跳过许可。后台标签页暂停视频与声音，恢复前台后从原位置续播；自动续播被阻止时允许点击恢复。

交接时清除残留按键/指针状态，显示游戏并发送 start。自动进入现有 3、2、1，不显示第二个 START 按钮。前置声音自然结束 → 倒计时声音 → 游戏 BGM，避免重叠。

## 同源 iframe 与通信

保留独立 rhythm-game 模块，增加嵌入模式。嵌入时隐藏内部 START 与旧结算卡片，保留独立页面原有玩法。游戏完成资源加载、初始化和启动接口准备后发送 ready。父页面显式发送 start，不能仅因 iframe load 或参数 autostart 就开始。

```ts
// 父页面 → 当前游戏实例
{ type: "rhythmgame:start", runId }
// 游戏 → 父页面
{ type: "rhythmgame:ready", runId }
{ type: "rhythmgame:complete", runId, result }
```

父子都使用明确的同源 targetOrigin，并校验 event.origin 与 event.source。父页面只接受当前 iframe、当前 runId 和对应阶段的消息。游戏每局只启动一次；父页面每局只接受一次 complete。Retry 增加 runId 并重建 iframe，旧消息不得影响新局。生产构建必须实际发布 rhythm-game HTML、脚本、样式与相对路径资源，开发服务器可访问不等于生产可用。

## 成绩契约

唯一来源为游戏结算后发出的 rhythmgame:complete，禁止读取 HUD 文本或使用结算 Demo 数据。完整保留 10 个字段：finalScore、maxCombo、perfect、good、miss、accuracy、repairPercent、starRating、totalNotes、judgedNotes。

所有数字必须有限且非负；计数与星级必须整数；starRating 为 0–5；accuracy 与 repairPercent 为 0–100；perfect + good + miss = judgedNotes；最终完成必须 judgedNotes = totalNotes。当前谱面为 80 个事件（48 普通、20 加速、12 长按），满分 9200；不要把这些常量当作未来谱面的通用桥接限制。

游戏结束前先将未处理事件计为 Miss；长按保留实际获得的部分得分，事件只计一次。无效完成数据不修补为假成绩，显示可重新开始或返回大厅的错误界面。合法成绩映射如下：

| 游戏字段 | 结算属性 |
| --- | --- |
| finalScore | score |
| starRating | stars |
| perfect / good / miss | 同名属性 |
| maxCombo | maxCombo |

accuracy、repairPercent、totalNotes、judgedNotes 保存但当前不新增 UI。

## 结算时序与出口

游戏停止 BGM、音效与输入后发送完成；父页面冻结本局成绩并进入 SettlementSequence。嵌入模式不闪出游戏内部旧结果卡片。

沿用结算已确认时序：0–2.75 秒有声 Intro、UI 隐藏；2.75 秒开始标题入场；2.95 秒星级；3.15 秒面板；3.30 秒分数及统计；3.55 秒按真实条件显示 NEW RECORD；3.90 秒启动静音 Loop 并交叉切换约 120ms；约 4.06 秒 Intro 自然结束、Loop 接管、Retry/Next 可用。实际入场依据媒体时间，沿用现有实现及失败兜底。

NEW RECORD 仅比较当前应用会话旧最高分。第一局不显示；严格超过旧最高分才显示；相同分数不显示。比较完成后更新最高分，Retry、Next 保留，刷新清空。成绩和纪录仅在首次有效 complete 更新。

Retry 停止结算媒体，清空最新成绩，递增 runId，创建全新 iframe，ready 后自动倒计时。Next 停止结算媒体，返回大厅并保留 PIKO 与会话最高分；再次 PLAY 重播前置视频。

## 生命周期与错误恢复

视频离开时暂停/归零/卸载并清理媒体回调；游戏离开时停止 BGM 与音效、清理输入/动画、卸载 iframe；结算离开时清理 Intro、Loop 与时间回调。旧异步回调和旧 runId 不得修改新局。游戏失焦暂停沿用当前实现；iframe 启动后正确获得键盘焦点，父页面的前置输入不能泄漏进倒计时。

## 验收

1. 未确认角色 PLAY 打开角色选择；仅 PIKO SELECT 能保存，其他角色提示后停留原角色且不覆盖 PIKO。
2. 大厅启动完整有声播放前置视频，无跳过；后台暂停、恢复正常；媒体失败能继续，浏览器策略拒绝需手势恢复。
3. 视频结束与 ready 双条件成立才开始倒计时；事件顺序互换结果一致；重复 PLAY/start/complete 不重复启动或结算。
4. 视频结束后游戏晚 ready 保持最后一帧；10 秒超时可重试及返回大厅。
5. 前置结束自动 3、2、1，无第二个 START，残留输入清理，视频/BGM/结算音频无重叠或离开后残留。
6. 全部 10 个成绩字段传递；真实分数/星级/Perfect/Good/Miss/Max Combo 正确显示；非法来源、旧局、非法数值与不完整结果被拒绝。
7. Retry 创建干净游戏实例并直接倒计时；Next 回大厅保留 PIKO；后续高分触发 NEW RECORD，相等或第一局不触发。
8. 验证 2048×1152、1920×1080、1366×768、1280×720 适配与 iframe 焦点；资源成功加载，控制台无未处理错误。
9. 执行适用单元/契约测试、现有游戏回归测试、类型检查、生产构建，以及真实浏览器的完整游玩闭环与生产资源可达性检查。

## 规格审阅结论

本文纠正两个内部矛盾：完成接口是 10 个字段；视频等待游戏时保留最后一帧，离开阶段后才归零。有声播放策略拒绝采用手势重试以满足“不允许跳过”。游戏最终独立复审与人工节拍体验尚未确认，实施验证需如实保留这些限制。下一阶段在本文整体审阅后生成实施计划，再按授权实施。
