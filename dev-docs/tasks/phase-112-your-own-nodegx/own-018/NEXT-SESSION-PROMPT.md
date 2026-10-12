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

## Richard's ask (end of s1)

*"Set up the perfect little environment that Mistral Large 4 will love, and let it rip"* — with a new brief: *"a
basic, very pretty modern landing page with an API sending sign up form to Brevo … basic but impressive."* The
sentence is `sentence-landing.txt` (never says "NodeGX"; the key `BREVO_API_KEY` goes in `.env` by the person).

## Do, in order

1. **Cheap measurements first (cents each, a small fixed task):** cache rate per harness (Vibe legacy 40–47% vs
   code-mode 76–91% — find why legacy misses; uncached input was $2.46 of round 3's $3.08); `thinking` low vs high;
   an `auto_compact_threshold`; OpenCode with `--variant high`. Pick the environment from the numbers.
2. **Fix NOSTARTERASSETS** before a "very pretty" page (npm-made projects have no icons or imagery). Ask Richard if
   the fix is a ruling (bundle the starter set in the MCP vs fetch from the shelf).
3. Put Large 4's measured trips where it reads (§12 item 4), re-pack, smoke the lab (canary 0), then the landing-page
   round. Brevo: `POST https://api.brevo.com/v3/contacts` with header `api-key`, body `{email, attributes, listIds}`;
   grade with a key-checking local stand-in first (as s13 did for Gemini), the real key only when Richard pastes it.
4. Every finding → `dev-docs/bugs/` (`P112-OWN018-*`); record the round beside round 3's numbers.
