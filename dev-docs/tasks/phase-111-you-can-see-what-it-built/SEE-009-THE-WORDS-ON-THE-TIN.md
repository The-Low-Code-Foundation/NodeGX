# SEE-009 — The words on the tin: four reasons, each with its number

**Opened 2026-10-01.** **Depends on SEE-001…008 (each reason needs its gate to exist).**
**Status: 📋 not started.**
**Direction, 2026-10-05:** the four reasons in §2 are replaced by restraint, testing, security and do it yourself
([DIRECTION.md §3](../../DIRECTION.md#3-the-four-reasons)). §2 stays as the first draft. Rewrite it from DIRECTION.md
when this task starts, with each reason bound to the gate named in that table's third column.

## 1. The person sentence

> **Someone landing on nodegx.io who already vibe-codes reads four reasons to add NodeGX, each one a sentence a person
> can check, each one linking to the gate or the number that makes it true today, and none of them a promise.**

## 2. The four reasons (README §2, in the site's words)

| reason | sentence | bound to |
|---|---|---|
| See it | "Open the app your agent built and see what every screen is made of, and what each part does, in words." | SEE-007 AC1–2; NSP-019 |
| Trust it | "Every NodeGX app carries one number: how much of it is made of parts whose behaviour is specced and tested. Here is the training template's." | SEE-001's ratchet, live |
| Steer it | "Click a thing in your running app and change its colour, its limit or its wiring. No code, no canvas, unless you want it." | SEE-007 AC3 |
| Leave or arrive | "Export to React and keep the live picture. Or point NodeGX at your React app and get the picture and the number." | SEE-003 AC1; SEE-006 AC2 |

And beneath them, the harness sentence for developers: "Every primitive has an executable spec and a conformance suite
any target runs. 77 of 147 and counting." bound to P107's ledger.

## 3. What to build

1. The section on nodegx.io (memory: *changelog = SITE*; the landing page lives on nexus-1, see
   `nodegx-io-landing-page-on-nexus-1`), with each sentence linking to a public page that renders the gate reading or
   the number from the repo's ledgers at build time, not typed by hand.
2. The same four in the repo README and in the unbound MCP briefing (SEE-008 §3.5), one source string each (memory:
   *copy a measurement depends on goes in one module*).
3. A test that each sentence's bound gate exists and is green at the commit the site is built from; a red gate pulls
   the sentence from the page and leaves the heading with "not yet."

## 4. Acceptance criteria

1. The four reasons are live on nodegx.io and each link resolves to a reading with a date and a commit.
2. Breaking the honesty ratchet locally pulls the "Trust it" sentence from a local site build.
3. Richard reads the page cold and says whether he would click. His words here.

## 5. Watch for

- Memory: *a claim written into a doc can grade the code it describes.* The sentences are bound to gates so that the
  page cannot say something the product stopped doing.
- Memory: *links DEAD in chat*; the site's links are real links and that rule does not apply to them.
