# DIG-007 — The first district (the sandbox)

**Phase:** [133](README.md). **Depends on:** DIG-005, DIG-006. **Round:** 8. **Scope:** [SCOPE §6](SCOPE.md).

> "You don't need to write the full lore and story all at once. let's do a sandbox level to get it started."
> — Richard, 2026-11-03

## What

- **The district format v1** (`district.schema.json` and `tools/check-district.mjs`): a settlement's style, size and
  state, its texts and where each is carved, the practices it holds, any secret, any tuning find for the pulse, and
  the portal worlds behind it. Hand-written here; DIG-008's night job writes the same format.
- **One district, by hand**, a short dig from the ship (20–40 m down, within about 60 blocks): partly ruined, partly
  whole, its road out ending in rubble.
- **The record** (menu): everything read, in the order found, readable again; no total, nothing marked missing.
- **"Where these come from"** in the menu (DIG-005's page).
- **A pulse tuning find** in the district (raises the reach; DIG-003's setting).

## Acceptance

- **AC1.** `check-district.mjs` passes the district and refuses five broken ones (a missing source, a banned word, a
  text over its length, an unknown style, a secret with no way in).
- **AC2.** The district's texts and blocks are identical on two loads and on two machines.
- **AC3.** The record keeps what was read across a reload, and shows no count.
- **AC4.** Richard plays it on the iPhone. His reactions go into the game's README verbatim (with no lore quoted back
  in the reply to him).

## Log

**2026-11-03, s3 (private repo `bee07f6`).** Built; AC1–AC3 ✅, AC4 waits on Richard's play. Counts only (the spoiler
wall): the district's texts were written by one agent and read against the canon by a second, and neither report
carried lore into this session.

- **The format v1:** `tools/district.schema.json` (the night job's contract too) and `tools/check-district.mjs`, which
  validates against the schema with a small validator (so the schema IS the contract), then the rules a schema can't
  say, then builds the district on six seeds near the ship. Its kinds and lengths are `KINDS` in
  `public/src/districts.mjs`; the checker refuses a schema whose kinds drift from them.
- **AC1 ✅** `--self-test`: a placeholder district (no lore) passes on all six seeds, and the five broken ones are
  refused, each for its own reason (a missing source, a banned word, a text over its length, an unknown style, a
  secret with no way in). The real district passes: 23 texts in 7 kinds (21 placed in the district, 2 in the secret's
  chamber), 4 practices, a secret, a tuning find at reach 40. On the six seeds: placed 25–60 blocks out and 21–34 down,
  10–16 readable spots, at most 4 texts on a shelf, the chamber sealed every time. Writer: 2 drafts (the first, 32
  texts, left the secret no rock to seal in on 3 of 6 seeds). Review: 10 problems found, 10 fixed (2 against the
  canon, 8 texts that would read wrong on some other doorway or that promised what the game cannot show).
- **AC2 ✅** `tests/district.json`: Node, from a fresh generator at the place the browser kept, builds the same texts
  on the same cells and the same blocks (fingerprint + block print); after a reload the district is where it was, with
  the same prints. `check-district` builds every seed twice and compares too.
- **AC3 ✅** the record keeps what was read across a reload; the menu's record has no count and nothing marked missing
  (the drive refuses "N of M" and "N read/found/left/missing"); a row opens to read again.
- **The tuning find:** reading it raises the pulse's reach 28 → 40, kept in the save. At 40 on the 2-block grid one
  pulse took 18 ms on the worst seed (target 8); the grid now coarsens with the reach, and a tuned pulse times at
  4.9–5.4 ms, no more than the first one (`node tools/time-pulse.mjs --reach 40`).
- **The secret:** a sealed chamber (`sealChamber` in `gen-settle.mjs`) cut in solid rock by the text that hints at it:
  behind its wall, beside it, or under the floor in front; when the rock there will not hold one, that text trades
  places with the first text whose spot will (deterministic). Lintels between two rooms almost never hold one.
- **Also built:** districts are built before the first chunk and before the day's planted rooms, which now keep out
  of them; where a district landed is kept in the save. Their stone glows gold (worked) to the pulse. Creatures
  never spawn in, and turn back from, a refuge that came through the collapse whole (DIG-006's leftover).
  "Where these come from" is in the menu (lore/SOURCES.md, served at `/lore/` with the styles' engine fields only).
- **Drives:** district 16/16 (local server and the static copy under `/lab/dig/`); all ten drives green, 121 checks.
- **Filed:** P133-DIG007-LINTELSTACK (open): a style with few readable spots stacks texts on a lintel; decide with
  DIG-008.
- **Live:** the static copy is built into `nodegx-web/site/lab/dig/`; the push is Richard's two lines (README "Run it").
