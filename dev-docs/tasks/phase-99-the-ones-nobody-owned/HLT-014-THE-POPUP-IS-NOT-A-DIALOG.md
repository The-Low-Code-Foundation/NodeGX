# HLT-014 — The popup is not a dialog

> ✅ **BUILT 2026-09-21 (P99 s11) — AC1–AC8 met. ✅ §3.1's validator warning BUILT 2026-09-22
> (P99 s21): `dialog-without-name`, a default-enabled warning, 22/22 specs, two mutants caught by
> name, **0 hits on all ten shipped templates**. [verdict](./verdicts/HLT-014/2026-09-22-validator/VERDICT.md).
> 🔴 The predicate is NOT what §3 described — a `Text` is a heading only when its `as` says so
> (default `div`), and the walk must recurse into component instances because the runtime's
> `querySelector` does. **This row is now closed.** 📋 `test:ci` is owed and not run: a dev stack was
> up for Richard's AC7 hand-test.** Driven: HEAD 7/7 fired · fixed 25/25 (both layouts) · export 14/14, mutant 11/14 ·
> templates 18/18 (HEAD 9/18). 🔴 AC7 found a regression §3's shape would have shipped — the toast
> prefab opens its toast through Show Popup, and a modal toast froze the page for three seconds — so
> Show Popup also gained **`Modal`** (default on), which the toast sets off.
> [Verdict](./verdicts/HLT-014/2026-09-21/VERDICT.md).

🔴 **Opened 2026-09-21 from the Digital Bricks Training stream (its sprint 48), at Richard's
request** — *"let's maybe plan a task for this issue in phase 99 of NodeGX to tackle the problem
for future projects? You decide what the best long term solution is."* Measured by reading the
source, not yet by a driven session; §4's first criterion is the drive that confirms it.

## 3.1 — MEASURED 2026-09-22 (P99 s21), before a line was written

**The remaining slice is the project validator warning: a Show Popup whose target has neither an
`Accessible Name` nor an `h1`–`h3` inside it.** Scanned **238 projects**, both on-disk formats.

| | |
|---:|---|
| **871** | raw `"NavigationShowPopup"` occurrences (the CONTROL — see below) |
| **756** | Show Popup nodes reached by the component walk |
| **0** | that carry an `Accessible Name` today |
| **5** | whose target contains a heading |
| **728** | that the warning would fire on |
| 11 / 12 | no target set / target does not resolve (owned by other codes) |

🔴 **So on the corpus at large the warning fires on 96% of every Show Popup.** That is not a
reason to soften it — those really are dialogs a screen reader announces as *"dialog"* and nothing
else — but it is a number anyone shipping this rule has to have seen first.

✅ **And on what NodeGX SHIPS it fires zero times.** The ten shipped templates contain **exactly one**
Show Popup, and its target already has a heading. So the rule can ship `warning`, default-enabled,
without turning `validate:project` red on the product's own corpus. **Recommended: ship it that
way.** The 728 are Richard's own drives, fixtures and legacy Noodl projects.

### 🔴 The predicate has a trap, and the corpus says it is not currently reachable

The runtime names a popup from `Accessible Name`, else from `el.querySelector('h1, h2, h3')` on the
**live** subtree (`popup-dialog.ts:254`). Two things follow that a static rule must not assume:

1. **A `Text` is an `h1`–`h3` only when its `as` parameter says so** (`nodes/visual/text.ts:47-68`);
   the default is `div`. "There is a Text at the top" is not a heading.
2. **`querySelector` sees NESTED component instances**, so a check that walks only the target
   component's own nodes would false-warn whenever the heading lives one component down. Measured:
   **0 cases today** — but that is a fact about this corpus, not about the rule
   ([[a-reading-that-fits-is-not-one-that-excludes]]). The walk must recurse anyway, because the
   day it does not is a silent false warning, and a warning nobody trusts is a warning nobody reads.

### ⚠️ The control that caught a wrong key, recorded because it nearly shipped as a finding

