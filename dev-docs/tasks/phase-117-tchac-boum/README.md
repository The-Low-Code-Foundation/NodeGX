# Phase 117 — Tchac-Boum: the machine on the wall is the graph

**Scoped:** 2026-10-11, at HEAD `84396782b`, from a conversation with Richard that began as "a demo like Orbit for
preteens in a French collège, the game pure fun, the editor the educational part" and ended with a working prototype on
the real engine: [`prototype/tchac-boum.html`](prototype/README.md), built the same morning on P112's kit, its gate green.
**Status: 🟡 IN PROGRESS — s1 (2026-10-11, Fable): TBM-000 built and gated (the wall, the flip, the shelf, three
missions, every edit a write through the store, every Vérifier a copy in a second real app; `prototype/check.mjs` 29 / 29,
three runs). Rulings R1–R4 open (§8). Next: TBM-001, the browser backend (Richard's ask, §4.6).** **Prefix: `TBM`.**
Task files: [TBM-000](TBM-000-THE-PROTOTYPE-MEASURED.md) … [TBM-007](TBM-007-THE-WALL-PASSES-THE-EDITOR-SUITE.md). The board is §6.
Parent: [Phase 112](../phase-112-your-own-nodegx/README.md) (the kit this is built from; this phase is its "big-block
editor for children" made real). Cousins: [Phase 114](../phase-114-the-groovebox/README.md) (the groovebox: the other
"your own editor"), [Phase 108](../phase-108-the-island-works/README.md) (Olive's Island: the kids' Blockly world).

> "Have you got an idea for another demo like Orbit … a kid friendly version, aimed at preteens in French collège? …
> The game itself can be pure fun, and the editor the educational part." — Richard, 2026-10-11

> "First option seems genius, let's build it." — Richard, 2026-10-11, on the chain-reaction machine

> "Any chance we could push the boat out and have it use the browser storage as a DB to test the save function like we
> do with the Rocket School? But using our new specced backend nodes?" — Richard, 2026-10-11

## 0. The idea in one paragraph

A Rube Goldberg machine on a wall: a marble drops into a turnstile, rolls down a ramp, and a balloon pops. The kid drags
parts from a shelf and ties them with string; the only goal is *more*, and nothing ever fails — a chain that stops just
stops. Flip the wall over and the same machine is a NodeGX graph. Not a picture of it: **the same object.** The turnstile
is a `Counter`, the ramp a `Timer`, the balloon a `Switch`, the chalkboard an `Expression`, the drum a `Repeat`; the
marble is a signal going down a wire, and the string that carries a number instead of a marble is a data wire. Every
part is a real core node running on NodeGX's own runtime, every edit on the wall is a write into a v2 project the
official editor opens unchanged, and every mission is checked by playing the kid's graph on a copy in a second real app.
The wall is a home-made editor in P112's sense, with one rule the official editor does not have: **few connectors, in
French, with costumes** — and the costume lives in the node's `metadata`, so the files carry the game.

## 1. What was measured before scoping

Read on 2026-10-11 at `84396782b`, before a line was written.

| # | reading | consequence |
|---|---|---|
| 1 | **P112 OWN-003 was built the same morning (s8):** the real engine runs in a page with a way in, 85 / 85 graph scenarios; `real/orbit.html` is a whole editor on the real app (store, trace, picker, missions on a copy). | Tchac-Boum is built on the kit from its first line, not on a hand runner the way Orbit's first page was. Its plumbing (`write`, `readGraph`, `portsOf`, `playCopy`) is Orbit's, re-typed, not imported: a peer was editing `real/` as this was scoped (10:13), so the two prototypes share no file. |
| 2 | **A v2 node may carry `metadata`** (`nodegx-project-contract/schemas/nodes.schema.json`, `definitions/node`: `metadata` listed, `additionalProperties: true`). | A part's costume (`metadata.tchac.skin`: `ballon`, `chat`, `ampoule`, `bouton`) is written into the files by the wall, round-tripped by the official editor, and ignored by it. The first home-made editor to keep its own annotation in the project. |
| 3 | **The six parts are specced** (`@nodegx/node-spec`): Counter, Timer (shown as Delay), Switch, Expression (derived inputs named by the formula's identifiers), Repeat, Boolean To String, String Format, Condition; Button and Text too. | The connect popup and the part panel read ports from the specs; the French nicknames are a dictionary on top (`FR` in the page), never a second port list. |
| 4 | **The in-page preview's trace carries wires, not nodes** (`preview.onTrace` events: `fromNode.fromPort > toNode.toPort`). An output nobody is wired to never appears. | A costume reads its state from a wired output only: a Switch taken from the shelf stays dark until something is wired to its Current State. Filed as a kit finding (P117-S1-UNWIREDOUT, §6 TBM-005); the gate does not assert what the trace cannot say. |
| 5 | **Rocket School does not use the record nodes**: TPL-007 §"storage" is `Global Store` with `Persist: true` (localStorage) and a `Keep Storage` kit node. | Richard's ask (records in browser storage) is new, not a copy. |
| 6 | **Every record node leaves the runtime through one seam**, `IDataAdapter` in `@noodl/backend-contract` (`query`, `count`, `distinct`, `aggregate`, `fetch`, `create`, `save`, `delete`, …). `CloudStore` builds a `RestDataAdapter` or a `ParseWireAdapter` from the resolved backend (`cloudstore.js:61-84`); the spec's World answers the same seam in memory (world.ts BACKEND). The preview export keeps `backendServices` metadata verbatim (`exporter/json.ts:25-26`); only `cloudservices` is blanked. | A browser backend is one new `IDataAdapter` over IndexedDB, chosen for a `backendServices` entry the project carries, graded by the contract's own conformance suite (`nodegx-backend-contract/conformance/`). TBM-001. |
| 7 | **The one local adapter is Node-only**: `api/adapters/local-sql/LocalSQLAdapter.ts` resolves `node:sqlite` or `better-sqlite3` (`engine.ts:18-23`); the `AdapterRegistry` knows `local`, `parse`, `external`. | Nothing to switch on; the browser adapter is written, not configured. |
| 8 | **The audience, from memory:** Ellie (11) and Saoirse (8) use old Surface Pros (Core m3, 4 GB, Windows 10, Chrome); Ellie "doesn't at all like being under time pressure", wants no negative feedback, and customisation is the motivation. | 2D, DOM and SVG, no Three.js; no timer, no score, no "you missed"; costumes and names are free; the fail message of a mission says what happened and never "wrong". |

## 2. The person sentences

> **The kid:** "I pressed the button and the balloon popped. I turned the wall over and it was the same machine, with
> real names. I wrote `n >= 3` on a chalkboard and the balloon waited for the third marble."

> **The teacher (cycle 4, Technologie / Maths):** "Each mission is one idea from the programme: événement et signal
> (the chain), variable et condition (the chalkboard), boucle (the drum). The check runs their program; I don't mark it."

> **Richard:** "It shows off the node concept to a twelve-year-old without a single word of jargon on the front, and
> the official editor opens what they made."

> **Same files:** "Whatever a kid did on the wall, the project is the same files. The official editor opens it, and the
> costumes ride along in `metadata` without it minding."

## 3. The audience and the rule it sets

Preteens in a French collège (11–15), Ellie first. The French cycle 4 programme (*Algorithmique et programmation*, in
Maths and Technologie) names four ideas: **événements**, **variables**, **instructions conditionnelles**, **boucles**.
The three missions are those ideas in that order, and a mission's text says the idea's name once, at the end, in the
verdict. The rules that follow from the audience:

- **No clock, no score, no fail.** A Vérifier that does not pass says what it saw ("Je lis gauche 😴 droite 😴"), never
  "faux". A chain that stops, stops.
- **Few connectors.** A Button has 22 outputs in its spec; a kid sees one (*clic !*). The connect popup shows the
  nicknamed ports first and keeps *Toutes les prises* one press away, so nothing is hidden, only ordered.
- **Costumes are free and written down.** A Switch is an ampoule until the kid makes it a ballon or a chat, and that
  choice is in the files.
- **The front is French; the back is NodeGX.** The flip is the lesson: the back says `Counter`, `Increase Count`,
  `Current Count`, in the editor's own colours from `@nodegx/canvas-look`, because that is what they will meet next.

## 4. The design, in brief

1. **The wall** (`prototype/tchac-boum.html`): parts at the files' `x`/`y`, strings as SVG curves from a part's handle
   to the next part's inlet, marbles that roll along a string when the trace reports a signal on that wire, a glow when
   it reports a value. Pan, pinch, wheel; *Tout voir* fits the wall around the app's window.
2. **The flip**: `body.circuit` turns every `.part` by `rotateY(180deg)` in place; the back face is the editor's card
   (header colour from `nodeScheme`, wired ports with live values). Same elements, same files — the gate asserts no
   element is re-made.
3. **The shelf**: eight parts with a costume and one sentence, then the runtime's whole library behind a search. Taking
   a part is `addNode` through the store, at the centre of the view.
4. **Editing**: drag a part (position written, the app not rebuilt), drag a string (the connect popup; the pick is a
   wire in the files; the app rebuilt), the part panel (name, costume, dials from the spec's unwired value inputs, live
   outputs, the strings with a ✂, *Retirer la pièce*). Everything is `V2ProjectStore.writeComponent` with `ifRevision`.
5. **Missions**: three, each with *Vérifier* (plays a copy of the files in a second real app and reads the screen by
   `elementsOf`) and *Montre-moi* (builds the answer step by step through the store, then verifies). A fourth is shown
   locked: *La machine se souvient*.
6. **The browser backend (TBM-001, Richard's ask)**: a `BrowserDataAdapter` implementing `IDataAdapter` over IndexedDB,
   selected for a `backendServices` entry of type `custom` with a `browser` marker that the project carries, installed
   through one hook in `CloudStore.forBackend`, graded by the contract's conformance suite. Then mission 4 (TBM-002):
   every 💥 is a `Create Record`, a `Query Records` fills *le livre des records* on the wall, and it is still there
   tomorrow. The adapter is a product thing — an offline backend for every kids' app on a Surface Pro, which TPL-007
   wanted and wrote around — and this phase is only its first user.

## 5. Depends on

| On | Why | State at scoping |
|---|---|---|
| P112 OWN-001 (the format), OWN-002 (specs in a page), OWN-004 (the preview in a page), OWN-005 (the look) | the page imports all four | built |
| P112 OWN-003 (the real engine with a way in) | TBM-007's graph half | built s8 |
| P112 OWN-006 (the editor suite) | TBM-007: the wall as an adapter | built; graph half owed |
| `@noodl/backend-contract` `IDataAdapter` + its conformance suite | TBM-001 | exists (§1.6) |
| the deploy runtime + the preview's page bundle | `serve.mjs` refuses without them | built on this machine |

## 6. Tasks

| # | task | status | gate |
|---|---|---|---|
| [TBM-000](TBM-000-THE-PROTOTYPE-MEASURED.md) | **The prototype, measured.** The wall on the real app, the flip, the shelf, the three missions, the costumes in `metadata`; what it invented and what it proves. | 🟢 built s1 | `prototype/check.mjs` PASS ×3 (29 checks) |
| [TBM-001](TBM-001-THE-BROWSER-BACKEND.md) | **The browser backend.** `BrowserDataAdapter` (IndexedDB) on the contract's seam, chosen by a `backendServices` entry, graded by the conformance suite. **Fable.** | 📋 READY (R1 recommended yes) | the conformance suite green on it |
| [TBM-002](TBM-002-LA-MACHINE-SE-SOUVIENT.md) | **Mission 4 — la machine se souvient.** Create Record on 💥, Query Records → *le livre des records*, survives a reload. | 📋 after TBM-001 | the gate's fourth mission |
| [TBM-003](TBM-003-THE-KIDS-SITTING.md) | **The kids' sitting.** Ellie and Saoirse on the Surface Pro; then a collège class if a teacher will. Their words recorded. | 📋 Richard's | the verdict in their words |
| [TBM-004](TBM-004-A-PUBLIC-COPY.md) | **A public copy.** `serve.mjs --out` with a production runtime, at nodegx.io/tchac-boum/, the way Orbit is. | 📋 (R4) | the gate `--site` green on the URL |
| [TBM-005](TBM-005-AN-UNWIRED-OUTPUT-HAS-A-VALUE.md) | **An unwired output has a value.** The kit finding P117-S1-UNWIREDOUT: the trace carries wires; a costume cannot read a lone output. Fix in `@noodl/preview` (a node-value event or a read), used by the wall. | 📋 kit | a Switch from the shelf lights with nothing wired |
| [TBM-006](TBM-006-THE-WORDS.md) | **The words.** A teacher reads every French string against the cycle 4 vocabulary; the `FR` dictionary covers every shelf part's ports. | 📋 Richard's / a teacher's | the read, recorded |
| [TBM-007](TBM-007-THE-WALL-PASSES-THE-EDITOR-SUITE.md) | **The wall passes the editor suite.** A `suite-adapter.mjs` like Orbit's: open, the eight edits, save, round trip; done means done (P112). | 📋 | the suite green on small, todo-list, planning |

## 7. Acceptance criteria for the phase

1. A kid can press the button, watch the chain, flip the wall, take a part from the shelf, tie a string, turn a dial,
   cut a string, and remove a part — each a write into the v2 files, with real input (the gate's "editing" block).
2. The three missions fail on the starting graph for their own reason and pass after *Montre-moi*, played on a copy in
   a second real app (the gate's "missions" block). *(met s1)*
3. The official editor opens the project the wall saved, costumes and all, and the editor suite says the wall's edits
   match the reference writer's (TBM-007).
4. Mission 4 writes records through the specced record nodes into the browser and reads them back after a reload, on
   an adapter the contract's conformance suite grades (TBM-001, TBM-002).
5. The kids have played it and their words are in TBM-003.

## 8. Rulings to ask (plain words)

| # | Question | Recommendation |
|---|---|---|
| R1 | **Is the browser backend a kit for every app, or a trick for this demo?** It is one `IDataAdapter`; once it passes the conformance suite, any project can carry a `browser` backend entry and run the record nodes offline on a tablet. | **A kit for every app**, published with the P112 packages; Tchac-Boum is its first user. |
| R2 | **French only, or French with an English face?** Every string on the front is French; the back is NodeGX's English. | **French only for now**; a language table is a later task if a non-French class asks. |
| R3 | **Does Tchac-Boum stand in for P112 OWN-008's "children's block editor" stranger?** It was built with the repo open, by me, not by a stranger from the brief. | **Beside it, not instead**: the stranger's run still measures the brief; this page measures the idea. |
| R4 | **Publish at nodegx.io/tchac-boum/ before or after the kids' sitting?** | **After**: the kids' words first, one round of fixes, then the public copy (TBM-004). |

## 9. Not this phase

- Sound (a kit, P114's) — a 💥 that goes bang is a one-line ask once the audio kit exists.
- A multiplayer wall (every kid owns a part on the projector) — a different phase, with a backend.
- Replacing Olive's Island's Blockly with this — they teach different things.
- The official editor learning costumes — it ignores `metadata.tchac`, which is the point.

## 10. Risks

- **The trace is wires only** (§1.4): a part with nothing wired to its outputs is a dark costume. TBM-005 fixes it in
  the kit; until then the shelf's sentence for a Switch says "attache une ficelle à sa sortie pour la voir s'allumer".
- **Expression is JavaScript**: `n % 2 === 0` is readable at 12, `===` is not maths. TBM-006 may want `n % 2 == 0`
  in the mission texts and a note that both work.
- **A Surface Pro (2017) with no WebGL** was the reason for DOM + SVG; it has not been measured there yet (TBM-003).
- **The peer on P112 `real/`**: this page re-types Orbit's plumbing rather than importing it, so a fix in one must be
  carried to the other by hand until OWN-007's brief names the shared pieces.
