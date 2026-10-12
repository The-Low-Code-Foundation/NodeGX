# NSP-015 — Batch: navigation, popups, component utilities

**Opened 2026-09-29.** **Depends on NSP-008** (graph scenarios) and R4 = continue.
**Status: 🟡 14 of 14 (+ NSP-012's Run Tasks) — AC2 left — s15 (2026-10-01): the component boundary, the Component Object family, component DEFINITIONS; s16: the world's LOCATION (`open`), External Link; s17: LOCATION's `history` and `dispatch`, the world's PROJECT, Navigate To Path (rows C24, C25, D20, D21); s18: the world's STACK, Push Component To Stack, Pop Component Stack (rows C26, C27, C28); s19: the world's ROUTE, Navigate, Page Inputs (row C29); s20: the world's POPUP, Show Popup, Close Popup, the popup round trip as a graph (rows C30, C31, C32). Left: AC2 (the export, P18); AC6 is the Router's (§6.1e).**

## 1. The person sentence

> **Moving between pages, opening popups, and passing values in and out of components behaves the
> same on every target — the parts of an app a person notices first when they are wrong.**

## 2. The nodes (from the census)

**14**, from the census ([CENSUS.md](CENSUS.md), NSP-000, generated 2026-09-30). Regenerate the census; do not edit this list by hand.

- **T4 graph (14):** Component Inputs · Component Outputs · Close Popup (`NavigationClosePopup`) · Show Popup (`NavigationShowPopup`) · Component Object (`net.noodl.ComponentObject`) · External Link (`net.noodl.externallink`) · Parent Component Object (`net.noodl.ParentComponentObject`) · Set Component Object Properties (`net.noodl.SetComponentObjectProperties`) · Set Parent Component Object Properties (`net.noodl.SetParentComponentObjectProperties`) · Page Inputs (`PageInputs`) · Push Component To Stack (`PageStackNavigate`) · Pop Component Stack (`PageStackNavigateBack`) · Navigate To Path (`PageStackNavigateToPath`) · Navigate (`RouterNavigate`)

Census notes:
- **Component Inputs** — the interface every component depends on — parent + child scenarios, placed more than once
- **Close Popup** — returns values to the Show Popup that opened it — the round trip is the scenario
- **External Link** — the world records the last external URL opened
- **Navigate** — observable as a location change in the world, not a rendered page

## 3. What is special here

- **Navigation is observable as a route change**, not a rendered page: the world gains a
  **location** (path, history stack, the last external URL opened). Specs assert location events;
  what renders at the new route is NSP-016's concern.
- **Component Inputs/Outputs** are the interface every component depends on (the MCP's
  instructions call it "the ONLY thing that makes an instance parameter arrive"). Their scenarios
  are graph scenarios with a parent and a child instance, placed more than once.
- **Popups** return values through Close Popup's outputs to the Show Popup that opened them; that
  round trip is the scenario.

## 4. Acceptance criteria

As NSP-011 §4, plus:

5. A component placed **twice** with different inputs produces two different traces (the control
   that proves inputs arrive at all).
6. Navigate → back → Navigate produces the same location stack on the runtime and the export.

## 5. Watch for

- Memory: *a hash change is not a navigation — `#hash` does not reload.* The location world must
  model hash and path changes separately.
- Memory: *a page is only reachable if a Router lists it.* Graph scenarios that navigate must
  include the router, or they grade a page nobody can reach.

## 6. Built

### 6.1 s15 (2026-10-01) — the boundary, and the Component Object family

**The format** ([graph.ts](../../../packages/nodegx-node-spec/src/graph.ts) BOUNDARY; not a guarded file, so
no stranger re-grade): a component instance may declare its `component` name, its ports (`inputs` / `outputs`:
port name → `'value'` | `'signal'`) and its instance `params`. Every instance is then a SUBJECT like a node —
an endpoint for wires (`"a.Total"`), a target for `set` / `signal` steps (the parent setting its input), named
by claims, its events in the trace under its id. Declaration order: instances, then nodes. Node and component
ids are one namespace. There is no shared component DEFINITION: a component placed twice is two instances with
their own nodes — per instance is what the runtime grades too (one scope each).

**The runtime target**: each instance is now the runtime's own `ComponentInstanceNode` (s10 built a stand-in
owner); after its nodes mount it finds its `Component Inputs` / `Component Outputs` and registers the declared
ports as `setComponentModel` does (componentinstance.ts :91-95), and is adopted as a handle. Two harness facts
found on the way: the instance's prototype is built from read-only DESCRIPTORS, so the intercept installs its
wrappers as own writable properties; and an instance's teardown resets its whole scope, so it is disposed as a
node only (the runner disposes each inner node). A component SIGNAL port crosses as the runtime carries every
pulse — `true` then `false`, sent at once — and is recorded as a `signal` on the instance's signal outputs and on
the matching `Component Inputs` outputs (the first recording showed `value false`: right on the wire, wrong as a
trace). The 22 s10 scenarios (stand-in owners → real instances) are unmoved.

**Scenarios** ([t08](../../../packages/nodegx-node-spec/scenarios/graph/t08-the-component-boundary.json),
[t09](../../../packages/nodegx-node-spec/scenarios/graph/t09-component-object.json)), claims written from the
sentence before recording:

