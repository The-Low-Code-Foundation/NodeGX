# GAM-006 — A colour switched by a States node reaches the screen, with transitions on

**Status: 🟢 BUILT AND DRIVEN — every AC met except AC6's Rocket School arm (2026-09-14, session 5).** Session 3 (`82a7d3775`): AC1 RED, (b), AC2's runtime half, AC8. Session 4: the delayed colour, AC7 RED then (b) in `node-transitions.ts`, (a) as one shared colour reader with R7's warning, AC4's census, all graded headlessly by reverted arms. **Session 5:** AC3 and AC5 in a real browser (TPL-003 `FilterPill`, TPL-006 `Story/Passage`), each beside the old runtime and a reader-bypassed sabotage runtime. AC6's TPL-005 half is driven, and TPL-006's pin is removed. **Rocket School's `chStates` could not be driven** in the `deploy-from-disk` build (§8), so its pins stay with P87. The viewer bundles and the export `dist` are rebuilt. **Source:** [P78 D49](../phase-78-the-templates/DEFECTS-THE-TEMPLATES-FOUND.md) (replaces D43) · found by TPL-006 story engine, 2026-09-12 (TPL-005 pixel game, 2026-09-11, first) · **Side:** product (runtime, `States`)

A States node flips its text and leaves its colour behind: the eyebrow reads "An ending" and the ink stays the
reading colour, at every sample for 1.5 s. This happens with transitions on, which is the default.

## 1. The person sentence

**Someone switches a component's state, and every colour that state names appears on the screen, gliding there when
transitions are on and jumping there when they are off.**

## 2. What was measured

Readings are re-read at HEAD `eb12ebe99` (2026-09-14) unless marked. Template readings are from the working tree over that commit.

| reading | where |
|---|---|
| **Seen in the browser, two arms that differ only in `useTransitions`.** With `true`, the string flips and both colours read their previous value at 0, 60, 150, 320, 700 and 1500 ms. With `false`, all three land. *As recorded 2026-09-12, not re-driven* | register D49 |
| `useTransitions` is on by default, in both places | `packages/noodl-viewer-react/src/nodes/std-library/states.ts:136`, `:318-327` |
| `boolean`, `string` and `textStyle` values are assigned and flagged at once. Every other type takes the transition path unless dur and delay are both 0, transitions are off, or the state is only passed through | `states.ts:716-724`, `:725-751` (the guard is `:735-741`) |
| 🔴 **The mechanism.** `onStart` parses a colour with `setRGBA(resolveColor(v))`. `resolveColor` only looks the value up in a `styles.colors` table and otherwise returns it unchanged, so `var(--primary)` is read two characters at a time as hex (`'ar'` gives 10, the rest NaN) | `states.ts:165-179`, `:89-101`; `packages/noodl-viewer-react/src/styles.ts:122-127` |
| 🔴 **The tween ends on the parsed garbage, not the authored value.** The last frame writes `rgbaToHex(targetValues)`, which is `#0aNaNNaNNaN`. The browser rejects it and keeps the old colour. D49's "never publishes" is precisely: it publishes an invalid colour | `states.ts:190-194`, `:108-110` |
| **Already MEASURED headlessly by P18**, with the loaded `states.ts`, owner NONE. *As recorded 2026-09-03, not re-run* | [EXP-011 §49.3, §49.6](../phase-18-code-export-v2/EXP-011-PICKER-COVERAGE.md); `packages/nodegx-export/tests/animation-pair.test.ts:600` (A5) |
| ⚠️ **D49's title does not hold as written for numbers or hex colours.** A `number` value tweens through `Number()` and `EaseCurves.linear`, and a `#rrggbb` colour parses. Both are predicted to work from source. Neither has been measured in a browser. The D49 table measured only a string and two **token** colours | `states.ts:161-164`, `:197-199` |
| The same parse, from the same lookup, sits in visual-node state transitions (variants). Predicted to break the same way for a token colour. **Not measured** | `packages/noodl-viewer-react/src/node-transitions.ts:38-42`, `:88-100` |
| A resolver that reads `var()` off the document already exists: P79 E2's fix for Color Blend | `packages/noodl-viewer-react/src/nodes/std-library/colorblend.ts:45-75` |
| **Census, States nodes with a colour value and transitions on** (working tree). Templates: `landing-pages` `Site/FilterPill` `fpLook` (`bg`, `fg`, `edge`; tokens; set `true`); `pixel-game` `Pages/Play` `plBannerStates` (`tone`) and `plBoardStates` (`edge`), both default, tokens, **still unpinned** | `templates/*/components/**/nodes.json` |
| Prefabs: `app-shell` `Nav Item` `color` (default, `var(--primary)`/`var(--muted-foreground)`); `navigation-menu` `Item` `color` (default, style names `Primary`/`Grey - 900`, which resolve only if the project carries colour styles). Every other colour-carrying prefab States is pinned `false` | `library/prefabs/*/project/project.json` |
| Numbers with transitions on (the controls for the number claim): `landing-pages` `FaqRow`/`PhotoCard`/`ServiceCard` `chevron`; prefabs `toast` `Toast Component` `Pos`, `toggle-switch` `pos` | same |
| Ten prefab components wire a value into `currentState`, as D49 says. 8 of them pin `false`; `toast` and `toggle-switch` default and carry no colour | same (`toId`/`toProperty`) |
| Workarounds pinned by gates: TPL-006 `psLook` and `rdMode` (`tpl006Template.test.ts:533-545`); all 22 Rocket School States (`tpl007Template.test.ts:196`) | `packages/noodl-mcp/tests/` |

