# CHR-004 — The gates measure the scale, not the fills

Twenty-eight tests open stylesheets as text and assert which token a fill uses, which class a row
wears, and what contrast that produces. They were written to stop a regression and they do — but
they also stop a redesign, because they encode one session's choice of fill as a fact. This task
keeps every ruling they protect and changes what they pin.

## 1. The person sentence

**A session that moves a hover fill one token step, keeping the contrast Richard ruled, gets a
green suite — and a session that ships a 9px label or a 2.5:1 control gets a red one that names
the element.**

## 2. What the code says (audit, re-read at HEAD)

- **28 files under `tests-unit/` read `.css`/`.scss` from disk** and parse the text. The ones on
  these surfaces:
  - `border-sweep/launcher-control-borders.test.ts`, `launcher-button-control-borders.test.ts`,
    `folder-tree-control-borders.test.ts`, `learner-path-control-borders.test.ts`,
    `fb-005/template-shelf-control-borders.test.ts`, `style-section-control-borders.test.ts`
    (614+ lines; pins `.sidebar-panel` **by name** in `style.css:302,500,611` and asserts three
    intermediate elements paint nothing).
  - `nat-001/palette-contrast.spec.ts` (the P72 contrast ruling — **keep its numbers**).
  - `nat-003/palette-copies.spec.ts` (hex drift between `colors.css` and JS mirrors — keep).
  - `fb-017/groupHeading.test.tsx` asserts `property-group-chevron`, `-name`, `-badge`,
    `property-filter-empty-hint` by class; `property-editor/portHint.test.ts:123,128` expects
    `className === 'property-row'`; `fb-018/bindingChipRows.test.tsx:121,129` asserts
    `sidebar-panel-dark-input`; `leg-005/nodeCommentRow.test.ts:47,166` regexes
    `.property-comment-input::placeholder` out of `propertyeditor.css`.
- `LauncherButton.module.scss:54-58`: *"`launcher-button-control-borders.test.ts` reddens if the
  hover fill is ever moved one step further to `bg-4`."* That is a test pinning a fill, not a
  ruling about contrast.
- What the P72 ruling actually says (`NAT-001`): every control edge ≥ 3:1 against its ground, every
  text ≥ 4.5:1. That is a property of the **rendered** element, which is not what most of these
  tests measure — they compute it from token names they expect to find in a file.

## 3. Scope

1. **A rendered-contrast gate.** A `.look.ts`-style spec (outside `testMatch`, run by `test:main`)
   that boots the surfaces headlessly (the P23 corpus mechanism, or the packaged-app recipe),
   walks every `button, input, select, [role=tab], .Chip` and every text node, reads
   `getComputedStyle`, resolves the effective background by walking up until a non-transparent
   fill, and asserts NAT-001's numbers. **This replaces the six `*-control-borders` tests** on the
   launcher and the style section. It does not know or care which token delivered the number.
2. **A scale gate** in the same spec: every computed `font-size` on the surface is one of the R1
   values; every `border-radius` is one of CHR-003's. Names the element on failure.
3. **Class-name assertions become behaviour or `data-*`.** `groupHeading`, `portHint`,
   `bindingChipRows` and `nodeCommentRow` keep every behavioural assertion (the badge count, the
   hint text, the placeholder text) and lose the class-name ones; where a hook is needed it is a
   `data-test` attribute the component owns. `:global(.sidebar-property-editor)` in
   `PropertyPanelInput.module.scss:76` goes, with its geometry moved into the component (CHR-009
   sets the value; this task removes the cross-package hook).
4. **Keep:** `palette-contrast.spec.ts`, `palette-copies.spec.ts`, the hex ratchet, `tokens:css`,
   `icons:css`. They gate the palette, which is not what this phase changes.
