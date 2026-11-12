# DIG-008 — The world grows at night

**Phase:** [133](README.md). **Depends on:** DIG-007. **Round:** 9. **Scope:** [SCOPE §6.3, §6.5](SCOPE.md).
**Ruling:** R1, *"Yep drop it for me too"*: no night ever reads anyone's list.

> "We can add to the nightly serverside workflow that it generates new lore every day, so players returning will find
> new villages and stories and secrets every day, or players joining in later weeks will have a preexisting wealth of
> stuff to discover." — Richard, 2026-11-03

## What

- **The job** on the nexus box: Opus 5.5 through the API on its own key (Richard creates the key; this is a product
  others use, not his subscription). A writer pass drafts one district from the canon and the last districts; a review
  pass reads it against the canon and `STYLE.md`; `check-district.mjs` gates it; a refused night ships nothing.
- **It cannot read player data:** its own Unix user, no backend credentials, the backend's data directory unreadable
  to it. Measured, not assumed.
- **Publishing:** a passed district goes into the folder the game fetches; the list of districts is versioned.
- **Placement** (SCOPE §6.3): each player's districts land at the edge of what they have explored, oldest nearest,
  and are kept once seen (a save field).
- **Retire the old night shift:** `tools/nightly-prompt.md`, `check-plants.mjs` and the plant format go; portal
  worlds come from districts.

## Acceptance

- **AC1.** The job's user cannot read the backend's data or reach it with a token (both attempts shown failing).
- **AC2.** A planted bad district (a contradiction, a banned word, a broken shape) is refused and logged; the world does
  not change that night.
- **AC3.** Seven nights run by hand before the cron: the cost of each from the API's usage numbers, in a table here.
  (Estimated $1–2 a night; this replaces the estimate.)
- **AC4.** A fresh save with seven districts published finds them laid out from the ship; a returning save finds the
  newest within a short dig of where it last stopped.
- **AC5.** The cron is installed only after AC1–AC4, with a log the session reads (never Richard: the log holds lore).

## Carried in from DIG-005

- The canon gives one motif a "not before district N" rule; three styles carry it and the engine picks a style by
  depth, not by district number, so `styles.json` cannot enforce it. The placer (or the night's checker) has to:
  read the rule in `lore/CANON.md`, never quote it here.
