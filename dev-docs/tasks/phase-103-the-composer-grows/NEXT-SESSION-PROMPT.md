# P103 — next session

**Written 2026-09-24 (s1, mid-session checkpoint).**

## Where it stands

Six of ten tasks are built, driven and committed on `cline-dev`, one commit each, in this order:
CMG-005 (`c9a028e49`), CMG-004 (`3eaada0b7`), CMG-001 (`917a9994d`), CMG-003 (`17f3ee813`),
CMG-007 (`81139f689`), CMG-006 (`ab563776b`). Every task file has a §6 *Built* section with what
each AC measured; every drive is `scripts/devtools/drive-cmg00N-*.js`; every spec is
`tests-unit/cmg-00N/`. Shots are in `shots/`.

Left, in order: **CMG-002** (＋ a token, copy a token, delete an added one — the reference
counter it builds is CMG-010's *Used by*), **CMG-008** (merged controls say when they leave the
Look), **CMG-009** (the token chip and one `{.}` everywhere), **CMG-010** (from the field to the
token and back), then **CMG-011** (Richard's drive; RC-8 still open).

## Do this

1. Read README §1, §2, §7, then the task you take. Re-measure a file:line pointer before you
   rely on it: several moved this session.
2. Drive on COPIES: `CMG Drive Tokens` (← `CMP-007 Richard Drive.before-0.3`, 142 stored tokens,
   46 real changes — RESET by the CMG-004 drive, copy it again), `CMG Drive Looks{,B,C}`
   (← `CMP-001 Composer Drive`: nine colour styles, a Text Look worn by 3, a Gamma Look worn by 0).
   🔴 Never swap a copy's files while the editor holds it open: the watcher adopts the change.
3. Commit through a temporary index with compare-and-swap (the memory recipe): the real index on
   this checkout is stale (hundreds of staged deletions that are not this phase's).

## Traps met this session

- `ProjectModel.findVariant(name, nodetype)` takes a node TYPE object, not a typename.
- The editor's own write of `nodegx.styles.json` used to read back as an external change
  (`hashProjectLevel` vs `JSON.stringify`); fixed in CMG-006 — Look undo works after autosave now.
- Opening a pre-0.3 project adds 8 typography tokens with no default (the 0.3 upgrade); they are
  *added*, never reset.
- `renderToStaticMarkup` can grade a core-ui component once `Icon` and `Collapsible` are mocked.
- A drive reading a rect inside a 0px `overflow: hidden` Collapsible still sees a height: use
  `elementFromPoint`.