## 3. Where it bites a person

Any selected/unselected, calm/urgent or success/error look done with a States node, in any project that colours with tokens.
The authoring doctrine insists on tokens, and every v2 template uses them. The panel is right, the validator is silent, the
string beside it changes, and the colour does not. The idiom is [CMP-001 §4](../phase-85-the-component-is-the-backbone/CMP-001-THE-COMPONENT-INTERFACE-PLAYBOOK.md).

## 4. Related work and collisions

- 🔴 **[EXP-011 §49.3](../phase-18-code-export-v2/EXP-011-PICKER-COVERAGE.md) found and measured this mechanism first** and
  registered it owner NONE. The export resolves the token and "degrades to the interpreter's own answer where there is no document".
  `animation-pair.test.ts` A5 pins the interpreter's current garbage, so a runtime fix changes what that row compares against.
- [P79 E2](../phase-79-the-syllabus/DEFECTS-LESSON-3-FOUND.md) is the same shape in Color Blend, fixed 2026-09-05. That fix is the resolver to reuse.
- [P30 audit, Animation](../phase-30-node-library-audit/audit/animation.md) and [Interpolation D1](../phase-30-node-library-audit/audit/interpolation.md) (the colour-format contract).
- D43 is disproved and replaced by D49. Read it for history, and do not build its mechanism.
- The template workarounds: [TPL-005](../phase-78-the-templates/TPL-005-THE-PIXEL-GAME.md) (predicted broken, not pinned),
  [TPL-006](../phase-78-the-templates/TPL-006-THE-STORY-ENGINE.md), [TPL-007](../phase-78-the-templates/TPL-007-THE-MATHS-AND-TYPING-GAME.md),
  and [P87 README](../phase-87-the-first-play-test/README.md) `:144`.
- Greps run: `useTransitions`, `NaNNaN`, `token colour`, `resolveColor` over `dev-docs/tasks`. Nothing else owns the runtime fix.

## 5. Design

