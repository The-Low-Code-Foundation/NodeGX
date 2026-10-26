# Phase 127 — next session (lane 9 on the BOARD)

Read [README.md](README.md), then the task you take.

## s1 (2026-10-26): scoped; BKO-001 started

Richard asked why the map does not draw in the chat and whether the backend is still open. Two read-only audits
answered both (the facts are in the README's table and in BKO-002 / BKO-003). He ruled R1 (the project's files are the
truth for workflows and triggers) by approving the plan, and said "let's scope it up on the board and start working
through". The phase and the board's lane 9 were written this session. BKO-001 is the first task.

**BKO-001 built and graded the same day** (commits `0275990c3`, `6d64e5426`, `78b8a528e`, `8494038c5`; the
session log at the bottom of BKO-001 has the grades). The agent's rules, workflows and triggers now land in the
project's files (`nodegx.security.json`, the new `nodegx.automations.json`), a backend starts from them, and the
full-stack deploy carries them. Bug P127-BKO001-BACKENDONLY is fixed in code.

## s2 (2026-10-26): BKO-001 AC6, BKO-002 in the fake host

- **BKO-001 AC6 ✅** (noodl-mcp `837b4ece8`): `get_project_info` and `session_status` carry `automations`
  (agree / drift with both ways to agree through the existing tools / unknown with the reason).
- **BKO-002 built** (Studio `f50fb31`). Privacy in a conversation **was broken**, measured first and filed as
  P127-BKO002-HOSTEDPRIVACY, now fixed. Data → Map now draws the map in a src-less frame. The gate is Studio's
  `npm run check:hosted` (9/9). AC4 was replaced: the CORS header stays in Studio, not the map package (the reason
  is in BKO-002's log).

**Next, in order:**
1. **BKO-003**, the map reads any app. Studio's `editor/hosted-check.mjs` is a ready harness (a template copy, its
   backend, the map drawn). It is measured already: the todo app's map draws the training app's `LearnerProfile`, a
   project table missing from the backend has no node, and the rule words repeat ("Anyone signed in or Anyone signed
   in or Nobody"). The source is `dev-docs/tasks/phase-124-the-mystery-of-the-backend/editor/`. Studio pins 0.1.1, so
   a publish and a pin bump close it (Richard's OTP).
2. **BKO-002 AC2**, Claude Desktop. It waits on Richard: Desktop must run a Studio carrying `f50fb31` and a
   `noodl-mcp` carrying `837b4ece8`. Ask before rebuilding anything.
3. BKO-004 / BKO-005 (they read BKO-001's file shape, which has landed).
4. Later: **BKO-001 AC5**, a real ship to the throwaway VM, with the release.

**Not live for Richard yet:** Claude Desktop runs the `noodl-mcp` dist and the Studio it finds. A provisioned backend
runs the backend bundle. None was rebuilt. Ask before rebuilding the Desktop dist (from a clean worktree, the CCN rule).
🔴 `make-worktree.sh` symlinks `dist/` to the primary checkout: a build in the worktree writes the PRIMARY's bundle.
🔴 Studio's `studio.html` is a busy file (a peer committed into it during s2). The map change lives in `hosted.js`.
