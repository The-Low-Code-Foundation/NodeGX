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
 * build that throws (a component the project does not have, a transition there is no such thing as, a stack with nothing on it)
 * answers nothing, and the next one runs (rows C107, C108, C110). A back is not queued.
 *
 * A RESET (`resetAsync` :503-578) — at the mount (registering), at a Reset (Done or Failure, every Reset of the frame alike), when
 * Components change while the stack is on the page, and when the Name changes while it is — deletes every page, then (no components:
 * Failure `component-stack/no-components`; its start page not found: `component-stack/component-not-found`) builds the start page:
 * Top Component Name its label, Stack Depth 1. A reset at the mount reports to no one.
 *
 * A PUSH (`navigateAsync` :927-1028) builds the page on top (Stack Depth + 1) and plays the transition from the page below; at its end
 * the page below leaves the stack's children (it stays on the stack, to come back). A REPLACE (:787-910) builds the page as the only
 * one: unanimated, every page is deleted first; animated, they are deleted at the transition's end. A BACK (:1041-1083) puts the page
 * below back, hands the node that pushed the top page the back's action and results (`returned`), names the page below at once, and at
 * the transition's end deletes the top page and takes the LAST entry off the stack — whatever it is by then (row C110).
 *
 * THE TRANSITION (transitions/transition.ts). None, or a Push or Popup with no time (`dur + delay` 0), ends at once. A timed one ends
 * at the first frame whose clock is past its start + Duration + Delay (`frame` :63-72: a `requestAnimationFrame` chain, run at a
 * frame's start); while it runs the stack refuses a push, a replace and a back. A reset does not stop it.
 *
 * **Children Count** is the stack's page containers, counted at the frame's end — except in a frame whose paint mounted the stack,
 * which sends none: the next frame counts (row C114, measured; a mount at the placing or at an act counts at once). Use Routes is v2 (`undriven`). The look reaches
 * the element only.
 */

import { defineNode, type AnswerCall, type InputDecl, type ValueInputDecl } from '../spec';
import { SELF_REFERENCE } from '../trace';
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

/** transitions.ts — the transitions there are */
const TRANSITIONS = ['None', 'Push', 'Popup'];
/** push-transition.ts :28, popup-transition.ts :20 — a timed transition with no timing */
const DEFAULT_TIMING = { dur: 300, delay: 0 };

type Rec = Readonly<Record<string, unknown>>;
type Req = { stack?: unknown; target?: unknown; params?: Rec; transition?: Rec; action?: unknown; results?: unknown };
/** What a page found by `_findPage` is (:56-68) */
type Found = { component: string; label: string; id: string };
/** An entry's transition: `none` ends at once; a timed one runs; `undefined` — an entry no push made (reset, unanimated replace) */
type Tr = 'none' | { dur: number; delay: number } | undefined;
/** A stack entry (:70-79): its page container, the one below it (a push's), the page, its parameters, its transition */
type Entry = { page: number; from: number | null; pageId: unknown; id: string; label: string; params: Rec; tr: Tr; pushed: boolean };
/** What a running transition does at its end */
type End = { kind: 'push'; below: number | null } | { kind: 'replace'; outgoing: number[] } | { kind: 'back'; page: number };
type Item = { kind: 'reset'; tokens: number } | { kind: 'push' | 'replace'; v: Req };
/** The request whose page is being built (awaiting `createNode`), with what its checks found — it lands at the next yield */
type Busy = { item: Item; pageId: unknown; found: Found; outgoing: number[]; from: number | null; animate: boolean };
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

export const ComponentStack = defineNode({
  type: 'Page Stack',
  version: 1,
  source: 'packages/noodl-viewer-react/src/nodes/navigation/navigation-stack.tsx',
  needs: ['person', 'clock'],
  worldPool: { advances: [0, 16, 100, 149, 150, 151, 300, 301, 1000] },
  // :347-350 `outcomeOutputs({ done, failure })` — Reset's
  outcomes: ['done', 'failure'],

  state: {
    mounted: true,
    onPage: false,
    isMounted: false,
    name: undefined,
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
    countLate: false,
    top: '',
    depth: 0,
    count: 0
  } as State,

  acts: {
    push: { description: 'a Push Component To Stack hands the stack a push: the page to show on top, its parameters and the transition', values: PUSHES },
    replace: { description: 'a Push Component To Stack in Replace mode hands the stack a replace: the page to show instead of every page on it', values: REPLACES },
    back: { description: "the Pop Component Stack in the top page asks the stack to pop it, with the back's action and results", values: BACKS }
  },

  inputs: {
    // ---- logic ----
    // :255-269
    name: { type: 'string', default: 'Main', coerce: 'none', displayName: 'Name', group: 'General', description: 'Name the Push and Pop nodes address this stack by; leave it as Main if there is only one', portability: 'logic', examples: ['Main', 'Other', '', null] },
    // :279-288
    useRoutes: { type: 'boolean', default: false, coerce: 'none', displayName: 'Use Routes', group: 'General', description: 'Puts the top component in the browser URL, so back and forward move through the stack', portability: 'logic', undriven: "v2 — the URL is the world's LOCATION, which a page in a play does not have yet (NSP-016 §7.17)" },
    // :303-314
    pages: { type: 'proplist', coerce: 'none', displayName: 'Components', group: 'Components', description: 'The components this stack can show, and which of them it starts on', portability: 'logic', examples: [THREE, THREE.slice(0, 1), THREE.slice(0, 2), THREE.slice(1), []] },
    // :315-326
    reset: { type: 'signal', outcome: true, displayName: 'Reset', group: 'Actions', description: 'Empties the stack and rebuilds the start component', portability: 'logic' },
    // react-component-node.ts :2302-2321
    mounted: { type: 'boolean', default: true, coerce: 'none', displayName: 'Mounted', group: 'General', description: 'Removes the element from the page entirely when false, unlike Visible which leaves its space behind', portability: 'logic' },
    // react-component-node.ts :1380-1395
    scrollIntoView: { type: 'signal', displayName: 'Scroll Into View', group: 'Scroll Into View', description: 'Scrolls the page, or the scrolling Group holding this element, until the element can be seen', portability: 'logic' },
    scrollIntoViewAlign: { type: 'enum', enums: ['nearest', 'start', 'center', 'end'], default: 'nearest', coerce: 'none', displayName: 'Scroll Align', group: 'Scroll Into View', description: 'Where Scroll Into View leaves the element: Nearest edge moves only as far as needed', portability: 'logic' },

    // ---- look (R10): reach the element only ----
    clip: { type: 'boolean', default: true, ...LOOK('Clip Content', 'Layout', 'Clips a pushed component that is bigger than the stack'), portability: 'layout-shared' },
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
    // :255-269 — off the handler under the old name; on under the new one if on the page (which resets, or replays what waited)
    name: (s, v) =>
      run(s, (w) => {
        deregister(w);
        w.st.name = v;
        if (w.st.isMounted) register(w);
      }),
    // :303-314
    pages: (s, v) =>
      run(s, (w) => {
        w.st.pages = v;
        if (w.st.isMounted) scheduleReset(w);
      }),
    // :315-326, :463-479 — every Reset of the frame is answered by the one reset at the frame's end
    reset: (s) => ({ ...run(s, (w) => (scheduleReset(w), void (w.st.resetTokens += 1))), outcome: 'pending' }),
    // react-component-node.ts :2310-2320
    mounted: (s, v) => run(s, (w) => void (w.st.mounted = !!v)),
    // react-component-node.ts :1380-1395 — scrolls; nothing on the wire, nothing the queue reads (an owed hop waits for the next step
    // that can see it, which applies it first). Use Routes (v2) and the look have no reducer: stored, and read by nothing here
    scrollIntoView: () => NOTHING
  },
  {
    derived: {
      // the editor's ports (:1128-1189): per page its component (and its path, with Use Routes), then Start Page; and the Data Attributes'
      inputs: (params) => {
        const out: Record<string, InputDecl> = Object.fromEntries(dataAttributeNames(params.dataAttributes).map((name) => [name, dataAttributeInput(name)]));
        const pages = params.pages;
        if (Array.isArray(pages) && pages.length > 0) {
          const ids: string[] = [];
          for (const p of pages) {
            const id = String((p as { id?: unknown } | null)?.id);
            ids.push(id);
            out[`pageComp-${id}`] = pageCompPort();
          }
          out.startPage = startPagePort(ids);
        }
        return out;
      },
      // :1084-1120 `registerInputIfNeeded` — stored; nothing until a reset or a request reads them
      on: (s, port, value) =>
        port.startsWith('data-') ? NOTHING : run(s, (w) => {
          if (port.startsWith('pageComp-')) setInfo(w, port.slice('pageComp-'.length), 'component', value);
          else if (port.startsWith('pagePath-')) setInfo(w, port.slice('pagePath-'.length), 'path', value);
          else if (port === 'startPage') w.st.startPageId = value;
        }),
      discover: (port) => (port.startsWith('pageComp-') ? pageCompPort() : port === 'startPage' ? startPagePort(THREE.map((p) => p.id)) : undefined),
      candidates: ['pageComp-p1', 'pageComp-p2', 'pageComp-p3', 'startPage']
    },
    world: {
      // placed on the page with its params set — the first render mounts it: Did Mount, and it registers (react-component-node.ts)
      place: (s, _i, view) => run(s, (w) => void paint(w), view.now(), 'place'),
      // the yield: the page being built lands, and what waited behind it runs
      resume: (s, _i, _tag, view) =>
        run(
          s,
          (w) => {
            atYield(w);
            if (!w.st.countLate) countChildren(w);
          },
          view.now(),
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
              w.st.resetScheduled = false;
              w.st.resetTokens = 0;
              enqueue(w, { kind: 'reset', tokens });
            } else if (cb.kind === 'back') {
              if (!w.st.deleted.includes(cb.page)) back(w, cb.v);
            } else request(w, cb.kind, cb.v);
          }
          // a frame whose paint mounted the stack sends no Children Count — not for its callbacks, its paint or its yield; the next
          // frame counts (row C114, measured)
          w.st.countLate = paint(w);
          if (!w.st.countLate) countChildren(w);
        },
        view.now(),
        'frame'
      ),
    // the callers' requests, on a PAINTED page (adapter.ts `act`)
    person: {
      push: (s, _i, v, view) => run(s, (w) => void (paint(w), call(w, { kind: 'push', v: (v ?? {}) as Req })), view.now(), 'act'),
      replace: (s, _i, v, view) => run(s, (w) => void (paint(w), call(w, { kind: 'replace', v: (v ?? {}) as Req })), view.now(), 'act'),
      // the Pop in the top page as the person sees it — only a page the stack pushed has one that can ask
      back: (s, _i, v, view) =>
        run(
          s,
          (w) => {
            paint(w);
            const top = w.st.stack[w.st.stack.length - 1];
            if (top && top.pushed) call(w, { kind: 'back', page: top.page, v: (v ?? {}) as Req });
          },
          view.now(),
          'act'
        )
    }
  }
);

