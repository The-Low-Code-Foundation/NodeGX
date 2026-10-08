# P107 — next session

**Written 2026-10-08 (s56).** Read the [README](README.md) §2–§7 (R16 is the newest ruling). s56's record is
[NSP-016 §7.17](NSP-016-VISUAL-NODES.md) (the Component Stack); s55's is §7.16 (the Drag).

## Board (from the task files)

| task | built | committed |
|---|---|---|
| NSP-000 … NSP-015 | as s44 (NSP-013 left: AC2, the deep run for s11–s14; NSP-014 / NSP-015 left: AC2's export half, P18) | s1 … s44 |
| **NSP-016 the visual nodes** | 🟡 **15 of 19 conform. The Component Stack v1 (s56)** on both targets. Left: Repeater (`For Each`), Page Router, Component Children, Columns (geometry). The Component Stack's Use Routes is v2. AC4 waits for NSP-017 | `aa8abb06f` … s56 |
| NSP-023 the spec without React | ✅ all six ACs (s50); s56 added the Drag's and the Component Stack's page models (the Drag had none — the page-model test was red after s55) | s45 … s56 |
| NSP-006 the stranger | ✅ rounds 1–4 (hashes refreshed s56: an additive format change) | `649e6864d` |
| NSP-020 ports without a viewer | rows only | s20 |
| NSP-022 the cloud-only nodes | 📋 (needs a second runtime target) | s21 |

**121 of 147 conform on the runtime (82.3%)**: T5 15/19.

## What s56 settled

1. **The Text Input's last mutant at seed 20733 is killed** (8f82a3cf7): P109's D30 scenario graded a field focused AND hovered; the
   unhovered press whose paint takes the field off the page had no reader. One scenario, every pointer act.
2. **The Component Stack conforms** (component-stack.ts, 98 scenarios). The format gained, additively: an `answer` event (the stack's
   answer to a caller — `push` / `replace` / `back` done, unchanged or failure, or `returned`, the back's action and results handed to the
   pusher), `answers` and `resume` on a patch (`resume`: a promise the node awaits lands at the next yield — a settle's after the frame's
   end, an advance's before the clock moves), `WorldHandlers.resume`, and `undriven` on an input (Use Routes). Stranger hashes refreshed.
3. **When a caller's request lands is the app's rule, not the runner's.** Push Component To Stack and Pop hand theirs at THEIR frame's
   end; the face schedules each act's request on the stack's own frame-end list. The first face called the handler at the act, and the
   play's `await` between steps let microtasks run between requests (a build landed seven acts later). What still starts outside a frame
   (a Name write, an act's paint) counts act boundaries (`hops`).
4. **Face fixes that other specs ride on** (node-spec-target.ts): the popup's Group stand-in replaces only the popup ROOT's Groups (a
   Component Stack makes real ones); a node's style frozen by React's development build is copied before a write (the app ships the
   production build; only the stack hands its div its own style); a Component Stack gets a real `NodeScope`, three page components and
   the world's clock in `window.performance.now`.
5. **Rows C107–C114**, all open, all ledger (the spec copies each, R3) — C107 and C110 medium (a request that is never answered).

**Readings (2026-10-08).** Interpreter with mutants: at 200 on seeds 13, 20733, 20729, 7, 20734–20746, and at 10,000 on 20733 — every
mutant killed or declared. Runtime: CONFORMS at 200 on 13 and 20733 and at 10,000 on 20733, 0 divergences; the runtime conformance test
(`NSP_ONLY="Page Stack"`) 98 / 98, 643 / 644 mutants (the declared one).

## What s57 does

1. **Check P109's progress on C96–C114** (C101–C106 are going into P109's handoff as a task; C107–C114 are new — tell P109 once). When
   one is fixed, its scenario's behaviour moves with it (a spec version) in the same commit.
2. **The next visual node**: the Page Router (it needs the world's LOCATION on the PAGE — the same thing the stack's Use Routes v2
   needs; do that seam first, then both), or the Repeater (DEFINITIONS + collections + per-item ports). Component Children has no ports.
3. **Write the matrix first** (s51, s56): every frame-end shape × an observer frame. Each new seed found one more combination until it
   was there.

**Human decisions outstanding.** Ask in plain words (README §7 holds the earlier ones):
- **New, optional (s55):** should a Drag's Start Drag X that arrives as text ("50") be read as a number?
- **New (s56):** should turning a Component Stack's Mounted off and on keep its pages? Today it rebuilds its start page (registering
  resets). Not filed as a row: it may be what "removes it from the page entirely" means.
- **R7, R8, R4's confirmation and G1**, and NSP-017's question about the templates' CSS sheets, as before.

## Before you start

- **R11 / R12:** keep React out of the spec. Run `tests/page-model.test.ts` for a new visual spec — s55 shipped the Drag without its
  page model and the test was red until s56.
- **Shared checkout.** Commit through a temporary index with `BASE` pinned **in the same Bash call** as `read-tree`, then `git reset -q
  -- <your paths>`; never `git add -A`, never `git stash`; one heavy job at a time. **P109 runs `conformance.test.ts` back to back from
  `p109-c83`** — ask it for a window (it answered within minutes in s56) and wait on its PID. **The `/next` state file is P109's.**
- **zsh does not word-split `$args`**: `set -- $args` in a loop hands one argument; write the values out.
- **The runtime conformance test's `beforeAll` plays every listed spec:** always set `NSP_ONLY`. `NSP_DEEP` runs at the DAY's seed.
- An ABSENCE scenario needs a firing control beside it. A new ACT kind goes in the face and the spec's `acts`. Catalog parity compares
  descriptions VERBATIM (s56: a spec seeded by a list AND a filtered name list probes each pattern with its own seed's token).