| scenario | grades | result |
|---|---|---|
| a component placed twice (Ann / Bo), one instance's input moved (Cy) | Component Inputs; **AC5** (the package test asserts the two instances' inner traces differ) | ✅ all claims on first record |
| a value written into Component Outputs leaves the instance; two Add pulses in one frame count twice | Component Outputs, C4 across the boundary | ✅ |
| a signal leaves a component (Press → Pressed → a Counter in the parent), 1 then 2 pulses | Component Outputs (signal), C4 | ✅ |
| Component Object per INSTANCE; Set Component Object Properties writes only the listed properties; Fetch | Component Object, Set Component Object Properties, S2 | ✅ |
| Parent Component Object: nearest / named ancestor; Set Parent …: writes it; a name not an ancestor fails with its error | Parent Component Object, Set Parent Component Object Properties | ✅ (two claims of mine named unwired outputs — a Component Object output exists only once wired; sinks added) |
| Parent Component Object created BEFORE its parent's Component Object | the "nearest" sentence | ✅ (was row C23; ruled "fix it" and fixed s16) |

**Then DEFINITIONS** (graph.ts DEFINITIONS): a component a NODE makes by name — a scenario's `definitions`
(name → ports, its own nodes with params, its own wires), which the runtime target registers as the app's project
does: a real `ComponentModel` from export data (componentmodel.ts `createFromExportData`), so the node's own
`nodeScope.createNode(name)` builds it with the runtime's `setComponentModel`. A definition's nodes are not
subjects (the runtime mints their ids per instance); they are seen through the node that made them. `mountGraph`
may be async now (the model is built asynchronously, as the loader builds it); a new claim kind counts OUTCOMES
(a pulse on an outcome port is folded into the outcome event, so no `signal` claim could see Run Tasks' answer —
the gap s10 named on C15). One harness fact: the headless runtime loads no project, so the graph model had no
`variants` list and every runtime-made instance threw in `setNodeParameters`; the target now has a project with
no variants (as it has one with no colour styles).

| scenario | grades | result |
|---|---|---|
| Run Tasks over a Job template (Component Inputs → Condition → Component Outputs): two ok items → Done; one not ok → Failure (`run-tasks/tasks-failed`); no items → Done; Aborted 0 | Run Tasks (NSP-012's exempt T4 node) | ✅ — the frames are the recording's (the task is built through awaits), the answers are the sentences' |

**Not done**: the eight navigation / popup nodes. Show Popup and Push Component To Stack make an instance by name
(a definition now covers that half) but hang it under the viewer's visual nodes — `showPopup` builds a `Group`
in the ROOT component's scope and needs `onShowPopup`; the page stack is a visual node — so they wait on
NSP-016's visual layer or a stand-in for it. Navigate / Navigate To Path / Pop / Page Inputs / External Link need
the world's LOCATION (§3). AC2 (export): this harness emits ONE component — every boundary and definition
scenario is `outside` in those words.

### 6.1b s16 (2026-10-01) — the world's LOCATION, and External Link (7 of 14)

**The design step (§3), decided from what the family calls, not from what it renders.** Every node in this batch
writes the browser's location through exactly two calls: `window.open(url, target, features)` (External Link,
Navigate's new tab, Navigate To Path's new tab) and `history.pushState({}, '', url)` (Router, Page Stack, Navigate
To Path, `api/navigation.ts`), and reads `location.hash` / `pathname` / `search` and listens for `popstate` /
`hashchange` (router.tsx :152-169, :678-708; navigation-stack.tsx :193-210, :648-671). Path versus hash is only the
SHAPE of the URL handed to `pushState` (router.tsx :805-818, the project's `navigationPathType`), and a `pushState`
never fires `hashchange` — the memory's "a hash change is not a navigation" is a browser rule the world keeps.
So the world records each call AS HANDED, exactly as the network does a request, and parses nothing on the way in
(world.ts LOCATION, the header every target reads):

| call | trace event | built |
|---|---|---|
| `window.open(url, target, features)` | `{ t: 'open', url, target, features }` — each canonical, as handed; grouped after `request` | ✅ s16 |
| `history.pushState(state, title, url)` | `{ t: 'history', op: 'push', url }`; the location's path / search / hash become the URL resolved against the current one; no `popstate`, no `hashchange` | named, for Navigate |
| user activation | not an event: the script's `activation` (`true` / `false` / absent = no `userActivation` API) — a fact of the play | ✅ s16 |

A location exists exactly when the play has a window (VIEWPORT): a server render has neither. `window.open`
returns `null` (what a `noopener` open returns, and the world has no second window).

**Format** (guarded: `src/trace.ts`, `schema/trace.schema.json`, `src/spec.ts`, `src/world.ts` — hashes refreshed,
all three stranger rounds re-graded green, `17 skipped, 101 passed` with schema and world): the `open` event;
`WorldNeed` `location`; `WorldView.userActivation()`; a patch's `open` effect (only with a window — the
interpreter refuses one without); `WorldPool.activations` (default `true`, `false`, none). The generator gives a
`location` spec a window or none (the viewport pool) and an activation or none. The runtime target attributes
each `window.open` to the updating node, as it does a request.

**External Link** — [external-link.ts](../../../packages/nodegx-node-spec/src/nodes/external-link.ts), 9 hand
scenarios. CONFORMS on the runtime on its first run (9/9, 200/200, 12/12 mutants) and on the interpreter
(`tests/batch-navigation.test.ts`). A first-run green corrects no guess, so the runtime's own traces were read
(probe): the blocked press still carries its `open` after the Failure; `'yes'` opens `_self` with the new-tab
features; two presses in a frame open twice. Not graded: the export (AC1's export half — the export harness plays
the latch nodes only; routed to P18 with the other navigation nodes).

