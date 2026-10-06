# Game Flow Integration Implementation Plan

> **Design source:** `docs/superpowers/specs/2026-10-01-game-flow-integration-design.md`

**Goal:** Integrate the completed loading, lobby, and hero-selection screens into one React demo with explicit hero confirmation, guarded transitions, and a replaceable future-game entry point.

**Architecture:** Keep each completed screen as an isolated feature. Add a small top-level flow controller in `App` that owns the current screen and the confirmed hero for the current browser run. Pages communicate through typed callback props. A reusable transition layer serializes screen changes, and the future-game callback currently opens a minimal placeholder.

**Technology:** React, TypeScript, Vite, Vitest, Testing Library, existing browser QA tooling.

**Safety constraints:** Do not delete files. Do not use recursive removal. Do not overwrite unrelated local changes. Verify every source worktree and commit before integrating it.

---

## Task 1: Preflight all three implementations

**Inspect:**

- Lobby workspace: `D:\\05 ai作品集\\04\\游戏操作文件`
- Hero workspace: `C:\\Users\\25283\\.codex\\worktrees\\06fb\\游戏操作文件`
- Loading workspace: `C:\\Users\\25283\\.codex\\worktrees\\loading-screen\\游戏操作文件`

### Step 1: Record repository identity and worktree topology

Run from the lobby workspace:

```powershell
git rev-parse --show-toplevel
git worktree list --porcelain
git branch --show-current
git log -5 --oneline --decorate
git status --short --branch
```

Expected: the lobby implementation is identifiable and all attached worktrees belong to the same repository.

### Step 2: Record hero worktree state

```powershell
git -C 'C:\Users\25283\.codex\worktrees\06fb\游戏操作文件' branch --show-current
git -C 'C:\Users\25283\.codex\worktrees\06fb\游戏操作文件' log -8 --oneline --decorate
git -C 'C:\Users\25283\.codex\worktrees\06fb\游戏操作文件' status --short --branch
git -C 'C:\Users\25283\.codex\worktrees\06fb\游戏操作文件' diff --stat
```

Expected: identify the commit containing delayed hero-name reveal (`264517a` was previously reported) and determine whether the later return-button work is committed or only present as local changes.

### Step 3: Record loading worktree state

```powershell
git -C 'C:\Users\25283\.codex\worktrees\loading-screen\游戏操作文件' branch --show-current
git -C 'C:\Users\25283\.codex\worktrees\loading-screen\游戏操作文件' log -8 --oneline --decorate
git -C 'C:\Users\25283\.codex\worktrees\loading-screen\游戏操作文件' status --short --branch
git -C 'C:\Users\25283\.codex\worktrees\loading-screen\游戏操作文件' diff --stat
```

Expected: identify the exact state containing the two-video loading flow and English `CLICK TO START` action.

### Step 4: Establish the integration method

- If each approved implementation is committed and has compatible ancestry, integrate with non-destructive merge or cherry-pick operations.
- If approved changes are uncommitted, preserve them in their source worktree and transfer only explicitly reviewed files or patches.
- If the lobby workspace contains unrelated user changes, do not stage, overwrite, or reformat them.
- Do not begin integration until every changed file has an identified owner and purpose.

### Step 5: Baseline verification

Run the current lobby branch’s existing verification commands before modifying it:

```powershell
npm test -- --run
npm run typecheck
npm run verify:assets
npm run build
git diff --check
```

Expected: record the baseline. If it fails, diagnose the existing failure before attributing anything to integration.

---

## Task 2: Consolidate the latest hero-selection implementation

**Expected files:**

- Modify/preserve: `src/features/hero-select/HeroSelectPage.tsx`
- Modify/preserve: `src/features/hero-select/HeroSelectPage.test.tsx`
- Modify/preserve: `src/features/hero-select/HeroIdentity.tsx`
- Modify/preserve: `src/features/hero-select/HeroVideoBackground.tsx`
- Modify/preserve: `src/features/hero-select/HeroSelectExperience.tsx`
- Modify/preserve: `src/features/hero-select/heroes.ts`
- Modify/preserve: `src/features/hero-select/types.ts`
- Modify/preserve: `src/styles/hero-select.css`
- Preserve all referenced hero assets and existing QA artifacts.

### Step 1: Compare source and target versions

Review the exact diffs for the listed files. Confirm that the source includes:

