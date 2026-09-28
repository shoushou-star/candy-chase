# Hero Select Web Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a desktop-only, Figma-faithful, accessible React character-selection flow with five selectable heroes, functional controls, a store-unavailable dialog, a temporary home page, and a temporary game page.

**Architecture:** A Vite single-page React application owns three page states in `App` without React Router. Hero data and selection rules live in a typed feature module; semantic DOM components render the Figma-derived assets inside a fixed 2048×1152 stage that scales uniformly to the desktop viewport.

**Tech Stack:** React, TypeScript, Vite, plain CSS, `@fontsource/montserrat`, Vitest, React Testing Library, `@testing-library/user-event`, jsdom.

**Spec:** `docs/superpowers/specs/2026-09-28-hero-select-web-design.md`

## Global Constraints

- The logical stage is exactly `2048 × 1152` and must scale uniformly with `Math.min(viewportWidth / 2048, viewportHeight / 1152)`.
- The first release targets desktop browsers only; the smallest acceptance viewport is `1280 × 720`.
- Do not use React Router, a backend, audio, mobile layouts, or decorative CSS animation in the first release.
- Every interactive control must be a semantic `<button>` with Default, Hover, Pressed, `:focus-visible`, and Disabled styling.
- Arrow navigation wraps from the first hero to the last and from the last hero to the first.
- All three currency plus buttons open one accessible dialog containing the exact copy `商店功能暂未开放`.
- Refreshing the app starts on the hero-select page; Back opens a temporary home page; SELECT opens a temporary game placeholder page.
- Complex backgrounds and character art come from the existing Figma file or existing local assets. Do not generate replacements.
- Do not rasterize the complete Figma screen into one background image.
- Do not delete or overwrite existing assets. Store extracted assets under new semantic filenames.
- Do not add character-transition or decorative button animation. Instant pressed-state feedback via `:active` is allowed.
- Montserrat must be bundled locally through the project dependency, not fetched from Google Fonts at runtime.
- Every task must leave tests and production build green before its commit.

## Planned File Map

```text
index.html                              Vite HTML entry
package.json                            scripts and dependencies
package-lock.json                       resolved dependency lockfile
tsconfig.json                           shared TypeScript options
tsconfig.app.json                       browser application TypeScript options
tsconfig.node.json                      Vite configuration TypeScript options
vite.config.ts                          Vite and Vitest configuration
src/main.tsx                            React mount point
src/App.tsx                             application page state and navigation
src/App.test.tsx                        end-to-end component flow tests
src/test/setup.ts                       Testing Library cleanup and DOM matchers
src/styles/global.css                   reset, font imports, viewport background
src/styles/tokens.css                   colors, spacing, shadows, focus token values
src/assets/figma/                       extracted Figma background/card/icon assets
src/assets/hero-logos/                  copied transparent logo assets
src/features/hero-select/types.ts       Page, HeroId, Hero, and asset state types
src/features/hero-select/heroes.ts      ordered five-hero data source
src/features/hero-select/selection.ts   pure wraparound selection helpers
src/features/hero-select/selection.test.ts pure selection tests
src/features/hero-select/useHeroAssets.ts asset preloading state
src/features/hero-select/useHeroAssets.test.ts asset loading tests
src/components/GameButton.tsx           shared semantic button contract
src/components/GameButton.test.tsx      button interaction tests
src/components/StageFrame.tsx           fixed logical stage and scale calculation
src/components/StageFrame.test.tsx      scaling behavior tests
src/components/StoreUnavailableDialog.tsx accessible dialog and focus restoration
src/components/StoreUnavailableDialog.test.tsx dialog behavior tests
src/features/hero-select/CurrencyCounter.tsx one currency display and plus button
src/features/hero-select/HeroIdentity.tsx current hero logo and labels
src/features/hero-select/HeroCard.tsx    one selectable hero card
src/features/hero-select/HeroCardList.tsx ordered cards and arrow-key handling
src/features/hero-select/CarouselArrow.tsx previous/next controls
src/features/hero-select/HeroSelectPage.tsx assembled selection page
src/features/hero-select/HeroSelectPage.test.tsx page interaction tests
src/pages/TemporaryHomePage.tsx          temporary home state
src/pages/GamePlaceholderPage.tsx        confirmed-hero placeholder state
src/styles/controls.css                  shared interactive states
src/styles/hero-select.css               Figma-faithful selection layout
src/styles/placeholder-pages.css         temporary page layouts
scripts/verify-assets.mjs                required-file and image-dimension audit
docs/qa/hero-select-visual-qa.md         viewport and Figma comparison record
```

