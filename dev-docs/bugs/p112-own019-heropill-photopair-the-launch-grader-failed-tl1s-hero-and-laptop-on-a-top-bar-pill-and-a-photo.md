---
id: P112-OWN019-HEROPILL
title: "The Launch grader failed TL1's `hero` and `laptop` on a sound page — it took a top bar's \"Join the waitlist\" pill for the hero's button (nothing above it), and it counted only text beside text, not each feature's text beside its photo"
status: fixed
commit: (this commit)
phase: P112
task: OWN-019
severity: medium
area: the lab — `dev-docs/tasks/phase-112-your-own-nodegx/own-019/grade-launch.mjs` (`hero`, `laptop`)
found: P112 OWN-019 s7, 2026-10-15 07:05 (TL1, tgz33, first grade under Node 22)
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-019-THE-VIBE-KIT.md §7 (s7)
---

TL1 graded 17/19, ✗hero ✗laptop. Its screenshots show both are there: a hero with the headline "The calm way to plan
your week.", a two-line pitch and a "Join the waitlist" button; at 1280 each feature row is text on the left, a photo
on the right (a Columns node), stacked on a phone.

- **hero:** `heroJoin()` takes the topmost "Join the waitlist". TL1's top bar carries one (`hero_navcta`), so
  "above the button" was empty (`lines: []`).
- **laptop:** `sideBySide` counted pairs of long text lines only; TL1's pairs are text beside a picture: laptop 0
  pairs, phone 0 → fail.

**Fixed:** the hero's button is the first "Join the waitlist" in the first 1.5 screens with two pitch lines above it
(a button's own words are not a pitch line); a long line beside a shown `<img>` or background picture ≥ 120×80, not
overlapping it, is a pair. `scroll` still presses the topmost button. **Proven:** TL1 as control 19/19 and two new
mutants of it fail exactly their check (`nohero`: headline and pitch emptied → hero; `nolaptop`: the Columns node a
column → laptop). The first cut let `nohero` pass — the top bar's pill counted as a pitch line — caught by that mutant.
s6's Sonnet control and its 12 mutants re-run on the fixed grader (s7 `lchk/mutants.log`).
