# NSP-015 — Batch: navigation, popups, component utilities

**Opened 2026-09-29.** **Depends on NSP-008** (graph scenarios) and R4 = continue.
**Status: 🟡 6 of 14 (+ NSP-012's Run Tasks) — s15 (2026-10-01): the component boundary, the Component Object family, component DEFINITIONS. Left: the 8 navigation / popup nodes, AC2.**

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
| Parent Component Object created BEFORE its parent's Component Object | the "nearest" sentence | ❌ **row C23** |

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

### 6.2 Rows

| row | what | where | proposed |
|---|---|---|---|
| **C23** | A Parent Component Object (blank Parent Component) whose parent's Component Object is created AFTER the child instance binds the **grandparent's** record for good — reads 8 when the grandparent is written, nothing when the parent is. The Set Parent … beside it resolves at Do and writes the PARENT's (measured: 5 into Page, `near` never sees it). Control: the same tree with the parent's object first binds the parent. Reachable: nodes are created in `Object.values(componentModel.nodes)` order and a child instance's graph is built when it is created ("place the Row, then add the Component Object"). | parentcomponentobject.ts `initialize` walks at creation; the deferred re-walk in `nodeScopeDidInitialize` runs only `if (!modelId)`; the `componentStateNodesChanged` re-walk is editor-only and edit-time | re-resolve unconditionally in the deferred callback and rebind when the id differs. [Ledger](../../bugs/p107-c23-parent-component-object-binds-the-grandparent-when-the-parent-s-object-is-created-later.md) |
