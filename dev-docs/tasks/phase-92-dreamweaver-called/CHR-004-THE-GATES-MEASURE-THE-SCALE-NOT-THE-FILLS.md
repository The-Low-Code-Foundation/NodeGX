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

### 6.5 What is left

- **AC3 / AC4 — retiring the eight `*-control-borders` specs and the four class-name ones — is NOT
  started, on purpose.** The gate has been driven against **one** surface (the launcher) on **one**
  build (0.2.4). Retiring a pinned test before its replacement has covered the same surface on HEAD
  would be trading a gate that works for one that has not been shown to.
- **AC5 needs CI.** The judgement half already runs in CI (`test:main` → `tests-unit/chr-004`). The
  rendered half needs a decision — it is a drive, and CI has a renderer only inside `test:ci`.
  **That is a ruling, not an implementation detail**; it is in the handoff.
- **`icon-contrast.js` and `deploy-from-disk.cjs` still carry their own copy of the formula.**
  Neither can be run without a live editor / a deploy, and rewiring an untestable script is how you
  ship a broken tool. Owed, with a note.
