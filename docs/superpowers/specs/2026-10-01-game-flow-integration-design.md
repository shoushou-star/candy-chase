# Game Flow Integration Design

**Date:** 2026-10-01  
**Status:** Approved in conversation; implementation not started  
**Scope:** Loading page, lobby, hero selection, and a future-game placeholder

## 1. Objective

Connect the existing loading page, lobby, and hero-selection experiences into one coherent game demo without deleting or replacing their existing visual implementations.

The demo must preserve an explicit extension point for the future game. The current implementation ends at a lightweight “game under development” placeholder.

## 2. Confirmed User Flow

### Initial entry

1. The application opens on the loading page.
2. Loading completes and the progress action becomes `CLICK TO START`.
3. The player clicks it and enters the lobby.

### Hero selection

1. The player clicks `HERO` in the lobby.
2. The application opens the hero-selection page.
3. Browsing or switching heroes changes only a draft selection.
4. Clicking `SELECT` commits the currently displayed hero for the current application run.
5. The hero-selection page remains visible and shows a clear `SELECTED` state.
6. The player clicks the top-left back button to return to the lobby.

### Starting the future game

1. The player clicks `PLAY` in the lobby.
2. If a hero has been confirmed, the lobby invokes the shared game-start interface with that hero.
3. For the current demo, the application displays a “game under development” placeholder with a return-to-lobby action.
4. A future game implementation replaces the placeholder or the start callback without changing loading, lobby, or hero-selection contracts.

### Returning without confirmation

If the player changes the visible hero but returns without clicking `SELECT`, the draft selection is discarded and the last confirmed hero remains unchanged.

If no hero has ever been confirmed and the player clicks `PLAY`, the application opens hero selection instead of starting with an unknown hero.

## 3. Navigation Architecture

Use a single React application controlled by top-level in-memory state. Do not create separate HTML applications and do not add a routing dependency for this four-screen linear demo.

```ts
type AppScreen =
  | "loading"
  | "lobby"
  | "hero-select"
  | "game-placeholder";
```

The top-level flow controller owns:

- the current screen;
- the last confirmed hero for the current run;
- guarded screen transitions;
- the shared game-start callback;
- transition-overlay state.

The page components remain independently understandable and testable. They communicate through typed props and callbacks rather than importing or mutating global navigation state.

## 4. Component Contracts

### Loading page

```ts
interface LoadingPageProps {
  onStartGame?: () => void;
}
```

For integration, the existing callback advances from `loading` to `lobby`. It does not launch the future game despite the historical callback name.

### Lobby page

```ts
interface LobbyPageProps {
  selectedHeroId: HeroId | null;
  onOpenHeroSelect: () => void;
  onPlay: () => void;
}
```

The existing `HERO` and `PLAY` controls retain their current visual and input feedback. Integration adds behavior without replacing their styling.

### Hero-selection page

```ts
interface HeroSelectPageProps {
  initialHeroId: HeroId;
  confirmedHeroId: HeroId | null;
  onConfirmHero: (heroId: HeroId) => void;
  onBack: () => void;
}
```

The page owns its draft selection. `onConfirmHero` is invoked only by `SELECT`. `onBack` never commits the draft.

### Future-game interface

```ts
interface GameLaunchRequest {
  heroId: HeroId;
}

type StartGameHandler = (request: GameLaunchRequest) => void;
```

The current handler opens `game-placeholder`. A future implementation may mount the real game, initialize an engine, or hand the request to another runtime.

## 5. Hero State Semantics

Maintain two distinct concepts:

- `draftHeroId`: the hero currently previewed inside hero selection;
- `selectedHeroId`: the hero explicitly confirmed with `SELECT`.

Rules:

- Entering hero selection initializes the draft from `selectedHeroId` when available; otherwise it uses the existing page default.
- Switching hero cards changes only `draftHeroId`.
- Clicking `SELECT` copies the draft into `selectedHeroId`.
- After confirmation, the button communicates `SELECTED` and provides visible feedback.
- Switching to a different hero after confirmation makes the page dirty again and returns the button to `SELECT`.
- Returning while dirty discards the unconfirmed draft.
- No selection is written to `localStorage`, session storage, cookies, a backend, or the URL.
- Refreshing or reopening the demo resets the confirmed selection.

## 6. Screen Transitions

Use a full-screen deep-purple transition overlay.