5. A note at the top of `tests-unit/border-sweep/README` (or the directory's first file) saying
   what moved where and why, so the next session that finds a `*-control-borders` file knows the
   family is closed.

## 4. Acceptance criteria

1. **(person)** Change `LauncherButton`'s hover fill from `bg-3` to `bg-4` in a scratch branch and
   run `test:main`: **green**, and the rendered-contrast gate reports the hover edge still ≥ 3:1.
   Then change it to `bg-2` (which the audit's numbers say fails 3:1): **red, naming the button.**
   Both runs recorded in the task file with the numbers.
2. **Reverted arm for the scale gate:** set one launcher label to `font-size: 9px` — red, naming
   the element and the value. Set a chip to `border-radius: 7px` — red.
3. `grep -rl "readFileSync.*\.s\?css" tests-unit/` lists **≤ 4 files** (the palette ones), down from
   28, and each survivor has a one-line reason at its top.
4. Every behavioural assertion in the four class-name tests still exists and passes — count the
   `expect(` lines before and after, in the task file.
5. `test:ci` at the floor; `test:main` includes the new gate and it runs in CI (check the workflow
   file, not the script — [[a-run-list-is-not-a-log]]).

## 5. Traps

- 🔴 **The rendered gate needs a renderer.** `tests-unit` is plain jsdom; the `Icon` import alone
  makes a spec there fail to run (that is why `PropertyGroups.tsx` draws a text `▾`). The gate
  lives beside the P23 corpus runner or the `render-report` harness, not in `tests-unit`. Budget
  the boot cost and run it in `test:main`, which is the unwatched CI gate that already boots things.
- 🔴 **A computed contrast on a control the user cannot reach is a number about nothing.** Filter
  to elements with a non-zero rect and `elementFromPoint` hitting themselves, or the gate passes
  on the invisible copy `BaseDialog` renders first ([[basedialog-renders-every-dialog-twice]]).
- 🔴 **Do not relax a number to turn a red green.** If the gate reddens on an existing control,
  that control was below the ruling all along; fix it or file it with an owner.
- ⚠️ `style-section-control-borders.test.ts` asserts three intermediate elements paint **no** fill
  so the ground is the one it measured. The rendered gate makes that assertion unnecessary — it
  walks to whatever paints — but read the test's header first; it records a real defect it caught.

---

## 6. Session 30 (2026-09-17) — the gate is built, driven, and its person sentence is proved

**Built, committed, and taken against a live build.** Not yet wired into CI, and no pinned test has
been retired yet (AC3/AC4 untouched, deliberately — see §6.4).

### 6.1 🔴 §3.1 and §5 were wrong about where a rendered gate can live

Both say to run it in `test:main`. Measured at HEAD:

- **`test:main` is `jest` with `testEnvironment: 'node'`** (`packages/noodl-editor/jest.config.js`)
  — no DOM at all, not "jsdom" as §5 says. It cannot render anything, and it does not "already boot
  things" in the sense meant.
- **There is no headless browser in the repo.** No puppeteer, no playwright, nothing that could be
  added without a new CI dependency. `jsdom` is present only transitively, and its `getComputedStyle`
  does not resolve custom properties — which is every colour in this codebase.
- **The one renderer CI has is `test:ci`**: `xvfb-run --auto-servernum … npm run test:ci`
  (`.github/workflows/pr.yml:132`) boots a real Electron renderer and runs the jasmine bundle. Its
  `SpecRunner.html` loads no editor stylesheet, but `webpack.renderer.core.js:55,72` puts
  `style-loader` on `.css`/`.scss`, so a spec that imports one **does** get it injected. That is a
  real path, and it is the only one.
- ⇒ **The gate is a drive, not a unit test.** `scripts/look-gate/run.js` connects over CDP to a
  running editor, collects in the renderer and judges in Node. The half that decides is graded in
  `test:main` today (39 specs); the half that reads pixels is run against a build.

### 6.2 What exists now

| file | what it is |
|---|---|
| `scripts/look-gate/lib/color.js` | parse / composite / flatten a ground stack / WCAG ratio. **One home** for a formula that had four (`themeTokens.ts`, `icon-contrast.js`, `deploy-from-disk.cjs`, `CanvasTheme.ts`); `themeTokens.ts` now re-exports it, so NAT-001's token gate and this one cannot disagree about 3:1. |
| `scripts/look-gate/lib/scale.js` | the R1 type ramp and CHR-003's radius ramp, **read from `fonts.css` and `spacing.css`** rather than copied. Throws if it finds no tokens — a gate with an empty allowed set passes everything. |
| `scripts/look-gate/lib/audit.js` | the judgement: text ≥ 4.5:1, control edge ≥ 3:1, font size on the ramp, radius on the ramp, text fits its box. Every finding names the element. Thresholds are module constants, not parameters. |
| `scripts/look-gate/lib/collect.js` | the DOM walk: ground chain, own-text, reachability, which text can be cut silently. A factory over four DOM services, so the walk is gradeable against a fake DOM. |
| `scripts/look-gate/run.js` | the CLI. `--surface`, `--theme=both`, `--json`, `--arm=<css>`. Exit 0 green / 1 findings / **2 measured nothing**. |
| `tests-unit/chr-004/lookGate.test.ts`, `collector.test.ts` | 39 specs, run by `test:main` in CI today. **10 mutants, 10 red.** |

**Two properties the old gates did not have.** Every result carries a `population` — how many
elements, how many readings per rule, and every refusal with its reason — because CHR-009 spent
nine slices reporting a property of 71 labels from a census of 12. And the gate **refuses** rather
than guesses: a ground stack that never reaches an opaque colour is counted as `text:ground-unknown`,
never scored.

### 6.3 AC1 and AC2, taken live (packaged 0.2.4, launcher, CDP 9333)

The reverted arms were taken with `--arm=<css>` against a running build rather than by editing
source and rebuilding — the gate reads what is painted, so a stylesheet over the top is the same
experiment for a fraction of the cost.

| arm | result |
|---|---|
| none, dark | **19 findings** / 149 graded readings / 124 elements / 49 refused |
| none, light | **23 findings**, same population |
| **A** — every `LauncherButton` fill moved one token step to `bg-4`, ink unchanged | **19 findings — byte-identical to the unarmed baseline** (same rules, elements and values). The moved fill changed nothing. |
| **B** — the same fill to `#6b7682` with `#7c8894` ink | **27 findings**: 8 new `text-contrast`, each naming its button — `button.LauncherButton…is-primary "New project" [1.279:1 — < 4.5:1 — #7c8894 on #6b7682]` |
| **C** — the page title to `font-size: 9px` | `font-size-off-scale: h1.LauncherPage.Title "Recent projects" [9px]` |

⇒ **AC1's person sentence holds**, and AC2's scale arm reddens naming the element and the value.
A 7px radius reddens without an arm at all: 0.2.4 predates CHR-003, and the gate names nine of them.

⚠️ **These are readings about 0.2.4, not about HEAD.** The packaged app was used deliberately — no
compile, no webpack, no risk to the peer stack in this checkout — and it predates CHR-003, CHR-005
and CHR-009. The findings above are therefore *the gate working*, not a defect list for HEAD.
CHR-009 AC5 needs the same run against a dev build of HEAD, over §3.6's node set.

### 6.4 🔴 The first drive found four instrument faults before any reading was true

Every one of them passed the 37 unit specs and would have been reported as a product defect.

1. **Seven buttons "failed" their edge at exactly 1.000:1.** `border: 1px solid transparent` is how
   a control reserves the space its focus ring needs; composited onto its ground it **is** the
   ground, and a colour against itself is 1. A transparent edge is not a failing edge.
2. **`svg`, `circle` and `path` were reported at Chromium's unstyled-button 13.333px.** A font size
   on an element that paints no text is a number about nothing. Font size is now read **only where
   there is own text** — the same correction CHR-001 made counting the launcher's sizes.
   ⚠️ Text drawn by a `::before` (a FontAwesome glyph) is outside that population; CHR-010's job.
3. **Three findings were named `svg.[object.SVGAnimatedString]`.** `className` on an SVG element is
   an `SVGAnimatedString`, not a string. `getAttribute('class')` answers for both.
4. **A genuine 4.4968:1 printed as `4.50:1 — < 4.5:1`**, which reads as a gate bug rather than a
   marginal fail. Contrast now prints three decimals.

### 6.5 🔴 The retirement nearly lost coverage the replacement did not have

I had put AC3/AC4 off, and Richard ruled **"delete them now."** Acting on that immediately would
have been wrong, and reading the specs first is what caught it:

**They grade the STATES.** `it('🔴 no state of it moves the edge below 3:1 on EITHER side')` appears
in four of the six, and they can make that claim from CSS text because `:hover` is *written* in the
stylesheet. A gate that reads computed styles sees only the state the surface is sitting in. Deleting
them against a resting-only gate would have traded a broad claim for a narrower one without saying so.

So the gate learned the states first, with Chromium's own `CSS.forcePseudoState` — the mechanism
DevTools' `:hov` panel uses, so the state graded is the one the cascade really produces:

```bash
NOODL_REMOTE_DEBUG_PORT=9333 node scripts/look-gate/run.js --surface=launcher --theme=both --state=all
```

`rest, hover, focus, active`, forcing on every control in the surface, and **forcing zero nodes is a
failure, not a pass** — a selector matching nothing would otherwise report the resting state as hover.

🔴 **The first reading looked like a dead instrument and was not.** All four states returned 19
findings over 149 readings — identical. The probe that settled it: a forced hover moves
`LauncherButton`'s fill `rgb(43,52,64)` → `rgb(51,62,77)` and back on release, so the forcing works;
0.2.4's hover states simply do not break the ruling, and the findings that *are* there (radius,
font-size, a folder-tree text pair) are state-independent. ✅ **Positive control, armed live:** a
`:hover`-only failure is **invisible at rest** (19 findings, none about a button) and **caught under
hover** (27 findings, 8 `text-contrast` naming each button). An identical reading across arms is only
believable next to an arm that differs.

### 6.6 AC3 / AC4 — what was retired, and the numbers

**Six specs deleted** (2,715 lines, 44 `it()` blocks, 93 `expect(`): the four launcher slices
(`launcher-`, `launcher-button-`, `folder-tree-`, `learner-path-control-borders`),
`style-section-control-borders`, and `fb-005/template-shelf-control-borders` — exactly the six §3.1
names. `tests-unit/border-sweep/README.md` records what moved where and why.

**Kept:** `bench-`, `code-editor-` and `node-picker-control-borders` cover surfaces this phase does
not redesign and the gate has not been pointed at. Same shape, same limitation — retire each when
the gate has covered its surface. Plus §3.4's palette gates (`nat-001`, `nat-003`, `def-001`), which
gate the palette rather than the look.

**Three stale source comments fixed**, each naming a deleted spec as its grader: `LauncherCard`,
`ElementStyleSection` and `VariantSelector` `.module.scss`. ⚠️ §2's audit also quotes
`LauncherButton.module.scss:54-58` — that file no longer exists in source at all; **CHR-005 deleted
the component**, and only build artefacts still mention it.

| reading | before | after |
|---|---|---|
| `npx jest tests-unit` | 471 suites / 7,630 tests | **465 / 7,483**, exit **0** |
| the four class-name specs' `expect(` (AC4) | 18 / 24 / 24 / 36 | **unchanged — §3.3 not done** |
| specs resolving tokens out of a stylesheet | 18 | **12** |
| AC3's grep **verbatim** | 3 | **3** |

🔴 **AC3 is unmeasurable as written.** `grep -rl "readFileSync.*\.s\?css" tests-unit/` returns
**three** files — and returned three *before* this session too, because the retired specs read CSS
through a helper (`support/themeTokens.ts`), not with a `readFileSync` on the same line. Its
"down from 28" was never what that grep counted. The population that answers the question is "specs
that resolve a token out of a stylesheet", and it went **18 → 12**, of which 5 are other tasks'
surfaces, 3 are the kept border-sweep files, 3 are the palette gates §3.4 says to keep, and 1 is the
helper itself.

### 6.7 What is left

- **§3.3 — the class-name assertions — NOT done.** `groupHeading`, `portHint`, `bindingChipRows` and
  `nodeCommentRow` still assert class names, and `PropertyPanelInput.module.scss`'s
  `:global(.sidebar-property-editor)` hook is still there. It is a source change inside the property
  panel, which a peer is refactoring next door, and it cannot be driven this session. AC4's counts
  are therefore recorded as unchanged rather than as met.
- **AC5's CI half: ruled.** Richard, 2026-09-17: the rendered gate stays a **hand-run check**, taken
  each session before work is shown to him, rather than being wired into CI. The judgement half runs
  in CI on every PR via `test:main` and stays there.
- **A HEAD run is still owed** — everything measured so far is packaged 0.2.4.
- **`icon-contrast.js` and `deploy-from-disk.cjs` still carry their own copy of the formula.**
  Neither runs without a live editor / a deploy, and rewiring an untestable script is how you ship a
  broken tool. Owed, with a note.

---

## 7. Session 31 (2026-09-17) — the HEAD run, and the first thing the gate found

### 7.1 The reading AC5's first half owed

The gate, unchanged, over CHR-009 §3.6's eight-node verdict set on a **dev build** (so: HEAD), both
themes, resting state. Driver `verdicts/CHR-004/2026-09-17-head/drive-gate-set.js` — it only selects
the node and waits for its rows, then shells out to `scripts/look-gate/run.js` per reading, so the
instrument being run is the one 39 specs grade and there is no second copy of the judgement.

| node | rows | graded | findings |
|---|---|---|---|
| Group | 147 | 638 | 14 |
| Text | 89 | 570 | 18 |
| Image | 104 | 578 | 18 |
| Function | 3 | 146 | 2 |
| Query Records | 20 | 352 | 6 |
| Columns | 29 | 416 | 10 |
| States | 4 | 142 | **0** |
| Button (PopoutGroup) | 119 | 542 | 16 |
| **total** | | **3,384** | **84** |

✅ **The scale half is GREEN at HEAD: zero `font-size-off-scale`, zero `radius-off-scale`, zero
`text-cut`, over 8 nodes × 2 themes.** That is CHR-002 and CHR-003 holding, measured rather than
assumed, and it is the first time either has been graded on anything but the Group.

🔴 **82 of the 84 findings are ONE decision counted 80 times.** A count is not a finding: attributed
by colour pair, `control-edge-contrast` × 40 at `#33323d on #232129` (dark) and × 40 at
`#e0e5eb on #ffffff` (light), across 9 element kinds (base inputs 42, `panel-head-row-field` 18,
`NumberUnitInput.Fixed` 12, `VariantSelector-trigger` 4, colour swatch, code-editor button, textarea).

### 7.2 What it is, named

`verdicts/CHR-004/2026-09-17-head/field-edge-token.js`, live in both themes:

| | light | dark |
|---|---|---|
| the field's own fill | `#f2f4f6` | `#2e2c36` |
| the field's edge (`border-default`) | `#e0e5eb` | `#33323d` |
| the panel ground | `#ffffff` | `#232129` |
| **edge vs ground** | **1.267:1** | **1.260:1** |
| fill vs ground | 1.103:1 | 1.158:1 |
| `--theme-color-border-control` vs that ground | **3.719:1** | **4.512:1** |

So **every boundary a person could see is ≤ 1.27:1**, and the token that meets NAT-001's 3:1 already
exists in the palette and passes comfortably on this exact ground. The fields simply do not use it.

🔴 **This is §2's thesis with a live defect behind it.** `nat-001/palette-contrast.spec.ts` is GREEN
and always was: it grades `border-control` on the grounds it knows about and never asks which token a
field actually paints. *"That is a property of the rendered element, which is not what most of these
tests measure."*

### 7.3 Ruled: the quiet edge stays

Priced before proposing, with the gate's own `--arm` (a stylesheet over the running app, no compile):
`verdicts/CHR-004/2026-09-17-head/pair.js` → `pair/field-edge-{before,after}-{dark,light}.png`, the
same crop of the Group panel, the only difference being every field edge armed to `border-control`.

**Richard ruled "fix it", was shown the armed picture, and took it back: *"no outlines like in the
after pic, I don't like it."*** ⇒ the quiet edge is the **ruled look** for panel fields. CHR-009's
Group pair was ruled WORTHY with it in. 🔴 **Do not re-propose `border-control` on panel fields.**

Nothing in the product changed. `git status` over `packages/` was clean of mine throughout.

### 7.4 So the gate learned to carry a ruled exception — `scripts/look-gate/rulings.js`

A hand-run check that reports 82 findings every session is a check nobody reads, and the next session
to read them would "fix" exactly what was declined, at full price, twice. **`NAT_001.controlEdge` is
still 3.** Nothing in the file can change a threshold or except a rule.

What keeps it honest, each graded by `tests-unit/chr-004/rulings.test.ts` (21 specs):

1. **An exception matches the MEASUREMENT** — two colours, as the gate's own hex — never an element,
   a class or a rule. There is deliberately no syntax for a wildcard. Move `border-default` one step
   and it stops matching and reds again.
2. **It cannot leak**: not across rules (same two colours as *text* is unruled), not onto a
   neighbouring colour (`#33323e`, `border-subtle`, the field fill as ground all still red), not onto
   the ruled ink over an unruled ground.
3. **A finding with no measured pair can never be excepted** — otherwise one ruling would delete a
   whole rule, reported as clean.
4. **It is never counted as a reading that passed.** `population.graded['control-edge']` still counts
   it; `population.ruled` counts it separately and the verdict LINE says `N ruled exception(s)`.
5. **A ruling that matched nothing is named** (`unmatchedRulings`) — a stale ruling is a rule quietly
   switched off, and a clean run is exactly what it looks like.
6. **It carries who ruled it, when, and the artefact they were shown**, so a later session need not
   re-derive the question. Asserted, including that `what` and `shown` are non-trivial.
7. **`run.js --no-rulings`** reports the raw picture. Any claim about a whole surface should be taken
   once without them.

**Control pair, live, property panel, both themes:** rulings active → **0 findings / 7 ruled
exceptions per theme, exit 0**; `--no-rulings` → **7 findings per theme, 14 total, exit 1**, each
naming its element. An identical reading across those arms would have been indistinguishable from a
facility that was never wired up.

### 7.5 Still standing after the ruling — 2 findings, NOT excepted

`span.IconInput.Name.is-placeholder "None"` — the icon row's empty-state word:
**3.897:1 dark / 3.373:1 light, against 4.5:1.** Owed a ruling of its own; it is text, not an edge,
and nobody has looked at it. 🔴 Related: s21's *"greyed is a picture, not a DOM attribute"*.

### 7.6 Readings and traps

- `npx jest tests-unit/chr-004` **3 suites / 60 tests, exit 0** (was 2 / 39). `typecheck:editor-tests`
  clean. **7 mutants, 7 red**, every file restored byte-identical (`cmp`).
- ✅ **A surviving mutant made me delete a line rather than write a test** (second time in this
  phase). `rulingFor`'s `!finding.ink || !finding.ground` guard was unreachable: the pair comparison
  already refuses, because `norm(undefined)` is `''` and every pair is six hex digits. The invariant
  is now pinned where it CAN break — the spec asserting every pair matches `/^#[0-9a-f]{6}$/` — and
  the mutant that breaks it (a pair written `['','']`) reddens 11 tests.
- 🔴 **`execFileSync` hands back only STDOUT, and jest prints its summary to STDERR even on a PASS.**
  The first mutant runner therefore reported a passing mutant as `Tests: (none printed)` — byte-identical
  to the shape of a suite that failed to run, which is the one outcome that must never be confused
  with another. `spawnSync`, and concatenate both streams.
- 🔴 **A leftover popout silently zeroes the whole gate.** `popout-scope.js` had clicked a trigger and
  left a `.popup-layer-blocker` over the panel; the next run refused **1,018 of 1,018** elements as
  `not-reachable` and exited 2. That is the gate being right, and it is only legible because every
  result carries its population. Close what a drive opened. (Escape and `.click()` do not dismiss it;
  a real `Input.dispatchMouseEvent` press does. `dispatchClick(client, {x, y})` takes a POINT.)
- 🔴 **A pipe ate the exit code again** — `node run.js … | tail -14; echo $?` printed `0` over a run
  that exited 2. Redirect to a file, capture `$?`, then grep.
- 🔴 **`cdp.js` defaults to 9222**: set `NOODL_REMOTE_DEBUG_PORT` on every single call, including
  one-off `node -e` probes.
- 🔴 `--json` on `run.js` must be **ABSOLUTE** when shelled out: it runs with `cwd: ROOT`, so a
  relative path lands beside the repo root and the read-back fails with ENOENT *after* the gate has
  measured — which reads as "the gate could not measure".
- The gate's own `contrastRatio` takes **parsed** colours, not CSS strings; handed a string it throws
  inside `relativeLuminance`. Use `flattenGround([css])` first.

### 7.7 §3.3 — measured, and NOT done

**The `:global(.sidebar-property-editor)` removal is not free, and the task says it is.** §3.3 says
the hook goes "with its geometry moved into the component". Measured:

- The only consumer of `PropertyPanelRow` outside the editor's property panel is
  `noodl-core-ui/src/preview/property-panel/Group/Group.tsx`, which **has no importer at all** (dead
  storybook-era preview). So far, so free.
- 🔴 **But `showPopout` appends into the popup layer** (`popuplayer.ts:918` → `this.popoutsEl`), which
  is NOT inside `.sidebar-property-editor`. `PopoutGroup`, `CodeEditorType`, `CurveType`, `ImageType`
  and `PickerTypeView` all render rows there. ⇒ the hook is a **live conditional**: dropping it would
  give every popout's rows a 118px fixed label column, a 30px min-height and absolutely-positioned
  gutter dots they do not have today — a look change to surfaces Richard has never been shown.
- ⇒ doing it properly means a variant the panel's rows opt into, threaded through ~18 call sites (each
  row is its own `createRoot`, so one provider cannot wrap them). Priced, not built.

