---
title: "Page Router"
---
Page Router: a visual region that shows one page component at a time, driven by the browser URL and Navigate nodes.

Router (Page Router) renders exactly one of its configured page components inside its own bounds. Its `pages` parameter is `{ routes: [component names], startPage: component name }`; each page component is rooted by a Page node whose `urlPath` defines the page's URL pattern, which may contain `{param}` placeholders. On mount the Router matches the current browser URL (hash-based by default, or real paths depending on the project's `navigationPathType` setting) and shows the matching page, falling back to `startPage`; a RouterNavigate node or a URL change switches pages, updates the browser URL and the document title, and delivers path/query parameters to Page Inputs (PageInputs) nodes inside the mounted page. Several Routers can coexist if given different `name`s; Navigate nodes address a router by that name (default "Main").

## When to use it

The standard top-level navigation of an app: distinct pages with URLs, deep-linkable and back-button friendly. For push/pop sub-flows with transitions (wizards, drill-in) use Page Stack instead; a Router can nest inside another Router's page via its `urlPath` base-path input.

## At a glance

| | |
|---|---|
| Category | Visual |
| Type name | `Router` |
| Available in | browser |
| SSR compatibility | safe |
| Provided by | `noodl-viewer-react` |
| Behaviour spec | version 6 ([under the hood](#under-the-hood)) |

## Inputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `backgroundColor` | Color | `transparent` | Fill colour behind whichever page is showing |
| `clip` | Enum (`contentHeight`, `scroll`, `clip`) | `contentHeight` | What happens when a page is taller than the router: grow to fit it, scroll it, or clip it |
| `cssClassName` | String | `` | Extra CSS class names to put on this element, for styling from a stylesheet you supply |
| `dataAttributes` | Stringlist | — | data-* names (data-testid) for tests and scripts to find this element by; each gets a value input |
| `mounted` | Boolean | `true` | Removes the element from the page entirely when false, unlike Visible which leaves its space behind. Wired, it counts as true until the first value arrives, so set it to false here to start hidden (a lock, a private screen) |
| `name` | String | — | Name the Navigate nodes address this router by; leave it blank if there is only one |
| `pages` | Pages | — | The components this router can show, and which of them is the start page |
| `scrollIntoViewAlign` | Enum (`nearest`, `start`, `center`, `end`) | `nearest` | Where Scroll Into View leaves the element: Nearest edge moves only as far as needed |
| `styleCss` | String | `/* background-color: red; */` | Raw CSS declarations applied to this element, overriding the styling ports above |
| `urlPath` | String | — | Path segment prefixed to every page of this router, for nesting one router inside another |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `reset` | Signal | — | Re-reads the URL and rebuilds the current page from scratch |
| `scrollIntoView` | Signal | — | Scrolls the page, or the scrolling Group holding this element, until the element can be seen |

### What each input does

**Name** (`name`)

- always: it leaves the old name and, while on the page, registers under the new one — which resets it, or hands it the navigates that waited for that name (blank is Main)

**Pages** (`pages`)

- always: the pages it can show, the first its start page; while on the page, it resets at the end of the frame

**Url path** (`urlPath`)

- always: read by the next match and the next URL — put in front of every page's path (null as none)

**Reset** (`reset`)

- always: one reset at the end of the frame answers every Reset — it reads the URL and shows its page: Done when it built one or moved the parameters, Unchanged when it shows that page with them already, Failure when there is no page to show

**Mounted** (`mounted`)

- always: the router is put on the page (Did Mount, registering, a reset), or taken off it (Will Unmount), at the next paint

**Scroll Into View** (`scrollIntoView`)

- always: the page, or the scrolling Group holding it, scrolls until the router can be seen

## Outputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `boundingHeight` | Number | — | Height this element actually ended up with after layout, in pixels |
| `boundingWidth` | Number | — | Width this element actually ended up with after layout, in pixels |
| `childIndex` | Number | — | This element's position among its parent's children, counting from 0 |
| `childrenCount` | Number | — | How many child elements are currently mounted inside this one |
| `currentPageComponent` | String | — | Component name of the page currently showing |
| `currentPageTitle` | String | — | Title of the page currently showing, taken from the Pages list |
| `screenPositionX` | Number | — | Distance in pixels from the left edge of the window to this element's left edge |
| `screenPositionY` | Number | — | Distance in pixels from the top edge of the window to this element's top edge |
| `this` | Reference | — | A reference to this node itself, for ports that take a node rather than a value |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `completed` | Signal | — | Fires after every invocation, whatever the outcome — wire this to carry on regardless. Failure still fires and still carries its reason, so this cannot hide an error |
| `didMount` | Signal | — | Fires once this element has been added to the page and can be measured |
| `done` | Signal | — | Fires once the page has been rebuilt, or its Page Inputs updated with new parameters |
| `unchanged` | Signal | — | Fires when the Router is already showing that page with those parameters, so nothing needed rebuilding |
| `willUnmount` | Signal | — | Fires just before this element is removed from the page, while it still exists |

### Failure outputs

| Name | Type | Default | Description |
|---|---|---|---|
| `failure` | Signal | — | Fires when the Router has no Pages, no start page, a start page it does not serve, or a routed component that is not a page |

## Dynamic ports

_This node's port list changes at runtime (declared-port-groups, runtime-discovered, editor-adapter); the tables above may be incomplete for a given instance._

The "pages" parameter determines which pages exist; the editor (RouterAdapter) derives ports and navigation metadata from the page components.

| Condition | Inputs shown | Outputs shown |
|---|---|---|
| — | — | — |

## Ports at runtime

Runtime-determined ports (runtime-discovered + editor-adapter, RouterAdapter): the `pages` parameter decides which page components exist, and the editor derives navigation metadata — page titles, URL patterns, parameters — from each page component's Page node. An authoring tool should set `name` and `pages` on the Router and declare titles/paths on the Page node inside each page component; it cannot enumerate page-dependent ports statically.

## Patterns

- One Router named "Main" at the app root, with RouterNavigate nodes anywhere in the app switching it by name.
- Declare `urlPath` with `{param}` placeholders on a page's Page node, then read the values with a Page Inputs node inside that page.

## Watch out for

- Adding a Router per app section when one Router plus pages suffices — multiple routers are for genuinely independent regions (e.g. a main area and a side panel).

## Examples

**Router page navigation from a button**

URL-style navigation: a Router hosts the app's pages (each page is a component, configured in the Router's `pages` parameter), and a Navigate node (RouterNavigate) switches it. The Button's `onClick` signal triggers `navigate`; which page to go to, and any path parameters, are set on the Navigate node's parameters — those ports are created from the Router's page configuration at edit time, which is why they are runtime-determined in the catalog.

**URL-driven detail page: Router, Page Inputs, Navigate To Path and External Link**

URL-style navigation end to end. A Router named 'Main' hosts /Home and /Product (its `pages` parameter is `{ routes, startPage }`); each page component is rooted by a Page node whose `urlPath` defines its URL pattern — /Product uses 'product/{productId}', so the id lives in the URL. On /Home, a Navigate To Path node (PageStackNavigateToPath) builds the URL from its `path` parameter: the '{productId}' placeholder becomes the `p-productId` input, set here as a parameter, and clicking the button pushes the compiled path into browser history, which the Router picks up. On /Product, a Page Inputs node declares `pathParams: "productId"` so the value parsed from the URL is exposed as its `pm-productId` output, wired into a Text. An External Link node (net.noodl.externallink) opens an outside URL in a new tab — external URLs never go through the Router.

## Related nodes

[Navigate](../navigation/router-navigate.md), [Page](./page.md), [Page Inputs](../navigation/page-inputs.md), [Navigate To Path](../navigation/page-stack-navigate-to-path.md), [Component Stack](./page-stack.md)

## Code export

Exports to React. A project that uses it exports this node as React code.

## Under the hood

This node's behaviour is written down as an executable spec in `@nodegx/node-spec`, version 6. The spec is the reference: the runtime, the React export and the conformance tests are all graded against it. Every rule in it cites the line of the runtime it was read from. The full spec is at the bottom of this page.

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
  "regKey": null,
  "waiting": [],
  "handed": {},
  "nextHand": 1,
  "deleted": [],
  "children": [],
  "nextPage": 1,
  "queue": [],
  "busy": null,
  "hops": 0,
  "owed": false,
  "callbacks": [],
  "resetScheduled": false,
  "resetTokens": 0,
  "countLate": false,
  "early": null,
  "count": 0
}
```

### How actions report back

Each time Reset is triggered, the node reports exactly one of **Done**, **Unchanged** or **Failure**.

### What a person can do to it

The conformance tests play these acts against it:

- `navigate`: a Navigate hands the Page Router a navigate: the page to show, its parameters, and whether in a new tab
- `traverse`: the person's browser goes Back or Forward: the location moves to this URL and the page hears popstate

## The full spec {#spec-source}

The spec's source, as the docs were generated. Helpers it imports live beside it in `packages/nodegx-node-spec/src`.

```ts title="packages/nodegx-node-spec/src/nodes/page-router.ts"
/**
 * Page Router (`Router`) — read from `packages/noodl-viewer-react/src/nodes/navigation/router.tsx` (the node), `router-handler.ts`
 * (the names, the 1 ms hand-on, the project's page index), `router-navigate.ts` (what a Navigate hands it), `page.ts` and
 * `page-inputs.ts` (the page it builds), `async-queue.ts` (one request at a time) and `react-component-node.ts` (Mounted, Did Mount,
 * Will Unmount, Children Count) on 2026-10-08, and recorded on the runtime the same day (NSP-016 s57; the reading and the measurements
 * are NSP-016 §7.18).
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from; where the rule is JavaScript's (a lookup by
 * a value that is not what the code expects, a decode of a malformed escape), the spec runs the same expression on the same value.
 *
 * THE PROJECT (`ROUTER_PAGES`). The router shows components the project has, by the project's PAGE INDEX (`graphModel.routerIndex`):
 * `pages` — each page component with its path and title — and `routers` — each Router with its Pages. In a play the project has four
 * page components: `Home` at `/`, `Product` at `/product/{id}` (each holding a Page and a Page Inputs), `About` at `/about` (a Page),
 * and `Twice` at `/twice` (two Pages — a component the router refuses to show by its URL). The index's routers are this node, by the
 * Name it was PLACED with (the saved project: a wired Name never moves the index) and its Pages as they are now (Pages is edit-only,
 * and the editor sends the index again with every edit) — an unnamed one (no Name, or `''`) as Main (`getRouterIndex`, P109-S18,
 * fixed in P109 ISL-034: it left an unnamed Router out, so every URL showed the start page). The router looks itself up in the index by
 * its Name now, a blank one as Main (`getPagesForRouter`), so a Name WRITTEN after placing it moves the lookup, not the index.
 *
 * THE URL (world.ts LOCATION). The router reads the location — its hash (`navigationPathType` unset or `hash`) or its path (`path`) —
 * and its query, matching the path against each page's path (with Url path in front): the page whose pattern has the fewest parts
 * more or fewer than the URL wins, the first on a tie; `{name}` parts are parameters, each segment decoded once (`_decodePathSegment`).
 * The query is decoded the same way, once, a malformed escape (`?q=%zz`) kept as written — row C115, fixed in P109 ISL-048 (it threw and
 * blanked the router, a Reset unanswered). No
 * match: the start page, with the query's parameters only when the router had pages to match against.
 *
 * THE CALLERS (spec.ts; the acts `navigate`, `traverse`). A Navigate hands the router a navigate at ITS frame's end (`scheduleNavigate`
 * → `RouterHandler.navigate`), which hands it on ONE MILLISECOND later (`setTimeout`, the world's clock): to the one router registered,
 * whatever name the Navigate gave, when exactly one is; else to the routers under the name, or into the handler's queue — where it
 * waits for a router to register under that name. A blank name is Main on both sides (`name || 'Main'`; row C118, fixed in P109 ISL-048). The router answers it (an `answer` event,
 * op `navigate`): Failure when it names no page (`navigate/no-target-page`) or a component the index has no page for
 * (`navigate/page-not-found`); Done after opening a new tab (`window.open(url, '_blank')`); Unchanged when it shows that page with those
 * parameters already (shallow, `===`); else it builds the page, hands its Page Inputs the parameters (an `answer` event, op `page`, one
 * per Page Inputs), puts it on, pushes its URL (`history.pushState`) and answers Done. A navigate builds a component whatever its Page
 * nodes. The person's browser — Back, Forward — moves the location (`traverse`): the router hears `popstate` while it is on the page,
 * and resets at the frame's end.
 *
 * ONE REQUEST AT A TIME (`ASyncQueue`). Resets and navigates wait their turn. Each runs its checks at once — a refusal answered there —
 * then builds its page (`await createNode`), which lands at the next yield to the event loop: a settle's, after the frame's end, or an
 * advance's, before the clock moves (spec.ts `resume`). What waits behind it runs then. A request whose checks ended without a build
 * frees the queue a microtask generation later per `await` on its way out (`hops`): one for a reset or a navigate that returned, two for
 * a navigate Unchanged (it awaits `_navigateInCurrentWindow`), two for a throw (`.then`, then `.catch`).
 *
 * A RESET (`resetAsync` :501-647) — at the mount (registering; it reports to no one), at a Reset (every Reset of the frame alike), when
 * Pages change while the router is on the page, and at a `popstate` — reads the URL. No page to show: Failure `router/no-pages` (no
 * Pages) or `router/no-start-page`; a component the index has no page for: `router/page-not-found`; the page it shows: Done when the
 * parameters moved (the Page Inputs are handed them), else Unchanged. Otherwise it leaves the page it shows (deleted), builds the new one
 * and — when the component holds exactly one Page — puts it on (Current Page Title and Component; the Page Inputs handed the
 * parameters) and reports Done; else it deletes it, forgets the page it showed, and reports `router/component-is-not-a-page`. A reset
 * never pushes a URL.
 *
 * **Children Count** is the router's page containers, counted at the frame's end, as the Component Stack's (row C114's frame counted
 * late, measured there). The look reaches the element only.
 */