---

### Task 1: Establish the React, TypeScript, CSS, and Test Baseline

**Files:**
- Create: `package.json`
- Create: `package-lock.json` through `npm install`
- Create: `index.html`
- Create: `tsconfig.json`
- Create: `tsconfig.app.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/App.test.tsx`
- Create: `src/test/setup.ts`
- Create: `src/styles/global.css`
- Create: `src/styles/tokens.css`

**Interfaces:**
- Consumes: approved design spec only.
- Produces: `npm run dev`, `npm test`, `npm run test:run`, `npm run typecheck`, and `npm run build`; a minimal `App` that initially renders the hero-select page marker.

- [ ] **Step 1: Confirm execution authority and initialize version control**

Run only after the user authorizes implementation:

```powershell
git init
git branch -M main
```

Expected: `.git` is created; existing `assets/` and `docs/` remain untouched. If the user declines Git initialization, omit all commit steps but continue using the same task checkpoints.

- [ ] **Step 2: Create the package manifest with exact scripts**

Create `package.json` with this structure before installing packages:

```json
{
  "name": "hero-select-web",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "npm run typecheck && vite build",
    "preview": "vite preview",
    "typecheck": "tsc -b",
    "test": "vitest",
    "test:run": "vitest run",
    "verify:assets": "node scripts/verify-assets.mjs"
  }
}
```

- [ ] **Step 3: Install runtime and development dependencies**

Run:

```powershell
npm install react react-dom @fontsource/montserrat
npm install -D typescript vite @vitejs/plugin-react vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event @types/react @types/react-dom
```

Expected: `package-lock.json` is created and `npm audit` output is recorded. Do not run automatic force upgrades.

- [ ] **Step 4: Write the failing application smoke test**

