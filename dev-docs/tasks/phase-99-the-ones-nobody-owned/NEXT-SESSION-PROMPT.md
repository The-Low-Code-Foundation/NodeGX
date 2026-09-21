# P99 — next session

**Status: 📋 building. HLT-001 ✅, HLT-002 ✅, HLT-003 ✅, HLT-004 ✅ (s5), HLT-006 ✅ (s4, AC5 ruled
WORTHY by Richard 2026-09-21).**
Open: **HLT-005, 007, 008, 009, 011, 012, 013**, then **HLT-010 last**.

Read [README.md](./README.md) §5 for the board and §7 for the rules every task inherits. Read it
**before claiming a row** — peers have been building this phase in parallel.

## Start here

**Nothing is waiting on Richard.** HLT-006's AC5 was his last open criterion and he ruled it:
*"I'm happy with the colour pallet fix from HLT 006."* Pick a row and build it.

**Suggested: HLT-005.** It is a genuinely one-line fix with a named file and line
(`NodeComment.tsx:145`, `flex: '0 0 auto'` in a row flex container) and a control sitting beside it
(the Properties tab, which uses `flex: 1`). ⚠️ Measure §2 first anyway — see below.

## 🔴 The pattern this phase has established, FIVE times out of five

**Every task file so far has been materially wrong, and the correction was the work each time.**
HLT-001's census (78 sites, not 19). HLT-002's "detached" webview (hidden, not detached).
HLT-003's three wrong claims. HLT-006's §2 (right about enumeration, blind to the echo).
**HLT-004's §2 assumed three responses were mishandled; all three were already handled.**

⇒ **Measure your row's §2 before writing a line.** See
[[measure-the-artefact-before-believing-the-task-file]]. Budget a first hour for it; it has paid
for itself every single time, without exception.

## 🔴 What s5 changed for every row after it, and for HLT-010 especially

**A renderer "error" is not necessarily the editor's.** `.logs/dev.log` mixes two populations:

- `Runtime.consoleAPICalled` / `Runtime.exceptionThrown` — **the application's**. These carry a
  `(file.tsx:NNN)` prefix in the log.
- `Log.entryAdded` at level `error` — **Chromium's network stack**, e.g.
  `Failed to load resource: … 401`. Written **before any JavaScript sees the response**, with
  **nothing a `catch` can do about it**, and carrying **no** file prefix.

🔴 **HLT-010 must classify these separately or its budget is nonsense.** A correctly handled 401 on
a route that requires a credential is not a defect, and no amount of error handling will remove its
line — only not making the request will. The distinction is mechanically available: the file prefix.

⚠️ **And `dev-debug.js:120` mirrors BOTH into one file under one `[renderer:error]` tag**, which is
exactly why 264 events looked like 264 application faults.

## Tools s5 leaves you

- **`scripts/devtools/drive-hlt004-requests.js`** — a worked launcher drive. Two independent
  instruments (`performance.getEntriesByType('resource')` and the log), a reach arm, and a control
  that varies **the data in a store** rather than patching anything.
- **`confirmStoredSession()`** (`communitysignin.ts`) — the credential lifecycle. If you need to
  know whether the editor is *really* signed in, this is the one place that asks.
- **`get(path, { credentialed: true })`** in `communityapi.ts` — mark a route that cannot be
  answered without a token and no caller will request it without one. ⚠️ **Only mark routes you
  have MEASURED.** Two are marked; the rest were not measured and guessing turns a read that works
  signed out into one that silently stops.

## 🔴 Three traps s5 paid for — do not re-derive them

1. **`process.exit()` inside a `try` SKIPS the `finally`.** The drive's teardown never ran, and what
   it restores was **Richard's real session file**, which stayed deleted until it was put back by
   hand. A teardown that only runs on the happy path is not a teardown.
2. **A health probe that could never match.** `/ok|renderer|attached/` against `cdp health`'s
   stdout — which is JSON with the keys `url`, `title`, `mountPoint`, `rootChildren`,
   `visibleText`, `reactMounted`, and matches none of those words. It printed *"the editor came up
   — FAIL"* about an editor that was up and had already produced the measurement. **Read
   `reactMounted`.** Fourth instrument fault in this phase.
3. **Deleting a branch can blind another phase's gate.** `useLearnerPath`'s `session === null`
   branch looked like a duplicate once the client held the rule. It is
   `uni-001/session-readers.test.ts`'s **known-firing control**, and the assertion beside it goes
   **vacuous** without it. The spec said so in those words and was right.

## Rules that bit in s5 and will bite again

- 🔴 **Check the `test:ci` floor BY NAME.** 8 failures is the floor *count*; the floor is
  `{SUB-006: 3, SUB-011: 3, NDA-017: 2}`. Read `packages/noodl-editor/tests/test-results.json` —
  its `failures[].fullName` — rather than eyeballing the number.
- 🔴 **A pipe eats the exit code.** Redirect to a file and read `$?`; `${PIPESTATUS[0]}` is bash and
  this shell is **zsh**, where it is silently empty.
- 🔴 **Re-drive after your last source edit.** A control pair taken before an edit proves something
  about a build nobody is shipping.
- ⚠️ **`MEMORY.md` is at its 17,510 budget.** File new findings into a memory that already has a
  pointer, or into a `*-pointers.md` index.

## Gates, both, every time (README §7)

```
npm run typecheck:editor && npm run typecheck:editor-tests
cd packages/noodl-editor && npm run test:main      # 528/528, 8439/8439 after HLT-004
cd packages/noodl-editor && npm run test:ci        # floor: 8 BY NAME — 3 SUB-006, 3 SUB-011, 2 NDA-017
npm run lint:ci                                    # ratchet, 876 vs 3916 baseline
```

⚠️ `typecheck:core-ui` is red at 45 `TS2307` independently of this phase — pre-existing tsconfig
alias condition, no P99 file named.

## Driving

`npm run dev:debug -- --quiet` (background, ~90s warm, ~4min after a source change), then
`npm run cdp -- health`. **Drive a copy** — opening a project writes three files into it.
**`npm run dev:stop` when done**, and announce the teardown to whoever you announced the launch to.
One heavy job at a time. ⚠️ **`node scripts/devtools/stop-dev.js --list` first** to see what a
teardown would reap.
