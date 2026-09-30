# Game Lobby Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make a Figma-faithful, accessible, interactive game lobby the default page while preserving the existing hero-selection implementation.

**Architecture:** `App` keeps the existing hero flow but initially renders a new `LobbyPage` inside the shared fixed-resolution `StageFrame`. Lobby data, preload state, visual components, and button feedback are isolated under `src/features/lobby`; Figma assets are downloaded once to semantic local paths and never referenced through temporary URLs.

**Tech Stack:** React 19, TypeScript, Vite, plain CSS, local Montserrat, Vitest, React Testing Library, Playwright/installed Edge for browser QA.

**Spec:** `docs/superpowers/specs/2026-09-30-lobby-page-design.md`

## Global Constraints

- Figma file `UKHmhZoXccKUey5sUweNmQ`, node `2:126`, logical size exactly `2048×1152`.
- No navigation, modal, sound, background motion, entrance animation, carousel behavior, or temporary loading UI.
- Profile bar is display-only; currency values are display-only and only each `+` is a button.
- Mail unread badge is conditional and defaults to hidden.
- All other agreed entrances are semantic buttons with hover, press, focus, keyboard activation, and reduced-motion support.
- Reuse the existing project stack, `StageFrame`, CSS tokens, test setup, and locally bundled Montserrat.
- Do not delete or overwrite existing files or assets; do not use the full Figma screenshot as a product asset.

---

### Task 1: Preserve the Existing App and Define the Lobby Contract

**Files:**
- Create: `src/features/lobby/types.ts`
- Create: `src/features/lobby/lobby-data.ts`
- Create: `src/features/lobby/LobbyPage.test.tsx`
- Modify: `src/App.test.tsx`

**Interfaces:**
- Produces `LobbyState`, `LobbyAction`, and `DEFAULT_LOBBY_STATE`.
- Establishes accessible names for every lobby button and verifies the default App page contract.

- [x] **Step 1: Write failing tests**

Add an App test that expects `main` named `游戏大厅` on initial render and does not find `角色选择`. Add a LobbyPage test that expects profile text `Player`, `Lv. 12`, three literal balances, no button named for the profile, and no unread indicator at `hasUnreadMail: false`.

- [x] **Step 2: Run tests and verify RED**

Run `npm run test:run -- src/App.test.tsx src/features/lobby/LobbyPage.test.tsx`. Expected failure: lobby modules and default page do not exist.

- [x] **Step 3: Implement the typed data contract**

Define:

```ts
export type LobbyAction =
  | "coins" | "energy" | "gems" | "settings" | "play"
  | "songs" | "challenges" | "hero" | "daily"
  | "mail" | "gift" | "crown";

export interface LobbyState {
  playerName: string;
  level: number;
  experiencePercent: number;
  currencies: { coins: number; energy: number; gems: number };
  hasUnreadMail: boolean;
}
```

Set literal defaults `{ playerName: "Player", level: 12, experiencePercent: 59, currencies: { coins: 623736, energy: 2311, gems: 2139 }, hasUnreadMail: false }`.

- [x] **Step 4: Re-run focused tests**

Keep production implementation minimal enough to reach the next test boundary; verify the data tests pass and App remains intentionally red until Task 4 connects the page.

---

### Task 2: Add and Verify Figma Assets

**Files:**
- Create: `src/assets/lobby/lobby-background.png`
- Create: `src/assets/lobby/daily-challenge-art.png`
- Create: `src/assets/lobby/profile-avatar.png`
- Create: semantic SVGs for coins, energy, gems, settings, menu icons, utility icons, chevrons, play, rays, crown, and unread badge under `src/assets/lobby/`
- Modify: `scripts/verify-assets.mjs`

**Interfaces:**
- Produces stable local import paths for every visible static Figma asset.
- Extends `npm run verify:assets` to require each file and verify the `2048×1152` background dimensions.

- [x] **Step 1: Write the failing asset audit**

Add every semantic lobby asset path to the audit and require `lobby-background.png` to be exactly `2048×1152`.

- [x] **Step 2: Run `npm run verify:assets` and verify RED**

Expected failure: required lobby assets are missing.

- [x] **Step 3: Download exact Figma assets**

Download from the high-fidelity `get_design_context` response. Preserve bytes, use semantic filenames, and leave no temporary Figma URL in source code.

- [x] **Step 4: Run the audit and verify GREEN**

Run `npm run verify:assets`; confirm all lobby files are non-empty and the background dimension check passes.

---

### Task 3: Build the Lobby Components and Interaction Feedback

