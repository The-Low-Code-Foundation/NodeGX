---
id: COMMUNITY-FOLDERDELETE
title: "Delete on a component that has child components (every multi-part prefab: Accordion, CRUD Screen, …) or on a plain folder does nothing: no dialog, no deletion, only a console line"
status: fixed
commit: ea4738dcd
severity: high
area: editor / components panel (`ComponentsPanelNew/hooks/useComponentActions.ts` `handleDelete`)
found: Community report via Richard, 2026-11-28. A builder cloned prefabs and found their Delete did nothing, while Delete on a component they had made opened the confirm dialog
regression: packages/noodl-editor/tests/components/folderDelete.spec.ts
evidence: "Found by reading the code: `handleDelete` returns at its first line for any row whose `node.type` is not `'component'` (`console.log('Folder deletion not yet implemented')`). `FolderItem.tsx` offers Delete on every folder row, component-folders included, and calls the same `onDelete`. A prefab with a sub-component lands as a component-folder: `library/prefabs/accordion/project/project.json` holds `/Accordion` and `/Accordion/Section`, `crud-screen` holds `/CRUD Screen` and `/CRUD Screen/Item Row`; a one-component prefab such as `confirm-dialog` (`/Confirm Dialog`) is a plain row and deletes normally. Already known as a gap in `dev-docs/tasks/phase-93-three-views-of-one-app/TVW-001-THE-PANEL-TELLS-THE-TRUTH.md` (lines 77 and 267), never logged as a bug."
---

**What a person sees.** Right-click a cloned prefab such as Accordion in the Components panel, choose Delete:
nothing happens. Same for any component of their own that has a child component under it, and for any plain
folder. Delete on a single component opens the "Are you sure…" confirm and works. It is not about prefabs: it is
about rows that have children, and most prefabs worth cloning have them.

**Where.** `packages/noodl-editor/src/editor/src/views/panels/ComponentsPanelNew/hooks/useComponentActions.ts`,
`handleDelete`:

```ts
if (node.type !== 'component') {
  // TODO: Implement folder deletion
  console.log('Folder deletion not yet implemented');
  return;
}
```

A component-folder row (`isComponentFolder`, e.g. `/Accordion` with `/Accordion/Section` under it) is
`node.type === 'folder'`, so it falls into that branch. Rename, Duplicate, Open and Make Home already accept
component-folders (`node.type === 'folder' && node.data.isComponentFolder`); Delete is the one action that does not.

**Workaround today.** Delete the children first (`Section`, then `Accordion` becomes a plain row and deletes), one
confirm each. A plain empty folder disappears on its own once nothing is in it.

**Proposed fix (small to medium).** Give `handleDelete` the folder case: collect every component whose name is the
folder path or starts with `<path>/`; refuse with the existing reason if any of them fails
`deleteComponentAllowed` (the home component, an annotation-locked one); confirm once naming the count
("Delete "Accordion" and 1 component inside it?"); remove them all under one `UndoActionGroup` so one undo brings the
whole set back. Never a silent return: if a case is still unsupported, say so in a toast. A spec next to
`tests/components/makeHome.spec.ts` can drive it without React, the way `makeComponentHome` was split out.

**Not covered by the fix:** what a prefab brought besides components (styles, tokens, a dependency module in
`noodl_modules/`) stays behind. That half is COMMUNITY-NOUNINSTALL.

**Fix, 2026-11-28.** `ea4738dcd` on `cline-dev`; shipping as editor 0.4.6 through PR #60 (`release/0.4.6` into `main`), not yet tagged or released. `ComponentsPanelNew/folderDelete.ts` plans and performs the delete:
`planFolderDelete` collects the folder's own component and everything under `<path>/`, deepest first, and refuses
the whole folder (a toast naming the child) if any of them fails `deleteComponentAllowed`. `folderDeleteMessage`
lists the children by name in a `showConfirmModal`, 12 at most, then "…and N more". The button counts the
components. `deleteFolderAsOne` removes them all into one `UndoActionGroup`. `handleDelete` in
`useComponentActions.ts` routes folder rows there instead of the `console.log`.

Graded by `tests/components/folderDelete.spec.ts`: 7 specs, green under plain jest (`npx jest --testMatch
'<rootDir>/tests/components/folderDelete.spec.ts'` from `packages/noodl-editor`). It has not been run under `test:ci`.
`tsc -p packages/noodl-editor` shows no errors in the panel.

Driven in the editor (`dev:debug`, CDP) on a scratch project holding the CRUD Screen and Accordion prefabs plus a
plain folder `Screens` with `One` and `Two`. The context menu's Delete was used each time:
- Accordion: "Delete component. This deletes **Accordion** and the component inside it: Section. Undo brings them
  all back." Button "Delete 2 components". On confirm both went, and both rows left the panel. Undo brought both back,
  and redo removed them again.
- Screens: "Delete folder. This deletes the folder **Screens** and all 2 components inside it: One, Two." Cancel
  left them in place. Delete removed both, and undo restored them.
- With `/CRUD Screen/Item Row` made home, Delete on CRUD Screen showed no confirm. The error toast read: "CRUD Screen"
  can't be deleted: "Item Row", inside it, is the home component. Make another component home first.