**The class-name half is also mis-scoped, and two of §2's four claims are stale:**

- 🔴 `fb-018/bindingChipRows.test.tsx` no longer asserts `sidebar-panel-dark-input` **anywhere** —
  that string appears in **zero** files under `tests-unit/`. It is a live product class in 5 source
  files; the audit line is left over from before FB-018's rewrite.
- 🔴 `byClass(node, '<product class>')` is the **house style of this runner**, not a four-file problem:
  **~40 spec files and ~180 call sites** use it, and `renderElements.ts` documents it. §3.3 names four.
  Converting only those four would leave the codebase less consistent, not more.
- What IS genuinely worth fixing, and is small: `property-editor/portHint.test.ts:123,128` asserts
  `className === 'property-row'` — a literal that is **stale** (CHR-008 §3.2 moved the row class to
  `.property-panel-row`; `.property-row` was already taken by `propertyeditor.css:98`). It is a
  sentinel, so it should be a neutral one.
- ✅ **`leg-005/nodeCommentRow.test.ts`'s CSS read must NOT be retired.** It asserts the placeholder is
  dimmed with a colour TOKEN and `opacity: 1`, never a fraction — and the rendered gate **cannot see a
  `::placeholder`** (it grades elements, and a pseudo-element has no element). §7.5's finding is a real
  `span`, which is why that one *is* visible. Read what a test asserts, not what it is filed under.

