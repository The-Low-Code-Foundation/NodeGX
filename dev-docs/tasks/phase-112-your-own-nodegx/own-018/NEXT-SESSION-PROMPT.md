# OWN-018 — next session: an environment Mistral Large 4 likes, then a landing page

**Written 2026-10-12, end of OWN-018 s1 (Opus 5.5).** Read `../OWN-018-A-STRANGER-ON-MISTRAL.md` §10–§12 first; this
is the short version.

**Model:** Opus for the session. The stranger is Mistral Large 4 (`mistral-large-4`, never `-latest`).

## Where things are

- Kit fixes committed and packed: `call_tool` (LISTCHANGED), WIREDTARGET, PROJECTAGENTS, `create-nodegx` writes
  `.vibe/config.toml` (`4a18723fe`); READWASTE: compact JSON, example menu + word search, multi-describe, `pm-` notes,
  `description → summary` (`8a28e7860`). Tarballs at `5754e993e` in the s1 scratchpad `own018/tgz3/` (re-pack at HEAD
  in the `npm-020` worktree if they're gone: `npm pack --pack-destination` in create-nodegx, noodl-mcp, noodl-preview).
- Round 3 (old tarballs) built ~90% of the intranet with 0 validation errors before its price cap. Fixture:
  `r3-atelier-hub/`. Open: STRINGLISTARRAY, NOSTARTERASSETS (both filed).
- Runners: `round-kit.mjs` (Vibe, the person's path from create-nodegx, sealed lab), `round-opencode.mjs`, readers
  `peek.mjs` / `peek-opencode.mjs`. **Never `--auto-approve` a Vibe round** (it reads anything on disk); the kit
  runner seals with a derived denylist + `--disabled-tools` because an "ask" ENDS a `vibe -p` run.
- Money: ~$4 left of Richard's $10 Mistral credit (`MISTRAL_API_KEY` in the repo `.env`; never print it). Launch sale
  ends ~2026-10-20. Reprice from the export / journal, never trust Vibe's code-mode `cost_usd` (it ignores the cache).

## Richard's ask (end of s1, final)

**The experiment series in OWN-018 §13** (it supersedes the landing page): Mistral Large 4 builds the quiz game in
`sentence-quiz.txt` about a dozen times on **OpenCode** (Vibe dropped), one config change at a time, scored by a script,
with **one Claude Sonnet run of the same brief as the yardstick**. Then a bigger project later.

## Do, in order

1. **The grader first, no API spend:** headless Chrome over the packed preview, plays the fixed pattern in §13, ~10
   pass/fail checks + a static audit of the graph. Prove it on the Sonnet build (`claude -p --model sonnet`, same lab:
   empty HOME, packed create-nodegx, `--strict-mcp-config`, Richard's subscription — say "API-equivalent", never "cost")
   and on mutants of that build.
2. **Fix NOSTARTERASSETS** if it touches the quiz's looks (icons); ask Richard if the fix is a ruling.
3. Re-pack at HEAD; smoke OpenCode's lab (canary 0) with `round-opencode.mjs`; then runs 1–2 (baseline ×2). Read the
   cache % before spending more — if OpenCode caches badly, say so before the dozen.
4. Runs 3–11 per §13's table; record each beside the others; every finding → `dev-docs/bugs/` (`P112-OWN018-*`).
