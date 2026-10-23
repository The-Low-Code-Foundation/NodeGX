# Next session — EXP-022 S9: the push, then Richard's choice of slack or stop (BOARD lane 6, the Swift session)

**Swift session 9 of at most 12.** Written 2026-10-23 at the end of S8 (Opus 5.5). Say which model you are in your first
message. This is lane 6's **second** session. The first (React, EXP-021) runs on [NEXT-SESSION-PROMPT.md](NEXT-SESSION-PROMPT.md)
in this same folder and the same package. Do not touch its files.

## Read first

1. [EXP-022](EXP-022-THE-SAME-GRAPH-IN-SWIFT.md) §9 S8: the ruling, what changed for the public, why it is not live.
2. The page's source: `~/vscode_projects/nodegx-web/site/one-graph/_page.html` (nodegx-web `28ef4c3`).

## Ruled so far, in order

1. ~~Fix add and close before the reveal~~ **done in S6.**
2. ~~The `@nodegx/core` stores in JavaScriptCore~~ **done in S7**: Swift 11 of 85, the same 11 as React.
3. ~~The reveal, "private page first, then site"~~ **ruled 2026-10-23: "the artifact text is fine, rock out".** Built as
   `nodegx.io/one-graph/`, plus one sentence on `/why/` linking it. **Built and committed, NOT live**: the push was
   refused in auto mode as a production deploy.

## This session

1. **Is it live?** `curl -s https://nodegx.io/one-graph/ | grep -c "One graph"` and `curl -s https://nodegx.io/why/ | grep -c one-graph`.
   If 0, the push is still Richard's, from nodegx-web:
   `rsync -az -e "ssh -i ~/.ssh/nexus_hetzner" --exclude _page.html site/one-graph site/why root@49.12.102.195:/srv/nodegx/site/`.
   Never `ops/deploy.sh` for this: it ships other sessions' uncommitted demos and changelog edits.
2. **Ask Richard (plain words, AskUserQuestion):** a nav slot or a homepage door for `/one-graph/`? (Not ruled; it is
   linked from `/why/` only.) From code's "Swift comes after React" is stale too: fix it in the same push?
3. **Then slack or stop, his call:** On App Error (t07, 4 scenarios) raises Swift's played count, not its conforming
   count (React fails them on filed rows). Or stop at 8 of 12: the claim is measured and published.

## What is true at the end of S8 (measured 2026-10-23)

- Swift line unchanged from S7: **11 of 85 conform, 14 played (11, 3 declared, 0 fail)**; React's 11 of 85, 18 played.
- Live `/why/` = HEAD's before the push (md5 `7377af30…`); `/one-graph/` 404.
- No code changed in S8. Open, other lanes': `P18-EXP022-S5-THROWDIVERGES`, `-S4-LABELDROP`.

## Rules this session must keep

- 🔴 **One heavy job on the box, checked BEFORE EVERY build, as its own step**: `pgrep -fl 'vitest|jest|xcodebuild|grade.mjs'`
  and `tail -2 /Users/Shared/nodegx-lab/own026/series-*.log`, and wait.
- 🔴 **Never edit `src/` while the whole suite runs.**
- 🔴 **A peer works in this package and this folder** (the React session). Commit only your paths, through a temporary
  index with compare-and-swap. Never `git add -A` at the folder level, never `git stash`, never a bare `git reset`.
- 🔴 nodegx-web has other sessions' uncommitted edits: commit by pathspec, push by folder.
- 🔴 `@nodegx/core` changed? Regenerate `src/emit/swift/coreJs.ts` (`tests/helpers/swift-core-js.ts`); S7 A1 fails until you do.
- Every bug found goes to `dev-docs/bugs/` (one file per bug), id `P18-EXP022-S9-<WORD>`.
- End: update EXP-022 §9 (S9), this file, BOARD lane 6's Swift sentence, and memory `phase-18-code-export-v2`.

## Not this session

Signing, TestFlight, a real iPhone, Kotlin.
