# HLT-010 — The gate that would have caught it

**The structural fix, and the reason this phase is not just nine bug fixes.**

## 1. The person sentence

> **A change that makes the editor throw a new error in ordinary use fails a gate that same day,
> instead of being noticed, written down as an observation, and rediscovered four phases later.**

## 2. Why this exists

Every defect in this phase survived a **green test suite**. `test:ci` was at its floor, `test:main`
was 524 suites / 8,397 specs green, every ratchet green — and the editor logged **264 error events
in 42 minutes** of ordinary use.

Nothing in CI reads the renderer log. So the only way any of these was ever found was a human
noticing, and the only place it was recorded was a handoff — which dies with its phase. README §2
has the receipt: `captureThumbnail` was written down four times, by four sessions, and went from
6 → 15 → 116 while everyone politely scoped it out.

🔴 **The defect is not any one of the 264. It is that a green suite and a noisy editor were
compatible states.**

## 3. Scope

**In:** a gate that drives the editor, reads the renderer log and fails on errors above a named
per-class budget, wired into CI beside the existing ratchets.

**Out:** replacing any existing gate; asserting on behaviour (that is every other task); a
screenshot-diff harness.

## 4. 🔴 Written LAST, and this is not sequencing tidiness

A budget set while the counts are non-zero ships **red**, and a gate that ships red gets switched
off or baselined at its current value — which is how a ratchet becomes a record of defeat rather
than a floor ([[a-gate-can-have-a-hole-shaped-like-the-defect]]).

✅ **This phase deliberately chose a gate at 0 rather than a falling baseline**, on the same argument
TVW-009's vocabulary ratchet used: the debt is small and named, and the same phase clears it. All
six of §3's classes reach zero in HLT-001…004 before this task writes a budget for them.

## 5. Acceptance criteria

1. **The gate exists and runs**: a driven editor session over a named set of surfaces, parsing
   `.logs/dev.log`, exiting non-zero when any error class exceeds its budget.
2. **Every class measured in this phase has budget 0**, and the gate is **green** at the time it is
   committed — which is only true after HLT-001…004.
3. 🔴 **Proven by reintroduction, not by argument.** Revert one fix — the `setTimeout` in HLT-001's
   helper is the cheapest — and the gate goes **red naming that class**. Restore it, gate green.
   Both runs recorded. A gate nobody has seen fail is a gate nobody has tested
   ([[build-the-caller-to-find-a-gates-hole]]).
4. ⚠️ **It counts EVENTS, not log lines.** The `GUEST_VIEW_MANAGER_CALL` class is written on two
   channels; a line-counting gate reads 232 for 116 and its budget is wrong by a factor of two.
   A spec asserts the de-duplication on a fixture log containing exactly that doubling.
5. ⚠️ **An unknown error class is a failure, not a pass.** A gate that only knows the six classes
   this phase named would be silent on the seventh — which is precisely the hole this phase exists
   to close. Unrecognised classes fail loudly and are then either fixed or given a named budget with
   a reason.
6. **A precondition arm proves the session actually ran.** A gate that reads an empty log because
   the editor never launched passes everything ([[an-instrument-must-be-armed-before-it-measures]],
   [[tests-0-total-can-mean-the-wrong-directory]]).
7. `npm run` script name registered, wired into `pr.yml` beside the other ratchets, and the
   allowlist it prints has a stated reason per entry.

## 6. The small job that rides along

✅ **Fix P94's stale README header.** `phase-94-one-styles-panel/README.md` still reads as open;
the phase closed at s10 and its own task table and `NEXT-SESSION-PROMPT.md:1` say so. A closed
phase advertising itself as open is the same class of defect as everything else here — a true thing
nobody owned — and it already cost this phase's scoping sweep a detour.

## 7. Landmines

- 🔴 **A gate that replays against your own output cannot see a human's input.** This gate drives a
  scripted session; it will not find what Richard found by clicking around
  ([[a-gate-that-replays-against-your-own-output-cannot-see-a-humans-input]]). It is a floor under
  regressions, **not** a replacement for someone using the product.
- 🔴 **`bugtracker.ts` currently swallows React's `%s` arguments** (HLT-003 AC3). Until that lands,
  the gate cannot name the component in a duplicate-key failure — so HLT-003 is a real dependency,
  not a nicety.
- ⚠️ **A hidden Electron window never fires `requestAnimationFrame`**, so a headless drive can read
  a dead editor as a quiet one. `Page.setWebLifecycleState {state:'active'}` +
  `Emulation.setFocusEmulationEnabled`, and assert rAF fires as a precondition.
- ⚠️ **Launching an editor is a heavy job on a shared box.** The gate must not be something a peer's
  CI run reaps, or that reaps theirs.
