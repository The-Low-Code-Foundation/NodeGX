---
id: P107-C147
title: A Function whose code throws null or undefined reports nothing — no Error, no Failure, and a Run is never answered
status: fixed
commit: cb7ea0fab
phase: P109
task: ISL-051
severity: medium
area: runtime / Function (noodl-runtime/src/utils.ts `logJavaScriptNodeError` :24-34 — `Object.getPrototypeOf(err)` throws "Cannot convert undefined or null to object" for a `null` or `undefined` throw; it is the first line of simplejavascript.ts `runScript`'s catch :654, so the rest of the catch never runs and `runScript`'s promise rejects unheard)
found: P107 NSP-017 s65, 2026-10-09
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-017-THE-ESCAPE-HATCHES.md §6.2; the s65 probe on the runtime target beside a control — `throw 'x'`: Error "x", Failure, a Run answered failure (function/script-threw), identical on the spec; `throw null`: nothing at all after the load or the Run (no Error value, no Failure, no outcome), and jest reports the unhandled TypeError
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/JavaScriptFunction.json "a throw of null or undefined is a throw: Error \"null\", Failure, and a Run answered failure (row C147)"
---

**What a person sees.** A Function's code rejects with nothing — `throw null`, `throw undefined`, `Promise.reject()` awaited, or a
library that rejects without a reason. The Function goes quiet: Error stays as it was, Failure does not fire, Success does not fire,
and a Run that asked is never answered, so a chain wired to Done or Failure stops dead. The console shows a TypeError about
`getPrototypeOf` that names neither the Function nor the code.

**Where.** `runScript` catches the throw and first calls `logJavaScriptNodeError(e)` (:654). That logger reads
`Object.getPrototypeOf(err).constructor.name`, which throws for `null` and `undefined`. The throw escapes the catch, so the lines that
write Error, raise the failure and report the Run's outcome never run, and the async `runScript`'s promise rejects with nobody
listening. The catch's own message line already handles the case (`e && e.message ? … : String(e)` gives "null").

**How to reproduce.** On the runtime target: Function `throw null`; settle; pulse Run; settle — no events after either settle.
Beside it, `throw 'x'` gives Error "x", Failure, then the Run answered failure.

**Proposed fix.** Make the logger safe for any thrown value (`error == null` → log `String(error)`), so the catch runs to the end:
Error "null" (or "undefined"), Failure, a Run answered failure (function/script-threw). That is what the Function spec already says;
add a `throw null` scenario to `JavaScriptFunction.json` in the same commit (the spec plays it today only by its fixture
`throw "bare " + Inputs.a`, because an unhandled rejection fails the whole jest suite on the runtime target).

**Fixed 2026-10-09 (P109 ISL-051 s33, `cb7ea0fab`), as proposed — and one more read.** `logJavaScriptNodeError` is safe for any
thrown value (signature unchanged), and `thrownMessage` is the one rule for what a thrown value says. The catch's editor warning also
read `e.stack`, which threw the same way whenever an editor was connected (the runtime target has one: that line alone turned the
scenario red) — now read only off a value that has one. Control: utils.ts and simplejavascript.ts from before, red on exactly the C147
scenario.
