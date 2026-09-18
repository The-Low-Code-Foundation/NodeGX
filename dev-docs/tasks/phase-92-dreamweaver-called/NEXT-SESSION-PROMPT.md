# Phase 92 — next session

**Written 2026-09-18 at the end of s33.** Branch `cline-dev`, HEAD `be435477`.
`git log -- dev-docs/tasks/phase-92-dreamweaver-called` for the phase's history.

s33 in one paragraph: **CHR-010 and CHR-009 are closed on Richard's rulings, the look gate has been
run over the surfaces CHR-010 changed for the first time, and the phase has one task left.** The
three surfaces AC1 named were driven (and three more with them), which found a defect every count
had passed — the icon picker's magnifier rendered **black** on the dark ground, because a core-ui
`<Icon>` brings its own `color: inherit` that beats any single-class host rule. Richard closed
CHR-010, ruled the `None` placeholder as placeholder text, ruled the gate's two launcher findings
(both built and re-driven green), and asked for **a new phase**: one styles panel in the left rail,
scoped as `../phase-94-one-styles-panel/`.

⚠️ Peers work in this checkout: **P88 / GAM** (backend, mcp, `templates/*`, `library/prefabs`) and
**P93 / TVW** (`ComponentsPanelNew`, `VisualCanvas`, `scripts/devtools/drive-tvw002-strip.js`).
P88 still holds **staged deletions** in the real index (`library/prefabs/date-picker/.../Inter-Medium.ttf`).
🔴 Commit through a temporary index and **`git reset -q -- <your paths>` on the real index
afterwards** — every commit of mine this session left stale entries there until I did, and a peer's
plain `git commit` would have swept them.

## The board, re-derived from the task files

| id | state |
|---|---|
| CHR-001, 002, 003, 005, 006, 012, 013 | ✅ closed on Richard's look |
| CHR-007 | ✅ built s4, invisible by design |
| **CHR-009** | ✅ **CLOSED s33** — the `IconInput` placeholder ruling was its last open item |
| **CHR-010** | ✅ **CLOSED s33** on Richard's look. §9 |
| CHR-008 the panel is one tree | 🟡 R8, identity, scaffold, 1 widget **inert**. Left: the undo re-seed defect, 37 widgets, AC3/AC4 wrong as written (§10.4). **Richard has not said whether the conversions resume** |
| CHR-004 the gates measure the scale | 🟡 §8 is new. Panel green, launcher green after two ruled fixes, three instrument holes closed. Left: **AC4/§3.3** (ask before starting — §7.7 re-priced it) and **a popout surface** |
| **CHR-011 the after picture** | ⬜ **THE ONLY THING BETWEEN THIS PHASE AND ITS CLOSE.** Static half taken (§6); the pictures need a packaged build |

## What to do next, in order

1. **CHR-011 — and Richard chose it over the alternatives** ("CHR-011 when the box is clear").
   🔴 It needs **a clean tree and the whole box**: `build-editor.ts` refuses a dirty tree, and
   `--skip-git` would bake two peers' uncommitted work into the `.app` whose md5 the manifest is
   supposed to pin. So **check `git status` first** and ask the peers before building. The static
   half is already in §6 — what is owed is the eight before/after pairs and the four rendered rows.
   Two of AC2's rows will not have moved, and §6 already names the task each one leaves open
   (`createRoot` → CHR-008, CSS-parsing specs → CHR-004); that is what AC2 allows, not a failure.
2. **Ask Richard the two questions the phase still owes**, both with a picture:
   - CHR-004 §8: the `ColorInput` swatch edge at **1.499:1 dark / 1.387:1 light** against 3:1. It is
     a swatch inside a field, not a panel field, so his "no outlines" ruling does not cover it.
   - CHR-008: do the §3.1 widget conversions resume, or only where a region needs one?
