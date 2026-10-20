---
id: P112-OWN013-UPDATEBEHIND
title: "Inside a project the update dialog opens behind the editor: only a dimmed title bar shows, and \"New version available\" toggles a dialog nobody can see"
status: fixed
phase: P112
task: OWN-013
severity: high
area: editor / update (`views/UpdateManager/UpdateManager.tsx` mounted first in `views/windows/BaseWindow/BaseWindow.tsx`; `BaseDialog`'s fixed root has no z-index)
found: P112 OWN-013 G8, 2026-10-14 (a copy of the installed 0.3.0, offered 0.4.0 by its own updater)
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-013-THE-0.4.0-CUT.md §13
commit: 2925e3e74
---

**Measured** on a copy of `/Applications/NodeGX.app` (0.3.0) with its own profile, Deadline Desk open, the updater at
`available` → 0.4.0:

- The dialog auto-opens (`UpdateManager`'s effect) and is laid out at 423,71, 522×758, opacity 1, enter animation
  finished. `elementFromPoint` at its centre returns the canvas; the screenshot shows the editor with only the title
  bar dimmed (the backdrop shows where nothing positioned covers it).
- Clicking **New version available** closes it (the click lands on the backdrop) and a second click opens it again,
  still invisible. From inside a project a 0.3.0 user cannot see the dialog that updates them.
- **Control:** the same dialog on the **launcher** (`ProjectsPage` mounts `UpdateManager` last) shows whole and
  unprompted. So 0.3.0 users can update from the launcher, not from a project.

**Cause:** `BaseWindow` renders `<UpdateManager>` before the `VStack` that holds the panels, and BaseDialog's root is
`position: fixed` with `z-index: auto`, so every positioned panel paints over it.

**Fix (`2925e3e74`):** the dialog is wrapped in its own layer, `position: relative; z-index: 1000` (the progress
pill's). Driven before committing, on the 0.3.0 copy, by inserting that exact wrapper around the live dialog: hit test
inside the dialog `false` → `true`, and the screenshot shows the whole dialog over the editor.

**Who still has it:** every installed 0.3.0 and 0.4.0. It ships with the next editor release, so 0.4.0 users updating
to 0.5.0 from inside a project will meet it once more. The launcher route works for both.

No unit test: jest here grades React output, not paint order. The drive is the evidence.