- Loading to lobby: approximately 350 ms.
- Lobby to hero selection: approximately 220 ms.
- Hero selection to lobby: approximately 220 ms.
- Lobby to game placeholder: approximately 350 ms.
- Do not use sliding, rotation, zoom, or elaborate scene animation.
- Block repeated navigation input while a transition is active.
- Reveal the destination only after its critical assets are ready, preventing white flashes or incomplete frames.
- Under `prefers-reduced-motion: reduce`, shorten the fade to approximately 60 ms and omit nonessential motion.

Transitions must not replay the loading screen. Once the application leaves loading, internal navigation remains within lobby, hero selection, and the placeholder.

## 7. Game Placeholder

The placeholder exists only to demonstrate that `PLAY` has a functioning destination and that the future-game contract receives the confirmed hero.

It should contain:

- a concise “game under development” message;
- an indication of the selected hero, where this can reuse existing hero data without adding new artwork;
- a return-to-lobby action;
- the same responsive full-screen stage behavior as the rest of the demo.

It must not imitate a partially working game or introduce speculative gameplay systems.

## 8. Integration Strategy

Use the current lobby workspace as the tentative integration base because the lobby implementation is already present there. Before any merge or cherry-pick, verify the actual Git topology and working-tree cleanliness.

Tentative order:

1. Record the current branch, HEAD, and working-tree status of the lobby workspace.
2. Record the same information for the latest hero-selection worktree.
3. Record the same information for the loading-page worktree.
4. Identify the exact commits that contain each page’s final approved state.
5. Integrate the latest hero-selection implementation while preserving lobby changes.
6. Integrate the latest loading-page implementation.
7. Resolve shared-file conflicts deliberately, especially `App.tsx`, `App.test.tsx`, shared styles, asset verification, and package configuration.
8. Add the flow controller, typed callbacks, transition overlay, and game placeholder.
9. Do not delete existing components, assets, tests, QA evidence, or standalone builds.

The known locations from the completed page tasks are:

- Lobby: `D:\\05 ai作品集\\04\\游戏操作文件`
- Hero selection: `C:\\Users\\25283\\.codex\\worktrees\\06fb\\游戏操作文件`
- Loading page: `C:\\Users\\25283\\.codex\\worktrees\\loading-screen\\游戏操作文件`

These paths are evidence of prior work, not permission to assume branch relationships. Git topology must be checked before implementation.

## 9. Error and Edge Handling

- Repeated clicks during transitions are ignored.
- `PLAY` with no confirmed hero routes to hero selection.
- Invalid hero IDs fall back to the existing default hero without crashing.
- Hero video or image failures retain the existing page fallback behavior.
- A failed destination asset preload keeps the overlay visible only for a bounded period, then reveals the destination’s existing fallback instead of hanging forever.
- The back action from the game placeholder returns to the lobby without clearing the confirmed hero.
- Browser refresh restarts the entire demo from loading with no confirmed hero.

## 10. Verification

### Component tests

- Loading completion exposes `CLICK TO START` and invokes its callback.
- Lobby `HERO` invokes `onOpenHeroSelect`.
- Lobby `PLAY` invokes `onPlay`.
- `SELECT` commits the draft hero and displays `SELECTED`.
- Changing hero after confirmation restores the `SELECT` state.
- Back does not commit an unconfirmed draft.
- Placeholder receives the confirmed hero and can return to the lobby.

### Flow tests

- `loading → lobby → hero-select → SELECT → lobby → PLAY → placeholder`.
- `lobby → hero-select → change without SELECT → lobby`, preserving the previously confirmed hero.
- `PLAY` without a confirmed hero opens hero selection.
- Repeated clicks cannot skip or corrupt a transition.
- Refresh resets selection and returns to loading.

### Regression checks

- Existing loading-page tests remain green.
- Existing lobby tests and browser QA remain green.
- Existing hero-selection tests, video behavior, delayed name reveal, and back-button behavior remain green.
- TypeScript type checking, asset verification, production build, and browser console checks pass.
- No visual asset or source file is deleted.

## 11. Explicit Non-Goals

- Building the actual game.
- Persisting the selected hero across refreshes or launches.
- Adding authentication, backend storage, save files, or analytics.
- Adding URL routing or browser-history semantics.
- Redesigning the three completed pages.
- Adding a second direct-to-game path from hero selection.

## 12. Implementation Preconditions

Implementation must not begin until all of the following are true:

- the user has reviewed this saved design;
- all three worktrees’ Git states and exact commits have been verified;
- unrelated local changes have been identified and protected;
- an implementation plan has been produced from this design;
- no operation requires deleting files or recursively removing directories.

