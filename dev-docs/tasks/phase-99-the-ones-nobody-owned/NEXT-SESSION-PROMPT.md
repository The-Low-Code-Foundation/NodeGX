# P99 — next session

**Status: 📋 building. HLT-001 ✅, HLT-002 ✅, HLT-003 ✅, HLT-004 ✅ (s5), HLT-005 ✅ (s6),
HLT-006 ✅ (s4, AC5 ruled WORTHY by Richard 2026-09-21).**
Open: **HLT-007, 008, 009, 011, 012, 013**, then **HLT-010 last**.
⚠️ **HLT-007 was claimed by a peer session on 2026-09-21** — check the board and the file mtimes
before taking it ([[a-peer-may-be-doing-your-exact-task]]).

Read [README.md](./README.md) §5 for the board and §7 for the rules every task inherits. Read it
**before claiming a row** — peers have been building this phase in parallel.

## Start here

**Nothing is waiting on Richard.** HLT-006's AC5 was his last open criterion and he ruled it:
*"I'm happy with the colour pallet fix from HLT 006."* Pick a row and build it.

**Suggested: HLT-011 or HLT-012** — both were opened from a measurement rather than from a guess,
so their §2 is the one kind that has not yet been wrong here. HLT-011 (`getProjectEntryWithId`
returns the **first** match, so a click on either colliding launcher card opens the *other*
project) is the sharper person sentence. ⚠️ **HLT-009's template is another stream's** — it
committed to it again on 2026-09-21 (`60f811920`); ask before touching a file.

## 🔴 The pattern this phase established, five times out of five — and the sixth that broke it

**HLT-001** census (78 sites, not 19). **HLT-002** "detached" webview (hidden, not detached).
**HLT-003** three wrong claims. **HLT-006** §2 (right about enumeration, blind to the echo).
**HLT-004** §2 assumed three responses were mishandled; all three were already handled.

✅ **HLT-005's §2 measured TRUE** — every claim in it held, down to the line number. So the rule is
not "task files are wrong"; it is **measure before you build**, and sometimes the measurement
agrees. ⚠️ What HLT-005 found instead was that its §2's one *dismissal* — "`min-width: 0` cannot
help" — was right about the broken build and wrong as a conclusion about the fix: once the shrink
is restored, `min-width: 0` is the half that stops an unbreakable word.

⇒ **Measure your row's §2 before writing a line.** See
[[measure-the-artefact-before-believing-the-task-file]]. Budget a first hour for it; it has paid
for itself every single time, including the time it came back clean.

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

## Tools s6 leaves you

- **`scripts/devtools/drive-hlt005-comment.js`** — a worked **panel** drive: it drags the side
  panel to its real minimum and maximum through the divider's own gesture (so the clamps in
  `useSidePanelLayout.tsx` are exercised, not bypassed), flips both themes, and takes two
  independent readings of every cell — the element's rect **and** the scrollport's reachable
  `scrollLeft`. Its control is a `<style>` rule rather than a patched module, because **the panel
  remounts between widths** and anything written onto the element is gone by the second reading.
- **`tests-unit/hlt-005/commentBarWidth.test.ts`** — the shape to copy when the consequence is a
  rendered box: jsdom has no layout engine, so the spec grades the algorithm's deciding branch as
  arithmetic over declarations read from the real files, calibrated by a `describe` that requires
  the **broken** declaration to report the defect, and anchored by one that throws *"this spec is
  blind; fix it"* if the containing block it reasons about ever moves.

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

## 🔴 Three traps s6 paid for — all three printed a verdict first

**Six instrument faults in this phase now.** See [[an-instrument-must-be-armed-before-it-measures]].

1. **`root.querySelector` finds the WRONG `FrameDivider`.** One renders its own `Divider` *after*
   `Container2`, and `Container2` holds the nested one — so the nested divider is first in document
   order. The drive dragged the canvas/preview split while printing the panel's "min" and "max",
   and all four readings came back at the same width. Take the **direct child**.
2. **A fixture that FITS proves nothing in either direction.** A 139-character comment renders
   796px, which fits the 980px scrollport the panel has at its maximum — so the control arm there
   read "no overflow" and was scored a *failure to fire*. A criterion that says min **and** max
   needs a fixture that beats the max.
3. **A missing measurement reads exactly like a clean one.** `Math.max(a, undefined || 0)` is `0`,
   so a run whose panel was blank in every cell printed *"✓ THE NUMBER ... dark-min=undefined"*.
   Assert the **count of cells that produced a reading** before you are allowed to report a zero.

⚠️ **And editing editor `src/` while a drive holds the property panel open crashes it** — HMR
remounts `PropertyEditor` into `Cannot read properties of undefined (reading 'type')` and the error
boundary takes the whole side panel. A hot-reload artefact (a clean reload of the same build drives
34/34), but a drive taken straight after a source edit reads a renderer matching neither build.
**Reload, then drive.**

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
cd packages/noodl-editor && npm run test:main      # 529/529, 8450/8450 after HLT-005
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
