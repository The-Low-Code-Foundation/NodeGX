# The next session on Phase 124 — the mystery of the backend

**Written 2026-10-21 by s3 (Opus 5.5).** Say which model you are in your first message. Read first: `README.md` §0,
§3 (the think), §7 (the rulings), §8 s3; `LOOK.md` §s3; `BRIEF.md` §s3 (Richard's words). Then `dev-docs/BOARD.md`
§4's P124 row.

## Where it stands

- Three rounds. s1 and s2: an Opus stranger built the backend map from the npm kit (screens → functions → tables,
  locks and shields, *Is it secure?*, live runs, a grant that writes the backend and the file; then real people, a
  pathway run as them, one row's reach). s3, by hand: **what one person can reach, row by row**, after Richard saw
  every person light every table (`P124-S3-LENSBYNAMING`, fixed). A learner now reaches a little (Jo 2 of 289 rows,
  Marie 37), staff a lot (261), someone not signed in nothing; *Who sees how much?* ranks them; a table's rows come
  first in its panel, the person's lit, and *Who can access this?* plays out person by person.
- **It is public:** https://nodegx.io/backend-map/, a recording of a copy of the training backend (`static/`), with a
  card on /demos/ and the section on /your-own-editor/ (nodegx-web `592786b`, deployed 2026-10-21).
- `editor/test/people.test.mjs`: 34/34 on a fresh copy (it now runs from the repo: `test/copies.mjs` falls back to
  `templates/digital-bricks-training`). The other tests in `npm test` were not run in s3.
- **Richard has not seen round 3 yet.** That is the next thing.

## What to do first: show him round 3, live or public

Public: https://nodegx.io/backend-map/ (no backend needed). Live, on this laptop, if s3's copy is still running:
http://127.0.0.1:5197/ (backend copy on 8655; `lsof -nP -iTCP:5197 -sTCP:LISTEN` / `:8655`). If not, the s1 handoff's
three commands start a fresh copy; run `server.mjs` from `editor/` after `npm install` (node_modules are not kept).
🔴 The map Richard had open in s2 (port 5192, backend 52050) runs the **s2 code from s1's scratchpad lab**, not this
folder: it still lights every table. Point him at 5197 or the public copy, not 5192.

Write his words verbatim (BRIEF.md). Ask the two open §7 rulings with the screen open, in plain words: where it lives
(a kit page or a Studio tab), which backend to judge it on next.

## If he asks for more

Ranked by what the think and his words point at:

1. **The real app beside the map** (README §3.3): a click in the app sends the pulse. The live map already streams.
2. **A reach for a role, not a person** ("staff can see lots, but not as much as an admin"): the training backend has
   one role and no admin; a second role needs a backend that has one (lingo, or a role added to the copy).
3. **Writes**: what a person can *change* is listed, never run. A dry run of a write needs the backend's help
   (README §5); do not run writes against a real backend.
4. Re-record the public copy after any change to the map or the template: `node static/record.mjs --app <copy>
   --backend <url> --token-file <file> --out <dir>` then `node static/build.mjs --data <dir> --out
   ~/vscode_projects/nodegx-web/site/backend-map`, then the deploy (memory: nodegx-io-landing-page-on-nexus-1; hold
   back the npm 0.2.3 changelog section; rsync dry run first).

## Measurement limits to keep honest

- Staff reaches 23 tables, Sam 24: staff's functions hand back Lesson and Session-prep content without ids the map can
  match. The count is a floor ("at least"), said on screen when a function was capped.
- A table with one row per person is matched through that person's id only when it has ≥ 3 rows and the column is
  `learnerId`/`userId` (s3 first allowed any unique column and over-counted; LOOK.md §s3).

## Housekeeping

- s3 left running, light: its backend copy (8655) and map (5197), from its scratchpad. s1's (52050, 5192) also still
  run. Kill by pid when done (`lsof -nP -iTCP -sTCP:LISTEN | grep -E ':(5192|5197|8655|52050) '`).
- `nodegx-web/site/backend-map/` is untracked, like `map/`: it is built, not edited.
