# ISL-015 — A kit author reads the traps before meeting them

**Status: 🟡 s11 (2026-10-03): ruled (all three as recommended) and BUILT — AC1–AC4, AC6 ✅; AC5 (the stranger round) owed.** Scoped 2026-10-01 at `27d891bf3`. **Source:** [the island audit](AUDIT-2026-10-01.md) row
**F20**, with **F14**'s note · found across P105 CG-001, P106 IG-007 and P108 IW-004, 2026-09-27 → 09-30 · **Side:**
product (kit docs page, node-kit types, kit scaffold and its README, the MCP's `create_node_kit`; a docs gate)

The island needed a block editor and a tile world, and both rightly became kits (audit F14: a kit is the right home).
Building them met the same handful of traps again and again. Each answer was written into a phase's task file, a
commit body or the session's memory, which is where the next kit author will never look.

## 1. The person sentence

**Someone writing their first kit that wraps a library, a person or an agent, finds every trap the island met written
where they already read (the docs page, the scaffold's README, the types and the MCP's kit tool), before they meet it.**

## 2. What was measured

Read at HEAD `27d891bf3`, 2026-10-01, by the author of this file. Nothing was run. For each trap: what it is, its
evidence, and where an author can read it today.

**Where an author reads today.** Re-read at HEAD:
- the docs page `docs-site/docs/custom-nodes.md` (604 lines; its traps section is "The rough edges", `:565-598`);
- the types `packages/nodegx-node-kit-types/src/index.d.ts`, copied into each kit's `types/` and pinned by `tests/drift.test.js`;
- the scaffold's README, written by `readmeMd()` in `packages/nodegx-kit-scaffold/src/index.js:645-760`;
- the `create_node_kit` tool: its description (`packages/noodl-mcp/src/tools/kitTools.ts:75-81`) and its success
  text, which says *"Read noodl_modules/<kit>/README.md before adding a second node"* (`:145-146`);
- per-module READMEs: 10 of the 39 folders in `library/modules/` have one; none is a general guide.

| # | trap | evidence | written where an author reads today? |
|---|---|---|---|
| T1 | **The root wrap is no longer needed.** A kit node may be a component's only visual node since GAM-014 (✅ 09-17). The doctrine outlived the fix: the garden generator, written 09-27, still says *"A kit React node is never a component's root (D53)."* | `packages/noodl-mcp/tests/cg003Components.ts:26`; [GAM-014](../phase-88-the-defects-the-games-found/GAM-014-A-KIT-NODE-DRAWS-WHEN-IT-IS-THE-WHOLE-COMPONENT.md); P88 R28 (*keep the wraps* in shipped templates) | **No.** The docs page says nothing either way |
| T2 | **A signal input arrives as a count**, and two pulses in one frame can count as one | `garden-kit/src/kit.js:1596-1603` (`rose`), `:1684-1689` (Celebrate), `:31-32` (a robot's `bump` count inside the Robots JSON) | 🟢 **Yes, for a signal port:** `custom-nodes.md:220-266`, with the same-frame caveat at `:265` (GAM-017, s22). **So the audit's "written only in memory" does not hold for this trap.** Not written: the same pattern for a count *inside* a JSON value (`bump`) |
| T3 | **An imperative widget must not reload on its own echo.** Inject once into an element React never renders into, hold it in a ref, and load a program only when the graph sends a new one that is not the node's own text. The first cut reloaded on every prop change and threw a child's edits away | [IW-004](../phase-108-the-island-works/IW-004-REAL-BLOCKS.md) lines 105-109 and §5 line 81-82; `garden-kit/src/blocks.js:2397-2405` | **No.** The page's only imperative example hands a result back (`:322`); nothing on wrapping a library that owns its DOM |
| T4 | **A wrapped library's global CSS reaches the whole page.** Blockly injects global rules; the kit put every one of its own rules under `.gd-bk`, and a spec reads every selector | IW-004 §5 line 83; `blocks.js:1370-1394` | **No.** ⚠️ **"Leaking into editor chrome" does not hold as written:** the canvas is an Electron `<webview>` (`noodl-editor/src/editor/src/views/VisualCanvas/CanvasView.ts:26`), a separate document from the editor's own UI. What a page-global rule reaches is the rest of the **app's** page and other kits. IW-004 wrote it as a predicted trap; no leak was found measured in the task files read |
| T5 | **A theme handed to a canvas, WebGL or a library needs a real colour.** `var(--token)` means nothing outside CSS; the kit reads it off the page with `getComputedStyle` and falls back on junk | `blocks.js:1396-1406` (`resolveColour`); IW-004 line 111 | **No, and the advice points the other way.** The tool description and the scaffold README say every colour port defaults to a `var(--token)` (`kitTools.ts:77-81`; `index.js:701-706`), true for CSS and wrong for a theme object. No runtime helper resolves a token for a kit: `grep` finds `resolveColour` in `blocks.js` only |
| T6 | **Another kit's code is reached through `window.__noodl_modules`, in alphabetical load order**, and only at render | `garden-3d-kit/src/kit3d.js:327-346`; ISL-013 §2 | **No.** The types call the array *"Runtime-internal"* (`index.d.ts:1113-1114`). ISL-013 rules the route; this task writes it down |
| T7 | **A dependency's global is not there at definition** in the catalog reader (it loads `main` only), and nothing is there under SSR before the DOM | `kit3d.js:13-16`; `noodl-mcp/src/kitExtract/entry.js:132`; ISL-012 §2 | **Half.** `custom-nodes.md:592-596` says not to touch `document` or the DOM at import time under SSR. It says nothing about a dependency's global or the catalog reader |
| T8 | **`defaultCss` is an inline style that beats the kit's own stylesheet** | ISL-011 §2; CG-001 §7.1 item 1 | **No.** The page sends structure to `defaultCss` (`:147-149`) without saying it is inline |

Also measured: the types copies' gate (`drift.test.js`) and the docs samples' gate (`docsamples.test.js`, which
compiles complete samples and **counts** fragments) exist. No gate checks that any trap is written anywhere.

## 3. Where it bites a person

- The next block editor, chart, map or 3D kit. Each trap above cost the island at least one drive, and T3 cost a
  child's edits in the first cut.
- An agent building a kit through `create_node_kit` reads the tool description and the README it is pointed at. T5's
  advice there is right for most ports and wrong for the one that breaks a themed library.
- A stale rule (T1) costs a wrapper Group in every component, forever, because nobody tells the author it is gone.

## 4. Related work and collisions

- **P69 [CN-007](../phase-69-the-node-you-write-yourself/CN-007-THE-DOCS-PAGE-THAT-REPLACES-THE-BROKEN-ONE.md)** ✅:
  the docs page and its gate. New complete samples are compiled; fragments are counted, deliberately.
- **P69 [CN-006](../phase-69-the-node-you-write-yourself/CN-006-SCAFFOLD-A-KIT.md)** ✅ and **CN-009** ✅: the scaffold
  and the MCP tool surface. 🔴 Tool descriptions sit under the MCP's token budget gates; a trap list belongs in the
  README the result points at, not in the description.
- **P88 GAM-014, GAM-017, GAM-018** ✅: T1, T2 and the D41 order rule are their outcomes, to be written, not redone.
- **[ISL-011](ISL-011-A-KIT-NODE-KEEPS-ITS-OWN-DISPLAY.md)** (T8), **[ISL-012](ISL-012-A-KIT-CAN-SHIP-A-MODERN-LIBRARY.md)**
  (T7, and the library-bundling recipe), **[ISL-013](ISL-013-TWO-KITS-SHARE-CODE-WITHOUT-A-COPY.md)** (T6): each fixes
  or rules; this task writes the outcome down and gates it. Write those rows after their rulings, not before.
- **[ISL-024](ISL-024-A-TEMPLATE-LIVES-IN-ITS-OWN-FOLDER.md)** owns the garden generator, where T1's stale line lives.
- Owner grep: `grep -rnai --include='*.md' "rough edges\|kit-authoring\|authoring traps\|custom-nodes.md" dev-docs/tasks`
  → P69 CN-007, CN-010, CN-011, TASKS and RULINGS-OPEN-QUEUE, a P69 drive note, P88 GAM-015 and GAM-017 (each added
  its own section to the page), and a P5 draft. None owns a trap list for kits that wrap a library.

## 5. Design — 🔒 rulings first

1. 🔒 **Where does the list live?** (a) The docs page grows a section, "Wrapping a library", for T3, T4, T5 and T7
   with one complete sample, and "The rough edges" gains T1, T6 and T8. The scaffold README carries a short version
   of each with a link, and `create_node_kit`'s result points at it. (b) A separate page, `kit-traps.md`, linked from
   both. **Recommendation: (a)**: an author already reads that page and the README; a second page is one more thing
   not to find.
2. 🔒 **T5, the token advice.** (a) Keep "default to a token" and add the exception in the same paragraph: a colour
   handed to anything that is not CSS must be resolved first, with the three-line way to do it. (b) Also ship a small
   helper in the runtime for kits (`Noodl.resolveColor(value, element)`). **Recommendation: (a)**; (b) only if a
   second kit needs it.
3. 🔒 **The gate's shape.** (a) A table of trap ids, each with the surfaces it must appear in and a phrase or heading
   each must contain, checked by a spec beside `docsamples.test.js`. (b) The same, plus a runnable sample per trap.
   **Recommendation: (a)**, with a sample only for T3, the one a sentence cannot teach.

Constraints: plain words, one paragraph per trap, each saying what you would notice ("the grid is one flat block",
"edits vanish when the page re-renders") before the rule. No phase numbers in product docs. The types' copies are
regenerated from the scaffold, never edited by hand.

## 6. Acceptance criteria (after the rulings are recorded in §8)

| AC | Clause |
|---|---|
| AC1 | **RED at HEAD, recorded in §8.** The gate is written first and run against HEAD: for T1-T8 × each ruled surface, record present or absent. **Known-firing control:** T2 reads present on the docs page and in the types (GAM-017's words). Every other row reads absent, by name. |
| AC2 | **Written.** Each trap is in each ruled surface, in plain words, with what you would notice first. T1 says a kit node may be a component's root. T4 says the page, not the editor, is what a global rule reaches. T6, T7 and T8 carry their tasks' ruled outcome, not today's workaround. |
| AC3 | **Gate green, with sabotage arms.** Delete T3's paragraph from the docs page and the gate is RED for T3 alone, by name. Delete T5's README line and the same. The gate counts its rows; a shrinking table is a diff. |
| AC4 | **The agent's route.** `create_node_kit`'s success text names the README section with the traps, and the README carries them. A spec reads both. The tool description stays within its budget gate. |
| AC5 | **Person sentence, a stranger round, on a deployed page.** A fresh agent with no memory of this phase is given only the docs page and `create_node_kit`, and asked to wrap a small imperative library with a theme colour from a token. Deployed and driven: the theme paints the token's colour (pixel read, not the fallback), an edit survives three re-renders, the kit's CSS reaches nothing outside its root (a sibling element's computed style is unchanged), and the node is a component's root with no wrapper. Its transcript is read for which trap it met and whether the docs had it. |
| AC6 | **The stale doctrine.** Record T1's generator line for ISL-024 to retire. The shipped templates' wraps stay (R28) unless ISL-025 re-rules. |

## 7. Traps

- 🔴 **A phrase gate grades words, not understanding.** AC5's stranger round is the only clause that tests whether
  the words work. Do not drop it because the gate is green.
- A stranger who has read this phase's files is not a stranger. Give it the docs and the tool, nothing else.
- `docsamples.test.js` compiles complete samples and counts fragments. A new sample changes the count on purpose.
- T4's measurement needs a sibling element **outside** the kit's root: a check inside the root grades the kit's own rules.
- T5's pixel must be read where the theme paints (inside the canvas or the library's SVG), not on a CSS box beside it.
- Writing T6-T8 before ISL-011, ISL-012 and ISL-013 rule writes today's workaround as tomorrow's advice.

## 8. Record

### Session 11 (2026-10-03) — the table re-read, and the three rulings

**§2 re-read at `a6f629a2e` before asking.** One row moved: **T8 is now written** — ISL-011 (s2, `4638de4b1`) put
*"`defaultCss` is an inline style"* on the docs page (`custom-nodes.md:151`, a caution block), in the types and in the
scaffold's README, with its own gate. T5 still holds: the runtime's `resolveColor` (`noodl-viewer-react/src/styles.ts:122`,
called by `node.ts:432` for a `color` port) maps a project's NAMED colour styles, not a `var(--token)`, and is not offered
to a kit. T1's docs page still says nothing about a kit node as a component's root; its only sizing advice is "put it in
a Group" (`:277`), which is about Width/Height, not the old root rule. ISL-012 and ISL-013 are still ⬜ (T6, T7 wait).

**Ruled (Richard, 2026-10-03, one click each, all as recommended):**
1. **"Grow existing pages"**: a "Wrapping a library" section on `custom-nodes.md`, a short version of each trap in the
   scaffold's README, and `create_node_kit`'s result points at it.
2. **"Advice + exception"**: keep "default to a token"; the same paragraph says a colour handed to anything that is not
   CSS is looked up first, with the three-line way. No runtime helper.
3. **"Phrase check + 1 sample"**: a spec holds the trap list and the phrase each surface must carry; one runnable
   sample, for T3 (the reload on its own echo).

T6 and T7 are not written until ISL-013 and ISL-012 rule (§7's last trap: today's workaround would read as tomorrow's
advice). The gate carries them as named pending rows, so the table cannot lose them; T7's existing SSR sentence stays.

**Built in s11** — the gate first: [`isl015-kit-traps.test.js`](../../../packages/nodegx-node-kit-types/tests/isl015-kit-traps.test.js)
(beside `docsamples.test.js`; the README read as `scaffoldKitFiles` GENERATES it, not from its template literal).

| AC | reading |
|---|---|
| AC1 | ✅ **RED at HEAD `b49434fcb`: 13 of 20.** Present: T2 and T8 on the docs page (the known-firing control: GAM-017's and ISL-011's words), T8 in the README; T6/T7 pending rows green (no surface carries a route). Absent by name: T1, T3, T4, T5 on the docs page; T1–T5 in the README; the tool's pointer; the T3 sample (3 rows). |
| AC2 | ✅ **Written.** Docs page: a new `## Wrapping a library` before "Where your kit runs" — three sub-sections, each opening with **What you notice** (T3 "Edits vanish when the page re-renders", with a complete sample `noodl_modules/note-kit/index.js`; T4 "The library's CSS reaches the whole page" — the page, other kits, *not* the editor, whose canvas is a document of its own; T5 "A theme colour has to be looked up…", with `colourOf`, a probe element's computed `color`, which reads any CSS colour, not only hex — the island's own `resolveColour` (`blocks.js:1462`) falls back on an `rgb()`/`hsl()` token); the token paragraph carries the exception in the same paragraph, linked (ruling 2); T1 heads "The rough edges", claiming only what GAM-014 measured (a deployed page and the editor canvas). Scaffold README: `## Traps you will meet`, six bullets (T1–T5, T8 pointing at Ports). |
| AC3 | ✅ **21/21 green, two sabotage arms**, each on a backed-up copy restored by `cp` and `cmp`-checked: T3's rule paragraph deleted from the docs page → **1 red, "T3 on the docs page"**; T5's README bullet deleted → **1 red, "T5 in the scaffold's README"**. The table asserts its eight ids and the two pending owners. **T3 sample RUN** (the ruling's one sample): pulled off the page, loaded as the runtime loads a kit (React 19 global, `Noodl.defineModule`), rendered in jsdom: typed text survives 3 re-renders with the graph's old value and its own echo, a new graph value shows, one `textarea` throughout. Sabotage: the same sample with the guard replaced by "load whatever the graph says" (the island's first cut) shows `from the graph` after the first re-render. |
| AC4 | ✅ `create_node_kit`'s `next` names *"Traps you will meet"* (read by the gate); `kitTools.test.ts` 10/10. The tool description is unchanged (its budget gate untouched). |
| AC5 | ⬜ **Owed: the stranger round.** A fresh agent with only the docs page and `create_node_kit`, deployed and driven (§6). |
| AC6 | ✅ Recorded for ISL-024: `packages/noodl-mcp/tests/cg003Components.ts:26` *"A kit React node is never a component's root (D53)"* is the stale line (ISL-024 §8). The shipped wraps stay (R28). |

Neighbours: `docsamples.test.js` fragment budget 8 → 9 (`colourOf`, named in its comment; the complete count rose
too). **Met on the way, this phase's own:** `drift.test.js` was red since s6 — ISL-009's `0951dbbe3` added
`noDataAttributes` to the runtime's `ReactNodeDefinition` and not to the published types. Added to `index.d.ts` and
the 10 copies that were current (6 library kits, bot-garden ×3, pixel-game; each +5 lines, nothing else); the 4 copies
already stale before this (dbt-lesson ×2, rocket-school ×2, unpinned) left as found. Filed
`P109-S11-NODATAATTRTYPES` (fixed). Types package 111/111, scaffold 76/76.
