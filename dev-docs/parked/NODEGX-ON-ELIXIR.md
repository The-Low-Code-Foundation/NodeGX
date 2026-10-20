# NodeGX on Elixir

**Parked:** 2026-10-18, from a conversation with Richard. This isn't a phase. It becomes one only when it takes a lane
on the [board](../BOARD.md) and Richard says so.

> "Let's consider that this would be a custom NodeGX editor that wouldn't open a standard NodeGX project, it would be
> the first divergence to 'if you create a project with THIS NodeGX, it won't be compatible with the original editor,
> only this NodeGX Elixir editor'. Mightn't that be a cool idea? How much work would be involved?"

> "How come our infamous node spec doesn't help us avoid repassing over all 130 nodes as the biggest part of the work?"
>
> — Richard, 2026-10-18

## The idea

A second NodeGX editor builds apps that run on Elixir instead of in the browser. The app is a Phoenix LiveView site.
Each person's page lives in a process on the server. The browser receives the HTML. The graph runs on the BEAM,
which is the virtual machine Elixir runs on. Richard's version goes one step further: a project made in this editor
wouldn't open in the main editor.

## What the BEAM gives that the browser runtime can't

- **Many users at once, live.** Every connected person is a process and the state is on the server.
  Shared state and realtime updates need no extra work.
- **A crash restarts instead of blanking the screen.** The BEAM restarts a failed process from a known state. This
  fits DIRECTION.md's *security* reason.
- **Editing a running app.** Elixir can load new code into a running system, so the graph can change while people use
  the app.
- **Long-running nodes.** A timer, a background job, an AI agent or a webhook listener is simply one more process.

## Why the node count isn't the big cost

Every picker node has a spec. `npm run spec-ledger` on 2026-10-18:

```
SPEC COVERAGE: 142 of 147 picker nodes conform on the runtime (96.6%); 3 specced as a contract
(Script, Function, Visual Function); 2 on the export, inside a declared reach (Counter, Switch); 2 exempt; 0 owed
```

A spec doesn't write the Elixir for a node. It grades it. Each spec in `packages/nodegx-node-spec/golden/` gives a
node's ports and its behaviour as recorded traces: these inputs must produce these outputs and signals, in this order.
An Elixir node is right when it plays every trace the same way.

Two stranger rounds measured what that is worth. An agent that had never seen the repo built five nodes from the specs
alone, in 371 lines with their engine. All five conformed on the first run. Every mutant was caught
(`stranger/REPORT.md`). In round 2 another agent built seven nodes. They were green on the third run
(`stranger-2/REPORT.md`). Those were the simplest nodes. Records, users and cloud functions will cost more per node.

## The choice that decides the cost: a runtime, not a compiler

An Elixir runtime that loads the project as data is graded node by node, so the specs do most of the work. A compiler
that turns the graph into Elixir source can't be graded that way. Lane 6 shows the difference. The React export
conforms on 2 of 147 nodes, because "the exporter compiles graph shapes, not nodes" (P107
[CLOSING.md](../tasks/phase-107-the-node-says-what-it-does/CLOSING.md)). On whole graph scenarios it conforms on 10 of
85 (P18 README, 2026-10-15). P110 chose a runtime for the same reason: a Swift NodeGX runtime that loads the project
as data (P110 §0 and §8).

## The work

| piece | what it is | size |
|---|---|---|
| Engine | Frames, settles, signals and coalescing, as the spec's adapter describes them. One process per page. | The real design work, done once |
| Suite adapter | An Elixir target that reads and writes the trace format over stdio, as the strangers' `target.js` does | Small, done once |
| The 142 conforming nodes | One small Elixir module each, graded by its spec | Mechanical, in graded batches |
| The 14 nodes the ledger can't draw without a running viewer | Component Object, Send and Receive Event, Router, HTTP Request and the others it lists under "no view". Most have ports that are only known at run time. Their behaviour is specced. What they do depends on the graph around them. | Engine work, not node work |
| Visual nodes | HEEx templates that produce the same HTML and CSS as the web runtime | Medium. Cheaper than P110's Swift layout, because LiveView is still a web page |
| Script bridge | The 3 contract nodes (Script, Function, Visual Function) run in a JavaScript engine, either QuickJS embedded in Elixir or Node beside it. The Noodl API is bridged to the Elixir runtime under NSP-017's rules. | The main risk |
| Backend | Call the NodeGX backend over HTTP, or replace it with Ecto and Ash | Medium if the runtime calls the backend. Replacing it is a project of its own |
| Editor | A LiveView page, with the canvas as a JavaScript island on `@nodegx/canvas-look` and the project store from the TypeScript kit in a Node sidecar | Small. OWN-008's strangers each built an editor from the kit |
| Live preview | Graph edits loaded into the running app | Medium. It's the strongest demo |

## The spike

The spike is the engine, the suite adapter and about a dozen nodes passing their specs. The nodes are Page, Group, Text,
Button, Text Input, Variable, Static Data, For Each, Router, a record query and create, and one BEAM-only node such as
PubSub. They drive one realtime page: a shared todo list or a chat. A guess at 4 to 6 sessions.

The spike answers one question: do the specs pass on the BEAM without being bent? It also measures the cost per node,
which turns the rest into an estimate, as P110's PKT-013 plans to do for Kotlin. An app the size of P110's todo uses 25
node types (P110 §1). A guess at 10 to 15 sessions for that. All 130 picker nodes can't be estimated before the spike.

## Risks

- **Scripts.** P110 §1 found 52 JavaScript Function nodes and 2,626 lines of script in the todo's backend build. That
  is about half its logic, and no spec describes it. An Elixir NodeGX inherits the same problem. P110's PKT-002 and PKT-003
  would help both: browser code becomes nodes, and a gate proves the rest portable.
- **Every interaction goes to the server.** Forms, records, dashboards and apps with many users suit LiveView. Offline
  apps (P110), heavy drag and drop, and animated transitions suit it badly.
- **An incompatible format loses the shared tools.** A project the main editor can't open also can't be authored over
  the MCP, drawn by `render_report`, checked by the editor suite (OWN-006), exported to React or reached by the Open
  Bubble import.

## Ruling owed

**R1. Should projects made with the Elixir editor be incompatible with the main editor?**

The recommendation is no. Keep format v2. The project declares `runtime: "beam"` in `nodegx.project.json` and may use
BEAM-only nodes such as Process, PubSub, Supervisor, Agent and Job. The main editor still opens it and badges each node
it can't run, as EXP-013 already does for nodes that don't export. The project still runs only on the BEAM, so the split
Richard asked for is real. The MCP, `render_report` and the editor suite keep working on it. DIRECTION.md §2 says
NodeGX "aims to be a format a good editor could open". This keeps that true.

## Related

- [P110](../tasks/phase-110-the-app-in-your-pocket/README.md), parked: a Swift runtime built the same way. Its script
  bridge (PKT-007) and the NSP-017 escape hatches are shared work.
- [P107 CLOSING.md](../tasks/phase-107-the-node-says-what-it-does/CLOSING.md): the specs this would be graded against.
- [P18](../tasks/phase-18-code-export-v2/README.md), board lane 6: why a compiler is graded on graph scenarios, not
  nodes.
- [P112](../tasks/phase-112-your-own-nodegx/README.md): the kit the editor would be built from.