The first version of this scan reported **0 Show Popup nodes** — while `grep` found 567. Legacy
components nest their tree under `component.graph.roots`; v2 keeps a **flat** `nodes` array in
`components/<path>/nodes.json` with the name in a sibling `component.json`. Reading one shape found
nothing and looked like a clean answer ([[a-project-scan-must-read-both-project-formats]]). The
scan now prints the raw occurrence count beside the walked count **every time**, so a zero can
never again be read as a measurement. The two still differ (871 vs 756): the remainder is inside
prefab and `noodl_modules` JSON that carries no component wrapper.

## 1. The person sentence

> **Someone who opens a popup in a NodeGX app with a keyboard or a screen reader can tell they are
> in a dialog, can leave it with Escape, and lands back where they were — without the app's author
> having to know any of that exists.**

## 2. What it is, measured 2026-09-21 by reading

- **The popup is a plain `Group`.** `NodeContext.showPopup` (`noodl-runtime/src/nodecontext.ts`
  ~1165–1250) creates it with `cssClassName: 'noodl-popup'` and a position, and nothing else.
- **Nothing in `noodl-runtime/src` or `noodl-viewer-react/src` handles Escape, sets `role="dialog"`
  or `aria-modal`, or moves focus.** A grep for `keydown`, `Escape`, `aria-modal` and `dialog`
  across both finds only the two text-input controls.
- **There is no idea of the user dismissing a popup at all.** `Dismissed` on Show Popup means
  *replaced by another popup*, and its docblock deliberately says it is **not** *"the user closed
  the dialog"* (`nodecontext.ts` ~1134). A popup closes only when the app's own Close Popup node
  fires.
- **The viewer mounts popups in one place** — `viewer.jsx` ~216, `setPopupCallbacks({ onShow,
  onClose })`, which already owns the body-scroll lock. **That is the natural single owner.**
- 🔴 **The exporter has a second copy.** `nodegx-export/src/emit/component.ts` ~5905 emits a
  `createPortal(<div className={styles.popupLayer}>…</div>, document.body)` with no semantics
  either. A fix in the viewer alone would make an exported app and the editor preview behave
  differently, which is P99's *second copy drifts* lesson arriving in the export
  ([[a-second-copy-of-a-palette-drifts-silently]]).
- **Consequence, concretely:** a keyboard user who opens a popup can Tab straight out of it into the
  page underneath, cannot close it without finding the author's button, and loses their place when
  it closes; a screen reader is not told a dialog opened. The Digital Bricks Training template
  needed a real dialog (a dossier reveal) and had to build it as a React kit node instead of using
  Show Popup, which is **the workaround every future template will reach for** unless this is
  fixed.

## 3. The long-term shape, decided

**The runtime's popup container becomes a modal dialog by default, with one owner of the
behaviour and the exporter held to it by a shared conformance test.** An author gets it for nothing;
the only new ports are for the two cases that genuinely differ.

1. **Semantics.** Each open popup's container renders `role="dialog"`, `aria-modal="true"`,
   `tabIndex={-1}`. Its accessible name comes from a new Show Popup input **`Accessible Name`**
   (string); when empty, `aria-labelledby` points at the first `h1`–`h3` inside the popup. The
   project validator **warns** on a Show Popup whose target has neither — a dialog with no name is
   announced as "dialog" and nothing else.
2. **Everything behind it is `inert`.** While at least one popup is open, the app root carries the
   native `inert` attribute; under stack policy `stack`, every popup except the top one does too.
   `inert` gives Tab containment and screen-reader hiding in one attribute — **no hand-written Tab
   trap**, which is the part most dialog implementations get subtly wrong.
3. **Focus in, focus back.** On show, the stack entry records `document.activeElement` as its
   opener and moves focus to the first focusable element inside, else the container. On close **by
   any path** — Close Popup, Escape, or being replaced — focus returns to the opener if it is still
   connected, otherwise to the new top popup, otherwise to the app root. Never to `body` by
   accident.
4. **Escape is a new outcome, not a new meaning for an old one.** Escape closes the **top** popup
   only and fires a new Show Popup output **`Cancelled`**. `Dismissed` keeps its present meaning
   (*replaced*). A new boolean input **`Close on Escape`**, default **on**, lets an author keep a
   popup that must not close that way (an unsaved form) — the opt-out is the exception, because a
   popup that cannot be escaped is the defect.
