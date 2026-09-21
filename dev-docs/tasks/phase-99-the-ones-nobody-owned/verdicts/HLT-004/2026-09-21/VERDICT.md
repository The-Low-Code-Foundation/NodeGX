# HLT-004 — verdict, 2026-09-21

**BUILT.** `/api/v1/me/path` and `/api/v1/me/profile`: **0 requests and 0 `401` log lines on a
fresh driven launch, against a control that fired 1 of each on the identical build.**
`feed.json` classified **correct behaviour** against a dead origin, and its origin opened as
**HLT-013** rather than left as an observation.

Instrument: `scripts/devtools/drive-hlt004-requests.js` (`--arm fixed` / `--arm control`).

## The pair

| | `/me/path` requests | `/me/profile` requests | `401 (path)` log | `401 (profile)` log | REACH `/api/v1/me` |
|---|---|---|---|---|---|
| **control** — a dead token in the store | **1** | **1** | **1** | **1** | 5 ✅ |
| **fixed** — no credential | **0** | **0** | **0** | **0** | 2 ✅ |

🔴 **Neither arm means anything alone, and the reach arm is why the zeros are readable.** An editor
whose launcher never mounted its community surfaces requests nothing, logs nothing, and passes.
`/api/v1/me` is requested by `useCommunityPeople` on every launch and is **not** credentialed, so it
fires in both arms — the known-firing signal beside the absence
([[assert-an-absence-with-a-known-firing-signal-beside-it]]).

✅ **Two independent instruments, and they agree.** The renderer's own
`performance.getEntriesByType('resource')` list (what the fix changes) and the `401` lines in
`.logs/dev.log` (the number §3 of the board counts). A disagreement would have been a finding;
there was none.

✅ **The control varies the DATA, not the code** — a synthetic token planted in the store, on the
shipped build, with no patch of any kind. ⚠️ It never touches a real credential: measured the same
day, a garbage bearer and no bearer get identical answers from the platform. The drive backs up and
restores whatever was in the store.

✅ **The fix's own mechanism is graded in the arm that provokes it:** the control asserts the dead
credential is **gone from the store by the end of the launch that discovered it**. It was.

## The finding, which is the phase's thesis in miniature

🔴 **`clearCommunitySession` had EXACTLY ONE CALLER in the repository** — the deliberate sign-out.
**Twenty-nine** modules handle a read or write coming back `unauthenticated`; every one renders a
sentence, **not one forgets the credential the platform just rejected.** So a dead token was
re-sent on every launch, for ever, under a launcher card drawing the handle cached beside it.

Measured on Richard's machine: a session written **2026-08-20**, and

```
/api/v1/me          STORED token  200  viewer=null     ← the platform does not know it
/api/v1/me/path     stored token  401
/api/v1/me/profile  stored token  401
```

🔴 **The editor already held the platform's answer and never compared it to its own claim** —
`useCommunityPeople` calls `me()` on every launch, in the same `Promise.all` as the profile read.

**Nothing slipped through.** The `unauthenticated` outcome was *designed*, argued across three doc
comments, and wired into twenty-nine renderers. What had no owner was the **credential's
lifecycle** — a thing no single task was ever about ([[an-unowned-row-gets-rediscovered-at-full-price]]).

## 🔴 §2 was wrong, and that is five for five in this phase

It assumed three responses were being **mishandled**. All three were handled. **The log line is
Chromium's network stack**, a `Log.entryAdded` entry written before JavaScript sees the response —
visible in the log's own format, since every application console line carries a `(file.tsx:NNN)`
prefix and these carry none. ⇒ **Only "do not make the request" removes one**, which is why both
instruments count requests. AC2's second clause was amended rather than quietly dropped.

⚠️ **And §3's "Out" line contained the defect** — it excluded *"the launcher's signed-in state"*,
which is exactly where the lie lived ([[a-tasks-out-of-scope-line-can-contain-the-defect]]).

## What shipped

1. **`communityapi.ts`** — `get(path, { credentialed: true })`. A route that cannot be answered
   without a credential is not requested without one. ⚠️ Marked at the **call site**, never matched
   against a path table; ⚠️ **only the two routes measured** are marked.
2. **`communitysignin.ts`** — `confirmStoredSession()`. Asks `/api/v1/me` once and forgets a token
   the platform answers `viewer: null` to. 🔴 **It asks `/me`, not the route that failed**:
   forgetting on a 401 from any authenticated route hands every route a veto over the account.
   ⚠️ **Every inconclusive answer keeps the session** — offline, a 500, an unparseable body, a
   payload with no `viewer` field. Specced four ways.
