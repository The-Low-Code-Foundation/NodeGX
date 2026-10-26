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

**Next, in order:**
1. **BKO-001 AC6:** `session_status` / `get_project_info` say the drift (`diffAutomations` is written; the backend
   already logs it at start). Small.
2. **BKO-002:** the map and Privacy inside the conversation. Measure Privacy in the fake host first (the map's
   answers send no CORS), then the preview's src-less frame for the map.
3. **BKO-003**, the map for any app, can run beside BKO-002 (the map's package, not Studio's `hosted.js`).
4. Later: **BKO-001 AC5**, a real ship to the throwaway VM. It needs a rebuilt engine and backend, so do it with the
   release that carries this.

**Not live for Richard yet:** Claude Desktop runs the `noodl-mcp` dist, and a provisioned backend runs the backend
bundle. Neither was rebuilt. Ask before rebuilding the Desktop dist (from a clean worktree, the CCN rule).
🔴 `make-worktree.sh` symlinks `dist/` to the primary checkout: a build in the worktree writes the PRIMARY's bundle.