3. **The popout surface for the look gate** (CHR-004 §8's last line). The icon picker, the colour
   and text style pickers and the variants popup are drawn in the popup layer, outside
   `.sidebar-property-editor`, so **the gate cannot see where two of this phase's last three defects
   were**. P94 is about to rework exactly those surfaces, which is the argument for doing it soon.
4. Then **P94 STY-001** — the study Richard asked for. It needs no build and no box.

## Readings at the end of s33 (2026-09-18)

- `npx jest tests-unit` **from `packages/noodl-editor`: 472 suites / 7,564 tests, exit 0**, 76s.
  🔴 Name the command with the count — this is a different population from a plain `npx jest`.
  ✅ **`tests-unit/property-editor/portWireShape.test.ts` PASSES**, so s32's unowned "fails to run:
  Cannot find name 'Noodl'" is gone at this HEAD. Re-measured, not inherited.
- `npx jest tests-unit/chr-004` — **69 tests, exit 0**; five mutant arms red, all restored
  byte-identical.
- `npm run typecheck:editor` clean · `icons:font` 0 findings · `colors` **16 = 16** · `type` −3 vs
  baseline · `icons:css` 0 · `tokens:css` green over 333 stylesheets.
- **The look gate**, dev build, both themes:
  `--surface=property-panel` on a Group **GREEN** (638 readings, 7 ruled exceptions);
  on an `Icon` node **exit 1** (the swatch edge above) with the new placeholder ruling firing once
  per theme; `--surface=launcher --state=all` **GREEN after the two fixes**, 2,026 readings.
- **NOT run:** `test:ci`. P93 took it at `12dfbb78` — 2,985 specs / 8 failures, seed 41423, 66s, the
  standing floor by name (3 SUB-011, 2 NDA-017, 3 SUB-006). Relayed, so that is the measurement, not
  my conclusion; nothing of mine is in that surface.

## Rulings Richard gave in s33

1. **CHR-010: closed.** *"Let's close CHR 010."*
2. **The `None` placeholder stays** — placeholder text, not a value. Recorded as
   `unset-field-placeholder-stays-greyed` in `scripts/look-gate/rulings.js`, matched on the measured
   colour pair.
3. **The pressed CTA:** *"The darker pressed fill is ok, making the pressed font white will help
   with contrast and close this task."* Built.
4. **The selected folder row:** *"Darken the text, add a border around the fill, whatever, contrast
   is key here for accessibility."* Built as `--theme-color-primary-as-fg`.
5. **A new phase** for styles/colours/variants/font styles in one left panel — `phase-94-one-styles-panel/`,
   scoped, **R1–R7 proposed and none ruled**. Two defects he found while looking, and the variant
   one from CHR-010 §8, are its opening §3.
6. **Next in P92: CHR-011, when the box is clear.**

## Traps (s33's own, on top of s12–s32's in the git history of this file)

- 🔴 **A core-ui `<Icon>` defeats any single-class colour rule.** `.Root { color: inherit }` is
  (0,1,0), the same as `.search-icon`, and core-ui is injected later. Before converting a glyph,
  grep its host class for a colour rule **across all stylesheets** — I found the rule in
  `assets/css/style.css` only after the drive showed the glyph black. Fix with
  `variant={TextType.Default}` (compiles to `.Root.is-variant-default`, (0,2,0)).
- 🔴 **`offsetParent` is `null` for essentially every element in this renderer** (transformed
  ancestors). Any "is it visible" filter written with it drops the whole surface silently.
- 🔴 **This editor never unmounts a panel it has shown.** `document.querySelector('.sidebar-panel')`
  and `.sidebar-property-editor` both return a hidden 0×16 shell before the live panel. Sort matches
  by rect area. A census scoped to the shell reads **0 drawn**, which is what a broken surface reads
  like. `verdicts/CHR-010/census.js` now reports the scope's own box.
- 🔴 **The look gate's `launcher` surface is `body`** — with a project open it grades the EDITOR and
  files the findings under "launcher". Now guarded by `requires`, exit 2.
- 🔴 **A gradient ground was graded as the colour behind it** — three false findings in one run.
  Refused into `text:ground-is-an-image` now, but only above the first opaque layer.
- 🔴 **Measure a contrast fix AFTER every opacity in its own rule.** The folder row's count sat at
  `opacity: 0.75`, which composited the fixed ink back to 3.755:1.
- 🔴 **The hex ratchet counted its own prose** (`//` comments unstripped in `.scss`). Third time this
  phase has met a gate that reddens on its changelog.
- 🔴 **A `//` comment inside a JS template literal that contains a backtick ends the string.**
  `census.js` failed to parse that way; the emitted code must not carry backticks.
- ⚠️ A drive that adds nodes and creates a variant leaves the scratch project **unable to save**
  (P94 §3.3). Expect the project not to persist what the drive made.
- ✅ **Reaching the panel's popup surfaces**: `JavaScriptFunction` → a proplist; `net.noodl.visual.icon`
  → the icon picker; `Component Inputs` → the Ports panel (and dragging one port row over another is
  what draws the drag overlay's glyph); a `Group` → the variants popup (create one and REOPEN, or it
  opens straight into its create field); a colour field → the colour style picker. `DbCollection2`
  does **not** get you the query editor — that needs a DB class.
