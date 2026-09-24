# CMG-006 — Edit a Look from Styles

**Opened 2026-09-24** from Richard's drive of P102 (README §2, findings 6a and 6b).
**Status: ✅ built 2026-09-24 (s1)** — 13 specs green, 13/13 drive arms green on a fresh copy. §6 has what was
built, what each AC measured, and two defects the drive found under it (one of them ate every Look undo).

## 1. The person sentence

> **Someone sees a Look in Styles and changes it there, whether or not anything wears it yet. From
> a node wearing a Look, one press takes them to that Look in Styles. The editor calls it a Look
> everywhere.**

## 2. What is wrong, measured

*"When I save a 'Look', it appears in the style tab, but I can do fuck all with it. If I figure
out that I can edit it in the 'Look' dropdown on a node, I click edit and it says 'Edit variant'.
I guess this is ok, but we need a link between what we see in the styles tab and what's in the
Look editor on node props. I guess you could use the 'used by' menu to find a node that has the
look, then click to edit it, but that feels weird."*

- **Styles side.** [`LooksSection.tsx:17-21`](../../../packages/noodl-editor/src/editor/src/views/panels/StylesPanel/components/LooksSection/LooksSection.tsx#L17-L21)
  says it outright: *"This surface renames, deletes and counts."* Each Look is a `StyleRow` with
  Rename (`:65-76`), Delete (disabled while worn, `:78-88`) and a *Used by* chip whose rows select
  the wearer (`shared.tsx:161-188`, `useGoToWearer`). No Edit. The empty state (`:95-100`) sends
  people to a node's Look menu.
- **Node side.** The Look row
  ([`variantseditor.tsx:98-169`](../../../packages/noodl-editor/src/editor/src/views/panels/propertyeditor/components/VariantStates/variantseditor.tsx#L98-L169))
  has **Edit** (`onEditVariant`, `:219-227`), which puts the same property panel into variant mode
  (`propertyeditor.ts:76-81` → `ModelProxy.setEditMode('variant')`; from then on reads and writes
  go to `node.variant`, `modelProxy.ts:92-109`).
- **"Edit variant"** is hard-coded at `variantseditor.tsx:140-143`, missed by the rename noted at
  `:10-13`. Three toasts still say *Variant* (`:202`, `:208`, `:214`). `grep -rn "ariant"` over
  user-visible strings will find more.
- **No link either way** between the Styles Look row and the Look editor.
- **The seam.** Look editing always goes through a node's `.variant`. `VariantModel` can already
  give its ports and parameters without a node (`VariantModel.ts:119-150`). `PropertyEditor`
  (`propertyeditor.ts:41-51`) and `ModelProxy` (`modelProxy.ts:82-91`) are built around a node.

## 3. What to build

1. **Edit on every Look row in Styles** (the row's ⋯ menu, and a click on the row's name). It opens
   the Look's fields. 🔴 It must work for a Look **nothing wears**: that is the empty-state case,
   and the one Richard hits right after saving a Look and deselecting the node. So *"select the
   first wearer and switch to edit mode"* is not enough on its own.
   - **Recommended:** a Look-only host. An adapter with `ModelProxy`'s surface whose `variant` is
     the `VariantModel` and whose `type` comes from the Look's node type, mounted as a `Ports` view
     in edit mode `variant`. Open it as a drawer in the Styles panel, or in the property panel's
     slot with a header saying which Look it is. Pick one and say why in this file.
   - While editing, the header says **"Editing the Look *Card* · worn by 14 nodes"** (the count
     comes from the existing *Used by*), so nobody thinks they're changing one node.
2. **Node → Styles:** the node's Look row gets *Show in Styles* (`revealStyle({ kind: 'look',
   name })`, CMG-005).
3. **Words:** every user-visible *variant* becomes *Look*: the edit header, the toasts, tooltips.
   `grep` the property editor, the Styles panel and `PickVariantPopup.tsx` for user-visible
   strings; don't touch identifiers, file names or the project format.
4. When editing from Styles changes a Look, every wearer on the canvas updates. This is already
   true for the node-side edit; measure it for the new host.

## 4. Acceptance criteria

1. Save a Look from a Group, deselect everything, open Styles → Looks → *Edit*. Change its
   background. A second Group wearing it changes on the canvas. The saved `nodegx.styles.json`
   `variants` entry holds the new value.
2. The same on a Look with **0** wearers: the fields open, the change is saved, and a Group that
   then picks the Look wears the new value.
3. From a node wearing *Card*: *Show in Styles* → Styles is showing, Looks is open, the *Card*
   row is on screen and highlighted.
4. `grep` for user-visible *"ariant"* strings in the property editor and Styles panel returns only
   identifiers. A list of what was renamed goes in this file.
5. One undo step per field change in the Look-only host, the same as the node-side edit.
6. 🔴 The existing node-side Look edit still works exactly as before (a drive, not a spec: it is
   the path people use today).

## 5. Watch for

- Looks carry per-visual-state values (hover/pressed). The node-side editor shows states. The
  Look-only host either shows them too or says *"States: edit on a node"*. Don't drop them silently.
- Deleting is disabled while worn. Keep that rule in the new host.

## 6. Built (s1, 2026-09-24)

**The host, and why it is the inspector.** `views/panels/LookEditor/LookEditorPanel.tsx`, registered
as a transient sidebar panel like Properties (`router.setup.ts`) and put in the inspector by a new
`SidebarModel.showInInspector(id, props)` — the same slot `switchToNode` uses, so a Look's fields are
edited where a node's are (P101 INS-001), beside the Styles list that opened them. The seam is the
one §2 named: a **detached** `NodeGraphNode({ type: typename, variant: name })` with no owner, the
property panel's own `ModelProxy` in `editMode 'variant'`, and the same `Ports` view mounted in the
property editor's shell (so the rows and the edit-mode tint are the property panel's). Every write
lands on the project's `VariantModel` through `setParameter(…, { undo: true })` — one undo step per
field, `variantParametersChanged` to the viewer and the autosave, exactly the node-side path with the
node taken out. Visual states are drawn with the node side's `VisualStates`. Header: *Editing the
Look **Card** · Group · worn by 14 nodes* (or *worn by nothing yet*), *Show in Styles*, *Done*, and
a line saying the change reaches every wearer. A Look renamed or deleted under the host says so.

**Styles side.** The Look row's name is a button (*Edit the Look X*) and the ⋯ menu has *Edit*.
**Node side.** The Look row has *In Styles* → `revealStyle({ kind: 'look', name, typename })`.

**Words.** *Edit variant* → *Editing the Look*; the three toasts; the undo labels (*Change Look*,
*Create a Look*, *Update Look*, *add Look*, *rename Look*, *set Look state transition* ×2); the
conflict warning and the four merge-conflict warnings. `tests-unit/cmg-006/look-editor.test.ts`
reads the string literals and JSX text of eight files, comments stripped, identifiers excluded by
shape (event names, the edit mode, warning keys, class names, `${…}` interpolations, paths).

**🔴 Found under it, fixed, both pre-existing:**

1. **`findVariant(name, typename)` never found anything.** `ProjectModel.findVariant` takes a node
   TYPE object (it reads `nodetype.localName`); `LooksSection.onRename` handed it the typename
   string, so renaming a Look to a name another Look of the same type had was never refused. Both
   callers now use `findLook(project, typename, name)`.
2. **A Look edit could not be undone once the autosave had landed** — node side too. `hashProjectLevel`
   hashed the built styles object, where a Look that never set one carries `stateParameters:
   undefined`; `JSON.stringify` drops the key on the way to disk, `stableStringify` did not. So the
   baseline recorded at the editor's OWN write never matched the file read back, the watcher's
   decision was `reload`, the slice replaced every `VariantModel` from disk, and every undo closure
   written before that pointed at a dead object. Measured: same object at 1.5 s after a write,
   replaced at 3 s; undo then wrote `0.42 → (old object)` and the project kept `0.42`. Fix: the
   hash takes one JSON round trip so both sides are in disk space (`own-write-echo.test.ts`, 5
   arms). And, for a genuine external slice, `applyProjectLevelSlice` now re-points every node's
   cached Look (`updateVariantRefs`), which it never did — a wearer read a Look nobody wrote to any
   more.
3. `NodeGraphNode.isPortConnected` read `this.owner.connections` unguarded: a node with no graph
   threw. Guarded (no graph, no connections).

**§4 measured** (`scripts/devtools/drive-cmg006-look-editor.js` on a fresh copy *CMG Drive Looks C*
← *CMP-001 Composer Drive*: a Text Look worn by 3, a Gamma Look worn by 0):

| AC | reading |
|---|---|
| 1 | nothing selected (inspector empty), Styles → Looks → *Drive Look*: inspector `LookEditor`, header *worn by 3 nodes*, 51 inputs, Styles still active on the left. Opacity `null → 0.42`: undo location `0 → 1`; all 3 wearers resolve `0.42`; `nodegx.styles.json` holds `0.42` (polled, the autosave lands 1–3 s later); the preview shows 10 elements at opacity `0.42` (3 wearers, their inner elements). Shot `shots/cmg006-ac1-look-editor-from-styles.png` |
| 2 | *S27Variant* (0 wearers): fields open (13 controls), *worn by nothing yet*; its `tag` field written to the model and on disk; a fresh node of that type given the Look reads the new value. Shot `shots/cmg006-ac2-unworn-look.png` |
| 3 | a wearer selected, *In Styles*: Styles active, Looks open, the *Drive Look* row in view and highlighted. Shot `shots/cmg006-ac3-in-styles.png` |
| 4 | spec: eight files, zero spoken *variant*; the header says *Editing the Look* |
| 5 | one `undo()` puts opacity back to `null` — after the autosave, which is the case that used to fail |
| 6 | the node-side *Edit* still switches the property panel into Look edit mode, tinted, header *Editing the Look*. Shot `shots/cmg006-ac6-node-side-edit.png` |

**Not built:** deleting from the host (§5: deleting stays on the Styles row, disabled while worn).
