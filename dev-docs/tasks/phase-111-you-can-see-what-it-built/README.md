# Phase 111 — You can see what it built

**Scoped:** 2026-10-01, at HEAD `22303a534`, from a conversation with Richard about the Digital Bricks training system,
which he had built once in code and then again in NodeGX, and found slower, heavier on his Claude usage and fiddlier to
style the second time. The conversation read [RISE](#3-what-rise-was-and-why-it-is-not-the-answer), the P78 register,
P18, P107, P110 and the MCP's briefing module before it reached the conclusion below.
**Status: ⬜ OPEN — 0 of 13 done; SEE-000 and SEE-001 built in part (2026-10-19: the census, the honesty number on MCP
and its ratchet; the editor surface and the cost table owed). Six rulings to ask first (§8); R6 ruled 2026-10-06 with
DIRECTION.md D2.** **Prefix: `SEE`.**
Task files: [SEE-000](SEE-000-THE-CENSUS.md) … [SEE-012](SEE-012-THE-SECURITY-REPORT.md). The board is §6.

> "NodeGX did move in a direction of 'stop letting AI code for you without any way of knowing what's under the hood and
> how to tweak it or take over yourself'. The more AIs get powerful, the more they can one-shot perfectly functioning apps
> that you'll never in theory need to tweak yourself if you keep your AI subscription." — Richard, 2026-10-01

> "Are people ever really going to go looking inside the node graph to understand how their app works? Or do they just
> want a reliable system to build with vibe coding that doesn't put them at enormous risk?" — Richard, 2026-10-01

> "Really hone in on the advantages of NodeGX … and make them the obvious reasons to choose it as a vibe coding companion
> tool." — Richard, 2026-10-01

## 0. The idea in one paragraph

An agent can already one-shot an app. What a person cannot do with that app is **see what it is made of, trust it, steer
it, or take it over** without reading code. NodeGX has, uniquely, the parts that make those four things possible: a
vocabulary of behaviour at human grain (a Counter with Limits, not a `useState` and a `Math.min`), an executable spec for
each word in that vocabulary that any target is graded against (P107), a live picture of the app running with the last
value on every wire (P101), a backend that ships with the app, and a way out to real code (P18). What NodeGX does **not**
have is a cheap way for an agent to author in that vocabulary: today it writes 1.6 MB of JSON through 105 tools and, when
that gets hard, it reaches for a Function node and writes JavaScript, which the picture cannot see into. **This phase makes
authoring cheap, makes the amount of an app the picture can see into a number everybody sees, and moves the front door so
nobody starts on the canvas but everybody can descend to it.** The canvas stops being where you build and becomes the
reason you can trust what was built.

## 0.1 The direction, 2026-10-05

Richard set NodeGX's direction on 2026-10-05 in [DIRECTION.md](../../DIRECTION.md). NodeGX is a framework installed from
npm, and the editor is optional. Four things change in this phase.

- **SEE-009's four reasons are replaced.** NodeGX leads with restraint, testing, security and do it yourself
  ([DIRECTION.md §3](../../DIRECTION.md#3-the-four-reasons)). Seeing and steering stay true as what the optional editor
  offers. Leaving with React and arriving with your code stay true as ways in and out.
- **SEE-008, the companion door, is the front door.** Someone who never opens the editor meets NodeGX through their
  agent and the MCP. SEE-007 still moves the editor's entrance for the people who do open it.
- **Two tasks join this phase (DIRECTION.md D1, ruled 2026-10-06).** [SEE-011](SEE-011-YOUR-APP-HAS-TESTS.md) records a
  drive of the app once and replays it after every change. [SEE-012](SEE-012-THE-SECURITY-REPORT.md) reports who can do
  what to the app's data, in plain words.
- **R6 is ruled with DIRECTION.md D2 (2026-10-06).** `@nodegx/nodes-react` is published. A React app built with it is a
  way in, not a NodeGX app.

## 1. What was measured before scoping

Read on 2026-10-01 from the working tree and the two training apps. Python over every component JSON; `wc` over the code.

| # | fact | consequence |
|---|---|---|
| 1 | **The NodeGX training template** (`templates/digital-bricks-training`): 1,600,184 bytes of graph and project JSON, 247 component files, **1,037 nodes, 1,390 connections**. The commonest node type is **JavaScriptFunction: 147 of them, carrying 7,796 lines of script.** Then Text 141, Translation 131, Group 103. | 🔴 **The graph is the wiring of a JavaScript app.** The part of this app the canvas can explain is the smaller part. This is the P109 reading ("the game is JavaScript, and the graph is its wiring") for the third template in a row. |
| 2 | **The todo template**: 614,462 bytes, 163 component files, 585 nodes, 1,087 connections, 52 Functions with 2,620 lines. | Same shape at half the size. P110 §1 already measured this one. |
| 3 | **The code version** (`vscode_projects/digital-bricks-training`, a Next.js + Drizzle + Postgres app): 599 TypeScript files, about 100,000 lines excluding tests, 229 commits between 2026-06-13 and 2026-10-01. | ⚠️ **Not a like-for-like.** The code version has a coach roster, cohorts, timelines and account export the template does not. The comparison Richard feels is about the slice he rebuilt, and SEE-010 measures that slice, not these totals. |
| 4 | **The MCP surface**: 105 tool names in `toolGroups.ts` across 26 tool modules; a token budget gate on the advertised surface; a briefing pinned character for character because "every paragraph answers a measured failure." | The context tax is the protocol and the JSON encoding, **not** the node vocabulary. A vocabulary of 147 words is small. 105 tools, ids, x/y and connection quadruples are not. |
| 5 | **P107**: 77 of 147 picker nodes conform on the runtime; a stranger built five nodes for a new target from the spec alone, green on its first run (NSP-006). NSP-017 (the Function contract), NSP-018 (the spec speaks, with the `idioms` field), NSP-019 (Richard reads it), NSP-020/021 (the editor as a client) are **not started**. | The harness exists and is proven portable. The surfaces a person sees it through do not exist yet. |
| 6 | **P18**: 123 of 130 placeable nodes export; `plan.ts` is 20,249 lines with 101 node-type special cases. | The export carries node behaviour as compiler cases. SEE-005 is how that file shrinks. |
| 7 | **P101**: the inspector is built and ruled WORTHY. **P93**: eight of ten surfaces built, three await Richard's look. **`nodegx-observe`**: a second MCP server that reads a *running* app over a socket, from a session dictionary that ships topology. | The picture of the app running exists in the editor. It does not follow the app out of the editor (to the export, to the phone). |
| 8 | The MCP already has `explain_component`, `export_react` and `get_import_report` (the legacy-Noodl import). | Three of the four doors exist as tools. None is a reason to choose the product yet, because none carries a number. |

## 2. The person sentences

> **See it:** "I open the app my agent built and I see what the screen is made of, where each part is used, and what each
> part does, in words. I never placed a node."

> **Trust it:** "Every NodeGX app carries one number: how much of what it does is made of parts whose behaviour is specced
> and graded, and how much is script nobody has checked. I can see which parts are which."

> **Steer it:** "I click a thing in the running app, I am taken to the part that draws it and the rule that drives it, and
> I can change a colour, a limit or a wire there and watch the app change. If I want the canvas, it is one step down."

> **Take it over:** "I export to React and the exported app still shows me the same picture of itself running. Or I point
> NodeGX at a React app my agent wrote and get the picture and the number for that."

> **The reason to choose it (what nodegx.io says):** "Vibe-code with any agent. NodeGX is the companion that lets you see
> what it built, tells you how much of it is known-good, lets you steer it without code, and lets you leave with the code
> or arrive with yours."

*2026-10-05: the reason to choose it is now the four in [DIRECTION.md §3](../../DIRECTION.md#3-the-four-reasons)
(§0.1). The sentence above is kept as the first draft.*

## 3. What RISE was, and why it is not the answer

Richard asked whether `vscode_projects/RISE` (Oct 25 → Dec 2, 2025, 56 commits) was closer to the right path. Read in full:
a JSON manifest that generates React, with markers; a React Flow logic canvas with four action nodes writing Zustand
stores; no runtime of its own, the generated code is the runtime; code-to-manifest sync named "the hard direction" and
deferred. Its best document (`AGENTIC_VIBE_CODING.md`) describes a documentation-first, task-file, checkpoint methodology,
which is how OpenNoodl's dev-docs run today and what `create_project`'s brief and build plan already do.

**RISE was right that the code must be real and yours, and P18 adopted that. Its mechanism, behaviour as codegen
templates with no semantics, is the road P18's 20,249-line `plan.ts` shows does not scale, and it would have hit the
sync wall it named.** RISE lacked the thing NodeGX has: a behaviour vocabulary with a runtime, a contract and now a spec.
NodeGX lacks the thing RISE had: an artefact an agent writes cheaply. This phase takes the second from RISE's instinct
(a dense text artefact, SEE-002) without taking its mechanism (generated code as the source of truth).

## 4. The design, in brief

Five things, each a task or two, each adding to the same product.

1. **The honesty number** (SEE-001). For a project and for each component: the share of behaviour in specced nodes
   against the share in Function, Script and Expression nodes. P107 §8 named it for import; this phase makes it a
   property of every project, shown in the editor, in every MCP result and in `render_report`, and a ratchet for the
   templates. Reading 1 says the training template's number is bad. **The number being bad is the point: a bad number
   you can see is the product; a bad number you cannot see is the current state.**
2. **The text form** (SEE-002). A dense, lossless text form of a component that an agent writes and a compiler turns into
   the graph JSON the editor already reads, and back. The canvas is a *layout* of the same artefact, not a second source.
   There is no RISE-style sync problem because neither form is generated code. One `write` tool and one `check` tool
   replace the plan/stage/apply loop for authoring.
3. **The script becomes nodes** (SEE-004, SEE-005). The 147 + 52 + 83 Functions across the three big templates are
   classified by idiom; the idioms that recur become node specs (joining P110 PKT-002, which does the todo's browser
   parts); and the specced nodes ship as a plain TypeScript package the export emits against and a hand-written React app
   can import. That is what lets the honesty number be computed for code, not only for graphs.
4. **The picture follows the app** (SEE-003, SEE-006). The P107 trace format records a running app, not only a node
   (NSP-002 left that door open), so the inspector's live values work on the export too; and a React screen built from
   the node package, or hand-mapped through NSP-018's idioms, comes *in* as a graph with its number.
5. **The entrance moves** (SEE-007, SEE-008). A project opens on the running app and the two trees of P93, the canvas is
   one step down, "explain this" goes from a pixel to the node and its rules (NSP-019), and the MCP a vibe coder's agent
   meets is one briefing, two authoring tools and the number in every result.

## 5. Depends on

| On | Why | State at scoping |
|---|---|---|
| P107 NSP-017 | what a Function may see and do: the line between "specced" and "script" the honesty number draws | 📋 not started |
| P107 NSP-018 | `idioms` on a spec: the lookup table for SEE-004's classification and SEE-006's import | 📋 not started |
| P107 NSP-019 | the rules in the property panel and *Try this node*: SEE-007's "explain this" lands on it | 📋 not started |
| P107 NSP-020 / 021 | `ports(params)` without a viewer; the editor as a client of the spec: the text form's compiler needs port lists from the spec, not from a running viewer | 📋 not started |
| P93 TVW-001…008 | the Layers and Components trees and the preview sentence SEE-007 opens on | 🟢 built, three await WORTHY |
| P101 INS-001/002 | the inspector SEE-003 extends to a running export | ✅ WORTHY |
| P110 PKT-000…003 | the todo's census, on-device data, browser parts as nodes, the portable-script gate: SEE-004 generalises PKT-000 and PKT-002 to every template | ⬜ not started |
| P109 ISL-005 | shared code between Functions: the same script counted once, not seventeen times | ⬜ not started |
| P18 | `export_react` and the exporter SEE-005 re-targets | 123 / 130 |

**SEE-000, SEE-001 and SEE-002 need none of these to start.** SEE-001 can count a Function as "script" before NSP-017 says
what a Function may do; the line moves when NSP-017 lands and the number is recomputed.

## 6. Tasks

| id | task | side | needs |
|---|---|---|---|
| [SEE-000](SEE-000-THE-CENSUS.md) | **The census.** For every template and both training apps: nodes, connections, script lines, MCP tool calls and tokens per build where a transcript exists, and the honesty number computed by hand once. The §1 table becomes a script and a gate. | tooling | — |
| [SEE-001](SEE-001-THE-HONESTY-NUMBER.md) | **The honesty number.** The share of a project's behaviour in specced nodes, per component and overall, with the script parts named. In the editor, in every MCP result, in `render_report`, and ratcheted for the templates. | runtime + editor + MCP | SEE-000 |
| [SEE-002](SEE-002-THE-TEXT-FORM.md) | **The text form.** A dense text form of a component, lossless both ways against the component JSON; `write_component_text` and `check_component_text` in the MCP; the canvas keeps its layout as a sidecar the compiler preserves. Tokens measured against the JSON on the training template. | spec + MCP + editor | — |
| [SEE-003](SEE-003-THE-PICTURE-FOLLOWS-THE-APP.md) | **The picture follows the app.** A running app, interpreted or exported, emits P107 traces over the observe socket; the inspector attaches to either and shows the same live values; a divergence between the two is a red row. | runtime + export + editor | P101, NSP-002 |
| [SEE-004](SEE-004-THE-SCRIPT-BECOMES-NODES.md) | **The script becomes nodes.** Every Function in the three big templates classified by idiom; the idioms that recur in two or more templates become node specs; each new node's spec names what it replaced. The honesty number of each template goes up and the ratchet records it. | node library + spec | SEE-000, NSP-018, PKT-002 |
| [SEE-005](SEE-005-THE-NODES-AS-A-CODE-LIBRARY.md) | **The nodes as a code library.** `@nodegx/nodes-react`: every specced node as a plain TypeScript function, hook or component, with the P107 conformance suite as its tests through an adapter; the exporter emits against it and `plan.ts` loses the special cases the package now owns. | export + spec | NSP-011…015 |
| [SEE-006](SEE-006-ARRIVE-WITH-YOUR-CODE.md) | **Arrive with your code.** A React component that uses the node package, or hand-written React mapped through the `idioms` table, becomes a NodeGX component with its honesty number. Fixture: one screen of the code training app. The number is the honesty of the import. | MCP + spec | SEE-001, SEE-005, NSP-018 |
| [SEE-007](SEE-007-THE-ENTRANCE-MOVES.md) | **The entrance moves.** A project opens on the running app with the P93 trees; the canvas is one step down; click a pixel → the node that draws it → its rules and *Try this node* (NSP-019); change a token, a parameter or a wire from there and watch the app. | editor | P93, P101, NSP-019 |
| [SEE-008](SEE-008-THE-COMPANION-DOOR.md) | **The companion door.** The MCP as a vibe coder's agent meets it: one briefing, the text form's two tools and `render_report` advertised, the rest behind `find_tools`; the honesty number in every result; the token cost of a template build measured before and after. | MCP | SEE-001, SEE-002 |
| [SEE-009](SEE-009-THE-WORDS-ON-THE-TIN.md) | **The words on the tin.** The four reasons on nodegx.io and in the README, each bound to a gate or a number this phase produces, none to a promise. | site + docs | SEE-001…008 |
| [SEE-011](SEE-011-YOUR-APP-HAS-TESTS.md) | **Your app has tests.** A drive of the running app recorded once as a P107 trace and replayed after every change; the first difference named by component, node and port; run by the MCP after a write. Added 2026-10-06 (DIRECTION.md D1). | runtime + MCP | SEE-003, NSP-002, NSP-007 |
| [SEE-012](SEE-012-THE-SECURITY-REPORT.md) | **The security report.** `nodegx.security.json` (or the default) in plain sentences, the risky rules first; keys and passwords in the project by node; every host the app calls. Added 2026-10-06 (DIRECTION.md D1). | backend + MCP | — |
| [SEE-010](SEE-010-RICHARDS-VERDICT.md) | **Richard's verdict.** The training system's rebuilt slice, built again through the companion door, measured against the code version on tokens, time, defects and the honesty number; his look on the result. The phase closes on his words. | Richard | all |

**Order:** SEE-000 → SEE-001 and SEE-002 in parallel → SEE-004 (as NSP-018 lands) → SEE-005 → SEE-003 and SEE-006 →
SEE-007 (as P93's WORTHYs land) → SEE-008 → SEE-009 → SEE-010.

## 7. Acceptance criteria for the phase

1. Every project shows its honesty number, and the three big templates' numbers are higher at the end of the phase than
   in SEE-000's census, by the ratchet (SEE-001, SEE-004).
2. A component written in the text form compiles to JSON the editor opens unchanged, and back, for every component in
   the three big templates; a component in the text form costs fewer tokens than its JSON by the factor SEE-002 §3 names
   (SEE-002).
3. The inspector shows the same live values on the interpreted todo and on its React export, from the same trace format
   (SEE-003).
4. One screen of the code training app arrives as a NodeGX component with its honesty number, and the number says
   truthfully how much of it landed in script (SEE-006).
5. A project opens on the running app; the canvas is reached in one step from any pixel; a token change made there
   shows in the app without touching the canvas (SEE-007).
6. A template build through the companion door spends fewer tokens on the MCP surface than the same build did in SEE-000
   (SEE-008).
7. nodegx.io states the four reasons and each one links to the gate or number that makes it true (SEE-009).
8. Richard has built the training slice through the door, compared it with the code version, and given his verdict
   (SEE-010).

## 8. Rulings to ask (plain words)

| # | Question | Recommendation |
|---|---|---|
| R1 | Is the text form the file on disk, with the JSON generated from it, or is the JSON still the file and the text form a view an agent writes through? | **The JSON stays the file for this phase.** The editor, the export, the templates and every gate read it; changing the file format is a separate decision. The text form is lossless, so this can be revisited when SEE-002 §5 reports the round trip holds on every template. |
| R2 | Should every project show its honesty number, including a person's own project that scores badly? | **Yes, always.** A number you can hide is a promise. Show the parts that are script, by name, so the number is a map and not a grade. |
| R3 | Until NSP-017 says what a Function may do, does a Function count as script even when it is ten lines of date maths? | **Yes.** Count it as script now, recompute when NSP-017 lands, and record the jump. A number that improves because the rule got honest is still a true number. |
| R4 | Is "arrive with your code" a product door in this phase, or a fixture that proves the number works for code? | **A fixture first**, graded on one screen of the training app. It becomes a door when SEE-005's package exists, because code written with the package imports without guessing. |
| R5 | Does a project open on the running app instead of the canvas for everyone, or only when the project was built through the door? | **For everyone.** One entrance. The canvas is one step down for everyone too. |
| R6 | Is `@nodegx/nodes-react` published publicly so a vibe coder's agent can use it in a plain React app, or kept as the exporter's private target? | ✅ **Ruled 2026-10-06 (DIRECTION.md D2): published, and a React app built with it is a way in, not a NodeGX app.** Published. It is the only way the honesty number applies to code the person's agent wrote outside NodeGX, which is where most vibe-coded apps are. |
| R7 | Does SEE-010 rebuild the whole training template or the slice Richard already rebuilt? | **The slice.** Reading 3 says the code version is a much bigger app; the comparison he felt is about the slice. |

## 9. Not this phase

- **The Swift runtime and the phone.** P110 owns both. This phase gives P110 the honesty number and the trace format
  following the app, which PKT-012's reveal can carry.
- **Fixing P109's register.** A defect is this phase's first job only if it blocks a criterion in §7.
- **Changing the file format.** R1.
- **A new editor.** P92 and P93 own the chrome. SEE-007 moves the entrance and adds one hinge; it does not redraw panels.
- **Generating React for one app and keeping it as the source.** That was RISE's mechanism (§3), and P18 §"What went
  wrong" already measured where it leads.

## 10. Risks

- **The text form could be a second place the vocabulary drifts.** It is a projection of the same JSON, so the gate is a
  round trip over every template component, not a parallel spec. SEE-002 AC1.
- **The honesty number could be gamed by wrapping script in a kit node.** A kit node is script with a port list. SEE-001
  counts a node as specced only if a P107 spec exists for its type and the runtime conforms; a kit node without one is
  script. Say so in the number's breakdown.
- **"Everything is script" could be the honest answer for a class of apps** (the island, P109 reading 1). Then the number
  says so and SEE-004's classification says which nodes are missing. A low number with a named cause is a product
  finding, not a failure of the phase.
- **Richard's verdict could be the code version.** SEE-010 is written so that this outcome is a measured result with the
  numbers beside it, and §3's point stands either way: the parts worth keeping are the ones with a number.
