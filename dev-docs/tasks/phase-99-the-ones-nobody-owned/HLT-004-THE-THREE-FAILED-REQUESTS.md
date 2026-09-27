# HLT-004 — The three failed requests

**Three network failures on every launch. This task's deliverable may legitimately be "two of these
are correct" — but it must be written down, because right now nobody knows.**

## 1. The person sentence

> **Someone reading the log of a fresh launch can tell, without asking anyone, which failed requests
> are a bug and which are the editor correctly coping with being signed out.**

## 2. What it is

| request | status | first guess, NOT a measurement |
|---|---|---|
| `feed.json` | **404** | the community feed; the file may simply not exist at the URL the editor asks for |
| `profile` | **401** | user profile — plausibly correct while signed out, but the launcher showed `@richardosborne14` **signed in**, which makes a 401 suspicious |
| `path` | **401** | unclear; the name alone does not identify the caller |

🔴 **The signed-in state is the reason this is a task and not a shrug.** The session that produced
these had `Signed in to the NodeGX community` on screen. A 401 on `profile` while signed in is
either a real auth defect or a request made before the token is loaded — and those have very
different fixes.

## 2a. 🔴 What the measurement says — and §2 was wrong, five for five

**Measured 2026-09-21, before a line was written.** The pattern this phase has established held
again ([[measure-the-artefact-before-believing-the-task-file]]): §2's table is a table of guesses,
it says so, and every one of them was wrong in the same direction — it assumed the editor was
**mishandling** three responses. It is not. All three are handled, carefully, and were before this
task existed.

| request | the caller, by file:line | classification |
|---|---|---|
| `whats-new/feed.json` **404** | `editor/src/whats-new.ts:31`, via `getContentEndpoint()` | ✅ **correct behaviour** — and the *origin* is a new row, **HLT-013** |
| `/api/v1/me/profile` **401** | `communityapi.ts:2484` `myListing()`, from `useCommunityPeople.ts:176`, mounted by `ProjectsPage.tsx:405` | 🔴 **defect** — fixed here |
| `/api/v1/me/path` **401** | `communityapi.ts:2555` `path()`, from `useLearnerPath.ts:195`, mounted by `ProjectsPage.tsx:392` | 🔴 **defect** — fixed here |

### 🔴 (a) The console line is not the editor's, so "handle it better" cannot reach zero

`whats-new.ts` checks `res.ok` and resolves to `null`; `CommunityApiClient` grew a whole
`unauthenticated` variant **for these exact two routes** — `communityapi.ts:1368` says so outright,
*"`GET /api/v1/me/path` is the first read that answers 401"* — and **twenty-nine** modules render
it. Nothing throws. Nothing is unhandled.

The log line comes from **Chromium's network stack**, as a `Log.entryAdded` entry
(`dev-debug.js:120`), emitted before any JavaScript sees the response. No `catch` can suppress it.
**The evidence is visible in the log's own format**: every application console line carries a
`(file.tsx:NNN)` prefix and these three carry none.

⇒ **The only way to stop writing them is not to make the request.** Every assertion in this task's
spec and drive therefore counts **requests**, not outcomes.

⚠️ **AC2's second clause rested on the same wrong premise** and is amended in §4 rather than
quietly dropped. *"A request that is expected to 401 is handled, not thrown at the console"* is
already true and always was, and it does not remove a single line.

### 🔴 (b) The defect nobody owned: a rejected credential is never forgotten

AC3 demanded the signed-in arm, and it is the whole finding. The launcher showed
`@richardosborne14` because **`useCommunityAccount` sets `phase: 'signed-in'` from the mere
presence of a local file** — `~/Library/Application Support/NodeGX/nodegx.community.session.json`,
written **2026-08-20** — and never asks the platform whether that credential still means anything.

Measured against the live platform, 2026-09-21:

```
/api/v1/me          no token      200  viewer=null
/api/v1/me          STORED token  200  viewer=null      ← the platform does not know it
/api/v1/me/path     stored token  401
/api/v1/me/profile  stored token  401
```

🔴 **The editor already holds the platform's answer and never compares it to its own claim.**
`useCommunityPeople` calls `me()` on every launch, in the same `Promise.all` as the profile read.

🔴 **And `clearCommunitySession` had EXACTLY ONE CALLER in the repository** — the deliberate
sign-out at `communitysignin.ts:214`. Twenty-nine places handle `unauthenticated`; every one
renders a sentence, **not one forgets the credential the platform just rejected**. So a dead token
is re-sent on every launch, for ever, under a card that keeps claiming the handle cached beside it.

**This is §2 of the phase board in miniature, and it is the best specimen the sweep has produced.**
Nothing slipped through: the `unauthenticated` outcome was *designed*, argued in three separate
doc comments, and wired into twenty-nine renderers. What had no owner was the **credential's
lifecycle** — a thing no single task was ever about
([[an-unowned-row-gets-rediscovered-at-full-price]]).

### ⚠️ (c) `/api/v1/me/profile` is requested SIGNED OUT, by a rule another phase's spec enforces

