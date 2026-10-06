# 糖果节奏游戏

基于固定谱面和正式背景音乐的浏览器节奏游戏。游戏时钟直接读取背景音乐播放位置。

## 运行

在仓库根目录启动静态服务器后访问 `/rhythm-game/`，或直接用浏览器打开 `rhythm-game/index.html`。点击 `START` 并等待 3 秒倒计时；浏览器需要允许用户操作后播放音频。

正式 BGM 位于 `rhythm-game/assets/audio/game-bgm.m4a`，完整时长约 69.218 秒。谱面有 80 个事件，首个判定时间为 4.981 秒；谱面末尾事件在 66.8818 秒，随后音乐自然结束并结算。

## 操作和音符

- 空格键或舞台内鼠标左键按下：输入。蓝色长按音符需要在头部判定时按住，并在发光尾端抵达判定位置时松开。
- 粉色音符：到达判定位置时轻击一次。
- 黄色音符：移动到路径中段加速提示后，到达判定位置时轻击一次。
- 空按或超出 Good 判定窗的输入不计分；Perfect 和 Good 窗内的提前输入仍可判定。
- 暂停按钮可暂停和继续；浏览器失焦或页面隐藏也会自动暂停。暂停冻结音乐、音符和长按尾部，暂停期间松开不结算。
- 继续普通音符时从暂停位置接续。长按过程中暂停后，继续界面会提示 `HOLD`；需要重新按住才能从原冻结位置继续长按。没有重新按住时，最多等待 1.5 秒后恢复播放并将长按判为未完成。
- 结算页上的 `RESTART` 会重置分数并从音乐起点重新开始。

## 固定谱面与计分

- BGM 完整时长：约 69.218 秒
- 粉色：普通轻击
- 黄色：在路径中段加速提示后轻击
- 蓝色：按住音符头部，并在发光尾端结束时松开
- Perfect：±100 ms；普通音符 100 分，长按每端最多 100 分
- Good：±200 ms；普通音符 50 分，长按每端最多 50 分
- Miss：超出 ±200 ms；通常得 0 分并清空当前连击。长按若已有效判定头部、但松开端 Miss，仍保留头部已获得的 50（Good）或 100（Perfect）分，最终按一个 Miss 事件统计并清空连击
- 固定谱面：80 个事件，其中普通 48 个、加速 20 个、长按 12 个；长按占两个判定端点
- 谱面最高分：9,200 分

每个普通音符最高 100 分；长按的头部与尾部各最高 100 分。因此最高分按 68 个普通/加速音符 × 100，加上 12 个长按 × 200 计算，为 9,200 分。`accuracy` 根据本局已经结算音符的可得分计算；`repairPercent` 按整张谱面的 9,200 分计算。

## 结算事件

游戏结束时派发一次 `rhythmgame:complete` 自定义事件。`event.detail` 包含以下十个字段：

```js
window.addEventListener('rhythmgame:complete', (event) => {
  const {
    finalScore,
    maxCombo,
    perfect,
    good,
    miss,
    accuracy,
    repairPercent,
    starRating,
    totalNotes,
    judgedNotes,
  } = event.detail;
});
```

`totalNotes` 为谱面事件数（80），长按按一个事件统计；`judgedNotes` 为已结算的 Perfect、Good 和 Miss 数量之和。

## 自动化检查

从仓库根目录运行：

```powershell
node --test rhythm-game/tests/audio-asset.test.js rhythm-game/tests/audio-clock.test.js rhythm-game/tests/game-chart.test.js rhythm-game/tests/game-core.test.js rhythm-game/attack-event-contract.test.js
node --test scripts/play-session-browser-qa.test.cjs
node scripts/play-session-browser-qa.cjs
node --check rhythm-game/game-core.js
node --check rhythm-game/game-chart.js
node --check rhythm-game/audio-clock.js
node --check rhythm-game/app.js
node --check rhythm-game/magic-attack-d.js
ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 rhythm-game/assets/audio/game-bgm.m4a
```

集成浏览器检查先启动根项目开发服务（默认 `http://127.0.0.1:4176`），使用实际存在的 `scripts/play-session-browser-qa.cjs` 从 App 入口验收。生产预览可在任意端口显式指定模式，例如：

```powershell
$env:BASE_URL = 'http://127.0.0.1:4197'
$env:QA_MODE = 'production'
node scripts/play-session-browser-qa.cjs
```

`QA_MODE` 仅接受 `development` 或 `production`；省略时保留旧默认（4180 为 production，其他端口为 development）。`QA_CASES=settlement` 可单独运行结算修复 smoke，并写入独立 `docs/qa/play-session/final-fix-<mode>/` 目录。

来源游戏项目的 `rhythm-game/tests/hud-browser-qa.cjs` 和 `rhythm-game/tests/gameplay-note-types-qa.cjs` 没有迁入本集成工作树；这些命令只能在包含它们的来源项目执行，不能当作本集成的已执行证据。来源 `gameplay-note-types-qa.cjs` 使用 Edge 和受控媒体时钟检查谱面运动、判定、暂停/继续、长按、重开及结算生命周期。受控时钟不代表真实音频的主观节拍听感测试。
