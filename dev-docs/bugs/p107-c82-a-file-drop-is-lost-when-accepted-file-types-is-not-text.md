---
id: P107-C82
title: A file drop is lost with nothing said when Accepted file types holds a value that is not text (a wired number, an object) — the drop handler throws before File, Files Dropped or Files Rejected
status: open
severity: medium
area: runtime / file drop on every visual node that has it (noodl-viewer-react/src/node-shared-port-definitions.ts `fileMatchesAcceptedTypes` :293-311, called from `onDrop` :1036-1068) — Text, Group, Image, Circle, Video
found: P107 NSP-016 s50, 2026-10-06
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.11 (the Text's runtime 10,000, seed 20732: two divergences, both shrunk to three steps — Accepted file types `{}` and `-1`, a PDF entered and let go in one frame)
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/Text.json "row C82 — Accepted file types wired a number is read as text: a PDF dropped is rejected (Files empty, Files Rejected); written as text after it, a PDF is taken (the runtime: the drop throws — no File, no signal)"
---

**What a person sees.** Someone drops a file on a drop zone. The zone's highlight goes off, and then nothing happens. No
file arrives, and neither Files Dropped nor Files Rejected fires, so the app can't even say "wrong file type". This happens
whenever the zone's Accepted file types input holds a value that is not text, for example a number or an object wired in from
another node.

**Where.** `fileMatchesAcceptedTypes` starts with `(accept || '').split(',')`. Any truthy value that is not a string has no
`split`, so it throws a TypeError. `onDrop` has already set the count to 0 and Is Dragging Over to false by then, so the drop
dies with the zone looking normal. False, 0, null and the empty text are falsy and fall back to blank, which takes every file.

**How to reproduce.** Play the scenario named in `regression:` on the runtime target
(`NSP_ONLY=Text npx jest test/node-spec/conformance.test.ts` in `packages/noodl-runtime`). It is a known row there
(`nonTextFileTypes`): the spec reads the value as text, so a PDF against `-1` is rejected, and the runtime sends nothing.

**Proposed fix (one line).** Read the value as text: `String(accept || '')`. A number then names a MIME type no file has,
and the drop is rejected out loud. The spec already says this. When it lands, remove the scenario's `row` field and the
matcher.
