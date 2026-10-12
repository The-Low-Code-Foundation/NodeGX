---
id: P107-D25
title: Request Magic Link's Error says "empty until one does" fail and is cleared on a Done — but the clear never reaches a wire, so a label keeps the last failure after a success
status: fixed
commit: f34e59460
phase: P109
task: ISL-030
severity: low
area: runtime / Request Magic Link (`requestmagiclink.ts` :157-161) — CONTRACT C3 (`Node.sendValue` never sends `undefined`, node.ts :820-822)
found: P107 (the node says what it does) s28, 2026-10-02
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/net.noodl.user.RequestMagicLink.json "A Done after a Failure clears Error to blank text, and the wire lets go of the failure (v2, D25)"
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-014-BATCH-DATA-AND-CLOUD.md §6.22 (row D25); scenarios/net.noodl.user.RequestMagicLink.json "A Done after a Failure …"; the equivalent mutant declared for it
---

On a Done the node sets `_internal.error = undefined` and flags Error ("Last, after the value it clears"). `undefined` is
never sent, so nothing reaches the wire: a Text showing Error keeps "Too many requests." after the next request
succeeded. Measured on the runtime: Failure (`error: "Too many requests."` sent), then a Done — that frame sends only the
outcome, nothing on Error.

The clear is unobservable on every port, so the conformance runner cannot kill a mutant that drops it — declared
equivalent (`equivalent-mutants.ts`), pointing here. Sign In With's return leg clears its Error the same way on a
success (`applyReturn` :217-220) — read, not measured (the return leg is not played yet).

The same shape as C47 (a User node's fields after sign-out). Log In, Sign Up and Log Out never clear their Error at all.

**Plain words:** *"After a magic-link request fails and then succeeds, the Error text still shows the old failure.
Send an empty text on success?"* (one decision with C47's "is 'empty' a blank text or nothing at all").

**Proposed:** send `''` rather than `undefined` when a node clears a text output it once filled.

**Ruling:** R3 (a) — the runtime wins until Richard rules.

**Ruled 2026-10-05 (Track F rulings page), as recommended: "Clear it to blank text".** A Done sends blank text on Error, so the label empties. A tiny change, following whatever the User node ruling decides 'empty' means. The question as asked: *"Should a successful request clear the Error text on the wire?"* (https://claude.ai/artifact/CPcSy8ABRQpn2dMZYuvXDH)

**Fixed f34e59460 (P109 ISL-030, 2026-10-06), as ruled.** A Done sets Error to blank text, which is sent, so a label lets go of the last failure. Request Magic Link v2; the equivalent mutant that pointed here is gone (the clear is observable and killed). Sign In With's success clears its Error the same way (`applyReturn`) and was not part of this ruling: filed as P109-S24-SIGNINWITHERRORKEPT.