// ---------------------------------------------------------------------------------------------
// the work: a draft of the whole state, and what the work said
// ---------------------------------------------------------------------------------------------

type Work = {
  st: State;
  /** the world's clock at this work (a transition starts at it) */
  now: number;
  answers: AnswerCall[];
  outcomes: Array<{ port: 'reset'; outcome: 'done' | 'failure'; error?: string }>;
  emit: Array<'didMount' | 'willUnmount'>;
  send: Set<'topPageName' | 'stackDepth' | 'childrenCount'>;
  resume: boolean;
};

/**
 * A reducer's patch: the whole state as the work leaves it — so a branch is what it emits, answers and resolves, never which keys a
 * path happened to change (s54, s55) — and what it sent.
 */
function run(s: Readonly<State>, f: (w: Work) => void, now = NaN, mode: 'step' | 'act' | 'frame' | 'place' | 'yield' = 'step'): any { // eslint-disable-line @typescript-eslint/no-explicit-any
  const w: Work = { st: { ...s }, now, answers: [], outcomes: [], emit: [], send: new Set(), resume: false };
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
    ...(w.resume ? { resume: 'build' } : {})
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
    if (info[key as any]) { // eslint-disable-line @typescript-eslint/no-explicit-any
      const pageInfo = info[key as any]; // eslint-disable-line @typescript-eslint/no-explicit-any
      const pageRef = pages.find((x: any) => x.id === key); // eslint-disable-line @typescript-eslint/no-explicit-any
      return { component: String(pageInfo.component), label: String(pageRef.label), id: String(key) };
    }
    const pageRef = pages.find((x: any) => x.label === key); // eslint-disable-line @typescript-eslint/no-explicit-any
    if (pageRef) {
      const pageInfo = info[pageRef.id];
      return { component: String(pageInfo.component), label: String(pageRef.label), id: String(pageRef.id) };
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
// the names (navigation-handler.ts)
// ---------------------------------------------------------------------------------------------

const norm = (name: unknown): unknown => name || 'Main';
/** `_pageStacks[name]` — an object key */
const keyOf = (name: unknown): string => String(name);

/** `registerPageStack` (:62-104): under its name; what waited for that name runs (a first push resets first), else a reset */
function register(w: Work): void {
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
      replay.push({ kind: 'reset', tokens: 0 });
      hasReset = true;
    }
    replay.push({ kind: e.op, v: e.v });
    hasNavigated = true;
  }
  w.st.waiting = rest;
  if (!hasNavigated) replay.push({ kind: 'reset', tokens: 0 });
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
    // :1068-1078 — the popped page goes, and the LAST entry comes off the stack, whatever it is by now (row C110)
    removeChild(w, end.page);
    deleteNode(w, end.page);
    w.st.stack = w.st.stack.slice(0, -1);
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
    // :533-534 (no routes: no page from the URL)
    const startPageId = s.startPageId !== undefined ? s.startPageId : firstId(s);
    if (startPageId === THROWS) return THROWS;
    const found = findPage(s, startPageId);
    if (found === THROWS) return THROWS;
    if (found === undefined) return failReset(w, item.tokens, 'component-stack/component-not-found');
    return { item, pageId: startPageId, found, outgoing: [], from: null, animate: false };
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
    return { item, pageId, found, outgoing: [], from: null, animate: true };
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
  return { item, pageId, found, outgoing, from, animate };
}
function answer(w: Work, op: 'push' | 'replace', value: 'done' | 'unchanged' | 'failure', error?: string): null {
  w.answers.push(error === undefined ? { op, value } : { op, value, error });
  return null;
}
/** `_reportReset` (:480-494): every Reset of the frame alike; the mount's reports to no one */
function failReset(w: Work, tokens: number, error: string): null {
  for (let i = 0; i < tokens; i++) w.outcomes.push({ port: 'reset', outcome: 'failure', error });
  return null;
}