- five hero videos and their static fallbacks;
- delayed hero-logo reveal near the end of playback;
- replay behavior when changing or reselecting a hero;
- the approved purple SVG back button;
- existing responsive stage behavior;
- all current focused tests.

### Step 2: Integrate without changing navigation semantics yet

Bring the approved hero visual implementation into the lobby integration branch while retaining the current callback boundaries where possible. Do not add confirmation-state behavior in the same change.

### Step 3: Run focused regression tests

```powershell
npm test -- --run src/features/hero-select/HeroSelectPage.test.tsx
npm run typecheck
npm run verify:assets
```

Expected: existing hero behavior passes before flow changes begin.

### Step 4: Commit the consolidation checkpoint

```powershell
git add -- src/features/hero-select src/styles/hero-select.css src/assets
git diff --cached --check
git commit -m "chore: consolidate latest hero selection"
```

Only stage paths actually reviewed for this task. Omit `src/assets` if no asset transfer is required.

---

## Task 3: Consolidate the latest loading-page implementation

**Expected files:**

- Add/preserve: `src/features/loading/LoadingPage.tsx`
- Add/preserve: `src/features/loading/LoadingPage.test.tsx`
- Add/preserve: `src/styles/loading.css`
- Preserve loading images, intro video, loop video, and asset verification entries.

### Step 1: Compare source and target loading files

Confirm that the source contains:

- explicit user interaction before audible playback;
- intro video followed by a muted looping video;
- progress behavior aligned with loading/caching;
- `CLICK TO START` at completion;
- the existing optional `onStartGame` callback;
- video and image fallback behavior.

### Step 2: Integrate the feature in isolation

Bring the approved loading feature into the integration branch. Do not replace the lobby as the app entry point until its focused tests pass in the consolidated repository.

### Step 3: Run focused verification

```powershell
npm test -- --run src/features/loading/LoadingPage.test.tsx
npm run typecheck
npm run verify:assets
npm run build
```

Expected: loading tests, type checking, asset validation, and the production build pass.

### Step 4: Commit the consolidation checkpoint

```powershell
git add -- src/features/loading src/styles/loading.css src/assets scripts/verify-assets.mjs
git diff --cached --check
git commit -m "chore: consolidate loading experience"
```

Only stage files actually changed and reviewed.

---

## Task 4: Add typed game-flow state and failing app tests

**Files:**

- Create: `src/features/game-flow/types.ts`
- Modify: `src/App.test.tsx`
- Modify: `src/App.tsx`

### Step 1: Write failing flow tests

Add tests covering:

1. The initial screen is loading.
2. Completing loading and clicking `CLICK TO START` opens the lobby.
3. Clicking lobby `HERO` opens hero selection.
4. Clicking lobby `PLAY` without a confirmed hero opens hero selection.
5. A confirmed hero is supplied to the game-start interface.

Mock heavy video behavior only at the browser-media boundary; do not replace the page components with meaningless test doubles.

### Step 2: Run the tests and confirm failure

```powershell
npm test -- --run src/App.test.tsx
```

Expected: failures show that the app does not yet own the multi-screen flow.

### Step 3: Add minimal flow types

```ts
export type AppScreen =
  | "loading"
  | "lobby"
  | "hero-select"
  | "game-placeholder";

export interface GameLaunchRequest {
  heroId: HeroId;
}

export type StartGameHandler = (request: GameLaunchRequest) => void;
```

Reuse the existing canonical `HeroId` type. Do not duplicate hero identifiers.

### Step 4: Implement the minimal top-level controller

In `App.tsx`, own:

- `screen`, initially `loading`;
- `selectedHeroId`, initially `null`;
- guarded callbacks for loading completion, opening hero selection, returning to lobby, and starting the game.

Do not add persistence.

### Step 5: Run the focused tests

```powershell
npm test -- --run src/App.test.tsx
```

Expected: the initial navigation tests pass.

### Step 6: Commit

```powershell
git add -- src/App.tsx src/App.test.tsx src/features/game-flow/types.ts
git diff --cached --check
git commit -m "feat: add game flow controller"
```

---

## Task 5: Wire lobby actions into the flow

**Files:**

- Modify: `src/features/lobby/LobbyPage.tsx`
- Modify: `src/features/lobby/LobbyPage.test.tsx`
- Possibly modify: `src/features/lobby/LobbyButton.tsx`
- Possibly modify: `src/features/lobby/lobby-data.ts`

