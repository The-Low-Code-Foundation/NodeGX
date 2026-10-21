# OWN-026 — The day-thirty test

**Scoped:** 2026-10-21, from [DIRECTION.md §0](../../DIRECTION.md) and §4 item 8. **Status: ⬜ scoped, not started.**
Lane 5 (the measured comparison), after OWN-023. **Waits on:** D5 ([DIRECTION §5](../../DIRECTION.md)).

## 1. Why a third day-one round would measure nothing

OWN-023 round 1 (one brief, three arms) and round 2 (the Gala game) measured what the theory predicts: at the size of
a first version the apps look the same, and in round 2 the NodeGX arm's first stranger copied the original game into a
NodeGX shell; told plainly to convert, a second (B2) did, at $34.90 in 70 minutes, with the screen code split into 762
nodes plus 1,257 hand-written lines (`own-023/ROUND-2-THE-GALA.md` §9.4). Richard, 2026-10-21: *"What you'll get on the first pass on the surface … will look identical on the
surface. But one is built on concrete, the other on sand."* A day-one round grades the property the theory says is
equal. The claim is about what the person can still do later. That is what this round grades.

## 2. The shape

Two finished builds of the same app, one in plain code by Claude Code bare, one in NodeGX (round 2's A+ and B2 are
candidates, if both are kept whole). Each is handed to a **fresh** stranger session with no memory of the build and the
same three asks, in the order a client makes them:

| ask | what it measures |
|---|---|
| **"Give me an editor for the game's settings (the song list, the scoring, the day's timetable) that my eldest can use without you."** | pillar 1: an editor as a view over the files, against an editor cut into finished code |
| **"Add a page only the teacher can see, with every pupil's score; parents see their own child only."** | the backend's rules as data (P124) against rules written into code; the security report where it exists |
| **"Change the scoring rule: a late arrival loses half the points, not all."** | a rule the person can find and read, against a rule somewhere in the code |

For each ask and each arm: wall-clock time, dollars, whether the first version worked (driven, not read), what broke
elsewhere in the app (the round-1 audit, re-run), and what the stranger had to read to do it. Then Richard's read of the
two editors from ask 1, as a person who would hand one to his eldest.

## 3. Acceptance criteria

- **AC1** — both arms complete all three asks, or stop with the reason named; every number in §2's table is measured,
  not estimated, and the drives are kept.
- **AC2** — the round-1 audit runs on both arms after ask 3 and counts what broke; a breakage is a defect row in the
  arm's ledger.
- **AC3** — Richard uses both editors from ask 1 for ten minutes and says which he would hand over, in his words.
- **AC4** — the result goes on nodegx.io as a number beside the day-one result, in the why page's last section, bound to
  this task's drives (SEE-009's rule), whichever way it comes out.

## 4. Not this task

Fixing what the NodeGX arm's stranger gets wrong on the way: those are kit defects, filed as OWN-023 filed its seven,
and built in their lanes.
