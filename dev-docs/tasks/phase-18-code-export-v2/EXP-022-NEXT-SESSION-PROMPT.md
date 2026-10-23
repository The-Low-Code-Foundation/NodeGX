# Next session — EXP-022 S10: Richard's choice, with the claim at 15 of 85 on both (BOARD lane 4, the off-ramp; it was lane 6 until the 2026-10-23 BOARD; the Swift session)

**Swift session 10 of at most 12.** Written 2026-10-23 at the end of S9 (Opus 5.5). Say which model you are in your
first message. This is lane 4's **second** session. The first (React, EXP-021) runs on [NEXT-SESSION-PROMPT.md](NEXT-SESSION-PROMPT.md)
in this same folder and the same package. Do not touch its files.

## Read first

1. [EXP-022](EXP-022-THE-SAME-GRAPH-IN-SWIFT.md) §9 S8 and S9: the page, then On App Error and PARSERAISE.
2. [`exp-022/s9/README.md`](exp-022/s9/README.md): the route, the harness's one rename, the mutants.

## Ruled so far (Richard)

1. ~~add and close~~ S6. ~~the stores~~ S7. ~~the reveal's words~~ S8: live at nodegx.io/one-graph/, **not in the nav**
   ("Don't put it in the site menu yet"). From code's Swift line rewritten (nodegx-web `3cc5e8f`): **is it live?**
   `curl -s https://nodegx.io/from-code/ | grep -c one-graph` (0 = Richard has not pushed it yet; the command is in §9 S8).
2. "Keep going with Swift a bit more" → S9: "Fix it in both" (PARSERAISE), "Run at lowest priority" beside the lab.

## What is true at the end of S9 (measured 2026-10-23)

- **Both ledger lines: 15 of 85 conform, 18 played (15, 3 declared, 0 fail); 21 outside on the plan, 46 on the harness.
  The Swift printer leaves nothing outside**, and on all 18 Swift's trace equals React's.
- The Swift printer is 4,055 lines by hand, plus `coreJs.ts` and `fxpJs.ts` (generated, each compared on every run).
- The page at /one-graph/ says 11 of 85 and "7 of 12". It is now 15 and 9. **Do not change a live page without Richard.**
- Open: `P18-EXP022-S9-RAISELOG` (low, Swift: a failed request is logged, not raised), `-S5-THROWDIVERGES`, `-S4-LABELDROP`.

## This session: ask Richard first (plain words, AskUserQuestion), then do what he picks

1. **The page's numbers**: update /one-graph/ to 15 of 85 and 9 sessions (a sentence and two cards), or leave it at
   S7's measurement with its date?
2. **What next, of three, or stop**: (a) RAISELOG (move each verb's error code into the plan, so both printers raise it:
   it also closes part of `-S2-EMITDECIDES`); (b) todo-list again on the simulator, now carrying `lib/errors`, to check
   nothing moved in the drive (S4's recipe); (c) stop at 9 of 12: the claim is measured and equal.

## Rules this session must keep

- 🔴 **Busy check by process NAME, never `pgrep -f`**: `ps -axo pid=,comm=,args= | awk '$2 !~ /(^|\/)(zsh|bash|sh|grep|awk|ps|sleep)$/ && /node_modules\/\.bin\/jest|vitest|xcodebuild|swift-build|swift-test|swift-frontend/'`.
  `pgrep -f` matched other sessions' wait loops and held S9's build back four hours. After starting a waiter, check
  within a minute that the job really started.
- 🔴 One heavy job at a time, `nice -n 19`. A Swift graph build is ~20–30 s; the whole package suite is the heavy one.
- 🔴 **Never edit `src/` while the whole suite runs.**
- 🔴 **A peer works in this package and this folder** (the React session). Commit only your paths, through a temporary
  index with compare-and-swap. Never `git add -A` at the folder level, never `git stash`, never a bare `git reset`.
- 🔴 `@nodegx/core` changed? Regenerate `coreJs.ts` (`tests/helpers/swift-core-js.ts`). `fast-xml-parser` moved off
  4.5.7? S9 A1 fails; regenerate `fxpJs.ts` (`tests/helpers/swift-fxp-js.ts`) and move `PARSE_DEPENDENCIES` with it.
- Every bug found goes to `dev-docs/bugs/` (one file per bug), id `P18-EXP022-S10-<WORD>`.
- End: update EXP-022 §9 (S10), this file, BOARD lane 4's Swift sentence, and memory `phase-18-code-export-v2`.

## Not this session

Signing, TestFlight, a real iPhone, Kotlin. Publishing to nodegx.io without Richard's word.
