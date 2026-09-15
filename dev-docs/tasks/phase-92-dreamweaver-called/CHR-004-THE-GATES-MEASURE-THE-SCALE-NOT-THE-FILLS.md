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