import { defineNode, said, type AnswerCall, type InputDecl } from '../spec';
import { SELF_REFERENCE } from '../trace';
import { pushTarget } from '../world';
import { dataAttributeInput, dataAttributeNames } from './data-attributes';

/** THE PROJECT: each page component the play's project has, with its path and title (the page index), and how many Page / Page Inputs it holds. */
export const ROUTER_PAGES: ReadonlyArray<{ component: string; path: string; title: string; pageNodes: number; pageInputs: number }> = [
  { component: 'Home', path: '/', title: 'Home', pageNodes: 1, pageInputs: 1 },
  { component: 'Product', path: '/product/{id}', title: 'Product', pageNodes: 1, pageInputs: 1 },
  { component: 'About', path: '/about', title: 'About', pageNodes: 1, pageInputs: 0 },
  { component: 'Twice', path: '/twice', title: 'Twice', pageNodes: 2, pageInputs: 0 }
];

const FULL = { routes: ['Home', 'Product', 'About', 'Twice'], startPage: 'Home' };

/** What a Navigate hands (router-navigate.ts :128-150): the act `navigate`. `router` is the Navigate's Router; `params` its page parameters. */
export const NAVIGATES: readonly unknown[] = [
  { target: 'About' },
  { target: 'Product', params: { id: 7 } },
  { target: 'Product', params: { id: 'a/b c' } },
  { target: 'Product', params: { id: 7, tab: 'reviews' } },
  { target: 'Home' },
  { target: 'Twice' },
  { target: 'Product' },
  {},
  { target: 'Missing' },
  { target: 'About', openInNewTab: true },
  { router: 'Other', target: 'About' },
  { router: 'Main', target: 'Product', params: { id: 8 } }
];
/** Where the person's Back or Forward takes the location: the act `traverse`. */
export const TRAVERSES: readonly unknown[] = ['#/about', '#/product/9', '#/', '#/product/7?x=1', '#/twice', '#/nowhere', '/about', '/product/3?tab=specs', '?q=%zz#/about', 'https://app.example/'];