- **(a) Resolve before parsing.** `onStart` reads both endpoints through a shared colour reader: `var(--token)` via the document
  (Color Blend's `parseColor`), `#RGB`, `#RRGGBB(AA)` and `rgb()/rgba()`.
- **(b) Land on the authored value.** The last frame writes the state's own parameter, not `rgbaToHex`. Then even a colour the
  reader cannot parse arrives, as a jump at the end.
- (a) without (b) still ends on an unreadable value. (b) without (a) is a correct end state with no glide. Land (b) first, because it alone meets the person sentence.
- **(c)** `node-transitions.ts` gets the same reader, if AC7 shows it has the defect.
- 🔒 **Richard:** a colour the reader cannot parse: jump silently at the end, or also raise a runtime warning naming the value,
  as Color Blend "reports what it cannot read"?
  > 🔒 **Ruled, 2026-09-14 (session 1): warn only if CSS rejects it.** A value the browser accepts but the tween cannot
  > interpolate (a named colour such as `red` or `transparent`) jumps at the end silently. A value the browser would also reject
  > raises a runtime warning naming it. — Richard, choosing that option over "jump silently" and "jump and always warn"
  >
  > ⚠️ Owed by the build: where there is no document (server render, a headless spec), "would CSS reject it" has no oracle.
  > Say what the node does there, and do not warn on a guess.
- **Do not** flip the `useTransitions` default. Numbers animate with it (the toggle-switch knob), and it changes every project.
- **Do not** "fix" by pinning `false` across the prefabs. That is the template workaround, generalised.

## 6. Acceptance criteria

| AC | Clause |
|---|---|
| AC1 | **RED at HEAD, recorded in §8.** A viewer spec boots the real `states.ts` with a `var(--primary)` colour and transitions on, and runs past the tween. The colour output is not the token (expected `#0aNaNNaNNaN`), beside a known-firing string value on the same node that flips. Two more arms on the same spec, recorded whatever they read: a `#8a4f16` colour, and a `number` value. **Their result corrects or confirms the register's "or a number".** |
| AC2 | (b): the token arm ends on the authored value. Sabotage arm: restore `rgbaToHex(targetValues)` and it goes RED. |
| AC3 | (a), in a real browser with the document's tokens: every frame of the tween is a valid CSS colour and the midpoint differs from both endpoints. Sabotage arm: bypass the reader and the frames are invalid. |
| AC4 | **Blast radius before landing:** list every States node with a colour value and transitions on across `library/prefabs`, `templates/`, the embedded template `.content.json` files and the P86 corpus. Record what each shows today and after. §2's four (FilterPill, `plBannerStates`, `plBoardStates`, app-shell `Nav Item`) are the known-firing hits. |
| AC5 | **Person, real browser:** TPL-006's `Story/Passage` with `useTransitions` true, walked to an ending. `rule` and `tone` change on the rendered DOM. Plus TPL-003's `Site/FilterPill` clicked: the selected look changes. Control: the same drive on HEAD reads unchanged. |
| AC6 | **Workarounds:** flip one Rocket School colour States (`Game/Choice` `chStates`) to `true` in a copy and drive its selected look. Then decide, and record, whether the Rocket School and TPL-006 pins and their two gates stay (as belt and braces) or go. TPL-005's two unpinned nodes are driven and read correct. |
| AC7 | `node-transitions.ts`: a visual state with a token colour is measured at HEAD. If RED, it is fixed here under AC2/AC3's arms, or registered with an owner. |
| AC8 | `animation-pair.test.ts` A5 is updated so the interpreter and the export agree on a token colour, and it stays green. |

## 7. Traps

- 🔴 **A hex-colour fixture grades nothing.** Hex parses today. The defect needs a token.
- 🔴 **Server render freezes the clock** (`ssr.note`), so a render-server read shows the start state whatever the fix does. Use a browser, and wait out the duration.
- ⚠️ A token that resolves to another token: Color Blend bounds the recursion. Keep the bound.
- ⚠️ `resolveColor`'s named-style lookup must keep working for legacy projects (`Primary`). Test that arm as well.

## 8. Record

### Session 3 (2026-09-14, HEAD `bb27086de`) — AC1: RED at HEAD, and the register's "or a number" is wrong

**The spec:** [`noodl-viewer-react/tests/gam-006-states-token-colour.test.ts`](../../../packages/noodl-viewer-react/tests/gam-006-states-token-colour.test.ts).
A real `States` node in `createCorpusGraph`, with the **viewer's own `Styles`** on `context.styles` (`viewer.jsx:144`),
where P18's A5 used a stub, carrying two legacy colour styles (`Grey`, `Primary`). One node carries every arm, so the
known-firing string sits beside the colour that does not arrive. The node settles into A (the first state jumps,
`jumpToState`), then `to-B` is pulsed and the clock runs at `graph.frame(16)`. The default transition is 300 ms. Log:
session `04c88900…` scratchpad, `gam006/ac1-run1.log` (`GAM006_AC1_EXIT=1`, 3 failed of 7 as predicted).

| value | A → B | transitions **on** (the default), 0 / 64 / 160 / 320 / 704 / 1504 ms | transitions **off** |
|---|---|---|---|
| `label` (string, known-firing) | `calm` → `hit` | `hit` at 0 ms, and after | `hit` |
| 🔴 **`tint`** (colour) | `var(--muted)` → `var(--primary)` | **`#0aNaNNaNNaN` at every sample, from 0 ms** | `var(--primary)` |
| `hex` (colour) | `#334455` → `#8a4f16` | `#334455ff`, `#4f4740ff`, `#714b27ff`, then `#8a4f16ff` from 320 ms | `#8a4f16` |
| `named` (colour style) | `Grey` → `Primary` | `#777777ff`, `#555b60ff`, `#2d3946ff`, then `#112233ff` from 320 ms | `Primary` |
| `size` (number) | `10` → `40` | `10`, `19.8…`, `31.6…`, then `40` from 320 ms | `40` |

**What it settles.**
- **The defect is a token colour, not colours and not numbers.** A `#rrggbb` colour and a named colour style both glide
  and arrive. A number glides and arrives. This confirms §2's ⚠️ and corrects D49's title and the register's "or a number".
- 🔴 **It is worse than D49 recorded.** Both endpoints are tokens in a real template (`var(--muted)` → `var(--primary)`),
  so the start value parses to garbage too. The output is an invalid colour **from the first frame**, not only at the
  end. A browser rejects every frame and keeps whatever it drew last, which is D49's "the ink stays the reading colour".
- **Transitions off lands every value**, the author's strings included. With transitions on, a colour that arrives ends
  as the tween's own 8-digit hex (`#8a4f16ff`), not the authored string. Design (b) makes both end in the same place.
- The three red rows are `tint`, `hex` and `named`. `hex` and `named` fail on the string's form, not its colour, and (b)
  turns them green along with `tint`.

### Session 3, continued — (b) built, AC2's runtime half graded, AC8 kept in step (`82a7d3775`)

**The change.** `states.ts` `onRunning`, the end-of-transition branch: a colour ends on
`stateParameters['value-<state>-<value>']`, the value its state names, instead of `rgbaToHex(targetValues)`. When the
state names no colour, it still ends on the tween's hex. Nothing else moves: numbers, strings, booleans and the frames in
between are as they were.

| reading | result | log (`gam006/`) |
|---|---|---|
| GAM-006 spec with (b) | **7/7**. `tint` ends on `var(--primary)`, `hex` on `#8a4f16`, `named` on `Primary`, which is where transitions off has always landed | `ac2-b-green.log`, `GAM006_B_EXIT=0` |
| 🔴 **Reverted arm:** only my hunk reverse-applied, which is `states.ts` at HEAD | **exactly `tint`, `hex` and `named` red**. `label`, `size` and transitions-off stay green. Restored, sha `0ff3a144…` before and after | `ac2-b-reverted.log`, `GAM006_B_REVERTED_EXIT=1` |
| The viewer's existing States specs (`nda-001-states-reactivity`, `nda-004-states-unknown-state`, `erg-001-states-outcomes`) | 3 suites, **42/42** | `states-regression.log`, `STATES_REGRESSION_EXIT=0` |

**AC8, in the same change (§4's collision).** `animation-pair.test.ts` boots the real `states.ts` as its interpreter and
compares it frame by frame with the emitted `statesLib`. After (b) alone, **7 A5 parity rows went red**, not just the token
row: every colour transition now ended on its authored string (`#334455`), while the export still ended on `#334455ff`.
So the export got the same change (`nodegx-export/src/emit/statesLib.ts`, `onTweenRunning`'s end branch lands on
`def.values[v].byState[m.state]`), and two literals that pinned the old end string moved with it: the token row now
expects `var(--primary)`, and the per-value-delay row expects `#ffcc00`. Its NaN mid-frame `toMatch` stays, because (a) is
not built.

| reading | result | log |
|---|---|---|
| HEAD baseline: both source files reverse-applied, test file as edited | 56/57. The one red is the token row, whose expectation I changed, so the test file edit is the only difference at HEAD | `a5-head-baseline.log`, `A5_HEAD_EXIT=1` |
| Both halves of (b) | **57/57** | `ac8-green2.log`, `AC8_GREEN2_EXIT=0` |
| 🔴 **Reverted arm on the export half only** (`states.ts` keeps (b)) | **7 A5 parity rows red**. Restored, sha `35209b8c…` | `ac8-reverted.log`, `AC8_REVERTED_EXIT=1` |

**The whole `nodegx-export` suite, with both halves in.** 100 of 101 suites, 3,490 tests passed
(`export-full.log`, `EXPORT_FULL_EXIT=1`). The one red was HLS-001's byte-identity gate
(`hls001-corpus-identity.test.ts`). It named exactly **1** differing file, `glow-desk/src/lib/states.ts`, and `glow-desk`
is the only one of the 46 fixture projects with a `States` node.
- **Attributed by a reverted arm:** with both source hunks reverse-applied, the gate is 4/4 (`hls001-head.log`,
  `HLS001_HEAD_EXIT=0`). Restored by hash.
- **Answered by counting, then regenerating** (the gate's own rule): `HLS001_REGENERATE=1` moved **1** hash line in
  `goldens/hls001-corpus.sha256.json` (`a5b628f8…` → `795c6bf2…`, the same file), and the gate is 4/4 after
  (`HLS001_AFTER_REGEN_EXIT=0`). The regeneration is recorded in that test's header, beside HLS-004's and CMP-005's.

**🔴 A second invalid colour, found by measuring and not yet fixed.** A colour with a per-value transition delay
publishes its **parsed RGBA array** for the whole delay. The spec's delayed row (`transition-B-hex` = 300 ms after a
200 ms delay) reads `[51,68,85,255]` at 0, 96 and 192 ms, then `#644a31ff` at 320 ms and `#8a4f16` at 704 ms
(`delay-row2.log`). The cause is the `ms < c.delay` branch, which publishes `this.startValues[v]`, and for a colour
`onStart` has replaced that with an array. `statesLib.ts`'s `onTweenRunning` has the same line. No A5 row sees it, because
A5's delayed value is `opacity`, a number. ⚠️ The first version of that row set the parameter on an unregistered input,
the delay never took, and it read as "no array". It graded nothing until the input was registered.

**What (b) does not do yet.**
- **AC3, (a):** the frames between the endpoints are still `#0aNaNNaNNaN` for a token, so in a browser a token colour
  holds and then **jumps** at the end instead of gliding. R7's warning belongs to (a)'s reader, and "no document" still
  owes its sentence.
- **The delay array above:** it belongs to this task's person sentence and needs the same treatment in both files.
- **AC4, AC5, AC6 and AC7:** not started. `node-transitions.ts` is unmeasured.
- Owed: the `nodegx-export` `dist` is gitignored build output and was not rebuilt, and the viewer bundles were not
  rebuilt, so a running editor or deployed app does not have (b) yet.

### Session 4 (2026-09-14, HEAD `b3be201e0`) — the delayed colour fixed; AC7 RED, and (b) built in `node-transitions.ts`

Logs are in session `023bc12d…`'s scratchpad, `gam006/`.

**The delayed colour.** The spec's recording row became three graded rows: `hex` and `tint` each wait 200 ms, then
tween over 300 ms, beside a known-firing row that both still arrive after the delay. The fix, in `states.ts`
`onRunning` and `statesLib.ts` `onTweenRunning`: inside its delay a colour publishes the start value as a colour
string (the colour already on screen), falling back to the tween's hex only when the start was never a string.

| reading | result | log |
|---|---|---|
| Spec at HEAD source | **2 red of 11**, exactly the two delay rows. `hex` read `[51,68,85,255]` at 0, 96 and 192 ms. 🔴 `tint` read a **six-entry** array, `[10,NaN,NaN,NaN,237,NaN]`: `var(--muted)` is 12 characters, so `setRGBA` writes 5.5 "components" and grows the array | `delay-red.log`, `GAM006_DELAY_RED_EXIT=1` |
| With the fix | **11/11** | `delay-green.log`, `GAM006_DELAY_GREEN_EXIT=0` |
| 🔴 Reverted arm, the runtime hunk only | **exactly the 2 delay rows red** | `delay-reverted-runtime.log`, `GAM006_DELAY_REVERTED_EXIT=1` |
| New A5 parity row, a delayed **colour** (`transition-bright-tint`, 400 ms after 200 ms), both halves in | **58/58**. Both worlds hold `#334455` at 0, 100 and 150 ms, pass through 8-digit hex, land on `#ffcc00` | `a5-delay-green.log`, `A5_DELAY_GREEN_EXIT=0` |
| 🔴 Reverted arm, the export hunk only (`states.ts` keeps the fix) | **exactly that row red**, 57/58 | `a5-delay-reverted-export.log`, `A5_DELAY_REVERTED_EXIT=1` |
| The viewer's States specs, 3 suites counted by name | **42/42** | `states-regression3.log`, `STATES_REGRESSION3_EXIT=0` |
| `nodegx-export` full suite | **100/101**, 3,491 passed. The one red was HLS-001, naming exactly **1** file, `glow-desk/src/lib/states.ts` | `export-full3.log`, `EXPORT_FULL3_EXIT=1` |
| HLS-001 with only the export hunk reverse-applied | **4/4**, so the move is that hunk | `hls001-delay-reverted.log`, `HLS001_DELAY_REVERTED_EXIT=0` |
| `HLS001_REGENERATE=1`, then the gate again | **1** hash line moved (`795c6bf2…` → `f474fdaa…`, the same file); 4/4 after. Recorded in the test's header as the fifth regeneration | `hls001-regen2.log`, `hls001-after-regen2.log` |

⚠️ A first regression run named its three States specs as `tests/nda-001-…` and ran **1 suite for 4 patterns**. They
live under `tests/corpus/`. The 42/42 above is the re-run, with 3 `PASS` lines counted against 3 files.

**AC7: RED at HEAD.** [`gam-006-visual-state-token-colour.test.ts`](../../../packages/noodl-viewer-react/tests/gam-006-visual-state-token-colour.test.ts)
drives `transitionParameter` (`node-transitions.ts`, which `setVisualStates` calls for every changed parameter with a
curve) on a stub node carrying exactly what it reads, with the runtime's real `TimerScheduler` and the viewer's real
`Styles`.

| arm | at HEAD, 20 frames | with (b) |
|---|---|---|
| 🔴 `token`, `var(--muted)` → `var(--primary)` | **`#0aNaNNaNNaN` on every frame, the last included.** No (b) exists here: `onFinish` only deleted the timer | ends on `var(--primary)` |
| `hex`, `#334455` → `#8a4f16` | glides through real colours, ends `#8a4f16ff` | glides, ends `#8a4f16` |
| `named` (legacy style), `Grey` → `Primary` | resolves, glides, ends `#112233ff` | glides, ends `Primary` |
| `fromTransparent`, `transparent` → `#8a4f16` | borrows the hue, glides, ends `#8a4f16ff` | glides, ends `#8a4f16` |

- **The change:** `onFinish` queues the authored end value for a colour input. A stopped (retargeted) transition
  never reaches `onFinish`, so a retarget is unchanged. Transitions off already queued the authored value, so both now
  end in the same place, which also keeps a token live across a theme change instead of baking in a hex.
- **Graded:** 8/8 with (b) (`ac7-b-green2.log`, `GAM006_AC7_B2_EXIT=0`). 🔴 **Reverted arm:** exactly the 4 "ends on"
  rows red, and the 3 known-firing glide rows green (`ac7-reverted.log`, `GAM006_AC7_REVERTED_EXIT=1`). Restored by hash.
- ⚠️ The first run read `Tests: 0 total`: a TS2556 spread error in the spec itself, not a result.
- **Whole viewer suite on the final bytes:** **110/110 suites** (110 spec files on disk), 1,442 passed, 1 todo
  (`viewer-full.log`, `VIEWER_FULL_EXIT=0`).

**AC7's reach, counted.** A visual state only transitions where the node or its variant carries a
`defaultStateTransitions`/`stateTransitions` entry with a curve (`react-component-node.ts` `_getDefaultTransition`).
The editor writes none by default (`NodeGraphNode.getDefaultStateTransition` returns `undefined` unless one was set).
- `templates/`: **0** files. The editor's embedded `site-builder` and `landing-pages` `.content.json`: **0**.
- `library/prefabs`: **4** files carry one, and exactly **one** colour parameter transitions: `toggle-switch`'s Checkbox,
  `checked.backgroundColor = "Primary"`, a legacy style name. It resolves only in a project that carries that style.
- `nodegx-export` emits no visual-state transitions (no `stateTransitions` anywhere in its `src`), so no parity row is owed.

### Session 4, continued — (a) built: one shared colour reader, R7's warning, and what happens with no page

**The change.**
- **One reader, not three.** [`noodl-viewer-react/src/color-reader.ts`](../../../packages/noodl-viewer-react/src/color-reader.ts)
  (new) is Color Blend's P79 E2 parser widened to four channels: `var(--token)` read off the document (then the
  author's own fallback, depth bound 8), `#RGB`, `#RRGGBB[AA]`, `rgb()`/`rgba()` with alpha. It also holds
  `cssRejectsColor`, which asks `CSS.supports` and answers `undefined` where there is no page. `colorblend.ts` now reads
  through it (first three channels, as before), so a copy was removed rather than a third added.
- **`states.ts`** `onStart` reads both endpoints through it. A colour unreadable at either end is recorded and **holds
  the colour already on screen** for its whole span, then (b) lands it on the authored value.
- **`node-transitions.ts`** (AC7) does the same: an unreadable colour holds `startValue` (a start that was never set
  queues nothing), and `onFinish` lands it.
- **R7's warning.** `states/unreadable-color` and `visual-states/unreadable-color`, raised only when
  `cssRejectsColor` is `true`, once per colour per node, and guarded as Color Blend's is. `red` and a token the page does
  not define are valid CSS, so they hold and land silently.
- 🔒 **R7's owed sentence, "where there is no document".** With no page (server render, the export's parity suite, a
  headless spec), a `var(--token)` cannot be resolved and CSS cannot be asked. The colour holds the colour already on
  screen for the transition and lands on the authored value at the end, and **nothing is reported**. Server render also
  freezes the clock (`ssr.note`), so it shows the start state regardless.
- **The export, in step.** `statesLib` transcribes `readColor` and the hold. Its A5 token row changed from "tweens through
  a NaN hex" to "holds `#334455`, no frame contains NaN, lands on the token". The one departure left is documented in
  `statesLib.ts`'s header: the export's `resolveColor` probe also resolves a named colour, so in a browser `red` glides
  there and holds in the interpreter.
- Both parity shims now load `color-reader.ts` from source: `animation-pair`'s `runtimeRequire` (which throws on an
  unknown import) and `small-utilities`' `loadNode` (which returned `{}` for one, so a missed shim would have broken
  Color Blend rather than skipped it).

