---
id: P107-C148
title: A Script whose code throws null or undefined never runs that code again — a run, or that signal's function, is dead for the session
status: fixed
commit: cf6b4b8f8
phase: P109
task: ISL-051
severity: medium
area: runtime / Script (noodl-viewer-react/src/nodes/std-library/javascript.ts — `_callRunFunction`'s catch :499-500 calls `logJavaScriptNodeError` (noodl-runtime/src/utils.ts :24-34, row C147's logger); `_callSignalFunction` :526-530, `_callDestroyFunction` :548-549 and `_callSetupFunction` :566-567 read `Object.getPrototypeOf(e).constructor.name` inline. For a `null` or `undefined` throw each throws inside its catch, so the frame-end callback stops before `runScheduled` / `signalScheduled[name]` / `setupScheduled` is cleared (:601-606, :617-621, :586-590) and every later request is refused as "already scheduled")
found: P107 NSP-017 s66, 2026-10-09
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-017-THE-ESCAPE-HATCHES.md §6.3; the s66 probe on the runtime target, four arrivals or four pulses after the load, beside a `throw 'x'` control of the same shape — `throw 'x'`: every later arrival runs the code (count 4, 5), every later pulse runs the function (poked 3, 4), identical on the spec; `throw null` and `throw undefined`, in a run and in a signal's function: after the throw, nothing — the next arrivals and pulses reach the node and the code never runs again
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/Javascript2.json "a throw of null, in a run or a signal's function, ends that call and the next one runs (row C148)"
---

**What a person sees.** A Script's code throws nothing in particular — `throw null`, `throw undefined`, or a library call that fails
without a reason. From then on that part of the Script is dead: if it was the run, no input ever runs the code again; if it was a
signal's function, that signal never does anything again. Nothing says so. The console shows a TypeError about `getPrototypeOf` that
names neither the Script nor the code, and the rest of the app keeps going as if the Script were fine.

**Where.** Each call into the code is wrapped in a `try` whose `catch` first describes the error with
`Object.getPrototypeOf(e).constructor.name` — through `logJavaScriptNodeError` for a run, inline for a signal's function, setup and
destroy. For `null` and `undefined` that line throws, so the throw leaves the frame-end callback before it clears its flag
(`runScheduled`, `signalScheduled[name]`, `setupScheduled`). Every later arrival asks for a run, finds the flag still set, and returns.
The Function has the same logger (row C147) but no such flag, so it only goes quiet once; the Script stops for good.

**How to reproduce.** On the runtime target: a Script whose `change` counts its runs on an output and throws `null` when input `a` is
0; set `a` to 1, 0, 2, 3 with a settle after each — the count stops at 3. With `throw 'x'` instead it goes on to 4 and 5. The same
with a signal's function that throws `null` on its second pulse: the third and fourth pulses do nothing.

**Proposed fix.** One safe way to describe a thrown value, used by all four catches and by `logJavaScriptNodeError` (`e == null` →
`String(e)`), so every catch runs to its end and the flags are cleared. Fixing C147's logger alone fixes the run but not the signal,
setup and destroy paths. The Script spec already says the intended behaviour (a throw ends that call and the next call runs); add a
`throw null` scenario for a run and for a signal's function to `Javascript2.json` in the same commit.

**Fixed 2026-10-09 (P109 ISL-051 s33, `cf6b4b8f8`).** The run catch's logger was fixed with C147; the signal, setup and destroy
catches log through a local `logScriptError`, and all four word their editor warnings through a local `thrownMessage` (both safe for
any value). Local, not imported: the Script types `@noodl/runtime/src/utils` through the runtime's generated `dist-types`, so a new
export there is a type error in every checkout until its declarations are rebuilt. P107's `script-contract.test.ts` plant for "a throw
in a signal's function ends that call only" re-anchored on the new line. Control: javascript.ts from before, red on exactly the C148
scenario.