type Rec = Readonly<Record<string, unknown>>;
type Nav = { router?: unknown; target?: unknown; params?: Rec; openInNewTab?: unknown };
type PageInfo = (typeof ROUTER_PAGES)[number];
type Item = { kind: 'reset'; tokens: number } | { kind: 'navigate'; v: Nav };
/** The request whose page is being built (awaiting `createNode`), with what its checks found — it lands at the next yield */
type Busy = { item: Item; page: PageInfo; params: Rec };
/** The router's frame-end list (`scheduleAfterInputsHaveUpdated`): its scheduled reset, and the Navigates' hand-ons, in step order */
type Callback = { kind: 'reset' } | { kind: 'navigate'; v: Nav };

type State = {
  /** react-component-node.ts :1267 `wantsToBeMounted` */
  mounted: boolean;
  /** on the page: mounted and painted */
  onPage: boolean;
  /** `_internal.isMounted` (:145-178): written by the component's mount and unmount */
  isMounted: boolean;
  /** `_internal.name` — `undefined` until written */
  name: unknown;
  /** the handler's key this router is registered under, or none (`_routers[name]`) */
  regKey: string | null;
  /** the handler's queue (`_navigationQueue`): navigates to a name no router held, the name as handed */
  waiting: Array<{ name: unknown; v: Nav }>;
  /** the navigates handed to the handler, waiting out its 1 ms, by timer tag */
  handed: Readonly<Record<string, { name: unknown; v: Nav }>>;
  nextHand: number;
  pages: unknown;
  urlPath: unknown;
  /** the Name the router was placed with, Main when blank: the project's page index names it so (THE PROJECT) */
  indexName: unknown;
  /** `_internal.currentPage` — the page it shows (its snapshot: the index never changes in a play) */
  current: PageInfo | undefined;
  currentParams: Rec | undefined;
  /**
   * `_internal.currentPageComponent` — the content of the page it shows, as a reset or a navigate built it (row C117, fixed in P109
   * ISL-048: a navigate never wrote it, so a later reset onto the same page handed its parameters to a page already deleted)
   */
  built: { page: number; info: PageInfo } | undefined;
  /** the page containers deleted (left, or refused) */
  deleted: number[];
  children: number[];
  nextPage: number;
  queue: Item[];
  busy: Busy | null;
  /** act boundaries the queue is still working for after a request's checks ended without a build (async-queue.ts :55-76) */
  hops: number;
  owed: boolean;
  callbacks: Callback[];
  resetScheduled: boolean;
  resetTokens: number;
  countLate: boolean;
  /**
   * In a frame whose paint mounted the router: what the frame's callbacks had started before it — a build, and the requests queued.
   * They land at the yield before the frame's last update pass, so Children Count counts them in the frame; what the mount itself
   * starts (it runs in React's commit, after that pass) is counted a frame late (measured; C114's frame).
   */
  early: { busy: boolean; queued: number } | null;
  // ---- the outputs as last written ----
  title: unknown;
  component: unknown;
  count: number;
};

