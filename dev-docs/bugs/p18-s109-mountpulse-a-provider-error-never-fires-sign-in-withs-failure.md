---
id: P18-S109-MOUNTPULSE
title: When someone cancels at the provider, Sign In With never fires Failure into the graph
status: open
severity: medium
area: runtime / Sign In With
found: P18 EXP-011 §79, session 109, 2026-10-15
evidence: dev-docs/tasks/phase-18-code-export-v2/EXP-011-PICKER-COVERAGE.md §79.3 (finding 2); packages/nodegx-export/tests/the-sign-in-with.test.ts §C "a provider error: raised and shown at mount with no pulse"
launch: beta
---

A person presses "Sign in with Google", then Cancel on Google's screen. They come back to the app with
`?nodegx_auth_error=…`. The node's Error shows the reason and the error is raised, but anything wired to Failure (or
Completed) never runs, so a "Try again" message an author wired there never appears.

Why: `ParseAuthAdapter.consumeAuthReturn` settles a provider error synchronously, while UserService is being made,
and announces it a tick later. The `Sign In With` node reads the settled state in `initialize`
(`noodl-viewer-react/src/nodes/std-library/user/signinwith.ts` :86-88) and reports it there. But `nodescope.ts` makes
every node of a component BEFORE it attaches the connections (:425 then :429), and `reportOutcome` pulses at once
(`node.ts` `sendSignalOnOutput` → `sendPulse`), so that Failure reaches no wire. The announcement a tick later, which
the wires would hear, is then ignored: P107-C50 ("Fire it once", `returnReported`) kept the report made at mount and
dropped this one. Before C50 the graph heard the second one.

The same holds for a return that already landed when a node is made later in the same page load (another page of the
app): its Done reaches no wire. That half is arguably right (a page entered again should not re-run a Done its first
visit handled), so the fix should separate the two.

Fix (proposed, small): in `initialize`, apply an in-progress state as now, but leave a settled state that has not yet
been announced to the announcement (the adapter could mark whether it has announced); or defer the mount-time report
with `scheduleAfterInputsHaveUpdated`, which runs after the wires exist. Either keeps C50's "once". Then the export's
`src/lib/signIn.ts` moves with it (its mount read is `applyReturn(s, current, false)`, the runtime's behaviour
transcribed and pinned in §C).