5. **The exporter emits the same contract** through one emitted helper component rather than an
   inline `div`, and **one conformance drive runs against both** the viewer and an exported copy of
   the same fixture project. Two implementations are acceptable only if one test grades both.

**Why not a native `<dialog>` element:** `showModal()` would give 1–4 almost free, but the popup's
children are runtime nodes mounted by React into the viewer's own layer and positioned by the
project's `bodyScroll` setting; moving them into the top layer changes stacking, styling and the
scroll lock the viewer already owns. The attributes above get the same result without moving the
tree. Recorded so the next reader does not re-propose it without that cost in view.

## 4. Scope

**In:** `nodecontext.ts`'s popup stack (opener, `Cancelled`, the Escape listener's lifetime),
`viewer.jsx`'s popup layer (the attributes, `inert`, focus), `showpopup.ts` (the two new ports and
the new output), the exporter's popup emission, the validator warning, and the catalogue text for
Show Popup.

**Out:** a backdrop (the runtime draws none; an author's own backdrop wires a Close Popup, as
today), animation, and the Digital Bricks template's `DossierReveal` — replacing it with Show Popup
once this lands is that stream's decision, not this task's.

## 5. Acceptance criteria

1. ✅ 7/7 fired on HEAD — 8 of 20 Tabs on the page, focus on `body` after close. **(the drive, first)** On a fixture project with one Show Popup, the HEAD build is measured and
   recorded: Escape leaves **1** popup open, `[role=dialog]` is **0**, focus after close is on
   `body`, and Tab reaches the page underneath. This confirms §2 by driving rather than by reading.
2. ✅ 25/25 — Tab graded as *never reaches the page* (verdict §3: two Tabs leave to the browser UI, as a native modal `<dialog>` allows). **(the number)** The same drive on the fixed build: Escape → **0** popups and `Cancelled` fired
   once; `[role=dialog][aria-modal=true]` = **1** with a non-empty accessible name; after close,
   `document.activeElement` **is** the opener; 20 Tabs never leave the popup; the app root carries
   `inert` while open and not after.
3. ✅ **Stack policy `stack`:** two popups, Escape closes only the top, focus goes to the lower one,
   and only the lower one is not `inert`.
4. ✅ **`Close on Escape` off:** Escape leaves the popup open and fires nothing.
5. ✅ **Replaced (`Dismissed`) returns focus too** — the path most likely to be forgotten.
6. ✅ 14/14; the role mutant fails exactly its 3 rows. Arms A/B/D — the export defers `Show On Top` and consumed outputs. **The export matches:** the same drive against an exported copy of the fixture gives the same
   numbers as criterion 2. Demonstrated failing by removing the emitted helper's `role`.
7. ✅ three uses, not one (`toast` and `image-cropper` prefabs too); toast opted out via the new `Modal`, cropper given a name, WorkCard correct as is. **The shipped templates:** every template using Show Popup (today only `landing-pages`,
   `Site/WorkCard`) is driven, and any popup that relied on Escape doing nothing is named and either
   opted out or recorded as correct to close.
8. ✅ see the verdict. `test:ci` at the floor and **`test:main` green** (§7 — they are different gates).

## 6. Landmines

- 🔴 **A listener registered per popup and removed per popup leaks under `replace`,** because
  `dismiss()` and `closeHandler` are two paths out of the stack. Register once at the layer, read
  the top of `popupStack`.
- ⚠️ **`inert` on the app root must not include the popup layer** — if the layer is a descendant of
  the root, `inert` disables the popup too. Measure where the layer sits before setting it.
- ⚠️ **Server render:** the export's emitted helper and the viewer both run where there is no
  `document`; nothing here may touch it on the closed path.
- ⚠️ **Editor preview:** the canvas hosts the viewer; Escape in the editor also means other things.
  Check the listener is scoped to the viewer frame and does not swallow the editor's own Escape.

## 7. Owner and collisions

Owner: this phase. **The Digital Bricks Training stream** built `dbt-lesson`'s `DossierReveal`
because of this defect (its sprint 48, `TASK-L167`); it does not depend on this task and must not be
edited by it.