const NOTHING = { send: [] };
const LOOK = (displayName: string, group: string, description: string, extra: Record<string, unknown> = {}) => ({ coerce: 'none' as const, displayName, group, description, ...extra });

export const PageRouter = defineNode({
  type: 'Router',
  // v6 (P109 ISL-034, s39): an unnamed Router is Main in the project's index and in its own lookup — it matches the URL (row P109-S18)
  // v5 (P109 ISL-048, s30): a Reset onto the page a Navigate built hands that page its new parameters — Back to the same page with other ones shows them (row C117)
  // v4 (P109 ISL-048, s30): a blank-named Navigate queued before the router is on the page waits as Main, so a router registering as Main takes it (row C118)
  // v3 (P109 ISL-048, s30): a Url path of null is none — the router matches and pushes its URLs as with no Url path (row C116)
  // v2 (P109 ISL-048, s30): a malformed escape in the query is kept as written, as a path segment's is — the router shows its page and answers (row C115)
  version: 6,
  source: 'packages/noodl-viewer-react/src/nodes/navigation/router.tsx',
  needs: ['person', 'clock', 'location', 'project'],
  worldPool: {
    advances: [0, 1, 2, 16, 100],
    // a browser: a router always has a window
    viewports: [{ width: 1280, height: 800 }],
    activations: [null],
    locations: [
      null,
      'https://app.example/#/about',
      'https://app.example/#/product/7',
      'https://app.example/?tab=x#/product/a%2Fb',
      'https://app.example/about',
      'https://app.example/product/a%25b?tab=x',
      'https://app.example/shop/about',
      'https://app.example/?q=%zz'
    ],
    projectSettings: [{}, { navigationPathType: 'path' }, { navigationPathType: 'hash' }]
  },
  // :280-291 `outcomeOutputs({ done, unchanged, failure })` — Reset's
  outcomes: ['done', 'unchanged', 'failure'],

  init: (_w, params) => ({ indexName: params.name || 'Main', name: params.name, pages: params.pages, urlPath: params.urlPath === null ? undefined : params.urlPath }),

  state: {
    mounted: true,
    onPage: false,
    isMounted: false,
    name: undefined,
    regKey: null,
    waiting: [],
    handed: {},
    nextHand: 1,
    pages: undefined,
    urlPath: undefined,
    indexName: undefined,
    current: undefined,
    currentParams: undefined,
    built: undefined,
    deleted: [],
    children: [],
    nextPage: 1,
    queue: [],
    busy: null,
    hops: 0,
    owed: false,
    callbacks: [],
    resetScheduled: false,
    resetTokens: 0,
    countLate: false,
    early: null,
    title: undefined,
    component: undefined,
    count: 0
  } as State,

  acts: {
    navigate: { description: 'a Navigate hands the Page Router a navigate: the page to show, its parameters, and whether in a new tab', values: NAVIGATES },
    traverse: { description: "the person's browser goes Back or Forward: the location moves to this URL and the page hears popstate", values: TRAVERSES }
  },

  inputs: {
    // ---- logic ----
    // :197-210
    name: { type: 'string', coerce: 'none', displayName: 'Name', group: 'General', description: 'Name the Navigate nodes address this router by; leave it blank if there is only one', portability: 'logic', examples: ['Main', 'Other', '', null] },
    // :211-222 — edit-only: the editor's panel
    pages: {
      type: 'pages',
      editOnly: true,
      coerce: 'none',
      displayName: 'Pages',
      group: 'Pages',
      description: 'The components this router can show, and which of them is the start page',
      portability: 'logic',
      examples: [FULL, { routes: ['Home', 'Product', 'About'], startPage: 'About' }, { routes: ['Home', 'About'] }, { routes: ['Product'], startPage: 'Twice' }, { routes: [], startPage: 'Missing' }]
    },
    // :223-230
    urlPath: { type: 'string', coerce: 'none', displayName: 'Url path', group: 'General', description: 'Path segment prefixed to every page of this router, for nesting one router inside another', portability: 'logic', examples: ['shop', '/shop/', ''] },
    // :259-268
    reset: { type: 'signal', outcome: true, displayName: 'Reset', group: 'Actions', description: 'Re-reads the URL and rebuilds the current page from scratch', portability: 'logic' },
    // react-component-node.ts :2302-2321
    mounted: { type: 'boolean', default: true, coerce: 'none', displayName: 'Mounted', group: 'General', description: 'Removes the element from the page entirely when false, unlike Visible which leaves its space behind. Wired, it counts as true until the first value arrives, so set it to false here to start hidden (a lock, a private screen)', portability: 'logic', layout: 'present' },
    // react-component-node.ts :1380-1395
    scrollIntoView: { type: 'signal', displayName: 'Scroll Into View', group: 'Scroll Into View', description: 'Scrolls the page, or the scrolling Group holding this element, until the element can be seen', portability: 'logic' },
    scrollIntoViewAlign: { type: 'enum', enums: ['nearest', 'start', 'center', 'end'], default: 'nearest', coerce: 'none', displayName: 'Scroll Align', group: 'Scroll Into View', description: 'Where Scroll Into View leaves the element: Nearest edge moves only as far as needed', portability: 'logic' },

    // ---- look (R10): reach the element only ----
    clip: { type: 'enum', enums: ['contentHeight', 'scroll', 'clip'], default: 'contentHeight', ...LOOK('Clip Behavior', 'Layout', 'What happens when a page is taller than the router: grow to fit it, scroll it, or clip it'), portability: 'layout-shared', layout: 'clip' },
    backgroundColor: { type: 'color', default: 'transparent', ...LOOK('Background Color', 'Style', 'Fill colour behind whichever page is showing'), portability: 'look-shared' },
    cssClassName: { type: 'string', default: '', ...LOOK('CSS Class', 'Advanced HTML', 'Extra CSS class names to put on this element, for styling from a stylesheet you supply'), portability: 'web-only' },
    styleCss: { type: 'string', default: '/* background-color: red; */', editOnly: true, ...LOOK('CSS Style', 'Advanced HTML', 'Raw CSS declarations applied to this element, overriding the styling ports above'), portability: 'web-only' },
    dataAttributes: { type: 'stringlist', editOnly: true, ...LOOK('Data Attributes', 'Data Attributes', 'data-* names (data-testid) for tests and scripts to find this element by; each gets a value input'), portability: 'web-only' }
  },

  outputs: {
    // :292-309
    currentPageTitle: { type: 'string', from: (s) => s.title, displayName: 'Current Page Title', group: 'General', description: 'Title of the page currently showing, taken from the Pages list' },
    currentPageComponent: { type: 'string', from: (s) => s.component, displayName: 'Current Page Component', group: 'General', description: 'Component name of the page currently showing' },
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
    // :197-210 — off the handler under the old name; on under the new one if on the page (which resets, or replays what waited)
    // s74 (NSP-018): a computed patch (`run`), so its words go through `said`
    name: (s, v, _i, view) =>
      said(
        'always: it leaves the old name and, while on the page, registers under the new one — which resets it, or hands it the navigates that waited for that name (blank is Main)',
        run(
          s,
          (w) => {
            deregister(w);
            w.st.name = v;
            if (w.st.isMounted) register(w);
          },
          view
        )
      ),
    // :211-222
    pages: (s, v, _i, view) =>
      said(
        'always: the pages it can show, the first its start page; while on the page, it resets at the end of the frame',
        run(
          s,
          (w) => {
            w.st.pages = v;
            if (w.st.isMounted) scheduleReset(w);
          },
          view
        )
      ),
    // :223-230 — stored; read by the next match and the next URL
    // a null Url path is none (row C116, fixed in P109 ISL-048: `_trimUrlPart(null)` threw at every match and every URL)
    urlPath: (s, v, _i, view) =>
      said('always: read by the next match and the next URL — put in front of every page\'s path (null as none)', run(s, (w) => void (w.st.urlPath = v === null ? undefined : v), view)),
    // :259-268, :340-357 — every Reset of the frame is answered by the one reset at the frame's end
    reset: (s, _i, view) =>
      said(
        'always: one reset at the end of the frame answers every Reset — it reads the URL and shows its page: Done when it built one or moved the parameters, Unchanged when it shows that page with them already, Failure when there is no page to show',
        { ...run(s, (w) => (scheduleReset(w), void (w.st.resetTokens += 1)), view), outcome: 'pending' }
      ),
    // react-component-node.ts :2310-2320
    mounted: (s, v, _i, view) =>
      said('always: the router is put on the page (Did Mount, registering, a reset), or taken off it (Will Unmount), at the next paint', run(s, (w) => void (w.st.mounted = !!v), view)),
    // react-component-node.ts :1380-1395 — scrolls; nothing on the wire. The look has no reducer: stored, and read by nothing here
    scrollIntoView: () => ({ says: 'always: the page, or the scrolling Group holding it, scrolls until the router can be seen', send: [] })
  },
  {
    derived: {
      inputs: (params) => Object.fromEntries(dataAttributeNames(params.dataAttributes).map((name) => [name, dataAttributeInput(name)])) as Record<string, InputDecl>,
      on: () => NOTHING
    },
    world: {
      // placed on the page with its params set — the first render mounts it: Did Mount, and it registers (react-component-node.ts)
      place: (s, _i, view) => run(s, (w) => void paint(w), view, 'place'),
      // the yield: the page being built lands, and what waited behind it runs
      resume: (s, _i, _tag, view) =>
        run(
          s,
          (w) => {
            atYield(w, w.st.early);
            w.st.early = null;
            if (!w.st.countLate) countChildren(w);
          },
          view,
          'yield'
        ),
      // router-handler.ts :51-67 — the handler hands a navigate on, 1 ms after it was handed
      timer: (s, _i, tag, view) =>
        run(
          s,
          (w) => {
            const h = w.st.handed[tag];
            if (!h) return;
            const handed = { ...w.st.handed };
            delete handed[tag];
            w.st.handed = handed;
            // the one router registered takes it, whatever the name; else the handler's queue, a blank name as Main (row C118, fixed in P109 ISL-048)
            if (w.st.regKey !== null) enqueue(w, { kind: 'navigate', v: h.v });
            else w.st.waiting = [...w.st.waiting, { name: norm(h.name), v: h.v }];
          },
          view,
          'yield'
        )
    },
    // a frame: the frame's callbacks (the scheduled reset, the Navigates' hand-ons), then the paint
    afterInputs: (s, _i, view) =>
      run(
        s,
        (w) => {
          const callbacks = w.st.callbacks;
          w.st.callbacks = [];
          for (const cb of callbacks) {
            if (cb.kind === 'reset') {
              // :348-355 — the Resets that arrived before the callback runs
              const tokens = w.st.resetTokens;
              w.st.resetScheduled = false;
              w.st.resetTokens = 0;
              enqueue(w, { kind: 'reset', tokens });
            } else hand(w, cb.v);
          }
          const early = { busy: w.st.busy !== null, queued: w.st.queue.length };
          w.st.countLate = paint(w);
          w.st.early = w.st.countLate && (early.busy || early.queued > 0) ? early : null;
          if (!w.st.countLate) countChildren(w);
        },
        view,
        'frame'
      ),
    person: {
      // a Navigate's request, handed at its frame's end (router-navigate.ts `scheduleNavigate`)
      navigate: (s, _i, v, view) => run(s, (w) => void (paint(w), call(w, { kind: 'navigate', v: (v ?? {}) as Nav })), view, 'act'),
      // Back or Forward: the location moves; a router on the page hears popstate (:155-161) and resets at the frame's end
      traverse: (s, _i, v, view) =>
        run(
          s,
          (w) => {
            paint(w);
            w.traverse = v;
            if (w.st.isMounted) scheduleReset(w);
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

type View = { href(): string | undefined; projectSettings(): Readonly<Record<string, unknown>>; send(port: string, state?: Readonly<Record<string, unknown>>): void };

type Work = {
  st: State;
  view: View;
  answers: AnswerCall[];
  outcomes: Array<{ port: 'reset'; outcome: 'done' | 'unchanged' | 'failure'; error?: string }>;
  emit: Array<'didMount' | 'willUnmount'>;
  send: Set<'childrenCount'>;
  resume: boolean;
  after: Array<{ ms: number; tag: string }>;
  traverse: unknown;
  /** the href as the work leaves it (a push moves it): what a later check in the same work reads */
  href: string | undefined;
};

/** A reducer's patch: the whole state as the work leaves it, and what it sent, answered, asked the world for. */
function run(s: Readonly<State>, f: (w: Work) => void, view: View, mode: 'step' | 'act' | 'frame' | 'place' | 'yield' = 'step'): any { // eslint-disable-line @typescript-eslint/no-explicit-any
  const w: Work = { st: { ...s }, view, answers: [], outcomes: [], emit: [], send: new Set(), resume: false, after: [], traverse: undefined, href: view.href() };
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
    ...(w.after.length > 0 ? { after: w.after } : {}),
    ...(w.traverse !== undefined ? { traverse: { url: w.traverse } } : {})
  };
}

/** Children Count at the frame's end (`scheduleUpdateChildCountAndIndicies`, react-component-node.ts :1670-1680) */
function countChildren(w: Work): void {
  w.st.count = w.st.children.length;
  w.send.add('childrenCount');
}
/** `flagOutputDirty` — sent at the call, with what the output reads then (several builds can land in one yield: spec.ts `send`) */
function flag(w: Work, port: 'currentPageTitle' | 'currentPageComponent'): void {
  w.view.send(port, w.st);
}

// ---------------------------------------------------------------------------------------------
// the runtime's JavaScript, run on the same values (R3)
// ---------------------------------------------------------------------------------------------

const THROWS = Symbol('throws');
function attempt<T>(f: () => T): T | typeof THROWS {
  try {
    return f();
  } catch {
    return THROWS;
  }
}

/** `_trimUrlPart` (:42-46) */
function trimUrlPart(url: any): any { // eslint-disable-line @typescript-eslint/no-explicit-any
  if (url[0] === '/') url = url.substring(1);
  if (url[url.length - 1] === '/') url = url.substring(0, url.length - 1);
  return url;
}
/** `_decodePathSegment` (:71-77) */
function decodePathSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}
/** `getPageInfoForComponent` (router-handler.ts :137-141): the index's page for a component, by `===` */
function pageFor(component: unknown): PageInfo | undefined {
  return ROUTER_PAGES.find((p) => p.component === component);
}
/** `getPagesForRouter` (router-handler.ts :117-137): the index's routers under the name — a blank one Main — their routes' pages */
function pagesForRouter(s: State): PageInfo[] {
  // the exporter lists every Router, an unnamed one as Main (noodl-editor utils/exporter/router.ts `getRouterIndex`, P109-S18)
  const routers = [{ name: s.indexName, pages: s.pages as any }]; // eslint-disable-line @typescript-eslint/no-explicit-any
  const wanted = s.name || 'Main';
  const matching = routers.filter((r) => r.name === wanted);
  const comps = new Set<unknown>();
  matching.forEach((r) => {
    const pages = r.pages;
    if (pages !== undefined && pages.routes !== undefined) pages.routes.forEach((c: unknown) => comps.add(c));
  });
  return Array.from(comps)
    .map((c) => pageFor(String(c)))
    .filter((p): p is PageInfo => !!p);
}
/** `_getLocationPath` (:726-751), BaseUrl unset (the play's `Noodl.Env` has none) */
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
/** `_getSearchParams` (:753-768) — each name and value decoded once; a malformed escape is kept as written (row C115, fixed in P109 ISL-048) */
function searchParams(href: string): Record<string, string> {
  const pl = /\+/g;
  const search = /([^&=]+)=?([^&]*)/g;
  const decode = (x: string) => decodePathSegment(x.replace(pl, ' '));
  const query = new URL(href).search.substring(1);
  let match: RegExpExecArray | null;
  const out: Record<string, string> = {};
  while ((match = search.exec(query))) out[decode(match[1])] = decode(match[2]);
  return out;
}
type Match = { page: PageInfo | undefined; params: Record<string, string>; query: Record<string, string> } | undefined;
/** `matchPageFromUrl` (:772-853), with no router above this one */
function matchPageFromUrl(w: Work): Match | typeof THROWS {
  return attempt(() => {
    let urlPath = locationPath(w.href as string, w.view.projectSettings());
    if (urlPath[0] === '/') urlPath = urlPath.substring(1);
    const pathParts = urlPath.split('/').map(decodePathSegment);
    const urlQuery = searchParams(w.href as string);
    const pages = pagesForRouter(w.st);
    if (pages.length === 0) return undefined;
    const matchParts = (path: string[], pattern: string[]) => {
      const params: Record<string, string> = {};
      for (let i = 0; i < pattern.length; i++) {
        const p = pattern[i];
        if (p[0] === '{' && p[p.length - 1] === '}') {
          if (path[i] !== undefined) params[p.substring(1, p.length - 1)] = path[i];
        } else if (path[i] === undefined || p !== path[i]) return undefined;
      }
      return { params };
    };
    let matched: { params: Record<string, string>; page: PageInfo } | undefined;
    let best = 9999;
    for (const page of pages) {
      let pattern = trimUrlPart(page.path);
      if (w.st.urlPath !== undefined) pattern = trimUrlPart(w.st.urlPath) + '/' + pattern;
      const parts = String(pattern).split('/');
      const m = matchParts(pathParts, parts);
      const dist = Math.abs(parts.length - pathParts.length);
      if (m && best > dist) {
        matched = { params: m.params, page };
        best = dist;
      }
    }
    return matched ? { page: matched.page, params: matched.params, query: urlQuery } : { page: undefined, params: {}, query: urlQuery };
  });
}
/** `getRelativeURL` + `getNavigationAbsoluteURL` + `_getCompleteUrlToPage` (:659-724, :855-872), no router above */
function completeUrl(s: State, page: PageInfo, pageParams: Rec, settings: Readonly<Record<string, unknown>>): string {
  let urlPath: any = page.path; // eslint-disable-line @typescript-eslint/no-explicit-any
  const inPath = urlPath.match(/{([^}]+)}/g);
  const params: Record<string, unknown> = Object.assign({}, pageParams);
  if (inPath) {
    for (const param of inPath) {
      const key = param.replace(/[{}]/g, '');
      if (pageParams[key] !== undefined) {
        urlPath = urlPath.replace(param, encodeURIComponent(params[key] as string));
        delete params[key];
      }
    }
  }
  const query: Array<{ name: string; value: string }> = [];
  for (const key in params) query.push({ name: key, value: encodeURIComponent(params[key] as string) });
  urlPath = trimUrlPart(urlPath);
  if (s.urlPath !== undefined) urlPath = trimUrlPart(s.urlPath) + '/' + urlPath;
  const path = (String(urlPath).startsWith('/') ? '' : '/') + urlPath;
  const type = settings.navigationPathType;
  const q = query.map((x) => x.name + '=' + x.value);
  const search = q.length >= 1 ? '?' + q.join('&') : '';
  return type === undefined || type === 'hash' ? search + '#' + path : path + search;
}
/** `shallowObjectsEqual` (:1010-1019) */
function shallowEqual(a: unknown, b: unknown): boolean {
  const ka = Object.keys((a as object) || {});
  const kb = Object.keys((b as object) || {});
  if (ka.length !== kb.length) return false;
  return ka.every((k) => (a as Record<string, unknown>)[k] === (b as Record<string, unknown>)[k]);
}

// ---------------------------------------------------------------------------------------------
// the names (router-handler.ts)
// ---------------------------------------------------------------------------------------------

const norm = (name: unknown): unknown => name || 'Main';
const keyOf = (name: unknown): string => String(name);

/** `registerRouter` (:69-96): under its name; what waited for that name runs, else a reset */
function register(w: Work): void {
  const name = norm(w.st.name);
  w.st.regKey = keyOf(name);
  let navigated = false;
  const rest: State['waiting'] = [];
  const replay: Item[] = [];
  for (const e of w.st.waiting) {
    if (e.name === name) {
      replay.push({ kind: 'navigate', v: e.v });
      navigated = true;
    } else rest.push(e);
  }
  w.st.waiting = rest;
  if (!navigated) replay.push({ kind: 'reset', tokens: 0 });
  for (const item of replay) enqueue(w, item);
}
/** `deregisterRouter` (:98-112), with the current name */
function deregister(w: Work): void {
  if (w.st.regKey !== null && w.st.regKey === keyOf(norm(w.st.name))) w.st.regKey = null;
}
/** `RouterHandler.navigate` (:51-67): handed on 1 ms later (the world's clock) */
function hand(w: Work, v: Nav): void {
  const tag = `nav${w.st.nextHand}`;
  w.st.nextHand += 1;
  w.st.handed = { ...w.st.handed, [tag]: { name: v.router, v } };
  w.after.push({ ms: 1, tag });
}

// ---------------------------------------------------------------------------------------------
// the page (react-component-node.ts) and the frame
// ---------------------------------------------------------------------------------------------

/** The page follows Mounted: a mount is Did Mount and registering (:145-165); an unmount Will Unmount and deregistering (:167-178) */
function paint(w: Work): boolean {
  if (w.st.mounted && !w.st.onPage) {
    w.st.onPage = true;
    w.st.isMounted = true;
    w.emit.push('didMount');
    register(w);
    return true;
  }
  if (!w.st.mounted && w.st.onPage) {
    w.st.onPage = false;
    w.st.isMounted = false;
    w.emit.push('willUnmount');
    deregister(w);
  }
  return false;
}

/** A frame-end callback, scheduled at the step */
function call(w: Work, cb: Callback): void {
  w.st.callbacks = [...w.st.callbacks, cb];
}
/** `scheduleReset` (:340-357): one callback per frame, which takes every Reset that arrived before it runs */
function scheduleReset(w: Work): void {
  if (w.st.resetScheduled) return;
  w.st.resetScheduled = true;
  call(w, { kind: 'reset' });
}

// ---------------------------------------------------------------------------------------------
// ONE REQUEST AT A TIME
// ---------------------------------------------------------------------------------------------

function enqueue(w: Work, item: Item): void {
  w.st.queue = [...w.st.queue, item];
  if (!w.st.busy && w.st.hops === 0) runNext(w, true);
}
/** `dequeue`: the next request's checks — they end in a build (busy until the yield), or free the queue `hops` boundaries later */
function runNext(w: Work, fromIdle: boolean): void {
  const [item, ...rest] = w.st.queue;
  w.st.queue = rest;
  const r = checks(w, item);
  if (r === THROWS) w.st.hops = 2;
  else if (typeof r === 'number') w.st.hops = r;
  else w.st.busy = r;
  if (fromIdle) w.resume = true;
}
function hop(w: Work): void {
  if (w.st.hops === 0) return;
  w.st.hops -= 1;
  if (w.st.hops === 0 && !w.st.busy && w.st.queue.length > 0) runNext(w, false);
}
/** The yield: the build lands, and everything that waited runs, in order — what a mounting frame's callbacks started counted first */
function atYield(w: Work, early: State['early'] = null): void {
  w.st.hops = 0;
  if (early && !early.busy) runQueued(w, early.queued);
  finishBusy(w);
  if (early) {
    if (early.busy) runQueued(w, early.queued);
    countChildren(w);
  }
  runQueued(w, Infinity);
}
function runQueued(w: Work, n: number): void {
  for (let i = 0; i < n && w.st.queue.length > 0; i++) {
    const [item, ...rest] = w.st.queue;
    w.st.queue = rest;
    const r = checks(w, item);
    if (r === THROWS || typeof r === 'number') continue;
    w.st.busy = r;
    finishBusy(w);
  }
}

/** The page it leaves (`_leaveCurrentPage` :429-446): every page container off and deleted (no page in the play is kept) */
function leave(w: Work): void {
  w.st.deleted = [...w.st.deleted, ...w.st.children];
  w.st.children = [];
}

/** The checks a request runs before its first `await` — refusals answered here (their hops returned); a page to build returned. */
function checks(w: Work, item: Item): Busy | number | typeof THROWS {
  const s = w.st;
  if (item.kind === 'reset') {
    // :501-521
    const m = matchPageFromUrl(w);
    if (m === THROWS) return THROWS;
    let component: unknown;
    let params: Rec = {};
    if (m && m.page) {
      component = m.page.component;
      params = Object.assign({}, m.params, m.query);
    } else {
      const pages = s.pages as any; // eslint-disable-line @typescript-eslint/no-explicit-any
      const start = attempt(() => (pages !== undefined ? pages.startPage : undefined));
      if (start === THROWS) return THROWS;
      component = start;
      params = m ? Object.assign({}, m.params, m.query) : {};
    }
    if (component === undefined) return failReset(w, item.tokens, s.pages === undefined ? 'router/no-pages' : 'router/no-start-page');
    const page = pageFor(component);
    if (page === undefined) return failReset(w, item.tokens, 'router/page-not-found');
    if (s.current && s.current.component === page.component) {
      // :571-589 — the page it shows: Done when the parameters moved (the Page Inputs handed them), else Unchanged
      if (!shallowEqual(s.currentParams, params)) {
        s.currentParams = params;
        // `_updatePageInputs(currentPageComponent.nodeScope, …)` :583 — the page it shows, whoever built it (row C117, fixed in P109 ISL-048)
        if (s.built) handPageInputs(w, s.built.info, params);
        reportReset(w, item.tokens, 'done');
      } else reportReset(w, item.tokens, 'unchanged');
      return 1;
    }
    // :591-597 — scrolled to the top, the page left, the new one built
    leave(w);
    return { item, page, params };
  }
  const v = item.v;
  // :898-924
  if (v.target === undefined) return answer(w, 'failure', 'navigate/no-target-page');
  const page = pageFor(v.target);
  if (!page) return answer(w, 'failure', 'navigate/page-not-found');
  const params: Rec = v.params ?? {};
  if (v.openInNewTab) {
    // :914-920 — `window.open(url, '_blank')`, then Done
    const url = attempt(() => completeUrl(s, page, params, w.view.projectSettings()));
    if (url === THROWS) return THROWS;
    w.answers.push({ op: 'open', url, target: '_blank' });
    answer(w, 'done');
    return 1;
  }
  // :940-950 — the page it shows with those parameters: Unchanged (awaited once more on the way out)
  if (s.current && s.current.component === page.component && shallowEqual(s.currentParams, params)) {
    answer(w, 'unchanged');
    return 2;
  }
  // :952-961 — scrolled, the page left, a container made, the content built
  leave(w);
  return { item, page, params };
}
function answer(w: Work, value: 'done' | 'unchanged' | 'failure', error?: string): number {
  w.answers.push(error === undefined ? { op: 'navigate', value } : { op: 'navigate', value, error });
  return 1;
}
function reportReset(w: Work, tokens: number, outcome: 'done' | 'unchanged'): void {
  for (let i = 0; i < tokens; i++) w.outcomes.push({ port: 'reset', outcome });
}
/** `_reportReset` (:404-427): every Reset of the frame alike; the mount's reports to no one */
function failReset(w: Work, tokens: number, error: string): number {
  for (let i = 0; i < tokens; i++) w.outcomes.push({ port: 'reset', outcome: 'failure', error });
  return 1;
}
/** `_setPageParams` on each Page Inputs of the page (:654-657, :970-975) */
function handPageInputs(w: Work, info: PageInfo, params: Rec): void {
  for (let i = 0; i < info.pageInputs; i++) w.answers.push({ op: 'page', params });
}
function showOutputs(w: Work, page: PageInfo): void {
  w.st.title = page.title;
  w.st.component = page.component;
  flag(w, 'currentPageTitle');
  flag(w, 'currentPageComponent');
}

/** The page lands (after `await createNode`): the rest of the request. */
function finishBusy(w: Work): void {
  const b = w.st.busy;
  if (!b) return;
  w.st.busy = null;
  const s = w.st;
  const id = s.nextPage;
  s.nextPage = id + 1;
  if (b.item.kind === 'reset') {
    // :600-621 — exactly one Page, or the content is deleted and the page it showed forgotten
    if (b.page.pageNodes !== 1) {
      s.current = undefined;
      s.built = undefined;
      s.deleted = [...s.deleted, id];
      s.component = undefined;
      flag(w, 'currentPageComponent');
      return void failReset(w, b.item.tokens, 'router/component-is-not-a-page');
    }
    s.current = b.page;
    s.currentParams = b.params;
    showOutputs(w, b.page);
    handPageInputs(w, b.page, b.params);
    s.built = { page: id, info: b.page };
    s.children = [...s.children, id];
    return void reportReset(w, b.item.tokens, 'done');
  }
  // _buildPage :951-994 — whatever its Page nodes; the URL pushed, then Done
  s.current = b.page;
  s.currentParams = b.params;
  showOutputs(w, b.page);
  handPageInputs(w, b.page, b.params);
  s.built = { page: id, info: b.page };
  s.children = [...s.children, id];
  // `_updateUrlWithTopPage` (:874-884): the URL pushed — a later reset in this work reads the location where it moved
  const url = attempt(() => completeUrl(s, b.page, b.params, w.view.projectSettings()));
  if (url === THROWS) return;
  w.answers.push({ op: 'history', url });
  w.href = pushTarget(url, w.href as string) ?? w.href;
  answer(w, 'done');
}
```


:::info Generated
This page is generated from `node-catalog-enriched.json`, the node's spec in `packages/nodegx-node-spec` and the export ledger. Do not edit it by hand — run `npm run docs:nodes` to regenerate, and fix the source instead.
:::