| reading | result | log (`gam006/`) |
|---|---|---|
| Viewer, 6 spec files named by path: both GAM-006 specs, `syl-e2-colorblend-tokens`, the 3 States corpus specs | **6 `PASS` lines, 84/84** | `a-viewer.log`, `A_VIEWER_EXIT=0` |
| Export `animation-pair` + `small-utilities` | **2 `PASS` lines, 78/78** | `a-export.log`, `A_EXPORT_EXIT=0` |
| 🔴 **Arm A:** `states.ts`'s `readColor` call replaced by the old blind hex parse | **exactly 3 red of 17**: the with-page glide, the no-page hold, R7's known-firing report | `a-reverted-states.log`, `A_REVERTED_STATES_EXIT=1` |
| 🔴 **Arm B:** the same in `node-transitions.ts` | **exactly 3 red of 13**, the same three rows | `a-reverted-visual.log`, `A_REVERTED_VISUAL_EXIT=1` |
| 🔴 **Arm C:** the same in `statesLib` | **exactly 1 red of 58**, the A5 token row (the interpreter holds, the export tweens NaN) | `a-reverted-export.log`, `A_REVERTED_EXPORT_EXIT=1` |

All three restored by hash (`a.sha`). R7's rows put a known-firing report (`notacolour` with `CSS` rejecting it: 1)
beside the three that must stay silent (`red`, `var(--nope)`, and `notacolour` with no `CSS` at all: 0 each).

