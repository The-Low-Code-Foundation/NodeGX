# P107 — next session

**Written 2026-09-29 (end of s0, the scoping).** Nothing is built. The phase was scoped from a
conversation with Richard about agent-written code, DHH's "pencils down" keynote, and what makes
NodeGX targets swappable. Read the [README](README.md) §2–§5 first: it is short on purpose.

## Where it stands

| task | built | driven | committed |
|---|---|---|---|
| NSP-000 the census | — | — | — |
| everything else | — | — | — |

The scoping files are **uncommitted** at the time of writing — check `git status -- dev-docs/tasks/phase-107-the-node-says-what-it-does`
before assuming either way.

**Rulings:** none yet. R1 (where specs live), R2 (formats) and R5 (CI budget) are needed before
NSP-001 and NSP-003; they can be asked together at the start of s1, in plain words, from README §7.
R3 (who wins a disagreement) is needed before NSP-004 writes its first §6 row. R4 is the pilot's
go / no-go and is asked **by** NSP-004.

## What s1 does

1. **NSP-000, the census.** A script, not a hand table. It is small, touches no product code, and
   corrects the provisional node lists in NSP-011 to NSP-017.
2. Ask **R1, R2, R3, R5** together, with the recommendations.
3. If time remains and R1/R2 are ruled: start **NSP-001** (the package and `defineNode`).

## Before you start

- This checkout is shared with peers (phase 106 was active on 2026-09-29). Pathspec commits only;
  never `git add -A`, never `git stash`; one heavy job at a time on the box.
- The census reads `packages/noodl-types/src/node-catalog.json`. If a peer has regenerated it,
  its node count may differ from the README's 180 / 147 — re-measure and correct the README rather
  than trusting it.
- The phase does not change runtime behaviour (R3 (a)). If you find yourself editing
  `noodl-runtime/src/nodes/`, stop: that is a §6 row and a ruling, not a fix.
