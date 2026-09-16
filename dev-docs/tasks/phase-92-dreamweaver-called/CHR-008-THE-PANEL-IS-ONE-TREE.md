# CHR-008 — The panel is one tree

Thirty-nine files mount their own React root into a `div` a class made. Rows cannot align to
each other, a switched-off group says so six times, and the panel is thrown away on every click.
With CHR-007's descriptors in hand, the panel becomes what the node picker already is: one
component tree.

## 1. The person sentence

**Someone switching off Shadow sees one line say so and a `Turn on` button; someone typing in
Width and clicking another node and back finds the panel where they left it; and nothing on the
panel blinks when a value changes.**

## 2. What the code says (audit, re-read at HEAD)

- The mount chain crosses React → imperative → React → imperative → React
  (`SidePanel.tsx:468-489` → `index.tsx:57,62` `new PropertyEditorView` → `propertyeditor.ts:202`
  `buildShell` → `Ports.ts:775` `createRoot` → `PropertyGroups.tsx:45-54` `RowHost
  appendChild(el)` → each row's own `createRoot`).
- `sidebarmodel.tsx:76-86` `createPanel` returns **a new arrow function per selection**, so React
  sees a new component type and remounts. Three states escaped to module scope to survive it
  (`index.tsx:35 rememberedTab`, `propertyPanelViewState.ts:36-41`), and `SidePanel.tsx:84-101`
  additionally force-recreates the element on `nodeSelected`.
- In-place DOM patching to keep focus (`Ports.ts:363-377`); `z-index: 1000` on `focusin` cleared
  500 ms after `focusout` so dropdowns escape clipping (`:762-771`); a 5-attempt `settleScroll`
  (`:486-500`) because the element has no parent on first render; sticky filtering that needs two
  ancestors at `overflow: visible` (`propertyeditor.css:25-32`).
- `PropertyGroups.tsx:100-102` draws the chevron as text `▾` because importing `Icon` breaks the
  `tests-unit` runner.
- Panels are never re-parented because of legacy `Frame` hosting (`SideNavigation.tsx:111-118`,
  `SidePanel.tsx:159-169`); `LEGACY_HOSTING_PANELS` is empty.
- `PopoutGroup.ts:63-80` builds a second `Ports` and anchors it via `querySelector('button')` into
  the imperative `PopupLayer`.
- 15 shared widgets already exist in `noodl-core-ui/src/components/property-panel/` (2,246 LOC
  TSX); the 38 row classes each wrap one of them or a sibling.

## 3. Scope

1. **`<PropertyPanel node=…>`** — a function component that calls `describeRows` (CHR-007),
   groups by `groupKey`, and renders `<PropertyGroup>` → `<PropertyRow descriptor=…>` →
   `<Widget>` from the registry, where the registry now maps `WidgetId → React component`. The
   38 row classes are converted one widget at a time: each class's `renderReact()` body becomes
   the component; the class is deleted when nothing constructs it. `TypeView`, `PickerTypeView`,
   `WorkflowTypeView` go last.
2. **`PropertyRow`** owns what the four decorators did: `description` → a `title`/tooltip,
   `decoration` → the capability badge, `gate` → dimmed + the group-level line, `hint` → the hint
   slot. The four `utils/port*.ts` files become either helpers `PropertyRow` calls or are deleted.
3. **Group-level gating (R8).** A group whose rows all share the same `gate.by` renders **one**
   line — "Offset, blur, spread, inset and colour apply once Shadow is on" + `Turn on` — and dims
   its rows. A group with mixed gates falls back to per-row.
4. **Identity.** `createPanel` returns a stable component; the node is a prop; the panel is
   `key`ed by `componentInstanceId + nodeId`. `rememberedTab` and the view-state maps come back
   from module scope into a context that lives as long as the sidebar. The `nodeSelected`
   force-recreate in `SidePanel` goes.
5. **Focus and scroll.** Values flow through React state, so a parameter change re-renders the
   row that changed and leaves the focused input alone — `Ports.ts:363-377` and the `_portsHash`
   go. `focusGatePort` targets a `ref`. `settleScroll` goes: the `ScrollArea` is the parent from
   the first render. The `z-index` dance goes if `Select` renders through the popup layer (check
   — [[a-select-inside-a-modal-closes-the-modal]] is the same family).
6. **`PopoutGroup`** renders `<PropertyPanel rows=…>` inside the popup, no second `Ports`.
7. **`PropertyEditorView` (`propertyeditor.ts`) and `Frame` stop being used by the Properties
   tab.** `Frame` stays for any other panel that still needs it; the Ports tab (`PortsTab/`) is
   already React.
8. The chevron becomes `<Icon>`; the `tests-unit` problem is solved at its root with a jest
   `moduleNameMapper` for `Icon` (a stub that renders the name), so no component has to avoid it.

Out: the look (CHR-009). Font Awesome (CHR-010). `ComponentPortsView` (`componentports.ts`), which
wears `.sidebar-panel` too — file it if it needs the same treatment.

## 4. Acceptance criteria

1. **(person)** Select a Group; switch Shadow off. The Box Shadow group shows **one** sentence
   and a `Turn on` button and six dimmed rows — not six sentences. Click `Turn on`: the rows are
   live and the sentence is gone. Screenshots into `verdicts/CHR-008/<date>/`, both themes.
2. **(person)** Type `240` into Width, click the Page Router node, click the Group again: the
   panel is scrolled where it was, the same group expanded, Width reads `240`. Then type in Width
   and, with focus still in it, change Height via CDP on the model: Width keeps focus and its
   caret (measure `document.activeElement` and `selectionStart` before and after —
   [[a-theme-flip-does-not-apply-in-the-same-eval]] applies; read on the next tick).
3. `grep -rl "createRoot" views/panels/propertyeditor/` reads **≤ 3** (was 39: the panel root and
   any popout/portal host); `grep -c "extends ListenableView\|extends TypeView\|extends
   PickerTypeView\|extends WorkflowTypeView" -r views/panels/propertyeditor/` reads **0**.
4. CHR-001's eval on the same Group: element count **≤ 600** (was 1,125) and inline-styled
   elements **≤ 30** (was 250). The numbers go in the task file beside the before.
5. **Reverted arm** for the remount: with `createPanel` restored to returning a new function,
   AC2's scroll position is lost — proving identity was the cause and not the view-state map.
   ⚠️ **s9 measured this premise false (§7.1):** AC2's round trip already passed on 0.2.4 *with* the remount,
   because FB-017's view-state map restores scroll, Width and expansion. What the remount costs is the blink — so
   the arm that means something is: identity reverted ⇒ the in-between frames come back (§7.4: 0 → 8 / 4).
6. CHR-007's characterisation spec green unchanged (same rows, same order, same widgets); every
   `fb-017`/`fb-018`/`leg-005`/`property-editor` behavioural assertion green; `test:ci` at the
   floor; the `MutationObserver` blink check from [[cdp-keys-need-focus-emulation-on-the-same-connection]]'s
   family: zero attribute mutations on the focused input during a sibling's value change.

## 5. Traps

- 🔴 **`SidePanel` keeps every visited panel mounted behind `display: none`** and panels are never
  re-parented. `PropertyPanel` must not assume it is unmounted when hidden; timers and
  subscriptions pause on `hidden`, or they poll forever ([[prunePanels]] was the last fix in this
  family).
- 🔴 **The Properties tab shares one stored width with `components` and `PortEditor`** so the
  canvas does not jitter. Do not touch `useSidePanelLayout`.
- 🔴 **`ed.selectNode(null)` poisons the selection** and makes every node's panel render
  identically during a drive — filter nulls from `selector._selected` before reading
  ([[selectnode-null-poisons-the-selection-and-fakes-a-defect]]).
- ⚠️ `ColorType` embeds iro.js and reaches into its DOM (`colorpicker.ts:92` sets
  `.IroBox` radius by hand); `CurveType` is a `<canvas>` with 7 hex literals; `CodeEditorType` is a
  CodeMirror popout that is a portal. Convert these three **last**, each in its own commit, each
  with a drive — they are the ones where "already React inside" is least true.
- ⚠️ `Select` inside a `Modal` closes the modal; a `Select` inside the popup layer may do the same
  to a popout. Drive a `PopoutGroup` with an enum before declaring §3.6 done.

## 6. Built — s8 (2026-09-15), slice 1: R8 (§3.3, AC1), uncommitted

**Why this slice first.** Richard on s1–s4: *"everything in the tasks up to now still looks like shit"*; the
lesson filed after s4 is to put a visible surface in front of him early rather than sequence every foundation.
§3.3 (R8) is the one part of this task a person sees, and it does not need the 38 row classes converted: the
decision is data (CHR-007's descriptors) and the drawing is two small changes at the seam that already exists.
§3.1, §3.2, §3.4–§3.8 are **not built**.

### 6.1 What changed

- **`propertyeditor/model/groupGate.ts`** (new, import-free but types) — `groupGatesFor(rows)` answers which groups
  draw ONE line: every gate-decorated row in the group switched off by the **same** port under the **same**
  condition, **≥ 2** of them; rows with `tab` / `parent` / `popout` do not count (`renderParams` never decorated
  them). Sentence `<labels> apply once <condition>.` when `turnOn`, `… apply when …` otherwise.
- **`PortGateReason`** gains optional `condition` (the phrase after "applies when") and `turnOn` (one clause,
  `<boolean port> = true` — an enum, `!=`, `NOT SET`, `= false` or several clauses is not a single press). Both set
  by `reasonsForGatedPorts`; the per-row `sentence` FB-021 pins is unchanged.
- **`applyPortGate`** takes `quiet`: dimmed and inert as before, **no sentence, no link**, the sentence kept as the
  row's `title`; the dead-wire line is still drawn (a fact about that row's wiring).
- **`PropertyGroups.tsx`** — `GroupGateLine` (hook-free, exported): the sentence and one verb reusing
  `.property-port-gate-link`, `stopPropagation` so the click cannot fold the group; drawn under the heading while
  the group is expanded. `PropertyGroupModel.gate`.
- **`Ports.ts`** — `renderGroups` computes `groupGatesFor(this.rowDescriptors())` once; `renderParams(views,
  groupGates)` draws covered rows quiet; `groupGateLine()` maps `turnOn` → `Turn on` =
  `this.setParameter(gatePort, true)` (the undoable write every row uses), otherwise `Show <control>` =
  `focusGatePort`.
- **`propertyeditor.css`** — `.property-group-gate`, FB-021's notice rule spoken once.

### 6.2 Specs and their arms

- `tests-unit/chr-008/groupGate.test.ts` — rows rebuilt from the shipped catalog exactly as CHR-007's spec does:
  Group, Shadow off → **one** Box Shadow line covering the six ports, `turnOn`, sentence names the switch once;
  reverted arm (Shadow on) → no line; refusals (two switches, two conditions, one row, tab/parent/popout rows, no
  condition); enum reads "when"; `= false` is not `turnOn`.
- `tests-unit/chr-008/groupGateRender.test.tsx` — a quiet row: dimmed + `aria-disabled`, **no** sentence and link
  **beside a control row that has both**, title kept, dead wire still drawn; the line: one sentence, one verb, the
  verb acts and stops propagation.
- **Mutants** (`<s8 scratch>/chr008/mutants.sh`, backup → mutate → jest → restore → `cmp`): A — drop the shared-gate
  refusal → **3 red**; B — a quiet row appends its sentence → **1 red**; C — `turnOn` without `= 'true'` → **1 red**.
  All three restored byte-identical; unmutated **23 / 23**.

### 6.3 Readings (2026-09-15, tree `2c5c31fa2` + CHR-012 pass 3 + this slice)

- Full `tests-unit` **442 / 442 suites, 7,310 tests** (includes CHR-007's characterisation, unchanged, and every
  `fb-017` / `fb-018` / `fb-021` / `leg-005` assertion). `tsc -p packages/noodl-editor --noEmit` **EXIT=0**;
  `type` / `colors` / `tokens:css` / `icons:css` **EXIT=0**. `test:ci` seed 39393: **`2984 specs, 8 failures`**, the
  floor's eight by full name, 0 new.

### 6.4 The drive (AC1) — `verdicts/CHR-008/2026-09-15/`

Dev stack (`npm run dev`, `NOODLPORT=8674 NOODL_REMOTE_DEBUG_PORT=9333`, scratch profile), a **copy** of
`templates/story-engine` (`diff -rq` identical before opening; the drive refuses any other directory), `/Story/Passage`
→ the Group `psWrap` ("One passage", Shadow Enabled unset), selected by id. `gate.js`, one connection, 1368×900,
the verb pressed by a trusted `Input.dispatchMouseEvent` after `elementFromPoint` said it was reachable. EXIT=0.

| state | lines in Box Shadow | row sentences in it | dimmed rows | `boxShadowEnabled` |
|---|---|---|---|---|
| dark, Shadow off | **1** — *"Offset X, Offset Y, Blur Radius, Spread Radius, Inset and Shadow Color apply once Shadow Enabled is on."* + `Turn on` | **0** | **6** (each keeps its sentence as `title`) | unset |
| dark, after `Turn on` | **0** | 0 | **0** | **`true`** |
| dark, after undo | **1** | 0 | 6 | unset |
| light, Shadow off | 1 | 0 | 6 | unset |

Shots: `chr008-group-shadow-off-{dark,light}.png`, `chr008-group-shadow-turned-on-dark.png`,
`chr008-group-shadow-undone-dark.png`. Read with the images open: one amber-ruled line under the heading, the verb
beside it, six greyed rows under a live switch; after the press the rows are ordinary rows and Shadow Enabled
carries its set-dot. CHR-001 counted the per-row sentence **6×** under this switch at HEAD.

**What the same panel shows beyond Box Shadow** (measured, one eval on the open panel): `Scroll To Index` also gets
a line (two rows, one condition). `Scroll` keeps **five** per-row sentences — its rows share the switch
(`flexDirection`) but not the condition, which is §3.3's fallback working as specified. `Dimensions`, `Layout`,
`File Drop`, `Pointer Events`, `Scroll To Element` have one gated row each and keep their one sentence. 10
row sentences remain on the panel.

⚠️ **Recorded, not built:** `Scroll`'s sentences say `Show Layout` when the switch a person needs is `Enable
Scroll` — FB-021's `gatePortName` is the condition's *first* clause. A group line would inherit that; a better
target is the clause that is currently false.
⚠️ Element count **1,126** and inline-styled **250–251** on this Group are unchanged — that is AC4, §3.1's work.

### 6.5 Richard's condition on R8, and the rule it changed (after s8, same day)

> *"That's fine as long as we don't have another 'same error repeated on 5 lines successively' problem."*

**It was not met.** The panel §6.4 drove still printed five `Scroll` sentences on consecutive rows, and a census
over the shipped catalog (every node type at its defaults) found **13 groups** printing gate sentences on adjacent
rows: `Icon` ×7 (Button, Options, Text Input), `Scroll` ×5, `Border Style` ×10 (Group, Image, Label, Video,
Button, Text Input, Range thumb/track), `Image › Dimensions`. §3.3's "mixed gates fall back to per-row" is the
cause, so it is **superseded by the ruling**: a group with two or more switched-off rows prints **exactly one line**.

`groupGate.ts` now words that line in order of preference, from clauses `reasonsForGatedPorts` carries
(`PortGateReason.clauses` / `connective`, labelled; worded through the one exported `phraseCondition` so a row's
sentence and a group line cannot word a clause two ways — FB-021's per-row sentences are byte-identical):

1. same condition on every row → *"… apply once Shadow Enabled is on."* + `Turn on`;
2. AND conditions sharing clauses (necessary for every row) → *"… apply only when Enable Icon is on."* — `Turn on`
   when the shared part is one boolean clause; `Show …` travels to a shared boolean switch when there is one
   (`Scroll` → `Enable Scroll`, not `Layout`);
3. OR conditions sharing clauses (sufficient for every row) → *"Border Color and Border Width apply when Border
   Style is Solid, Dashed or Dotted."*;
4. nothing shared → *"… are switched off by Size Mode and Layout."*

Row labels and control labels are de-duplicated (five sides' `Border Color` is one `Border Color`). Every covered
row keeps its exact sentence as its tooltip.

**The gate:** `tests-unit/chr-008/repeatedSentences.test.ts` — every catalog node at defaults **and with each boolean
input switched on in turn** (the second level: `Enable Icon` on, then `Type` decides): **no group prints more than one
gate sentence**, beside a control that the population holds the three families by name, and that a group with
several switched-off rows is never silent. ⚠️ The catalog drops `tab`, so it can only over-count the panel.
**Arms:** D2 — the first build's rule (identical conditions only) → **10 red**; E — no label de-duplication →
**2 red**; both restored `cmp`-identical. (A first D arm did not compile and graded nothing — replaced, not counted.)
**Readings:** `chr-008` + `chr-007` + `fb-021` **9 / 9 suites, 116 tests**; full `tests-unit` **443 / 443 suites,
7,320 tests**, EXIT=0; `tsc -p packages/noodl-editor --noEmit` **EXIT=0**.

**Driven** (`verdicts/CHR-008/2026-09-15/lines.js`, same scratch copy, both themes, bundle confirmed carrying
`apply only when`): **most gate texts printed in any one group: 1.** On the Group `psWrap` — `Scroll` one line
*"Snap, Snap To Every Item, Show Scrollbar, Bounce at boundaries and Native platform scroll apply only when Layout is
not None and Enable Scroll is on."* + `Show Enable Scroll` over 5 dimmed rows (was 5 sentences); `Layout` one line by
rule 3 (*"Align Content and Horizontal Gap apply when Multi Line Wrap is On or On Reverse."*); `Box Shadow` unchanged.
On the Button `paPlay` — `Icon` one line *"Type, Image Source, Icon Source, Spacing, Placement, Size and Color apply
only when Enable Icon is on."* + `Turn on` over 7 dimmed rows (the census's ×7); `Dimensions` one line. Shots
`lines/lines-button-icon-{dark,light}.png`, `lines/lines-group-*`. ⚠️ The `scroll` shot framed the top of the panel
(Dimensions, Layout), not the Scroll group — the reading above is the DOM's.
`test:ci` **not re-run** for this change: 0 Jasmine specs import the gate modules, and the per-row sentences
`ModelProxy` stamps are byte-identical (`fb-021` green).

### 6.6 Owed on this task (as written after s8 — superseded by §7.6)

1. **Richard's look** at the four shots (R8 is his ruling; the wording *"apply once … is on"* is proposed, not ruled).
2. §3.1 (one tree, 38 row classes), §3.2 (decorators as props), §3.4 (identity — AC2, AC5), §3.5, §3.6, §3.8; AC3,
   AC4, AC6's blink check. `test:ci` at the floor.

## 7. Built — s9 (2026-09-15), slice 2: identity (§3.4), uncommitted

### 7.1 Measured first — and the task file was wrong about what identity buys

AC2 and AC5 were written on the premise that the remount is what loses the panel's place. **It is not, and has not
been since FB-017.** `verdicts/CHR-008/2026-09-15/identity.js`, run against the **installed 0.2.4** (a second
instance on private ports, no compile — `sidebarmodel.tsx`, `SidePanel.tsx`, `propertyeditor/index.tsx` and
`propertyPanelViewState.ts` are unchanged `v0.2.4..HEAD`, and FB-017's scroll restore `879f2f4c8` is inside `v0.2.4`),
on a copy of `templates/story-engine`, Group `psWrap`:

| round trip | panel element after | scroll | Width | expanded groups |
|---|---|---|---|---|
| A: type `240`, wheel to 900, select `psTitle`, select `psWrap` | **replaced** (old one disconnected) | **900** | **240** | same 19 |
| A2: the same through the Page Router (`/App` `app_router`) | **replaced** | **900** | **240** | same 19 |

So AC2's round trip **already passed** with the remount in place, and AC5's reverted arm ("with `createPanel`
restored, AC2's scroll position is lost") **cannot go red** — the view-state map, not identity, is what restores it.

What the remount *does* cost is the blink the person sentence names. Sampled on every animation frame and every DOM
mutation batch from the selection call (one reselect, 0.2.4): old panel at 2 ms → **blank from 47 ms** → rows at
**scroll 0** at 85 ms → **jump to 900 at 115 ms**. Counted as frames painted in a state that is neither the node being
left nor the node arrived at: **8** (A) and **4** (A2).

⚠️ AC2's focus half (arm B) is **vacuous on both builds**: a parameter changed on the model does not re-render any row
(`bindModel` hears `parametersChanged` only for hints), so there is nothing that could take the focus. It needs a
change that does re-render — undo is one — and belongs to §3.5. Recorded, not graded.

### 7.2 What changed

- **`sidebarmodel.tsx`** — `SidebarItem.followsSelection`; `createPanel` puts a `key` on the element: the panel id
  for a `followsSelection` panel, a per-creation key for every other panel (their remount, kept on purpose — `PortEditor`
  and the backend surfaces read state once from `model`).
- **`SidePanel.tsx`** — the four `React.createElement(component)` are `component()`. Handed to `createElement`, the
  factory *was the element's type* and is a new arrow per selection, so React threw the panel away on every click. The
  `nodeSelected` force-recreate is gone (`activeChanged` already rebuilds a transient panel's element).
- **`router.setup.ts`** — `PropertyEditor` is `followsSelection`.
- **`propertyeditor/index.tsx`** — a new node's `PropertyEditorView` is built and drawn **off screen** while the previous
  node's view stays up, and swapped in once its rows exist (`hasDrawnRows`: the ports root has children and no row host
  is empty; capped at 8 frames). The swap effect runs after `Frame` has placed the element, in the same flush: the
  previous view is **disposed** and the new one restores its offset. The header, comment and tabs read the node whose
  rows are **shown**, so the label cannot change frames before the rows do. `NodeLabel`, `NodeComment`, `PortsTab` and
  `AiChat` are keyed by node (they read the node once on mount and were only correct because of the remount); `Tabs` is
  keyed by whether `AI Chat` exists (it throws when its active id leaves the list). `rememberedTab` stays module state —
  it now only carries the choice across that re-key.
- **`Ports.ts`** — `restoreScroll()` (synchronous, for the swap); `dispose()` also detaches the scroll listener, because
  the next node's view now scrolls the **same** `ScrollArea` and a listener left behind would write that node's offsets
  under this node's id.
- By reading, not measured: before this, no `PropertyEditorView` was ever disposed on a selection change, so every
  visited node's `Ports` kept its model listeners. They are disposed on swap now. The view's other roots (variants,
  visual states, element style) are still not unmounted — as before.

### 7.3 Specs and arms

- `tests-unit/chr-008/panelIdentity.test.ts` (4) — two nodes → one type, one key, the node still arrives; control: a
  non-following panel gets a new key per selection; one creation = one identity (`SidePanel` builds the element twice);
  a rail panel keeps its identity across switching away and back.
- Mutants (backup → mutate → jest → restore → `cmp`): **A** key always per-creation → **1 red**; **B** no key → **1 red**
  (the control). Both restored identical; unmutated 4 / 4. ⚠️ The spec grades the model half only; `SidePanel` calling
  the factory is graded by the drive's reverted arm.

### 7.4 The drive — the fix, and its reverted arm, on one instrument

Dev stack (`npm run dev:debug`, `NOODLPORT=8674 NOODL_REMOTE_DEBUG_PORT=9333`, scratch profile), the same copy, the
bundle confirmed carrying the change before each run:

| build | A in-between frames | A2 in-between frames | panel root kept | scroll / Width after |
|---|---|---|---|---|
| installed 0.2.4 (control) | **8** (blank, then rows at 0) | **4** | no | 900 / 240 |
| **this build** | **0** | **0** | **yes** | 900 / 240 |
| **reverted arm R1** — `PropertyEditor` given a per-creation key, renderer reloaded | **8** (no editor element) | **4** | no | 900 / 240 |

R1 reproduces the 0.2.4 counts exactly on the build that reads 0 without it: identity is the cause of the blink, and
state survives either way. ⚠️ R1's first form (`'CHR008R1' && …`) did not compile (TS: always truthy), webpack refused
the reload, and it graded nothing — replaced by a compiling form, not counted. **Not measured:** whether the off-screen
wait is needed on top of identity (an arm with `setInstance` immediate) — skipped to spare a third ~95–195 s rebuild on a
loaded machine. Results: `identity-0.2.4-r3/`, `identity-fixed/`, `identity-reverted-R1/` (`identity-results.json`,
`identity.log`, before/after panel shots); `identity-0.2.4/` and `-r2/` are the metric's first two drafts (the first
frame after the selection call can already be blank, so "first state" must be snapped before the call).

### 7.5 Readings (2026-09-15, tree `65a3bd984` + this slice + the P88 peer's uncommitted files)

- jest `chr-008` + `chr-007` + `nat-012` + `fb-017` **15 / 15 suites, 205 tests**; full `tests-unit` **444 / 444 suites,
  7,324 tests**, EXIT=0 (s8's 443 / 7,320 plus this slice's one suite and four tests).
- `tsc -p packages/noodl-editor --noEmit` **EXIT=0**.
- `test:ci` seed 25271, `.webpack-cache` cleared, no stack: **`2984 specs, 8 failures`**, fresh `tests/test-results.json`
  23:47:42 — the floor's eight by full name (SUB-011 ×3, NDA-017 ×2, SUB-006 ×3), 0 new. The Jasmine
  `tests/nodegraph/propertyeditor.js` imports the changed `propertyeditor/index` and is green.

### 7.6 Not built in §3.4, and why

- **Keyed by `componentInstanceId + nodeId`** (as §3.4 was written) — **deliberately not.** A node-keyed panel is a
  remount per selection, which is the measured cost itself. The panel is keyed by its id; the node is a prop; the
  per-node children are keyed individually.
- **`rememberedTab` and the view-state maps into a sidebar context** — not built. Nothing measured asks for it: the tab
  now lives in `Tabs` across ordinary clicks (module state only bridges the `AI Chat` re-key), and the scroll map is
  per node and must outlive a node's view, which a panel-lifetime context would not improve.
- **§3.5 focus** — AC2's arm B graded nothing on either build (§7.1). A firing control (undo of a sibling while Width
  is focused) comes first.

### 7.7 Owed on this task

1. §3.1 (one tree, 38 row classes), §3.2 (decorators as props), §3.5 (focus, with a firing control), §3.6, §3.8; AC3,
   AC4, AC6's blink check.
2. Richard's look at s8's R8 shots is not pending (his condition was met and gated, §6.5); nothing in s9 changes a
   pixel at rest — the change is the absence of the in-between frames.

## 8. Measured — s10 (2026-09-16): §3.5, what a rebuild costs a focused field

Taken on the **packaged 0.2.4** (no compile; a second instance on `NOODLPORT=8674`,
`NOODL_REMOTE_DEBUG_PORT=9333`, scratch profile, a copy of `templates/story-engine`, Group `psWrap`).
`verdicts/CHR-008/2026-09-16/focus-0.2.4/` — `focus-results.json`, `focus-U-{before,after}.png`.

### 8.1 The reading

**A rebuild of the rows drops the focused field to `<body>` and takes the caret with it.** With `250`
typed into Width and the caret parked at offset 2, one **undo** (`__nodeGraphEditor.undo()`, the
Cmd+Z path):

| | rows replaced | focused element | `document.activeElement` | caret | scrollTop |
|---|---|---|---|---|---|
| **U — undo** (firing) | **yes**: 220 row mutations, marked row **disconnected** | **disconnected** | **`BODY`** | **lost** (`null`) | 39, kept |
| N — a write the panel never hears (floor) | no: marked row still connected | still connected | the Width `INPUT` | **2, kept** | 39, kept |

So §3.5's defect is real and person-visible — and note what it is **not**: the scroll offset survives
either way (FB-017's map), exactly as §7.1 found for the remount. What a rebuild costs is the **caret**.

### 8.2 🔴 Two instruments that graded nothing first, and why

s9 recorded that AC2's arm B was vacuous. **The first two attempts this session were vacuous the same
way, for a new reason worth writing down:** every candidate control wrote through
`NodeGraphNode.setParameter` **directly**. The value lands in `parameters` — the drive's own end
reading proves it — and **the panel never hears it**: the rows are bound to a `ModelProxy`, and
`Ports.bindModel` subscribes to `instancePortsChanged` / `modelParameterUndo`, not to a raw model
write. Readings across four candidates (`boxShadowEnabled`, `flexDirection`, `enableScroll`,
`opacity`): `rows` 83, `gatedWrappers` 18, `groups` 19, marked element connected — **identical in
every arm, including the negative control**. Flipping a gate port from outside the panel does not
even clear a dimmed row.

⚠️ **An arm that reads the same as its own control grades nothing**, and it costs a drive to notice.
The repaired instrument records `rowMarkStillConnected` / `rowMutations` **first**, and no claim about
focus is read unless the rebuild is visible in the DOM.

⚠️ A third arm (a real click on the `Shadow Enabled` checkbox, to see whether a ModelProxy-routed
write rebuilds) **also graded nothing**: the checkbox's `getBoundingClientRect().y` was **2213** in a
900px viewport, so the click landed outside the window. Whether a port-list change rebuilds the rows
is still **unmeasured** — scroll the target into view before trusting a coordinate.

### 8.3 What this decides for §3.1

The cure is §3.1 as written: values flow through React state, so a re-render reconciles the rows the
author is not looking at and **leaves the focused input mounted**. The measurement above is the arm
that grades it — the same drive, the same undo, expecting `widthIsFocused: true` and `caret: 2`.
A save-and-restore of `document.activeElement` around `renderGroups` would move the number without
the structure, and is deliberately **not** what this task builds.

## 9. Built — s10 (2026-09-16), slice 3: the rows are siblings in one tree (§3.1 scaffold, §3.2)

### 9.1 What changed

- **`components/PropertyRow.tsx`** (new) — one hook-free component drawing what three post-render DOM
  mutators used to: ERG-004's description as the row's `title`, BCN-010's capability wrapper, FB-021's
  switched-off wrapper (including R8's `quiet`). Plus **`ControlHost`**, which is separate *because* it
  needs hooks — a hook makes a component unrenderable by the `tests-unit` runner, so the hook-free half
  stays gradeable, the same split `PropertyGroups` makes for `GroupHeading`.
- **`Ports.renderParams`** returns `React.ReactNode[]` instead of decorated DOM elements, with
  `rowDescription` (ERG-004's 400-char cap) and `rowCapability` (BCN-010's **loud fail-open**: a gate with
  no sentence leaves the control live and logs, rather than dimming a control it cannot explain).
- **`PropertyGroups`** — `PropertyGroupModel.els: TSFixme[]` → `rows: React.ReactNode`, and **`RowHost` is
  deleted**: a group is now `<div className="properties">{rows}</div>`.
- **`capability-gating/portDecorationClasses.ts`** (new) — the three class names, import-free;
  `portDecoration.ts` re-exports them so every existing importer is untouched.

### 9.2 Two traps this hit, both worth keeping

🔴 **`.property-row` was already taken.** `propertyeditor.css:98` makes it `display: flex` with
`> .property-label` / `> .property-value` child rules, and `CodeEditor/Property.tsx` renders it. Naming the
new wrapper that would have laid every row out as a flex container *and* nested a same-named row inside
itself. It is `.property-panel-row`; the host is `.property-row-control`. Both carry no rule today, and
neither does `.properties` — which is what makes this conversion layout-neutral.

🔴 **Importing three constants pulled in the editor's singletons.** `portDecoration.ts` imports `./index`
for `gateSentence`, which reaches `projectmodel` → `bugtracker`, which reads a user-data path at module
scope. The new spec died on `Cannot read properties of undefined (reading 'join')` — a failure that looks
nothing like its cause, and the same wall CHR-007 hit from `Ports.ts`.

### 9.3 Specs and arms

`tests-unit/chr-008/propertyRow.test.tsx` (21) — the cases are taken from `fb-021/portGate.test.ts` and
`property-editor/portDescription.test.ts` **verbatim and re-asked of the component**, so this is an
equivalence rather than a description: a row that had quietly lost its `aria-disabled`, its `data-test` or
the rule keeping the dead-wire line outside the dimmed control would pass a spec that merely asserted the
classes exist.

**Mutants** (backup → mutate → jest → restore → `cmp`, restored byte-identical): **A** a quiet row draws its
sentence again → 1 red; **B** the quiet row's tooltip dropped → 1 red; **C** `title={description}` instead of
`|| undefined` → 1 red; **D** a `degraded` gate dimmed after all → 1 red.

⚠️ **Arm C first graded NOTHING and read as a pass.** My mutant table was `|`-delimited and the mutated
expression contains `||`, so the shell split it mid-expression, wrote garbage into the file, and the suite
failed **to run** — `Tests: 0 total`, which is indistinguishable from a clean arm at a glance. Re-run properly
it reddens. A non-compiling arm grades nothing, and a delimiter that occurs in the payload is how one is made.

### 9.4 Readings (2026-09-16, tree `32e216f55` + this slice; the P88 peer's files left alone)

- `tsc -p packages/noodl-editor --noEmit` **EXIT=0**.
- jest `chr-007` + `chr-008` + `fb-015` + `fb-017` + `fb-018` + `fb-021` + `fb-022` + `leg-005` +
  `property-editor` + `def-036` + `rel-014`: **37 / 37 suites, 593 tests**, EXIT=0 — CHR-007's
  characterisation unchanged, every FB-017/018/021, LEG-005 and DEF-036 assertion green.
- Full `tests-unit`: **445 / 445 suites, 7,345 tests**, EXIT=0. s9 read 444 / 7,324, so the delta is
  **exactly** this slice's one suite and its 21 tests: nothing else moved.

### 9.5 Owed, and what this slice deliberately does NOT do

1. **§3.5 is not fixed by this slice, and must not be reported as fixed.** A rebuild still tears the rows
   down, so §8's undo arm still loses the caret — re-driven on this build and unchanged (§9.6). The cure is
   the *widgets* holding their values in React state (§3.1's row conversion), which is what lets a
   re-render reconcile instead of rebuild.
2. **AC3 and AC4 move the wrong way first, by design.** No widget is converted yet, so `createRoot` still
   reads 39, and `.property-panel-row` + `.property-row-control` add **two elements per row** — measured,
   CHR-001's 1,126 → **1,241**. Each converted widget removes its own `createRoot` *and* its host.
3. The structural hint is still drawn by `applyPortHint` rather than by React, deliberately — see §9.6's
   ⚠️, and `settleHints`'s note. Putting React in charge of a node `refreshHints` also removes is the
   worse bug.
4. **A true before/after census was not taken.** The packaged 0.2.4 is *not* a clean before arm for this
   slice: s8's R8 and s9's identity work sit between it and HEAD, which is why its `gateReasons` reads 18
   against this build's 4. A real before arm needs a dev rebuild at `32e216f55`.

### 9.6 The drive — and the regression it caught after the code was already committed

🔴 **The first commit of this slice (`627f1a0cc`) shipped a half-broken FB-017 AC4.** jest was green,
`tsc` was green, and the feature was drawing nothing on one of its two paths. This is why the phase rule
says a jsdom spec is not a look.

Dev stack (`npm run dev:debug`, `NOODLPORT=8674`, `NOODL_REMOTE_DEBUG_PORT=9333`, scratch profile), a copy
of `templates/story-engine`, bundle confirmed carrying the change before each run. Scripts and results:
`verdicts/CHR-008/2026-09-16/` — `census.js`, `hint.js`, `hintwhy.js`, `open.js`.

**What the hint drive found** (`hint-after/`), on Group `psWrap` (3 children, unclipped, radius 40):

| path | hint notes drawn | |
|---|---|---|
| live — type `40` into Corner Radius | **1**, row not rebuilt | ✅ |
| render — select away, select back, radius still 40 | **0** | 🔴 the note is gone |

**Why**, from a frame-by-frame trace of the reselect (`hintwhy.js`): the marked rows arrive at
**t = 60 ms**, and `renderGroups` had scheduled its hint pass as a bare `setTimeout(0)` — which fires
*before* React commits, queries `[data-hint-ports]` against a panel with no rows in it, and does nothing.
The live path worked precisely because its rows were committed by an earlier render. A control arm ruled
out the other candidate: re-rendering the same node (a group toggle) kept the note at 1 throughout, so
React was never wiping it.

**The fix** is `Ports.settleHints()` — the same bounded retry, for the same reason, as `settleScroll`
directly below it, whose comment already records that the first render of a newly selected node runs
before the panel is mounted. ⚠️ `applyPortHint` stays the **one** thing that draws a note in both paths:
drawing it from `PropertyRow` would put React and `refreshHints` in charge of the same DOM node, and
`applyPortHint` removes any note it finds before adding one.

**Re-driven after the fix** (`hint-fixed/`), all three FB-017 AC4 states: live **1**, render **1**,
condition cleared (radius → 0) **0**.

**The rest of the drive, all EXIT=0:**
- **Census** (`census-after/`, Group `psWrap`, both themes): 19 groups, 83 rows, 18 gate wrappers,
  inline-styled **250** (unchanged), font sizes **2** (11 / 12), 63 `.property-panel-row` each with a
  **filled** control host (`emptyControlHosts: 0`), elements **1,241**. R8 intact: **at most one gate text
  per group**, Box Shadow's line and verb unchanged.
- **Identity** (`identity-after/`): in-between frames **0** on both arms — s9's blink fix survives this
  slice, which was a real risk because `hasDrawnRows` now sees a wrapper rather than a bare row.
- **Focus** (`focus-after/`): unchanged from §8 — undo rebuilds (220 mutations), the focused input goes
  disconnected, `activeElement` lands on `BODY`, caret `null`; the floor arm keeps focus and caret at 2.

### 9.7 Readings after the fix (2026-09-16)

- `tsc -p packages/noodl-editor --noEmit` **EXIT=0**; full `tests-unit` **445 / 445 suites, 7,345 tests**,
  EXIT=0. ⚠️ §9.4's identical numbers were taken *before* `settleHints` and did not cover the shipped code
  — no spec in this repo can see the commit-timing defect the drive found, which is the point.
