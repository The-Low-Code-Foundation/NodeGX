# NSP-013 — Batch: dates, time, randomness, parsers, animation

**Opened 2026-09-29.** **Depends on NSP-007** (the world) and R4 = continue.
**Status: 📋 not started.**

## 1. The person sentence

> **Nodes that depend on the time, the time zone, chance, or the shape of text people paste in
> behave the same on every target and every machine.**

## 2. The nodes (from the census)

**24**, from the census ([CENSUS.md](CENSUS.md), NSP-000, generated 2026-09-30). Regenerate the census; do not edit this list by hand.

- **T1 pure / state machine (14):** Date To String · Date Add (`net.noodl.DateAdd`) · Date Compare (`net.noodl.DateCompare`) · Date Difference (`net.noodl.DateDifference`) · Date Parts (`net.noodl.DateParts`) · Hash (`net.noodl.Hash`) · JSON Stream Parser (`net.noodl.JSONStreamParser`) · Parse CSV (`net.noodl.ParseCSV`) · Parse Feed (`net.noodl.ParseFeed`) · Parse XML (`net.noodl.ParseXML`) · Pattern Extractor (`net.noodl.PatternExtractor`) · Stream Buffer (`net.noodl.StreamBuffer`) · Text Accumulator (`net.noodl.TextAccumulator`) · To CSV (`net.noodl.ToCSV`)
- **T2 clock, randomness & environment (10):** Animate To Value (`net.noodl.animatetovalue`) · Now (`net.noodl.Now`) · Random Bytes (`net.noodl.RandomBytes`) · UUID (`net.noodl.UUID`) · On App Error · Repeat · Screen Resolution · States · Delay (`Timer`) · Unique Id

Census notes:
- **Date Add** — pure given its inputs; the zone and locale come from the world
- **Hash** — deterministic — no entropy
- **On App Error** — listens to the environment's error stream — world-fed
- **Screen Resolution** — reads the environment (window size) — world-fed
- **States** — sits in Animation; a state machine (T1 shape) with timed transitions — the clock decides the tier
- **Delay** — one-shot, not a ticker
- **Unique Id** — sits in String Manipulation but needs randomness

## 3. What is special here

- **The date family already has parity tests** (`nodegx-export/tests/date-family.test.ts`) that
  run the emitted `dateLib` beside the runtime node. Port their cases into scenarios first; they
  are the best-researched edges in the repo.
- **Time zone and locale are part of the scenario**, set by the world, never read from the
  machine. Run every date scenario in at least two zones, one with a DST change inside the range.
- **Parsers are pure but have huge input spaces.** Seed the generator with the fixtures the
  existing tests use, then add malformed input (unterminated quotes, BOM, `\r\n`, empty) as hand
  scenarios.
- **States** is a state machine (T1) with timed transitions (T2); spec the machine first, then
  the timing through the clock.

## 4. Acceptance criteria

As NSP-011 §4, plus:

5. Every date node conforms in two time zones, one crossing a DST boundary.
6. **Hash** and **Random Bytes** conform byte-for-byte under a fixed seed and are refused by the
   runner (a clear reason) if a target reads real entropy.

## 5. Watch for

- Memory: *midnight is ≥12:00 CEST in some drives* — date scenarios must never depend on when
  they run.
- Memory: *`currentState` works only if `states` is set* — States driven by a value stays in its
  first state. That is a real behaviour to spec, not a bug to work around.

## 6. Built

*(empty)*