Create `src/App.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("App", () => {
  it("starts on the hero selection page", () => {
    render(<App />);
    expect(
      screen.getByRole("main", { name: "角色选择" }),
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 5: Configure Vitest and verify the test fails**

Configure `vite.config.ts` with React and jsdom, and configure `src/test/setup.ts` to import `@testing-library/jest-dom/vitest` and run Testing Library cleanup after each test.

Run:

```powershell
npm run test:run -- src/App.test.tsx
```

Expected: FAIL because `src/App.tsx` does not exist or does not export `App`.

- [ ] **Step 6: Add the smallest application entry**

Implement `App` with one semantic marker only:

```tsx
export function App() {
  return <main aria-label="角色选择" />;
}
```

Mount it from `src/main.tsx`, import `src/styles/global.css`, and add Montserrat weights 500, 600, 800, and 800 italic through `@fontsource/montserrat` imports.

- [ ] **Step 7: Run baseline verification**

Run:

```powershell
npm run test:run
npm run typecheck
npm run build
```

Expected: all commands exit with code 0 and `dist/index.html` exists.

- [ ] **Step 8: Commit the baseline**

```powershell
git add package.json package-lock.json index.html tsconfig.json tsconfig.app.json tsconfig.node.json vite.config.ts src
git commit -m "chore: establish React TypeScript test baseline"
```

---

### Task 2: Extract, Name, and Verify Figma Assets

**Files:**
- Create: `src/assets/figma/hero-piko-background.png`
- Create: `src/assets/figma/hero-riff-background.png`
- Create: `src/assets/figma/hero-bongo-background.png`
- Create: `src/assets/figma/hero-nibby-background.png`
- Create: `src/assets/figma/hero-mira-background.png`
- Create: `src/assets/figma/card-hamster.png`
- Create: `src/assets/figma/card-girl.png`
- Create: `src/assets/figma/card-piko.png`
- Create: `src/assets/figma/card-rabbit.png`
- Create: `src/assets/figma/card-bear.png`
- Create: `src/assets/figma/icon-coins.svg`
- Create: `src/assets/figma/icon-energy.svg`
- Create: `src/assets/figma/icon-gems.svg`
- Create: `src/assets/hero-logos/*.png` by copying the five existing transparent logo files
- Create: `scripts/verify-assets.mjs`

**Interfaces:**
- Consumes: Figma file key `jk2EYpN5OVy37P2GD9B5PC`; background nodes `11:3`, `46:40`, `48:77`, `50:114`, `51:151`; card source nodes `11:5` through `11:9`; local `assets/hero-logos/*.png`.
- Produces: stable semantic import paths used by `heroes.ts`; `npm run verify:assets` returns exit code 0 only when every required asset exists and background images are 2048×1152.

- [ ] **Step 1: Read Figma design context before downloading**

Load the required `figma-design-to-code` skill, then request design context for frame `11:2` and metadata for the four other frames. Confirm that the five background nodes still map to PIKO, Riff, BONGO, NIBBY, and MIRA before downloading anything.

Expected evidence: node ID, layer name, width, and height for each source. Stop and update the mapping if the Figma file has changed.

- [ ] **Step 2: Download source assets without exporting whole screens**

Use Figma asset download calls on the individual background/card/icon nodes. Prefer each raw image URL when available; use an isolated node export only when the layer is itself the intended complete asset. Export the three currency icon vector layers as SVG under the exact filenames listed above. Do not download the complete 2048×1152 UI frame as the web background.

Expected: five background images, five card images, and three currency icons with no UI text or buttons baked into them beyond what already belongs to the complex artwork.

- [ ] **Step 3: Copy the five existing transparent logos**

Copy without moving or deleting the originals:

```powershell
Copy-Item -LiteralPath 'assets\hero-logos\piko-transparent.png' -Destination 'src\assets\hero-logos\piko-transparent.png'
Copy-Item -LiteralPath 'assets\hero-logos\riff-transparent.png' -Destination 'src\assets\hero-logos\riff-transparent.png'
Copy-Item -LiteralPath 'assets\hero-logos\bongo-transparent.png' -Destination 'src\assets\hero-logos\bongo-transparent.png'
Copy-Item -LiteralPath 'assets\hero-logos\nibby-transparent.png' -Destination 'src\assets\hero-logos\nibby-transparent.png'
Copy-Item -LiteralPath 'assets\hero-logos\mira-transparent.png' -Destination 'src\assets\hero-logos\mira-transparent.png'
```

- [ ] **Step 4: Write the failing asset verifier**

Create `scripts/verify-assets.mjs` with a fixed required-file list and PNG header dimension parsing. The script must throw when a file is missing and must throw when any background is not `2048 × 1152`.

The required list must contain the five semantic background paths, five card paths, five logo paths, and three resolved icon paths.

- [ ] **Step 5: Verify the audit detects an intentional missing path**

Before finalizing the list, temporarily include `src/assets/figma/__missing-check__.png` and run:

```powershell
npm run verify:assets
```

Expected: non-zero exit and an error naming `__missing-check__.png`. Remove only that intentional list entry; do not delete any real file.

- [ ] **Step 6: Run the real asset audit and inspect images**

Run:

```powershell
npm run verify:assets
```

Expected: exit code 0, five `2048 × 1152` backgrounds, all other required files present. Visually inspect every extracted asset for accidental full-screen UI, cropping, or opaque logo backgrounds.

- [ ] **Step 7: Commit the verified asset set**

```powershell
git add src/assets scripts/verify-assets.mjs
git commit -m "assets: add verified hero selection artwork"
```

---

### Task 3: Define the Typed Hero Domain and Wraparound Selection

**Files:**
- Create: `src/features/hero-select/types.ts`
- Create: `src/features/hero-select/heroes.ts`
- Create: `src/features/hero-select/selection.ts`
- Create: `src/features/hero-select/selection.test.ts`

**Interfaces:**
- Consumes: semantic asset imports from Task 2.
- Produces: `Page`, `HeroId`, `HeroDirection`, `Hero`, `AssetStatus`; ordered `HEROES`; `getAdjacentHeroId(currentId: HeroId, direction: HeroDirection): HeroId`; `getHeroById(heroId: HeroId): Hero`.

- [ ] **Step 1: Write failing wraparound and lookup tests**

Create tests that assert:

```ts
expect(getAdjacentHeroId("nibby", -1)).toBe("bongo");
expect(getAdjacentHeroId("bongo", 1)).toBe("nibby");
expect(getAdjacentHeroId("piko", 1)).toBe("mira");
expect(getHeroById("nibby").displayName).toBe("NIBBY");
expect(new Set(HEROES.map((hero) => hero.id)).size).toBe(5);
```

- [ ] **Step 2: Run the tests to verify failure**

Run:

```powershell
npm run test:run -- src/features/hero-select/selection.test.ts
```

Expected: FAIL because the modules and exports do not exist.

- [ ] **Step 3: Define exact domain types**

Create:

```ts
export type Page = "home" | "hero-select" | "game-placeholder";
export type HeroId = "piko" | "riff" | "bongo" | "nibby" | "mira";
export type HeroDirection = -1 | 1;
export type AssetStatus = "idle" | "loading" | "ready" | "error";

export interface Hero {
  id: HeroId;
  displayName: string;
  backgroundSrc: string;
  logoSrc: string;
  cardSrc: string;
  disabled?: boolean;
}
```

- [ ] **Step 4: Populate exactly five ordered heroes**

Use the Figma carousel's left-to-right order `nibby`, `piko`, `mira`, `riff`, `bongo`. Import each asset through Vite rather than hard-coded public URLs. Do not duplicate hero metadata inside components.

- [ ] **Step 5: Implement minimal pure helpers**

`getAdjacentHeroId` must derive its index from `HEROES`, add `direction`, and wrap with modulo. `getHeroById` must return the matching hero and throw `Unknown hero: <id>` if internal data becomes inconsistent.

- [ ] **Step 6: Verify types, tests, and assets**

Run:

```powershell
npm run verify:assets
npm run test:run -- src/features/hero-select/selection.test.ts
npm run typecheck
```

Expected: all commands pass.

- [ ] **Step 7: Commit the domain model**

```powershell
git add src/features/hero-select
git commit -m "feat: define typed hero selection model"
```

---

### Task 4: Build and Verify the Fixed 2048×1152 Stage

**Files:**
- Create: `src/components/StageFrame.tsx`
- Create: `src/components/StageFrame.test.tsx`
- Modify: `src/styles/global.css`
- Modify: `src/styles/tokens.css`

**Interfaces:**
- Consumes: viewport width and height through `window.innerWidth` and `window.innerHeight`.
- Produces: `getStageScale(width: number, height: number): number`; `StageFrame({ children })`; CSS custom property `--stage-scale`.

- [ ] **Step 1: Write failing scale tests**

Assert exact values:

```ts
expect(getStageScale(2048, 1152)).toBe(1);
expect(getStageScale(1920, 1080)).toBe(0.9375);
expect(getStageScale(1280, 720)).toBe(0.625);
expect(getStageScale(1200, 1000)).toBeCloseTo(1200 / 2048);
```

Also render `StageFrame` and assert it exposes a `2048px × 1152px` logical element with an accessible label `游戏画面`.

- [ ] **Step 2: Run the scale tests to verify failure**

Run:

```powershell
npm run test:run -- src/components/StageFrame.test.tsx
```

Expected: FAIL because `StageFrame` and `getStageScale` do not exist.

- [ ] **Step 3: Implement the scale function and resize subscription**

Implement `getStageScale` as:

```ts
export function getStageScale(width: number, height: number) {
  return Math.min(width / 2048, height / 1152);
}
```

`StageFrame` must subscribe to `resize`, update scale, remove the listener on unmount, center the fixed stage, and set the transform origin to center. The outer viewport uses a deep purple-black background to supply letterboxing.

- [ ] **Step 4: Verify behavior at the unit level**

Run:

```powershell
npm run test:run -- src/components/StageFrame.test.tsx
npm run typecheck
```

Expected: PASS with no listener-cleanup warning.

- [ ] **Step 5: Manually inspect two aspect ratios**

Run:

```powershell
npm run dev -- --host 127.0.0.1 --port 4173
```

Inspect at `1920×1080` and `1400×900`. Expected: the empty 16:9 stage remains fully visible and centered; the second viewport shows horizontal letterboxing without stretch.

- [ ] **Step 6: Commit stage scaling**

```powershell
git add src/components/StageFrame.tsx src/components/StageFrame.test.tsx src/styles
git commit -m "feat: add fixed-resolution desktop game stage"
```

---

### Task 5: Implement the Shared Button Contract and Store Dialog

**Files:**
- Create: `src/components/GameButton.tsx`
- Create: `src/components/GameButton.test.tsx`
- Create: `src/components/StoreUnavailableDialog.tsx`
- Create: `src/components/StoreUnavailableDialog.test.tsx`
- Create: `src/styles/controls.css`

**Interfaces:**
- Consumes: standard `React.ButtonHTMLAttributes<HTMLButtonElement>`; dialog props `{ open: boolean; triggerRef: React.RefObject<HTMLButtonElement | null>; onClose: () => void }`.
- Produces: `GameButton`; `StoreUnavailableDialog`; `.game-button` state styles; exact dialog copy.

- [ ] **Step 1: Write failing semantic button tests**

Test that `GameButton`:

- renders a real button;
- invokes `onClick` for mouse click, Enter, and Space through native button behavior;
- does not invoke `onClick` when `disabled`;
- forwards `aria-label`, `className`, and `type`.

Use `userEvent`, not `fireEvent`, for user interaction.

- [ ] **Step 2: Run the button tests to verify failure**

Run:

```powershell
npm run test:run -- src/components/GameButton.test.tsx
```

Expected: FAIL because `GameButton` does not exist.

- [ ] **Step 3: Implement the minimal button wrapper and state CSS**

`GameButton` must default to `type="button"` and otherwise forward native button props. Add CSS for:

```css
.game-button:hover:not(:disabled) { filter: brightness(1.08); }
.game-button:active:not(:disabled) { filter: brightness(0.92); transform: scale(0.98); }
.game-button:focus-visible { outline: 6px solid var(--focus-ring); outline-offset: 6px; }
.game-button:disabled { cursor: not-allowed; filter: saturate(0.35); opacity: 0.52; }
```

Do not add `transition`, `animation`, or keyframes.

- [ ] **Step 4: Write failing dialog tests**

Test that an open dialog:

- has `role="dialog"` and `aria-modal="true"`;
- contains `商店功能暂未开放` and `知道了`;
- focuses `知道了` when opened;
- closes via the button, overlay click, and Escape;
- restores focus to the supplied trigger button after closing.
- keeps Tab and Shift+Tab focus on the dialog's only interactive control.

- [ ] **Step 5: Run the dialog tests to verify failure**

Run:

```powershell
npm run test:run -- src/components/StoreUnavailableDialog.test.tsx
```

Expected: FAIL because the dialog does not exist.

- [ ] **Step 6: Implement the accessible dialog**

Render nothing when `open` is false. When open, render an overlay and panel, focus the close button in an effect, listen for Escape, stop panel clicks from closing through the overlay, and keep Tab/Shift+Tab on the close button so background controls cannot receive keyboard input. Restore `triggerRef.current?.focus()` from the effect cleanup when the dialog closes or unmounts.

- [ ] **Step 7: Run focused and full verification**

Run:

```powershell
npm run test:run -- src/components/GameButton.test.tsx src/components/StoreUnavailableDialog.test.tsx
npm run typecheck
npm run build
```

Expected: all pass.

- [ ] **Step 8: Commit shared controls**

```powershell
git add src/components src/styles/controls.css
git commit -m "feat: add accessible game controls and store notice"
```

---

### Task 6: Add Asset Preloading and Failure Isolation

**Files:**
- Create: `src/features/hero-select/useHeroAssets.ts`
- Create: `src/features/hero-select/useHeroAssets.test.ts`
- Modify: `src/features/hero-select/types.ts`

**Interfaces:**
- Consumes: `Hero[]` and browser `Image` loading events.
- Produces: `useHeroAssets(heroes): Record<HeroId, AssetStatus>`; `isHeroReady(heroId)` derived by the consumer.

- [ ] **Step 1: Write failing preload tests with a controlled Image mock**

Cover:

- every hero begins as `loading` after mount;
- a hero becomes `ready` only after background, logo, and card succeed;
- one failed file marks only its hero `error`;
- successful heroes remain ready when another hero fails;
- unmount prevents state updates from late callbacks.

- [ ] **Step 2: Run the preload tests to verify failure**

Run:

```powershell
npm run test:run -- src/features/hero-select/useHeroAssets.test.ts
```

Expected: FAIL because the hook does not exist.

- [ ] **Step 3: Implement isolated three-file loading per hero**

Create three `Image` objects per hero. Track completion count and one error flag. Log failed paths with `console.error("Failed to load hero asset", { heroId, src })`. Use an effect cancellation boolean so late events do not update an unmounted component.

- [ ] **Step 4: Verify hook behavior**

Run:

```powershell
npm run test:run -- src/features/hero-select/useHeroAssets.test.ts
npm run typecheck
```

Expected: PASS. No unhandled promise or React state-update warnings.

- [ ] **Step 5: Commit asset loading behavior**

```powershell
git add src/features/hero-select/useHeroAssets.ts src/features/hero-select/useHeroAssets.test.ts src/features/hero-select/types.ts
git commit -m "feat: preload hero artwork with isolated failures"
```

---

### Task 7: Build the Character Selection Components and Interactions

**Files:**
- Create: `src/features/hero-select/CurrencyCounter.tsx`
- Create: `src/features/hero-select/HeroIdentity.tsx`
- Create: `src/features/hero-select/HeroCard.tsx`
- Create: `src/features/hero-select/HeroCardList.tsx`
- Create: `src/features/hero-select/CarouselArrow.tsx`
- Create: `src/features/hero-select/HeroSelectPage.tsx`
- Create: `src/features/hero-select/HeroSelectPage.test.tsx`
- Create: `src/styles/hero-select.css`

**Interfaces:**
- Consumes: `Hero`, `HeroId`, `HEROES`, `getAdjacentHeroId`, `assetLoadState`; callbacks `onSelectHero: (heroId: HeroId) => void`, `onConfirm: (heroId: HeroId) => void`, `onBack: () => void`, and `onOpenStore: (trigger: HTMLButtonElement) => void`.
- Produces: a fully interactive `HeroSelectPage` that renders one current hero and five selectable cards.

- [ ] **Step 1: Write failing page interaction tests**

Render with PIKO selected and all assets ready. Assert:

- five hero-card buttons exist;
- clicking Riff updates the selected card and hero identity;
- previous from NIBBY selects BONGO;
- next from BONGO selects NIBBY;
- ArrowLeft and ArrowRight while focus is within the card list wrap identically;
- clicking the current selected card does not call `onSelectHero` again;
- SELECT calls `onConfirm("piko")`;
- SELECT is disabled when PIKO is `loading` or `error`;
- Back calls `onBack`;
- each of the three currency plus buttons calls `onOpenStore` with its own button element.

- [ ] **Step 2: Run the page tests to verify failure**

Run:

```powershell
npm run test:run -- src/features/hero-select/HeroSelectPage.test.tsx
```

Expected: FAIL because the components do not exist.

- [ ] **Step 3: Implement semantic leaf components**

Implement:

- `CurrencyCounter` with icon, numeric value, and a plus `GameButton` whose accessible name is `打开<货币名称>商店`.
- `HeroCard` as a `GameButton` with `aria-pressed={selected}` and disabled support.
- `CarouselArrow` as a `GameButton` with `上一位角色` or `下一位角色`.
- `HeroIdentity` as non-interactive content with alt text `<角色名>角色标志`.

- [ ] **Step 4: Implement card-list keyboard handling**

Attach `onKeyDown` to the card-list container. React only to `ArrowLeft` and `ArrowRight`; call `preventDefault`, calculate the adjacent ID, and invoke `onSelectHero`. Do not intercept Tab, Enter, Space, or Escape.

- [ ] **Step 5: Assemble HeroSelectPage with one data source**

Derive `selectedHero` through `getHeroById(selectedHeroId)`. Render background art, CSS overlays, header currencies, hero identity, arrows, SELECT, and all five cards. Use `assetLoadState[selectedHeroId] === "ready"` as the SELECT enabled condition.

- [ ] **Step 6: Implement missing-image visual fallbacks**

When a card hero is `loading`, show a themed placeholder and label `正在加载 <角色名>`. When `error`, show `无法加载 <角色名>` without a broken `<img>`. Apply the same error fallback to the current background/identity area.

- [ ] **Step 7: Run focused verification**

Run:

```powershell
npm run test:run -- src/features/hero-select/HeroSelectPage.test.tsx
npm run typecheck
```

Expected: all tests pass and there are no duplicate accessible names.

- [ ] **Step 8: Commit the selection experience**

```powershell
git add src/features/hero-select src/styles/hero-select.css
git commit -m "feat: implement interactive hero selection page"
```

---

### Task 8: Connect the Three-Page Application Flow

**Files:**
- Create: `src/pages/TemporaryHomePage.tsx`
- Create: `src/pages/GamePlaceholderPage.tsx`
- Create: `src/styles/placeholder-pages.css`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`

**Interfaces:**
- Consumes: `HeroSelectPage`, `StoreUnavailableDialog`, `StageFrame`, `HeroId`, `getHeroById`, and asset loading state.
- Produces: the complete flow `home ↔ hero-select → game-placeholder → hero-select`, with selection preservation and store-dialog state.

- [ ] **Step 1: Replace the smoke test with failing flow tests**

Test these complete paths:

```text
default load → hero-select
Back → temporary home → Enter hero selection → same selected hero
select Riff → SELECT → "RIFF 已准备就绪"
game placeholder → Return to selection → Riff remains selected
each currency plus → dialog → Escape → focus restored to same plus button
```

Mock `useHeroAssets` to return all heroes ready so page-flow tests are deterministic.

- [ ] **Step 2: Run App tests to verify failure**

Run:

```powershell
npm run test:run -- src/App.test.tsx
```

Expected: FAIL because page-state flow and placeholder pages are not implemented.

- [ ] **Step 3: Implement TemporaryHomePage**

Render a themed heading, the currently selected hero summary, and a semantic button named `进入角色选择`. The button calls `onEnterHeroSelect`.

- [ ] **Step 4: Implement GamePlaceholderPage**

Render the confirmed hero card image, heading `{displayName} 已准备就绪`, copy `游戏内容正在开发中`, and a button named `返回角色选择`.

- [ ] **Step 5: Implement App state and dialog ownership**

Initialize:

```ts
const [currentPage, setCurrentPage] = useState<Page>("hero-select");
const [selectedHeroId, setSelectedHeroId] = useState<HeroId>("piko");
const [confirmedHeroId, setConfirmedHeroId] = useState<HeroId>("piko");
const [isStoreNoticeOpen, setStoreNoticeOpen] = useState(false);
```

Store the triggering plus button in a ref. `confirmHero(heroId)` sets `confirmedHeroId` before changing the page. Wrap every page in `StageFrame`.

- [ ] **Step 6: Verify complete flow**

Run:

```powershell
npm run test:run -- src/App.test.tsx
npm run test:run
npm run typecheck
npm run build
```

Expected: all commands pass.

- [ ] **Step 7: Commit application navigation**

```powershell
git add src/App.tsx src/App.test.tsx src/pages src/styles/placeholder-pages.css
git commit -m "feat: connect home selection and game placeholder flow"
```

---

### Task 9: Match the Figma Layout and Visual Hierarchy

**Files:**
- Modify: `src/styles/tokens.css`
- Modify: `src/styles/global.css`
- Modify: `src/styles/controls.css`
- Modify: `src/styles/hero-select.css`
- Modify: `src/styles/placeholder-pages.css`
- Modify: selection components only when an additional visual wrapper is structurally required

**Interfaces:**
- Consumes: Figma frame `11:2` as the primary layout reference and the four alternate hero frames for state consistency.
- Produces: CSS matching the 2048×1152 coordinates, type hierarchy, color, shadows, overlays, card spacing, and button states without animation.

- [ ] **Step 1: Capture the current web baseline at 2048×1152**

Run the dev server and capture the hero-select stage at exact viewport `2048×1152`. Save the temporary comparison capture outside `src/`; do not commit it as a product asset.

Expected: all controls are present and functional even though visual fidelity is incomplete.

- [ ] **Step 2: Capture the Figma reference for frame 11:2**

Use Figma screenshot tooling with node `11:2` and sufficient maximum dimension to preserve the full 2048-pixel width. Record the natural dimensions returned by the tool.

- [ ] **Step 3: Encode stable visual tokens**

Define CSS variables for the measured deep-purple backgrounds, yellow primary action, white text, violet focus ring, radii, shadow stacks, and the exact Montserrat weights. Keep all colors in `tokens.css`; do not scatter repeated hex values through components.

- [ ] **Step 4: Match macro layout before decoration**

At the logical 2048×1152 scale, match in this order:

1. background crop and two readability overlays;
2. header positions and counter sizes;
3. title, subtitle, rarity area, and character logo bounds;
4. previous/next arrow positions;
5. SELECT button bounds;
6. five card positions and selected-card vertical offset.

Use the Figma metadata coordinates as evidence. Do not tune shadows while any primary box differs by more than 8 logical pixels.

- [ ] **Step 5: Match component surfaces and interaction states**

Recreate the visible gradients, strokes, depth, and shadows with CSS/SVG. Verify Default, Hover, Pressed, Focus, and Disabled visually for Back, arrows, hero cards, SELECT, currency plus buttons, home entry, dialog close, and game-return buttons.

Pressed-state scaling must be instantaneous; keep `transition` and `animation` absent.

- [ ] **Step 6: Verify all five hero states**

Switch through PIKO, Riff, BONGO, NIBBY, and MIRA. For each state verify background crop, logo fit, selected card, all five card positions, and readable text. Fix shared CSS or hero data instead of adding per-state arbitrary offsets unless the Figma art itself requires a documented crop position.

- [ ] **Step 7: Run regression verification**

Run:

```powershell
npm run verify:assets
npm run test:run
npm run typecheck
npm run build
```

Expected: all pass after visual work.

- [ ] **Step 8: Commit visual fidelity work**

```powershell
git add src/styles src/components src/features/hero-select src/pages
git commit -m "style: match hero selection Figma composition"
```

---

### Task 10: Complete Automated Regression and Figma Comparison Acceptance

**Files:**
- Modify: `src/App.test.tsx`
- Modify: `src/features/hero-select/HeroSelectPage.test.tsx`
- Modify: `src/components/StoreUnavailableDialog.test.tsx`
- Create: `docs/qa/hero-select-visual-qa.md`

**Interfaces:**
- Consumes: the finished application, the spec acceptance criteria, Figma frames `11:2`, `46:39`, `48:76`, `50:113`, and `51:150`.
- Produces: a passing automated suite, a passing production build, and an evidence-based viewport/Figma QA record.

- [ ] **Step 1: Add the final missing regression cases**

Ensure the suite explicitly covers:

- rapid next/previous clicks settle on the mathematically correct hero;
- a disabled SELECT cannot enter the game page;
- a failed hero does not block selecting a ready hero;
- modal background controls cannot be activated while the dialog is open;
- all interactive elements have unique accessible names;
- selected hero card uses `aria-pressed="true"`;
- page return preserves the selected hero.

- [ ] **Step 2: Run tests in non-watch mode**

Run:

```powershell
npm run test:run
```

Expected: zero failed tests and zero unhandled errors.

- [ ] **Step 3: Run static and production checks**

Run:

```powershell
npm run verify:assets
npm run typecheck
npm run build
```

Expected: all commands exit 0; Vite writes a production bundle to `dist/`; the browser console shows no missing assets on a local production preview.

- [ ] **Step 4: Run the desktop viewport matrix**

Start the production preview and inspect:

```powershell
npm run preview -- --host 127.0.0.1 --port 4173
```

Record results for `1920×1080`, `1600×900`, `1366×768`, `1280×720`, and `1400×900`. For each viewport record stage bounds, letterboxing, clipping, focus-ring visibility, and pointer hit accuracy in `docs/qa/hero-select-visual-qa.md`.

- [ ] **Step 5: Perform the five-state Figma comparison**

For each Figma frame, capture the corresponding web state at logical 2048×1152 and compare:

```text
11:2   ↔ PIKO
46:39  ↔ Riff
48:76  ↔ BONGO
50:113 ↔ NIBBY
51:150 ↔ MIRA
```

Record pass/fail for background crop, logo placement, header, arrows, SELECT, carousel order, selected-card offset, colors, and text hierarchy. Resolve every failure that affects layout, interaction, or recognizable visual hierarchy before completion.

- [ ] **Step 6: Perform keyboard-only acceptance**

Starting with the mouse untouched:

1. Tab through Back, three currency plus buttons, previous, next, SELECT, and five hero cards in DOM order.
2. Activate controls with Enter and Space.
3. Use left/right keys in the card region.
4. Open the store dialog, close it with Escape, and confirm focus restoration.
5. Confirm no focus ring is clipped and no disabled button receives focus.

Record the result in the QA document.

- [ ] **Step 7: Re-run the final completion gate**

Run once more after any QA fixes:

```powershell
npm run verify:assets
npm run test:run
npm run typecheck
npm run build
git status --short
```

Expected: all validation commands pass. `git status --short` lists only the intended QA document changes before the final commit.

- [ ] **Step 8: Commit QA evidence**

```powershell
git add src docs/qa/hero-select-visual-qa.md
git commit -m "test: verify hero selection against Figma"
```

## Final Completion Gate

Before reporting completion, verify all of the following with fresh command output:

```powershell
npm run verify:assets
npm run test:run
npm run typecheck
npm run build
git status --short --branch
```

Completion requires:

- five working hero selections by card and wraparound arrows;
- correct SELECT navigation to the temporary game page;
- working Back navigation to the temporary home page;
- three working currency plus buttons with accessible placeholder dialog;
- complete semantic button states including focus and disabled behavior;
- full-stage desktop scaling with letterboxing and no stretching;
- isolated missing-asset behavior;
- Figma comparison records for all five hero states;
- a clean or intentionally documented Git working tree;
- no deleted or overwritten user assets.
