# OWN-018 — next session: confirm the OpenCode result, then Mistral Vibe on a subscription

**Written 2026-10-13, end of OWN-018 s2 (Opus 5.5).** Read `../OWN-018-A-STRANGER-ON-MISTRAL.md` §14 first (the run
table is at its end); this is the short version.

**Model:** Opus for the session. The stranger: Mistral Large 4 (`mistral-large-4`, never `-latest`).

## Where things are

- **Mistral Large 4 on OpenCode 1.19.0 builds the quiz 12/12** from `sentence-quiz.txt`, finishing by itself: run 9,
  43 min, $1.41 real, 81% cached (Sonnet's yardstick: 12/12, $6.30 API-equivalent). Run 6 also reached 12/12 (capped).
  **Run 10 repeated it: 12/12** ($1.20), after one "keep going" — its first sitting thought 129k characters into the
  32k ceiling (`length`), which ends a headless run but only pauses a person at OpenCode's prompt.
- **The working config**, all written by the kit: `npm create nodegx`, `cd apps && opencode -m mistral/mistral-large-4`
  (default reasoning, no `--variant`), the generated `opencode.json` (`limit {context 150000, output 32000}`, server
  with `--screenshots-to-files`). Reasoning off (run 5) was worse.
- **Tools (own-018/):** `round-opencode.mjs` (sealed lab, `--max-usd`, `--proxy`, `--context`, `--variant`),
  `round-opencode-resume.mjs` ("keep going" sittings), `round-claude.mjs` (the Sonnet yardstick), `grade-quiz.mjs`
  (12 checks + audit, proven on mutants via `mutate-quiz.mjs`; scrolls like a person), `peek-opencode.mjs`,
  `peek-claude.mjs`, `record-proxy.mjs` (+ `--compare`: where consecutive requests diverge).
- **Tarballs:** re-pack at HEAD with `scripts/devtools/make-worktree.sh` (then replace the worktree's linked
  `packages/noodl-mcp/dist/*` and `packages/noodl-preview/dist` with real empty folders before `npm pack` — they point
  at the primary checkout's build output, and packing writes through them).
- **Money:** Richard topped up €10 in s2. s2 spent ~$13.8 on Mistral (ten runs ~$12.9, cache probes ~$0.9); by that
  count about $2 of credit is left — check the Mistral console, which is the real figure.
  Launch sale ends ~2026-10-20.

## What s2 found (all filed; see `node scripts/bugs.js --all | grep OWN018`)

Fixed: **COUNTERZERO** (Counter and Variable getters before queued parameters land — the runtime), **IMAGECACHE** (any
image part turns Mistral's prompt cache off; screenshots to files for Mistral-facing servers), **SUMMARYLOSS** (the
project notes point at the verbatim request after a summary). Superseded: CACHE128K (a misreading). Open:
**NOLIBRARY**, **NOSTARTERASSETS**, **FANOUT — needs Richard's ruling** (one signal evaluating two gates: should the
second see what the first changed?).

## Richard's direction (s2)

*"keep perfecting the Mistral interface and config to make it run like a dream with the nodegx MCP, as well as Claude
Code"*; and Mistral offers Claude-style subscriptions usable with **Vibe** — *"if after you master Mistral Large 4 in
OpenCode you can have the same if not better results in Vibe, that would be a huge win"*.

## Do, in order

1. **Runaway thinking** (runs 4, 10: one step thinks into the 32k ceiling). Options, one at a time: the runner
   auto-resumes once on `length` with "keep going" (what a person does — record it); `OPENCODE_EXPERIMENTAL_OUTPUT_TOKEN_MAX`
   above 32000; `--variant high` (an explicit effort) vs the default; the Function example that calls `Outputs.done()`
   (the subject of run 10's 129k-character deliberation). Read finish reasons first: `length` is a cap, not the model.
2. **Claude check:** one Sonnet run on the current kit (`round-claude.mjs`) — the kit changed under it (notes,
   runtime); confirm it still grades 12/12 and costs no more.
3. **Vibe:** ask Richard to set up the Mistral subscription for Vibe; the kit already writes `.vibe/config.toml` (Large 4,
   the server with `--screenshots-to-files`, `--legacy-harness` advice). Port the series: `round-kit.mjs` is the Vibe
   runner from s1 (update it to the s2 lab rules: the kit's config, the tgz). Measure Vibe's cache with images gone, and
   whether it compacts.
4. Open levers, one at a time: temperature (two degenerate tool calls, runs 6–7); FANOUT once ruled; NOLIBRARY /
   NOSTARTERASSETS for a prettier app; `list_node_types` unfiltered returned 100 KB to Mistral in run 7.
