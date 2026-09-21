# HLT-014 — verdict, 2026-09-21 (P99 s11)

**A Show Popup is a modal dialog now, in the editor preview, in a deployed app and in an exported
app, with nothing for the author to wire.** Graded by one drive against the real viewer bundle in
headless Chrome, and by the same drive against an export of the same fixture.

| | HEAD build | fixed build |
|---|---|---|
| Escape with a popup open | popup stays (**1**) | closed (**0**), `Cancelled` fires **once**, `Closed` **0** |
| `[role=dialog][aria-modal=true]` | **0** | **1** |
| Chrome's own AX tree, role `dialog` | `[]` | `["Dialog one"]` — named from its `h2` |
| 20 Tabs from inside the popup | **8** land on the page underneath | **0** on the page (2 leave to the browser UI, see §3) |
| focus after close | `body` | the button that opened it (Escape, Close Popup and the replace path) |
| page while open | live | `inert`; nothing `inert` after |
| two popups, `Show On Top` | Escape does nothing | Escape closes the top only; focus goes into the lower one; only the lower one was `inert` |
| `Close On Escape` off | — | Escape leaves it open and fires nothing |

**`scripts/devtools/drive-hlt014-popup.js`:** `--expect head` 7/7 fired · fixed **25/25** · `--body-scroll`
**25/25** · `--export` **14/14** · `--export --mutate-role` **11/14** (the three rows that read `role`
fail, nothing else moves). **`drive-hlt014-templates.js`:** HEAD 9/18 · fixed **18/18**.

## 1. §2 measured TRUE

Every claim in §2 held when driven (AC1): no semantics, no Escape, no focus handling, `Dismissed`
meaning *replaced*, one mount point in `viewer.jsx`, a second copy in the exporter. The fourth task file
in this phase whose §2 measured true.

## 2. What was built

- **Runtime** (`nodecontext.ts`): `cancelTopPopup()` — the one decision about Escape, because the
  stack is the runtime's. Close Popup and Escape share one teardown (`leave`), so they cannot drift;
  only the report differs. A second Escape inside the same frame is spent without reaching the popup
  beneath. The host is handed `{ accessibleName, modal }`.
- **Show Popup**: `Cancelled` (output), `Close On Escape`, `Accessible Name`, and `Modal` (§4).
- **Viewer** (`popup-dialog.ts`, wired in `viewer.jsx`): semantics on the container from its first
  render (`props.dom`), `inert` on everything behind the top modal popup, focus in (bounded polling —
  the content arrives a frame after the container), focus back by any path. One key listener for the
  viewer's life (§6 landmine 1). `inert` is set on the viewer container's children that hold no popup,
  so the popup layer is never inside an inert element in either layout (§6 landmine 2; both drives).
- **Export**: `src/lib/popupDialog.ts`, a `PopupDialog` the slot renders instead of the bare `div`, with
  the same contract and a module-level stack. Slot identity now includes the dialog inputs, so two
  nodes that open one target as different dialogs no longer share a slot.
- **Catalogue**: ports, enrichment prose, node docs, CHR-007's widget snapshot (+3 lines), the export
  corpus golden (+12 lines, predicted before regenerating — see `hls001-corpus-identity.test.ts`).

## 3. 🔴 Tab to the browser is not an escape — and the first run scored it as one

The first fixed run read **2/20 out**: both were `body`. With the page `inert`, a Tab past the last
control in the popup leaves the *document* for the browser's own UI, and the next Tab comes back to the
first control in the popup — exactly what a native modal `<dialog>` does. None reached the page. The
instrument now sorts the two (`page` vs `chrome`); HEAD reads 8 on the page, the fix 0. AC2's
*"20 Tabs never leave the popup"* is graded as *never reach the page underneath*, which is the defect
§2 names — a hand-written Tab trap to hold focus off the browser UI is what §3 rules out.

## 4. 🔴 AC7 found a regression the task's own shape would have shipped: the toast

`library/prefabs/toast` shows its toast **through Show Popup** (`Show On Top`, closed by its own
3-second timer). Modal by default, the toast became a dialog: the page went `inert` for three seconds,
a press on a field underneath left focus in the toast, and it was announced as a dialog. Measured on the
fixed build before the prefab was touched (toast rows 1/6). A toast is not a dialog.

⇒ **`Modal`** (default on). Off is exactly what a popup was before HLT-014: no semantics, no inert, no
focus move, and Escape skips it — a toast over a dialog does not shield the dialog (E10). The prefab sets
it off; the drive reads 6/6. This is one input more than §3 decided — it said *"the only new ports are
for the two cases that genuinely differ"*, and a third case differed. A shipped prefab found it.

The other two uses were correct to change: **image-cropper**'s crop dialog (Escape = its own Cancel) —
but its only title was a plain Text, so Chrome named it `""`; its Show Popup now carries
`Accessible Name: "Crop image"`. **landing-pages `WorkCard` → `CaseStudy`** needed nothing: named by its
`h2`, focus in, Escape closes.

## 5. Findings this row does not own

- 🔴 **Three renderer-error classes, all on HEAD too, all for HLT-010's budget:**
  1. **`group/layout-not-a-flex-direction` — once per popup opened, in every app.** `showPopup` gives the
     container `flexDirection: 'node'`, and since NDA-012 (2026-08-01) Group raises that on the error
     bus. Not changed here: `'node'` reaches children as `parentLayout`, where it means *neither row nor
     column* — `'column'` would turn a popup root's percentage height into `flex-grow`, `'none'` would
     position it absolutely. It needs its own layout decision.
  2. **The toast prefab's `Toast Component` script throws** `Cannot read properties of null (reading
     'style')` on every toast.
  3. `starter-imagery/…webp` fails to load when landing-pages is served from disk (harness-side).
- 🔴 **`@noodl/mcp` is red on HEAD at 8** (`nodeDocBudget` Group 14,315 > 14,300, `cmp001` 38 ≠ 33,
  `cmp004` ×2, `d54`, `def038` rocket-school, `cn004`, `nodeIdAllocation`) — measured in a clean HEAD
  worktree, then again with only this row's diff applied: **identical**, same numbers. Not this row's;
  `test:packages` runs it.
- ⚠️ **A WorkCard is a clickable Group — not focusable**, so a keyboard user cannot open a case study at
  all, and there is no opener to return focus to (it falls back to the app, never `body`).

## 6. Not built, and said so

- **§3.1's validator warning** (a Show Popup whose popup has neither an Accessible Name nor a heading).
  Not one of the eight criteria; a new diagnostic code here owes a corpus measurement, an examples row
  and a cross-component rule. The image-cropper is the one shipped case it would have caught, and that
  one is fixed by hand. **The row's next slice.**
- **The export slice** stays single-slot and defers `Show On Top` and any consumed output (POPUPS-TARGET
  §7), so AC6 grades arms A, B and D — the semantics, Escape, focus, `inert`, the name, and `Close On
  Escape` — not stacking or `Cancelled`.

## 7. Tools this leaves

- **`scripts/devtools/exported-app-harness.js` — `withExportedPage`**: export with the working-tree
  exporter, bundle the emitted app with esbuild (router v7 installed once into a temp cache, React
  aliased to the checkout's one copy), serve, and hand a page shaped like `withRenderedPage`'s. The
  first way to drive an exported app that survives the session. A `transform` hook makes mutant arms.
- **The fixture shape trap:** a hand-written project must use the on-disk connection keys
  (`fromId`/`fromProperty`). `render-from-disk` accepts the runtime's `sourceId`/`sourcePort` too, the
  exporter does not — the first export run read "nothing opened" for that reason alone.
