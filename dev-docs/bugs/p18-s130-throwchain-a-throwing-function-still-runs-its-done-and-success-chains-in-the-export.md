---
id: P18-S130-THROWCHAIN
title: A Function whose body throws still runs its Done and Success chains in the export; the runtime sends Failure and neither
status: open
severity: medium
area: export / Function wrapper (`src/emit/component.ts` `functionFileSource`: the body in a `try`, the catch logs and returns `Outputs`)
found: P18 session 130, 2026-10-19, measuring when the runtime sends Success (P18-S129-FNSUCCESS)
evidence: dev-docs/tasks/phase-18-code-export-v2/s130-fnsuccess/EXPECTED.md ("A throw"); noodl-runtime/src/nodes/std-library/simplejavascript.ts `runScript` (the catch: Error, the raise, Failure)
---

The runtime runs the body inside a `try`; a throw (or a rejected promise) goes to the catch, which writes Error, raises
and sends Failure. **Success and Done are not sent.** The exported wrapper of a Function also runs the body in a `try`,
but its catch only logs ("Function node X threw") and returns `Outputs` as the body left them, and the run's chains are
printed after the call unconditionally. So in the export a throwing run still runs its Done chain, and since
P18-S129-FNSUCCESS its Success chain, on the outputs the run left (an output written before the throw, or the value a
run before left, or `undefined`).

Measured on the Success Desk with the greeting throwing for "Bob" (both arms' error check lifted, in a copy; `Clear` set
`order` to "cleared" first): Say → runtime said "said nothing", order "cleared", the click's later wire runs; export said
"" (`undefined` written), order "done" (the Success and Done chains both ran).

A Function's Failure wired is refused by name ("its failure output is consumed"), so no exported run has a Failure chain;
what is wrong is only that its other chains run. Reach not measured (which template bodies can throw is a reading of
each body). A fix: the wrapper reports the throw (a `threw` flag on the run, as `runFunction` returns its pulses), and the
chains after it are guarded; a non-pulsed run, whose reads inline the call at each sink, would need one call first.