**Regression on the final bytes, (a) included.**

| gate | result | log (`gam006/`) |
|---|---|---|
| Whole viewer suite | **110/110 suites** (110 `PASS` lines, 110 spec files), **1,453** passed, 1 todo. That is 11 more than the pre-(a) run, which is exactly the 11 rows (a) added | `a-viewer-full.log`, `A_VIEWER_FULL_EXIT=0` |
| `tsc --noEmit -p packages/noodl-viewer-react/tsconfig.json` | **0** errors | `a-tsc.log`, `A_TSC_EXIT=0` |
| Whole `nodegx-export` suite | **100/101**, 3,491 passed. The one red was HLS-001, naming exactly **1** file, `glow-desk/src/lib/states.ts` | `a-export-full.log`, `A_EXPORT_FULL_EXIT=1` |
| HLS-001 with the pre-(a) `statesLib` restored | **4/4**, so (a) is the move | `hls001-a-reverted.log`, `HLS001_A_REVERTED_EXIT=0` |
| `HLS001_REGENERATE=1`, then the gate | **1** line moved (`f474fdaa…` → `8126c053…`); 4/4 after. Net over HEAD's golden: one line, `795c6bf2…` → `8126c053…` | `hls001-a-regen.log`, `hls001-a-after.log` |
| Whole `nodegx-export` suite again, on the final bytes (golden regenerated, headers edited) | **101/101 suites** (101 `PASS` lines), 3,492 passed, 1 skipped | `export-final.log`, `EXPORT_FINAL_EXIT=0` |
| Editor `test:ci` (Electron), `test:main` | **not run** | |

