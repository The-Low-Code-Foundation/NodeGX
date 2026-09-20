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

## 3. Scope

**In:** identifying each caller, deciding fixed-or-correct, and recording the decision.

**Out:** redesigning auth, the community feed, or the launcher's signed-in state.

## 4. Acceptance criteria

1. **Each of the three is attributed to a named caller** — file:line — and classified as either
   **a defect with a fix** or **correct behaviour with a committed note** saying why. An
   unclassified request fails this AC.
2. **(the number)** For every one classified as a defect: a fresh launch logs **0** of it. For every
   one classified as correct: the editor no longer logs it as a *failure* — a request that is
   expected to 401 is handled, not thrown at the console.
3. ⚠️ **The signed-in arm is run explicitly.** Measure `profile` **signed in** and **signed out**,
   in the same session pair. A reading taken only signed-out would call the defect correct
   ([[a-control-pair-proves-what-you-varied-only]]).
4. `test:ci` at the floor.

## 5. Landmines

- 🔴 **`path` is an unidentifiable name.** Do not guess from it — find the caller. A row that names
  the wrong subsystem is worse than no row ([[a-predicted-sentence-belongs-to-one-code-path]]).
- ⚠️ **A 404 on a feed may be a server-side fact, not a client defect.** If so the fix is the
  editor's handling, and the row says so rather than reading as an unfixed bug forever.