/** The page lands (after `await createNode`): the rest of the request. A build that throws answers nothing. */
function finishBusy(w: Work): void {
  const b = w.st.busy;
  if (!b) return;
  w.st.busy = null;
  if (!canBuild(b.found.component)) return; // row C107
  const s = w.st;
  const item = b.item;
  if (item.kind === 'reset') {
    // :550-577
    const page = newPage(w);
    addChild(w, page);
    s.stack = [{ page, from: null, pageId: b.pageId, id: b.found.id, label: b.found.label, params: {}, tr: undefined, pushed: false }];
    outputs(w, b.found.label, 1);
    for (let i = 0; i < item.tokens; i++) w.outcomes.push({ port: 'reset', outcome: 'done' });
    return;
  }
  const v = item.v;
  const params: Rec = { ...(v.params ?? {}) };
  if (item.kind === 'push') {
    // :993-1027 — the entry below (none: `top.page` throws, row C110), the transition (one there is no such thing as throws, row C108)
    const top = s.stack[s.stack.length - 1];
    if (!top) return;
    const type = ((v.transition ?? {}).type as string) || 'Push';
    if (!TRANSITIONS.includes(type)) return;
    const tr = timingOf(type, v.transition);
    if (tr === THROWS) return;
    const page = newPage(w);
    s.stack = [...s.stack, { page, from: top.page, pageId: b.pageId, id: b.found.id, label: b.found.label, params, tr, pushed: true }];
    outputs(w, b.found.label, s.stack.length);
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
  s.stack = [{ page, from: null, pageId: b.pageId, id: b.found.id, label: b.found.label, params, tr, pushed: false }];
  outputs(w, b.found.label, 1);
  if (b.animate) startTransition(w, tr, { kind: 'replace', outgoing: b.outgoing });
  addChild(w, page);
  w.answers.push({ op: 'replace', value: 'done' });
}

/**
 * The top page's Pop asks (`back` :1041-1083), when the stack pushed that page and it is still there. The page below comes back, the
 * node that pushed the top page hears the action and results, the page below is named — a page the Components list no longer has
 * throws there, and the Pop's asking ends unanswered (row C111) — and the transition plays back.
 */
function back(w: Work, v: Req): void {
  const s = w.st;
  const top = s.stack[s.stack.length - 1];
  if (!top || !top.pushed || s.deleted.includes(top.page)) return;
  if (s.stack.length <= 1) return void w.answers.push({ op: 'back', value: 'unchanged' });
  if (s.running) return void w.answers.push({ op: 'back', value: 'failure', error: 'pop-component-stack/transition-in-progress' });
  addChild(w, top.from as number, 0);
  w.answers.push(v.action === undefined ? { op: 'returned', results: v.results ?? {} } : { op: 'returned', action: v.action, results: v.results ?? {} });
  const below = findPage(s, s.stack[s.stack.length - 2].pageId);
  if (below === THROWS || below === undefined) return;
  outputs(w, below.label, s.stack.length - 1);
  startTransition(w, top.tr, { kind: 'back', page: top.page });
  w.answers.push({ op: 'back', value: 'done' });
}