AC4's `expect(` counts are therefore still **18 / 24 / 24 / 36, unchanged**.

## 8. The gate run of 2026-09-18 (s33), and three holes it had

Run on a dev build at `f8558113` + the two instrument fixes below, after CHR-010 closed. Readings
and PNGs: `verdicts/CHR-004/2026-09-18-gate/`.

| surface | reading |
|---|---|
| property panel, Group node, both themes | **GREEN, exit 0** — 638 graded, 0 findings, 7 × `panel-field-edge-stays-quiet` |
| property panel, `Icon` node, both themes | **exit 1, 1 finding** — `button.ColorInput.Swatch` edge **1.499:1** dark / **1.387:1** light vs 3:1. ✅ `unset-field-placeholder-stays-greyed` fires here, once per theme |
| launcher, both themes, all four states | **exit 1, 10 findings = 2 distinct** (below), 1,688 graded |

**The two the launcher is actually red on**, both text and both for Richard rather than for a
compliance fix:

1. **The pressed primary button**, dark: `#071627 on #1f6bc4` = **3.433:1** vs 4.5. At rest the same
   ink sits on `#4da3ff` and passes; only the pressed fill drops it. Shot with the state held —
   `primary-pressed-dark-active.png`, `primary-rest-dark.png`.
2. **The selected folder row**, light: `#1570ef on #dae5f4` = **3.589:1** vs 4.5, in all four
   states. `folder-selected-light.png`.