3. **`useCommunityAccount.ts`** — calls it, and lets the store's existing change notification do the
   rest. The instant local read is **kept**, so a signed-in user sees no flash of "Sign in".
4. **`useLearnerPath.ts`** — its `session === null` branch **removed**. It was the only copy of "do
   not send it", which is precisely why the identical route on the identical launcher went out
   anyway ([[a-second-copy-of-a-palette-drifts-silently]]).

## ⚠️ What this verdict does NOT claim

- **The transition launch is not zero.** An editor holding a dead token makes those two requests
  **once** more, then forgets it and is zero for ever after. That is the control arm, and it is
  recorded rather than hidden.
- **The `feed.json` 404 was never reproduced by this drive, and that is correct.**
  `whatsnewRender()` is called from `EditorPage.tsx:152` — on **opening a project**, not on the
  launcher, which is the surface this drive measures. Both arms read `feed404=0` for that reason and
  not because anything was fixed. It belongs to **HLT-013**.
- Nothing here proves the other authenticated routes are clean; none of them was measured.

## 🔴 Instrument faults, both of which printed a verdict first

1. **The health probe matched a regex that could never match.** `/ok|renderer|attached/` against
   `cdp health`'s stdout — a JSON object whose keys are `url`, `title`, `mountPoint`,
   `rootChildren`, `visibleText`, `reactMounted`. It reported *"the editor came up — FAIL"* while
   the editor was up, had logged both 401s and had already forgotten the credential. Fixed by
   reading `reactMounted`. Fourth instance in this phase
   ([[an-instrument-must-be-armed-before-it-measures]]).
2. 🔴 **`process.exit()` inside a `try` SKIPS the `finally`, so the teardown never ran** — and the
   thing the teardown restores was **Richard's real session file**, which stayed deleted until it
   was put back by hand. A teardown that only runs on the happy path is not a teardown. Every arm
   now returns; only `main` exits.

## Gates

| gate | result |
|---|---|
| `typecheck:editor` | ✅ exit 0 |
| `typecheck:editor-tests` | ✅ exit 0 |
| `test:main` | ✅ exit 0 — **528/528 suites, 8439/8439 tests** (HEAD was 527/8425; the delta is exactly this task's 13 specs + 1 added to `uni-007`) |
| `test:ci` | ✅ **at the floor** — 3036 specs, 8 failures **by name** (3 SUB-006, 3 SUB-011, 2 NDA-017), seed 49007. ⚠️ Exit 1 IS the floor; the count was checked by name, never by number |
| `lint:ci` | ✅ exit 0 — 876 errors vs the 3916 baseline, unmoved |

⚠️ **Both arms were re-driven after the last source change**, and the numbers in the table above
are that build's, not an earlier one's ([[a-control-pair-proves-what-you-varied-only]] — a pair
that predates an edit proves something about a build nobody is shipping).

## 🔴 Two specs went red and BOTH were right — one of them reversed a decision

`test:main` caught what neither the drive nor `typecheck` could.

1. **`uni-001/session-readers.test.ts` refused to pass blind.** *"The anchor
   `setPath({ outcome: 'unauthenticated' })` is not in the source any more — this spec is blind,
   fix it."* HLT-004 had deleted `useLearnerPath`'s `session === null` branch as a duplicate of the
   new client-level mark. It is that gate's **known-firing control**, and its sibling assertion —
   that `client.intake()` is NOT session-gated — is **vacuous without it**: an instrument that
   cannot find a gate reports *"not gated"* about a file containing none
   ([[a-new-check-can-downgrade-an-existing-one]]). ✅ **The branch was restored.** The two are
   redundant and cannot drift: both say *do not request a path without a credential*, and a copy
   that can only ever AGREE is not the failure mode [[a-second-copy-of-a-palette-drifts-silently]]
   names — that one is a copy of a TABLE somebody edits.
2. **`uni-007/communityapi-path.test.ts` caught a real narrowing.** Three cases built a
   **token-less** client purely as a convenience while testing the *status mapping* — 404→`absent`,
   503→`unreachable`, a dead socket→`unreachable` — and the short-circuit now answers
   `unauthenticated` before any of them. ✅ Each was given a token, which restores exactly what it
   was written to prove: most sharply the first, whose whole point is that an expired credential and
   a dead socket must **not** read the same, a distinction that only ever mattered to somebody
   **holding** one. ✅ And the short-circuit is now asserted in that file too, **on the request
   count rather than the outcome** — `unauthenticated` is what a real 401 produces as well, so an
   outcome-only test passes on the old client and proves nothing.

⚠️ Both suites, per P99 §7 — they are different gates and neither is a superset
([[test-main-is-an-unwatched-ci-gate]]).
