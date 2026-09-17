# GAM-015 — A kit node reads a wired size as the size it was sent

**Status: 🟢 built (session 20, 2026-09-17), uncommitted.** Door (a) as ruled: `readPx` in the kit scaffold, the string shape documented in the types and on the docs page, and the drift fixed with a gate. AC1 RED through the real bridge and in Chromium, AC2 with 3 reverted arms, AC3's deployed half, AC4, AC6's gate. **Left:** AC3's editor-canvas half, AC6's game-kit adoption and re-drive (Rocket School, the peer's tree). **Source:** [P78 D65](../phase-78-the-templates/DEFECTS-THE-TEMPLATES-FOUND.md) · found by P87 [RKT-011](../phase-87-the-first-play-test/RKT-011-THE-HANGAR.md), 2026-09-13 · **Side:** product (React bridge / node-kit types and docs)

A kit's React node draws at its default size whenever the size is wired: Rocket School's header face asked for 40 px
and drew 64. Nothing in the node-kit types or docs says what a px port hands the component.

## 1. The person sentence

**A kit author who reads a size port the way the docs show gets the number that was wired into it, not the default.**

## 2. What was measured

Read at HEAD `eb12ebe99`, 2026-09-14. Nothing was run for this file.

| reading | where |
|---|---|
| The header face (size 40) and the hangar preview (96) both drew at 64. On the server, from the built kit: `40` and `"40"` drew 40, while `{value: 40, unit: 'px'}` and `{value: 96}` drew 64. **As recorded 2026-09-13, not re-read.** | register D65; `drive-rkt011-hangar.js` build 2 |
| Every px port the game kit reads is `{ name: 'number', units: ['px'], defaultUnit: 'px' }`, **and each one declares a default**: Avatar `size` 64, Race Track `rocketSize` 44, Keyboard Map `keySize` 34, Answer Pad `keySize` 48 and `fieldWidth` 220. Re-read at HEAD. | `library/modules/game-kit/src/kit.js:420-425`, `:960-966`, `:1206-1211`, `:1625-1626` |
| The kit's fix: every read goes through `padPx`, which accepts a number, `"48px"` or `{value}`. Re-read at HEAD. | `kit.js:1324-1327`; callers `:368`, `:1063`, `:1482`, `:1517` |
| 🔴 **What the component actually receives is a string.** For an `inputProps` port with units, the bridge writes `props[name] = value.value + value.unit`, so a wired 40 reaches the component as **`"40px"`**, not as `{value, unit}`. The object is what the *setter* receives. `Number("40px")` is `NaN`, so the 64 observed is still explained. This line dates from the initial commit (`b9c60b07d`, blame). Re-read at HEAD. | `noodl-viewer-react/src/react-component-node.ts:655-663` |
| ⚠️ **The kit gate's arms feed `{value: 40}` straight into props**, a shape the bridge never hands a component. Its `'72px'` arm is the one that matches the real path. Re-read at HEAD. | register D65 ("renders the Avatar at `{value: 40}`, `{value: 96}` and `'72px'`") |
| A bare number is merged into the port's current unit whenever the current value carries one. A static port is seeded `{unit, value}` from its default. Re-read at HEAD. | `noodl-runtime/src/node.ts:404-421`; `noodl-runtime/src/nodedefinition.ts:173-189` |
| 🔴 **So the register's "a parameter arrives as a plain number, latent in Rocket School" does not follow from source.** A typed or generated `keySize: 34` on a port with a default merges to `{value: 34, unit: 'px'}` and reaches the component as `"34px"`, which `Number()` cannot read either. Not run: AC1's parameter arm settles it. | as above |
| **What FLD-004 changed for a kit.** Its piece (c), `registerInput`'s `type:` → `unit:`, is reached **only by dynamic registration** (`node.ts:124-156`), and a kit's declared ports are static, so it changed nothing here. Its piece (b) changed the *non-size* branch: `null`, `{value: "tall"}` and similar now keep the previous prop and raise `dimensions/not-a-dimension`, where before the prop was **deleted** and the kit fell back to its own default. **A numeric wire reached the kit as `"40px"` before FLD-004 and still does.** Re-read at HEAD. | `react-component-node.ts:610-615` (`dimensionIsUsable`), `:664-689`; FLD-004 commits `904957606`, `46fd16065`; [FLD-004-WHAT-WAS-BUILT](../phase-84-the-defects-the-field-report-found/FLD-004-WHAT-WAS-BUILT.md) §3(i)-(ii) |
| An `inputCss` units port goes to CSS as a string and never reaches props, so only `inputProps` px ports are exposed to this defect. Re-read at HEAD. | `react-component-node.ts:2014-2044` |
| **The docs never say the shape.** `node-kit.d.ts` says of a default: *"Unit types wrap it as `{ value, unit }`"*. `ReactInputPropDefinition` says nothing about units. `custom-nodes.md` shows a units port and adds only that it is *"a different path"*. Re-read at HEAD. | `example-node-kit/types/node-kit.d.ts:203`, `:586-600`; `docs-site/docs/custom-nodes.md:185-200` |
| ⚠️ **The node-kit types have drifted.** `packages/nodegx-node-kit-types/src/index.d.ts` differs from both library copies, and game-kit's copy carries a DEF-046 block that example-node-kit's lacks. Re-read at HEAD. | `diff` of the three; `nodegx-kit-scaffold/src/index.js:51` (the staleness check) |

## 3. Where it bites a person

- Any kit or custom React node that reads a px `inputProps` port with `Number()` or unary `+`. (`parseInt` and `parseFloat`
  happen to work on `"40px"`.)
- It fails for a wired value and, by the reading above, for a typed one too. A hand-set example with no size parameter
  shows only the default, so the author never sees it fail.
- The shipped charts kit declares `Chart Height` and `Chart Width` as ordinary `inputProps`
  ([FLD-015](../phase-84-the-defects-the-field-report-found/FLD-015-WHAT-WAS-BUILT.md) §2). Whether it reads them safely
  is AC5's job.

## 4. Related work and collisions

- 🔴 **P84 [FLD-004](../phase-84-the-defects-the-field-report-found/FLD-004-A-WIRE-INTO-A-DIMENSION-PORT-ARRIVES.md) ✅**
  owns the same setter. This task must keep its abstain branch, its runtime error and its reverted arms green.
- **[GAM-003](README.md) (D62)** trips the same setter with a `null` seed. Land the two separately, or neither change can
  be attributed.
- **P84 register P40** (UNOWNED): a kit's `inputCss` is invisible to the React export. That pushes kit authors towards
  `inputProps` px ports, which is this path. `nodegx-charts` was designed around it.
- No task owns the shape of a units prop. Grep run:
  `grep -rnai --include='*.md' "padPx\|Number(props\|px reader\|units port.\{0,40\}kit\|kit.\{0,40\}units port" dev-docs/tasks`
  → only D65 and RKT-011.

## 5. Design

- **(a) Types and docs only.** Document that a units `inputProps` port arrives as a CSS string such as `"40px"`. Ship one
  reader in the node-kit types package and the scaffold, and fix the drift in the same change. This moves nothing that
  runs, but every existing kit has to adopt it.
- **(b) The bridge hands a single-unit port's magnitude as a number.** This is the register's second door. It changes the
  prop's shape for every React node with a single-unit `inputProps` port, **built-ins included**. A component that
  passes the prop straight into `style` would get a bare number, and React turns a bare number into px for `width` but
  not for `lineHeight` or `flex`.
- **(c) Opt-in per port**, e.g. `propValue: 'number'` on `ReactInputPropDefinition`. Nothing moves unless an author asks,
  but the author still has to know to ask.
- 🔒 **Ruling for Richard:** which door? (b) fixes kits nobody has told, and risks every existing React node.
  (a) and (c) risk nothing and fix only what gets rewritten.
- **Do not** undo FLD-004's abstain branch or its `dimensions/not-a-dimension` report.
- **Do not** promote `padPx` into the product untyped. A reader that accepts three shapes hides which shape is real.

> 🔒 **R15** **Ruled (2026-09-17, s19, asked in plain words): door (a), types, docs and a reader helper.** Nothing that runs changes; the bridge still hands `"40px"`, and existing kits adopt the reader.

## 6. Acceptance criteria

| AC | Clause |
|---|---|
| AC1 | **Reproduced RED at HEAD.** A small project with one minimal kit (not game-kit, not beside the library). The kit has a React node with a `size` px `inputProps` port, default 64, read with `Number()`, and it stamps `typeof props.size` and `props.size` into a data attribute. Three instances are deployed and driven: (i) Size wired from a Number node of 40; (ii) Size typed as 40; (iii) nothing set. Record each rendered width and the stamped prop in §8. Arm (iii) at 64 is the known-firing control. |
| AC2 | The ruled fix. **Reverted arm:** restore the old behaviour or doc, and AC1's arms (i) and (ii) go back to 64 by name. |
| AC3 | **Person sentence, in the editor canvas and on a deployed page:** a kit written exactly as the updated docs show draws at 40 when 40 is wired, and at 40 when 40 is typed. |
| AC4 | FLD-004 still holds: a String wired into the same port keeps the previous size **and** raises `dimensions/not-a-dimension`, in the same run where AC3's numeric arm succeeds. |
| AC5 | **Blast radius**, if the bridge changes: list every `inputProps` port with units across `noodl-viewer-react/src/nodes` and every `library/modules/*` index. For each, record how its component reads the prop, and the rendered value before and after. |
| AC6 | **Workaround:** say whether game-kit's `padPx` stays, goes, or becomes the shipped reader. Re-point the kit gate's `{value: 40}` arms at the shape the bridge really delivers, then re-drive `drive-rkt011-hangar.js`: the header face is 40 and the preview is 96. |

## 7. Traps

- 🔴 **A spec that renders the component with hand-made props grades the component, not the bridge.** That is how the kit
  gate came to test `{value: 40}`. Go through `createNodeFromReactComponent` and a real `setInputValue`.
- ⚠️ A units port with **no** default is not seeded with a unit (`nodedefinition.ts:179`). A bare number then lands in
  FLD-004's abstain branch and raises instead of merging. Include one such port in AC1, or the fixture covers only half the
  ports.
- ⚠️ Keep this change out of GAM-003's commit.

## 8. Record

### Session 20 (2026-09-17, over `7bb79dc53`) — built, door (a)

**AC1, RED at HEAD, through the caller.** `noodl-viewer-react/tests/gam-015-a-wired-size-reaches-a-kit-node.test.ts`: a kit definition
handed to the real `createNodeFromReactComponent`, placed in a `createCorpusGraph` runtime graph, and rendered with real React from
the props the bridge wrote. Then in Chromium on a deployed page, with `scripts/devtools/drive-gam015-kit-size.js`: a one-file kit written
through `update_component` into a copy of `demo-app`, deployed with `dist/nodegx-deploy.cjs --allow-development-engine`.

| arm | prop the component got (jest = browser) | `Number()` read draws | `readPx` read draws |
|---|---|---|---|
| (i) Size wired from an Expression / Number node of 40 | `"40px"` (string) | **64** | 40 |
| (ii) Size typed as 40 | `"40px"` (string) | **64** | 40 |
| (iii) nothing set (known-firing) | `"64px"` (string) | 64 | 64 |
| String `"tall"` wired (AC4) | `"64px"` kept, `dimensions/not-a-dimension` raised | — | 64 |
| no-default port, bare 40 wired (§7) | `undefined`, `dimensions/not-a-dimension` raised | — | — |

- 🔴 **The register's "a parameter arrives as a plain number" is false, measured.** A typed 40 is merged into the port's unit and arrives
  as `"40px"`, exactly like a wire. §2's source reading was right.
- Browser: `DRIVE_EXIT=0`, marker true, 0 console errors; the six faces read as the table. The deploy published both kit wires as
  `unchecked` (GAM-023's report), `DEPLOY_EXIT=0`.

**Built (R15 = a).**
- `@nodegx/kit-scaffold`: `readPx(value)` reads `"<number>px"` and nothing else (token, `%`, bare number, `{value, unit}`, `"40"`,
  `"tallpx"`, `"px"`, unset all read `undefined`). One source string, `READ_PX_SOURCE`: exported, and emitted into every scaffolded
  `index.js` with a comment saying what a size prop is. 🔴 First written as `readPx.toString()`: `webpack-caller.test.js` went red
  because a bundler rewrites a function's whitespace. Declared in the scaffold's `index.d.ts`.
- `@nodegx/node-kit-types`: `ReactInputPropDefinition` says a size port hands the component a CSS string, shows the `readPx` read,
  and names `Number("40px")`; `InputPortDefinition.default` says the `{value, unit}` wrap is the setter's.
- `docs-site/docs/custom-nodes.md`: "A size port hands your component a string". `docsamples.test.js` fragment budget 7 → 8, reasoned.
- **Drift:** all **7** checked-in kit copies were stale (not 3). Refreshed the 4 `library/modules` copies and pixel-game's; a new
  `types-copy.test.js` block grades those 5 as current (known-firing count 5). Rocket School's 2 copies left: the peer's tree.

**AC2, reverted arms** (count-asserted exact replace, sha-restored; `scratchpad/gam015/mutants.py`):

| mutant | result |
|---|---|
| M1 the reader reads with `Number()` | 6 red: AC3 "wired 40 draws 40…" by name, 4 `"…px" reads` rows, `"40"` reads undefined |
| M2 the scaffold stops emitting `readPx` | suite fails to run: "the scaffolded index.js defines no readPx" |
| M3 the bridge hands the bare magnitude | 3 red: AC1 prop shape, AC1 `Number()` draws 64, AC3 (the spec reads the bridge, not a fixture) |
| types copy gate, game-kit's copy put back to HEAD | 1 red, exactly that copy |

**AC5:** the bridge did not change, so no blast radius is owed. Census anyway, every `library/modules` kit with a units `inputProps` port
(loaded, not grepped): example-node-kit 3 (all straight into `style`), nodegx-charts 9 (into `style`; Sparkline's `lineWidth` strips
`px` before `* 2.5`), game-kit 6 (`padPx`/`parseFloat`, both read `"40px"`; `ringWidth` concatenated). **No shipped kit reads a size
with `Number()`.** simple-tooltips did not load headless (`document.querySelector`); its minified ports carry their own `set`. Not graded.

**AC6.** The kit gate (`noodl-mcp/tests/tpl007GameKit.test.ts`, D65 block) now feeds `"40px"`, `"96px"`, `"72px"`, and falls back on
unset, `"0px"`, a token and `"tallpx"`; its sabotage arm feeds `"40px"`. 44/44. **`padPx` goes, in favour of `readPx`, but not in this
change:** `tpl007Template.test.ts` requires Rocket School's `noodl_modules/game-kit/index.js` to be byte-identical to the library build,
so changing the kit reddens the peer's template. The kit, its rebuild and `drive-rkt011-hangar.js` are Rocket School's owner's.

**Gates:** GAM-015 spec 17/17; `nodegx-kit-scaffold` 70/70; `nodegx-node-kit-types` 82/82; viewer `cn-006-*` + `fld-004-*` 49/49;
`noodl-mcp` `tpl007GameKit` + `kitTools` 54/54; editor `tests-unit/cn-006*` 66/66; viewer `tsc --noEmit` 0 (tests excluded).
**Not run:** the whole viewer suite, `test:main`, editor `test:ci` (no editor or viewer source changed). The editor's bundled scaffold
(`src/editor/index.bundle.js`) and the installed app do not carry `readPx` until rebuilt.

**Not driven:** AC3's editor-canvas half. The canvas renders through the same bridge the spec grades.
