# OWN-019 — next session: make the Vibe kit's 12/12 repeatable, then a second brief

**Written 2026-10-13, end of OWN-019 s1 (Opus 5.5, in the OWN-018 s3 session).** Read `../OWN-019-THE-VIBE-KIT.md`
§7 first (the series table is at its end).

**Model:** Opus for the session. The agent under test: Mistral Large 4 (`mistral-large-4`) in Mistral Vibe 2.26.1.

## Where things are

- **The Vibe kit grades 12/12 in Vibe (v2), where the plain kit graded 0/12 (v1b)** — same model, harness and
  settings. Large 4 wrote a checklist, drove every line (15 drives), reported pass/fail per line, opened no
  screenshot (83% cached), and caught its own wiring fault. $3.20 by Vibe's list count, 46 min.
- **What the kit is:** `create-nodegx --vibe` (what `npm create nodegx-vibe` will run; that package is made at
  publish — a new workspace now would put the shared lockfile out of step). It writes `profiles/vibe/`: `AGENTS.md`
  (the six build steps + the call_tool rule + LOCALKEEP's line) and `.vibe/agents/nodegx.toml` (`default_agent`; tool
  settings only — Vibe sends an agent's `instructions` on its unified harness alone). The server runs with
  `--profile vibe` (`packages/noodl-mcp/src/clientProfile.ts`).
- **The key:** `MISTRAL_VIBE_API_KEY` in the repo `.env` is the Vibe Code app's key; it draws on Richard's €255/month
  Vibe Code allowance (confirmed in the console). Never use it outside Vibe.

## The lab

- `own-018/round-kit.mjs <root> <tgz-dir> own-018/sentence-quiz.txt --key vibe --kit vibe --max-price 6 --stall-min 12`
  (sealed HOME, the kit from tarballs, `vibe -p --legacy-harness`; stops a round whose journal stops growing).
- `own-018/grade-quiz.mjs <root> --tgz <tgz-dir>` — 12 checks + `carryover` observed beside the score + audit.
- **Tarballs:** s1's live in that session's scratchpad (`v/tgz14`) and may be gone. Re-pack at HEAD in the worktree
  `own018-s3-pack` (made by `scripts/devtools/make-worktree.sh` in s1's scratchpad; if it is gone, make a new one and
  replace its linked `packages/noodl-mcp/dist/*` and `packages/noodl-preview/dist` with real empty folders before
  `npm pack`). Pack create-nodegx and noodl-mcp; the preview only when the runtime changed (its pack runs webpack).
  Then `git worktree remove` it when done.

## Do, in order

1. **AC4 — two more fresh v2 rounds** on a fresh pack at HEAD. Three in a row at 12/12, finishing by itself.
2. **AC5 — a second brief**, different from a quiz (lists and a form, say), with its own grader proven on mutants
   (as `grade-quiz.mjs` was, `mutate-quiz.mjs`). Then three rounds.
3. **Levers, one at a time, only if a round needs one:** the long think with no cap on the legacy harness (v1's
   32-min step); compaction (the kit's `max_context_length = 1000000` never compacts); `thinking`; temperature (kit
   1.0, Vibe default 0.2). The `look` read was used ≤2× against 13 hand-written `getComputedStyle` — fine if it works.
4. **LOCALKEEP's open half:** the "none unless shared" rule in `create_project`'s `backend` description needs a trade
   on the resident budget (AWP-006, ~4 tokens free).
5. **AC6 — Richard's own run:** once AC4 and AC5 hold, Richard runs `create-nodegx --vibe` (or the published
   `npm create nodegx-vibe`), opens Vibe himself and builds what he likes; read the session journal afterwards.
