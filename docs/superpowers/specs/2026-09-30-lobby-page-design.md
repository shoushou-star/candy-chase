# 游戏大厅页面设计规格

日期：2026-09-30

## 目标

将 Figma 文件 `UKHmhZoXccKUey5sUweNmQ` 的主画板 `2:126`（`Lobby / 2048×1152`）还原为当前 React 项目的默认、可交互大厅页面，同时完整保留既有角色选择页代码和素材。

## 技术与视觉约束

- 复用现有 React、TypeScript、Vite、普通 CSS、Vitest 与 React Testing Library 工程。
- 复用 `StageFrame` 的 `2048×1152` 固定逻辑舞台和等比缩放。
- 非 16:9 窗口使用深紫色留边；不拉伸、不裁切、不重排。
- 使用 Figma 原始背景、头像、装饰 PNG 与 SVG 图标；截图只用于视觉比较，不能作为整页实现素材。
- 使用现有本地 Montserrat 字体依赖；不增加运行时网络字体。
- 背景、中央角色、装饰光效均保持静态；不增加粒子、呼吸、视差或入场动画。
- 不删除、不覆盖既有文件或素材。

## 页面数据

默认大厅数据集中定义：

```ts
interface LobbyState {
  playerName: string;
  level: number;
  experiencePercent: number;
  currencies: {
    coins: number;
    energy: number;
    gems: number;
  };
  hasUnreadMail: boolean;
}
```

默认值为 `Player`、等级 `12`、Figma 所示经验进度、金币 `623736`、能量 `2311`、宝石 `2139`，且 `hasUnreadMail` 为 `false`。

## 交互范围

以下控件使用语义化 `<button>`，当前只播放视觉反馈，不跳转、不弹窗、不改变业务状态：

- 三个货币栏的独立加号按钮；货币图标与数值只展示。
- Settings、Play、Songs、Challenges、Hero。
- Daily Challenge 整张卡片；箭头属于视觉，四个圆点保持静态。
- Mail、Gift、Crown。

玩家资料栏仅展示，不可点击、不进入 Tab 顺序。邮件红点仅在 `hasUnreadMail` 为 `true` 时渲染，初始不可见，点击邮件不改变该状态。

## 动效与键盘

- 普通按钮 Hover 放大约 `1.025` 并增强高光；Pressed 缩放至约 `0.96`；松开约 `180ms` 回弹。
- Play 主按钮的 Hover/Pressed 反馈稍强。
- 图标、文字和底板作为整体变换，不影响布局。
- Tab 按 DOM/视觉顺序聚焦按钮；Enter 与 Space 使用原生按钮行为触发同一反馈。
- `:focus-visible` 使用紫色霓虹焦点样式，不显示浏览器默认黑框。
- `prefers-reduced-motion: reduce` 时取消非必要 transition。
- 当前版本不使用临时声音。

## 素材加载

- 预加载大厅关键图片与 SVG。
- 关键素材未完成时只显示与舞台一致的深紫底色。
- 素材就绪后一次性显示完整舞台，不制作临时加载文案、进度条或淡入动画。
- 加载失败时记录明确的素材路径并继续显示安全底色，不显示浏览器破图图标。
- 此加载门后续可直接由正式加载页替换。

## 页面入口

- 应用刷新后默认显示大厅。
- 当前大厅不连接既有 Hero Select 或其他页面。
- 既有角色选择页、视频、临时页面与相关状态代码保留，供后续专门的页面连接工作使用。

## 验收

- 与 Figma `2:126` 的背景、组件坐标、尺寸、颜色、阴影和层级一致。
- 初始没有邮件红点；将测试状态设为有未读邮件时红点出现。
- 玩家资料栏不是按钮；其他约定入口均为按钮且 accessible name 唯一。
- 鼠标、Enter、Space 均能触发按钮反馈；焦点环不被裁切。
- `2048×1152`、`1920×1080`、`1600×900`、`1366×768`、`1280×720`、`1400×900` 下保持等比缩放。
- 自动测试、类型检查、素材检查和生产构建通过；生产预览无控制台错误或资源 404。
