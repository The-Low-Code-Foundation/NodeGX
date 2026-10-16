# Phase 123 — next session prompt

**Written 2026-10-16 by Fable 5.1 after s1** (the phase scoped and built in one session, from Richard's "let's just
take a run at it"). Read BRIEF.md (his words, five assumptions), the README (§3 what each tab does and how it was
measured, §4 where it stops, §5 findings, §6 rulings), LOOK.md, then PLAYTEST.md. The board lists P123 in §4 (parked,
a prototype): **it opens only for Richard's sitting, or when he says it takes a lane-2 slot.**

## What exists

- `editor/open-bubble.html` + `editor/serve.mjs`: the editor and its server (plain `node`, no install).
- `editor/cdp.mjs`: a headless-Chrome driver; `editor/check.mjs`: the gate, **PASS 17/17** at s1.
- `look/`: four screenshots from a drive on a copy of Puppy test 3 (the copy, its backend and the drive scripts were
  in the session scratchpad and are gone; the gate rebuilds the same on `templates/todo-list`).

## To run it

```sh
npm run build:editor:_viewer                                           # the deploy runtime, if missing
npm --prefix packages/noodl-preview run build                          # the in-page preview bundle
dev-docs/tasks/phase-112-your-own-nodegx/prototype/real/build.sh       # look.js and specs.js (gitignored, Orbit's)
cd dev-docs/tasks/phase-123-open-bubble/editor && node check.mjs       # the gate
node serve.mjs /path/to/a/COPY/of/a/project --port 47900               # then open http://127.0.0.1:47900/
```

A copy, never the real project (memory: *open a copy of a real project in the editor*). Bind the copy to a backend
of its own: `node packages/nodegx-backend/bin/nodegx-backend.js serve --data-dir <dir> --port <p> --token <t>
--backend-id <id> --ephemeral`, then set `metadata.cloudservices` in the copy's `nodegx.project.json` to
`{ endpoint: "http://127.0.0.1:<p>", appId: "<id>", instanceId: "<id>", type: "nodegx" }`. Puppy test 3's own
binding points at a port another backend now holds (README §5, STALEBIND).

## If Richard sits with it (PLAYTEST.md)

Write his words and every "in Bubble I would…" into PLAYTEST.md as he says them; each becomes a README §5 row. Ask
R1–R3 (README §6) with the page open, not before.

## If he says it takes a lane

Then it is an OWN-008 stranger built by us, and the first tasks are what §4 names: the expression composer (or the
ruling that a Function node is it), inserting a step between two, branches added not only read, privacy rules from
`nodegx.security.json`, and the editor-side ports (P123-S1-EDITORPORTS) moved into a kit package so no editor invents
them a fourth time. Run the editor suite's adapter against it (`@nodegx/project-contract/editor-suite`, OWN-006) before
any of that: the eight edits are re-implemented in the page from `editor-suite/edits.ts` and a PASS would say they
match.

## Uncommitted at the end of s1

Nothing of this phase: the folder, the board line (§4) and the memory were committed by s1. The peers' piles in the
working tree are theirs.
