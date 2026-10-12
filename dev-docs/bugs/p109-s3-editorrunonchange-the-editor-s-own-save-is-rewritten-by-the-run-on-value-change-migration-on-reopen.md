---
id: P109-S3-EDITORRUNONCHANGE
title: A Function a person wires Run on in the editor stops running on value change after the project is reopened — the editor saves no runOnChange key, and the load-time migration writes false
status: scheduled
phase: P109
task: ISL-018
severity: medium
area: noodl-editor save + nodegx-project-contract run-on-value-change migration
found: P109 s3, 2026-10-02 (ISL-018 AC2, driven in the dev editor on a throwaway profile)
evidence: dev-docs/tasks/phase-109-the-defects-the-island-found/ISL-018-WHAT-THE-DOOR-WRITES-IS-WHAT-THE-EDITOR-SAVES.md §8 s3
---

F25 measured the door's side (a project an agent builds is rewritten on first open). This is the editor's own side,
measured: wire Button `onClick` → a Function's `Run`, where the Function's input is fed — the autosave writes no
`runOnChange-in-<input>` key; reopen the project and the migration writes `runOnChange-in-<input>: false`. Before the
reopen the Function runs on every change of its input (the box's default); after it, on `Run` only, and the panel shows
the box unticked as though the person had done it. The fix needs ISL-018 §5's ruling (settle at save, or a project
marker the migration reads).