`useCommunityPeople.ts:165` makes the listing read **unconditional**, deliberately: UNI-001 AC4
counts `session?.token` and expects it once per client, because *"a third use is a third place a
decision could hide."* Correct — and it means a **signed-out** editor 401s on `/me/profile` on
every launch, for ever, with nobody signed in to blame.

So the fix is in **two halves**, and neither alone reaches zero:

1. **The route declares it needs a credential, in the client** (`communityapi.ts`, `get(path,
   { credentialed: true })`), so no caller requests it without one. ⚠️ Marked at the **call site**,
   not matched against a path table — a second list of "which routes need a token" is a copy of a
   fact the platform owns ([[a-second-copy-of-a-palette-drifts-silently]]). ⚠️ Only the **two
   routes measured** are marked; marking one on a guess is how a read that works signed out
   quietly stops being made.
2. **`confirmStoredSession()`** (`communitysignin.ts`) asks `/api/v1/me` once at launch and forgets
   a token the platform answers `viewer: null` to. 🔴 It asks **`/me`, not the route that failed**:
   forgetting on a 401 from any authenticated route hands every route a veto over the account, and
   one deploy answering 401 where it meant 503 signs out every editor on earth. `/me` answers 200
   for everybody, so there is no failure mode to confuse. ⚠️ **Every inconclusive answer keeps the
   session** — offline, a 500, an unparseable body, a payload with no `viewer` field at all.

⚠️ **This removed a gate rather than adding one.** `useLearnerPath`'s `session === null` branch was
the *only* copy of "do not send it", which is exactly why the identical route on the identical
launcher went out anyway. It now lives in the client, once.

### 🔴 (d) §3's "Out" line contained the defect

§3 excludes *"the launcher's signed-in state"* — written from the guess, and the measurement puts
the defect inside it. The card claiming a session the platform rejects **is** the defect, and AC2's
count cannot reach zero without it ([[a-tasks-out-of-scope-line-can-contain-the-defect]]). §3 is
amended below. Still out, and genuinely: redesigning auth, the device flow, and the feed itself.

### ⚠️ (e) The content origin is entirely unpublished — HLT-013

`feed.json` is not a missing file. **`https://the-low-code-foundation.github.io/` answers 404 for
the whole site**, so all **six** payloads `getContentEndpoint()` serves — the library index,
lessons, project templates, tutorials and the what's-new feed — are dead. `getContentEndpoint`'s
own docblock has carried the reason since 2026-08-13 (ALPHA-006 B5, a repoint nobody made) and
records *"the Library panel has been erroring ever since"*. That is far past this task's scope and
is **not** left as an observation: it is **HLT-013**.

## 3. Scope

**In:** identifying each caller, deciding fixed-or-correct, and recording the decision. **AMENDED
2026-09-21 by the measurement:** and the **lifecycle of the credential the two 401s are about** —
because §2a(d) found the defect sitting inside the line below that excluded it.

**Out:** redesigning auth, the device sign-in flow, and the content feed itself (→ **HLT-013**).
~~the launcher's signed-in state~~ — 🔴 **struck.** That line was written from §2's guess. The
launcher claiming a session the platform rejects *is* the defect, and AC2's count cannot reach zero
while it stands ([[a-tasks-out-of-scope-line-can-contain-the-defect]]). What stays out is the
**design** of that card; what came in is whether the claim it makes is **true**.

## 4. Acceptance criteria

1. **Each of the three is attributed to a named caller** — file:line — and classified as either
   **a defect with a fix** or **correct behaviour with a committed note** saying why. An
   unclassified request fails this AC.
2. **(the number)** For every one classified as a defect: a fresh launch logs **0** of it.
   ⚠️ **SECOND CLAUSE AMENDED — it rested on a false premise (§2a(a)).** It read *"the editor no
   longer logs it as a failure — a request that is expected to 401 is handled, not thrown at the
   console."* Every one of these **was** already handled, and it removes no line: the line is
   Chromium's network stack, not the editor's console. **It now reads:** for every one classified
   as correct, the task records *why* it is correct and *who* owns the origin, and the drive
   **counts it anyway** so a later reader does not rediscover it as an unfixed bug.
   🔴 **And the number is a count of REQUESTS as well as of log lines**, because a request that is
   not made is the only thing that removes a network log entry.
3. ⚠️ **The signed-in arm is run explicitly.** Measure `profile` **signed in** and **signed out**,
   in the same session pair. A reading taken only signed-out would call the defect correct
   ([[a-control-pair-proves-what-you-varied-only]]).
4. `test:ci` at the floor — **and `test:main` green** (P99 §7: they are different gates and
   neither is a superset).
5. **(added by the measurement)** The credential lifecycle has a **spec with a known-firing
   control**: a route marked `credentialed` makes no request without a token, an *un*marked route
   still does, and `confirmStoredSession` forgets a rejected token while keeping one on **every**
   inconclusive answer.

## 5. Landmines

- 🔴 **`path` is an unidentifiable name.** Do not guess from it — find the caller. A row that names
  the wrong subsystem is worse than no row ([[a-predicted-sentence-belongs-to-one-code-path]]).
- ⚠️ **A 404 on a feed may be a server-side fact, not a client defect.** If so the fix is the
  editor's handling, and the row says so rather than reading as an unfixed bug forever.
