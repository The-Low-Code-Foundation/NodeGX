---
id: P134-S10-SIGNINERROR
title: "export suite: Sign In With's Error reads undefined after Done in the runtime's own node, where the-sign-in-with's §C expects an empty string — nine rows red"
status: open
severity: medium
area: the runtime's Sign In With node against the export's library (`packages/nodegx-export/tests/the-sign-in-with.test.ts` §C)
found: P134 session 10, 2026-11-04, the whole nodegx-export suite in band, run for SELECTREFUSED
evidence: §C "a return: Signing In at mount, then Done once the exchange lands" — log `0:done [false,null,null]` where `[false,"",null]` is expected, and `0:error` undefined where "" is expected; eight more §C rows red the same way, the mutant row among them
---

Not session 10's: the test drives the runtime's own `signinwith.ts` in a NodeContext, and session 10 changed only the
export's plan and printers. Either the runtime's node stopped clearing Error to `''` on Done, or the spec's prediction is
the old runtime's. Which one is the runtime's owner's to say; the export's library follows whichever is right.