### The three holes, each found by running it

1. 🔴 **`launcher`'s root is `body`, so with a project open the gate grades the EDITOR and files
   the findings under "launcher".** I took exactly that reading — it named `SideNavigation`,
   `PreviewChrome`, `NodeGraphComponentTrail` and the property panel's own fields — and it looks
   like a launcher regression report. Surfaces now carry `requires`, a selector that must be on
   screen, and its absence is **exit 2, could not measure**, never a clean run.
2. 🔴 **The collector took the FIRST `.sidebar-property-editor`, and this editor never unmounts a
   panel it has shown** — a leftover 0×16 shell matches before the live panel. Grading the shell
   returns a handful of records and no findings: a silent zero shaped exactly like a clean surface.
   It now takes the **largest drawn** match, and refuses (exit 2) when every match has a zero box.
3. 🔴 **A gradient ground was graded as the colour behind it.** The launcher's project placeholder
   is white on 16% white over a `linear-gradient`; `groundsOf` reads `background-color` only, so the
   gate composited that white over the CARD and reported **1.08:1** — twice, plus the community
   avatar at 1.10:1. Three false findings out of the first run's 18. An element whose ground carries
   an image at or above the first opaque layer is now **refused into `text:ground-is-an-image` /
   `edge:ground-is-an-image`** and counted, because "could not measure" is an answer and a false
   finding costs a session the same as a real one.
   ⚠️ The refusal is bounded on purpose: an image **behind** an opaque fill does not disqualify a
   reading, or the gate would stop covering its surface.

`tests-unit/chr-004` is **69 tests, exit 0**, with specs for all three; five mutant arms (first
match, zero-box guard, gradient not marked, opaque-layer stop removed, audit grades it anyway) all
red and every arm restored byte-identical.

⬜ **Still owed: a popout surface.** The icon picker, the colour style picker, the text style picker
and the variants popup are drawn in the popup layer, outside `.sidebar-property-editor` — so
CHR-010's black magnifier would have been green here. The gate cannot see the surfaces where two of
this phase's last three defects were.
