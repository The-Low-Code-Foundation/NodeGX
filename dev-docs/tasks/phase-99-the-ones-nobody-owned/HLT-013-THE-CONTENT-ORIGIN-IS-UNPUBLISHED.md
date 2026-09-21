# HLT-013 — The content origin is unpublished, and six features read from it

🔴 **Opened by HLT-004, 2026-09-21 — measured, not speculative.** Not a row about a missing feed
file. **The entire origin answers 404**, and the editor reads six payloads from it.

## 1. The person sentence

> **Someone who opens the Library panel sees the library, because the editor reads its content
> from somewhere that is actually published — or, if nothing is, says so once instead of failing
> six features silently.**

## 2. What it is, measured 2026-09-21

`getContentEndpoint()` (`packages/noodl-editor/src/editor/src/utils/getContentEndpoint.ts`) returns
`https://the-low-code-foundation.github.io/nodegx-content/static`. Every probe:

```
/nodegx-content/static/whats-new/feed.json   404
/nodegx-content/static/library.json          404
/nodegx-content/static/                      404
/nodegx-content/                             404
https://the-low-code-foundation.github.io/   404      ← the whole Pages site
```

⚠️ **The root 404 is the finding.** A missing `feed.json` would be one dead decoration; a Pages
site that serves nothing means **every** payload behind this origin is dead. Its own docblock
names six: *"the library index, lessons, project templates, tutorials, what's-new feed"* plus the
sixth it counts.

🔴 **It has been written down, correctly, for six weeks, and had no owner.**
`getContentEndpoint.ts`'s docblock records the cause in detail — `opennoodl-docs` was renamed to
`nodegx-content` on 2026-08-07, **GitHub Pages does not follow a repo-rename redirect**, ALPHA-006
B5 owed the repoint and *"nobody made it, and the Library panel has been erroring ever since."*
The `/static` suffix was added to cope with a *legacy* Pages build. The comment is a precise,
honest account of a defect **filed as an observation inside the file that has it** — §2 of the
phase board, again ([[an-unowned-row-gets-rediscovered-at-full-price]]).

⚠️ **So the `/static` suffix may now be wrong too, and it cannot be told apart from the outage.**
A site serving nothing 404s at every path, so nothing here distinguishes *"the suffix is wrong"*
from *"the site is unpublished"*. **Do not change the suffix on the strength of a 404** — that is
an elimination over an unchecked list ([[elimination-over-an-unchecked-candidate-list]]). Establish
what is published first.

## 3. Scope

**In:** finding out what, if anything, `nodegx-content` publishes and where; repointing
`getContentEndpoint` at it; and — whatever the answer — making the editor's behaviour when the
origin is dead a **deliberate, stated** one rather than six independent silent failures.

**Out:** writing the content. Whether `whats-new` should exist at all. The community platform,
which is a different origin and is **up** (`community.nodegx.io` answers 200).

## 4. Acceptance criteria

1. **The origin's real state is measured and written down** — what the repo publishes, at what URL,
   under which Pages build type. ⚠️ A repoint made without this is a guess that 404s differently.
2. **Each of the six consumers is named** with the payload it reads, and each is either served or
   recorded as knowingly unserved. A consumer nobody listed is a consumer that stays broken.
3. **(the number)** A fresh driven launch fetches the library index and **gets it**, or the editor
   states once that content is unavailable. 🔴 The bar is the P99 bar: a driven session, not a
   green suite.
4. ⚠️ **`whats-new.ts` must keep resolving a dead origin to `null` without throwing.** It is the one
   consumer already doing the right thing (HLT-004 §2a(a)) and a repoint must not cost that.
5. `test:ci` at the floor and `test:main` green.

## 5. Landmines

- 🔴 **A 404 from a dead site cannot tell you your path is wrong.** See §2.
- ⚠️ **The local-docs branch (`useLocalDocs` → `localhost:3000`) has no `/static` suffix** and is a
  different arrangement. A fix that only works there fixes nothing shipped.
- ⚠️ **The console line is Chromium's**, so "handling it better" removes nothing from the log —
  HLT-004 §2a(a) paid for that lesson and this row inherits it. The number moves when the request
  succeeds or is not made.
