---
id: P116-S13-REL002B
title: The members' area with no backend bound says "Nobody has set this up yet" instead of "This members' area is not connected yet" — REL-002b's fail-closed drive is red
status: open
severity: medium
area: templates / members' area (TPL-001) first-run states — `packages/noodl-mcp/tests/tpl001Components.ts`; graded by `packages/nodegx-backend/tests/rel002b-fail-closed.test.ts:500`
found: P116 s13, 2026-10-09 (a whole nodegx-backend run, taken for bug P116-ONT-003-pairs)
evidence: packages/nodegx-backend/tests/rel002b-fail-closed.test.ts "§4 V4 — with nothing bound, the first run is a screen and not a shrug › 🔴 says what is wrong, in a sentence"
---

A person opens a members' area whose backend is not connected. The page should say it is not connected (the
fail-closed state REL-002b built). Instead it shows the first-run state for a backend that answered and has no
moderator yet: "Nobody has set this up yet … Set it up". A person who cannot connect is told to set something up.

Measured 2026-10-09 ~22:50 CEST, the whole `nodegx-backend` jest run with `-w 2` on HEAD `0859bbbde` plus P116 s13's
uncommitted delete-path edit: `expect(at['unbound./'].visit.text).toContain('This members’ area is not connected yet')`
fails. The received text opens "Nobody has set this up yet". P82's last recorded reading of this spec was 38/38.

Not P116's: the spec never deletes (no `DELETE`, no `rawDelete`), and the failing visit is the `unbound` one, where no
backend answers. P116 s13 changed only `AdapterFacade.rawDelete`'s plan. Not measured: which commit since P82 turned
it red, or whether the template's state choice or the drive's "unbound" set-up moved. Re-run the spec alone before
building on this.