⚠️ **What these arms cannot say.** The "page" is a stub: `document`, a `getComputedStyle` that knows two tokens, and an
optional `CSS.supports`. It proves the node reads what a page would hand it, not that a real page hands it that. **AC3
still needs a real browser** with the document's own tokens, and so do AC5 and AC6.

### Session 4 — AC4, the census (read-only, before any browser drive)

A script (`gam006/census.js`) walks every JSON file under a root, finds each `States` node, and lists the ones with a
`type-<v>: color` value whose `useTransitions` is not `false`, with each value's notation. Every root prints how many
`States` nodes it saw, so a zero is a reading and not a script that read nothing.

| root | files | States seen | colour + transitions on |
|---|---|---|---|
| `templates/`, `library/prefabs`, the editor's embedded `*.content.json` | 551 | 76 | **7** (below) |
| P86 `corpus/` | **0** | 0 | ⚠️ **not a reading**: the corpus is markdown, csv and two zips, no project JSON |
| P86 `signup_template.zip`'s `project.json`, extracted | 1 | 6 | **0** |
| `docs/node-catalog/examples` (where COM-003 landed the 12 community graphs) + `packages/noodl-mcp/examples` | 104 | 14 | **1** |

| hit | values (A → B) | before GAM-006 | after (a) + (b), in a page |
|---|---|---|---|
| `landing-pages` `Site/FilterPill` "Off / on" (template **and** the embedded `landing-pages.content.json`), pinned `true` | `bg` `transparent` → `var(--primary)`; `fg` and `edge` token → token | 🔴 every frame invalid for `fg`/`edge`, never arrived | glides, lands on the token |
| `pixel-game` `Pages/Play` "What just happened, in words" (`plBannerStates`), default | `tone`: tokens | 🔴 never arrived | glides, lands |
| `pixel-game` `Pages/Play` "What the board is doing" (`plBoardStates`), default | `edge`: tokens | 🔴 never arrived | glides, lands |
| `app-shell` `Nav Item` "Active highlight", default | `color`: `var(--primary)` / `var(--muted-foreground)` | 🔴 never arrived | glides, lands |
| `navigation-menu` `Item`, default | `color`: `Primary` / `Grey - 900`, **legacy style names**, which the prefab's own project defines | resolved to hex first, so it glided and arrived | unchanged. In a project without those styles: holds, lands, and R7 reports it (CSS rejects `Grey - 900`) |
| `toggle-switch` `Toggle Switch` "States", default, with `transitiondef-*` | `bg color`, `border color`: `Primary` / `Grey - 200` / `Grey - 700`, style names the prefab defines | glided and arrived | unchanged, as above |
| community `Strobe - Blinking button` "Blink State (Color Change)", pinned `true` | `Color`: hex | glided and arrived | unchanged, apart from ending on the authored hex rather than its 8-digit form |

