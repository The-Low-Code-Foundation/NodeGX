---
id: P18-S119-FIRSTWRITE
title: A Function that writes an output twice and then fires a signal hands the signal's target the first value, not the last
status: fixed
commit: c92a376fa
severity: low
area: runtime / Function signal outputs (C7 lockstep, GAM-011)
found: P18 session 119, 2026-10-16, measuring what a Function's own signal chain reads before translating it (lane 6)
evidence: dev-docs/tasks/phase-18-code-export-v2/s119-fnchain-measure/sigprobe.js and sigprobe.out (the runtime's own Function node into a recorder that reads its value input at the pulse, and again after inputs have updated); dev-docs/tasks/phase-18-code-export-v2/s119-pulse-drive/ (in a running app: the same empty Send shows nothing the first time and the sentence the second)
launch: beta
regression: packages/noodl-runtime/test/p18-s119-firstwrite.test.ts
---

`Outputs.a = ''; if (bad) Outputs.a = 'Please fill it in'; Outputs.go();` delivers `''` to whatever `go` runs, both
at the pulse and in an after-inputs-updated callback (where a record verb or a cloud call reads its inputs). The
second write arrives one drain pass later, after the target has already acted.

This is C7 as `nodegx-core/CONTRACT.md` describes it: each target drains one queued entry per port per pass, values
before signals, so the k-th pulse reads the k-th value queued since the run began. The probe's readings all follow
that rule: `a=1; go(); a=2` reads 1; `go(); a=3` reads 3; `a=1; go(); a=2; go2()` reads 1 at `go2`; `a=1; a=2; go()`
reads 1; an output the run does not write reads the last run's value.

**In a running app** (`s119-pulse-drive`, the runtime arm): a Send button runs a Function whose body is
`Outputs.problem = ''; if (name === '') { Outputs.problem = 'Type a name first'; Outputs.refused(); return; }`, and
`refused` sets the Variable a Text shows. The first empty Send shows **nothing**; the second shows the sentence (by then
`''` is the value held, so writing it again publishes nothing and the sentence is the only value queued).

**Why it is a question:** GAM-011 says a value written in the same run as a signal is sent with that signal, and an
author writing a reset followed by a set reads the body top to bottom and expects the last value. The runtime is the
reference (P107 R3 (a)) until Richard rules.

**The question in plain words:** "When a Function sets the same output twice before sending a signal, should the
node the signal runs see the last value (what the code says by the time it sends) or the first (what the runtime
does today)?"

**Reach:** small. 532 Functions on this machine fire a signal of their own that something consumes; 14 assign one
output more than once in their text, and the ones read so far (Todo `Set deadline`, `tpl001` Setup, `pack-it` Home)
assign it on exclusive branches, so no run writes it twice. The export follows the runtime here (EXP-011 §86), so a
ruling for "last" changes both.

**Ruled by Richard, 2026-10-27 (Beta sweep s19): "The last value".** Asked: *"When a script sets the same output
twice and then fires a signal, which value should the signal carry?"* — the last value (a value set twice with no
signal in between replaces the first; runtime and export) / keep the first and say so. Re-measured at HEAD before
asking: `Outputs.a = 1; Outputs.a = 2; Outputs.go()` reads 1; the reset-then-set reads `''` (s119's `sigprobe.js` with
the three cases its `.out` holds, which the committed script lacked).

**Built s19, runtime and both exports together.** `simplejavascript.ts`: a changed value is held (latest write wins)
and sent before the next signal the code fires or when the run's synchronous part returns; a change after an `await`
or in a timer goes on a microtask (`holdChange`, `sendHeldChanges`, `sendingChangesAfterTheSyncPart`, at the file's
end; no plant string moved). nodegx-export `functionRunLib.ts` does the same (`changed`, flushed at each signal and
in a `finally` after the body); the Swift copy `functionRunJs.ts` regenerated from it. CONTRACT.md C7 and the
Function spec's header say it. The spec stays v3: a lone node's trace already showed one send (Function conforms).
- `test/p18-s119-firstwrite.test.ts` 5/5; HEAD's file: 4 red, the separating case green on both (its control).
- s119's `sigprobe.js` cases: the eight earlier ones byte-identical, the three this row is about read the last value.
- Runtime: 21 Function files 223/223, C7 pairing 5/5, `NSP_ONLY=JavaScriptFunction` conforms. Viewer (ES5 build) 5/5.
- Export: `the-function-sends-its-signals` 38/38 (its lockstep control now names five cases, this one left), and
  HLS-001's golden: the four `functionRun.ts` hashes moved (counted: held/host/pulse/ticked-desk), plus sheet-desk's
  `package.json` and `parse.ts`, which s11's fast-xml-parser 5 pin (0d822ff67) had left red. Two text pins dropped
  `const ` from `finished = body(…)` (the `finally`). tsc clean.
