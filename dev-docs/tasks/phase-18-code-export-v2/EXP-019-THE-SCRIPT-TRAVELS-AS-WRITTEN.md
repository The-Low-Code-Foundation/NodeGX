# EXP-019 — The script travels as written

**Scoped:** 2026-10-21 (P18 session 132, BOARD lane 6), from Richard's ruling of the same day.
**Status: 🟡 s132 — slice 1 built and graded (§6); next slice 2 (reactive) and 1b (async).** **Owner of the order:** [BOARD](../../BOARD.md) §2 lane 6.

> "If you add code export and deployment as npm things, such that nobody would ever have to use the original Noodl /
> NodeGX editor, I say make it so. I want that offramp promise fulfilled in React and Swift." — Richard, 2026-10-21

## 1. The person sentence

> "I ran `nodegx export` on my app. The Functions I wrote are in the React app, as I wrote them, and they run the way they
> ran: the one that reads the clock reads the clock, the one that remembers a count on `this` remembers it, the one that
> awaits a fetch awaits it."

## 2. What was measured first (s132, 2026-10-21)

Every template dry-run through `dist/cli.mjs export --dry-run` (`s132-hostgates/census/*.txt`), and every Function body
read with the classifier's own patterns (`jsfun.ts` `MARKER_GATES`, python over `templates/*/components/**/nodes.json`):

| fact | number |
|---|---|
| Function bodies across the 19 templates | **1,285** |
| bodies that pass every gate today | 602 |
| bodies refused by at least one gate | **683** |
| …reads the clock (`Date`) | 437 |
| …touches the browser (`window`, `document`, `localStorage`…) | 174 |
| …reads the Noodl API (`Noodl.*`) — [EXP-020](EXP-020-THE-NOODL-API-IN-THE-EXPORT.md) | 183 |
| …is asynchronous (`async`, `await`, `.then(`) | 163 |
| …draws randomness | 88 |
| …keeps state on `this` | 69 |
| …schedules timers | 27 |
| …reads `Component.*` — [EXP-021](EXP-021-A-LOGIC-COMPONENT-IS-A-HOOK.md) | 14 |
| …reaches the network (`fetch`) | 13 |
| todo-list: components that come out with nothing left over | **6 of 62** |

🔴 **The gates are shaped like the grading method, not like the product.** `jsPurityDefer` refuses `Date` as "not
deterministic", `async` because "completion ordering joins the invocation tier when the trace harness exists", `this`
because "cross-run state is Tier B". None of those bodies fails to *run* in a browser: the runtime hosts every one of them
with `new AsyncFunction('Inputs', 'Outputs', 'Noodl', 'Component', body)`, a `_this` kept per node, and the browser's
own clock. They were refused so a replayed trace would compare equal. A person leaving NodeGX does not want a replayable
export; they want their app. The ruling puts the app first and the grading adapts (§5).

## 3. The rule

**A Function body is hosted in the export the way the runtime hosts it, and what makes it impure decides *when it runs*,
never *whether it travels*.**