### Step 1: Add failing lobby callback tests

Verify:

- clicking `HERO` invokes `onOpenHeroSelect` once;
- clicking `PLAY` invokes `onPlay` once;
- existing button feedback still runs;
- other lobby buttons retain their current no-navigation behavior.

### Step 2: Run and confirm failure

```powershell
npm test -- --run src/features/lobby/LobbyPage.test.tsx
```

### Step 3: Add explicit lobby props

```ts
interface LobbyPageProps {
  selectedHeroId: HeroId | null;
  onOpenHeroSelect: () => void;
  onPlay: () => void;
}
```

Map only the `HERO` and `PLAY` action IDs to navigation callbacks. Preserve all current animation behavior and accessibility labels.

### Step 4: Run focused tests and type checking

```powershell
npm test -- --run src/features/lobby/LobbyPage.test.tsx
npm run typecheck
```

### Step 5: Commit

```powershell
git add -- src/features/lobby
git diff --cached --check
git commit -m "feat: connect lobby navigation actions"
```

---

## Task 6: Implement explicit hero confirmation

**Files:**

- Modify: `src/features/hero-select/HeroSelectPage.tsx`
- Modify: `src/features/hero-select/HeroSelectPage.test.tsx`
- Modify: `src/features/hero-select/HeroSelectExperience.tsx`
- Modify: `src/styles/hero-select.css`

### Step 1: Write failing confirmation tests

Cover these state transitions:

- switching heroes changes the draft only;
- clicking `SELECT` calls `onConfirmHero(draftHeroId)`;
- after confirmation the control reads `SELECTED`;
- switching to a different hero returns it to `SELECT`;
- clicking back invokes `onBack` and never invokes `onConfirmHero`;
- re-entering initializes the draft from the previously confirmed hero;
- returning without confirmation preserves the prior confirmed hero at the app level.

### Step 2: Run and confirm failure

```powershell
npm test -- --run src/features/hero-select/HeroSelectPage.test.tsx src/App.test.tsx
```

### Step 3: Implement draft-versus-confirmed semantics

Add or adapt props:

```ts
interface HeroSelectPageProps {
  initialHeroId: HeroId;
  confirmedHeroId: HeroId | null;
  onConfirmHero: (heroId: HeroId) => void;
  onBack: () => void;
}
```

Keep the draft local to hero selection. The app stores only confirmed state.

### Step 4: Add confirmation feedback

- `SELECT` commits and changes to `SELECTED`.
- Confirmation feedback must be visible without navigating.
- Changing to a different hero resets the action to `SELECT`.
- Do not alter hero video timing or delayed name reveal.

### Step 5: Run focused tests

```powershell
npm test -- --run src/features/hero-select/HeroSelectPage.test.tsx src/App.test.tsx
npm run typecheck
```

### Step 6: Commit

```powershell
git add -- src/features/hero-select src/styles/hero-select.css src/App.test.tsx
git diff --cached --check
git commit -m "feat: confirm hero selection explicitly"
```

---

## Task 7: Add serialized deep-purple transitions

**Files:**

- Create: `src/features/game-flow/ScreenTransition.tsx`
- Create: `src/features/game-flow/ScreenTransition.test.tsx`
- Create: `src/styles/game-flow.css`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src/main.tsx` or the project’s central style entry only if required to import the new stylesheet.

### Step 1: Write failing transition tests

Verify:

- transitions block repeated navigation requests;
- the destination replaces the source only once;
- controls cannot trigger duplicate callbacks while covered;
- reduced-motion mode uses the shortened duration;
- the loading page is not mounted again after initial exit.

Prefer deterministic timers and behavior assertions over testing raw CSS implementation details.

### Step 2: Run and confirm failure

```powershell
npm test -- --run src/features/game-flow/ScreenTransition.test.tsx src/App.test.tsx
```

### Step 3: Implement the transition controller

Implement an explicit phase such as `idle | covering | revealing`. Keep the destination switch at the covered point. Ignore additional navigation requests until the reveal completes.

### Step 4: Add transition styling

- deep-purple full-screen overlay;
- 350 ms for loading/game entry paths;
- 220 ms for lobby/hero paths;
- approximately 60 ms under reduced motion;
- no transform, rotation, or zoom;
- no white background between screens.

### Step 5: Run focused and full component tests

```powershell
npm test -- --run src/features/game-flow/ScreenTransition.test.tsx src/App.test.tsx
npm test -- --run
```

### Step 6: Commit

```powershell
git add -- src/features/game-flow src/styles/game-flow.css src/App.tsx src/App.test.tsx src/main.tsx
git diff --cached --check
git commit -m "feat: add guarded screen transitions"
```

Stage `src/main.tsx` only if it changed.

---

## Task 8: Add the replaceable game placeholder

**Files:**

- Create: `src/features/game-placeholder/GamePlaceholder.tsx`
- Create: `src/features/game-placeholder/GamePlaceholder.test.tsx`
- Create: `src/styles/game-placeholder.css`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`