**What the census corrects.** §2 said `toggle-switch` "carries no colour". Its States node carries two colour values
(`bg color`, `border color`) as legacy style names. §2's list of known-firing hits was otherwise right, and the census
adds `navigation-menu` `Item`, `toggle-switch` and the community Strobe, none of which were broken.

**Still not done.** AC3 (browser), AC5, AC6, and the viewer and export bundle rebuilds. The "after" column above is
graded headlessly, not driven.

### Session 5 (2026-09-14, HEAD `b3be201e0`, session 4's source bytes) — AC3, AC5 and AC6 in a real browser

Logs are in session `3599104b…`'s scratchpad, `gam006/`. Session 4's four viewer source files were checked against
their hashes before every build (`build-a.src.sha`), so these readings are about the bytes session 4 graded.

**The instrument.** [`scripts/devtools/drive-gam006-colour.js`](../../../scripts/devtools/drive-gam006-colour.js) (new)
serves a deploy folder in headless Chrome and takes two readings at once:
- **publishes:** every value a States node publishes for a watched colour, hooked on the prototype that owns
  `flagOutputDirty`, each judged by `CSS.supports('color', v)`. This sees the frames a browser throws away.
- **screen:** the element's computed colour on every animation frame. A glide is three or more distinct colours, a
  jump is two, and "never arrives" is one.

**Three arms per template, differing in one file.** `deploy-from-disk` built one folder per template over a scratch
copy. Two copies of each folder then had only `noodl.deploy.js` replaced:

| arm | runtime | sha |
|---|---|---|
| old | `src/external/deploy/noodl.deploy.js` as it stood (built 2026-09-12 10:45, before (b) `82a7d3775`, so pre-GAM-006) | `2e8b6999…` |
| new | session 4's source, `webpack.deploy.prod.js` into scratch | `3f3c8d8f…` |
| sab | arm A: `states.ts`'s `readColor` call replaced by the old blind hex parse, built into scratch, `states.ts` restored by hash | `5c48c19f…` |

**AC3 and AC5, TPL-003 `Site/FilterPill`.** The `landing-pages` copy is identical to the template. The drive clicks
*The second kind of work* on `/Pages/Freelancer` with a real CDP click (reachable by `elementFromPoint`). Two pills
move, one on and one off, three colours each.

| arm | publishes, 6 series | screen: pill background / border, 74 frames |
|---|---|---|
| old | **119 of 120 frames invalid** (`#0aNaNNaNNaN`, `#00NaNNaNNaN`) | **1 / 1 colour**: the selected look never arrives |
| new | **0 of 120 invalid**, 19–20 distinct colours per series, each ending on its token | **27 / 23**, `rgba(0, 0, 0, 0)` → `rgb(143, 52, 22)` |
| sab | **114 of 120 invalid**; only each series' last frame (the authored token) is valid | 10 / 9 ⚠️ |

⚠️ `.pill` has its own CSS transition (150 ms on background, border and colour), so it animates the sabotage arm's
end jump as well. On this template the screen cannot tell a States glide from a CSS one. The publish reading can.

**AC3 and AC5, TPL-006 `Story/Passage`.** The `story-engine` copy differs from the template in one byte: `psLook`
`useTransitions` is `true`. The drive moves the reader to `gallery`, then to `ending-light`.

| arm | publishes, `rule` + `tone` | eyebrow text (known-firing) | eyebrow colour, 92 frames | passage border |
|---|---|---|---|---|
| old | **40 of 40 invalid** | *YOU ARE HERE* → *AN ENDING* | **1 colour**, `rgb(99, 88, 72)`: never arrives | 1 |
| new | **0 of 38 invalid**, 19 and 18 distinct | the same | **19 distinct**, → `rgb(138, 79, 22)`, which is `--primary` `#8a4f16` | 18 |
| sab | **38 of 40 invalid** | the same | **2**: holds, then jumps | 2 |

The story's text has no CSS transition, so here the screen separates all three arms. The new arm's in-between colours
(`rgb(102, 87, 67)`, `rgb(106, 86, 63)`, …) differ from both ends. That is AC3's midpoint clause, on the rendered page.

**AC6, TPL-005's two unpinned nodes.** The `pixel-game` copy is identical to the template. The drive fires the wired
`to-dead` (board) and `to-died` (banner) signals on the page's own States nodes (1 node each, `hasInput` checked).

| arm | publishes, `edge` + `tone` | board border | headline *They got you.* (mounts in every arm) |
|---|---|---|---|
| old | **38 of 38 invalid** | **1 colour** | stays `rgb(232, 236, 255)`, the foreground |
| new | **0 of 38 invalid**, 19 distinct each | **19 distinct**, → `rgb(255, 107, 122)`, `--destructive` | **20 distinct**, → `--destructive` |
| sab | **36 of 38 invalid** | 2: jumps | jumps |