**Read in the source, worth a sentence (not rows — each is what the code says it does):** the two reads of Open
In New Tab disagree for a truthy non-`true` value (features from truthiness :52, target from `=== true` :53 —
`'yes'` gives the same tab with `noopener`); `Error` is never cleared (a blocked press then a Done leaves the
blocked message); Link is handed to the browser unconverted.

**Left: 7** — Show Popup, Close Popup, Push Component To Stack, Pop Component Stack, Navigate To Path, Navigate,
Page Inputs. The `history` half of LOCATION is theirs (Navigate To Path and Pop need nothing visual beyond it;
Navigate needs a Router, which is a visual node — a stand-in or NSP-016), and popups need the viewer's visual layer.

### 6.1c s17 (2026-10-01) — LOCATION's `history` and `dispatch`, the world's PROJECT, Navigate To Path (8 of 14)

**The design step, finished from what the family calls.** s16 named two calls; reading Navigate To Path, Router,
Page Stack and `api/navigation.ts` again found THREE: `window.open`, `history.pushState` and a bare
`dispatchEvent(new PopStateEvent('popstate'))` (navigate-to-path.ts :219, navigation.ts :83 — a push fires no
`popstate`, so the node tells its router itself). Each is recorded as handed, and the three are ONE group in the trace
in the order made, after the requests (trace.ts) — so "push, then dispatch" is graded as an order:

| call | trace event | the world |
|---|---|---|
| `window.open(url, target, features)` | `{ t: 'open', url, target?, features? }` — a target or features not handed is ABSENT (s17: Navigate To Path hands no features) | returns `null` for `noopener` / `noreferrer`, or when the popup blocker refuses (activation `false`, a target that is not the page itself); otherwise a stand-in window. **s16's "always `null`" was wrong for any node that checks the handle** — Navigate To Path's new-tab arm would have read every open as blocked |
| `history.pushState(state, title, url)` | `{ t: 'history', op: 'push', url }` | the href moves to `url` resolved against it; a url on another origin is refused with a `SecurityError` (`DOMException`), recorded, href unmoved — as a browser does; no `popstate`, no `hashchange` |
| `window.dispatchEvent(event)` | `{ t: 'dispatch', event: <type> }` | the play's listeners for that type run at once, in subscription order; `PopStateEvent` and the bare `dispatchEvent` are the play's |