**Files:**
- Create: `src/features/lobby/LobbyPage.tsx`
- Create: `src/features/lobby/LobbyProfileBar.tsx`
- Create: `src/features/lobby/LobbyCurrencyCounter.tsx`
- Create: `src/features/lobby/LobbyButton.tsx`
- Create: `src/features/lobby/useLobbyAssets.ts`
- Create: `src/features/lobby/useLobbyAssets.test.ts`
- Create: `src/styles/lobby.css`
- Modify: `src/styles/tokens.css`
- Modify: `src/styles/global.css`

**Interfaces:**
- `LobbyPage({ state?: LobbyState, onAction?: (action: LobbyAction) => void })`.
- `useLobbyAssets(sources: readonly string[]): "loading" | "ready" | "error"`.
- `LobbyButton` forwards native button props and applies `lobby-button` plus optional `lobby-button--primary`.

- [x] **Step 1: Expand failing behavior tests**

Assert the real rendered page has twelve unique button names: three add-currency buttons, Settings, Play, Songs, Challenges, Hero, Daily Challenge, Mail, Gift, Crown. Assert profile is not a button, currency values are not buttons, clicking/Enter/Space calls `onAction` with the literal action, and `hasUnreadMail: true` renders the badge while `false` does not.

- [x] **Step 2: Add preload tests and verify RED**

With a controlled real `Image` replacement, prove the hook stays `loading` until all sources load, becomes `ready` after all succeed, becomes `error` after one failure, and ignores late callbacks after unmount.

- [x] **Step 3: Implement semantic components**

Translate Figma reference code into project-native React and CSS. Use `<button type="button">` for every agreed control, CSS-generated button surfaces, and exact local image/SVG assets for visible static art.

- [x] **Step 4: Implement exact stage coordinates and motion**

Use logical pixel positions from Figma. Apply `transform: scale(1.025)` hover and `scale(0.96)` active with `180ms` recovery; use stronger primary values for Play. Add neon `:focus-visible` and disable transitions in `prefers-reduced-motion: reduce`.

- [x] **Step 5: Implement the loading gate**

While `useLobbyAssets` is not ready, render only a labelled lobby main region with the deep-purple background. On ready, render the complete composition once. On error, keep the safe background and log failed sources without broken image icons.

- [x] **Step 6: Verify GREEN and refactor**

Run `npm run test:run -- src/features/lobby`, then `npm run typecheck`. Remove duplication without changing behavior and rerun the focused tests.

---

### Task 4: Make the Lobby the Default App Page

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`

**Interfaces:**
- `App` renders `<LobbyPage state={DEFAULT_LOBBY_STATE} />` as its default visible page.
- Existing hero imports, state, and components remain in the repository for later routing work; the lobby does not invoke them.

- [x] **Step 1: Run the existing failing App test from Task 1**

Confirm it still fails specifically because the app starts on Hero Select.

- [x] **Step 2: Implement the smallest default entry change**

Render the lobby inside `StageFrame`. Do not add route buttons, placeholders, dialogs, or audio.

- [x] **Step 3: Verify App and full suite**

Run `npm run test:run -- src/App.test.tsx`, then `npm run test:run`. Update legacy App flow tests only where the confirmed new default invalidates their old premise; preserve hero feature tests.

---

### Task 5: Visual and Browser Acceptance

**Files:**
- Create: `docs/qa/lobby-visual-qa.md`
- Modify only in-scope lobby files for fixes.

**Interfaces:**
- Produces evidence for visual fidelity, keyboard behavior, responsive scaling, asset integrity, console cleanliness, and completion.

- [x] **Step 1: Run static completion checks**

Run `npm run verify:assets`, `npm run test:run`, `npm run typecheck`, `npm run build`, and `git diff --check`.

- [x] **Step 2: Run production preview and exact-size comparison**

Start `npm run preview -- --host 127.0.0.1 --port 4173`. Capture the rendered stage at `2048×1152` and compare it against the Figma screenshot for node `2:126`; fix macro geometry before shadows or minor decoration.

- [x] **Step 3: Run viewport and input matrix**

Inspect `2048×1152`, `1920×1080`, `1600×900`, `1366×768`, `1280×720`, and `1400×900`. Verify letterboxing, no clipping, hit targets, hover/pressed feedback, Tab order, Enter/Space activation, focus-ring visibility, and reduced-motion behavior.

- [x] **Step 4: Verify runtime cleanliness**

Confirm zero console errors, zero page errors, zero failed requests, and no temporary Figma asset URLs.

- [x] **Step 5: Record evidence and run the final gate**

Write exact results to `docs/qa/lobby-visual-qa.md`, then freshly rerun `npm run verify:assets`, `npm run test:run`, `npm run typecheck`, `npm run build`, `git diff --check`, and `git status --short --branch` before any completion claim.
