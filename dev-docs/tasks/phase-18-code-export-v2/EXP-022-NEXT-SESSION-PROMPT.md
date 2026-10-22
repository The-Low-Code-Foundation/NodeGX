# Next session — EXP-022 S8: Richard's ruling on the reveal, then the site (BOARD lane 6, the Swift session)

**Swift session 8 of at most 12.** Written 2026-10-22 at the end of S7 (Opus 5.5). Say which model you are in your first
message. This is lane 6's **second** session. The first (React, EXP-021) runs on [NEXT-SESSION-PROMPT.md](NEXT-SESSION-PROMPT.md)
in this same folder and the same package. Do not touch its files.

## Read first

1. [EXP-022](EXP-022-THE-SAME-GRAPH-IN-SWIFT.md) §9 S7: the stores carried, the line, what I predicted wrong.
2. [`exp-022/s7/README.md`](exp-022/s7/README.md): the route, the mutants, the hazard the one package carries.
3. **The reveal page**, private: https://claude.ai/artifact/NPyF9RpBWa2rf2Gi2rwjCk (source `exp-022/s7/reveal/index.html`,
   its picture S6's `side-by-side.png`). Read it with the Artifact tool (`action: "read"`), never by fetching it.

## Ruled so far (Richard, 2026-10-22), in order

1. ~~Fix add and close before the reveal~~ **done in S6.**
2. ~~"Yes, after add & close": the `@nodegx/core` stores in JavaScriptCore~~ **done in S7**: Swift 11 of 85, the same 11
   as React, Swift's trace equal to React's on all 14 it plays.
3. **The reveal, "private page first, then site"**: the private page is up. **nodegx.io only after he rules on its
   words.** That ruling is the next thing, and it is his.

## This session

1. **Ask Richard for the ruling, in plain words, with the page as the picture** (AskUserQuestion, at most 4 questions):
   do the words stand as written; is "same tabs, same rows, same writes" the line he wants on the site; where on
   nodegx.io it goes (a page of its own, or the changelog). Record the questions and his answers verbatim in §9 S8.
2. If he rules "publish": the site is `nodegx.io`. See memory `nodegx-io-landing-page-on-nexus-1`: it has no remote, so
   a push is a deploy. Move the page's words into the site's own look, with the picture, and publish ONLY the files you
   add. Changelogs live on the site, not as artifacts.
3. If he rules changes: edit `exp-022/s7/reveal/index.html` and republish it to the same URL (the same file path, from
   this conversation, or `url` from a new one after a `read`).
4. Slack, only if he asks for it: On App Error (t07, 4 scenarios). React plays them and fails them on filed rows, so
   carrying them would raise Swift's played count, not its conforming count. Or stop at 7 of 12: the claim is measured.

## What is true at the end of S7 (measured 2026-10-22)

- Swift line: **11 of 85 conform, 14 played (11, 3 declared, 0 fail); 25 outside on the exporter (21 plan, 4 Swift
  printer: On App Error), 46 harness.** React's: 11 of 85, 18 played (11, 3, 4 fail on filed rows).
- The Swift printer is 3,938 lines written by hand (+326 in S7), plus the generated `coreJs.ts`. The plan and the React
  printer were not touched in S7.
- todo-list: 91 plan refusals and 5 Swift losses, as at S6. Its views and modules are byte for byte the same as S6's.
- Open, other lanes': `P18-EXP022-S5-THROWDIVERGES`, `-S4-LABELDROP`. Filed and fixed in S7: `-S7-NOWORLD`, `-S7-LONGLINE`.

## Rules this session must keep

- 🔴 **One heavy job on the box, checked BEFORE EVERY build, as its own step**: `pgrep -fl 'vitest|jest|xcodebuild|grade.mjs'`
  and `tail -2 /Users/Shared/nodegx-lab/own026/series-*.log`, and wait (a background `until ! kill -0 <pid>` loop).
- 🔴 **Never edit `src/` while the whole suite runs.**
- 🔴 **A peer works in this package and this folder** (the React session). Commit only your paths, through a temporary
  index with compare-and-swap. Never `git add -A` at the folder level, never `git stash`, never a bare `git reset`.
- 🔴 The store scenarios play under the runner's world (`Scripts.shared.world`); a new Swift graph scenario that declares
  one gets it automatically. A store with an Initial State declared by two probes is refused by `playSwiftGraphs`.
- 🔴 `@nodegx/core` changed? Regenerate `src/emit/swift/coreJs.ts` (`tests/helpers/swift-core-js.ts`); S7 A1 fails until you do.
- Every bug found goes to `dev-docs/bugs/` (one file per bug), id `P18-EXP022-S8-<WORD>`.
- End: update EXP-022 §9 (S8), this file, BOARD lane 6's Swift sentence, and memory `phase-18-code-export-v2`.

## Not this session

Signing, TestFlight, a real iPhone, Kotlin. Publishing anything to nodegx.io before Richard rules on the words.