Console: `landing-pages` shows 8 errors in every arm, all `image/load-failed` for `starter-imagery` files the deploy
does not carry, so none is GAM-006's. The story and the pixel game show 0.

**How each drive reaches its state, and why it is not a click.**
- 🔴 **The story is not walked by clicks.** `deploy-from-disk` drops `/Pages/Read`'s three choice wires (D52:
  `itemOutput-goto`, `itemOutput-gives`, `itemOutputSignal-picked`), so no choice moves a passage. The first run
  clicked. It read identical old and new arms, and the known-firing eyebrow text never changed, so it graded nothing.
  The drive now writes `Noodl.Variables.storyAt`, which is what a choice's `Set Variable` writes.
- 🔴 **The pixel game is not played.** A hit needs an enemy to reach the player. The first run wrote `currentState`,
  which neither node registers (no wire, no parameter), and read nothing in all three arms, the headline included.
  The `to-*` signals are wired, so they exist. A written `currentState` and a `to-*` signal both reach
  `scheduleGoToState`.
- ⚠️ The first run's six `EXIT=0` lines were `tr`'s status, not the drives'. `$?` came after a `$(…)` in the same
  `echo`. Three of those drives had thrown and written no JSON. Every exit above was captured as `rc=$?` straight
  after its drive.

**Found on the way, in the devtool.**
- 🔴 **`deploy-from-disk` could not deploy any project with a numbered-inputs node.** Its `nodeAdded` stub had no
  `component.getConnectionsTo`, which `nodedefinition.ts` `collectPorts` has called since the initial commit.
  `landing-pages` threw `TypeError: node.component.getConnectionsTo is not a function` (`DEPLOY_LANDING_EXIT=1`),
  from a bundle built fresh off the unchanged entry, so staleness was not the cause. With the stub given the
  component's real wires it deploys (exit 0, 202 of 213 wires). The fix is in `deploy-from-disk.entry.ts`. It is a
  devtool, and it has no spec.
- ⚠️ Run `deploy-from-disk` from `packages/noodl-editor`. `platform.getAppPath()` is the working directory whenever it
  holds a `package.json`, so from the repo root it looks for `<root>/src/external` and fails `ENOENT`.
- **D52's drops, counted per template in this devtool:** Rocket School 85 of 1,634 wires (21 of 21 in
  `/Logic/Play sounds`, 2 in `/Game/Choice row`), `landing-pages` 11, `pixel-game` 4, `story-engine` 3. GAM-024 owns
  that census.

**The bundles, rebuilt in place (18:29).** With no peer suite running, `webpack.prod.js` rebuilt `src/external`'s
viewer, deploy and ssr bundles. The previous three are kept in `gam006/external-before/`. The file lists are
identical. All three carry `states/unreadable-color` and `visual-states/unreadable-color`, and
`deploy/noodl.deploy.js` is **byte-identical** to the drives' new arm. `nodegx-export`'s `dist` was rebuilt too (exit
0), and its `index.mjs`/`index.cjs` carry `readColor`. Both are gitignored, so this reaches this machine's editor
preview and deploys only. An editor built elsewhere gets it from source.

**AC6, Rocket School `Game/Choice` `chStates`: NOT driven.** A copy with `chStates` `useTransitions: true` (the one
byte changed) deployed in all three arms. No arm reached a choice:
- The drive installs on the start page, and there is no Choice there. The first run failed on that before any action.
- *New player* is a reachable `BUTTON`. Clicking it changed nothing on the page, in the old arm, with no console
  error (`rocket-probe.log`). The click path is `pfNew.onClick` → Set Variable `profileFormOpen` fed by `pfTrue`, an
  Expression `true` with no inputs. That fits R3's cause for GAM-001/GAM-003, an Expression that never ran reading
  `null`. **Not measured; a candidate only.**
- Writing `Noodl.Variables.profileFormOpen = true` did not bring up a *Thumbs* choice either. Not attributed. This
  build also drops 85 of Rocket School's wires (above).

**AC6, the decision.**
- **TPL-006's pin and its gate go.** Its own `Story/Passage`, with transitions on, is driven above on the fixed
  runtime: the eyebrow colour and the rule glide and land on the token. The gate's rationale is also wrong as written.
  It says a States node "never publishes a colour or a number", and AC1 measured numbers working. Done in its own
  commit, after this one.
- **Rocket School's 22 pins and `tpl007Template.test.ts`'s D49 gate stay for now.** That template was not driven here,
  and both are a peer session's uncommitted P87 work. Its `chStates` carries the same three token colours as
  `FilterPill` (`bg`, `fg`, `edge`), which is driven above, so removing the pins is **recommended** once a drive
  reaches a choice. That is P87's call, in its own tree.
- **TPL-005's two nodes carried no pin** and now read correct in a browser. Nothing to remove.
### Session 23, later — R28 ruled (2026-09-17, asked in plain words: the nine workarounds)

**Richard: *"I dunno."*** Decided by the builder, overturnable: **the two pins and their gates stay.** They are cheap, they name a
real defect, and a pin that costs nothing is worth more than the tidiness of removing it — this is the "belt and braces" the AC
offered. AC6's drive half (flip `chStates` to `true` in a copy, drive the selected look; read TPL-005's two unpinned nodes) is still
owed: the ruling settles the pins, not the reading.