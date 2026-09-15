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
