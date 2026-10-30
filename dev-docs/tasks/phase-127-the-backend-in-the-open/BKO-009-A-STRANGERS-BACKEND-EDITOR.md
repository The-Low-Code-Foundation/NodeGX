# BKO-009 — A stranger builds their own backend editor

**Phase:** [127](README.md). **Depends on:** BKO-008 (the kit and the suite). **State:** open, scoped 2026-10-30.

## What

1. **The skill.** A backend section in `nodegx-your-own-editor`, or a sibling skill `nodegx-your-own-backend-editor`
   if the section would double the page. Its shape is the front-end page's: the questions every backend editor
   answers, which kit export answers each one, *Done means PASS*, and *what the editors before yours got wrong*. That
   last part is seeded from P124's bugs (LENSBYNAMING, ACTSASHTTP, WRITESRECORDSJS, DOORREFUSALUNSEEN) and BKO-007's.
2. **A stranger round** in OWN-008's shape: an Opus `claude -p` in a sealed lab, from `npm create nodegx` plus the
   kit, a running backend, and a brief in a person's words. The brief is **not** "a map". It's a shape Studio
   doesn't have, so the kit is tested and not the map copied. Candidates for Richard to pick:
   - *"A door list: every table is a door, every kind of person a key; show me which keys open which doors, and
     let me cut a key."*
   - *"A day in the life: pick someone, play their day, and show what the app handed them at each step."*
   - *"A timeline of what my backend did by itself overnight, and why."*
3. **Graded** by the backend suite (BKO-008), plus a drive of the editor's page as a person would, plus Richard on
   a screen. Every question the stranger had to guess becomes a sentence in the skill or a fix in the kit
   (OWN-010's rule).

## Acceptance

1. The stranger's editor says PASS on the backend suite, run by us from outside its lab.
2. Its report and cost are written here. The questions it guessed at are each filed or fixed.
3. Richard's verdict on the screen, verbatim.
4. The skill ships in the next `create-nodegx` cut. The kit is on npm (Richard's OTP).

## Ruling

| id | question | recommendation |
|---|---|---|
| R3 | Which brief does the stranger get? | The door list: it's the *take control* half in a different picture from the map, so a pass means the kit carried it |