| the body… | today | under this task |
|---|---|---|
| is pure | inlined at each read site (reactive) or run in its handler (invoked) | unchanged |
| reads the clock, draws randomness, touches the browser, schedules timers, reaches the network | refused | **runs once per trigger with a kept node**; its outputs are read from the node's record (`materialize`), never recomputed at a read site |
| keeps state on `this` | refused | the kept node carries `self`; the body runs as `body.call(node.self, Inputs, Outputs)` |
| is asynchronous | refused | the wrapper is `async`; the run is awaited where the runtime awaits it (`runScript`'s `await`), Success and Done after it (EXP-011 §98), the click's later wires not held (§90 `detached`) |
| has no Run wire and is impure (reactive mode) | refused | runs from an effect on its inputs' arrival, as the runtime's `scheduleRun` on an input change; **slice 2** |
| reads `Noodl.*` | refused | EXP-020 |
| reads `Component.*` / is in a logic component | refused | EXP-021 |

The wrapper keeps the body verbatim (EXP-003 §4 still holds). What changes is around it.

## 4. Acceptance criteria

- **AC1 — the gates are open for an invoked run.** A Run-wired Function whose body reads `Date`, `Math.random`, a timer,
  `window`/`document`/`localStorage`, `fetch`, or `this` is exported, runs once per Run with a kept node, and a Text that
  reads its output shows what the running app shows (the React arm against the runtime-mounted arm, on a desk, the way
  s130's `success-desk` grades). Control: a pure body on the same desk, unchanged readings.
- **AC2 — `this` persists.** A body `this.n = (this.n || 0) + 1; Outputs.count = this.n` pressed three times reads `3` in
  both arms; two instances of the component keep two counts.
- **AC3 — async is awaited.** A body with `await` whose Done sets a Variable: the Variable is set after the await in both
  arms, and a Set Variable wired later on the same click runs before it (P18-S123-AWAITORDER's rule holds).
- **AC4 — reactive impure runs on arrival (slice 2).** A Function with no Run wire, `Outputs.stamp = Date.now()` fed by a
  text field: one run per arrival, none per render.
- **AC5 — the count.** The 19 templates' Function refusals by host gate (§2's 437 / 174 / 163 / 88 / 69 / 27 / 13) read 0
  for every body whose only refusal was a host gate; the emitted code of every gained node is read (EXP-011's lesson:
  the count cannot see a callback never printed); `tplbuild.ts` all 19 at the s131 floor (1 error in 1); no export on HEAD
  lost (`dispdiff.ts`).
- **AC6 — the grade adapts (§5).** ISL-043's live-against-export drive freezes the clock in both arms the same way; a
  desk row that reads `Date` compares shape, not value, and says so in its name.

## 5. Not this task

- `Noodl.*` (EXP-020), `Component.*` and logic components (EXP-021), Expression nodes that read `random` (they are
  reactive by construction; slice 2 decides).
- Idiomatising the body (EXP-003 §"Idiomatization", optional, later). The off-ramp hands the next agent the author's
  code; rewriting it is that agent's job and its claim.

## 6. Session 132 (2026-10-21): slice 1 — built, graded

[EXP-011 §102](EXP-011-PICKER-COVERAGE.md) is the ledger entry; `s132-hostgates/` holds the measurements (`census/`,
`census-after/`, `dispdiff.json`, `tplbuild.json`, `EXPECTED.md`, `mutants.py`, `census-scripts.md`).

| | |
|---|---|
| built | `jsHostTraitsOf` + `HOST_TRAIT_REASONS` (`jsfun.ts`); `JsFunctionPlan.host`, the reactive refusal, `hosted ⇒ pulsed` and "its own effect" (`plan.ts`); `runIsHosted` in the kept-node set and the run/chain split, the `.call(self)` wrapper (`component.ts`); `FunctionNode.self` handed to the body (`functionRunLib.ts`) |
| graded | `tests/the-script-travels-as-written.test.ts` 17 / 17 on the Host Desk (`tests/helpers/host-desk.ts`, corpus copy `tests/fixtures/host-desk`), predicted first in `EXPECTED.md`; 6 mutant arms, 0 survived |
| reach | 135 gained, 0 lost, 267 re-worded over 17 templates (the clock 49, the browser 39, `this` 19 fell); the emitted code of two gained nodes read |
| AC1 | ✅ for the clock, randomness, timers, the browser, `this` (A2–A5); the network is a trait but no desk row drives it (the arms have no server) |
| AC2 | ✅ A3 / A4 |
| AC3 | ⬜ slice 1b (asynchrony stays a gate) |
| AC4 | ⬜ slice 2 (81 template nodes stand behind it) |
| AC5 | the host-gate reasons read 0 among refusals in `census-after/`; `tplbuild.ts` at the floor (1 in 1); `dispdiff` 0 lost ✅ — the count against §2's per-gate numbers waits on slices 1b and 2 |
| AC6 | the desk compares shape by choosing values a true clock still agrees on (1970, `> 1`, `< 2`); ISL-043's frozen clock not yet built |
| filed | P18-S132-AUTHOREDTEXT (low), P18-S132-PREFLIGHTCOUNT (low) |