### Step 1: Write failing tests

Verify:

- the placeholder receives the confirmed hero ID;
- it renders a concise development-state message;
- it offers an accessible return-to-lobby action;
- returning preserves the confirmed hero for the current run.

### Step 2: Run and confirm failure

```powershell
npm test -- --run src/features/game-placeholder/GamePlaceholder.test.tsx src/App.test.tsx
```

### Step 3: Implement the minimal placeholder

Do not invent gameplay. Reuse existing hero metadata only when it is already available through a stable module. Keep the future seam in one handler:

```ts
const handleStartGame: StartGameHandler = ({ heroId }) => {
  setLaunchedHeroId(heroId);
  requestScreen("game-placeholder");
};
```

### Step 4: Run focused tests

```powershell
npm test -- --run src/features/game-placeholder/GamePlaceholder.test.tsx src/App.test.tsx
npm run typecheck
```

### Step 5: Commit

```powershell
git add -- src/features/game-placeholder src/styles/game-placeholder.css src/App.tsx src/App.test.tsx
git diff --cached --check
git commit -m "feat: add future game placeholder"
```

---

## Task 9: Add end-to-end browser flow verification

**Files:**

- Create: `scripts/game-flow-browser-qa.cjs`
- Create: `docs/qa/game-flow-browser-qa.md`
- Create/update generated evidence only through the QA script’s established conventions.

### Step 1: Add a failing browser flow

Exercise the real rendered application:

1. Complete the loading interaction and enter the lobby.
2. Open hero selection with `HERO`.
3. Change hero, press `SELECT`, verify `SELECTED`, return to lobby.
4. Press `PLAY` and verify the placeholder receives that hero.
5. Return to lobby.
6. Re-enter hero selection, change hero without selecting, return, and verify the previous confirmed hero still launches.
7. Reload and verify the app restarts from loading with no persisted selection.

Capture console errors, failed network requests, and screenshots at the key checkpoints.

### Step 2: Run browser QA

Use the project’s existing local preview and Playwright/runtime setup. Do not install a second browser-testing stack if the current lobby QA script already provides one.

Expected: all checkpoints pass with zero unexpected console errors or missing resources.

### Step 3: Document observed results

Record viewport, timing mode, selected hero, console/network results, and evidence paths in `docs/qa/game-flow-browser-qa.md`.

### Step 4: Commit

```powershell
git add -- scripts/game-flow-browser-qa.cjs docs/qa/game-flow-browser-qa.md docs/qa
git diff --cached --check
git commit -m "test: verify integrated game flow"
```

Only stage generated QA files produced by this task.

---

## Task 10: Final regression and handoff

### Step 1: Run all automated verification

```powershell
npm test -- --run
npm run typecheck
npm run verify:assets
npm run build
git diff --check
git status --short --branch
```

Expected: all tests, type checking, asset verification, and build pass; no whitespace errors; no unexplained changes.

### Step 2: Run manual interaction checks

Verify mouse and keyboard operation for:

- `CLICK TO START`;
- lobby `HERO` and `PLAY`;
- hero cards, `SELECT`/`SELECTED`, and back;
- placeholder return action;
- repeated clicks during transitions;
- reduced-motion behavior.

### Step 3: Inspect final change scope

```powershell
git diff --stat <verified-base>...HEAD
git diff --name-status <verified-base>...HEAD
git log --oneline --decorate <verified-base>..HEAD
```

Confirm:

- no files were deleted;
- no unrelated user changes were included;
- all three completed visual experiences remain present;
- the game entry seam is isolated and replaceable.

### Step 4: Present the integrated preview

Open the verified local preview in Codex and provide direct links to:

- the app entry;
- the flow controller;
- the future-game interface;
- browser QA evidence;
- the final review diff.

