---
id: P18-S109-MOUNTPULSE
title: When someone cancels at the provider, Sign In With never fires Failure into the graph
status: open
severity: medium
area: "nodegx-export: `src/emit/signInLib.ts` (the mount read `applyReturn(s, current, false)`) and the differential harness that taught it (`tests/the-sign-in-with.test.ts` §C, whose NodeContext logs a signal only once the node is wired). NOT the runtime: measured, it delivers"
found: P18 EXP-011 §79, session 109, 2026-10-15
evidence: dev-docs/tasks/phase-18-code-export-v2/EXP-011-PICKER-COVERAGE.md §79.3 (finding 2); packages/nodegx-export/tests/the-sign-in-with.test.ts §C "a provider error: raised and shown at mount with no pulse"
owner: Beta sweep s18 (2026-10-27) measured it; the fix is P18's (lane 4)
regression: packages/noodl-viewer-react/tests/corpus/p18-s109-mountpulse.test.ts
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

**Measured in the runtime (Beta sweep s18, 2026-10-27): it does not reproduce there; it is an export row.** A real
component (`createCorpusGraph`: nodescope makes the nodes, then the wires) with Sign In With's Failure wired to a probe,
made while the return holds a provider error not yet announced: the probe gets **one Failure**, Error is set, one raise;
the announcement a tick later adds none (C50). Why: `sendSignalOnOutput` records the signal for the rest of the update
(`_signalsSentThisUpdate`, cleared by `scheduleAfterInputsHaveUpdated`) and `connectInput` replays a recorded signal to a
wire attached after it. The control in the same file clears that record before each wire attaches, and the probe then
gets nothing. (A node made on a later page, after the return was announced, also fires its wired Done: measured, not
pinned.) An adapter-side fix ("mark announced") was built first and taken back out once the A/B read the same on HEAD.

So the reasoning above holds for the export's model and not for the runtime: the differential harness drops a pulse
sent before wiring, and the export's lib transcribes that with a silent mount read, so **an exported app** never fires
Failure on a cancelled sign-in. The fix is the export's (read at mount with the listeners, and correct §C's harness to
replay as `connectInput` does), in lane 4, which Richard paused on 2026-10-23. `launch: beta` removed: the Beta deploys
the runtime, not an export.
