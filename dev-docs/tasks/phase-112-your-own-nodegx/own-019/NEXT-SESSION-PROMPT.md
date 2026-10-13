# OWN-019 — next session (s3): the process kit (R31), then the series on it

**Written 2026-10-13, end of OWN-019 s2 (Opus 5.5).** Read `../OWN-019-THE-VIBE-KIT.md` §7 from "s2" on (both series
tables are there), then the P112 README's R30 and R31.

**Model:** Opus for this session. The agent under test: Mistral Large 4 (`mistral-large-4`) in Mistral Vibe 2.26.1,
on the Vibe Code subscription key (`MISTRAL_VIBE_API_KEY` in the repo `.env`; never outside Vibe). The audit at the
end (AC8) is a separate **Fable 5.1** session.

## The two rulings that decide this session

- **R30:** the Vibe subscription is the only Mistral deal that counts (€20/month → €255 of usage). If it can't be made
  to work, no Mistral. Reporting Vibe's harness defects to Mistral is an end-of-evaluation option, as **issues** (the
  repo takes no code contributions).
- **R31:** the agent runs a **written process, session by session, by itself**, the way we work in this repo (the
  castle-game lesson: one-shotting doesn't work). A non-technical person can't judge its notes, so nobody checks them
  for it. **The lab steers by nothing but a fixed "continue"** — never read the agent's output to choose a prompt.

## Where things are

- **AC5 met:** Pack It (`own-019/sentence-pack.txt`, grader `own-019/grade-pack.mjs`) pk2, pk3, pk4 — 12/12, each
  finished by itself, ~€2–2.80 real each.
- **AC4 open (the quiz):** v2, v3 12/12 (tgz14); v10 12/12 with carryover clean but stopped by the lab's old $6 cap;
  v12 8/12 (**AFTERTIMEOUT**, open); **v11 stalled in a real loop** (282 KB, 30 min) debugging the same seam — a For Each's item-output values when rows are re-created. Two apps, one seam: likely the runtime.
- **Kit tgz19** (create-nodegx at `f9c22c74b`; MCP + preview as tgz17, `21a3d0b98`): in s2's scratchpad
  `…/d34c68d9-…/scratchpad/v/tgz19` — may be gone. Re-pack in the worktree `own018-s3-pack` (s1's scratchpad; if gone,
  `scripts/devtools/make-worktree.sh`, then real empty `packages/noodl-mcp/dist/*` and `packages/noodl-preview/dist`
  before `npm pack`). The preview is tgz12's (runtime unchanged for both briefs except Aggregate Records); re-pack it
  only if the runtime changes (its pack runs webpack).
- **The lab now:** `round-kit.mjs --kit vibe` with `--stall-min` 30 (default) and `--max-price 10` (Vibe's list count;
  real ≈ half). Three lab faults found and fixed in s2 — the unsealed root, the 12-minute watchdog (Large 4's
  productive thinks run up to 10 min), the price cap on a list count. **Before believing a red, probe it** (s2's
  probes: re-read before press, settle after typing, slow taps, all-right run): three graders' first reads were the
  grader. After any grader change, re-prove it: `mutate-pack.mjs` + the s2 `run-mutants.sh` pattern (control 12/12,
  11/11 exact).

## Do, in order

1. **Build the process kit (R31)** in `packages/create-nodegx/profiles/vibe/` (and what the server needs, behind
   `--profile vibe`, if anything). The agent, by itself:
   - **sitting 1 — plan:** reads the request; writes `docs/PLAN.md` (screens, components, the decisions and why — the
     thinking that today lives only in 10-minute thinks) and `docs/CHECKLIST.md` (one line per thing a person sees or
     does, **the request's own worked examples as whole lines** — "You scored 3 out of 5" is right, wrong, right,
     timed out, right — each with the drive that proves it and a status); ends by writing `docs/NEXT.md`.
   - **sittings 2…n — build:** start from `docs/NEXT.md`; build the next part; drive its lines; update CHECKLIST and
     NEXT; stop.
   - **last sitting — prove:** drive every line; report pass/fail per line; write "done" in NEXT only when all pass.
   Keep it short and in AGENTS.md's voice; the steps must say *it is a process* and *where it is in it*.
2. **The lab for sittings:** `round-kit.mjs --sittings N` — sitting 1 is the person's paragraph; every later sitting
   is a fresh `vibe -p` in the same folder with the **same fixed words** ("Continue."), until `docs/NEXT.md` says done
   or N sittings. Fresh sessions, not `--continue` (small contexts are the point). Measure per sitting and in total:
   grade, finished-by-itself, minutes, real €, input tokens per call, longest think.
3. **Rounds, one lever at a time, against s2's single-session rounds:** the quiz and Pack It on the process kit.
   Then AC4 (three quiz rounds clean in a row) and AC5 again on it.
4. **AFTERTIMEOUT (do this early — it caused v11's loop and v12's miss):** reduce v12's miss to the smallest graph (a For Each row signal + an unchanged item value into a
   component, an Expression on it, a Condition on the signal). If the runtime drops it, it is a NodeGX defect —
   fix it under the bug's own file.
5. **Mine the thinks** (s2's journals, `type: "reasoning"`) for questions the notes didn't answer (v6 went to read
   the runtime's source to learn a signal's meaning) → kit notes.
6. Then **AC6** (Richard's own run) and **AC8** (the Fable 5.1 audit; prepare its reading list in the task file).