The href starts at the script's `location` (default `https://app.example/`); a page reads `location.href` / `pathname`
/ `search` / `hash` live (the router's reads, for Navigate later). **PROJECT** is a seventh seam: the script's
`projectSettings`, what a node reads through `NoodlRuntime.instance.getProjectSettings()` — Navigate To Path's
`navigationPathType` (`hash` when unset). The runtime target installs it with `graphModel.setSettings` and makes its
runtime the static `instance` for the play.

**Format** (guarded: `src/trace.ts`, `schema/trace.schema.json`, `src/spec.ts`, `src/world.ts` — hashes refreshed;
the three stranger rounds green in the full run): the `history` and `dispatch` events; `open`'s `target` / `features`
optional; a patch's `push` and `dispatch` effects; `WorldView.opens(target, features)`, `pushes(url)`,
`projectSettings()`; `WorldNeed` `project`; `WorldPool.projectSettings`; `locationEvent(call)` — the one translation
from a call to its event, shared by the interpreter and the runtime target.

**Navigate To Path** — [navigate-to-path.ts](../../../packages/nodegx-node-spec/src/nodes/navigate-to-path.ts),
19 hand scenarios, claims written from the source before the runtime was recorded. On the runtime: **CONFORMS** —
17 / 19 + 2 known (C24, C25), 200 / 200 (33 attributed to C24), 26 / 26 mutants; on the interpreter 19 / 19, 200 / 200,
every mutant killed. **Deep (10,000, shrink on, seed 20727):** Navigate To Path CONFORMS, 10,000 / 10,000, 26 / 26
mutants (known: C24 1,959, C25 45, C6 2); External Link CONFORMS, 10,000 / 10,000, 12 / 12 — the s16 spec under the
s17 world (its opens now return a window or `null` by the blocker's rule, which it never reads). A first-run green corrects no guess, so the runtime's own traces were read (a probe): the hash
push is `#/product/42` and the href moves to `https://app.example/#/product/42`; the path type pushes
`/product/42`; two presses push once and answer Done twice; a blocked new tab opens `#/home` with no features and
reports blocked; the refused push is recorded and nothing follows. The rule in one paragraph is the spec's header:
every press in a frame is answered with the outcome of ONE navigation made against the frame's final inputs.

**Rows (§6.2)**: C24 and C25 — the frame-end callback THROWS (the scheduler logs it) and the frame's presses are
never answered: a Path that is not text (`.match` on `null`), and a push the browser refuses (another origin with
the Path URL type). The spec answers both with a Failure (proposed). D20 (`$&` in a parameter value, String Format's
D3 again) and D21 (Query values unencoded — `a&b` is two parameters, a `#` moves the hash) are what the code does;
the spec follows it.

**Read in the source, worth a sentence (not rows):** Open in new tab opens the HASH url (`#/home`) in the new tab,
relative to the current page; the Query names are neither trimmed nor de-duplicated (`a, b` names ` b`); an empty
Path navigates to the bare `#`; `null` on a Query value is appended as `null` (part of D21).

**Not graded:** the export (AC1's export half; routed to P18 with the family). Pop Component Stack, Push Component To
Stack and Navigate read and write the location too, but through the Page Stack / Router, which are visual nodes.

### 6.1d s18 (2026-10-01) — the world's STACK, Push Component To Stack and Pop Component Stack (10 of 14)

**The decision s17 left open — a stand-in, not a wait for NSP-016 — made from what the two nodes call.** Neither node
touches the Page Stack's visual tree. Push Component To Stack hands `{ target, transition, params }` and three callbacks
to `NavigationHandler.instance.navigate(name, …)` / `.replace(name, …)` (navigate.ts :176-232); Pop Component Stack
calls a `backCallback` the stack installed on it when it built the page (navigate-back.ts :154-168,
navigation-stack.tsx :981-991) and reads the `{ ok }` / `{ unchanged }` / `{ code, message }` it returns. That is a
protocol against something outside the node — HTTP Request's shape — so the world plays the stack's side, and what a
real stack does with a request (which page, how deep, the transition) stays the Component Stack's own spec (NSP-016).
The Router (`RouterHandler.instance.navigate`, router-handler.ts) has the same shape, so Navigate can reuse the seam.

**STACK, the eighth seam** (world.ts header, the rule every target reads): each call recorded AS HANDED, a `stack`
trace event in the LOCATION group, in the order made — `{ op: 'push' | 'replace', stack?, target?, params, transition }`
(canonical AT THE CALL: the node hands live objects) and `{ op: 'back', action?, results }`. The handler's rules are
the world's: a blank name is `Main`, a name nobody registered is queued and never answered in a play, every stack
under the name answers and the node settles once. A stack's answer is the script's (`answers`, first match on `op` /
`target`, `done` otherwise): `unchanged` / a failure inside the call, `done` a microtask later — both in the same
settle. A pop's answer is the n-th of the script's `back` (absent: the node is not in a pushed page). **On the runtime
target the handler is the viewer's REAL `NavigationHandler`**, a fresh one per play (its `instance` is process-wide
and its queue would outlive the play), with the node's call recorded at it and a stand-in stack registered per name —
so its queue / fan-out / `Main` rules run for real and are graded against the world's model of them (measured: a push
to an unregistered name sits in the real handler's queue; the play's handler is restored after). A Pop Component Stack
in a play that puts it in a pushed page gets the world's back callback at mount, as the stack installs its own.

**Format** (guarded: `src/trace.ts`, `schema/trace.schema.json`, `src/spec.ts`, `src/world.ts` — hashes refreshed, the
three stranger rounds green in the full run): the `stack` event; `WorldNeed` `stack`; a patch's `stack` and `back`
effects; `WorldView.stackAnswer(op, stack, target)`, `backAnswer(ahead)`; `WorldPool.stacks`; `stackEvent`,
`stackName`, `WorldStack`.

**Push Component To Stack** — [push-component-to-stack.ts](../../../packages/nodegx-node-spec/src/nodes/push-component-to-stack.ts),
14 hand scenarios, claims from the source before the runtime ran. First run: 3 / 14 — ONE wrong claim, everywhere: the
spec started Stack at its declared default `Main`, and the runtime hands `undefined`. **A declared `default` never runs
its setter** (nodedefinition.ts :539, :575 write it into `_inputValues` only — filtercollectionnode.ts :170 says so);
the handler maps `undefined` to `Main`, so the app never noticed. Fixed in the spec; the same wrong sentence was in
External Link's and Navigate To Path's specs (harmless there — one reads `getInputValue`, the other's `initialize` sets
`false`) and is corrected. Then **CONFORMS**: 14 / 14, 200 / 200, 46 / 46 mutants; on the interpreter likewise.
**Deep (10,000, seed 20727): CONFORMS, 10,000 / 10,000, 46 / 46 mutants** (known C6 129).

**Pop Component Stack** — [pop-component-stack.ts](../../../packages/nodegx-node-spec/src/nodes/pop-component-stack.ts),
11 hand scenarios. **CONFORMS** on its first run: 11 / 11, 200 / 200, 928 / 933 mutants with 5 declared equivalent —
Results and Back Actions are stored and never read (they name the editor's ports, nothing more), and the frame end's
drop-set on branches only a sequence's LAST settle reaches (States' case exactly: a scenario that settles again kills
it, and every two-press scenario does). Deep run NOT RUN (933 mutants; the box was at load 7 — a quiet-box job). The
runtime's traces were read (probe): two presses in one frame pop twice, the first carrying the action, the second told
"still animating"; the queued push keeps the params of its call (`{ id: 1 }`, not the later 9).

**Read in the source, worth a sentence:** the code comment at navigate-back.ts :116-117 says a frame's later pops "land
on the stack's end-stop and report Unchanged" — a real stack tells them "still animating" (Failure): `back()` sets
`isTransitioning` before the next pop asks (navigation-stack.tsx :1048-1050, :1067). The Failure port's own description
is right. Two back actions in one frame: the first pop carries the LAST one pressed.

**Rows (§6.2)**: **C26** (Back Results / Back Actions never connect — the TypeScript port dropped
`registerOutputIfNeeded`; measured with Show Popup's twin as the control), **C27** (the node hands its live parameter
object, so a second push of the same page with new parameters is "already showing" — measured on the real
`_isAlreadyShowing`; the stand-in cannot show it), **C28** (a Mode that is neither push nor replace answers nothing —
graded; the spec follows the runtime). The ports `target` and `pm-<name>` come from the PROJECT (the Component Stack
named Stack, its pages, the target component's inputs) — not derivable from the node's params alone: NSP-020's case.

**Not graded:** the back channel to the pusher (C26 makes it reach nothing on the runtime; once fixed, the world's
STACK grows a scripted pop of a pushed request); the export (AC1's export half, P18); AC6 (needs Navigate).

### 6.1e s19 (2026-10-01) — the world's ROUTE, Navigate and Page Inputs (12 of 14)

**The seam, from what the two nodes call.** Navigate (`RouterNavigate`) hands `{ target, params, openInNewTab }` and
three callbacks to `RouterHandler.instance.navigate(router, …)` (router-navigate.ts :129-147) — STACK's shape, so the
world plays the Routers the same way. But it is its own event, not a `stack` op: a Router is not a Component Stack, and
its HANDLER has other rules, all read from router-handler.ts :51-94 and graded against the real one: it hands a request
on **1 ms later** (`setTimeout`, the world's clock), and only then picks the routers; **one registered name takes every
request** whatever the node named; otherwise the name is looked up AS HANDED — **there is no blank-is-`Main` rule on
this side** (only `registerRouter` maps `name || 'Main'`), so with two Routers a Navigate whose Router is blank or unset
is queued for good (the editor's adapter fills Router with the first Router's name when it is unset, so an author meets
this only by clearing it). Page Inputs has no behaviour of its own: the Router that built its page hands it the params
(`_setPageParams`, router.tsx :604, :926), and they are merged in. **The Component Stack never calls it** — it sets the
page component's own inputs (navigation-stack.tsx :974-977) — so Page Inputs only ever hears from a Router; its two
docblocks (:54, :82) say "the Router / Component Stack".

**ROUTE, the ninth seam** (world.ts header): a navigate is a `route` trace event in the LOCATION group, `{ router?,
target?, params, openInNewTab }`, canonical at the call; the script's `router` is `{ names, answers, page }` — `answers`
first-match on `target` (canonically), `noTarget: true` (Target never set — JSON cannot say `undefined`, and a `null`
Target is the Router's page-not-found, not its no-target) and `openInNewTab`, `done` when none fits; a failure or
`unchanged` told inside the +1 ms timer, `done` a microtask later. `page` is what the Router hands its page's Page
Inputs: entries with no `at` at the build (the mount — they land in the first settle), later ones at `at` on the clock
(a reset onto the same page). **On the runtime target the handler is the viewer's REAL `RouterHandler`**, fresh per play
(a process-wide static with a queue), the node's call recorded at it, a stand-in router registered per name; a Page
Inputs is handed the script's params at mount and on the clock, as the Router hands them. Measured (probe): a
navigate's answer lands only after `advance 1` (`advance 0` answers nothing), so the handler's `setTimeout` is the
world's; an unanswered navigate sits in the real handler's `_navigationQueue` under its name; the handler is restored
after the play.

**Format** (guarded: `src/trace.ts`, `schema/trace.schema.json`, `src/spec.ts`, `src/world.ts` — hashes refreshed, the
three stranger rounds green in the full run): the `route` event; `WorldNeed` `router`; a patch's `route` effect;
`WorldView.routeAnswer(router, target, openInNewTab)`; the world handler `page(state, inputs, params)`; `WorldPool.routers`;
`routeEvent`, `routerName`, `WorldRouter`, `RouterScript`, `RouteRule`; `Clock.step(until)` (T9 below). The spec asks the clock for the handler's
millisecond itself (`after: [{ ms: 1, tag: 'route' }]`) and reads `routeAnswer` when it fires. The mutant runner wraps
`world.page` like the other handlers.

**Navigate** — [router-navigate.ts](../../../packages/nodegx-node-spec/src/nodes/router-navigate.ts), **v2**, 22 hand
scenarios, claims from the source before the runtime ran. v1 conformed at 200 on its first run (19 / 19, 33 / 33 — the
interpreter's first run left two `world.timer` drop-set survivors, killed by two scenarios with a second navigate inside
the millisecond) and the probe read its traces — **and the 10,000 deep run found one divergence** (seed 3333277567,
shrunk to 7 steps): two navigates answered in one millisecond, the first Done, the second a no-target Failure; the
runtime reports the FAILURE first. Read: `hasNavigated` / `hasUnchanged` settle at the frame's end
(`scheduleAfterInputsHaveUpdated`, :134-143), `hasFailed` at once (:144-146) — so a later navigate's Failure overtakes an
earlier one's Done. The spec's header said so; its reducer settled both in arrival order. **v2**: the timer queues
Done / Unchanged (`answered`) and the frame-end reducer reports them, before the frame's own new navigate (the runtime's
callback order). Writing v2's scenario found a second thing — **T9, a hole in the runtime TARGET**: its `advance` stepped
the clock one due TIME at a time, so two timers due at the same moment (two navigates' +1 ms) fired in one sweep and the
first's microtask answer (a stand-in router's `done`) landed after the second's — against world.ts CLOCK's own rule
("what each timer delivers lands BEFORE the next one fires"; Node and browsers run microtasks between same-time timers).
Fixed: `Clock.step(until)` fires ONE timer, and the target yields after each; every other runtime spec re-graded green
under it (3 suites, 147 passed). Then **v2 CONFORMS**: 22 / 22, 200 / 200, 74 / 74 mutants; **deep (10,000, seed 20727):
CONFORMS, 10,000 / 10,000, 74 / 74** (known C6 93).

**Page Inputs** — [page-inputs.ts](../../../packages/nodegx-node-spec/src/nodes/page-inputs.ts), 8 hand scenarios.
**CONFORMS on its first run**: 8 / 8, 200 / 200, 1 / 1 mutant; **deep (10,000): CONFORMS, 10,000 / 10,000**. Read in the probe: params `{ id: 1, tab: 'a' }` at the
build send both ports in the first frame; `{ id: 2 }` at +5 moves `pm-id` and leaves `pm-tab` at `a` — the merge the
Router's own TODO admits (router.tsx :520). Its ports are DERIVED from its params (one `pm-<name>` per distinct non-empty
name in Path / Query Parameters, split on `,`, untrimmed) — NSP-020's good case: drawable without a viewer.

**Row C29 (§6.2)** — Push Component To Stack's C27 on the Router: the node hands its LIVE `pageParams` (:132), the
Router keeps it as `currentParams` (router.tsx :917), so a second navigate from the same node to the same page with new
parameters compares an object with itself and answers Unchanged; the page stays. Measured: two presses hand the same
object (`===`), the first navigate's params read `{ id: 2 }` after the second write; the real `_navigateInCurrentWindow`
(the Router's own definition, `default.node.methods`) with that object as `currentParams` answers `unchanged`, with a
copy `{ id: 1 }` builds. The method's docblock (:882-883) names this case as the one the params keep safe.

**AC6 is the Router's, not Navigate's.** The handoff framed it as "Navigate → back → Navigate needs `history.back` and
a `popstate` the world fires". Read: Navigate never touches the location — the ROUTER pushes the URL
(`_updateUrlWithTopPage`, router.tsx :822-830) and listens for `popstate` to route back. With the Router played by the
world, a "location stack" after Navigate → back → Navigate is the Router's behaviour. AC6 moves to the Router's spec
(NSP-016, a visual node) and the export (P18); nothing in NSP-015's nodes can grade it.

**Not graded:** the export (AC1's export half, P18); the Router itself (NSP-016).

**Next, named: POPUP, the tenth seam (Show Popup, Close Popup).** Show Popup calls `this.context.showPopup(target,
popupParams, { stackPolicy, closeOnEscape, modal, accessibleName, onCancelPopup, onDismissPopup, onClosePopup })`
(showpopup.ts :249-276) and settles on the promise it returns (Done) or its rejection (Failure `show-popup/target-failed`);
no Target is Failure `show-popup/no-target` before anything is handed. Closed / Dismissed / Cancelled / a close action
come back LATER through the callbacks — world deliveries on the clock. Close Popup resolves a close handler the popup
publishes (`_popupCloseHandler`, closepopup.ts :192-240) — Pop Component Stack's back callback, the other side. The world
can play `NodeContext.showPopup` as STACK plays a stack; the stacking policy and the overlay are the context's / a visual
node's. Show Popup also hands its LIVE `popupParams` — check whether `showPopup` keeps it before calling it a row.

### 6.1f s20 (2026-10-02) — the world's POPUP, Show Popup and Close Popup (14 of 14)

**The decision s19 named, made from what the two nodes call.** Show Popup calls `this.context.showPopup(target,
params, args)` (showpopup.ts :249-276) — RUNTIME code, not a visual node: `NodeContext.showPopup` (nodecontext.ts
:1212-1330) owns the popup stack and its policy (one modal slot unless Show On Top, claimed synchronously; Escape
cancels the top MODAL popup only; a close leaves at the next frame's start). So, unlike STACK and ROUTE, the thing
called is graded, and the world plays only what lies outside the runtime: the app's popup HOST (`setPopupCallbacks`),
the PROJECT's components (what a Target builds), and the PERSON (a close through the popup's own Close Popup, an
Escape). Close Popup walks its component's ancestors for a published `_popupCloseHandler` (closepopup.ts :206-247) —
so for a lone Close Popup the world says which popups it sits inside.

**POPUP, the tenth seam** (world.ts header — the rule every target reads): a `popup` trace event in the LOCATION
group, a `show` `{ target, params, stackPolicy, closeOnEscape, modal, accessibleName? }` recorded at the call, and a
`close` `{ popup?, action?, results }` recorded at the close handler the Close Popup resolved; the script's `popup` is
`{ components, host, events, inside }` (`events`: `{ at, close: { action, results }, popup? }` — the `popup`-th popup
the play opened, absent the last — or `{ at, escape: true }`). A spec reads `WorldView.popupAnswer(target)` (`nohost` ·
`opened` · `{ error }` with the runtime's own message) and `popupsInside()`; the person's events arrive through the
world handler `popup`. **On the runtime target `showPopup` is the REAL one**; the target stands in the host (no-op
callbacks, or none), the container `Group` (`GROUP_STAND_IN`, keeps its child so deleting it deletes the popup),
`requestAnimationFrame` (the next frame's start), a FRESH root scope per play (a popup's id is a `guid()` — the world's
random stream — so a scope that outlived a play refused the next play's first popup as a duplicate id; found by the
first probe), an empty component model per scripted name; the person's events are world timers calling the n-th
built popup's published handler or `cancelTopPopup()`. A lone Close Popup's component gets a parent chain of stand-in
popups; its `resolvePopup` is wrapped so the handler it resolved is recorded as called.

**Format** (guarded: `src/trace.ts`, `schema/trace.schema.json`, `src/spec.ts`, `src/world.ts` — hashes refreshed,
the diff named exactly those four, the three stranger rounds green in the full run): the `popup` event; `WorldNeed`
`popup`; a patch's `popup` effect; `WorldView.popupAnswer`, `popupsInside`; the world handler `popup`;
`WorldPool.popups`; `popupEvent`, `WorldPopup`, `PopupScript`, `PopupScriptEvent`, `PopupEvent`, `PopupAnswer`,
`PopupCall`. The mutant runner wraps `world.popup`.

**Harness facts found on the way (the TARGET, not the app):**
- **T10** — headless, a component the context lacks threw `Cannot read properties of undefined (reading 'get')`:
  the graph model had no `componentToBundleMap` (`importEditorData` sets it, graphmodel.ts :158-161). The app says
  `Can't find component model for <name>` — Show Popup's Error carries it. The target now has a project with no
  bundles, as it has one with no variants.
- **T11** — the signal intercept recorded a pulse on a port the node does not have; the runtime sends nothing there
  (node.ts `sendSignalOnOutput` returns at once). Show Popup's close action can name such a port. Fixed: recorded
  only when the node has the output.
- **T12** — attribution: a popup is built inside its opener's promise chain, so the async context named the opener
  for every call the popup's OWN nodes made (a Show Popup inside a popup), and so did the sole-subject fallback in a
  graph of one subject. Popup calls are attributed to the subject whose `update()` is on the stack and dropped
  otherwise (found on the nested-popups scenario's first recording).

**The probe first** (the real `showPopup`, a throwaway test, ten questions; each answer then written into the spec and
a hand scenario): Done lands in the settle that showed (the build is microtasks); a close leaves at the next frame's
start, with its results and then Closed or its action; a second Escape in the frame is spent on the popup leaving;
Close On Escape off spends nothing; a non-modal popup is skipped; no host is Done for anything — a missing component
included; an empty Target fails to build (`Component instance must have a name`), a null one is no-target; a close of
a dismissed popup does nothing; **a failed build keeps its slot (C30)**.

**Show Popup** — [show-popup.ts](../../../packages/nodegx-node-spec/src/nodes/show-popup.ts), 22 hand scenarios, claims
from the source and the probe. **CONFORMS on its first run**: 22 / 22, 200 / 200, 142 / 142 mutants (the first run left
one survivor — an Escape reported in the same frame as a new show, never followed by a settle — killed by a scenario
written for it). **Deep (10,000, seed 20728): CONFORMS, 10,000 / 10,000, 223 / 223 mutants** (known C6 50). The spec keeps
the context's stack for the popups the node opened (its slots, leaving at the next frame's start). Its
`closeResult-` / `closeAction-` outputs come from the PROJECT (the Close Popups inside the target): the spec grades a
project whose popup declares Results `name,ok` and Close Actions `Save,Cancel` — NSP-020's case.

**Close Popup** — [close-popup.ts](../../../packages/nodegx-node-spec/src/nodes/close-popup.ts), 12 hand scenarios.
**CONFORMS on its first run**: 12 / 12, 200 / 200, 242 / 244 mutants with 2 declared equivalent (Results and Close
Actions are stored and never read — Pop Component Stack's pair). **Deep (10,000): CONFORMS, 10,000 / 10,000** (known C6
48). Its ports derive from its own params — drawable without a viewer.

**The round trip, as a graph** ([t12](../../../packages/nodegx-node-spec/scenarios/graph/t12-popups.json); popups are
DEFINITIONS built by name in the root scope; their params arrive as component inputs — a `go` value wired to Close
Popup's Close is a rising edge), claims from the sentences before recording:

| scenario | grades | result |
|---|---|---|
| Show Popup → Dialog; its Close Popup hands `name` back | Done (frame 2), Close Results + Closed (frame 3) — the census's round trip | ✅ every claim |
| two Show Popups, the second a frame later (Replace It) | one modal slot ACROSS nodes: `a` Dismissed, `b` Done | ✅ |
| two Show Popups pressed in ONE frame | Done's sentence ("once the popup has been opened") | ❌ **row C32**: `a` reports Dismissed AND Done |
| a Close Popup in a popup opened from a popup, naming the OUTER one | the Popup input's sentence ("when popups are nested") | ❌ **row C31**: candidates `["Inner"]`, target-not-found (probe at its `close()`) |
| the control: the same Close Popup in the outer popup itself | the named close works on the walk | ✅ Closed |

**Read in passing:** a Target that names a NODE TYPE builds that node as a popup (`createNode` asks the register
first, nodescope.ts :303); no scenario uses one. A Show Popup inside a popup with the default Replace It dismisses the
popup it sits in — as its description says ("Replace It closes the popup already showing"); nesting needs Show On Top.

**Also this session:** Navigate's 200-run showed a mutant survivor on today's seed only (20728; all 74 killed at s19's
20727, measured on the same tree) — an answer-only frame never followed by a settle. A hand scenario now settles after
one (23 scenarios, 74 / 74 on both seeds).

**Not graded:** the export (AC1's export half, P18); the `_setCloseCallback` hand-down (the nearest popup's own handler,
which the walk finds anyway).

### 6.2 Rows

| row | what | where | proposed |
|---|---|---|---|
| **C24** — needs a ruling | Navigate To Path never answers a press when Path is not text (`null`, a number): `.match` throws at :162 in the frame-end callback, after the tokens were drained; the scheduler logs it (nodecontext.ts :466-472) | navigate-to-path.ts :151, :162 | read it as no Path — Failure `navigate-to-path/no-path` (one line). [Ledger](../../bugs/p107-c24-navigate-to-path-never-answers-when-path-is-not-text.md) |
| **C25** — needs a ruling | Navigate To Path never answers a press when the browser refuses the push — the Path URL type with a Path on another origin (`https://…`, `//…`): `pushState` throws a SecurityError at :218; no `popstate` | navigate-to-path.ts :218 | catch it — Failure `navigate-to-path/refused` (or open another origin's address as External Link does: a product choice). [Ledger](../../bugs/p107-c25-navigate-to-path-never-answers-when-the-browser-refuses-the-push.md) |
| **D20** — needs a ruling | A parameter value holding `$&` puts the placeholder back; `$$`, `` $` ``, `$'` are expanded — the description says the placeholder is filled "from their input ports" | navigate-to-path.ts :172 | replace with a function. [Ledger](../../bugs/p107-d20-navigate-to-path-expands-dollar-patterns-inside-a-parameter-value.md) |
| **D21** — needs a ruling | Query values are appended unencoded: `a&b` is two parameters, a `#` moves the hash (the wrong page in the default Hash type); `null` is appended as `null` | navigate-to-path.ts :183-184, navigation.ts :70-73 | `encodeURIComponent` name and value; `null` as unset. [Ledger](../../bugs/p107-d21-navigate-to-path-does-not-encode-query-values.md) |
| **C26** — needs a ruling | Push Component To Stack's `backResult-<name>` / `backAction-<name>` outputs (drawn by the editor from the target component's Pop nodes) never connect: no `registerOutputIfNeeded`, so `NodeScope.addConnection` → `getOutput` throws and the wire is dropped; the back callback's `hasOutput` guard sends nothing, `sendSignalOnOutput(action)` logs. The JS original had the method; PLAT-003 slice 8 (`efc19ebbb`, 2026-07-24) dropped it | navigate.ts (no `registerOutputIfNeeded`); node.ts :520; nodescope.ts :148-155 | put the method back (Show Popup's shape). [Ledger](../../bugs/p107-c26-push-component-to-stack-back-results-and-back-actions-never-connect.md) |
| **C27** — needs a ruling | One Push Component To Stack pushing (or replacing) the SAME page with NEW `pm-` values reports Unchanged from the second press on and the old page stays: the node hands its live `pageParams`, the stack keeps it on the entry, and `_isAlreadyShowing` compares the object with itself | navigate.ts :181, :210; navigation-stack.tsx :430-457, :878, :1000 | hand a copy (`{ ...pageParams }`). [Ledger](../../bugs/p107-c27-a-second-push-of-the-same-page-with-new-parameters-reports-unchanged.md) |
| **C28** — needs a ruling | A Mode that is neither `push` nor `replace` (`'Push'`, `''`, `null` over a wire) hands nothing and answers no press | navigate.ts :177, :203 (no else) | Failure `push-component-stack/unknown-mode`. [Ledger](../../bugs/p107-c28-push-component-to-stack-never-answers-a-mode-that-is-not-push-or-replace.md) |
| **C29** — needs a ruling | One Navigate pushing the SAME page with NEW `pm-` values reports Unchanged from the second press on and the Router keeps the old page: the node hands its live `pageParams`, the Router keeps it as `currentParams`, and `_navigateInCurrentWindow` compares the object with itself. C27's twin | router-navigate.ts :132, :149-151; router.tsx :888-895, :917 | hand a copy (`{ ...pageParams }`) — same ruling as C27. [Ledger](../../bugs/p107-c29-a-second-navigate-to-the-same-page-with-new-parameters-reports-unchanged.md) |
| **C30** — needs a ruling | A popup whose component fails to build keeps its slot on the popup stack: the next Show Popup (Replace It) tells the FAILED node Dismissed for a popup that never opened; with Show On Top a failed popup on top takes Escape and the open popup beneath cannot be cancelled | nodecontext.ts :1243-1245 (no catch), :1183-1195 | give the slot back on a rejected build, rethrow so Failure stands. [Ledger](../../bugs/p107-c30-a-popup-that-failed-to-open-keeps-its-slot.md) |
| **C31** — needs a ruling | A Close Popup in a popup opened from inside a popup can never close the OUTER one by name (Popup input: "when popups are nested"): every popup is built in the root scope, so the outer is never on the walk; `popupParent` is written and read by nothing | nodecontext.ts :1215, :1245, :1258; closepopup.ts :89-101, :206-229 | (a) walk from a popup to its opener (`popupParent`); or (b) re-word the input — it only ever matches the enclosing popup. [Ledger](../../bugs/p107-c31-close-popup-cannot-close-the-popup-that-opened-its-popup.md) |
| **C32** — needs a ruling | Two Show Popups pressed in one frame: the first, replaced while still being built, reports Dismissed AND Done — Done says "once the popup has been opened" | nodecontext.ts :1247-1253 (returns, resolves); showpopup.ts :288-290 | (a) no Done for an early return (Dismissed answers it); (b) Failure `show-popup/replaced-before-open`; (c) re-word Done. [Ledger](../../bugs/p107-c32-show-popup-reports-done-for-a-popup-replaced-before-it-opened.md) |
| **C23** ✅ ruled "fix it" 2026-10-01 (s16), fixed — the deferred callback re-walks unconditionally (`onComponentStateNodesChanged`); the scenario lost its `row` mark and was re-recorded | A Parent Component Object (blank Parent Component) whose parent's Component Object is created AFTER the child instance binds the **grandparent's** record for good — reads 8 when the grandparent is written, nothing when the parent is. The Set Parent … beside it resolves at Do and writes the PARENT's (measured: 5 into Page, `near` never sees it). Control: the same tree with the parent's object first binds the parent. Reachable: nodes are created in `Object.values(componentModel.nodes)` order and a child instance's graph is built when it is created ("place the Row, then add the Component Object"). | parentcomponentobject.ts `initialize` walks at creation; the deferred re-walk in `nodeScopeDidInitialize` runs only `if (!modelId)`; the `componentStateNodesChanged` re-walk is editor-only and edit-time | re-resolve unconditionally in the deferred callback and rebind when the id differs. [Ledger](../../bugs/p107-c23-parent-component-object-binds-the-grandparent-when-the-parent-s-object-is-created-later.md) |
