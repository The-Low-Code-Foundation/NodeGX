# TVW-008 — The board

The old component canvas, back as a view of the Workbench. Proposal §4.7, mock scenario 5, callout
11, ruling R-I.

> "they had a kind of Figma style canvas preview of all the components spread out and you could move
> around and zoom in and out on each one … they might have got rid of it for a reason, and having the
> full page preview is clever to say 'ok you've got the right idea with each component, but do they
> really fit together?'" — Richard, 2026-09-17

## 1. The person sentence

**Someone who presses `All components` sees every visual component in the project drawn in its own
frame, at its saved size, with its first scenario, captioned with how many places use it — under the
word Workbench, marked as sample values — and clicking one benches it.**

## 2. The spec

| element | detail |
|---|---|
| **the target** | `PreviewScope` (`previewScope.ts:31`) gains `{ mode: 'board' }`. The segmented control from TVW-002 gains `All components`. `benchTargets()` (`:233`) is the component list, minus cloud functions, minus pages by default (a `Pages too` toggle in the board's caption includes them at a page frame) |
| **the export** | `buildBenchExport` (`componentBench.ts:410`) already splices one harness component `/#bench` (`:92`) with one instance node (`benchHarness`, `:358`). The board is the **same harness** whose root is a `Group` in a wrapping row layout holding **one instance per component**, each inside a sized `Group` frame (`bench.frame` default via `benchFrameDefault.ts:43`, else the 768 default) with its first scenario's inputs (`benchScenarios.ts:54` `bench.scenarios[0]`, else none) as parameters. One export, one client, one `<webview>` |
| **the frames** | drawn by the editor over the webview: caption `Hero · ×1 · 1280 × 200 · scenario: default`, or `no inputs set`; a frame whose component reads the shim gets `sample rows: 0` (FIX-013). Frames are laid out by the editor (measured, not by the runtime) so captions line up |
| **zoom / pan** | the whole board scales with ⌘-scroll between 25% and 100%; the webview is sized to the board at 100% and CSS-scaled; pan with space-drag as the canvas does |
| **click a frame** | `choose({mode:'bench', target})` — the single bench for that component, back with `App` or the `All components` segment |
| **selection** | a click on an element inside a frame selects it in TVW-003's store with the instance path through that frame's harness node; the canvas, if on that component, highlights it |
| **honesty** | caption line under the strip: `Workbench · All components — sample values, not the app's data.` The board never renders full-bleed (BEN R2): frames sit on the bench's hatched stage |
| **updates** | a `Model.*` change re-exports as the single bench does (`_exportToClient` dedupes identical bytes, `ViewerConnection.ts:430`). Typing in a benched component's input does not rebuild the board |

## 3. Scope

In: the target, the export, frames, captions, zoom, pan, click-through, selection, both themes,
docked and detached preview.

Out: editing scenarios from the board (bench one component for that). Arranging frames by hand
(order = the Components panel's order: sections, then folders, then name). Persisting zoom.

## 4. Acceptance criteria

1. **(person)** Corpus project. Press `All components`: six frames (Nav, Hero, Footer, Project Card,
   Price Tag, Primary Button), each captioned; Price Tag reads `unplaced`. ⌘-scroll to 50%: all six
   fit. Click Hero's frame: the single bench for Hero, with its inputs rail. Press `All components`:
   the board is back at the same zoom. Press `App`: the app preview is where it was.
2. The board's export contains exactly one harness component with N instance nodes, N = the number
   of visual components not in `#__cloud__`; each instance's parameters equal that component's first
   scenario (assert against `bench.scenarios[0]` in metadata) or are empty.
3. Every frame's measured box equals the component's `bench.frame` or the default; captions do not
   overlap at 25%.
4. A component with a saved scenario renders that scenario (a `Price Tag` scenario `{amount: 99}`
   shows 99 on the board; the single bench shows the same); one without renders its empty state and
   the caption says `no inputs set`.
5. The app preview's route and mode are unchanged across every step of AC1 (TVW-002's negative arm,
   re-run here).
6. Screenshots: the board at 100% and 50%, both themes; one frame benched. **Richard rules WORTHY.**
7. `test:ci` at the floor; `tests/canvas/preview-scope.test.ts` extended for the third mode.

## 5. Landmines

- A changed export makes the runtime `location.reload()` and a sandbox client returns under the
  same id (`ViewerConnection.ts:581`); the board loses click state on every model change. Accept and
  say so, or debounce as the single bench does.
- `plug` inversions (`componentBench.ts:22-43`): the harness node's parameters are the *instance's*
  inputs; BEN-001's note is wrong and the code is right.
- N harness instances of a component that itself places N more (a card grid) is N² nodes in one
  export. Cap a frame's depth at the component's own tree and let nested instances render as they
  do in the app; do not clone.
- The viewer webpack build is pre-ES2015 for iteration: `Array.from`, never `[...set]`.
