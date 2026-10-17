---
title: "Component Stack"
---
Component Stack: push/pop navigation container — pages stack on top of each other with transitions, ideal for wizards and drill-in flows.

The Component Stack is the second navigation model, alongside Router. It holds a configured set of pages (components) and shows one at a time, but keeps history as a stack: Push Component To Stack adds a page on top (with a transition), Pop Component Stack returns to the one beneath, optionally handing back result values. `stackDepth` and `topPageName` expose the current state; `reset` unwinds to the start page. Unlike Router it is not URL-driven by default (`useRoutes` opts pages into routing).

## When to use it

Flows with a natural back relationship: wizards, mobile-style master→detail drill-ins, modal sequences that return results. For top-level app sections addressed by URL, use Router + Page.

## At a glance

| | |
|---|---|
| Category | Visual |
| Type name | `Page Stack` |
| Available in | browser |
| SSR compatibility | partial — The initial stack renders server-side; browser URL/history sync only runs in the browser. |
| Provided by | `noodl-viewer-react` |
| Behaviour spec | version 18 ([under the hood](#under-the-hood)) |

## Inputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `backgroundColor` | Color | `transparent` | Fill colour behind whichever component is showing |
| `clip` | Boolean | `true` | Clips a pushed component that is bigger than the stack |
| `cssClassName` | String | `` | Extra CSS class names to put on this element, for styling from a stylesheet you supply |
| `dataAttributes` | Stringlist | — | data-* names (data-testid) for tests and scripts to find this element by; each gets a value input |
| `keepPagesWhenUnmounted` | Boolean | `false` | Keeps the stack's components, and what is on them, while Mounted is off, so turning it back on shows the one that was on top. Its Components or Name changing meanwhile, or (with Use Routes) Back or Forward, still starts it again. Off: turning Mounted back on starts at the start component |
| `mounted` | Boolean | `true` | Removes the element from the page entirely when false, unlike Visible which leaves its space behind. Wired, it counts as true until the first value arrives, so set it to false here to start hidden (a lock, a private screen) |
| `name` | String (PackStack id) | `Main` | Name the Push and Pop nodes address this stack by; leave it as Main if there is only one |
| `pages` | Proplist | — | The components this stack can show, and which of them it starts on |
| `scrollIntoViewAlign` | Enum (`nearest`, `start`, `center`, `end`) | `nearest` | Where Scroll Into View leaves the element: Nearest edge moves only as far as needed |
| `styleCss` | String | `/* background-color: red; */` | Raw CSS declarations applied to this element, overriding the styling ports above |
| `useRoutes` | Boolean | `false` | Puts the top component in the browser URL, so back and forward move through the stack |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `reset` | Signal | — | Empties the stack and rebuilds the start component |
| `scrollIntoView` | Signal | — | Scrolls the page, or the scrolling Group holding this element, until the element can be seen |

### What each input does

**Name** (`name`)

- a name with another key (blank is Main): the stack leaves its old name and, on the page, takes the new one — its pages are deleted and its start page rebuilt, then the pushes that waited for that name run (a replace that waited runs with no rebuild first); off the page, the next mount rebuilds. The same key again: kept, and the pages stay

**Components** (`pages`)

- always: the pages the stack can show (not a list: none) — on the page, every page is deleted at the end of the frame and the Start Page built, Top Component Name its label and Stack Depth 1 (with Use Routes, its address written); the stack is left empty with no pages, or a Start Page the project does not have. Off the page, the next mount rebuilds

**Use Routes** (`useRoutes`)

- always: kept; on, the next push, replace or back writes the top page into the address, a mount reads its start page from the address, and the browser's Back or Forward rebuilds the page the address names; off, the address is left alone

**Keep Pages When Unmounted** (`keepPagesWhenUnmounted`)

- always: kept; read when the stack mounts — on, a stack still holding its pages comes back as it was, unless its Components or Name changed meanwhile or (with Use Routes) the address moved; off, a mount starts at the Start Page

**Reset** (`reset`)

- always: one reset at the end of the frame, however many Resets — every page is deleted, pushed ones included, and the Start Page is built: Top Component Name its label, Stack Depth 1 (with Use Routes, its address written), then Done for each Reset; Failure for each with no Components, or a Start Page the project does not have, and the stack is left empty (Top Component Name blank, Stack Depth 0). A transition still running is not stopped

**Mounted** (`mounted`)

- always: at the next paint the stack is put on the page (Did Mount; it takes its Name and builds its Start Page — with Use Routes, the page the address names; with Keep Pages When Unmounted, it comes back as it was — then the pushes that waited for the name run) or taken off it (Will Unmount; a push for its name waits until it is back)

**Scroll Into View** (`scrollIntoView`)

- always: the page, or the scrolling Group holding it, scrolls until the stack can be seen

## Outputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `boundingHeight` | Number | — | Height this element actually ended up with after layout, in pixels |
| `boundingWidth` | Number | — | Width this element actually ended up with after layout, in pixels |
| `childIndex` | Number | — | This element's position among its parent's children, counting from 0 |
| `childrenCount` | Number | — | How many child elements are currently mounted inside this one |
| `screenPositionX` | Number | — | Distance in pixels from the left edge of the window to this element's left edge |
| `screenPositionY` | Number | — | Distance in pixels from the top edge of the window to this element's top edge |
| `stackDepth` | Number | — | How many components are on the stack, so 1 means only the start component |
| `this` | Reference | — | A reference to this node itself, for ports that take a node rather than a value |
| `topPageName` | String | — | Name of the component currently on top of the stack |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `completed` | Signal | — | Fires after every invocation, whatever the outcome — wire this to carry on regardless. Failure still fires and still carries its reason, so this cannot hide an error |
| `didMount` | Signal | — | Fires once this element has been added to the page and can be measured |
| `done` | Signal | — | Fires once the stack has been emptied and the start component rebuilt |
| `willUnmount` | Signal | — | Fires just before this element is removed from the page, while it still exists |

### Failure outputs

| Name | Type | Default | Description |
|---|---|---|---|
| `failure` | Signal | — | Fires when the stack has no components configured, or its start component does not resolve |

## Dynamic ports

_This node's port list changes at runtime (declared-port-groups, runtime-discovered); the tables above may be incomplete for a given instance._

Each page in the "pages" parameter adds a Component input (`pageComp-<pageId>`) and, with "useRoutes" on, a Path input (`pagePath-<pageId>`: the page's URL path, by default its label in lower case with dashes); "startPage" picks one of the pages.

| Condition | Inputs shown | Outputs shown |
|---|---|---|
| — | — | — |

## Ports at runtime

Runtime-determined ports follow the configured pages: page components' inputs surface where relevant, and the pages list itself is a proplist the editor manages. Navigation nodes reference the stack by its `name`.

## Patterns

- `stackDepth` → an Expression (`depth > 1`) → the back button's `visible`: back affordance only when back exists.

## Watch out for

- Using a stack for top-level sections users expect to deep-link — that is Router territory.

## Examples

**Push and pop a Component Stack (wizard flow)**

Stack-style navigation: a Page Stack (Component Stack) named 'Checkout' hosts two components, defined in its `pages` parameter with `pageComp-<id>` entries mapping each page to a component in this file. Inside /Cart, a Push Component To Stack node (PageStackNavigate) pushes /Confirm with a transition when the Continue button is clicked. Inside /Confirm, a Pop Component Stack node (PageStackNavigateBack) pops back: the Back button triggers its plain `navigate` signal, while the Place-order button triggers the `backAction-confirmed` signal input declared via the `backActions` parameter — that same action surfaces as the `backAction-confirmed` signal output on the Push node in /Cart, where it fires an Event Sender. This is the round-trip: back actions are declared on the Pop node inside the pushed component and consumed on the Push node that pushed it.

## Related nodes

[Push Component To Stack](../navigation/page-stack-navigate.md), [Pop Component Stack](../navigation/page-stack-navigate-back.md), [Page Router](./router.md), [Show Popup](../navigation/navigation-show-popup.md)

## Code export

Exports to React. A project that uses it exports this node as React code.

[How export works](../../how-export-works.md) shows what an export writes, with a worked example.

## Under the hood

This node's behaviour is written down as an executable spec in `@nodegx/node-spec`, version 18. The spec is the reference the conformance tests grade the runtime against. Every rule in it cites the line of the runtime it was read from. The full spec is at the bottom of this page.

### What it depends on outside the node

- a person's pointer and keyboard (`person`)
- time: timers, delays and the frame clock (`clock`)
- the page URL, and whether a person caused the action (`location`)
- the project's settings (`project`)

### Starting state

```json
{
  "mounted": true,
  "onPage": false,
  "isMounted": false,
  "useRoutes": false,
  "keepPages": false,
  "resetOwed": false,
  "regKey": null,
  "waiting": [],
  "pageInfo": {},
  "stack": [],
  "children": [],
  "deleted": [],
  "nextPage": 1,
  "running": null,
  "queue": [],
  "busy": null,
  "hops": 0,
  "owed": false,
  "callbacks": [],
  "resetScheduled": false,
  "resetTokens": 0,
  "resetToStart": false,
  "ownBacks": 0,
  "countLate": false,
  "top": "",
  "depth": 0,
  "count": 0
}
```

### How actions report back

Each time Reset is triggered, the node reports exactly one of **Done** or **Failure**.

### What a person can do to it

The conformance tests play these acts against it:

- `push`: a Push Component To Stack hands the stack a push: the page to show on top, its parameters and the transition
- `replace`: a Push Component To Stack in Replace mode hands the stack a replace: the page to show instead of every page on it
- `back`: the Pop Component Stack in the top page asks the stack to pop it, with the back's action and results
- `traverse`: the person's browser goes Back or Forward: the location moves to this URL and the page hears popstate

## The full spec {#spec-source}

The spec's source, as the docs were generated. Helpers it imports live beside it in `packages/nodegx-node-spec/src`.

```ts title="packages/nodegx-node-spec/src/nodes/component-stack.ts"
/**
 * Component Stack (`Page Stack`) — read from `packages/noodl-viewer-react/src/nodes/navigation/navigation-stack.tsx` (the node),
 * `navigation-handler.ts` (the names), `transitions.ts` and `transitions/*.ts` (what a transition is and the clock it runs on),
 * `async-queue.ts` (one request at a time), `navigate.ts` and `navigate-back.ts` (what the callers hand it) and
 * `react-component-node.ts` (Mounted, Did Mount, Will Unmount, Children Count) on 2026-10-08, and recorded on the runtime the same
 * day (NSP-016 s56; the reading and the measurements are NSP-016 §7.17).
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from; where the rule is JavaScript's (a lookup by
 * a value that is not what the code expects), the spec runs the same expression on the same value.
 *
 * THE PAGES. The stack shows components the project has. In a play the project has three — `Home`, `Detail`, `Settings`
 * (`STACK_PAGES`), each holding one Pop Component Stack and nothing else; any other name is a component the project does not have.
 * Components (`pages`, a list of `{ id, label }`) says which pages the stack can show; each page's component is its own input,
 * `pageComp-<id>` (:1101-1120, registered on first write), and Start Page (`startPage`) which one it starts on. A page is found by
 * its id, else by its label (`_findPage` :386-410).
 *
 * THE CALLERS (spec.ts; the acts `push`, `replace`, `back`). Another node hands the stack a request and hears its answer (an `answer`
 * event): a Push Component To Stack hands a push or a replace by the stack's Name (`NavigationHandler`: a blank name is `Main`; a name
 * no stack holds waits in the handler until one registers under it, :45-110), with the page (`target`), its parameters and a
 * transition; the Pop Component Stack in a page the stack PUSHED asks it to pop (the stack hands it its `back` when it builds the page,
 * :984-991 — a start page or a replaced page has no Pop that can, and its asking reaches nothing). Both callers hand their request at
 * THEIR frame's end (`scheduleNavigate` → `scheduleAfterInputsHaveUpdated`): it lands on the stack's own frame-end list, in step order
 * with the stack's scheduled Reset, with nothing between two of them. The Pop is the one in the top page as painted at the act; a page
 * deleted by the frame's end asks nothing.
 *
 * ONE REQUEST AT A TIME (`ASyncQueue`). A reset, a push and a replace wait their turn. Each runs its checks at once — and a request
 * the checks refuse is answered there (no components; still animating; no such page; already showing) — then builds its page
 * (`await createNode`), which lands at the next yield to the event loop: a settle, after the frame's end, or an advance, before the
 * clock moves (spec.ts `resume`). Whatever waits behind it runs then, all of it. A request whose checks ended without a build frees
 * the queue a microtask later (a throw: two) — at a yield, or at the next act boundary for what started outside a frame (`hops`). A
 * build of a component the project does not have is answered as not found (row C107, fixed in P109 ISL-048), a transition there
 * is no such thing as plays none (row C108, fixed), and a push onto a stack with nothing on it is Failure (row C110, fixed). A back
 * is not queued.
 *
 * A RESET (`resetAsync` :503-578) — at the mount (registering), at a Reset (Done or Failure, every Reset of the frame alike), when
 * Components change while the stack is on the page, and when the Name changes to another key while it is (row C113, fixed in P109
 * ISL-048: the same name again reset it too) — deletes every page, then (no components:
 * Failure `component-stack/no-components`; its start page not found: `component-stack/component-not-found`) builds the start page:
 * Top Component Name its label, Stack Depth 1. A reset at the mount reports to no one.
 *
 * A PUSH (`navigateAsync` :927-1028) builds the page on top (Stack Depth + 1) and plays the transition from the page below; at its end
 * the page below leaves the stack's children (it stays on the stack, to come back). A REPLACE (:787-910) builds the page as the only
 * one: unanimated, every page is deleted first; animated, they are deleted at the transition's end. A BACK (:1041-1083) puts the page
 * below back, hands the node that pushed the top page the back's action and results (`returned`), names the page below at once, and at
 * the transition's end deletes the top page and takes its entry off the stack (row C110, fixed in P109 ISL-048: it took the LAST).
 *
 * THE TRANSITION (transitions/transition.ts). None, or a Push or Popup with no time (`dur + delay` 0), ends at once. A timed one ends
 * at the first frame whose clock is past its start + Duration + Delay (`frame` :63-72: a `requestAnimationFrame` chain, run at a
 * frame's start); while it runs the stack refuses a push, a replace and a back. A reset does not stop it.
 *
 * **Children Count** is the stack's page containers, counted at the frame's end — except in a frame whose paint mounted the stack,
 * which sends none: the next frame counts (a mount at the placing or at an act counts at once). A reset counts its pages when it lands,
 * with Stack Depth (v16, row C114, fixed in P109 ISL-048: v15 left a stack mounted at a frame's paint saying Stack Depth in that frame
 * and Children Count in the next). The look reaches the element only.
 *
 * USE ROUTES (v2, s58; world.ts LOCATION — the page's window is the world's browser). With Use Routes on, the stack puts its top page
 * in the URL and reads its start page from it. THE URL a page has: its Path (`pagePath-<id>`, an input the editor draws only with Use
 * Routes on), else its label lowercased with each run of spaces a `-` — found by the page's id (`getRelativeURL` :580-622; row
 * C123, fixed in P109 ISL-048: a page pushed or started by its LABEL had none, and the URL became `#`). `{name}` parts take the page's
 * parameters (`encodeURIComponent`); every other parameter goes in the query encoded (row C122, fixed in P109 ISL-048: it went
 * unencoded). Hash mode (the project's `navigationPathType` unset or `hash`) writes `?query#/path` — and with no parameters `#/path`, with the address's path in front
 * while the address holds a query, so it goes (row C121, fixed in P109 ISL-048: `#/path` alone kept it); path mode writes `/path?query`. A push pushes its URL (`history.pushState`) after naming the page and
 * before the transition, and a replace overwrites the current entry (`history.replaceState`); a back steps the history back
 * (`history.back()`) at its transition's end, over the entry its push made, and its own `popstate` resets nothing — a page whose push
 * made no entry has the address replaced (row C120, fixed in P109 ISL-048 as ruled, "A Pop steps the browser's history back": it
 * pushed the page below's URL, a new entry). The mount's reset writes nothing. A RESET with Use Routes on, at the mount or on the
 * browser's Back or Forward, reads the URL (`matchPageFromUrl` :683-742): the hash's path (or the path)
 * against each page's pattern in Components order, the first whose parts all match from the start wins (a longer URL matches too);
 * its `{name}` parts are decoded with `decodeURIComponent`, and so is the whole query — a malformed escape is kept as written (row
 * C124, fixed in P109 ISL-048: it threw, and the reset ended there with the stack empty). The page found is the start page, with the query and the path's parameters; none
 * found, the Start Page. A Reset press or a Components edit builds the Start Page and, when the address names another page, pushes its
 * URL (row C126, fixed in P109 ISL-048 as ruled, "Reset goes to the start page and writes its address": it showed the page in the
 * URL). THE BROWSER'S BACK AND FORWARD (the act `traverse`): the stack listens for `popstate` from its mount to its unmount
 * (:182-214) and, with Use Routes on, resets at the frame's end (row C119, fixed in P109 ISL-048: a stack with Use Routes off went
 * back to its start page too) — unless the address names the page, and parameters, already on top (v18, row C120).
 */

import { defineNode, said, type AnswerCall, type InputDecl, type ValueInputDecl } from '../spec';
import { SELF_REFERENCE } from '../trace';
import { pushTarget } from '../world';
import { dataAttributeInput, dataAttributeNames } from './data-attributes';

/** The components the play's project has (THE PAGES): each holds one Pop Component Stack. */
export const STACK_PAGES: readonly string[] = ['Home', 'Detail', 'Settings'];

const THREE = [
  { id: 'p1', label: 'Home' },
  { id: 'p2', label: 'Detail' },
  { id: 'p3', label: 'Settings' }
];
const CURVE = [0, 0, 0.58, 1];

/** What a Push Component To Stack hands (navigate.ts :177-202): the act `push`. */
export const PUSHES: readonly unknown[] = [
  { target: 'p2' },
  { target: 'Detail' },
  { target: 'p3', transition: { type: 'None' } },
  { target: 'p2', params: { id: 1 } },
  { target: 'p2', params: { id: 2 }, transition: { type: 'Popup', timing: { curve: CURVE, dur: 100, delay: 50 } } },
  {},
  { target: 'nope' },
  { stack: 'Other', target: 'p2' },
  { target: 'p3', transition: { type: 'Fade' } }
];
/** What a Push Component To Stack in Replace mode hands (navigate.ts :203-231): the act `replace`. */
export const REPLACES: readonly unknown[] = [
  { target: 'p3', transition: { type: 'None' } },
  { target: 'p1', transition: { type: 'None' } },
  { target: 'p2', transition: { type: 'Push', timing: { curve: CURVE, dur: 0, delay: 0 } } },
  { target: 'p2', transition: { type: 'Push' } },
  { target: 'nope', transition: { type: 'None' } },
  { stack: 'Other', target: 'p1', transition: { type: 'None' } }
];
/** What the top page's Pop Component Stack hands (navigate-back.ts :154-157): the act `back`. */
export const BACKS: readonly unknown[] = [{}, { action: 'saved', results: { n: 1 } }];
/** Where the person's Back or Forward takes the location (USE ROUTES): the act `traverse`. */
export const TRAVERSES: readonly unknown[] = ['#/detail', '#/settings', '#/', 'https://app.example/', '#/home/more', '?id=1#/detail', '#/detail/5?t=x', '#/nowhere', '/settings', '/detail/5', '?q=%zz#/detail', '#/detail/%zz'];

/** transitions.ts — the transitions there are */
const TRANSITIONS = ['None', 'Push', 'Popup'];
/** push-transition.ts :28, popup-transition.ts :20 — a timed transition with no timing */
const DEFAULT_TIMING = { dur: 300, delay: 0 };

type Rec = Readonly<Record<string, unknown>>;
type Req = { stack?: unknown; target?: unknown; params?: Rec; transition?: Rec; action?: unknown; results?: unknown };
/** What a page found by `_findPage` is (:56-68) */
type Found = { component: string; label: string; id: string; path: string | undefined };
/** An entry's transition: `none` ends at once; a timed one runs; `undefined` — an entry no push made (reset, unanimated replace) */
type Tr = 'none' | { dur: number; delay: number } | undefined;
/** A stack entry (:70-79): its page container, the one below it (a push's), the page, its parameters, its transition */
type Entry = { page: number; from: number | null; pageId: unknown; id: string; label: string; path: string | undefined; params: Rec; tr: Tr; pushed: boolean; entry?: boolean };
/** What a running transition does at its end */
type End = { kind: 'push'; below: number | null } | { kind: 'replace'; outgoing: number[] } | { kind: 'back'; page: number };
type Item = { kind: 'reset'; tokens: number; toStart?: boolean } | { kind: 'push' | 'replace'; v: Req };
/** The request whose page is being built (awaiting `createNode`), with what its checks found — it lands at the next yield */
type Busy = { item: Item; pageId: unknown; found: Found; params: Rec; outgoing: number[]; from: number | null; animate: boolean };
/** The stack's frame-end list (`scheduleAfterInputsHaveUpdated`): its scheduled reset, and the callers' requests, in step order */
type Callback = { kind: 'reset' } | { kind: 'push' | 'replace'; v: Req } | { kind: 'back'; page: number; v: Req };

type State = {
  /** react-component-node.ts :1267 `wantsToBeMounted` */
  mounted: boolean;
  /** on the page: mounted and painted */
  onPage: boolean;
  /** `_internal.isMounted` (:182-214): the node's own record, written by the component's Did Mount and Will Unmount */
  isMounted: boolean;
  /** `_internal.name` — `undefined` until written (a declared default never runs its setter) */
  name: unknown;
  /** `_internal.useRoutes` (:279-288) — `!!value` */
  useRoutes: boolean;
  /** v17, row C139 — `_internal.keepPagesWhenUnmounted` (Keep Pages When Unmounted) — `!!value` */
  keepPages: boolean;
  /** v17, row C139 — while unmounted, something that resets a mounted stack happened (Components written, a Name with another key) */
  resetOwed: boolean;
  /** v17, row C139 — the address when Mounted went off */
  addressAtUnmount: string | undefined;
  /** the handler's key this stack is registered under, or none (`_pageStacks[name]`) */
  regKey: string | null;
  /** the handler's queue (`_navigationQueue`): requests to a name no stack held */
  waiting: Array<{ name: unknown; op: 'push' | 'replace'; v: Req }>;
  pages: unknown;
  /** `_internal.pageInfo` — per page id, its component (and its path) */
  pageInfo: Readonly<Record<string, { component?: unknown; path?: unknown }>>;
  startPageId: unknown;
  stack: Entry[];
  /** the page containers that are the stack's children, in order */
  children: number[];
  deleted: number[];
  nextPage: number;
  running: { until: number; end: End } | null;
  queue: Item[];
  busy: Busy | null;
  /**
   * The queue is still working for this many act boundaries after a request's checks ended without a build (async-queue.ts :62-76):
   * one when they returned (`.then`), two when they threw (`.then`, then `.catch`). A play awaits each act (one microtask generation);
   * a set or a signal is not awaited; a settle and an advance yield to the event loop, where everything lands.
   */
  hops: number;
  /** an act ended: the next step starts after one generation of microtasks (one hop) */
  owed: boolean;
  callbacks: Callback[];
  resetScheduled: boolean;
  resetTokens: number;
  /** v18, row C126 — a Reset press or a Components edit among the frame's reasons: the reset builds the Start Page */
  resetToStart: boolean;
  /** v18, row C120 — the `history.back()`s its Pops made that have not landed: their `popstate` is its own */
  ownBacks: number;
  /** the stack was mounted at this frame's paint: what lands at its yield is counted a frame later (row C114, measured) */
  countLate: boolean;
  // ---- the outputs as last written ----
  top: string;
  depth: number;
  count: number;
};

const NOTHING = { send: [] };
const LOOK = (displayName: string, group: string, description: string, extra: Record<string, unknown> = {}) => ({ coerce: 'none' as const, displayName, group, description, ...extra });

const pageCompPort = (): ValueInputDecl => ({ type: 'component', coerce: 'none', displayName: 'Component', group: 'Pages', examples: ['Home', 'Detail', 'Settings', 'Missing', '', null] });
const startPagePort = (ids: string[]): ValueInputDecl => ({ type: 'enum', enums: ids, editOnly: true, coerce: 'none', displayName: 'Start Page', group: 'General', examples: ['Home', 'nope'] });
/** :1153-1166 — drawn only with Use Routes on; its default (the label, lowercased, dashed) is the editor's and never runs the setter */
const pagePathPort = (): ValueInputDecl => ({ type: 'string', coerce: 'none', displayName: 'Path', group: 'Pages', examples: ['detail', '/detail/{id}', 'settings/', '', 'Home', null] });

export const ComponentStack = defineNode({
  type: 'Page Stack',
  // v3 (P109 ISL-048, s31): a reset that fails leaves the stack empty and says so — Top Component Name '' and Stack Depth 0 (row C112)
  // v4 (P109 ISL-048, s31): a page whose component the project does not have is answered — a push or replace Failure, a reset Failure that leaves the stack empty (row C107)
  // v5 (P109 ISL-048, s31): a Components value that is not a list is none (Failure, no components), and a page found by its label with no component is not found (row C109)
  // v6 (P109 ISL-048, s31): a push with a transition there is no such thing as plays none and is Done (row C108)
  // v7 (P109 ISL-048, s31): a back's end takes the entry it animated off the stack, and a push onto an empty stack is Failure (row C110)
  // v8 (P109 ISL-048, s31): a back whose page below the Components list no longer has is refused before anything moves, and a page
  // whose entry outlives its row in the list is not found (row C111)
  // v9 (P109 ISL-048, s31): a malformed escape in the URL's query or path is kept as written, as the Page Router's (row C124)
  // v10 (P109 ISL-048, s31): a page's parameters go into the URL's query encoded (row C122)
  // v11 (P109 ISL-048, s31): a page's Path that is not text is unset — the label's path (row C125)
  // v12 (P109 ISL-048, s31): a page pushed or started by its label has its URL (row C123)
  // v13 (P109 ISL-048, s31): in hash mode a page with no parameters clears the query in the address (row C121)
  // v14 (P109 ISL-048, s31): the browser's Back or Forward resets only a stack with Use Routes on (row C119)
  // v15 (P109 ISL-048, s31): a Name written that keeps the stack's key does not reset it (row C113)
  // v16 (P109 ISL-048, s33): a reset counts its pages with Stack Depth — a stack mounted at a frame's paint says Children Count in that frame (row C114)
  // v17 (P109 ISL-048, s33): Keep Pages When Unmounted — a remount keeps the pages unless a mounted stack would have reset meanwhile (row C139)
  // v18 (P109 ISL-048, s36): a Pop steps the history back and a Replace overwrites the entry (row C120); a Reset press or a Components
  // edit builds the Start Page and writes its address (row C126)
  version: 18,
  source: 'packages/noodl-viewer-react/src/nodes/navigation/navigation-stack.tsx',
  needs: ['person', 'clock', 'location', 'project'],
  worldPool: {
    advances: [0, 16, 100, 149, 150, 151, 300, 301, 1000],
    // a browser: Use Routes reads and writes its location
    viewports: [{ width: 1280, height: 800 }],
    activations: [null],
    locations: [null, 'https://app.example/#/detail', 'https://app.example/?id=1#/settings', 'https://app.example/#/detail/7', 'https://app.example/settings', 'https://app.example/?q=%zz#/home'],
    projectSettings: [{}, { navigationPathType: 'path' }]
  },
  // :347-350 `outcomeOutputs({ done, failure })` — Reset's
  outcomes: ['done', 'failure'],

  state: {
    mounted: true,
    onPage: false,
    isMounted: false,
    name: undefined,
    useRoutes: false,
    keepPages: false,
    resetOwed: false,
    addressAtUnmount: undefined,
    regKey: null,
    waiting: [],
    pages: undefined,
    pageInfo: {},
    startPageId: undefined,
    stack: [],
    children: [],
    deleted: [],
    nextPage: 1,
    running: null,
    queue: [],
    busy: null,
    hops: 0,
    owed: false,
    callbacks: [],
    resetScheduled: false,
    resetTokens: 0,
    resetToStart: false,
    ownBacks: 0,
    countLate: false,
    top: '',
    depth: 0,
    count: 0
  } as State,

  acts: {
    push: { description: 'a Push Component To Stack hands the stack a push: the page to show on top, its parameters and the transition', values: PUSHES },
    replace: { description: 'a Push Component To Stack in Replace mode hands the stack a replace: the page to show instead of every page on it', values: REPLACES },
    back: { description: "the Pop Component Stack in the top page asks the stack to pop it, with the back's action and results", values: BACKS },
    traverse: { description: "the person's browser goes Back or Forward: the location moves to this URL and the page hears popstate", values: TRAVERSES }
  },

  inputs: {
    // ---- logic ----
    // :255-269
    name: { type: 'string', default: 'Main', coerce: 'none', displayName: 'Name', group: 'General', description: 'Name the Push and Pop nodes address this stack by; leave it as Main if there is only one', portability: 'logic', examples: ['Main', 'Other', '', null] },
    // :279-288
    useRoutes: { type: 'boolean', default: false, coerce: 'none', displayName: 'Use Routes', group: 'General', description: 'Puts the top component in the browser URL, so back and forward move through the stack', portability: 'logic' },
    // v17, row C139 (P109 ISL-048) — read when the stack mounts
    keepPagesWhenUnmounted: { type: 'boolean', default: false, coerce: 'none', displayName: 'Keep Pages When Unmounted', group: 'General', description: "Keeps the stack's components, and what is on them, while Mounted is off, so turning it back on shows the one that was on top. Its Components or Name changing meanwhile, or (with Use Routes) Back or Forward, still starts it again. Off: turning Mounted back on starts at the start component", portability: 'logic' },
    // :303-314
    pages: { type: 'proplist', coerce: 'none', displayName: 'Components', group: 'Components', description: 'The components this stack can show, and which of them it starts on', portability: 'logic', examples: [THREE, THREE.slice(0, 1), THREE.slice(0, 2), THREE.slice(1), []] },
    // :315-326
    reset: { type: 'signal', outcome: true, displayName: 'Reset', group: 'Actions', description: 'Empties the stack and rebuilds the start component', portability: 'logic' },
    // react-component-node.ts :2302-2321
    mounted: { type: 'boolean', default: true, coerce: 'none', displayName: 'Mounted', group: 'General', description: 'Removes the element from the page entirely when false, unlike Visible which leaves its space behind. Wired, it counts as true until the first value arrives, so set it to false here to start hidden (a lock, a private screen)', portability: 'logic', layout: 'present' },
    // react-component-node.ts :1380-1395
    scrollIntoView: { type: 'signal', displayName: 'Scroll Into View', group: 'Scroll Into View', description: 'Scrolls the page, or the scrolling Group holding this element, until the element can be seen', portability: 'logic' },
    scrollIntoViewAlign: { type: 'enum', enums: ['nearest', 'start', 'center', 'end'], default: 'nearest', coerce: 'none', displayName: 'Scroll Align', group: 'Scroll Into View', description: 'Where Scroll Into View leaves the element: Nearest edge moves only as far as needed', portability: 'logic' },

    // ---- look (R10): reach the element only ----
    clip: { type: 'boolean', default: true, ...LOOK('Clip Content', 'Layout', 'Clips a pushed component that is bigger than the stack'), portability: 'layout-shared', layout: 'clip' },
    backgroundColor: { type: 'color', default: 'transparent', ...LOOK('Background Color', 'Style', 'Fill colour behind whichever component is showing'), portability: 'look-shared' },
    cssClassName: { type: 'string', default: '', ...LOOK('CSS Class', 'Advanced HTML', 'Extra CSS class names to put on this element, for styling from a stylesheet you supply'), portability: 'web-only' },
    styleCss: { type: 'string', default: '/* background-color: red; */', editOnly: true, ...LOOK('CSS Style', 'Advanced HTML', 'Raw CSS declarations applied to this element, overriding the styling ports above'), portability: 'web-only' },
    dataAttributes: { type: 'stringlist', editOnly: true, ...LOOK('Data Attributes', 'Data Attributes', 'data-* names (data-testid) for tests and scripts to find this element by; each gets a value input'), portability: 'web-only' }
  },

  outputs: {
    // :351-368 — written by `setPageOutputs`
    topPageName: { type: 'string', from: (s) => s.top, displayName: 'Top Component Name', group: 'General', description: 'Name of the component currently on top of the stack' },
    stackDepth: { type: 'number', from: (s) => s.depth, displayName: 'Stack Depth', group: 'General', description: 'How many components are on the stack, so 1 means only the start component' },
    // react-component-node.ts :982-990, :993-1003
    didMount: { type: 'signal', displayName: 'Did Mount', group: 'Mounted', description: 'Fires once this element has been added to the page and can be measured' },
    willUnmount: { type: 'signal', displayName: 'Will Unmount', group: 'Mounted', description: 'Fires just before this element is removed from the page, while it still exists' },
    // react-component-node.ts :1428-1444
    childIndex: { type: 'number', from: () => 0, displayName: 'Child Index', group: 'Advanced', description: "This element's position among its parent's children, counting from 0" },
    // react-component-node.ts :1629-1640, :1670-1680 — the page containers, counted at the frame's end
    childrenCount: { type: 'number', from: (s) => s.count, displayName: 'Children Count', group: 'Advanced', description: 'How many child elements are currently mounted inside this one' },
    this: { type: 'reference', from: () => SELF_REFERENCE, displayName: 'This', group: 'Advanced', description: 'A reference to this node itself, for ports that take a node rather than a value' },
    // react-component-node.ts :1446-1500 — never measured here
    screenPositionX: { type: 'number', from: () => undefined, displayName: 'Screen Position X', group: 'Bounding Box', description: "Distance in pixels from the left edge of the window to this element's left edge" },
    screenPositionY: { type: 'number', from: () => undefined, displayName: 'Screen Position Y', group: 'Bounding Box', description: "Distance in pixels from the top edge of the window to this element's top edge" },
    boundingWidth: { type: 'number', from: () => undefined, displayName: 'Width', group: 'Bounding Box', description: 'Width this element actually ended up with after layout, in pixels' },
    boundingHeight: { type: 'number', from: () => undefined, displayName: 'Height', group: 'Bounding Box', description: 'Height this element actually ended up with after layout, in pixels' }
  }
}).on(
  {
    // :255-269 — off the handler under the old name; on under the new one if on the page (which resets, or replays what waited);
    // the same key: stored only (row C113)
    name: (s, v, _i, view) =>
      said(
        'a name with another key (blank is Main): the stack leaves its old name and, on the page, takes the new one — its pages are deleted and its start page rebuilt, then the pushes that waited for that name run (a replace that waited runs with no rebuild first); off the page, the next mount rebuilds. The same key again: kept, and the pages stay',
        run(
          s,
          (w) => {
            // a write that keeps the handler's key is stored and nothing more (row C113, fixed in P109 ISL-048: it registered again,
            // which resets)
            if (keyOf(norm(v)) === keyOf(norm(w.st.name))) {
              w.st.name = v;
              return;
            }
            deregister(w);
            w.st.name = v;
            if (w.st.isMounted) register(w);
            // v17, row C139 — a mounted stack would have reset: the next mount does
            else w.st.resetOwed = true;
          },
          view
        )
      ),
    // :303-314
    pages: (s, v, _i, view) =>
      said(
        'always: the pages the stack can show (not a list: none) — on the page, every page is deleted at the end of the frame and the Start Page built, Top Component Name its label and Stack Depth 1 (with Use Routes, its address written); the stack is left empty with no pages, or a Start Page the project does not have. Off the page, the next mount rebuilds',
        run(
          s,
          (w) => {
            // a value that is not a list is none (row C109, fixed in P109 ISL-048)
            w.st.pages = Array.isArray(v) ? v : undefined;
            // v18, row C126 — the Start Page
            if (w.st.isMounted) (scheduleReset(w), void (w.st.resetToStart = true));
            // v17, row C139 — a mounted stack would have reset: the next mount does
            else w.st.resetOwed = true;
          },
          view
        )
      ),
    // :279-288 — stored; read by the next reset and the next URL pushed
    useRoutes: (s, v, _i, view) =>
      said(
        "always: kept; on, the next push, replace or back writes the top page into the address, a mount reads its start page from the address, and the browser's Back or Forward rebuilds the page the address names; off, the address is left alone",
        run(s, (w) => void (w.st.useRoutes = !!v), view)
      ),
    // v17, row C139 — stored; read when the stack mounts
    keepPagesWhenUnmounted: (s, v, _i, view) =>
      said(
        'always: kept; read when the stack mounts — on, a stack still holding its pages comes back as it was, unless its Components or Name changed meanwhile or (with Use Routes) the address moved; off, a mount starts at the Start Page',
        run(s, (w) => void (w.st.keepPages = !!v), view)
      ),
    // :315-326, :463-479 — every Reset of the frame is answered by the one reset at the frame's end
    // v18, row C126 — the Start Page, as its description says
    reset: (s, _i, view) =>
      said(
        "always: one reset at the end of the frame, however many Resets — every page is deleted, pushed ones included, and the Start Page is built: Top Component Name its label, Stack Depth 1 (with Use Routes, its address written), then Done for each Reset; Failure for each with no Components, or a Start Page the project does not have, and the stack is left empty (Top Component Name blank, Stack Depth 0). A transition still running is not stopped",
        { ...run(s, (w) => (scheduleReset(w), (w.st.resetTokens += 1), void (w.st.resetToStart = true)), view), outcome: 'pending' }
      ),
    // react-component-node.ts :2310-2320
    mounted: (s, v, _i, view) =>
      said(
        "always: at the next paint the stack is put on the page (Did Mount; it takes its Name and builds its Start Page — with Use Routes, the page the address names; with Keep Pages When Unmounted, it comes back as it was — then the pushes that waited for the name run) or taken off it (Will Unmount; a push for its name waits until it is back)",
        run(s, (w) => void (w.st.mounted = !!v), view)
      ),
    // react-component-node.ts :1380-1395 — scrolls; nothing on the wire, nothing the queue reads (an owed hop waits for the next step
    // that can see it, which applies it first). The look has no reducer: stored, and read by nothing here
    scrollIntoView: () => ({ says: 'always: the page, or the scrolling Group holding it, scrolls until the stack can be seen', send: [] })
  },
  {
    derived: {
      // the editor's ports (:1128-1189): per page its component (and its path, with Use Routes — `=== true`), then Start Page; and the
      // Data Attributes'
      inputs: (params) => {
        const out: Record<string, InputDecl> = Object.fromEntries(dataAttributeNames(params.dataAttributes).map((name) => [name, dataAttributeInput(name)]));
        const pages = params.pages;
        if (Array.isArray(pages) && pages.length > 0) {
          const ids: string[] = [];
          const labels: Record<string, string> = {};
          for (const p of pages) {
            const id = String((p as { id?: unknown } | null)?.id);
            ids.push(id);
            labels[id] = String((p as { label?: unknown } | null)?.label);
            out[`pageComp-${id}`] = pageCompPort();
            if (params.useRoutes === true) out[`pagePath-${id}`] = pagePathPort();
          }
          out.startPage = { ...startPagePort(ids), labels }; // navigation-stack.tsx :1389-1392 — each page by its label
        }
        return out;
      },
      // :1084-1120 `registerInputIfNeeded` — stored; nothing until a reset or a request reads them
      on: (s, port, value, _d, view) =>
        port.startsWith('data-')
          ? NOTHING
          : run(
              s,
              (w) => {
                if (port.startsWith('pageComp-')) setInfo(w, port.slice('pageComp-'.length), 'component', value);
                // a Path that is not text is unset: the label's path (row C125, fixed in P109 ISL-048)
                else if (port.startsWith('pagePath-')) setInfo(w, port.slice('pagePath-'.length), 'path', typeof value === 'string' ? value : undefined);
                else if (port === 'startPage') w.st.startPageId = value;
              },
              view
            ),
      discover: (port) => (port.startsWith('pageComp-') ? pageCompPort() : port.startsWith('pagePath-') ? pagePathPort() : port === 'startPage' ? startPagePort(THREE.map((p) => p.id)) : undefined),
      candidates: ['pageComp-p1', 'pageComp-p2', 'pageComp-p3', 'pagePath-p1', 'pagePath-p2', 'pagePath-p3', 'startPage']
    },
    world: {
      // placed on the page with its params set — the first render mounts it: Did Mount, and it registers (react-component-node.ts)
      place: (s, _i, view) => run(s, (w) => void paint(w), view, 'place'),
      // v18, row C120 — a `history.back()` landed: the listener (:197-206) while mounted — its own Pop's, or another's
      popstate: (s, _i, view) => run(s, (w) => void (w.st.isMounted && heard(w)), view, 'yield'),
      // the yield: the page being built lands, and what waited behind it runs
      resume: (s, _i, _tag, view) =>
        run(
          s,
          (w) => {
            atYield(w);
            if (!w.st.countLate) countChildren(w);
          },
          view,
          'yield'
        )
    },
    // a frame: its start runs the transition's tick; then the frame's callbacks (the scheduled reset), then the paint
    afterInputs: (s, _i, view) =>
      run(
        s,
        (w) => {
          tick(w);
          const callbacks = w.st.callbacks;
          w.st.callbacks = [];
          for (const cb of callbacks) {
            if (cb.kind === 'reset') {
              // :472-477 — the Resets that arrived before the callback runs
              const tokens = w.st.resetTokens;
              const toStart = w.st.resetToStart;
              w.st.resetScheduled = false;
              w.st.resetTokens = 0;
              w.st.resetToStart = false;
              enqueue(w, toStart ? { kind: 'reset', tokens, toStart } : { kind: 'reset', tokens });
            } else if (cb.kind === 'back') {
              if (!w.st.deleted.includes(cb.page)) back(w, cb.v);
            } else request(w, cb.kind, cb.v);
          }
          // a frame whose paint mounted the stack sends no Children Count — not for its callbacks, its paint or its yield; the next
          // frame counts (row C114, measured)
          w.st.countLate = paint(w);
          if (!w.st.countLate) countChildren(w);
        },
        view,
        'frame'
      ),
    // the callers' requests, on a PAINTED page (adapter.ts `act`)
    person: {
      push: (s, _i, v, view) => run(s, (w) => void (paint(w), call(w, { kind: 'push', v: (v ?? {}) as Req })), view, 'act'),
      replace: (s, _i, v, view) => run(s, (w) => void (paint(w), call(w, { kind: 'replace', v: (v ?? {}) as Req })), view, 'act'),
      // the Pop in the top page as the person sees it — only a page the stack pushed has one that can ask
      back: (s, _i, v, view) =>
        run(
          s,
          (w) => {
            paint(w);
            const top = w.st.stack[w.st.stack.length - 1];
            if (top && top.pushed) call(w, { kind: 'back', page: top.page, v: (v ?? {}) as Req });
          },
          view,
          'act'
        ),
      // Back or Forward (USE ROUTES): the location moves; a stack on the page with Use Routes on hears popstate (:182-214) and
      // resets at the frame's end (row C119, fixed in P109 ISL-048: one with Use Routes off reset too)
      traverse: (s, _i, v, view) =>
        run(
          s,
          (w) => {
            paint(w);
            w.traverse = v;
            w.href = moved(v, w.href);
            if (w.st.isMounted) heard(w);
          },
          view,
          'act'
        )
    }
  }
);

// ---------------------------------------------------------------------------------------------
// the work: a draft of the whole state, and what the work said
// ---------------------------------------------------------------------------------------------

type View = { now(): number; href(): string | undefined; projectSettings(): Readonly<Record<string, unknown>> };

type Work = {
  st: State;
  /** the world's clock at this work (a transition starts at it) */
  now: number;
  view: View;
  answers: AnswerCall[];
  outcomes: Array<{ port: 'reset'; outcome: 'done' | 'failure'; error?: string }>;
  emit: Array<'didMount' | 'willUnmount'>;
  send: Set<'topPageName' | 'stackDepth' | 'childrenCount'>;
  resume: boolean;
  traverse: unknown;
  /** the href as the work leaves it (a push moves it): what a later reset in the same work reads */
  href: string | undefined;
};

/**
 * A reducer's patch: the whole state as the work leaves it — so a branch is what it emits, answers and resolves, never which keys a
 * path happened to change (s54, s55) — and what it sent.
 */
function run(s: Readonly<State>, f: (w: Work) => void, view: View, mode: 'step' | 'act' | 'frame' | 'place' | 'yield' = 'step'): any { // eslint-disable-line @typescript-eslint/no-explicit-any
  const w: Work = { st: { ...s }, now: view.now(), view, answers: [], outcomes: [], emit: [], send: new Set(), resume: false, traverse: undefined, href: view.href() };
  // a step after an act starts one microtask generation later (`hops`); a frame's work runs before its yield, which lands it all
  if (mode === 'step' || mode === 'act') {
    if (w.st.owed) hop(w);
    w.st.owed = false;
  } else if (mode === 'frame' || mode === 'yield') w.st.owed = false;
  f(w);
  if (mode === 'act') w.st.owed = true;
  return {
    set: w.st,
    send: [...w.send],
    emit: w.emit,
    ...(w.answers.length > 0 ? { answers: w.answers } : {}),
    ...(w.outcomes.length > 0 ? { outcomes: w.outcomes } : {}),
    ...(w.resume ? { resume: 'build' } : {}),
    ...(w.traverse !== undefined ? { traverse: { url: w.traverse } } : {})
  };
}

/** `setPageOutputs` (:456-461) */
function outputs(w: Work, label: string, depth: number): void {
  w.st.top = label;
  w.st.depth = depth;
  w.send.add('topPageName');
  w.send.add('stackDepth');
}

/** Children Count at the frame's end (`scheduleUpdateChildCountAndIndicies`, react-component-node.ts :1670-1680) */
function countChildren(w: Work): void {
  w.st.count = w.st.children.length;
  w.send.add('childrenCount');
}

function addChild(w: Work, page: number, index?: number): void {
  const c = [...w.st.children];
  c.splice(index ?? c.length, 0, page);
  w.st.children = c;
}
/** `removeChild` (:1652-1662): the first, if it is a child */
function removeChild(w: Work, page: number | null): void {
  const i = page === null ? -1 : w.st.children.indexOf(page);
  if (i < 0) return;
  const c = [...w.st.children];
  c.splice(i, 1);
  w.st.children = c;
}
function deleteNode(w: Work, page: number | null): void {
  if (page !== null && !w.st.deleted.includes(page)) w.st.deleted = [...w.st.deleted, page];
}
function newPage(w: Work): number {
  const p = w.st.nextPage;
  w.st.nextPage = p + 1;
  return p;
}

/** `setPageComponent` / `setPagePath` (:1084-1097) */
function setInfo(w: Work, id: string, key: 'component' | 'path', value: unknown): void {
  const info = w.st.pageInfo as Record<string, { component?: unknown; path?: unknown }>;
  const cur = Object.prototype.hasOwnProperty.call(info, id) ? info[id] : undefined;
  w.st.pageInfo = { ...info, [id]: { ...(cur ?? {}), [key]: value } };
}

// ---------------------------------------------------------------------------------------------
// the runtime's JavaScript, run on the same values (R3: a lookup the code does not guard throws as it throws)
// ---------------------------------------------------------------------------------------------

const THROWS = Symbol('throws');
function attempt<T>(f: () => T): T | typeof THROWS {
  try {
    return f();
  } catch {
    return THROWS;
  }
}
/** `pages === undefined || pages.length === 0` (:515, :789, :928) */
function noComponents(s: State): boolean | typeof THROWS {
  return attempt(() => s.pages === undefined || (s.pages as any).length === 0); // eslint-disable-line @typescript-eslint/no-explicit-any
}
/** `_findPage` (:386-410), on a lookup table with Object's prototype as the runtime's is */
function findPage(s: State, key: unknown): Found | undefined | typeof THROWS {
  return attempt(() => {
    const info = Object.assign({}, s.pageInfo) as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    const pages = s.pages as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    // an id whose entry outlives its row in the Components list is not found (row C111, fixed in P109 ISL-048: `pageRef.label` threw)
    const byId = info[key as any] ? pages.find((x: any) => x.id === key) : undefined; // eslint-disable-line @typescript-eslint/no-explicit-any
    if (byId) {
      const pageInfo = info[key as any]; // eslint-disable-line @typescript-eslint/no-explicit-any
      const pageRef = byId;
      return { component: String(pageInfo.component), label: String(pageRef.label), id: String(key), path: pageInfo.path !== undefined ? String(pageInfo.path) : undefined };
    }
    const pageRef = pages.find((x: any) => x.label === key); // eslint-disable-line @typescript-eslint/no-explicit-any
    // a page found by its label with no entry (its component never set) is not found, as by its id (row C109, fixed in P109 ISL-048)
    if (pageRef && info[pageRef.id]) {
      const pageInfo = info[pageRef.id];
      return { component: String(pageInfo.component), label: String(pageRef.label), id: String(pageRef.id), path: pageInfo.path !== undefined ? String(pageInfo.path) : undefined };
    }
    return undefined;
  });
}
/** `pages[0].id` (:534, :805, :944) */
function firstId(s: State): unknown {
  return attempt(() => (s.pages as any)[0].id); // eslint-disable-line @typescript-eslint/no-explicit-any
}
/** `_isAlreadyShowing` (:430-455): the top is this page with these parameters, shallowly and by identity */
function alreadyShowing(s: State, found: Found, params: Rec | undefined): boolean {
  const top = s.stack[s.stack.length - 1];
  if (!top || top.id !== found.id) return false;
  const a = top.params || {};
  const b = params || {};
  const ak = Object.keys(a);
  if (ak.length !== Object.keys(b).length) return false;
  for (const k of ak) if (!Object.prototype.hasOwnProperty.call(b, k) || a[k] !== b[k]) return false;
  return true;
}
/** `nodeScope.createNode(component)` → `getComponentModel` (nodecontext.ts :616-636): a component the project has, or a throw */
function canBuild(component: string): boolean {
  return STACK_PAGES.includes(component);
}
/** a transition's constructor (push-transition.ts :28-35, popup-transition.ts :20-27): its timing, or a throw (no curve) */
function timingOf(type: string, tr: Rec | undefined): Tr | typeof THROWS {
  if (type === 'None') return 'none';
  const timing = ((tr ?? {}).timing ?? { ...DEFAULT_TIMING, curve: CURVE }) as { dur?: unknown; delay?: unknown; curve?: unknown };
  if (!Array.isArray(timing.curve)) return THROWS;
  return { dur: timing.dur as number, delay: timing.delay as number };
}
/** `start` (transition.ts :50-61): no time ends at once */
function instant(tr: Tr): boolean {
  return tr === 'none' || tr === undefined || tr.delay + tr.dur === 0;
}

// ---------------------------------------------------------------------------------------------
// USE ROUTES — the URL (world.ts LOCATION), the runtime's expressions on the same values
// ---------------------------------------------------------------------------------------------

/** `_getLocationPath` (:644-662): the hash (`navigationPathType` unset or `hash`) or the path, one leading `/` off */
function locationPath(href: string, settings: Readonly<Record<string, unknown>>): string {
  const u = new URL(href);
  const type = settings.navigationPathType;
  if (type === undefined || type === 'hash') {
    let hash = u.hash;
    if (hash) {
      if (hash[0] === '#') hash = hash.substring(1);
      if (hash[0] === '/') hash = hash.substring(1);
    }
    return hash;
  }
  let path = u.pathname;
  if (path && path[0] === '/') path = path.substring(1);
  return path;
}
/** `decodeURIComponent`, the text kept as written on a malformed escape (row C124, fixed in P109 ISL-048, as the Router's C115) */
function decodeOrKeep(text: string): string {
  try {
    return decodeURIComponent(text);
  } catch {
    return text;
  }
}
/** `_getSearchParams` (:663-680) */
function searchParams(href: string): Record<string, string> {
  const pl = /\+/g;
  const search = /([^&=]+)=?([^&]*)/g;
  const decode = (x: string) => decodeOrKeep(x.replace(pl, ' '));
  const query = new URL(href).search.substring(1);
  let match: RegExpExecArray | null;
  const out: Record<string, string> = {};
  while ((match = search.exec(query))) out[decode(match[1])] = decode(match[2]);
  return out;
}
type FromUrl = { pageId: unknown; params: Record<string, string>; query: Record<string, string> };
/** `matchPageFromUrl` (:683-742), with no navigation parent: the first page in Components order whose pattern matches from the start */
function matchPageFromUrl(w: Work): FromUrl | undefined | typeof THROWS {
  const s = w.st;
  return attempt(() => {
    if (!s.useRoutes) return undefined;
    const pages = s.pages as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    if (pages === undefined || pages.length === 0) return undefined;
    let urlPath = locationPath(w.href as string, w.view.projectSettings());
    if (urlPath[0] === '/') urlPath = urlPath.substring(1);
    const pathParts = urlPath.split('/');
    const urlQuery = searchParams(w.href as string);
    const matchParts = (path: string[], pattern: string[]) => {
      const params: Record<string, string> = {};
      for (let i = 0; i < pattern.length; i++) {
        if (path[i] === undefined) return undefined;
        const p = pattern[i];
        if (p[0] === '{' && p[p.length - 1] === '}') params[p.substring(1, p.length - 1)] = decodeOrKeep(path[i]);
        else if (p !== path[i]) return undefined;
      }
      return params;
    };
    const info = Object.assign({}, s.pageInfo) as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    for (const page of pages) {
      const pageInfo = info[page.id];
      if (pageInfo === undefined) continue;
      let pattern = pageInfo.path;
      if (pattern === undefined) pattern = page.label.replace(/\s+/g, '-').toLowerCase();
      if (pattern[0] === '/') pattern = pattern.substring(1);
      const params = matchParts(pathParts, pattern.split('/'));
      if (params) return { pageId: page.id, params, query: urlQuery };
    }
    return undefined;
  });
}
/**
 * `_updateUrlWithTopPage` (:744-765) with `getNavigationAbsoluteURL` and `getRelativeURL` (:580-643), no navigation parent: the URL
 * the top page has, pushed. A URL the browser refuses (another origin) throws there, after the call is recorded.
 */
function pushUrl(w: Work, how: 'push' | 'replace' = 'push'): boolean | typeof THROWS {
  const s = w.st;
  if (!s.useRoutes) return false;
  const url = attempt(() => {
    let rel: { path: string; query: Array<{ name: string; value: unknown }> } | undefined;
    const top = s.stack[s.stack.length - 1];
    if (top !== undefined) {
      let urlPath: any = top.path; // eslint-disable-line @typescript-eslint/no-explicit-any
      if (urlPath === undefined) {
        // by the page's id as found (row C123, fixed in P109 ISL-048: by the entry's page id, which an entry made by a LABEL carries)
        const item = (s.pages as any).find((p: any) => p.id == top.id); // eslint-disable-line @typescript-eslint/no-explicit-any, eqeqeq
        if (item !== undefined) urlPath = item.label.replace(/\s+/g, '-').toLowerCase();
      }
      if (urlPath !== undefined) {
        const inPath = urlPath.match(/{([^}]+)}/g);
        const params: Record<string, unknown> = Object.assign({}, top.params);
        if (inPath) {
          for (const param of inPath) {
            const key = param.replace(/[{}]/g, '');
            if ((top.params as Record<string, unknown>)[key] !== undefined) {
              urlPath = urlPath.replace(param, encodeURIComponent(String(params[key])));
              delete params[key];
            }
          }
        }
        const query: Array<{ name: string; value: unknown }> = [];
        for (const key in params) query.push({ name: key, value: params[key] });
        if (urlPath.startsWith('/')) urlPath = urlPath.substring(1);
        rel = { path: urlPath, query };
      }
    }
    const path = rel === undefined ? '' : '/' + rel.path;
    // encoded (row C122, fixed in P109 ISL-048: written as it was)
    const query = (rel === undefined ? [] : rel.query).map((q) => encodeURIComponent(q.name) + '=' + encodeURIComponent(String(q.value)));
    const type = w.view.projectSettings().navigationPathType;
    const hash = type === undefined || type === 'hash';
    // hash mode with no query, while the address holds one: the address's path in front, so that query goes (row C121, fixed in
    // P109 ISL-048)
    const here = new URL(w.href as string);
    const front = hash ? (query.length === 0 && here.search !== '' ? here.pathname : '') : path;
    return front + (query.length >= 1 ? '?' + query.join('&') : '') + (hash ? '#' + path : '');
  });
  if (url === THROWS) return THROWS;
  // v18, row C120 — a replace overwrites the current entry (`history.replaceState`)
  w.answers.push(how === 'push' ? { op: 'history', url } : { op: 'history', url, how });
  const next = pushTarget(url, w.href as string);
  if (next === null) return THROWS;
  w.href = next;
  return how === 'push';
}

/** The href a traversal to `url` leaves (world.ts `traverse`: resolved against it) */
function moved(url: unknown, href: string | undefined): string | undefined {
  return attempt(() => pushTarget(url, href as string) ?? href) as string | undefined;
}

/**
 * The `popstate` listener (:197-206), on a landed Back or the person's Back or Forward: its own Pop's Back is counted off first (v18,
 * row C120); then, with Use Routes on, a reset at the frame's end — unless the address names the page, and parameters, on top.
 */
function heard(w: Work): void {
  if (w.st.ownBacks > 0) {
    w.st.ownBacks -= 1;
    return;
  }
  if (!w.st.useRoutes) return;
  const shows = addressShowsTop(w);
  if (shows === THROWS || shows) return;
  scheduleReset(w);
}

/** `_addressShowsTop` (v18, row C120): the page a reset from the address would build, with its parameters, is the one on top */
function addressShowsTop(w: Work): boolean | typeof THROWS {
  const s = w.st;
  const top = s.stack[s.stack.length - 1];
  const pages = s.pages as unknown[] | undefined;
  if (top === undefined || pages === undefined || pages.length === 0) return false;
  const fromUrl = matchPageFromUrl(w);
  if (fromUrl === THROWS) return THROWS;
  const pageId = fromUrl !== undefined ? fromUrl.pageId : s.startPageId !== undefined ? s.startPageId : firstId(s);
  if (pageId === THROWS) return THROWS;
  const found = findPage(s, pageId);
  if (found === THROWS) return THROWS;
  if (found === undefined || found.id !== top.id) return false;
  // the address holds text: a parameter pushed as 7 is "7" there
  const inUrl: Rec = fromUrl !== undefined ? Object.assign({}, fromUrl.query, fromUrl.params) : {};
  const onTop = top.params || {};
  const keys = Object.keys(onTop);
  if (keys.length !== Object.keys(inUrl).length) return false;
  return attempt(() => keys.every((k) => Object.prototype.hasOwnProperty.call(inUrl, k) && String(onTop[k]) === String(inUrl[k]))) as boolean | typeof THROWS;
}

// ---------------------------------------------------------------------------------------------
// the names (navigation-handler.ts)
// ---------------------------------------------------------------------------------------------

const norm = (name: unknown): unknown => name || 'Main';
/** `_pageStacks[name]` — an object key */
const keyOf = (name: unknown): string => String(name);

/**
 * `registerPageStack` (:62-104): under its name; what waited for that name runs (a first push resets first), else a reset. On a mount
 * that keeps the pages (v17, row C139) neither reset runs (`reset` returns for the handler's call): what waited lands on the kept pages.
 */
function register(w: Work, keep = false): void {
  const name = norm(w.st.name);
  w.st.regKey = keyOf(name);
  let hasReset = false;
  let hasNavigated = false;
  const rest: State['waiting'] = [];
  const replay: Item[] = [];
  for (const e of w.st.waiting) {
    if (e.name !== name) {
      rest.push(e);
      continue;
    }
    if (e.op === 'push' && !hasReset) {
      if (!keep) replay.push({ kind: 'reset', tokens: 0 });
      hasReset = true;
    }
    replay.push({ kind: e.op, v: e.v });
    hasNavigated = true;
  }
  w.st.waiting = rest;
  if (!hasNavigated && !keep) replay.push({ kind: 'reset', tokens: 0 });
  for (const item of replay) enqueue(w, item);
}
/** `deregisterPageStack` (:106-121), with the current name */
function deregister(w: Work): void {
  if (w.st.regKey !== null && w.st.regKey === keyOf(norm(w.st.name))) w.st.regKey = null;
}
/** `_performNavigation` (:41-51): the stack under the name takes it, or it waits */
function request(w: Work, op: 'push' | 'replace', v: Req): void {
  const name = norm(v.stack);
  if (w.st.regKey !== null && w.st.regKey === keyOf(name)) enqueue(w, { kind: op, v });
  else w.st.waiting = [...w.st.waiting, { name, op, v }];
}

// ---------------------------------------------------------------------------------------------
// the page (react-component-node.ts) and the frame
// ---------------------------------------------------------------------------------------------

/** The page follows Mounted: a mount is Did Mount and registering (:182-203); an unmount Will Unmount and deregistering (:205-214) */
function paint(w: Work): boolean {
  if (w.st.mounted && !w.st.onPage) {
    w.st.onPage = true;
    w.st.isMounted = true;
    w.emit.push('didMount');
    // v17, row C139 — Keep Pages When Unmounted: a stack holding its pages, owing no reset, the address where it was left (Use Routes)
    const addressMoved = w.st.useRoutes && w.href !== w.st.addressAtUnmount;
    const keep = w.st.keepPages && w.st.stack.length > 0 && !w.st.resetOwed && !addressMoved;
    w.st.resetOwed = false;
    register(w, keep);
    return true;
  }
  if (!w.st.mounted && w.st.onPage) {
    w.st.onPage = false;
    w.st.isMounted = false;
    w.emit.push('willUnmount');
    // v17, row C139 — what the next mount compares against
    w.st.resetOwed = false;
    // v18, row C120 — a Back of its own that lands after this is heard by no listener of the stack's
    w.st.ownBacks = 0;
    w.st.addressAtUnmount = w.href;
    deregister(w);
  }
  return false;
}

/** A frame's start: a running transition whose time is up ends (transition.ts `frame` :63-72) */
function tick(w: Work): void {
  const r = w.st.running;
  if (!r || !(w.now > r.until)) return;
  w.st.running = null;
  endOf(w, r.end);
}
function endOf(w: Work, end: End): void {
  if (end.kind === 'push') {
    // :1016-1022 — the page below leaves the children; it stays on the stack
    removeChild(w, end.below);
  } else if (end.kind === 'replace') {
    // :896-903 — the outgoing pages are deleted
    for (const p of end.outgoing) {
      removeChild(w, p);
      deleteNode(w, p);
    }
  } else {
    // :1068-1078 — the popped page goes, and the entry it animated comes off the stack (row C110, fixed in P109 ISL-048: it took
    // the LAST, which after a Reset during the animation was the new start page)
    removeChild(w, end.page);
    deleteNode(w, end.page);
    const popped = w.st.stack.find((e) => e.page === end.page);
    w.st.stack = w.st.stack.filter((e) => e.page !== end.page);
    // v18, row C120 (fixed in P109 ISL-048 as ruled, "A Pop steps the browser's history back": the page below's URL was pushed, a new
    // entry) — over the entry its push made, its `popstate` its own; a page whose push made none has the address replaced
    if (popped && popped.entry && w.st.useRoutes) {
      w.st.ownBacks += 1;
      w.answers.push({ op: 'history', how: 'back' });
    } else pushUrl(w, 'replace');
  }
}
/** `start` (transition.ts :50-61): at once, or until the first frame past start + Duration + Delay */
function startTransition(w: Work, tr: Tr, end: End): void {
  if (instant(tr)) return endOf(w, end);
  const t = tr as { dur: number; delay: number };
  w.st.running = { until: w.now + t.dur + t.delay, end };
}

// ---------------------------------------------------------------------------------------------
// ONE REQUEST AT A TIME
// ---------------------------------------------------------------------------------------------

/** A frame-end callback, scheduled at the step (a caller's request, navigate.ts / navigate-back.ts `scheduleNavigate`) */
function call(w: Work, cb: Callback): void {
  w.st.callbacks = [...w.st.callbacks, cb];
}
/** `scheduleReset` (:463-479): one callback per frame, which takes every Reset that arrived before it runs */
function scheduleReset(w: Work): void {
  if (w.st.resetScheduled) return;
  w.st.resetScheduled = true;
  call(w, { kind: 'reset' });
}

/** `ASyncQueue.enqueue` — run now when the queue is not working, else wait */
function enqueue(w: Work, item: Item): void {
  w.st.queue = [...w.st.queue, item];
  if (!w.st.busy && w.st.hops === 0) runNext(w, true);
}
/** `dequeue`: the next request's checks — they end in a build (busy until the yield), a return (one hop) or a throw (two) */
function runNext(w: Work, fromIdle: boolean): void {
  const [item, ...rest] = w.st.queue;
  w.st.queue = rest;
  const r = checks(w, item);
  if (r === null) w.st.hops = 1;
  else if (r === THROWS) w.st.hops = 2;
  else w.st.busy = r;
  // the queue starts working: it lands at the next yield. One the act boundary frees was working already, and its await is asked for
  if (fromIdle) w.resume = true;
}
/** One microtask generation (an act boundary): a queue that was freeing frees, and runs the next request */
function hop(w: Work): void {
  if (w.st.hops === 0) return;
  w.st.hops -= 1;
  if (w.st.hops === 0 && !w.st.busy && w.st.queue.length > 0) runNext(w, false);
}
/** The yield: the build lands, and everything that waited runs to its end, in order */
function atYield(w: Work): void {
  w.st.hops = 0;
  finishBusy(w);
  while (w.st.queue.length > 0) {
    const [item, ...rest] = w.st.queue;
    w.st.queue = rest;
    const r = checks(w, item);
    if (r === null || r === THROWS) continue;
    w.st.busy = r;
    finishBusy(w);
  }
}

/** The checks a request runs before its first `await` — refusals answered here; a page to build returned. */
function checks(w: Work, item: Item): Busy | null | typeof THROWS {
  const s = w.st;
  if (item.kind === 'reset') {
    // :507-511 — every page deleted first
    for (const p of s.children) deleteNode(w, p);
    s.children = [];
    const none = noComponents(s);
    if (none === THROWS) return THROWS;
    if (none) return failReset(w, item.tokens, 'component-stack/no-components');
    // :523-535 — with Use Routes, the page in the URL with the query's and the path's parameters; else the Start Page, else the first.
    // A Reset press or a Components edit: the Start Page (v18, row C126, fixed in P109 ISL-048 as ruled: it read the URL too)
    const fromUrl = item.toStart ? undefined : matchPageFromUrl(w);
    if (fromUrl === THROWS) return THROWS;
    const startPageId = fromUrl !== undefined ? fromUrl.pageId : s.startPageId !== undefined ? s.startPageId : firstId(s);
    if (startPageId === THROWS) return THROWS;
    const found = findPage(s, startPageId);
    if (found === THROWS) return THROWS;
    if (found === undefined) return failReset(w, item.tokens, 'component-stack/component-not-found');
    const params: Rec = fromUrl !== undefined ? Object.assign({}, fromUrl.query, fromUrl.params) : {};
    return { item, pageId: startPageId, found, params, outgoing: [], from: null, animate: false };
  }
  const op = item.kind;
  const v = item.v;
  const none = noComponents(s);
  if (none === THROWS) return THROWS;
  if (none) return answer(w, op, 'failure', 'push-component-stack/stack-has-no-components');
  if (s.running) return answer(w, op, 'failure', 'push-component-stack/stack-transitioning');
  const pageId = v.target || firstId(s);
  if (pageId === THROWS) return THROWS;
  const found = findPage(s, pageId);
  if (found === THROWS) return THROWS;
  if (found === undefined) return answer(w, op, 'failure', 'push-component-stack/component-not-found');
  if (op === 'push') {
    // :964-967
    if (alreadyShowing(s, found, v.params)) return answer(w, op, 'unchanged');
    return { item, pageId, found, params: {}, outgoing: [], from: null, animate: true };
  }
  // :831-834 — only when the stack is one deep
  if (s.stack.length === 1 && alreadyShowing(s, found, v.params)) return answer(w, op, 'unchanged');
  // :839-854 — unanimated, every page is deleted before the new one exists
  const outgoing = [...s.children];
  const from = s.stack.length > 0 ? s.stack[s.stack.length - 1].page : null;
  const type = (v.transition && (v.transition.type as string)) || 'None';
  const animate = from !== null && type !== 'None' && TRANSITIONS.includes(type);
  if (!animate) {
    for (const p of outgoing) {
      removeChild(w, p);
      deleteNode(w, p);
    }
  }
  return { item, pageId, found, params: {}, outgoing, from, animate };
}
function answer(w: Work, op: 'push' | 'replace', value: 'done' | 'unchanged' | 'failure', error?: string): null {
  w.answers.push(error === undefined ? { op, value } : { op, value, error });
  return null;
}
/** `_reportReset` (:480-494): every Reset of the frame alike; the mount's reports to no one. The pages are gone already (:507-511),
 * so the stack is empty and says so — Top Component Name '' and Stack Depth 0 (row C112, fixed in P109 ISL-048) */
function failReset(w: Work, tokens: number, error: string): null {
  w.st.stack = [];
  // v16, row C114: counted with Stack Depth (`_resetLeftEmpty` → `updateChildCountAndIndiciesNow`)
  countChildren(w);
  outputs(w, '', 0);
  for (let i = 0; i < tokens; i++) w.outcomes.push({ port: 'reset', outcome: 'failure', error });
  return null;
}

/** The page lands (after `await createNode`): the rest of the request. A build that throws is answered as not found (row C107,
 * fixed in P109 ISL-048) — a reset as its other not-found, leaving the stack empty. */
function finishBusy(w: Work): void {
  const b = w.st.busy;
  if (!b) return;
  w.st.busy = null;
  const s = w.st;
  const item = b.item;
  if (!canBuild(b.found.component)) {
    if (item.kind === 'reset') failReset(w, item.tokens, 'component-stack/component-not-found');
    else answer(w, item.kind, 'failure', 'push-component-stack/component-not-found');
    return;
  }
  if (item.kind === 'reset') {
    // :550-577
    const page = newPage(w);
    addChild(w, page);
    s.stack = [{ page, from: null, pageId: b.pageId, id: b.found.id, label: b.found.label, path: b.found.path, params: b.params, tr: undefined, pushed: false }];
    // v16, row C114: the reset counts its pages with Stack Depth (`updateChildCountAndIndiciesNow`) — in the frame whose paint mounted
    // the stack too, which counted nothing until the next frame
    countChildren(w);
    outputs(w, b.found.label, 1);
    // v18, row C126 — a Reset press or a Components edit writes its address, a new entry, when the address names another page
    if (item.toStart) {
      const shows = addressShowsTop(w);
      if (shows === THROWS) return;
      if (!shows) {
        const wrote = pushUrl(w);
        if (wrote === THROWS) return;
        s.stack[0].entry = wrote;
      }
    }
    for (let i = 0; i < item.tokens; i++) w.outcomes.push({ port: 'reset', outcome: 'done' });
    return;
  }
  const v = item.v;
  const params: Rec = { ...(v.params ?? {}) };
  if (item.kind === 'push') {
    // :993-1027 — the entry below, the transition
    const top = s.stack[s.stack.length - 1];
    // a stack with nothing on it has no page to push from: Failure (row C110, fixed in P109 ISL-048)
    if (!top) return void answer(w, 'push', 'failure', 'push-component-stack/stack-empty');
    // a type there is no such thing as plays no animation, as a replace's (row C108, fixed in P109 ISL-048)
    const asked = ((v.transition ?? {}).type as string) || 'Push';
    const type = TRANSITIONS.includes(asked) ? asked : 'None';
    const tr = timingOf(type, v.transition);
    if (tr === THROWS) return;
    const page = newPage(w);
    s.stack = [...s.stack, { page, from: top.page, pageId: b.pageId, id: b.found.id, label: b.found.label, path: b.found.path, params, tr, pushed: true }];
    outputs(w, b.found.label, s.stack.length);
    // :1010 — the URL, before the transition; a URL the browser refuses throws: no transition, no page added, nothing answered
    const wrote = pushUrl(w);
    if (wrote === THROWS) return;
    // v18, row C120 — a new history entry: its Pop steps back over it
    s.stack[s.stack.length - 1].entry = wrote;
    startTransition(w, tr, { kind: 'push', below: top.page });
    addChild(w, page);
    w.answers.push({ op: 'push', value: 'done' });
    return;
  }
  // replace (:856-909)
  const type = (v.transition && (v.transition.type as string)) || 'None';
  const tr = b.animate ? timingOf(type, v.transition) : undefined;
  if (tr === THROWS) return;
  const page = newPage(w);
  s.stack = [{ page, from: null, pageId: b.pageId, id: b.found.id, label: b.found.label, path: b.found.path, params, tr, pushed: false }];
  outputs(w, b.found.label, 1);
  // :889 — the URL overwrites the current entry (v18, row C120, fixed in P109 ISL-048 as ruled: a new entry, so the browser's Back
  // returned to the page the replace removed); refused, it throws as a push's does
  if (pushUrl(w, 'replace') === THROWS) return;
  if (b.animate) startTransition(w, tr, { kind: 'replace', outgoing: b.outgoing });
  addChild(w, page);
  w.answers.push({ op: 'replace', value: 'done' });
}

/**
 * The top page's Pop asks (`back` :1041-1083), when the stack pushed that page and it is still there. The page below comes back, the
 * node that pushed the top page hears the action and results, the page below is named, and the transition plays back. A page below
 * that the Components list no longer has is looked up first and refuses the back: Failure, nothing moves (row C111, fixed in P109
 * ISL-048 — it threw after the page below came back, and the stack never popped).
 */
function back(w: Work, v: Req): void {
  const s = w.st;
  const top = s.stack[s.stack.length - 1];
  if (!top || !top.pushed || s.deleted.includes(top.page)) return;
  if (s.stack.length <= 1) return void w.answers.push({ op: 'back', value: 'unchanged' });
  if (s.running) return void w.answers.push({ op: 'back', value: 'failure', error: 'pop-component-stack/transition-in-progress' });
  // the page below first: one the Components list no longer has refuses the back before anything moves (row C111, fixed in P109 ISL-048)
  const below = findPage(s, s.stack[s.stack.length - 2].pageId);
  if (below === THROWS) return;
  if (below === undefined) return void w.answers.push({ op: 'back', value: 'failure', error: 'pop-component-stack/page-not-found' });
  addChild(w, top.from as number, 0);
  w.answers.push(v.action === undefined ? { op: 'returned', results: v.results ?? {} } : { op: 'returned', action: v.action, results: v.results ?? {} });
  outputs(w, below.label, s.stack.length - 1);
  startTransition(w, top.tr, { kind: 'back', page: top.page });
  w.answers.push({ op: 'back', value: 'done' });
}
```


:::info Generated
This page is generated from `node-catalog-enriched.json`, the node's spec in `packages/nodegx-node-spec` and the export ledger. Do not edit it by hand — run `npm run docs:nodes` to regenerate, and fix the source instead.
:::
