# CHR-013 — Obsidian

**Status: ✅ closed on Richard's look, 2026-09-17 (s22).** *"Noice yeah love it."*

## 1. The ask

Richard, 2026-09-17: *"is there any chance we can make the whole editor and launcher a deeper shade of grey? I feel
like I'm a bit sick of the bluey green grey of the old Noodl editor. I'd really like something not black, but deep
like deep ocean or dark night style, obsidian or something."* Then, on the first look: *"It's the left panel being
by default lighter than the other bits that looks … gross … When it's a node props panel it looks ok."*

## 2. What was built

1. **The dark neutral ramp is obsidian** (`colors.css`): charcoal with a faint violet lean (hue ~250, sat ~10%).
   Only the dark end moved (`neutral-0…500`, `bg-5`, the three border literals); the text inks (`600+`) and the
   light theme are untouched.

   | token | before | after |
   |---|---|---|
   | `bg-page` / `neutral-0` | `#0e1117` | `#050506` |
   | `bg-0` / `neutral-50` | `#161c24` | `#141318` |
   | `bg-1` / `neutral-100` | `#212932` | `#232129` |
   | `bg-2` / `neutral-200` | `#2b3440` | `#2e2c36` |
   | `bg-3` / `neutral-300` | `#333e4d` | `#383642` |
   | `bg-4` / `neutral-400` | `#3c4857` | `#42404e` |
   | `neutral-500` | `#4a5560` | `#4e4c5d` |
   | `bg-5` | `#414e5e` | `#484555` |
   | `border-subtle` / `-default` / `-strong` | `#27303e` `#2f3945` `#434e5c` | `#2a2932` `#33323d` `#494656` |

2. **Every `BasePanel` paints `bg-1`, not `bg-2`.** The Components panel (and ~18 others on the frame) sat on the
   card/input tone; the property panel only read darker because its legacy frames paint `bg-1` over it. That
   mismatch predates the palette; the palette made it visible. `SearchInput` moved `bg-1 → bg-2` to stay an input
   on the new ground (every consumer is on `bg-1` now; the property filter already was).

## 3. How the ramp was chosen

Solved, not eyeballed (`scratchpad/solve.js`, s22): for a hue/saturation, binary-search the lightness that hits a
target luminance, stepping each surface at ≥1.155:1 against NAT-003's 1.15 bar
(`palette-contrast.spec.ts` "the dark elevation ramp is a ramp"), and re-placing the borders at the ratios they held
against `bg-1` (the instruction in `colors.css` since NAT-003).

- 🔴 **A darker ground compresses contrast, so "deeper" spends the step bar.** The first pass (`bg-0` Y = 0.0042)
  put the canvas at `#0e0d11`, which read as black; `bg-1` barely moved even then. Richard said *not black*, so
  `bg-0` was raised to Y = 0.0068. The panels are a different COLOUR, not much darker; that was the trade stated to
  him before he ruled.
- Three hues were injected live (CDP `<style>` over `:root`) and screenshotted on the same project: obsidian (250/10),
  midnight (228/22), abyss/deep ocean (214/38). Midnight and abyss read blue, the thing he was tired of.
- The canvas caches its token read; it refreshes on a root `class` or `data-theme` mutation
  (`CanvasTheme.ts:386`). An injected palette needs that nudge before the cards repaint.

## 4. Readings (s22, stack down)

- `npx jest` (editor): **476 suites; 3 failed → fixed**, all three the palette moving on purpose:
  `palette-copies` (its doc-comment example claimed the old `bg-0`), and two numbers pinned by value that
  IMPROVED on the darker ground: style-section has-value boundary 4.63 → **5.01**, folder-tree delete hover 2.61 →
  **2.84** (still under 3, still an open defect). Re-run of those plus `palette-contrast`: **4 suites / 318 tests,
  EXIT 0**. The other 473 suites passed in the full run.
- `npm run colors`, `npm run type`: **holding**.
- Copies moved with the ramp: `CanvasTheme.ts` (8), `InspectPopup.tsx` (3), `BlocklyTheme.ts` (3),
  `BlockValueBadges.ts` (2), `DoItBalloons.ts` (2), `CanvasThemeNodeSchemes.test.ts` (2, ELECTRON suite: not run
  here), `palette-contrast.spec.ts` light/dark statement rows (3).
- Live: the running editor read `bg-0 #141318`, `bg-1 #232129`, `border-default #33323d` from the file with no
  override present; `BasePanel` computed `rgb(35,33,41)`, `SearchInput` `rgb(46,44,54)`.
- Recents restored byte-identical (`a1ea46f2…`).

## 5. Not done — open

1. 🟡 **~15 `bg-1` fills inside `BasePanel`-hosted panels were designed as wells on `bg-2` and may now blend**
   (grep `background(-color)?: var(--theme-color-bg-1)` under `views/panels/`): `AiAuthoringPanel` (InterviewCard,
   ReferencePreview), `ComponentXRayPanel` ×2, `BackendServicesPanel` (LocalBackendCard; the AddBackendDialog two are
   a dialog), `ExecutionHistoryPanel` ×5, `WorkflowsPanel` ×1. Components' own hit is the rename input (on a
   `bg-3` row with a primary border): fine. **Not driven**: the raw-CDP rail clicks did not switch panels (the
   `cdp.js click` path emulates focus; a bare `Input.dispatchMouseEvent` from a second connection did not). Look at
   each by eye; a well with a border is probably fine.
2. 🔴 **28 × "Attempted to synchronously unmount a root while React was already rendering"** in `dev.log`, in two
   bursts, each exactly at a project → launcher transition (09:01:59 and ~09:13). s21's stacks read 0 but never took
   that path. CSS cannot cause it; unowned, unregistered elsewhere; re-measure on HEAD before filing.
3. One `` `value` prop on `input` should not be null `` in the property panel at 09:12 while Richard clicked nodes.
   Which node/row is unknown.
