---
id: P107-C53
title: Open File Picker — clearing Capture after an Open that used it still opens the camera
status: fixed
commit: a664d36b4
phase: P109
task: ISL-030
severity: medium
area: viewer / Open File Picker (`openfilepicker.ts` :141-145 — `capture` assigned only when truthy, on a reused element)
found: P107 (the node says what it does) s31, 2026-10-03
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/Open File Picker.json "C53: Capture cleared after an Open that set it — the next dialog no longer asks for the camera (v2)" (and "C53 through a superseding Open: …")
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-014-BATCH-DATA-AND-CLOUD.md §6.31–§6.32 (row C53); scenarios "C53: Capture cleared after an Open that set it — the next dialog still asks for the camera" and "C53 through a superseding Open …" (packages/nodegx-node-spec/scenarios/Open File Picker.json); measured on the runtime target with the world's file input (the `picker` event of the second Open reads `capture: "user"`)
---

Open File Picker makes ONE file `<input>` when the node is made and reuses it for every Open (:43-51, for Safari). On
each Open it copies its inputs onto the element (:141-145):

```ts
input.accept = this._internal.acceptedFileTypes;
if (this._internal.capture) {
  input.capture = this._internal.capture;
}
```

`capture` is assigned only when it is truthy, and nothing ever removes it. So once an Open has run with Capture set
(`user` or `environment`), setting Capture back to blank does nothing to the element: every later Open still carries
`capture="user"`, and a phone keeps opening the camera instead of the file list.

Measured s31 on the runtime target (the world's file input records what the element holds at each click):
Capture `user` → Open → `{ capture: "user" }`; Capture `''` → Open → still `{ capture: "user" }`. The same through a
second Open that superseded a first. Graded by two scenarios, on seeds 20729 and 13 and at 10,000.

The reachable case is one node driven two ways — a "Take photo" and a "Choose file" button wired to the same picker
with Capture switched between them. The second button never gets the file list after the first was used.

**Plain words:** *"If an app uses one Open File Picker for both 'take a photo' and 'choose a file', switching it back
to 'choose a file' doesn't work once the camera has been used — the phone opens the camera every time. Fix it so
clearing Capture really clears it?"*

**Proposed:** assign `capture` on every Open, removing the attribute when Capture is blank
(`if (capture) input.capture = capture; else input.removeAttribute('capture')`). A spec v2 (the element's `capture`
follows Capture as held).

**Ruling:** R3 (a) — the runtime wins until Richard rules.

**Ruled 2026-10-05 (Track F rulings page), as recommended: "Fix it".** Each Open sets Capture as it stands and removes it when blank. A two-line change. Nobody relies on the camera sticking. The question as asked: *"Should clearing Capture make the next Open show the file list again?"* (https://claude.ai/artifact/CPcSy8ABRQpn2dMZYuvXDH)

**Fixed a664d36b4 (P109 ISL-030, 2026-10-06), as ruled, with D27.** Every Open sets Capture as it stands and removes the attribute when it is blank (removed, not set to '': an empty capture attribute still asks some phones for the camera). Open File Picker v2.
