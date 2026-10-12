/**
 * The interpreted runtime as a target (phase 107, NSP-002 §2.2).
 *
 * Implements `TargetAdapter` from `@nodegx/node-spec` over a real `NoodlRuntime`, so that a node
 * spec's scenario can be played on the runtime and its trace compared line by line with the spec
 * interpreter's. It lives HERE, in the runtime's test tree, for the reason
 * `nodegx-core-parity.test.ts` gives: this is where the runtime compiles headlessly, and the spec
 * package must depend on nothing in the runtime (R1 (a)).
 *
 * Mount by type name (AC1): a `NoodlRuntime` is constructed, which runs `registerNodes` — the
 * runtime's own registration list — so `mount('Counter')` reaches the same definition the
 * viewer and the cloud runner reach, and no list is kept here. `types()` says what is mountable.
 *
 * How the runtime's behaviour is mapped onto the trace format (trace.ts / adapter.ts):
 *
 *   - **values**: `sendValue` (which `flagOutputDirty` and `flagAllOutputsDirty` go through) is
 *     intercepted and the value snapshotted canonically at send time — what a WIRE would carry.
 *     At `settle` the LAST value sent per output in the frame is recorded if it changed since the
 *     last settle, sorted by port name. Reading getters at settle instead would hide the defect
 *     class "state moved but nothing told downstream"; sends are what downstream sees.
 *   - **the first settle** also reads every value output's getter that nothing sent, because a
 *     graph connection made before the first frame delivers the getter's current value
 *     (`connectInput`, node.ts) — that is how a Counter with no Start Value publishes its 0.
 *   - **signals**: `sendSignalOnOutput` is intercepted, in emission order. Pulses on the four
 *     outcome ports that occur INSIDE `reportOutcome` are folded into the outcome event; a
 *     hand-rolled `sendSignalOnOutput('failure')` outside one is an ordinary signal event.
 *   - **outcomes**: `beginOutcome` is intercepted to stamp the invoking input's name on the token
 *     (the trace's `port` is the INPUT), `reportOutcome` to record `{ t: 'outcome' }` once per
 *     token with the outcome the runtime actually settled on (after `Treat Unchanged as`).
 *     `completed` is never recorded (schema decision). A `failure` carries its error CODE.
 *   - **stimulus** goes through `setInputValue` directly — the node-harness's own shape — not
 *     through the input queue. So two graph-level behaviours are deliberately NOT reproduced
 *     here and belong to NSP-008: C8 first-update consolidation of queued values, and
 *     nodescope's `inputPriority` / `runOnChange-` parameter ordering.
 *   - **settle** is one frame exactly as `_doUpdate` runs it (`currentFrameTime` from the clock,
 *     `frameStart`, `context.update()` — C5's drain and then the TIMER PASS — `frameEnd`), a
 *     microtask and a macrotask yield for the async nodes, and one more DRAIN (`frameStart`,
 *     `updateDirtyNodes()`, `frameEnd` — no timer pass) — the viewer's shape: an async
 *     completion schedules a NEW frame. The second half is a drain and not a frame on purpose
 *     (NSP-007): a settle is ONE tick of the scheduler's clock, the way the spec reads it, so a
 *     Delay of Duration 0 shows `Started` in one settle and `Finished` in the next, as it does in
 *     the app across two animation frames. `settle()` is the target's, so every mounted instance
 *     is flushed on each call.
 *   - **the world** (NSP-007): `install(world)` makes the platform clock the world's
 *     (`getCurrentTime`), installs the world's globals (`setTimeout`, `fetch`, `crypto`,
 *     `Math.random`, `Date.now` — world.ts `installWorld`) and attributes every request the world
 *     sees to the node whose `update()` is running (an HTTP Request fetches from its after-inputs
 *     callback, inside its update). `advance(h, ms)` yields to the event loop (what the world
 *     already delivered lands), then moves the clock. A `request` event is recorded in the frame
 *     it was issued in, after the outcomes.
 *   - **runtime errors** raised on a mounted node are kept on its handle (`errors`), outside the
 *     trace: the trace is behaviour on the wire; the error channel is the runner's to read.
 *   - **log lines** (`net.noodl.Log`, NSP-011): the scope carries a `runContext.log` sink, the one
 *     the cloud runner attaches (log.ts :175-179), so a Log node's line lands on its handle
 *     (`logs`) instead of the console — an effect kept beside the trace until NSP-007 routes it
 *     through the world. Checked, not ignored (NSP-011 §3).
 *   - **the scope**: a node in a graph has a `NodeScope`; five runtime-provided picker nodes read
 *     it at mount (`nodeScope.modelScope || Model` — Variable, Set Variable, Component Object,
 *     User, Query Records). A lone node gets the scope a browser app's root component has: no
 *     model scope (so the global `Model`), and a component owner named after the handle. What a
 *     scope MEANS for behaviour is NSP-008's (the graph); this only lets the node construct.
 *   - **the registry** (NSP-012): the runtime's records and arrays are two PROCESS-WIDE tables
 *     (`Model._models`, `Collection._collections`), so `install(world)` empties both for the play
 *     and seeds them from the world's script — the one registry per play that registry.ts
 *     promises; the anonymous (weak) tiers cannot be emptied from here and need not be: nothing
 *     a play mints is named by a later one. A derived OUTPUT the spec declares for the params
 *     (`derived.outputs`) is registered at mount (`registerOutputIfNeeded`), as a graph wiring it
 *     would make the runtime do — a lone node here has every port its params derive. The node is
 *     handed a graph `model` holding its mount params, the one thing two Object nodes read from
 *     the graph rather than from an input (modelcrudbase.ts :461), and a component owner with an
 *     empty root list so the "From repeater" walk (foreachitem.ts) misses and says so, as it does
 *     for a node outside any Repeater, instead of throwing inside a scheduled callback.
 *   - **graphs** (NSP-008): `mountGraph` mounts every node as `mount` does and then makes every
 *     wire with `connectInput` — the runtime's own connection, so the wire's seed (C11), the
 *     per-port input queues (C2, C7), the first-update consolidation (C8) and the breakers (C9)
 *     are all the runtime's; nothing is reproduced here. Stimulus still goes through
 *     `setInputValue` directly; what travels BETWEEN nodes goes through the queues. `connect` is
 *     the same call made later — a scenario's `wire` step. After every node is mounted and every
 *     wire made, each node's `nodeScopeDidInitialize` runs in declaration order — the hook
 *     `NodeScope.setComponentModel` runs once a component's whole graph is in place (nodescope.ts
 *     :487-490), which is how a Global Store left on its defaults attaches at all.
 *   - **the component tree** (NSP-012, graph.ts COMPONENTS): a graph that declares `components`
 *     gets one real `NodeScope` per component instance and one for the root; a child instance is
 *     placed inside its parent's scope the way a loaded app places it — as an entry of the scope's
 *     `nodes` and as a child of a visual node of that scope (a `node-spec/host` entry standing for
 *     the Group it would hang under), and its name is a registered component model — so Send
 *     Event's `parent` / `children` / `siblings` walk (nodescope.ts `sendEventFromThisScope`) and
 *     the "From repeater" scope chain (componentwalk.ts) run unchanged over it. A component's
 *     `item` is `Model.get(id)` from the seeded registry, hung on the instance as `_forEachModel`,
 *     exactly as a Repeater or Run Tasks hangs it (runtasks.ts :407-408).
 *   - **the boundary** (NSP-015, graph.ts BOUNDARY): each instance is the runtime's own
 *     `ComponentInstanceNode` (s10's was a stand-in owner); once its nodes are mounted it finds
 *     its `Component Inputs` / `Component Outputs` and registers the declared ports as
 *     `setComponentModel` does, and becomes a handle — a subject — so a wire, a step or a claim
 *     can name it. Its params are set after the wires. A component SIGNAL port crosses as the
 *     runtime carries it (`true` then `false`, sent at once) and is recorded as a `signal` event,
 *     on the instance's signal outputs and on the matching `Component Inputs` outputs.
 *   - **definitions** (NSP-015, graph.ts DEFINITIONS): a component a node instantiates ITSELF by
 *     name (Run Tasks' template) is registered as a real `ComponentModel` from export data, so the
 *     runtime builds every instance with its own `setComponentModel`; the context's graph model
 *     gets the empty `variants` list a loaded project always has.
 *   - **the Component Stacks** (NSP-015 s18, world.ts STACK): `install` gives the play a FRESH real
 *     `NavigationHandler` (its `instance` is a process-wide static, and its queue of what no stack took
 *     would outlive the play), records each push / replace at the handler as handed, and registers a
 *     stand-in stack per scripted name that answers by the script — `unchanged` / a failure inside the
 *     call, `done` a microtask later, as a real stack does after building the page. A Pop Component
 *     Stack mounted in a play whose script puts it in a pushed page gets the world's back callback, as
 *     the stack installs its own on every one in the page it builds (navigation-stack.tsx :981-991).
 *   - **the three process-wide managers** behind the store, history and action nodes
 *     (`globalStoreManager`, `stateHistoryManager`, `actionRegistry`) are reset at `install` like
 *     the registry tables, and the history manager's clock becomes the world's — one play, one
 *     store, one history, one allow-list.
 *   - **the backends** (NSP-014 s21, world.ts BACKEND, R9): the record nodes' REAL `CloudStore` and the REAL
 *     resolution (`CloudStore.forBackend` → resolveBackend.pure.ts) — the project's `backendServices` are the
 *     script's ids, converged (`version: 2`, the first active), each typed `directus` so it resolves to the REST
 *     adapter and takes the NEUTRAL filter, and no `cloudservices` endpoint (the legacy store is not a world the
 *     seam plays). Only the WIRE is stood in: `RestDataAdapter`'s operation methods (`BACKEND_OPS`) become the
 *     world's — the call recorded as handed (`handle.id`, the options without callbacks), the scripted answer
 *     delivered a microtask after its moment (an adapter's callbacks run from a promise), and after a success
 *     the contract's event emitted as the adapter emits it (RestDataAdapter.ts :1216-1219). The per-backend
 *     stores are dropped at `install` (`CloudStore.invalidateBackends`): they are process-wide. (s22) A failure's
 *     `detail` is handed on as the contract's second argument; the signed-in user (USER) is written into the legacy
 *     store's session, where the access rules read it (`installUser`). (s24) A write made elsewhere (`events`) goes
 *     through the REAL `_fromJSON` and then the REAL store of its backend (`emitAdapterEvent`), so a Query Records'
 *     own subscription is what hears it.
 *   - **the file dialog** (NSP-014 s31, world.ts PICKER): `installWorld` gives a play whose script has a picker the
 *     world's `document`, so Open File Picker's `initialize` makes the WORLD's file input; a click is attributed to the
 *     node whose `_internal.inputElement` it is (the click is made inside the node's own Open, but a pulse over a wire
 *     reaches it in another node's update, so neither the async context nor `inUpdate` names it).
 *   - **the cloud services** (NSP-014 s32, world.ts PROJECT `cloudServices`; NETWORK's XHR face): the project's
 *     `cloudservices` metadata is the script's for the play and the session for its app id is in the play's storage
 *     (`installBackend`); `installWorld` gives every play the world's `XMLHttpRequest` beside its `fetch`, so Cloud
 *     Function's request is the world's and is attributed like any other (the after-inputs callback runs in its update).
 *   - **the WebSockets** (NSP-014 s34, world.ts SOCKET): `installWorld` gives every play the world's `WebSocket` (Node 22's own
 *     would reach a real network) and no `EventSource`; a construction is attributed to the node updating or being pulsed, or
 *     the only one mounted, and every later call on that socket to the same node (`recordSocket`).
 *   - **the realtime subscriptions** (NSP-014 s33, world.ts REALTIME, R9): `createRealtimeSubscription` (the realtime
 *     module's export, which Subscribe To Changes calls through the module object at each reconfigure) becomes the world's
 *     `subscribe` for the play — the options without their three callbacks recorded as handed, what the world's handle
 *     tells handed to the node's `onStatus` / `onEvent` / `onError`, the handle itself (`status`, `dispose`) the node's.
 *     The transports and `RealtimeSubscription` under it are the backend layer's, not played. `realtimeSupportFor` stays
 *     the real one: every play's backend is a `directus` one, which it calls supported.
 */

import { AsyncLocalStorage } from 'async_hooks';
import { File as NodeFile } from 'buffer';

import type { NodeInstance, NodeMetadata, OutcomeFailureOptions, OutcomeToken, RuntimeErrorEventLike } from '@noodl/types';

import type { RuntimeNode } from '../../src/internal';
import type { BackendCall, ComponentDecl, ComponentDefinition, GraphNodeDecl, GraphTarget, Handle, LocationCall, PlayContext, RequestRecord, StackAnswer, TraceEvent, Wire, World } from '../../../nodegx-node-spec/src';
import { parseEndpoint, playContextOf, playOutputs, REPEATER_TEMPLATES, ROUTER_PAGES, specFor, type WorldLocation } from '../../../nodegx-node-spec/src';
import { AUTH_OPS, backendEvent, canonicalise, hostEvent, invocationEvent, fileError, installWorld, isFileOp, locationEvent, OUTCOME_PORTS, OWN_ELEMENT, performRegistryWrite, SELF_REFERENCE, type BackendDelivery, type HostCall, type RegistryTables } from '../../../nodegx-node-spec/src';

import NoodlRuntime = require('../../noodl-runtime');
import NodeDefinition = require('../../src/nodedefinition');
import Model = require('../../src/model');
import Collection = require('../../src/collection');
import NodeScope = require('../../src/nodescope');
import ComponentInstanceNode = require('../../src/nodes/componentinstance');
import ComponentModel = require('../../src/models/componentmodel');
import Node = require('../../src/node');

import { globalStoreManager } from '../../src/nodes/std-library/agent/globalstore';
import { stateHistoryManager } from '../../src/nodes/std-library/agent/statehistory';
import { actionRegistry } from '../../src/nodes/std-library/agent/action-dispatcher';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { FocusTracker } = require('../../../noodl-viewer-react/src/focus-tracker') as typeof import('../../../noodl-viewer-react/src/focus-tracker');

// ---------------------------------------------------------------------------------------------
// PERSON (NSP-016 s37; spec.ts THE PERSON) — a visual node on a PAGE, acted on by a person.
//
// The node's REAL React component is rendered (react-dom, `createRoot`, inside React's `act`) into a
// jsdom document — the page — and an act is the DOM events a browser raises for it on the element a
// person sees, dispatched there: a `click` is `mousedown`, `mouseup`, `click`; a `press` is a
// `mousedown` and then the browser's default action of one, the keyboard going onto the pressed
// `<button>` unless the handler cancelled it; a `focus` is `element.focus()`, which jsdom answers by
// the standard's focusing steps (a disabled control is not a focusable area). The component's own
// rules — a disabled button takes no click (React drops it), a Keeps Focus button keeps the keyboard
// (it cancels the mousedown) — are what is graded; nothing here copies one. What the page gives the
// app beside the component is stood in as the app gives it: the viewer's focus tracker on the
// context (viewer.jsx :207-214) and its root's click capture (:457), and a holder for the lone node
// — what `getVisualParentNode` reads of the root Group: the layout it lays children out in and the
// `forceUpdate` a Mounted change asks of it (react-component-node.ts :2310-2320). An act happens on
// a PAINTED page: the holder re-renders before the events are dispatched, as a browser paints before
// a person can act (a value set in the same frame has reached the element). Three things jsdom
// lacks that a browser has and no wire can see are given: `scrollIntoView` (a no-op) and nothing
// else yet. The page's globals (`window`, `document`, …) are on the host only while a page node is
// mounted — `installWorld` (world.ts) reads whether there is a window at `install`, before any mount,
// and a `viewport` play must still find none — and React itself is loaded with them present, once.
// ---------------------------------------------------------------------------------------------

interface Dom {
  window: any;
  document: any;
  React: any;
  act: (cb: () => void | Promise<void>) => Promise<void>;
  createRoot: (container: unknown) => { render(el: unknown): void; unmount(): void };
  globals: Record<string, unknown>;
}
let dom: Dom | undefined;
let domInstalled: (() => void) | undefined;
/** NSP-016 s43 — the element the last pointer act landed on (`personActs`): what `document.elementFromPoint` answers. One play's. */
let pointerAt: any = null;
/**
 * NSP-016 s50 — a drag from the desktop (the `fileEnter` / `fileLeave` / `fileDrop` acts): the files it carries and the element the
 * browser has as its target (`over`; null before the first act puts it anywhere). One play's.
 */
let fileDrag: { files: unknown[]; over: any } | undefined;
/**
 * NSP-016 s55 — the element a finger went down on (the `pressAt` act `by: 'touch'`): a browser sends that touch's moves and its end
 * to the element it started on, wherever the finger goes. One play's.
 */
let touchAt: any = null;

// ---------------------------------------------------------------------------------------------
// THE MEDIA ELEMENT (NSP-016 s54, the Video). jsdom has no media engine: `play()`, `pause()` and `load()` report "not
// implemented" and do nothing, there is no `srcObject`, and nothing ever loads. So the face is the browser's media element,
// after the HTML standard's media elements section, reduced to what a node or a person can see (video.ts says the same):
//   - a LOAD (the media element load algorithm) runs when the `src` attribute is set or changed — not when it is removed — and
//     when `srcObject` is set: the play() promises still pending are rejected (AbortError), the element is paused (no event),
//     its position goes to 0 (`timeupdate` when it moved), it is no longer ready nor failed, it may autoplay again, and it
//     loads when it has a source (a `src` attribute that is not empty, or a `srcObject`);
//   - the browser's side of a load is three acts: `loaded` (enough has loaded to play — the video's size, `canplay`, the pending
//     play() promises resolve, and an autoplaying element that is allowed to play starts: `play`) and `failed` (the source cannot
//     be played — a MediaError of code 4 with the act's message, `error`, then the pending promises rejected, NotSupportedError),
//     each only while a load is under way; and, while the element plays, `progress` (playback reaches the act's second:
//     `timeupdate`) and `ended` (playback reaches the end, MEDIA_END: Loop on seeks to 0 and plays on, `timeupdate`; else
//     `timeupdate`, paused with `pause`, the pending promises rejected, then `ended`);
//   - `play()`: rejected NotAllowedError when the element may not play (THE AUTOPLAY POLICY), then NotSupportedError after a
//     failed load; else a promise that resolves once the element is ready. An element at its end goes back to 0 (`timeupdate`),
//     a paused one starts (`play`);
//   - `pause()`: a playing element pauses (`timeupdate`, `pause`) and its pending promises are rejected (AbortError);
//   - `currentTime =`: on a ready element a seek (`timeupdate`); on one that is not, nothing to see;
//   - THE AUTOPLAY POLICY (Chromium's): an element may play while it is muted, or once the page has had a person's activation —
//     a mouse button down, a key other than Escape, a finger lifted (HTML's activation-triggering input events), heard on the
//     window. One play's;
//   - `srcObject`: null until set; WebIDL `MediaProvider?` — nothing becomes null, a value that is not a MediaStream, a
//     MediaSource or a Blob is a TypeError.
// Every event a call queues is a media element TASK: it fires after the caller's code (a microtask here, which the settle's
// yield reaches), in the order queued. Face choices, written down: the browser's own controls are not an act (Controls draws
// them; nothing here clicks them); a load that has loaded never fails or stalls afterwards; the End Time fragment's stop is not
// an act (`ended` is the video's end); an element unmuted without an activation plays on (Chromium pauses it); a removed
// element's pending promises are never settled (a browser rejects them, AbortError — silent either way).
// ---------------------------------------------------------------------------------------------

/** NSP-016 s54 — where the video ends, in seconds (the `ended` act puts Playback Position there). */
const MEDIA_END = 60;
/** NSP-016 s54 — the page has had a person's activation (THE MEDIA ELEMENT above). One play's. */
let activated = false;
/**
 * NSP-016 s54 — a media element queued work (a task, a settled play() promise) since the event loop last turned. A person's act is a
 * new task: it comes after that work, as in a browser, so `act` lets the loop turn first — only then, so a page with no media element
 * acts exactly as before.
 */
let mediaWork = false;

interface MediaState {
  paused: boolean;
  position: number;
  /** `readyState` at HAVE_FUTURE_DATA or more: `canplay` has fired since the last load */
  ready: boolean;
  /** a load with a source is under way: neither loaded nor failed */
  loading: boolean;
  /** the failed load's MediaError message (code 4), or none */
  failed: string | undefined;
  pending: Array<{ resolve(): void; reject(e: unknown): void }>;
  canAutoplay: boolean;
  /** playback has ended (forwards, no Loop) */
  atEnd: boolean;
  width: number;
  height: number;
  srcObject: unknown;
}
const mediaStates = new WeakMap<object, MediaState>();

function mediaOf(el: any): MediaState {
  let m = mediaStates.get(el);
  if (!m) {
    m = { paused: true, position: 0, ready: false, loading: false, failed: undefined, pending: [], canAutoplay: true, atEnd: false, width: 0, height: 0, srcObject: null };
    mediaStates.set(el, m);
  }
  return m;
}

/**
 * NSP-016 s54 — a value that is the node's own element (a Video's DOM Element): what a wire from it carries is the element, which no
 * trace can hold, so it is recorded as video.ts's `OWN_ELEMENT`, as the node's reference to itself is recorded as `SELF_REFERENCE`.
 */
function isOwnElement(node: unknown, value: unknown): boolean {
  if (!value || typeof value !== 'object' || (value as { nodeType?: unknown }).nodeType !== 1) return false;
  const n = node as { getDOMElement?(): unknown };
  return typeof n.getDOMElement === 'function' && n.getDOMElement() === value;
}

/** THE MEDIA ELEMENT (above) on jsdom's prototypes, once per process. */
function installMedia(w: any): void {
  const task = (fn: () => void) => {
    mediaWork = true;
    void Promise.resolve().then(fn);
  };
  const fire = (el: any, type: string) => el.dispatchEvent(new w.Event(type));
  const exception = (message: string, name: string) => new w.DOMException(message, name);
  const hasSource = (el: any, m: MediaState) => !!el.getAttribute('src') || m.srcObject !== null;
  const take = (m: MediaState) => {
    const p = m.pending;
    m.pending = [];
    return p;
  };
  const notifyPlaying = (el: any, m: MediaState) => {
    const p = take(m);
    task(() => {
      fire(el, 'playing');
      for (const x of p) x.resolve();
    });
  };
  const load = (el: any) => {
    const m = mediaOf(el);
    for (const x of take(m)) x.reject(exception('The play() request was interrupted by a new load request.', 'AbortError'));
    m.paused = true;
    if (m.position !== 0) {
      m.position = 0;
      task(() => fire(el, 'timeupdate'));
    }
    Object.assign(m, { ready: false, failed: undefined, canAutoplay: true, atEnd: false, width: 0, height: 0 });
    m.loading = hasSource(el, m);
  };
  const P = w.HTMLMediaElement.prototype;
  const setAttribute = w.Element.prototype.setAttribute;
  P.setAttribute = function (this: any, name: string, value: unknown) {
    setAttribute.call(this, name, value);
    if (String(name).toLowerCase() === 'src') load(this);
  };
  const define = (proto: any, name: string, get: (this: any) => unknown, set?: (this: any, v: unknown) => void) =>
    Object.defineProperty(proto, name, { configurable: true, enumerable: true, get, ...(set ? { set } : {}) });
  define(P, 'paused', function () {
    return mediaOf(this).paused;
  });
  define(P, 'readyState', function () {
    return mediaOf(this).ready ? 4 : 0;
  });
  define(P, 'error', function () {
    const m = mediaOf(this);
    return m.failed === undefined ? null : { code: 4, message: m.failed };
  });
  define(
    P,
    'currentTime',
    function () {
      return mediaOf(this).position;
    },
    function (v) {
      const m = mediaOf(this);
      if (!m.ready) return;
      m.position = Number(v);
      m.atEnd = false;
      task(() => fire(this, 'timeupdate'));
    }
  );
  define(
    P,
    'srcObject',
    function () {
      return mediaOf(this).srcObject;
    },
    function (v) {
      if (v !== null && v !== undefined && !(v instanceof w.Blob)) {
        throw new TypeError("Failed to set the 'srcObject' property on 'HTMLMediaElement': The provided value is not of type '(MediaSourceHandle or MediaStream or MediaSource or Blob)'.");
      }
      mediaOf(this).srcObject = v ?? null;
      load(this);
    }
  );
  define(w.HTMLVideoElement.prototype, 'videoWidth', function () {
    return mediaOf(this).width;
  });
  define(w.HTMLVideoElement.prototype, 'videoHeight', function () {
    return mediaOf(this).height;
  });
  P.play = function (this: any) {
    const m = mediaOf(this);
    mediaWork = true;
    if (!this.muted && !activated) return Promise.reject(exception("play() failed because the user didn't interact with the document first.", 'NotAllowedError'));
    if (m.failed !== undefined) return Promise.reject(exception('The element has no supported sources.', 'NotSupportedError'));
    const p = new Promise<void>((resolve, reject) => m.pending.push({ resolve, reject }));
    if (m.atEnd) {
      m.atEnd = false;
      m.position = 0;
      task(() => fire(this, 'timeupdate'));
    }
    if (m.paused) {
      m.paused = false;
      task(() => fire(this, 'play'));
    }
    if (m.ready) notifyPlaying(this, m);
    m.canAutoplay = false;
    return p;
  };
  P.pause = function (this: any) {
    const m = mediaOf(this);
    m.canAutoplay = false;
    if (m.paused) return;
    m.paused = true;
    const p = take(m);
    task(() => {
      fire(this, 'timeupdate');
      fire(this, 'pause');
      for (const x of p) x.reject(exception('The play() request was interrupted by a call to pause().', 'AbortError'));
    });
  };
  P.load = function (this: any) {
    load(this);
  };
  // HTML's activation-triggering input events (THE AUTOPLAY POLICY), on the window for every play; `activated` is one play's
  w.addEventListener('mousedown', () => (activated = true), true);
  w.addEventListener('touchend', () => (activated = true), true);
  w.addEventListener('keydown', (e: { key?: string }) => e.key !== 'Escape' && (activated = true), true);
  w.addEventListener('pointerdown', (e: { pointerType?: string }) => e.pointerType === 'mouse' && (activated = true), true);
  w.addEventListener('pointerup', (e: { pointerType?: string }) => e.pointerType !== 'mouse' && (activated = true), true);
}

/**
 * THE MEDIA ELEMENT (above) — the browser's side of a load, and of playback, on the node's `<video>` (video.ts's acts). Nothing on
 * any other element: an embed's `<iframe>` reports nothing back.
 */
function mediaAct(w: any, el: any, act: string, value: unknown): void {
  if (!el || el.tagName !== 'VIDEO') return;
  const m = mediaOf(el);
  const fire = (type: string) => el.dispatchEvent(new w.Event(type));
  const settleAll = (fn: (x: MediaState['pending'][number]) => void) => {
    const p = m.pending;
    m.pending = [];
    for (const x of p) fn(x);
  };
  if (act === 'loaded') {
    if (!m.loading) return;
    const size = (value ?? {}) as { width?: number; height?: number };
    const wasPlaying = !m.paused;
    // the readyState change decides autoplay before the `canplay` it queues fires (HTML: "eligible for autoplay")
    const autoplays = !wasPlaying && m.canAutoplay && !!el.autoplay && (!!el.muted || activated);
    Object.assign(m, { loading: false, ready: true, width: Number(size.width ?? 0), height: Number(size.height ?? 0) });
    if (autoplays) m.paused = false;
    fire('canplay');
    if (wasPlaying || autoplays) {
      if (autoplays) void Promise.resolve().then(() => fire('play'));
      const p = m.pending;
      m.pending = [];
      void Promise.resolve().then(() => {
        fire('playing');
        for (const x of p) x.resolve();
      });
    }
    return;
  }
  if (act === 'failed') {
    if (!m.loading) return;
    m.loading = false;
    m.failed = String(value ?? '');
    fire('error');
    settleAll((x) => x.reject(new w.DOMException('The element has no supported sources.', 'NotSupportedError')));
    return;
  }
  if (!m.ready || m.paused) return;
  if (act === 'progress') {
    m.position = Number(value);
    fire('timeupdate');
    return;
  }
  // ended
  if (el.loop) {
    m.position = 0;
    fire('timeupdate');
    return;
  }
  m.position = MEDIA_END;
  m.atEnd = true;
  fire('timeupdate');
  m.paused = true;
  fire('pause');
  settleAll((x) => x.reject(new w.DOMException('The play() request was interrupted because playback ended.', 'AbortError')));
  fire('ended');
}

/** The page, made once for the process; React loaded with its globals present (react-dom reads `window` at load), outside any play. */
function ensureDom(): Dom {
  if (dom) return dom;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { JSDOM } = require('jsdom') as { JSDOM: new (html: string, options?: unknown) => any };
  const page = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true });
  const w = page.window;
  // a browser scrolls; jsdom has no `scrollIntoView`, and nothing a trace can see follows from one
  w.Element.prototype.scrollIntoView = () => undefined;
  // NSP-016 s43 — a browser gives the keyboard only to an element a person can see: `visibility: hidden` (inherited) is not a
  // focusable area (Chromium `Element::IsFocusableStyle`; Firefox the same), so `focus()` on one does nothing. jsdom focuses it.
  // The rule is the browser's, kept for every caller — a person's Tab and a node's own Focus action alike. (What jsdom still
  // lacks is the focus FIXUP: an element that becomes hidden while it holds the keyboard keeps it, as a disabled one does.)
  const focus = w.HTMLElement.prototype.focus;
  w.HTMLElement.prototype.focus = function (this: any, ...args: unknown[]) {
    if (this.isConnected && w.getComputedStyle(this).visibility !== 'visible') return;
    return focus.apply(this, args);
  };
  // NSP-016 s43 — jsdom has no `elementFromPoint` (no geometry): the element under the pointer is the one the last pointer act
  // landed on (`pointerAt`, PERSON's hit test), while it is on the page
  w.document.elementFromPoint = () => (pointerAt && pointerAt.isConnected ? pointerAt : null);
  // NSP-016 s54 — THE MEDIA ELEMENT (above)
  installMedia(w);
  const globals: Record<string, unknown> = {
    window: w,
    document: w.document,
    navigator: w.navigator,
    HTMLElement: w.HTMLElement,
    Element: w.Element,
    Node: w.Node,
    Event: w.Event,
    MouseEvent: w.MouseEvent,
    KeyboardEvent: w.KeyboardEvent,
    FocusEvent: w.FocusEvent,
    TouchEvent: w.TouchEvent,
    // NSP-016 s43 — drag-drop.ts calls these bare (`axisOf`, `slots`, `currentShift`, `restingRect`); a browser has them on the global
    getComputedStyle: w.getComputedStyle.bind(w),
    DOMRect: w.DOMRect,
    requestAnimationFrame: w.requestAnimationFrame,
    cancelAnimationFrame: w.cancelAnimationFrame
  };
  const restore = installGlobals(globals);
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const React = require('react');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const client = require('react-dom/client') as { createRoot: Dom['createRoot'] };
    dom = { window: w, document: w.document, React, act: React.act, createRoot: client.createRoot, globals };
  } finally {
    restore();
  }
  return dom;
}

/** Puts the page's globals on the host; returns what takes them off again, restoring what was there. */
function installGlobals(globals: Record<string, unknown>): () => void {
  const g = globalThis as Record<string, unknown>;
  const saved = new Map<string, PropertyDescriptor | undefined>();
  for (const [k, v] of Object.entries(globals)) {
    saved.set(k, Object.getOwnPropertyDescriptor(g, k));
    Object.defineProperty(g, k, { value: v, configurable: true, writable: true, enumerable: true });
  }
  const savedAct = g.IS_REACT_ACT_ENVIRONMENT;
  g.IS_REACT_ACT_ENVIRONMENT = true;
  return () => {
    for (const [k, d] of saved) {
      if (d) Object.defineProperty(g, k, d);
      else delete g[k];
    }
    g.IS_REACT_ACT_ENVIRONMENT = savedAct;
  };
}

/**
 * Puts the page on the host (`installGlobals`) for a play. NSP-016 s43 — a play with a world has a FRAME clock: the world's
 * `requestAnimationFrame` (`installPopups`: the next frame's start). The page keeps it, on the host AND on jsdom's `window` —
 * jsdom's own (`pretendToBeVisual`) fires on WALL-CLOCK time, so a callback a node asked for "next frame" (drag-drop.ts
 * `whenMounted`, which calls `window.requestAnimationFrame`) ran whenever the event loop got there: before the next settle in
 * one play, not in another.
 */
function installPage(location?: WorldLocation): () => void {
  const d = ensureDom();
  pointerAt = null;
  fileDrag = undefined;
  touchAt = null;
  activated = false;
  // the window outlives the play (one page per process): a listener the play's page left on it — drag-drop.ts `swallowNextClick`
  // takes its own off with a `setTimeout(0)` on the WORLD's clock, which a play that ends first never turns — ate a click in a
  // LATER play. What the play added comes off with its page.
  const added: Array<[string, unknown, unknown]> = [];
  const add = d.window.addEventListener;
  // NSP-016 s57 — THE LOCATION ON THE PAGE (world.ts LOCATION): in a play whose world has a location, the page's window IS the
  // browser that location is — its `history.pushState`, `open`, a `popstate` / `hashchange` dispatched on it and the listeners for
  // them are the world's. (`window.location` is jsdom's `about:blank` and cannot be replaced — [Unforgeable]; the page's bare
  // `location`, `history` and `dispatchEvent` are the world's already, `installWorld`'s.)
  const worldEvents = new Map<string, Map<unknown, () => void>>();
  const isLocationEvent = (type: string) => !!location && (type === 'popstate' || type === 'hashchange');
  d.window.addEventListener = function (this: unknown, type: string, fn: unknown, opts?: unknown) {
    if (isLocationEvent(type)) {
      const byFn = worldEvents.get(type) ?? new Map<unknown, () => void>();
      worldEvents.set(type, byFn);
      if (!byFn.has(fn)) byFn.set(fn, location!.listen(type, fn as (e: unknown) => void));
      return;
    }
    added.push([type, fn, opts]);
    return add.call(this, type, fn, opts);
  };
  const remove = d.window.removeEventListener;
  const dispatch = d.window.dispatchEvent;
  const history = d.window.history;
  const open = d.window.open;
  if (location) {
    d.window.removeEventListener = function (this: unknown, type: string, fn: unknown, opts?: unknown) {
      if (!isLocationEvent(type)) return remove.call(this, type, fn, opts);
      worldEvents.get(type)?.get(fn)?.();
      worldEvents.get(type)?.delete(fn);
    };
    d.window.dispatchEvent = function (this: unknown, event: { type: string }) {
      return isLocationEvent(event.type) ? location.dispatch(event) : dispatch.call(this, event);
    };
    history.pushState = (_state: unknown, _title: unknown, url?: unknown) => location.push(url);
    // NSP-016 s70 — THE SESSION HISTORY: a back's traversal lands at the play's next yield (`yieldToEventLoop`)
    history.replaceState = (_state: unknown, _title: unknown, url?: unknown) => location.replace(url);
    history.back = () => location.back();
    d.window.open = (url: unknown, target: unknown, features: unknown) => location.open(url, target, features);
  }
  const leave = () => {
    d.window.addEventListener = add;
    for (const [type, fn, opts] of added) d.window.removeEventListener(type, fn, opts);
    if (location) {
      for (const byFn of worldEvents.values()) for (const off of byFn.values()) off();
      d.window.removeEventListener = remove;
      d.window.dispatchEvent = dispatch;
      delete (history as { pushState?: unknown }).pushState;
      delete (history as { replaceState?: unknown }).replaceState;
      delete (history as { back?: unknown }).back;
      d.window.open = open;
    }
  };
  const g = globalThis as { requestAnimationFrame?: unknown };
  const frame = g.requestAnimationFrame;
  if (!frame) {
    const restoreGlobals = installGlobals(d.globals);
    return () => {
      restoreGlobals();
      leave();
    };
  }
  const own = d.window.requestAnimationFrame;
  d.window.requestAnimationFrame = frame;
  const restore = installGlobals({ ...d.globals, requestAnimationFrame: frame });
  return () => {
    restore();
    d.window.requestAnimationFrame = own;
    leave();
  };
}

/** One node on the page (PERSON above). */
interface Page {
  container: any;
  root: { render(el: unknown): void; unmount(): void };
  /** The holder's React instance — re-rendered for a paint, and by the node's Mounted (the stand-in parent's `forceUpdate`). */
  host: { forceUpdate(): void } | null;
  /**
   * NSP-016 s42 — the node's CHILDREN on the page, when its spec says the page holds some (a Radio Button Group's buttons,
   * radiobuttongroup.ts THE FIRST VISUAL WITH CHILDREN): real nodes added with the node's own `addChild`, not subjects — each
   * with the Value it was made with, which is how a `pick` finds it. Deleted with the page.
   */
  children?: Array<{ node: RuntimeNode; value: unknown }>;
  /**
   * NSP-016 s42 — the Radio Button Group the node sits in (world.ts GROUP), when its spec needs `group` and the script has one:
   * a real node, holding the node and its siblings (`children`); the page renders IT. Deleted with the page.
   */
  group?: RuntimeNode & { cachedChildren?: unknown };
  /**
   * NSP-016 s51 — the Draggable cards beside the node, when its spec's `grab` act names some (text.ts THE ZONE SIDE): each a real
   * Text in the node's scope, in its own container after the node's, with the Drag Value and Drag Kind it was made with — which
   * is how a `grab` or a `pickUp` finds it. Deleted with the page.
   */
  cards?: Array<{ node: RuntimeNode; value: unknown; root: { unmount(): void }; container: any }>;
  /** NSP-016 s56 — the components a Component Stack's page registered (`STACK_PAGES`), removed with the page. */
  models?: string[];
  /** NSP-016 s56 — puts jsdom's `performance.now` back: a Component Stack's page runs on the world's clock. */
  restoreClock?: () => void;
  /** NSP-016 s57 — puts the runtime's page index back: a Page Router's page reads the play's project. */
  restoreIndex?: () => void;
  /** NSP-016 s60 — THE LAYOUT a Columns page has (`layOut` below): the container's width and what observes it. Gone with the page. */
  layout?: Layout;
}

/**
 * NSP-016 s60 — THE LAYOUT (columns.ts THE WIDTH). jsdom lays nothing out and has no `ResizeObserver`; on a Columns page the face is
 * the browser's layout for one number — the width the Columns container is laid out at — and the observer that reports it. Face
 * choices, written down: the page starts `START_WIDTH` wide; the container's `offsetWidth` is that width; an observation reports when it
 * starts (in a browser the container has a height, so its first observation always reports) and then whenever the width differs from
 * the one it last reported; a report is delivered at the browser's next rendering step — the end of a settle, or a `resize` act.
 */
interface Layout {
  width: number;
  observations: Array<{ observer: { callback(entries: unknown[], observer: unknown): void }; el: any; last?: number }>;
  restore(): void;
}

/** NSP-016 s60 — the width a Columns page is laid out at before any `resize` (THE LAYOUT above): a desktop window. */
const START_WIDTH = 1024;

/** NSP-016 s56 — the components a Component Stack can build in a play (navigation-stack.ts THE PAGES), each holding one Pop Component Stack. */
const STACK_PAGES = ['Home', 'Detail', 'Settings'] as const;

// eslint-disable-next-line @typescript-eslint/no-require-imports
const NodeModel = require('../../src/models/nodemodel') as { createFromExportData(data: unknown): unknown };

/**
 * The element a person acts on: the control itself when the node's root IS one, else the control inside it, else the
 * root (controls/utils.ts `_focusTarget`). A person sees the PAGE, not the node's bookkeeping: when the node has lost
 * its root (`getDOMElement()` null while its component is on the page — Checkbox after an Enable Label change, NSP-016
 * §7.2 C66) the face finds the control in the node's own container instead, as a person's eye would.
 */
function elementSeen(node: { getDOMElement(): any }, container?: any): any {
  const control = 'button, input, select, textarea';
  const root = node.getDOMElement();
  if (root && root.isConnected) return root.matches(control) ? root : root.querySelector(control) ?? root;
  if (!container) return null;
  return container.querySelector(control) ?? container.firstElementChild ?? null;
}

/**
 * NSP-016 s43 — the browser's hit test, without geometry: the element a pointer act on `el` lands on. An element with
 * `pointer-events: none` or `visibility: hidden` / `collapse` (both inherited, as jsdom computes them) is never under the
 * pointer; the act lands on the nearest ancestor that can be (what is behind it), else the body.
 */
function underPointer(w: any, el: any): any {
  for (let e = el; e; e = e.parentElement) {
    const cs = w.getComputedStyle(e);
    if (cs.pointerEvents !== 'none' && cs.visibility !== 'hidden' && cs.visibility !== 'collapse') return e;
  }
  return w.document.body;
}

/** The Push Component To Stack side of a request (navigation-handler.ts `StackNavigateArgs`), as a stand-in stack sees it. */
interface StackArgs {
  target?: unknown;
  params?: unknown;
  transition?: unknown;
  hasNavigated?(): void;
  hasUnchanged?(): void;
  hasFailed?(code: string, message: string): void;
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const NavigationHandler = require('../../../noodl-viewer-react/src/nodes/navigation/navigation-handler').default as {
  new (): { navigate(name: unknown, args: StackArgs): void; replace(name: unknown, args: StackArgs): void; registerPageStack(name: unknown, stack: unknown): void };
  instance: unknown;
};

/**
 * STACK (world.ts, NSP-015 s18) for one play. The handler is the viewer's REAL `NavigationHandler`,
 * a fresh one (its `instance` is process-wide, and it queues what no stack took — a queue that would
 * outlive the play), so its rules — a blank name is `Main`, a name nobody registered is queued, every
 * stack under the name is asked — run as in the app and are graded against the world's model of them.
 * The node's call is recorded at the handler, AS HANDED (`navigate` is a push); each name the script
 * registers gets a stand-in stack (`registerPageStack`, which resets it — a stand-in has no page to
 * reset) that answers by the script: `unchanged` / a failure inside the call (a real stack's checks run
 * before its first `await`, navigation-stack.tsx :916-966), `done` a microtask later (after it built the
 * page, :968-1027). Returns the undo.
 */
function installStacks(w: World, record: (e: TraceEvent) => void): () => void {
  w.stack.onCall(record);
  const saved = NavigationHandler.instance;
  const handler = new NavigationHandler();
  for (const op of ['navigate', 'replace'] as const) {
    const real = handler[op].bind(handler);
    handler[op] = (name: unknown, args: StackArgs) => {
      w.stack.record({ call: op === 'navigate' ? 'push' : 'replace', stack: name, target: args.target, params: args.params, transition: args.transition });
      real(name, args);
    };
  }
  const answer = (op: 'push' | 'replace') => (args: StackArgs) => {
    const a = w.stack.answerFor(op, args.target);
    if (a === 'done') void Promise.resolve().then(() => args.hasNavigated?.());
    else if (a === 'unchanged') (args.hasUnchanged ?? args.hasNavigated)?.();
    else args.hasFailed?.(a.failure.code, a.failure.message);
  };
  NavigationHandler.instance = handler;
  for (const name of w.stack.script.names ?? []) handler.registerPageStack(name, { navigate: answer('push'), replace: answer('replace'), reset: () => undefined });
  return () => {
    NavigationHandler.instance = saved;
  };
}

/** The Navigate side of a request (router-handler.ts `NavigateArgs`), as a stand-in router sees it. */
interface RouteArgs {
  target?: unknown;
  params?: unknown;
  openInNewTab?: unknown;
  hasNavigated?(): void;
  hasUnchanged?(): void;
  hasFailed?(code: string, message: string): void;
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const RouterHandler = require('../../../noodl-viewer-react/src/nodes/navigation/router-handler').RouterHandler as {
  new (): { navigate(name: unknown, args: RouteArgs): void; registerRouter(name: unknown, router: unknown): void };
  instance: unknown;
};

/**
 * ROUTE (world.ts, NSP-015 s19) for one play, as `installStacks` does STACK. The handler is the viewer's REAL
 * `RouterHandler`, a fresh one (its `instance` is process-wide and its queue would outlive the play), so its
 * rules — the 1 ms `setTimeout` (the world's clock: `installWorld` owns the timers), one registered name takes
 * everything, a name with no router is queued — run as in the app. The node's call is recorded at the handler,
 * AS HANDED; each name the script registers gets a stand-in router (`registerRouter`, which resets it — a
 * stand-in has no start page) that answers by the script: a failure or `unchanged` inside the call (a real
 * Router's checks run before its first `await`, router.tsx :846-895), `done` a microtask later (once it built
 * the page, :897-936). Returns the undo.
 */
function installRouters(w: World, record: (e: TraceEvent) => void): () => void {
  w.router.onCall(record);
  const saved = RouterHandler.instance;
  const handler = new RouterHandler();
  const real = handler.navigate.bind(handler);
  handler.navigate = (name: unknown, args: RouteArgs) => {
    w.router.record({ router: name, target: args.target, params: args.params, openInNewTab: args.openInNewTab });
    real(name, args);
  };
  const router = {
    navigate: (args: RouteArgs) => {
      const a = w.router.answerFor(args.target, args.openInNewTab);
      if (a === 'done') void Promise.resolve().then(() => args.hasNavigated?.());
      else if (a === 'unchanged') args.hasUnchanged?.();
      else args.hasFailed?.(a.failure.code, a.failure.message);
    },
    reset: () => undefined
  };
  RouterHandler.instance = handler;
  for (const name of w.router.script.names ?? []) handler.registerRouter(name, router);
  return () => {
    RouterHandler.instance = saved;
  };
}

/**
 * POPUP (world.ts, NSP-015 s20) — the stand-in for the viewer's popup container (`createPrimitiveNode('Group')`,
 * nodecontext.ts :1261): it takes the three inputs `showPopup` sets and keeps the popup it is handed (the rAF
 * attach, :1327-1331) as its child, so deleting it deletes the popup, as the real Group's teardown does. It
 * draws nothing; nothing a popup's opener observes reads it. NSP-016 s52: registered under its own name and handed to the popup's
 * one `createPrimitiveNode('Group')` (nodecontext.ts :1277, the only caller), so a play of the REAL Group (group.ts) is not given it.
 */
const POPUP_GROUP = 'node-spec/popup-group';
const GROUP_STAND_IN = NodeDefinition.defineNode({
  name: POPUP_GROUP,
  category: 'node-spec',
  initialize(this: { _internal: { children: unknown[] } }) {
    this._internal.children = [];
  },
  inputs: { flexDirection: { type: 'string', set: () => undefined }, cssClassName: { type: 'string', set: () => undefined }, position: { type: 'string', set: () => undefined } },
  methods: {
    addChild(this: { _internal: { children: Array<{ parent?: unknown }> } }, child: { parent?: unknown }) {
      this._internal.children.push(child);
      child.parent = this;
    },
    removeChild(this: { _internal: { children: Array<{ parent?: unknown }> } }, child: { parent?: unknown }) {
      this._internal.children = this._internal.children.filter((c) => c !== child);
      child.parent = undefined;
    },
    getChildren(this: { _internal: { children: unknown[] } }) {
      return this._internal.children.slice();
    }
  }
} as never);

// eslint-disable-next-line @typescript-eslint/no-require-imports
const CloudFileClass = require('../../src/api/cloudfile') as typeof import('../../src/api/cloudfile');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { RestDataAdapter } = require('../../src/api/backends/RestDataAdapter') as { RestDataAdapter: { prototype: Record<string, unknown> } };
// eslint-disable-next-line @typescript-eslint/no-require-imports
const CloudStore = require('../../src/api/cloudstore') as {
  invalidateBackends(scope?: unknown): void;
  invalidateCollections(): void;
  instance: { _handle(): { publicToken?: string } };
  forBackend(modelScope: unknown, backendId: string): { _adapter: { emitAdapterEvent(e: Record<string, unknown>): void } } | undefined;
  _fromJSON(item: Record<string, unknown>, collectionName: string, modelScope?: unknown): unknown;
};
// eslint-disable-next-line @typescript-eslint/no-require-imports
/** NSP-014 s33 — the realtime module, whose `createRealtimeSubscription` export a play stands in (world.ts REALTIME). */
const realtimeModule = require('../../src/api/backends/realtime') as { createRealtimeSubscription: (handle: { id: string }, options: Record<string, unknown>) => unknown };
const { parseSessionStore } = require('../../src/api/backends/SessionStore') as { parseSessionStore(appId: string | undefined): { write(session: Record<string, unknown>): void } };

/** What a backend operation's options carry back (`@noodl/backend-contract` `Callbacks`). */
interface BackendOptions extends Record<string, unknown> {
  success: (...args: unknown[]) => void;
  error: (message?: string, detail?: Record<string, unknown>) => void;
}

/**
 * The operations the world plays (world.ts BACKEND), each with what the REST adapter does on success: the
 * success callback, then the contract's event (RestDataAdapter.ts). Grows with NSP-014's batch, one operation
 * at a time, each read from the adapter before it is added.
 */
const BACKEND_OPS: Readonly<Record<string, (o: BackendOptions, ok: unknown, emit: (e: Record<string, unknown>) => void) => void>> = {
  // RestDataAdapter.ts :1202-1222 — `success()` with nothing, then `delete { objectId, collection }`
  delete: (o, _ok, emit) => {
    o.success();
    emit({ type: 'delete', objectId: o.objectId, collection: o.collection });
  },
  // RestDataAdapter.ts :1584-1597 `relationChanged` — `success(record)`, then `save { objectId, object, collection }`
  addRelation: (o, ok, emit) => {
    o.success(ok);
    emit({ type: 'save', objectId: o.objectId, object: ok, collection: o.collection });
  },
  removeRelation: (o, ok, emit) => {
    o.success(ok);
    emit({ type: 'save', objectId: o.objectId, object: ok, collection: o.collection });
  },
  // s22 — RestDataAdapter.ts :1028-1084 — `success(record)`, then `create { objectId: record.objectId, object, collection }`
  create: (o, ok, emit) => {
    o.success(ok);
    emit({ type: 'create', objectId: (ok as { objectId?: unknown } | null)?.objectId, object: ok, collection: o.collection });
  },
  // s22 — RestDataAdapter.ts :1086-1135 — `success(record)`, then `save { objectId: <the one handed>, object, collection }`
  save: (o, ok, emit) => {
    o.success(ok);
    emit({ type: 'save', objectId: o.objectId, object: ok, collection: o.collection });
  },
  // s23 — RestDataAdapter.ts :972-1015 — `success(record)`, then `fetch { objectId: <the one asked for>, object, collection }`
  fetch: (o, ok, emit) => {
    o.success(ok);
    emit({ type: 'fetch', objectId: o.objectId, object: ok, collection: o.collection });
  },
  // s23 — RestDataAdapter.ts :601-636 — `success(records, total)` and NO event; the world's `ok` carries the two as
  // `{ results, count }` (the contract's success takes two arguments; a script answers with one value)
  query: (o, ok) => {
    const a = (ok ?? {}) as { results?: unknown; count?: unknown };
    o.success(a.results, a.count);
  },
  // s30 — RestDataAdapter.ts :1734-1760, :1965-2040 — `success(FileRef)` / `success(SignedFileUrl)` and NO event (world.ts FILES)
  uploadFile: (o, ok) => o.success(ok),
  signFileUrl: (o, ok) => o.success(ok)
};

/**
 * USER (world.ts BACKEND, s22): the signed-in user, where the Record family's access rules read it — the LEGACY store's
 * session (`_getCurrentUser` → `CloudStore.instance.currentUserId()` → `ParseWireAdapter.currentUserId` → the session
 * store under that store's app id). Written through the REAL `SessionStore` into a storage the play owns (Node has no
 * `localStorage`; the store reads "whatever `localStorage` is now"), installed for every backend play (s27, T14). Returns the undo.
 */
function installUser(w: World): () => void {
  // NSP-014 s25 (T13) — the session store is made ONCE per process, on its first read, and its constructor draws
  // `Math.random` (SessionStore.ts :131, the tab id). Made inside a play (an access rule's `currentUserId()`), it took a
  // draw from the WORLD's stream: the first play of a process minted other ids than every later one (graph s09 red in a
  // full run, green alone; the draw found by call-site diff). Made here, before `installWorld`, in every play.
  parseSessionStore(CloudStore.instance._handle().publicToken);
  const user = w.backend.user;
  // s26 — AUTH's sessions live in the same storage, each backend's under the REST adapter's own key (`restSessionKey`)
  const sessions = w.backend.ids.map((id) => [id, w.backend.session(id)] as const).filter(([, session]) => session !== undefined);
  // s27 (T14) — a storage EVERY backend play, signed in or not: the app always has one. Installed only when the play started
  // with a session, a Log In into an empty world wrote its session into no storage at all, and a User watching read nobody
  // (graph s10 — Logged In pulsed, nothing else moved; the play that started signed in moved). Found by its first graph.
  // P112 OWN-003 — installed BY DESCRIPTOR, as `installWorld` installs the world's globals: in a page `localStorage` is a
  // getter-only property of the window, and an assignment to it does nothing, so every play read the page's own storage
  // and the person the previous play signed in (graph s10, five scenarios red in a page, green in Node — where the
  // global did not exist and the assignment made it). An own data property shadows the window's accessor, and the saved
  // descriptor puts it back.
  const g = globalThis as Record<string, unknown>;
  const saved = Object.getOwnPropertyDescriptor(g, 'localStorage');
  const storage: Record<string, string> = {};
  Object.defineProperty(g, 'localStorage', { value: storage, configurable: true, writable: true, enumerable: false });
  for (const [id, session] of sessions) storage['NodeGX/' + id + '/session'] = JSON.stringify({ ...session, sessionToken: 'world' });
  if (user !== undefined) parseSessionStore(CloudStore.instance._handle().publicToken).write({ objectId: user, sessionToken: 'world' });
  return () => {
    if (saved) Object.defineProperty(g, 'localStorage', saved);
    else delete g.localStorage;
  };
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { RestAuthAdapter } = require('../../src/api/backends/RestAuthAdapter') as { RestAuthAdapter: { prototype: Record<string, unknown> } };
/**
 * The viewer's user service CLASS. Loading its module assigns `NoodlRuntime.Services.UserService` process-wide
 * (userservice.ts :538), as the viewer does at boot — undone at once: the service exists only inside a play's AUTH install
 * (a fresh one per play), never as a process-wide singleton a play without a world would make and keep.
 */
const UserServiceClass = ((): new () => unknown => {
  const services = (NoodlRuntime as unknown as { Services: Record<string, unknown> }).Services;
  const before = services.UserService;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const cls = require('../../../noodl-viewer-react/src/nodes/std-library/user/userservice').default as new () => unknown;
  services.UserService = before;
  return cls;
})();

/**
 * NSP-022 s97 — the CLOUD runtime's user service class (noodl-viewer-cloud services/userservice.js): what a cloud function's
 * Request node looks its caller up through. Loading its module assigns `NoodlRuntime.Services.UserService` process-wide, as
 * the cloud runner does at load (index.ts :43) — undone at once: a cloud play installs it for the play (`install`), never the
 * browser's.
 */
const CloudUserServiceClass = ((): unknown => {
  const services = (NoodlRuntime as unknown as { Services: Record<string, unknown> }).Services;
  const before = services.UserService;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const cls = require('../../../noodl-viewer-cloud/src/services/userservice') as unknown;
  services.UserService = before;
  return cls;
})();

/** The REST auth adapter's halves the AUTH stand-in performs a landing through (RestAuthAdapter.ts — its store, its events). */
interface AuthAdapterLike {
  sessionStore(handle: unknown): { write(session: Record<string, unknown>): void; clear(): void };
  emitAuthEvent(event: string, payload?: unknown): void;
}

/**
 * AUTH (world.ts, NSP-014 s26) for one play: the viewer's REAL user service — a FRESH one, made by the first node that
 * reaches `Services.UserService.forScope` (its constructor's start-up check and its bridge run as in the app) — and the
 * REAL REST auth adapter it makes, whose auth operations (`AUTH_OPS`) are the world's: the call recorded as handed and
 * answered by the script (a refusal inside the call; an answer a microtask after its moment, as a `fetch` resolves), and
 * the landing's steps (`landAuth`) performed through the adapter's own session store and event surface, in the world's
 * order. The constructor's own `fetchCurrentUser` is the SERVICE's start-up check (`startService`): recorded, attributed
 * to no node. The sessions themselves are written into storage by `installUser`. Returns the undo.
 */
function installAuth(w: World): () => void {
  const services = (NoodlRuntime as unknown as { Services: Record<string, unknown> }).Services;
  const savedService = services.UserService;
  let service: unknown;
  let constructing = false;
  const forScope = () => {
    if (service === undefined) {
      constructing = true;
      try {
        service = new UserServiceClass();
      } finally {
        constructing = false;
      }
    }
    return service;
  };
  services.UserService = { forScope };
  // s27 — the viewer's own user nodes (Log In, Sign Up, Log Out …) reach `UserService.instance`, the module's singleton
  // (userservice.ts :530-536), not `forScope` — in the app the two are ONE service (:525-528). The singleton is made once,
  // outside any play (`appUserService`); during a play every method called on it runs on the play's service instead.
  const appService = appUserService();
  const serviceProto = UserServiceClass.prototype as Record<string, unknown>;
  const savedMethods: Record<string, unknown> = {};
  const savedGetters: Record<string, PropertyDescriptor> = {};
  for (const name of Object.getOwnPropertyNames(serviceProto)) {
    const desc = Object.getOwnPropertyDescriptor(serviceProto, name);
    if (name === 'constructor' || !desc) continue;
    // s28 (T15) — a getter too: Sign In With reads `UserService.instance.oauthReturn` (signinwith.ts :92), which read the
    // app singleton's adapters, never the play's
    if (desc.get) {
      const get = desc.get;
      savedGetters[name] = desc;
      Object.defineProperty(serviceProto, name, { ...desc, get(this: unknown) { return get.call(this === appService ? forScope() : this); } });
      continue;
    }
    if (typeof desc.value !== 'function') continue;
    const method = desc.value as (...a: unknown[]) => unknown;
    savedMethods[name] = method;
    serviceProto[name] = function (this: unknown, ...a: unknown[]) {
      return method.apply(this === appService ? forScope() : this, a);
    };
  }
  const proto = RestAuthAdapter.prototype;
  const saved: Record<string, unknown> = {};
  for (const op of AUTH_OPS) {
    saved[op] = proto[op];
    proto[op] = function (this: AuthAdapterLike, handle: { id: string }, options: BackendOptions) {
      const backend = handle.id;
      const atCall = w.backend.session(backend);
      // what the adapter builds its request from is read AT THE CALL (RestAuthAdapter.ts :1607-1617) — the node's held
      // properties are one live object it keeps writing into
      const argsAtCall: Record<string, unknown> = Object.fromEntries(Object.entries(options).filter(([, v]) => typeof v !== 'function'));
      if (argsAtCall.properties && typeof argsAtCall.properties === 'object') argsAtCall.properties = { ...(argsAtCall.properties as Record<string, unknown>) };
      const land = (d: BackendDelivery) =>
        w.backend.landAuth(op, backend, argsAtCall, atCall, d, (step) => {
          if (step.do === 'write') this.sessionStore(handle).write({ ...step.session, sessionToken: 'world' });
          else if (step.do === 'clear') this.sessionStore(handle).clear();
          else if (step.do === 'event') this.emitAuthEvent(step.type);
          else if (step.do === 'success') options.success('ok' in d && d.ok !== undefined ? JSON.parse(JSON.stringify(d.ok)) : undefined);
          else if (step.do === 'error') options.error(step.message);
        });
      if (constructing && op === 'fetchCurrentUser') {
        w.backend.startService((d) => void Promise.resolve().then(() => land(d)));
        return;
      }
      w.backend.issue({ op, backend, args: options }, (d) => {
        if (('refused' in d && d.refused) || ('inCall' in d && d.inCall)) land(d); // answered before the wire — inside the call
        else void Promise.resolve().then(() => land(d));
      });
    };
  }
  // s29 — THE RETURN LEG (world.ts AUTH): the service, as it is made, asks the active backend's adapter whether this page load
  // is a sign-in coming back (userservice.ts :138, :456-463). The adapter's `consumeAuthReturn` reads the address and the
  // parked flow — R9's seam, the world's: it answers from the script's `return`, and its steps are performed on THIS adapter
  // (its `oauthReturn` state, its store, its events — what the real branches do, RestAuthAdapter.ts :1497-1556). A timer's
  // step runs at its moment (the adapter's `setTimeout(0)`); the exchange's a microtask after it, as a `fetch` resolves.
  saved.consumeAuthReturn = proto.consumeAuthReturn;
  proto.consumeAuthReturn = function (this: AuthAdapterLike & { oauthReturn: unknown }, handle: { id: string }) {
    if (handle.id !== w.backend.ids[0]) return false;
    return w.backend.consumeReturn(
      (step) => {
        if (step.do === 'return') {
          this.oauthReturn = { ...step.state };
          if (step.announce) this.emitAuthEvent('oauthReturn', this.oauthReturn);
        } else if (step.do === 'write') this.sessionStore(handle).write({ ...step.session, sessionToken: 'world' });
        else if (step.do === 'event') this.emitAuthEvent(step.type);
      },
      (moment, steps) => (moment === 'answer' ? void Promise.resolve().then(steps) : steps())
    );
  };
  return () => {
    for (const [op, fn] of Object.entries(saved)) proto[op] = fn;
    for (const [name, fn] of Object.entries(savedMethods)) serviceProto[name] = fn;
    for (const [name, desc] of Object.entries(savedGetters)) Object.defineProperty(serviceProto, name, desc);
    services.UserService = savedService;
  };
}

/**
 * s27 — the app's singleton user service (`UserService.instance`, userservice.ts :530-536), made ONCE, the first time a
 * play installs AUTH and BEFORE anything of the play is installed: no session in storage, no world's random stream, no
 * backend of the world's — so its constructor's start-up check finds nobody signed in and makes no call. A play never
 * runs anything on it (`installAuth` forwards its methods to the play's own service).
 */
let appServiceMade: unknown;
function appUserService(): unknown {
  if (appServiceMade === undefined) appServiceMade = (UserServiceClass as unknown as { instance: unknown }).instance;
  return appServiceMade;
}

/**
 * BACKEND (world.ts, NSP-014 s21, R9) for one play: the project's backends are the script's (converged
 * `backendServices`, the first active, each `directus` so it resolves to the REST adapter; no `cloudservices`
 * endpoint), the per-backend stores dropped, and the REST adapter's operations the world's. Returns the undo.
 */
function installBackend(w: World, graphModel: { getMetaData(k: string): unknown; setMetaData(k: string, v: unknown): void }, record: (c: BackendCall) => void): () => void {
  appUserService(); // s27 — before the play's metadata, storage and world (installAuth)
  w.backend.onCall(record);
  const savedMeta = { cloudservices: graphModel.getMetaData('cloudservices'), backendServices: graphModel.getMetaData('backendServices') };
  graphModel.setMetaData('cloudservices', undefined);
  graphModel.setMetaData('backendServices', {
    version: 2,
    activeBackendId: w.backend.ids[0],
    backends: w.backend.ids.map((id) => ({ id, name: id, type: 'directus', url: `https://${id}.backend.example` }))
  });
  CloudStore.invalidateBackends();
  const proto = RestDataAdapter.prototype;
  const saved: Record<string, unknown> = {};
  for (const [op, onSuccess] of Object.entries(BACKEND_OPS)) {
    saved[op] = proto[op];
    proto[op] = function (this: { emitAdapterEvent(e: Record<string, unknown>): void }, handle: { id: string }, options: BackendOptions) {
      // s30 — a file operation's failure is ONE envelope (world.ts FILES, `fileError`); a refusal before the wire lands
      // inside the call (RestDataAdapter.ts :1738-1749), every other answer a microtask after its moment
      const file = isFileOp(op);
      const fail = (message: string) => (file ? options.error({ error: message } as never) : options.error(message));
      w.backend.issue({ op, backend: handle.id, args: options }, (d) => {
        if (file && !('ok' in d) && d.refused) return void options.error(fileError(d) as never);
        void Promise.resolve().then(() => {
          if (!('ok' in d)) {
            if (file) return options.error(fileError(d) as never);
            return d.detail === undefined ? options.error(d.error) : options.error(d.error, d.detail);
          }
          // RestDataAdapter.ts :515-531 — the success runs inside the request's promise chain, whose `.catch` hands a
          // throw to `fail` → the operation's `error` with the throw's message (s22: Delete Record's success can throw, row C36)
          // s23: a COPY — an adapter parses a fresh body per response, and a node may mutate what it is handed (Record's
          // success deletes `objectId` from it, dbmodelnode2.ts :444): the script's object must answer the next call whole
          try {
            onSuccess(options, d.ok === undefined ? undefined : JSON.parse(JSON.stringify(d.ok)), (e) => this.emitAdapterEvent(e));
          } catch (e) {
            fail(e instanceof Error ? e.message : String(e));
          }
        });
      });
    };
  }
  // s24 — writes made elsewhere (world.ts BACKEND `events`): the writer's half through the REAL `_fromJSON` (what a
  // writer's success does), then the adapter's half through that backend's REAL store — the event its listeners hear
  const offStore = w.backend.onStoreEvent((e) => {
    const { backend, ...event } = e;
    if (event.object) CloudStore._fromJSON({ ...event.object }, event.collection, undefined);
    CloudStore.forBackend(undefined, backend)!._adapter.emitAdapterEvent(event);
  });
  // s33 — REALTIME (world.ts): the subscribe is the world's; what its handle tells reaches the node's three callbacks
  const savedCreate = realtimeModule.createRealtimeSubscription;
  realtimeModule.createRealtimeSubscription = (handle, options) => {
    const { onEvent, onStatus, onError, ...args } = options as Record<string, unknown> & { onEvent?: (c: unknown) => void; onStatus?: (s: string) => void; onError?: (e: unknown) => void };
    return w.backend.subscribe({ op: 'subscribe', backend: handle.id, args }, (told) => {
      if ('status' in told) onStatus?.(told.status);
      else if ('change' in told) onEvent?.(told.change);
      else onError?.(told.error);
    });
  };
  const restoreUser = installUser(w);
  const restoreAuth = installAuth(w);
  // s32 — PROJECT's cloud services (world.ts): the play's `cloudservices` metadata is the script's (none above — R9's
  // backends never read it), set only AFTER the legacy store and the user service were made, so neither binds to it; the
  // session the browser holds for its app id is written through the REAL session store into the play's storage, the
  // store made here, before `installWorld` (its constructor draws `Math.random` — s25, T13)
  const cloud = w.cloudServices;
  if (cloud) {
    const { sessionToken, ...metadata } = cloud;
    graphModel.setMetaData('cloudservices', metadata);
    const store = parseSessionStore(cloud.appId);
    if (sessionToken !== undefined) store.write({ objectId: 'world', sessionToken });
  }
  return () => {
    realtimeModule.createRealtimeSubscription = savedCreate;
    offStore();
    restoreAuth();
    restoreUser();
    for (const [op, fn] of Object.entries(saved)) proto[op] = fn;
    CloudStore.invalidateBackends();
    graphModel.setMetaData('cloudservices', savedMeta.cloudservices);
    graphModel.setMetaData('backendServices', savedMeta.backendServices);
  };
}

/** What a stack's `back` returns to a Pop Component Stack (navigation-stack.tsx `StackBackResult`) for the world's answer. */
function backResult(a: StackAnswer): unknown {
  if (a === 'done') return { ok: true };
  if (a === 'unchanged') return { ok: false, unchanged: true };
  return { ok: false, code: a.failure.code, message: a.failure.message };
}

/**
 * NSP-012 — one registry per play: the runtime's two named tables emptied, then seeded from the
 * script exactly as registry.ts seeds its own (named records with their data; named arrays with
 * their members by id). `Model.get` / `Collection.get` are the runtime's, so what a node then
 * reaches is what the app would reach.
 */
function resetRegistry(world: World): void {
  const models = Model._models as Record<string, unknown>;
  for (const key of Object.keys(models)) delete models[key];
  const collections = Collection._collections as Record<string, unknown>;
  for (const key of Object.keys(collections)) delete collections[key];
  const script = world.script.registry;
  if (!script) return;
  for (const [id, data] of Object.entries(script.models ?? {})) {
    const m = Model.get(id);
    for (const key of Object.keys(data)) m.set(key, data[key]);
  }
  for (const [name, members] of Object.entries(script.collections ?? {})) {
    const c = Collection.get(name);
    for (const id of members) c.add(Model.get(id));
  }
  // NSP-014 s21 — the class a record was loaded with (cloudstore.js `_fromJSON`)
  for (const [id, cls] of Object.entries(script.classes ?? {})) (Model.get(id) as unknown as { _class: string })._class = cls;
}

/**
 * NSP-017 s68 — the app's JavaScript API, as the code a person writes reaches it. The Expression, the Function and the Visual
 * Function hand their code `JavascriptNodeParser.createNoodlAPI()`, which in the browser is `window.Noodl` and in a process with
 * no window an empty object (javascriptnodeparser.js :497-501) — so on this target `Variables.x` read nothing. The viewer fills
 * `window.Noodl` at startup (noodl-js-api.ts :26-28, :54-74): Variables is the `--ndl--global-variables` record, `Objects.x` and
 * `Arrays.x` are `Model.get('x')` and `Collection.get('x')`. The same three, over the runtime's own tables, for the play; the
 * function is put back after it. Variables is read at each use, because `resetRegistry` empties the tables per play.
 */
function installNoodlApi(): () => void {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const parser = require('../../src/javascriptnodeparser') as { createNoodlAPI: (scope?: unknown) => unknown };
  const original = parser.createNoodlAPI;
  const api = {
    Object: Model,
    Array: Collection,
    get Variables() {
      return Model.get('--ndl--global-variables');
    },
    // the viewer's proxies exactly: over the two functions, every property a name (symbols too)
    Objects: new Proxy(Model as object, { get: (_t, prop) => Model.get(prop as string) }),
    Arrays: new Proxy(Collection as object, { get: (_t, prop) => Collection.get(prop as string) })
  };
  parser.createNoodlAPI = () => api;
  return () => {
    parser.createNoodlAPI = original;
  };
}

/**
 * The picker nodes the VIEWER provides (census `providedBy: noodl-viewer-react`) that this phase
 * has specced (NSP-011: Color, Value Changed, Color Blend; NSP-007: Delay; NSP-012: the event
 * pair and Repeater Item; NSP-013: Repeat, Animate To Value, Screen Resolution, States). `NoodlRuntime` registers the
 * runtime's own list; the viewer's `register-nodes.js` adds these on top in the app. The same
 * definition objects are registered here, loaded from the viewer's source through jest's require
 * (ts-jest compiles them under this package's config), so a spec of a viewer node is graded
 * against the code the app runs, and no copy is kept. A viewer node specced later is added here.
 */
export const VIEWER_NODES = ['variables/color', 'valuechanged', 'colorblend', 'timer', 'eventsender', 'eventreceiver', 'data/foreachactions', 'repeat', 'animate-to-value', 'screenresolution', 'states', 'componentutils/parentcomponentobject', 'componentutils/setparentcomponentobjectproperties', 'externallink', 'user/login', 'user/signup', 'user/logout', 'user/requestmagiclink', 'user/signinwith', 'uploadfile', 'openfilepicker', 'data/cloudfunction2', 'javascript'] as const;

/** NSP-015 s17 — the viewer's navigation nodes this phase has specced, from `src/nodes/navigation/` (s17 Navigate To Path … s20 Show / Close Popup). */
export const VIEWER_NAVIGATION_NODES = ['navigate-to-path', 'navigate', 'navigate-back', 'router-navigate', 'page-inputs', 'page', 'showpopup', 'closepopup'] as const;

/** NSP-016 s37 — the viewer's VISUAL nodes this phase has specced, from `src/nodes/` (their React components come with them; PERSON above). */
export const VIEWER_VISUAL_NODES = ['controls/button', 'controls/checkbox', 'controls/text-input', 'controls/options', 'controls/slider', 'visual/icon', 'controls/radiobuttongroup', 'controls/radiobutton', 'visual/text', 'visual/group', 'visual/circle', 'visual/image', 'visual/video', 'visual/drag', 'navigation/navigation-stack', 'navigation/router', 'std-library/data/foreach', 'visual/columns'] as const;

/**
 * Picker nodes whose SOURCE is in this package but which only the viewer's `register-nodes.js`
 * registers (its :64-65 note: "HTTP node — temporarily here for debugging (normally in
 * noodl-runtime)") — so `NoodlRuntime` does not know them and the census says the viewer provides
 * them. Registered here from this package's source, as the viewer does (NSP-007: HTTP Request).
 */
export const VIEWER_REGISTERED_RUNTIME_NODES = ['data/httpnode'] as const;

type NodeModuleLike = { node: Parameters<typeof NodeDefinition.defineNode>[0] };
/** A node's module as loaded: an `export default { node }` module (the viewer's TS files) or an `export =` one (httpnode.ts). */
export type ViewerNodeModule = { default?: NodeModuleLike } & Partial<NodeModuleLike>;

/**
 * The four lists above as LOADED modules, in list order — what `registerViewerModules` takes. In Node they come from
 * jest's `require` (`withViewerNodes`); in a page (P112 OWN-003, `noodl-preview/src/inPage/graphTarget.ts`) a bundler
 * imports the same files statically and hands them here, so the page registers exactly what this file lists.
 */
export interface ViewerNodeModules {
  stdLibrary: readonly ViewerNodeModule[];
  navigation: readonly ViewerNodeModule[];
  visual: readonly ViewerNodeModule[];
  runtimeRegistered: readonly ViewerNodeModule[];
}

/**
 * What the app's page gives a node's module before it loads, stood in once per process (`if` guarded):
 * - PERSON (above) — a visual node's module reads `Noodl.deployed` at load (node-shared-port-definitions.ts :1435,
 *   group.ts :541): the deploy bootstrap's global (static/deploy/index.js), which says the node is in a deployed app
 *   and not under the editor — what a person's app is;
 * - NSP-016 s53 — the app's environment, as the viewer's JavaScript API makes it (noodl-js-api.ts :48 `Noodl.Env = {}`):
 *   Image.tsx and Video.tsx read `Noodl.Env['BaseUrl']` for every source that starts with `/`. A project's Base URL is
 *   not on this page;
 * - NSP-016 s57 — what a Page Router calls on the app's API when it shows a page (router.tsx `Noodl.SEO.setTitle` — the
 *   tab's title, the same string as Current Page Title; router-handler.ts `onNavigated` →
 *   `Noodl.Events.emit('NoodlApp_Navigated')`, which an Event Receiver in the app hears). Neither reaches the trace yet:
 *   the face takes both.
 * Called before the visual modules are required here, and by a page's bundle before it evaluates them (P112 OWN-003).
 */
export function ensureAppGlobals(): void {
  const g = globalThis as { Noodl?: { deployed?: boolean; Env?: Record<string, string> } };
  if (!g.Noodl) g.Noodl = { deployed: true };
  if (!g.Noodl.Env) g.Noodl.Env = {};
  const api = g.Noodl as { SEO?: unknown; Events?: unknown };
  if (!api.SEO) api.SEO = { setTitle: () => undefined };
  if (!api.Events) api.Events = { emit: () => undefined };
}

/** The target with the viewer-provided picker nodes registered as well, loaded through Node's `require`. */
export function withViewerNodes(target: RuntimeTarget): RuntimeTarget {
  ensureAppGlobals();
  return registerViewerModules(target, {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    stdLibrary: VIEWER_NODES.map((file) => require('../../../noodl-viewer-react/src/nodes/std-library/' + file)),
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    navigation: VIEWER_NAVIGATION_NODES.map((file) => require('../../../noodl-viewer-react/src/nodes/navigation/' + file)),
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    visual: VIEWER_VISUAL_NODES.map((file) => require('../../../noodl-viewer-react/src/nodes/' + file)),
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    runtimeRegistered: VIEWER_REGISTERED_RUNTIME_NODES.map((file) => require('../../src/nodes/std-library/' + file))
  });
}

/** Registers the viewer-provided picker nodes from their loaded modules — the one copy of what the app's page gives them. */
export function registerViewerModules(target: RuntimeTarget, modules: ViewerNodeModules): RuntimeTarget {
  const register = (mod: ViewerNodeModule) => {
    const m = mod.default ?? (mod as NodeModuleLike);
    target.context.nodeRegister.register(NodeDefinition.defineNode(m.node));
  };
  ensureAppGlobals();
  for (const mod of modules.stdLibrary) register(mod);
  for (const mod of modules.navigation) register(mod);
  for (const mod of modules.visual) register(mod);
  for (const mod of modules.runtimeRegistered) register(mod);
  return target;
}

/**
 * NSP-022 s96 — the cloud runtime's own picker nodes this phase has specced, from `noodl-viewer-cloud/src/nodes/` (its
 * `registerNodes` list, nodes/index.ts). They are graded on {@link cloudTarget}: a `NoodlRuntime` of type `cloud`, which is what
 * the backend's function runner builds (noodl-viewer-cloud/src/index.ts) — none of the browser's session nodes, none of the viewer's.
 */
export const CLOUD_NODES = ['cloud/hmac', 'cloud/jwtsign', 'cloud/jwtverify', 'cloud/secret', 'cloud/createuser', 'cloud/updateuser', 'cloud/deleteuser', 'cloud/verifysessiontoken', 'cloud/addusertorole', 'cloud/removeuserfromrole', 'cloud/getuserroles', 'cloud/listusersinrole', 'cloud/sendemail', 'cloud/request', 'cloud/response', 'cloud/modelrequest', 'data/aggregatenode'] as const;

/** The type names of {@link CLOUD_NODES}, read from the modules — what a suite asks to choose {@link cloudTarget} for a spec. */
export function cloudNodeTypes(): string[] {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return CLOUD_NODES.map((file) => (require('../../../noodl-viewer-cloud/src/nodes/' + file) as NodeModuleLike).node.name as string);
}

/** The target with the cloud runtime's own nodes registered as well, loaded through Node's `require`. */
export function withCloudNodes(target: RuntimeTarget): RuntimeTarget {
  for (const file of CLOUD_NODES) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('../../../noodl-viewer-cloud/src/nodes/' + file) as ViewerNodeModule;
    target.context.nodeRegister.register(NodeDefinition.defineNode((mod.default ?? (mod as NodeModuleLike)).node));
  }
  return target;
}

/** NSP-022 — the runtime a cloud function runs on: type `cloud`, its own nodes registered. */
export function cloudTarget(): RuntimeTarget {
  return withCloudNodes(runtimeTarget({ type: 'cloud' }));
}

export interface RuntimeHandle extends Handle {
  readonly node: RuntimeNode;
  readonly metadata: NodeMetadata;
  /** Everything raised on the runtime error channel by this node, in order. Live. */
  readonly errors: RuntimeErrorEventLike[];
  /** Every line this node wrote through the scope's log sink, in order. Live. */
  readonly logs: LogLine[];
  /**
   * NSP-022 s98 — every model call this node handed the run's cost channel (runcontext.ts `recordModelCall`, Model Request's
   * `recordCall`), in order. Live. A lone node's scope only: what CloudRunner hands a run (index.ts :219).
   */
  readonly modelCalls: unknown[];
}

/** What `net.noodl.Log` hands the sink (runcontext.ts `RuntimeLogEntry`), minus the node id the handle already knows. */
export interface LogLine {
  level: string;
  message: string;
  data?: unknown;
}

export interface RuntimeTarget extends GraphTarget<RuntimeHandle> {
  /** Every type this runtime registered — the population `mount` accepts. */
  types(): string[];
  hasType(type: string): boolean;
  readonly context: InstanceType<typeof NoodlRuntime>['context'];
}

interface Frame {
  values: Map<string, unknown>;
  signals: string[];
  outcomes: TraceEvent[];
  requests: TraceEvent[];
  /** NSP-015 — the frame's LOCATION calls (`window.open`, `history.pushState`, `window.dispatchEvent`; world.ts), after its requests, in the order made. */
  location: TraceEvent[];
}

interface State {
  h: RuntimeHandle;
  trace: TraceEvent[];
  frame: Frame;
  lastSent: Record<string, string>;
  settles: number;
  currentInput: string | undefined;
  inOutcome: number;
  /**
   * NSP-015 — outputs that carry a SIGNAL as values: a component's signal port crosses the
   * boundary the way the runtime carries every pulse between nodes — `true`, then `false`, sent
   * at once (componentinstance.ts `setOutputFromComponentOutput` → `flagOutputDirty`; the
   * receiving signal input fires on the rising edge). The port's kind is the component's
   * declaration; a sent `true` is recorded as a `signal` event and no value is recorded.
   */
  signalOutputs?: Set<string>;
  /** NSP-016 s37 — this node is on the page (PERSON above): a spec that needs `person`. */
  page?: Page;
}

type StampedToken = OutcomeToken & { port?: string };

const OUTCOME_UNSPECIFIED = 'outcome/unspecified-failure';
const OUTCOME_UNCHANGED_AS_FAILURE = 'outcome/unchanged-as-failure';

export interface RuntimeTargetOptions {
  /** `browser` registers the nine client-session nodes as well; `cloud` does not (noodl-runtime.ts). */
  type?: 'browser' | 'cloud';
}

export function runtimeTarget(options: RuntimeTargetOptions = {}): RuntimeTarget {
  /** The world of the current play (NSP-007), or none — then the clock reads 0, as it always did. */
  let world: World | undefined;
  /** The real timers, captured before a world replaces the globals — the settle's yields must reach the event loop. */
  const realSetTimeout = setTimeout;
  const rt = new NoodlRuntime({
    type: options.type || 'browser',
    platform: {
      // Nothing drives frames; `settle()` is the frame boundary.
      requestUpdate: () => undefined,
      getCurrentTime: () => (world ? world.clock.now() : 0),
      objectToString: (o: unknown) => JSON.stringify(o)
    }
  });
  const context = rt.context;
  // NSP-013 s14 — the viewer always gives the context its project's styles (viewer.jsx :185, :322);
  // the headless runtime gives none, and States' colour tween calls `context.styles.resolveColor` in
  // the scheduler's timer pass, so without one every colour transition threw there. This is a
  // project with no colour styles: `resolveColor` hands back what it is given (styles.ts :122-127).
  // node.ts :431 resolves every `color` input through it too — the identity, so Color and Color
  // Blend read exactly what they read before. Named palette colours are not graded (NSP-013 §6.4).
  // NSP-016 s37 — and a project with no text styles: `getTextStyle` is `{}` for any name (styles.ts :129-132), what a
  // visual node's Text Style setter stores (node-shared-port-definitions.ts :2419)
  (context as unknown as { styles: { resolveColor(color: unknown): unknown; getTextStyle(name: unknown): unknown } }).styles = { resolveColor: (color) => color, getTextStyle: () => ({}) };
  // NSP-016 s37 — the viewer's focus tracker, as viewer.jsx :207-214 installs it (PERSON above); fresh per play
  const focusTracker = new FocusTracker();
  (context as unknown as { setNodeFocused: unknown; setNodeUnmounted: unknown }).setNodeFocused = (node: never, focused: boolean) => focusTracker.setNodeFocused(node, focused);
  (context as unknown as { setNodeUnmounted: unknown }).setNodeUnmounted = (node: never) => focusTracker.nodeUnmounted(node);
  // NSP-015 s15 — likewise the project's variants: `importEditorData` always sets the list
  // (graphmodel.ts :171, `exportData.variants || []`), and a component built by its model reads it
  // for every node (nodescope.ts `setNodeParameters` → `variants.getVariant` → `this.variants.find`);
  // the headless runtime loads no project, so the list was undefined and every instance a node
  // makes by name (Run Tasks' template) threw there. This is a project with no variants.
  const graphModel = (context as unknown as { graphModel: { variants?: unknown[]; componentToBundleMap?: Map<string, string>; componentIndex?: Record<string, unknown> } }).graphModel;
  if (graphModel && !graphModel.variants) graphModel.variants = [];
  // NSP-015 s20 — likewise its bundles: `importEditorData` sets the component index and the map from a component to
  // the bundle holding it (graphmodel.ts :158-161); with neither, a component the context does not have threw
  // `Cannot read properties of undefined (reading 'get')` where the app says `Can't find component model for <name>`
  // (nodecontext.ts :620-623) — Show Popup's Error carries that message. This is a project with no bundles.
  if (graphModel && !graphModel.componentToBundleMap) graphModel.componentToBundleMap = new Map();
  if (graphModel && !graphModel.componentIndex) graphModel.componentIndex = {};
  const states = new Map<string, State>();
  /** NSP-020 L1 (s80) — each mounted instance's PLAY context (the scenario's `wiredOutputs` + its `wired`; s82), by handle id. */
  const portContexts = new Map<string, Readonly<PlayContext>>();
  const byNodeId = new Map<string, State>();
  let next = 0;
  /** NSP-015 s20 — the subject whose `update()` is on the stack right now (synchronously); `undefined` between updates. */
  let inUpdate: State | undefined;
  /** The node whose `update()` is running (or whose update started the promise chain that is running) — where a request the world sees is attributed. */
  const updating = new AsyncLocalStorage<State>();

  context.errorBus.subscribe((event: RuntimeErrorEventLike) => {
    const s = byNodeId.get(event.nodeId);
    if (s) s.h.errors.push(event);
  });

  /**
   * NSP-019 s95 — THE EDITOR: what each node tells it about its own settings (diagnostics.ts `setDiagnostic`), by node id, then
   * key → the sentence it shows now. The runtime's own connection reports `isRunningLocally()` false here, so `setDiagnostic`
   * returned on its first line and every diagnostic vanished; this one is the editor a preview has. Kept apart from `State`, so
   * a diagnostic a node raises while it is being made (before `adopt`) is not lost.
   */
  const diagnosticsNow = new Map<string, Map<string, string>>();
  const diagnosticsShown = new Map<string, Record<string, string>>();
  {
    const editor = (context as unknown as { editorConnection: Record<string, unknown> }).editorConnection;
    editor.isRunningLocally = () => true;
    editor.sendWarning = (_component: string, nodeId: string, key: string, warning: { message?: unknown }) => {
      if (!diagnosticsNow.has(nodeId)) diagnosticsNow.set(nodeId, new Map());
      diagnosticsNow.get(nodeId)!.set(key, String(warning?.message ?? ''));
    };
    editor.clearWarning = (_component: string, nodeId: string, key: string) => {
      diagnosticsNow.get(nodeId)?.delete(key);
    };
    editor.clearWarnings = (_component: string, nodeId: string) => {
      diagnosticsNow.delete(nodeId);
    };
  }

  /**
   * NSP-019 s95 — a settle's `diagnostic` events (trace.ts): for a spec that declares `diagnostics`, every key the node shows in
   * its OWN namespace — the `<node-type>/` prefixes its declared keys use (DIAGNOSTICS-CONTRACT.md "Keys") — declared or not, so
   * a sentence the runtime says and the spec forgot is a divergence; one per key whose sentence changed since the last settle,
   * sorted by key. Not the generic ones: the base class's `node/…`, and the scheduler's `runtime/cyclic-loop`, which the loop
   * breaker puts on whichever node it stopped (graph C9, a Counter wired into itself) — the engine's, not the node's.
   */
  function recordDiagnostics(s: State): void {
    const declared = specFor(s.h.type)?.diagnostics;
    if (!declared) return;
    const own = new Set(Object.keys(declared).map((k) => k.slice(0, k.indexOf('/') + 1)));
    const now = diagnosticsNow.get(s.h.id) ?? new Map<string, string>();
    const shown = diagnosticsShown.get(s.h.id) ?? {};
    diagnosticsShown.set(s.h.id, shown);
    const keys = [...new Set([...now.keys(), ...Object.keys(shown)])].filter((k) => own.has(k.slice(0, k.indexOf('/') + 1))).sort();
    for (const key of keys) {
      const message = now.get(key) || undefined;
      if (message === shown[key]) continue;
      if (message === undefined) {
        delete shown[key];
        s.trace.push({ t: 'diagnostic', key });
      } else {
        shown[key] = message;
        s.trace.push({ t: 'diagnostic', key, message });
      }
    }
  }

  const newFrame = (): Frame => ({ values: new Map(), signals: [], outcomes: [], requests: [], location: [] });

  /**
   * One frame as `NoodlRuntime._doUpdate` runs it (noodl-runtime.ts :743-753): the frame time
   * from the clock, `frameStart`, `context.update()` — the drain (nodecontext.ts :453-490) and
   * then the timer pass (:500-503) — `frameEnd`. The events matter: `scheduleNextFrame`
   * (nodecontext.ts :548-551) is `once('frameStart')`, and it is how a node the breaker tripped
   * is re-flagged for the next frame (C9, node.ts :629-644) — a settle that only drained left
   * such a node dead for good, which the runtime never does (NSP-008 found it on the self-wired
   * Counter). The timer pass is what a Delay lives by (NSP-007).
   */
  const frame = () => {
    context.currentFrameTime = world ? world.clock.now() : 0;
    context.eventEmitter.emit('frameStart');
    context.update();
    context.eventEmitter.emit('frameEnd');
  };
  /** The second half of a settle: the drain an async completion's new frame does, without a second tick of the clock. */
  const drain = () => {
    context.eventEmitter.emit('frameStart');
    context.updateDirtyNodes();
    context.eventEmitter.emit('frameEnd');
  };
  const yieldToEventLoop = async () => {
    await Promise.resolve();
    await new Promise((resolve) => realSetTimeout(resolve, 0));
    // NSP-016 s70 — a `history.back()` is a task (world.ts LOCATION, THE SESSION HISTORY): after what this yield resolved, one at a
    // time, the page's popstate listeners running at its landing and the promises they made resolving before the next
    while (world?.location && world.location.land() !== 'none') {
      await Promise.resolve();
      await new Promise((resolve) => realSetTimeout(resolve, 0));
    }
  };

  function isSignalInput(s: State, port: string): boolean {
    const input = s.h.metadata.inputs[port];
    if (!input) return derivedSignal(s, port);
    const t = input.type;
    return !!t && (t === 'signal' || (typeof t === 'object' && (t as { name?: string }).name === 'signal'));
  }
  /**
   * NSP-013 s14 — a port the type's metadata does not list is one the node registers itself
   * (`registerInputIfNeeded`), with a setter and no type: States' `to-<state>` is an
   * `EdgeTriggeredInput`, a signal by its setter alone. What it IS is the spec's derived
   * declaration for the graph's parameters — the same thing the editor draws the port from.
   */
  function derivedSignal(s: State, port: string): boolean {
    const derived = specFor(s.h.type)?.derived;
    if (!derived) return false;
    const params = ((s.h.node as unknown as { model?: { parameters?: Record<string, unknown> } }).model?.parameters ?? {}) as Record<string, unknown>;
    const decl = derived.inputs(params, portContexts.get(s.h.id) ?? {})[port] ?? derived.discover?.(port);
    return !!decl && decl.type === 'signal';
  }
  function isSignalOutput(s: State, port: string): boolean {
    if (s.signalOutputs?.has(port)) return true;
    const output = s.h.metadata.outputs[port];
    const t = output && output.type;
    if (!output) return derivedSignalOutput(s, port);
    return !!t && (t === 'signal' || (typeof t === 'object' && (t as { name?: string }).name === 'signal'));
  }
  /**
   * NSP-017 s65 — a DERIVED signal output, by the spec's declaration for the placing's params: a Function's `out-<z>` reads the
   * function its code calls (simplejavascript.ts `getScriptOutputValue` asks `_isSignalType` with the bare name, so it never knows),
   * and the connection-time read must not take that for a value.
   */
  function derivedSignalOutput(s: State, port: string): boolean {
    const spec = specFor(s.h.type);
    if (!spec?.derived) return false;
    const params = ((s.h.node as unknown as { model?: { parameters?: Record<string, unknown> } }).model?.parameters ?? {}) as Record<string, unknown>;
    // NSP-020 s82 — the play's list (ports.ts `playOutputs`: the params' derived outputs, the wired `onWire` ones, the wired names
    // `discoverOutput` mints), then a name the node's own write minted (`discoverOutput`)
    const decl = playOutputs(spec, params, portContexts.get(s.h.id) ?? {}, 'skip')[port] ?? spec.derived.discoverOutput?.(port);
    return decl?.type === 'signal';
  }

  function intercept(s: State): void {
    const node = s.h.node;
    // NSP-015 — `ComponentInstanceNode`'s prototype is built from property DESCRIPTORS
    // (componentinstance.ts `Object.create(Node.prototype, { update: { value } … })`), which are
    // read-only, so an assignment on the instance throws; an own writable property shadows them
    for (const m of ['setInputValue', 'update', 'sendValue', 'sendSignalOnOutput', 'beginOutcome', 'reportOutcome', 'scheduleAfterInputsHaveUpdated'] as const) {
      Object.defineProperty(node, m, { value: node[m], writable: true, configurable: true });
    }
    // The invoking input of an outcome (trace.ts: an outcome's `port` is the INPUT that was
    // invoked). A direct `signal()` names it; a pulse arriving over a WIRE (NSP-008) reaches the
    // node through the drain's `setInputValue(name, true)` (node.ts :718), so the rising edge of
    // any signal input is where the name is learnt — the same edge for both.
    const originalSetInputValue = node.setInputValue.bind(node);
    node.setInputValue = (name: string, value: unknown) => {
      const previous = s.currentInput;
      if (value === true && isSignalInput(s, name)) s.currentInput = name;
      try {
        originalSetInputValue(name, value);
      } finally {
        s.currentInput = previous;
      }
    };
    // NSP-016 s52 — work a signal's rising edge schedules for after the frame's inputs belongs to that signal: an outcome it begins
    // there (Group's Scroll To Index, `outcomeOnInnerComponent` inside `scheduleAfterInputsHaveUpdated`) is that input's invocation,
    // as it is when the node begins it at the edge itself. Without this the callback runs with no input in hand and the trace's
    // port read `''`, an invocation no input opened.
    const originalSchedule = node.scheduleAfterInputsHaveUpdated.bind(node);
    node.scheduleAfterInputsHaveUpdated = (callback: (this: unknown) => void) => {
      const by = s.currentInput;
      if (by === undefined) return originalSchedule(callback);
      return originalSchedule(function (this: unknown) {
        const previous = s.currentInput;
        s.currentInput = by;
        try {
          return callback.call(this);
        } finally {
          s.currentInput = previous;
        }
      });
    };
    // Which node is updating — an HTTP Request's fetch is reached from its after-inputs callback,
    // inside its update, through a promise chain (`conditionalHeaders(url).then(fetch)`): the
    // async context set here follows that chain, where a plain variable would not.
    const originalUpdate = node.update.bind(node);
    node.update = () => {
      const outer = inUpdate;
      inUpdate = s;
      try {
        return updating.run(s, originalUpdate);
      } finally {
        inUpdate = outer;
      }
    };
    const originalSendValue = node.sendValue.bind(node);
    node.sendValue = (name: string, value: unknown) => {
      if (s.signalOutputs?.has(name)) {
        if (value === true) s.frame.signals.push(name);
      } else if (value !== undefined && node.hasOutput(name)) s.frame.values.set(name, value === node ? SELF_REFERENCE : isOwnElement(node, value) ? OWN_ELEMENT : canonicalise(value));
      originalSendValue(name, value);
    };
    const originalSignal = node.sendSignalOnOutput.bind(node);
    node.sendSignalOnOutput = (name: string) => {
      // NSP-015 s20 — a port the node does not have sends nothing (node.ts `sendSignalOnOutput` returns at once): Show
      // Popup's close action names a port the popup's Close Popup declared, and one the opener lacks was recorded here
      if (!node.hasOutput(name)) return originalSignal(name);
      if (!(s.inOutcome > 0 && (OUTCOME_PORTS as readonly string[]).includes(name))) s.frame.signals.push(name);
      originalSignal(name);
    };
    const originalBegin = node.beginOutcome.bind(node);
    node.beginOutcome = (inputData?: Record<string, unknown>) => {
      const token = originalBegin(inputData) as StampedToken;
      token.port = s.currentInput;
      return token;
    };
    const originalReport = node.reportOutcome.bind(node);
    node.reportOutcome = (token: OutcomeToken, outcome, failure?: OutcomeFailureOptions) => {
      const first = token.reported === undefined;
      s.inOutcome++;
      try {
        originalReport(token, outcome, failure);
      } finally {
        s.inOutcome--;
      }
      if (first && token.reported !== undefined) {
        // s29 — `''`: an invocation no input opened (trace.ts; Sign In With's return leg). It was `'?'`, which no spec could say
        const port = (token as StampedToken).port ?? s.currentInput ?? '';
        const event: TraceEvent = { t: 'outcome', port, value: token.reported };
        if (token.reported === 'failure') {
          event.error = outcome === 'unchanged' ? OUTCOME_UNCHANGED_AS_FAILURE : (failure && failure.code) || OUTCOME_UNSPECIFIED;
        }
        s.frame.outcomes.push(event);
      }
    };
  }

  function flush(s: State): void {
    s.trace.push({ t: 'settle' });
    const values = new Map(s.frame.values);
    if (s.settles === 0) {
      // The connection-time read: what a wire made before the first frame is handed.
      for (const output of s.h.node._outputList) {
        if (values.has(output.name) || isSignalOutput(s, output.name) || (OUTCOME_PORTS as readonly string[]).includes(output.name)) continue;
        let v: unknown;
        try {
          v = output.value;
        } catch {
          continue;
        }
        // NSP-016 s37 — a visual node's `This` is the node itself: the self reference (trace.ts)
        if (v !== undefined) values.set(output.name, v === s.h.node ? SELF_REFERENCE : isOwnElement(s.h.node, v) ? OWN_ELEMENT : canonicalise(v));
      }
    }
    for (const name of [...values.keys()].sort()) {
      const v = values.get(name);
      if (v === undefined) continue; // C3
      const key = JSON.stringify(v);
      if (s.lastSent[name] === key) continue;
      s.lastSent[name] = key;
      s.trace.push({ t: 'value', port: name, value: v });
    }
    for (const name of s.frame.signals) s.trace.push({ t: 'signal', port: name });
    for (const o of s.frame.outcomes) s.trace.push(o);
    for (const r of s.frame.requests) s.trace.push(r);
    for (const l of s.frame.location) s.trace.push(l);
    recordDiagnostics(s);
    s.frame = newFrame();
    s.settles++;
  }

  /** A request the world saw, as the trace records it, attributed to the node that is updating. */
  function recordRequest(record: RequestRecord): void {
    const s = updating.getStore() ?? (states.size === 1 ? [...states.values()][0] : undefined);
    if (!s) throw new Error(`runtime: a request (${record.method} ${record.url}) was made outside any node's update, and more than one node is mounted — it cannot be attributed`);
    const event: TraceEvent = { t: 'request', method: canonicalise(record.method), url: record.url, headers: { ...record.headers } };
    if (record.body !== undefined) event.body = canonicalise(record.body);
    s.frame.requests.push(event);
  }

  /** A BACKEND call the world saw (world.ts, NSP-014 s21), in the request group, attributed as a request is. */
  function recordBackend(call: BackendCall): void {
    const s = updating.getStore() ?? (states.size === 1 ? [...states.values()][0] : undefined);
    if (!s) throw new Error(`runtime: a backend call (${call.op}) was made outside any node's update, and more than one node is mounted — it cannot be attributed`);
    s.frame.requests.push(backendEvent(call));
  }

  /** A HOST call the world saw (world.ts, NSP-022 s96), in the request group, attributed as a request is. */
  function recordHost(call: HostCall): void {
    const s = updating.getStore() ?? (states.size === 1 ? [...states.values()][0] : undefined);
    if (!s) throw new Error(`runtime: a ${call.service} call was made outside any node's update, and more than one node is mounted — it cannot be attributed`);
    s.frame.requests.push(hostEvent(call));
  }

  /** A LOCATION call the world saw (an open, a push, a dispatch), as the trace records it, attributed as a request is. */
  function recordLocation(call: LocationCall): void {
    const s = updating.getStore() ?? (states.size === 1 ? [...states.values()][0] : undefined);
    if (!s) throw new Error(`runtime: a location call (${call.call}) was made outside any node's update, and more than one node is mounted — it cannot be attributed`);
    s.frame.location.push(locationEvent(call));
  }

  /** A STACK call the world saw (a push, a replace, a pop; world.ts, NSP-015 s18), in the LOCATION group, attributed as a request is. */
  function recordStack(event: TraceEvent): void {
    const s = updating.getStore() ?? (states.size === 1 ? [...states.values()][0] : undefined);
    if (!s) throw new Error(`runtime: a stack call (${String((event as { op?: unknown }).op)}) was made outside any node's update, and more than one node is mounted — it cannot be attributed`);
    s.frame.location.push(event);
  }

  /**
   * A POPUP call the world saw (a show, a close; world.ts, NSP-015 s20), in the LOCATION group — attributed to the
   * subject whose `update()` is running RIGHT NOW (both calls are made synchronously from a frame-end callback), and
   * DROPPED when none is: a Show Popup inside a popup a graph built is not a subject. Not by the async context a request
   * uses — a popup is built inside its opener's promise chain, and the async context then named the opener for every
   * call the popup's own nodes made (found s20 on the nested-popups scenario).
   */
  function recordPopup(event: TraceEvent): void {
    // no sole-subject fallback: a graph of ONE subject whose popup holds a Show Popup is exactly where it misattributed
    if (inUpdate) inUpdate.frame.location.push(event);
  }

  /** A click on a file input the world saw (world.ts PICKER, NSP-014 s31), in the LOCATION group — attributed to the node that made the element. */
  function recordPicker(event: TraceEvent, element: unknown): void {
    const s = [...states.values()].find((st) => (st.h.node as unknown as { _internal?: { inputElement?: unknown } })._internal?.inputElement === element);
    if (!s) throw new Error('runtime: a file input was clicked that no mounted node made — it cannot be attributed');
    s.frame.location.push(event);
  }

  /**
   * A call on a WebSocket the world saw (world.ts SOCKET, NSP-014 s34), in the request group. A construction is the node's that
   * is updating, or being pulsed (a Connect reaches `new WebSocket` inside `setInputValue`), or the only one mounted (a
   * reconnect timer fires inside `advance`, in no node's context); every later call on that socket is that node's.
   */
  const socketOwners = new WeakMap<object, State>();
  function recordSocket(event: TraceEvent, socket: object): void {
    let s = socketOwners.get(socket);
    if (!s && (event as { op?: unknown }).op === 'connect') {
      s = updating.getStore() ?? inUpdate ?? [...states.values()].find((st) => st.currentInput !== undefined) ?? (states.size === 1 ? [...states.values()][0] : undefined);
      if (s) socketOwners.set(socket, s);
    }
    if (!s) throw new Error('runtime: a WebSocket call was made that no mounted node can be named for — it cannot be attributed');
    s.frame.requests.push(event);
  }

  /** POPUP (world.ts) for the play: the popups `showPopup` built in the root scope, in the order built — what the person's close addresses. */
  let popups: RuntimeNode[] = [];
  /** Inside a `showPopup` call: its `createNode` builds a popup (the call reaches it synchronously, before its first `await`). */
  let showing = 0;

  /**
   * POPUP (world.ts, NSP-015 s20) — `scope` is the ROOT component's scope, where `showPopup` builds every popup and
   * its container (nodecontext.ts :1215): made the context's root component, its `createNode` watched for the
   * popups a show builds. A lone play gets a fresh one (`installPopups`); a graph with components gets the tree's.
   */
  function popupRoot(scope: InstanceType<typeof NodeScope>, owner: Owner): void {
    (context as unknown as { rootComponent: unknown }).rootComponent = owner;
    const create = scope.createNode.bind(scope);
    scope.createNode = (async (...args: Parameters<typeof create>) => {
      const popup = showing > 0;
      const node = await create(...args);
      if (popup) popups.push(node as unknown as RuntimeNode);
      return node;
    }) as typeof scope.createNode;
  }

  /**
   * POPUP (world.ts, NSP-015 s20) for one play. `NodeContext.showPopup` stays the RUNTIME's — its stack, its slot
   * policy, its next-frame `leave` are what is graded — and only what lies outside the runtime is stood in: the
   * app's popup host (`setPopupCallbacks`; none when the script says `host: false`), the container `Group`
   * (GROUP_STAND_IN), `requestAnimationFrame` (the next frame's start, as a browser runs it before the next paint),
   * a fresh root scope (a popup's id is a `guid()` — the world's random stream — so a scope that outlived a play
   * refused the next play's first popup as a duplicate), and the project's components (an empty model per name). A
   * show is recorded at the call, as handed; the person's events are world timers calling the n-th popup's
   * published close handler or the host's Escape (`cancelTopPopup`). Returns the undo.
   */
  function installPopups(w: World): () => void {
    const ctx = context as unknown as {
      rootComponent: unknown;
      popupStack: unknown[];
      showPopup: (target: unknown, params: unknown, args?: Record<string, unknown>) => unknown;
      cancelTopPopup(): boolean;
      setPopupCallbacks(cb: { onShow?: unknown; onClose?: unknown }): void;
      componentModels: Record<string, unknown>;
    };
    w.popup.onCall(recordPopup);
    const savedRoot = ctx.rootComponent;
    const savedGroup = context.nodeRegister.peek(POPUP_GROUP);
    context.nodeRegister.register(GROUP_STAND_IN);
    const scopeProto = NodeScope.prototype as unknown as { createPrimitiveNode(name: string, ...rest: unknown[]): unknown };
    const realPrimitive = scopeProto.createPrimitiveNode;
    // only the popup container: a Group made in the ROOT's scope (nodecontext.ts :1277). NSP-016 s56 — a Component Stack makes its
    // page containers and its transitions' overlays as real Groups in its own scope (navigation-stack.tsx `createPageContainer`)
    scopeProto.createPrimitiveNode = function (this: unknown, name: string, ...rest: unknown[]) {
      const inRoot = this === (ctx.rootComponent as { nodeScope?: unknown } | undefined)?.nodeScope;
      return realPrimitive.call(this, name === 'Group' && inRoot ? POPUP_GROUP : name, ...rest);
    };
    const g = globalThis as unknown as { requestAnimationFrame?: unknown };
    const savedRaf = g.requestAnimationFrame;
    g.requestAnimationFrame = (cb: (t: number) => void) => {
      context.scheduleNextFrame(() => cb(w.clock.now()));
      return 0;
    };
    const rootOwner: Owner = { name: 'node-spec/root', getInstanceId: () => 'node-spec/root', getRoots: () => [] as never[] };
    popupRoot(scopeFor(rootOwner, []), rootOwner);
    popups = [];
    ctx.popupStack = [];
    ctx.setPopupCallbacks(w.popup.host ? { onShow: () => undefined, onClose: () => undefined } : { onShow: undefined, onClose: undefined });
    const models: string[] = [];
    for (const name of w.popup.script.components ?? []) {
      if (Object.prototype.hasOwnProperty.call(ctx.componentModels, name)) continue;
      ctx.componentModels[name] = new ComponentModel(name);
      models.push(name);
    }
    const realShow = ctx.showPopup;
    ctx.showPopup = function (this: unknown, target, params, args) {
      w.popup.record({ op: 'show', target, params, stackPolicy: args?.stackPolicy, closeOnEscape: args?.closeOnEscape, modal: args?.modal, accessibleName: args?.accessibleName });
      showing++;
      try {
        return realShow.call(this, target, params, args);
      } finally {
        showing--;
      }
    };
    for (const { at, event } of w.popup.events) {
      w.clock.schedule(at, () => {
        if (event.kind === 'escape') {
          ctx.cancelTopPopup();
          return;
        }
        const popup = popups[event.popup ?? popups.length - 1] as unknown as { _popupCloseHandler?: (action: unknown, results: unknown) => void } | undefined;
        popup?._popupCloseHandler?.(event.action, { ...event.results });
      });
    }
    return () => {
      delete (ctx as { showPopup?: unknown }).showPopup;
      for (const name of models) delete ctx.componentModels[name];
      ctx.setPopupCallbacks({ onShow: undefined, onClose: undefined });
      ctx.popupStack = [];
      popups = [];
      if (savedRaf === undefined) delete g.requestAnimationFrame;
      else g.requestAnimationFrame = savedRaf;
      scopeProto.createPrimitiveNode = realPrimitive;
      context.nodeRegister.restore(POPUP_GROUP, savedGroup);
      ctx.rootComponent = savedRoot;
    };
  }

  /**
   * POPUP (world.ts, NSP-015 s20) — a lone Close Popup sits inside the script's popups (`inside`, nearest first): its
   * component's parent is the first, each popup's parent the next — the walk `componentAncestors` makes
   * (componentwalk.ts :47-75, the non-visual hop). Each popup has a published close handler; the one the node
   * resolves is recorded by the node's own `resolvePopup` (below), so the handler itself does nothing.
   */
  function insidePopups(owner: { parentNodeScope?: unknown }, names: readonly string[]): void {
    let parent: { componentOwner: unknown } | undefined;
    for (let i = names.length - 1; i >= 0; i--) {
      const popup: Record<string, unknown> = { name: names[i], getInstanceId: () => `node-spec/popup/${i}`, getRoots: () => [] as never[], parentNodeScope: parent, _popupCloseHandler: () => undefined };
      popup.nodeScope = { componentOwner: popup };
      parent = { componentOwner: popup };
    }
    owner.parentNodeScope = parent;
  }

  /** A line a node wrote through its scope's log sink lands on that node's handle; the entry names the node (runcontext.ts). */
  const logSink = (fallback: LogLine[]) => (entry: { level: string; message: string; data?: unknown; nodeId?: string }) => {
    const line: LogLine = entry.data === undefined ? { level: entry.level, message: entry.message } : { level: entry.level, message: entry.message, data: entry.data };
    const owner = entry.nodeId !== undefined ? byNodeId.get(entry.nodeId) : undefined;
    (owner ? owner.h.logs : fallback).push(line);
  };

  /**
   * A lone node's scope: the one a browser app's root component has — no model scope (so the
   * global `Model`), a component owner named after the handle whose walk stops here (`getRoots`
   * and no `parentNodeScope`), and the log sink.
   */
  const loneScope = (id: string, logs: LogLine[], modelCalls: unknown[] = []) => ({
    // NSP-022 s97 — a cloud function's nodes live in the request's own model scope (index.ts :215-216 `requestScope.modelScope =
    // new Model.Scope()`), so what the function writes (the `Request` model, the caller's user record) is the play's alone
    modelScope: options.type === 'cloud' ? new Model.Scope() : undefined,
    componentOwner: { name: `node-spec/${id}`, getInstanceId: () => id, getRoots: () => [] as never[] },
    context,
    runContext: { log: logSink(logs), recordModelCall: (call: unknown) => void modelCalls.push(call) }
  });

  /**
   * Mounts one node into `scope` (a lone scope when absent), applying `params` as `set` events.
   * `graphId`: a graph node is mounted under its scenario id, as a loaded app mounts a node under
   * its project id — what a node that REPORTS ids reads (On App Error's Node Id, NSP-013 s13); a
   * lone node keeps the generated `<type>#<n>`.
   */
  /**
   * P107-C155 — a wire into `port` from a source that never sends: what `connectInput` reads of a source (node.ts :569-605) —
   * its name, an output port with an owner, a name, a value and the connection registry, and the signals-sent map — plus the
   * `update` the sink's update loop calls on every connected source first (`_updateDependencies`, :820-826), a no-op here.
   * The output's value stays `undefined`, so the wire seeds nothing; the stub has nothing to update, so it never sends.
   */
  function wireStub(node: NodeInstance, port: string, type: string): void {
    node.registerInputIfNeeded(port);
    if (!node.hasInput(port)) throw new Error(`${type}: no input "${port}" on the runtime to wire`);
    const stub = { name: `wired:${port}`, _signalsSentThisUpdate: {} as Record<string, boolean>, getOutput: () => output, update: () => undefined };
    const output = { name: 'value', owner: stub, value: undefined as unknown, registerConnection: () => undefined, deregisterConnection: () => undefined };
    (node as unknown as { connectInput(input: string, source: unknown, sourcePort: string): void }).connectInput(port, stub, 'value');
  }

  /**
   * NSP-020 s82 — THE PLACING: the derived ports for the mount's params, written onto the model as a loaded project's saved
   * `dynamicports` give it (nodemodel.ts `createFromExportData` → `addOutputPort`; the Function reads its signal kinds there,
   * simplejavascript.ts :600-618, the Script re-registers them at each code read, javascript.ts :433) — every drawn output, `onWire`
   * or not (s83) — and registered as a wire would make the runtime do: minus the `onWire` outputs no wire asks for, plus the wired
   * names `discoverOutput` mints (ports.ts `playOutputs`). Once, at mount: the model is the placing's for the whole play (NSP-017's
   * contracts).
   */
  function placing(node: NodeInstance, model: { parameters: Record<string, unknown>; outputPorts: Record<string, { name: string; type: string }>; inputPorts: Record<string, { name: string; type: string }> }, spec: ReturnType<typeof specFor>, ports: Readonly<PlayContext>): void {
    if (!spec?.derived) return;
    for (const [name, decl] of Object.entries(spec.derived.inputs(model.parameters, ports))) {
      if (name in spec.inputs) continue;
      model.inputPorts[name] = { name, type: decl.type as string };
    }
    // NSP-020 s83 — the SAVED ports are every output the editor drew for these params, `onWire` or not: a Function prepares a
    // callable for each signal port it saved (simplejavascript.ts :600-618) and sends it only when wired (:609); the Function and
    // the Script are the only nodes that read `model.outputPorts`. What is REGISTERED is the play's list alone.
    for (const [name, decl] of Object.entries(spec.derived.outputs?.(model.parameters, ports) ?? {})) {
      if (name in spec.outputs) continue;
      model.outputPorts[name] = { name, type: decl.type as string };
    }
    for (const [name, decl] of Object.entries(playOutputs(spec, model.parameters, ports))) {
      model.outputPorts[name] = { name, type: decl.type as string };
      node.registerOutputIfNeeded(name);
    }
  }

  function mountIn(type: string, params: Record<string, unknown>, scope?: InstanceType<typeof NodeScope>, graphId?: string, wired?: readonly string[], portContext: Readonly<PlayContext> = {}): RuntimeHandle {
    if (!context.nodeRegister.hasNode(type)) throw new Error(`runtime: no node type "${type}" is registered`);
    if (graphId !== undefined && states.has(graphId)) throw new Error(`runtime: a node "${graphId}" is still mounted — a previous play leaked it`);
    const id = graphId ?? `${type}#${next++}`;
    // NSP-020 L1 (s80) — the spec's derived ports read the PLAY's context (s82, spec.ts `PlayContext`: the wire fields and nothing
    // else — at play a node has its params and its wires, never the project), with the mount's `wired` folded in exactly as the
    // interpreter's `mount` folds it; read again by `derivedSignal` after the mount
    const ports: Readonly<PlayContext> = { ...playContextOf(portContext), wired: [...(portContext.wired ?? []), ...(wired ?? [])] };
    portContexts.set(id, ports);
    const logs: LogLine[] = [];
    const modelCalls: unknown[] = [];
    // NSP-016 s56 — a lone Component Stack builds its pages in its own scope (`createNode`, `createPrimitiveNode`, `deleteNode`):
    // a REAL scope, as the popup root has (`scopeFor`)
    const nodeScope = scope ?? (type === 'Page Stack' || type === 'Router' || type === 'For Each' ? scopeFor({ name: `node-spec/${id}`, getInstanceId: () => id, getRoots: () => [] as never[] }, logs) : loneScope(id, logs, modelCalls));
    // POPUP (world.ts, NSP-015 s20) — a lone Close Popup inside the script's popups
    if (!scope && type === 'NavigationClosePopup' && world && world.popup.inside.length > 0) insidePopups(nodeScope.componentOwner as { parentNodeScope?: unknown }, world.popup.inside);
    const metadata = context.nodeRegister.getNodeMetadata(type);
    // PERSON (above, NSP-016 s43) — a node a person acts on is made in a page that has a window: the app's params are set with
    // `window` and `document` present, as a loaded project sets them. A setter that reads the page at once (drag-drop.ts
    // `setDraggable` → `install`, `whenMounted`) found none here and did nothing — Draggable set at the placing never armed.
    if (specFor(type)?.needs?.includes('person') && !domInstalled) domInstalled = installPage(world?.location);
    const { node, made } = createHooked(type, id, nodeScope, metadata, logs);
    if (!node.nodeScope) node.nodeScope = nodeScope as never;
    // a node in a component's scope is one of the scope's nodes — what `getNodesWithType` reads
    if (scope) scope.nodes[id] = node as never;
    // STACK (world.ts, NSP-015 s18) — a Pop Component Stack in a page a stack pushed: the stack installs
    // its back callback on every one in the page it builds (navigation-stack.tsx :981-991); here the world's
    if (type === 'PageStackNavigateBack' && world?.stack.inPushedPage) {
      const w = world;
      (node as unknown as { _setBackCallback(cb: (a: { backAction?: unknown; results?: unknown }) => unknown): void })._setBackCallback((a) => backResult(w.stack.back(a.backAction, a.results)));
    }
    // the graph's parameters, for the two nodes that read them off `this.model` (NSP-012)
    // `removeListenersWithRef` because `_onNodeDeleted` calls it FIRST (node.ts :1312-1315): without it
    // every teardown threw on its first line, `dispose` swallowed the throw, and no node's delete
    // listeners ever ran — Delay's and Repeat's timers were never stopped (NSP-013 s12, T7)
    // NSP-017 s65 — `outputPorts`: the derived outputs, as a loaded project's saved `dynamicports` give the model (nodemodel.ts
    // `createFromExportData` → `addOutputPort`); the Function reads its signal ports there (simplejavascript.ts :600-618, :843-846)
    // NSP-020 s82 — ONE list for the model's saved ports and the registration (ports.ts `playOutputs`): the params' derived outputs
    // minus the `onWire` ones no wire asks for, plus the wired names `discoverOutput` mints — what a loaded project's saved
    // `dynamicports` give the model AND what its wires register (nodescope.ts :150). The placing's, for the whole play.
    const spec = specFor(type);
    const model = { type, parameters: { ...params } as Record<string, unknown>, outputPorts: {} as Record<string, { name: string; type: string }>, inputPorts: {} as Record<string, { name: string; type: string }>, removeListenersWithRef: () => undefined };
    (node as unknown as { model?: unknown }).model = model;
    placing(node as unknown as NodeInstance, model, spec, ports);
    // THE WIRES OUT (scenario.ts `wiredOutputs`): each is brought into being as `nodescope.ts addConnection` brings it (:150,
    // `registerOutputIfNeeded(sourcePort)`); nothing listens on it, as nothing sends on a `wired` input
    for (const name of ports.wiredOutputs ?? []) {
      (node as unknown as NodeInstance).registerOutputIfNeeded(name);
      if (!(node as unknown as NodeInstance).hasOutput(name)) throw new Error(`${type}: no output "${name}" on the runtime to wire`);
    }
    // POPUP (world.ts, NSP-015 s20) — a Close Popup's call to the handler it resolved, recorded AS HANDED, before the call
    if (type === 'NavigationClosePopup') {
      type Resolution = { popup?: { name?: unknown }; close?: (action: unknown, results: unknown) => void };
      const n = node as unknown as { resolvePopup(): Resolution };
      const resolve = n.resolvePopup.bind(node);
      n.resolvePopup = () => {
        const r = resolve();
        const close = r.close;
        if (close && world) {
          const w = world;
          r.close = (action, results) => {
            w.popup.record({ op: 'close', popup: r.popup?.name, action, results });
            close(action, results);
          };
        }
        return r;
      };
    }
    // NSP-016 s59 — a Repeater's parent: placed as a loaded project places it (nodescope.ts `createNodeFromModel`), its parent is known
    // BEFORE its parameters are set (`setNodeModel` → `updateTarget`, which schedules a rebuild) and it joins the parent's children after
    // (`insertNodeInTree`, in `putOnPage`). The row templates are the play's project's (repeater.ts THE PLAY'S PROJECT)
    if (type === 'For Each' && !scope) repeaterParent(node, nodeScope as unknown as InstanceType<typeof NodeScope>, id);
    // P107-C155 — THE WIRED PORTS (adapter.ts `mount`): each named port gets the runtime's own connection (node.ts `connectInput`)
    // from a source that never sends, BEFORE the params — a loaded project makes its wires before a node's parameters drain
    // (nodescope.ts `setComponentModel`: nodes made with `updateOnDirtyFlagging` off, the connections added, then the first
    // update), so a setter that asks `isInputConnected` (simplejavascript.ts :386, expression.ts :611) reads true, and nothing
    // ever arrives on the wire (the source's output holds `undefined`, which `connectInput` does not seed — C3). The lone
    // node's `set` keeps writing through `setInputValue`, as a parameter does.
    for (const port of wired ?? []) wireStub(node as unknown as NodeInstance, port, type);
    const h = adopt(node, id, type, metadata, params, logs, made);
    (h as { modelCalls: unknown[] }).modelCalls = modelCalls;
    // PERSON (above, NSP-016 s37) — a node a person acts on is put on the page, its params already applied as a
    // loaded project's are before the first render; its Did Mount lands in the first settle
    // NSP-016 s52 — a placing that throws (C87: a Group's Tag of null) tears down what it made, as a dispose does: the play gets no
    // handle to dispose, and a node left alive stayed in the drag module's registries — the next play that lifted a card met its zone
    if (spec?.needs?.includes('person')) {
      try {
        putOnPage(states.get(id)!);
      } catch (e) {
        target.dispose(h);
        throw e;
      }
    }
    // HOST, THE INVOCATION (world.ts, NSP-022 s97) — the function a request reached, as `CloudRunner.run` drives it (index.ts
    // :297-332): every Response holds the request's two callbacks from the component's making; the Request is handed the request at
    // its moment (the runner's `setImmediate`, the world's timer), and what it rejects with is the function's refusal
    if (world?.host.invocation && (type === 'noodl.cloud.response' || type === 'noodl.cloud.request')) {
      const w = world;
      const st = states.get(id)!;
      if (type === 'noodl.cloud.response') {
        const internal = (node as unknown as { _internal: Record<string, unknown> })._internal;
        internal._requestIsOpen = () => w.host.requestState() === 'open';
        internal._sendResponseCallback = (payload: { statusCode: number; body: string }) => {
          if (w.host.requestState() !== 'open') return false;
          w.host.respond();
          st.frame.location.push(invocationEvent({ op: 'respond', status: payload.statusCode, body: payload.body }));
          return true;
        };
      } else {
        const { at, request } = w.host.invocation;
        w.clock.schedule(at, () => {
          const req = 'body' in request ? { headers: { ...request.headers }, body: request.body } : { headers: { ...request.headers } };
          (node as unknown as { sendRequest(r: unknown): Promise<void> }).sendRequest(req).catch((e: { message?: unknown; fields?: unknown }) => {
            w.host.refuse();
            st.frame.location.push(invocationEvent(e && e.fields !== undefined ? { op: 'refuse', reason: String(e.message), fields: e.fields } : { op: 'refuse', reason: String(e && e.message) }));
          });
        });
      }
    }
    // ROUTE (world.ts, NSP-015 s19) — a Page Inputs in a page a Router built: the Router hands it the page's
    // params once the page's nodes exist (router.tsx :923-927), and again on a reset onto the same page (:528-531)
    if (type === 'PageInputs' && world) {
      const w = world;
      const hand = (p: Record<string, unknown>) => (node as unknown as { _setPageParams(p: Record<string, unknown>): void })._setPageParams({ ...p });
      for (const p of w.router.pages) {
        if (p.at > 0) w.clock.schedule(p.at, () => hand(p.params));
        else hand(p.params);
      }
    }
    return h;
  }

  /** PERSON (above): the nodes on the page right now. */
  const onPage = new Set<State>();

  /**
   * NSP-016 s59 — a Repeater's page, by handle id: the Group it sits in (a real one in its scope — the `target` it adds its rows to,
   * foreach.tsx `updateTarget`) and the row templates its placing registered (repeater.ts THE PLAY'S PROJECT).
   */
  const repeaters = new Map<string, { group: RuntimeNode & { cachedChildren?: unknown }; models: string[] }>();

  /**
   * NSP-016 s59 — THE PLAY'S PROJECT a Repeater builds rows from: each row template registered as the app's project registers a
   * component (the context's table, as `installPopups` and a Component Stack's page do) — its ports, its nodes with their parameters,
   * its wires and its roots — and the Group it sits in, made in its scope and named its parent (`setNodeModel` → `updateTarget`)
   * before its parameters are set, as a loaded project does.
   *
   * What used to throw inside the Repeater's queue — building a component the project does not have, a Script whose component is not
   * text, a rebuild whose Items hold a `null` — is caught by the Repeater since P109 ISL-049 (row C128): the face once handed back a
   * promise that never settled there, standing in for the rejection that stopped the queue. Every build and rebuild is the runtime's own.
   */
  function repeaterParent(node: RuntimeNode, scope: InstanceType<typeof NodeScope>, id: string): void {
    const models = (context as unknown as { componentModels: Record<string, unknown> }).componentModels;
    const made: string[] = [];
    type Model = { nodes: Record<string, unknown>; connections: unknown[]; roots: string[]; addInputPort(p: unknown): void; addOutputPort(p: unknown): void };
    const port = (plug: 'input' | 'output', [name, kind]: [string, string]) => ({ name, plug, type: kind === 'signal' ? { name: 'signal' } : '*' });
    for (const [name, t] of Object.entries(REPEATER_TEMPLATES)) {
      if (Object.prototype.hasOwnProperty.call(models, name)) continue;
      const model = new ComponentModel(name) as unknown as Model;
      for (const e of Object.entries(t.inputs)) model.addInputPort(port('input', e));
      for (const e of Object.entries(t.outputs)) model.addOutputPort(port('output', e));
      for (const [nid, n] of Object.entries(t.nodes)) {
        const nm = NodeModel.createFromExportData({ id: nid, type: n.type, parameters: { ...(n.params ?? {}) } } as never) as unknown as { component?: unknown; id: string };
        nm.component = model;
        model.nodes[nm.id] = nm;
      }
      for (const w of t.wires) {
        const from = parseEndpoint(w.from);
        const to = parseEndpoint(w.to);
        model.connections.push({ sourceId: from.node, sourcePort: from.port, targetId: to.node, targetPort: to.port });
      }
      for (const r of t.roots) model.roots.push(r);
      models[name] = model;
      made.push(name);
    }
    const group = context.nodeRegister.createNode('Group', `${id}/parent`, scope as never) as unknown as RuntimeNode & { cachedChildren?: unknown };
    scope.nodes[group.id] = group as never;
    const n = node as unknown as { updateTarget(id: string): void };
    n.updateTarget(group.id);
    repeaters.set(id, { group, models: made });
  }

  /** PERSON (above, NSP-016 s59) — the element of the row a Repeater drew at place `value` in its parent, if it is on the page. */
  function rowElement(s: State, value: unknown): any {
    const r = repeaters.get(s.h.id);
    if (!r || typeof value !== 'number') return null;
    const el = (r.group as unknown as { getDOMElement(): any }).getDOMElement();
    if (!el || !el.isConnected) return null;
    return el.children[value] ?? null;
  }

  /**
   * PERSON (above) — renders the node's real component into the page, under a holder standing for the
   * root Group that holds a lone node. The page's globals go on the host with the first node on it and
   * come off with the last (`takeOffPage`).
   */
  function putOnPage(s: State): void {
    const d = ensureDom();
    if (!domInstalled) domInstalled = installPage(world?.location);
    const node = s.h.node as unknown as {
      render(): unknown;
      parent?: unknown;
      getDOMElement(): unknown;
    };
    const container = d.document.createElement('div');
    d.document.body.appendChild(container);
    // viewer.jsx :457 — the app root's click capture feeds the focus tracker
    container.addEventListener('click', (e: { target: unknown }) => focusTracker.onClickCapture(e.target), true);
    const page: Page = { container, root: d.createRoot(container), host: null };
    // on the page at once, so a first render that throws can still be taken off it (`takeOffPage`)
    s.page = page;
    onPage.add(s);
    // NSP-016 s42 — the page's other nodes: a Radio Button Group's buttons (radiobuttongroup.ts `PAGE_VALUES`), or, for a node that
    // needs `group` (world.ts GROUP), the group it sits in and its siblings. Each button a real Radio Button made in the node's
    // scope, its Value set as a loaded project sets a parameter (none for `undefined`), added through the group's own `addChild`
    // (which schedules Children Count, react-component-node.ts :1611-1620) before the first render.
    const spec = specFor(s.h.type);
    const values = (spec?.acts?.pick?.values ?? []) as readonly unknown[];
    const scope = (s.h.node as unknown as { nodeScope: never }).nodeScope;
    const button = (value: unknown, i: number) => {
      const child = context.nodeRegister.createNode('net.noodl.controls.radiobutton', `${s.h.id}/button${i}`, scope) as unknown as RuntimeNode;
      if (value !== undefined) (child as unknown as NodeInstance).setInputValue('value', value);
      return { node: child, value };
    };
    type Holder = { render(): unknown; parent?: unknown; addChild(c: unknown): void };
    let root: Holder = node as unknown as Holder;
    if (s.h.type === 'Radio Button Group') {
      page.children = values.map((value, i) => {
        const b = button(value, i);
        root.addChild(b.node);
        return b;
      });
    } else if (s.h.type === 'Group') {
      // NSP-016 s52 — a Group's children (group.ts THE CHILDREN, `acts.tap.values`): each a real Text in the node's scope, its text and
      // Position set as a loaded project sets parameters, added with the Group's own `addChild` before the first render
      const children = (spec?.acts?.tap?.values ?? []) as ReadonlyArray<{ text?: unknown; position?: unknown }>;
      page.children = children.map((value, i) => {
        const child = context.nodeRegister.createNode('Text', `${s.h.id}/child${i}`, scope) as unknown as RuntimeNode;
        if (value.text !== undefined) (child as unknown as NodeInstance).setInputValue('text', value.text);
        if (value.position !== undefined) (child as unknown as NodeInstance).setInputValue('position', value.position);
        root.addChild(child);
        return { node: child, value };
      });
    } else if (s.h.type === 'Drag') {
      // NSP-016 s55 — the Drag's child (drag.ts THE CHILD): one real Group in the node's scope, added with the Drag's own `addChild`
      // before the first render — the element the Drag moves. A Drag draws only its first child (row C103), so one is its page
      const child = context.nodeRegister.createNode('Group', `${s.h.id}/child0`, scope) as unknown as RuntimeNode;
      root.addChild(child);
      page.children = [{ node: child, value: 'child' }];
    } else if (s.h.type === 'Page Stack') {
      // NSP-016 s56 — the components a Component Stack can build (navigation-stack.ts THE PAGES): each a component the project has,
      // holding one Pop Component Stack and nothing else, registered as the app's project registers one (the context's table, as
      // `installPopups` does) before the first render; gone with the page. And the page's clock: a transition reads
      // `window.performance.now()` (transitions/transition.ts) — jsdom's runs on the wall clock, so for the play it is the world's
      const models = (context as unknown as { componentModels: Record<string, unknown> }).componentModels;
      page.models = [];
      for (const name of STACK_PAGES) {
        if (Object.prototype.hasOwnProperty.call(models, name)) continue;
        const model = new ComponentModel(name) as unknown as { nodes: Record<string, unknown> };
        const pop = NodeModel.createFromExportData({ id: `${name}/back`, type: 'PageStackNavigateBack', parameters: {} } as never) as unknown as { component?: unknown; id: string };
        pop.component = model;
        model.nodes[pop.id] = pop;
        models[name] = model;
        page.models.push(name);
      }
      // a request that throws while it builds (navigation-stack.tsx `navigateAsync`, `resetAsync` — rows C107, C108, C110) rejects the
      // promise its `navigate` / `reset` never awaits: in a browser an "Uncaught (in promise)" line in the console, and the queue runs on
      // (async-queue.ts :62-76). The face takes the line; nothing reaches the trace
      const queue = (node as unknown as { _internal: { asyncQueue: { enqueue(t: unknown): Promise<unknown> } } })._internal.asyncQueue;
      const enqueue = queue.enqueue.bind(queue);
      queue.enqueue = (t: unknown) => {
        const p = enqueue(t);
        p.catch(() => undefined);
        return p;
      };
      const perf = d.window.performance as { now(): number };
      if (world) {
        const w = world;
        const own = Object.getOwnPropertyDescriptor(perf, 'now');
        perf.now = () => w.clock.now();
        page.restoreClock = () => {
          if (own) Object.defineProperty(perf, 'now', own);
          else delete (perf as { now?: unknown }).now;
        };
      }
    } else if (s.h.type === 'Router') {
      // NSP-016 s57 — THE PROJECT a Page Router reads (page-router.ts): its page components, registered as the app's project
      // registers one (the context's table) before the first render, each holding its Page nodes and Page Inputs; and its PAGE INDEX
      // (`graphModel.routerIndex`, router-handler.ts :114-141) — the four pages, and this node by the Name it was placed with and its
      // Pages as they are now (the editor sends the index again with every Pages edit). Gone with the page.
      const models = (context as unknown as { componentModels: Record<string, unknown> }).componentModels;
      page.models = [];
      for (const p of ROUTER_PAGES) {
        if (Object.prototype.hasOwnProperty.call(models, p.component)) continue;
        const model = new ComponentModel(p.component) as unknown as { nodes: Record<string, unknown> };
        const add = (id: string, type: string) => {
          const n = NodeModel.createFromExportData({ id: `${p.component}/${id}`, type, parameters: {} } as never) as unknown as { component?: unknown; id: string };
          n.component = model;
          model.nodes[n.id] = n;
        };
        for (let i = 0; i < p.pageNodes; i++) add(`page${i}`, 'Page');
        for (let i = 0; i < p.pageInputs; i++) add(`inputs${i}`, 'PageInputs');
        models[p.component] = model;
        page.models.push(p.component);
      }
      const graphModel = (rt as unknown as { graphModel: { routerIndex?: unknown } }).graphModel;
      const savedIndex = Object.getOwnPropertyDescriptor(graphModel, 'routerIndex');
      const placedName = (node as unknown as { model: { parameters: Record<string, unknown> } }).model.parameters.name;
      const internal = (node as unknown as { _internal: { pages?: unknown } })._internal;
      Object.defineProperty(graphModel, 'routerIndex', {
        configurable: true,
        // the exporter lists every Router, an unnamed one as Main (noodl-editor utils/exporter/router.ts `getRouterIndex`, P109-S18),
        // and a page once per Page node — `Twice`'s second entry is the first's twin, and the lookup takes the first
        get: () => ({ routers: [{ name: placedName || 'Main', pages: internal.pages }], pages: ROUTER_PAGES.map((x) => ({ component: x.component, path: x.path, title: x.title })) })
      });
      page.restoreIndex = () => {
        if (savedIndex) Object.defineProperty(graphModel, 'routerIndex', savedIndex);
        else delete graphModel.routerIndex;
      };
      // what the router hands each Page Inputs of a page it built (router.tsx :604, :926-931): an `answer` event, op `page`, at the call
      const nodeScope = (node as unknown as { nodeScope: { createNode(...a: unknown[]): Promise<{ nodeScope: { getNodesWithType(t: string): Array<{ _setPageParams(p: unknown): void }> } }> } }).nodeScope;
      const create = nodeScope.createNode.bind(nodeScope);
      nodeScope.createNode = (...a: unknown[]) =>
        create(...a).then((content) => {
          for (const pi of content.nodeScope.getNodesWithType('PageInputs')) {
            const set = pi._setPageParams.bind(pi);
            pi._setPageParams = (params: unknown) => {
              s.frame.location.push({ t: 'answer', op: 'page', params: canonicalise(params) ?? null });
              set(params);
            };
          }
          return content;
        });
      // a request that throws while it builds rejects the promise its `navigate` / `reset` never awaits (async-queue.ts :55-76): in a
      // browser a console line, and the queue runs on. The face takes the line; nothing reaches the trace
      const queue = (node as unknown as { _internal: { asyncQueue: { enqueue(t: unknown): Promise<unknown> } } })._internal.asyncQueue;
      const enqueue = queue.enqueue.bind(queue);
      queue.enqueue = (t: unknown) => {
        const p = enqueue(t);
        p.catch(() => undefined);
        return p;
      };
    } else if (s.h.type === 'For Each') {
      // NSP-016 s59 — the Repeater joins its parent's children (nodescope.ts `insertNodeInTree`, after its parameters), and the page
      // renders the parent: the Repeater draws nothing itself (`ForEachComponent`), its rows are the parent's children after it. And the
      // page's clock: chunked creation reads `performance.now()` (foreach.tsx `_runQueueOperations`) — jsdom's runs on the wall clock,
      // so for the play it is the world's, which does not move while the node works
      const r = repeaters.get(s.h.id)!;
      (r.group as unknown as Holder).addChild(node);
      root = r.group as unknown as Holder;
      page.models = r.models;
      const perf = d.window.performance as { now(): number };
      if (world) {
        const w = world;
        const own = Object.getOwnPropertyDescriptor(perf, 'now');
        perf.now = () => w.clock.now();
        page.restoreClock = () => {
          if (own) Object.defineProperty(perf, 'now', own);
          else delete (perf as { now?: unknown }).now;
        };
      }
    } else if (s.h.type === 'net.noodl.visual.columns') {
      // NSP-016 s60 — two children (columns.ts THE CHILDREN): real Groups in the node's scope, added with its own `addChild` before the
      // first render — a Columns with none draws nothing to lay out. And THE LAYOUT (above): the page's width and the observer that reports it
      for (let i = 0; i < 2; i++) {
        const child = context.nodeRegister.createNode('Group', `${s.h.id}/child${i}`, scope) as unknown as RuntimeNode;
        root.addChild(child);
        (page.children ??= []).push({ node: child, value: i });
      }
      const layout: Layout = { width: START_WIDTH, observations: [], restore: () => undefined };
      class PageResizeObserver {
        constructor(readonly callback: (entries: unknown[], observer: unknown) => void) {}
        observe(el: any) {
          Object.defineProperty(el, 'offsetWidth', { configurable: true, get: () => layout.width });
          layout.observations.push({ observer: this, el });
        }
        unobserve(el: unknown) {
          layout.observations = layout.observations.filter((o) => !(o.observer === this && o.el === el));
        }
        disconnect() {
          layout.observations = layout.observations.filter((o) => o.observer !== this);
        }
      }
      layout.restore = installGlobals({ ResizeObserver: PageResizeObserver });
      page.layout = layout;
    } else if (spec?.needs?.includes('group') && world?.group.present) {
      const group = context.nodeRegister.createNode('Radio Button Group', `${s.h.id}/group`, scope) as unknown as RuntimeNode & Holder;
      // the group's Value parameter at load, then the node, then its siblings — the order a loaded project builds them
      if (world.group.load) (group as unknown as NodeInstance).setInputValue('value', world.group.load.value);
      group.addChild(node);
      page.children = values.map((value, i) => {
        const b = button(value, i);
        group.addChild(b.node);
        return b;
      });
      // the graph writing the group's Value later, each at its time on the clock (inside the `advance` that reaches it)
      for (const w of world.group.writes) world.clock.schedule(w.at, () => (group as unknown as NodeInstance).setInputValue('value', w.value));
      page.group = group;
      root = group;
    }
    // what `getVisualParentNode` reads of the Group holding a lone node (react-component-node.ts :2061-2062): the
    // layout it lays children out in (NoodlReactComponent :1070-1075) and the re-render a Mounted change asks for
    // (:2310-2320 `parent.cachedChildren = undefined; parent.forceUpdate()`)
    root.parent = {
      props: { layout: 'column' },
      // :1843 — `setStyle` reads the holder's `style.flexDirection` to place a child in it; a root Group lays out a column
      style: { flexDirection: 'column' },
      cachedChildren: undefined,
      children: [],
      innerReactComponentRef: null,
      contains: () => false,
      getVisualParentNode: () => undefined,
      // a node's `forceUpdate` renders at the frame's end (react-component-node.ts :1675-1689); the holder's does the same
      forceUpdate: () => {
        context.eventEmitter.once('frameEnd', () => page.host?.forceUpdate());
        context.scheduleUpdate();
      }
    };
    const React = d.React;
    class Host extends React.Component {
      render() {
        return root.render() ?? null;
      }
    }
    void d.act(() => {
      page.root.render(React.createElement(Host, { ref: (r: Page['host']) => (page.host = r) }));
    });
    // NSP-016 s51 — the cards a person picks up and carries onto the node (text.ts THE ZONE SIDE; `acts.grab.values`). Face choices,
    // written down: each card is drawn first and armed after (Draggable, then its Drag Value and Drag Kind), so its element has
    // drag-drop.ts's tabindex before the play's first step — a card's own arming is the card's spec, not this node's
    const cards = (spec?.acts?.grab?.values ?? []) as ReadonlyArray<{ dragValue?: unknown; dragKind?: unknown }>;
    page.cards = cards.map((card, i) => {
      const n = context.nodeRegister.createNode('Text', `${s.h.id}/card${i}`, scope) as unknown as RuntimeNode & Holder;
      const box = d.document.createElement('div');
      d.document.body.appendChild(box);
      const cardRoot = d.createRoot(box);
      let cardHost: Page['host'] = null;
      n.parent = {
        props: { layout: 'column' },
        style: { flexDirection: 'column' },
        cachedChildren: undefined,
        children: [],
        innerReactComponentRef: null,
        contains: () => false,
        getVisualParentNode: () => undefined,
        forceUpdate: () => {
          context.eventEmitter.once('frameEnd', () => cardHost?.forceUpdate());
          context.scheduleUpdate();
        }
      };
      class CardHost extends React.Component {
        render() {
          return n.render() ?? null;
        }
      }
      void d.act(() => {
        cardRoot.render(React.createElement(CardHost, { ref: (r: Page['host']) => (cardHost = r) }));
      });
      const set = (port: string, v: unknown) => (n as unknown as NodeInstance).setInputValue(port, v);
      set('text', `card ${i}`);
      set('draggable', true);
      if (card.dragValue !== undefined) set('dragValue', card.dragValue);
      if (card.dragKind !== undefined) set('dragKind', card.dragKind);
      return { node: n, value: card, root: cardRoot, container: box };
    });
    s.page = page;
    onPage.add(s);
  }

  /** PERSON (above) — the node leaves the page: its component unmounts (Will Unmount fires, as in the app); the globals come off after its teardown (`releasePage`). */
  function takeOffPage(s: State): void {
    const page = s.page;
    if (!page) return;
    const d = ensureDom();
    void d.act(() => {
      page.root.unmount();
    });
    page.container.remove();
    for (const c of page.cards ?? []) {
      void d.act(() => {
        c.root.unmount();
      });
      c.container.remove();
    }
    // the children go with the page: off it already, their teardown cannot reach a render
    for (const n of [...(page.children ?? []).map((c) => c.node), ...(page.cards ?? []).map((c) => c.node), ...(page.group ? [page.group] : [])]) {
      try {
        n._onNodeDeleted();
      } catch {
        // a page node's teardown assumes nothing of the play; what it raises is not the node's
      }
    }
    if (page.group) (page.group as unknown as { parent?: unknown }).parent = undefined;
    // NSP-016 s56 — a Component Stack's components and the page's clock go with the page
    const models = (context as unknown as { componentModels: Record<string, unknown> }).componentModels;
    for (const name of page.models ?? []) delete models[name];
    page.restoreClock?.();
    page.restoreIndex?.();
    page.layout?.restore();
    (s.h.node as unknown as { parent?: unknown }).parent = undefined;
    s.page = undefined;
    onPage.delete(s);
  }

  /**
   * PERSON (above) — the page's globals come off the host with the last node on it. NSP-016 s43: AFTER the node's own teardown
   * (`dispose`), not with its page — a node deleted in an app is deleted in a page that still has a `document`, and a delete
   * listener that reaches it (drag-drop.ts `forget` → `cancel` → `finish`, for a gesture the play left lifted) threw part-way
   * here, so the module's gesture outlived the play and the NEXT play's keys went to it.
   */
  function releasePage(): void {
    if (onPage.size === 0 && domInstalled) {
      domInstalled();
      domInstalled = undefined;
    }
  }

  /**
   * PERSON (above) — the page paints what the node holds, as a browser does before a person can act. NSP-016 s42: a page whose root
   * is the node's GROUP drops the group's memoised children first (`cachedChildren`, react-component-node.ts :1782-1800), so the node
   * renders from what it holds now — as the frame's end would render it — and not from the element the group last built.
   */
  function paint(s: State): void {
    const d = ensureDom();
    if (s.page?.group) s.page.group.cachedChildren = undefined;
    const r = repeaters.get(s.h.id);
    if (r) r.group.cachedChildren = undefined;
    void d.act(() => {
      s.page?.host?.forceUpdate();
    });
  }

  /**
   * NSP-016 s60 — THE LAYOUT (above): the browser's rendering step reports each observation whose width it has not reported yet — one
   * callback per observer, with its entries, as a browser delivers them.
   */
  function layOut(s: State): void {
    const layout = s.page?.layout;
    if (!layout) return;
    const due = layout.observations.filter((o) => o.last !== layout.width);
    for (const o of due) o.last = layout.width;
    for (const observer of new Set(due.map((o) => o.observer))) {
      const entries = due.filter((o) => o.observer === observer).map((o) => ({ target: o.el, contentRect: { width: layout.width, height: 0 } }));
      observer.callback(entries, observer);
    }
  }

  /**
   * PERSON (above) — what a person doing `act` raises on the element they see, as a browser raises it. A mouse
   * button down ends in the browser's default action — the keyboard onto a focusable target — unless a handler
   * cancelled it; `click` is the press, the release and the click; a finger is the touch events; the keyboard
   * acts are `focus()` / `blur()`, answered by the focusing steps. Off the page there is nothing to act on.
   *
   * NSP-016 s43 — two more of the browser's rules. (1) THE HIT TEST: a pointer act lands on the element under the pointer, and an
   * element with `pointer-events: none` or `visibility: hidden` (both inherited; jsdom computes both) is never that element — the
   * act lands on the nearest ancestor that is (`underPointer`), which carries none of the node's handlers. (2) POINTER EVENTS: a
   * browser raises `pointerdown` / `pointerup` (with `pointerType` and `pointerId`) before the compatibility events — `mousedown`,
   * `mouseup`, `click` for a mouse, `touchstart` / `touchend` for a finger; jsdom has no `PointerEvent`, so they are `MouseEvent`s
   * carrying the three fields (a document listener reads them — drag-drop.ts). A disabled control is withheld the mouse's
   * compatibility events, as before, not the pointer events. What the pointer is over is the element the last pointer act landed
   * on: `document.elementFromPoint` answers it (`pointerAt`) — jsdom has none, and the face has no geometry; an act names WHAT is
   * under the pointer, never where. Face choices, written down: an act's pointer has no position — only a `move` would carry one
   * past a slop; a hover or a leave raises no `pointermove`; an element that becomes hidden under the pointer raises no leave.
   */
  function personActs(s: State, act: string, value: unknown): void {
    const d = ensureDom();
    const w = d.window;
    // NSP-016 s56 — THE CALLERS: another node's request to a Component Stack, not a person's gesture
    if (act === 'push' || act === 'replace' || act === 'back') return stackActs(s, act, value);
    // NSP-016 s57 — a Navigate's request to a Page Router, and the person's Back or Forward
    if (act === 'navigate' || act === 'traverse') return routerActs(s, act, value);
    // NSP-016 s42 — a `pick` acts on the CHILD whose Value is the act's (a Radio Button Group's button): the control a person sees
    // inside it; a Value no child carries, or a child off the page, is nothing to act on
    // NSP-016 s52 — a `tap` acts on the CHILD it names (a Group's, group.ts THE CHILDREN); a `clickAway` on the page beside the node
    const el = act === 'pick' ? pickedElement(s, value) : act === 'tap' ? childElement(s, value) : act === 'tapRow' ? rowElement(s, value) : act === 'clickAway' ? s.page?.container : ownElement(s);
    // NSP-016 s50 — a drag from the desktop goes on over whatever is on the page, the node's element or not
    if (act === 'fileEnter' || act === 'fileLeave' || act === 'fileDrop') return fileActs(act, value, el ? underPointer(w, el) : d.document.body);
    // NSP-016 s51 — a card beside the node, and the pointer off everything: acts on the page, the node's element or not
    if (act === 'grab' || act === 'pickUp' || act === 'away') return cardActs(s, act, value);
    // NSP-016 s55 — a pointer WITH A POSITION (drag.ts THE GESTURE): pressed on the node's element, moved and let go anywhere
    if (act === 'pressAt' || act === 'moveTo' || act === 'releaseAt') return positionedAct(act, value, el);
    // NSP-016 s60 — the page laid out again at another width (THE LAYOUT above): not a person's gesture on an element
    if (act === 'resize') {
      if (s.page?.layout && typeof value === 'number') s.page.layout.width = value;
      return layOut(s);
    }
    if (!el) return;
    // NSP-016 s53 — the browser finishes fetching the picture an `<img>` names (image.ts `fetched`): its `load` or `error` event on the
    // element, which React hears there. jsdom fetches nothing, so the face is the browser. Face choice, written down: a browser fetches
    // only for an element with a `src`, or a `srcset` that is not empty — with neither there is no fetch to finish, and the act is nothing
    // NSP-016 s54 — the browser's side of a `<video>`'s load and playback (THE MEDIA ELEMENT above)
    if (act === 'loaded' || act === 'failed' || act === 'progress' || act === 'ended') return mediaAct(w, el, act, value);
    if (act === 'fetched') {
      if (el.getAttribute('src') || el.getAttribute('srcset')) el.dispatchEvent(new w.Event(value === 'load' ? 'load' : 'error'));
      return;
    }
    const KEYBOARD = new Set(['focus', 'blur', 'type', 'key', 'choose', 'slide']);
    const hit = KEYBOARD.has(act) ? el : underPointer(w, el);
    if (!KEYBOARD.has(act)) pointerAt = hit;
    // NSP-016 s54 — an EMBED (a Video's `<iframe>`) is another page inside this one: what lands on it goes to that page, and nothing
    // here hears it. A press or a click there puts the keyboard on the `<iframe>` (its mousedown's default action); a key goes into
    // it once the keyboard is there. What a person does there is still this page's activation (HTML passes it to the ancestors)
    if (hit === el && el.tagName === 'IFRAME' && act !== 'focus' && act !== 'blur') {
      if (act === 'press' || act === 'click') {
        activated = true;
        el.focus();
        return;
      }
      if (act === 'lift') activated = true;
      if (act !== 'key') return;
      el.focus();
      if (d.document.activeElement === el) {
        if (value !== 'Escape') activated = true;
        return;
      }
    }
    const mouse = (type: string, init: Record<string, unknown> = {}) => hit.dispatchEvent(new w.MouseEvent(type, { bubbles: true, cancelable: true, composed: true, button: 0, ...init }));
    const touch = (type: string) => hit.dispatchEvent(new w.TouchEvent(type, { bubbles: true, cancelable: true, composed: true }));
    const pointer = (type: string, pointerType: 'mouse' | 'touch') => {
      const e = new w.MouseEvent(type, { bubbles: true, cancelable: true, composed: true, button: 0, buttons: type === 'pointerdown' ? 1 : 0 });
      Object.defineProperty(e, 'pointerType', { value: pointerType });
      Object.defineProperty(e, 'pointerId', { value: pointerType === 'mouse' ? 1 : 2 });
      Object.defineProperty(e, 'isPrimary', { value: true });
      return hit.dispatchEvent(e);
    };
    // the browser's rule, not the component's: a DISABLED form control is dispatched no click, mousedown or mouseup from
    // a person (HTML: a disabled control's click events from the user interaction task source are not dispatched;
    // Chromium withholds mousedown / mouseup the same way, and delivers mouseover / mouseout and the touch events). jsdom
    // has no user interaction task source — a dispatched click would reach the control and even run a checkbox's
    // toggle — so the face withholds them here. Hover and touch go through, to whatever handler is there.
    const disabled = !!hit.disabled;
    const press = () => {
      pointer('pointerdown', 'mouse');
      if (disabled) return;
      const notCancelled = mouse('mousedown');
      if (notCancelled) hit.focus();
    };
    // NSP-016 s52 — a press as a BROWSER focuses (`tap`, `clickAway`): the mousedown's default action runs the focusing steps on the
    // nearest focusable ancestor of what it landed on (here: one with a tabindex a person can see), else on the viewport — the
    // keyboard comes off whatever held it. (`press` and `click` keep s37's rule — the element the act names, or nothing — which the
    // specs before the Group were written against.)
    const browserPress = () => {
      pointer('pointerdown', 'mouse');
      if (!mouse('mousedown')) return;
      let f = hit.closest('[tabindex]');
      while (f && w.getComputedStyle(f).visibility !== 'visible') f = f.parentElement?.closest('[tabindex]') ?? null;
      if (f) {
        f.focus();
        return;
      }
      // the viewport takes it: jsdom's `blur()` does nothing on an element that is no longer focusable (its tabindex taken off
      // since it took the keyboard), where a browser's focusing steps move the keyboard off it all the same — so the element is
      // lent a tabindex for the blur
      const held = d.document.activeElement as any;
      if (!held || held === d.document.body) return;
      const lent = !held.hasAttribute('tabindex');
      if (lent) held.setAttribute('tabindex', '-1');
      held.blur();
      if (lent) held.removeAttribute('tabindex');
    };
    /** The keyboard acts: the keys go to whatever holds the keyboard once the act has tried to put it on the element. */
    const focused = () => {
      if (d.document.activeElement !== el) el.focus();
      return d.document.activeElement === el;
    };
    switch (act) {
      case 'hover':
        mouse('mouseover', { relatedTarget: d.document.body });
        break;
      case 'leave':
        mouse('mouseout', { relatedTarget: d.document.body });
        break;
      case 'press':
        press();
        break;
      case 'release':
        pointer('pointerup', 'mouse');
        if (!disabled) mouse('mouseup');
        break;
      case 'click':
      // NSP-016 s42 — a pick is a click on the picked child's control (`pickedElement`): the browser's rules for it are a click's
      case 'pick':
        press();
        pointer('pointerup', 'mouse');
        if (disabled) break;
        mouse('mouseup');
        mouse('click');
        break;
      // NSP-016 s52 — a click on a child inside the node, or on the page beside it: a click, with the browser's focusing rule
      case 'tap':
      // NSP-016 s59 — a click on a row a Repeater drew, as a click on a Group's child
      case 'tapRow':
      case 'clickAway':
        browserPress();
        pointer('pointerup', 'mouse');
        mouse('mouseup');
        mouse('click');
        break;
      case 'touch':
        pointer('pointerdown', 'touch');
        touch('touchstart');
        break;
      case 'lift':
        pointer('pointerup', 'touch');
        touch('touchend');
        break;
      // NSP-016 s50 — the pointer that is down moves across the element, past both of drag-drop.ts's slops (4 px for a mouse, 8 for a
      // held finger): a `pointermove` the window hears, then the compatibility event. Face choices, written down: the move is 10 px
      // from where every act's pointer is (0, 0) and stays over the element the act names; it raises no hover or leave
      case 'move': {
        const kind = value === 'touch' ? 'touch' : 'mouse';
        const e = new w.MouseEvent('pointermove', { bubbles: true, cancelable: true, composed: true, button: -1, buttons: 1, clientX: 10, clientY: 0 });
        Object.defineProperty(e, 'pointerType', { value: kind });
        Object.defineProperty(e, 'pointerId', { value: kind === 'mouse' ? 1 : 2 });
        Object.defineProperty(e, 'isPrimary', { value: true });
        hit.dispatchEvent(e);
        if (kind === 'mouse') mouse('mousemove', { clientX: 10, buttons: 1 });
        else touch('touchmove');
        break;
      }
      case 'focus':
        el.focus();
        break;
      case 'blur':
        el.blur();
        break;
      // NSP-016 s38 — the keyboard acts on a field (Text Input). The browser's rules, not the component's: a person types
      // into the field the keyboard is on (the focusing steps first, as a Tab's); a disabled field takes no key; each key
      // writes one character at the caret — the end, here — and raises `input`; the element's `maxlength` refuses a key
      // once the value is at it (text-like inputs and a textarea; never a Number field); a Number field refuses every
      // key but a digit (a sign, a point or an exponent mid-entry is a state jsdom and a browser disagree on — see the
      // Text Input spec); Enter's default action in a <textarea> writes a newline. The value is written through the
      // element's PROTOTYPE setter — past React's value tracker on the instance, as a keystroke is — so React's
      // `onChange` fires exactly when the value changed.
      case 'type':
        if (disabled || !focused()) break;
        for (const ch of Array.from(String(value))) typeKey(w, el, ch);
        break;
      case 'key': {
        if (disabled) break;
        // NSP-016 s43 — a key goes to the element that holds the keyboard: this one when it can take it, else whatever holds it
        // (a `<div>` with no tabindex takes none; the body then hears the key, and a document listener with it — drag-drop.ts)
        const to = focused() ? el : (d.document.activeElement ?? d.document.body);
        const key = String(value);
        const notCancelled = to.dispatchEvent(new w.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, composed: true }));
        if (notCancelled && key === 'Enter' && to === el && el.tagName === 'TEXTAREA') typeKey(w, el, '\n');
        to.dispatchEvent(new w.KeyboardEvent('keyup', { key, bubbles: true, cancelable: true, composed: true }));
        break;
      }
      // NSP-016 s39 — a pick on a `<select>` (Dropdown). The browser's rules, not the component's: a disabled element takes no
      // pick; a person can pick only an option the list offers and that is not disabled (the hidden empty option is disabled);
      // a pick is a keyboard pick here — the keyboard goes onto the element first (the focusing steps), as a Tab's would, and
      // the arrow keys move the selection; picking the option already selected raises no `change`. The value is written
      // through the element's PROTOTYPE setter (as the keyboard acts are) and `input` then `change` are raised, as a browser
      // raises them for a selection a person made.
      case 'choose': {
        if (disabled || el.tagName !== 'SELECT') break;
        const picked = String(value);
        const option = Array.from(el.options as ArrayLike<{ value: string; disabled: boolean }>).find((o) => o.value === picked && !o.disabled);
        if (!option || !focused()) break;
        if (el.value === picked) break;
        Object.getOwnPropertyDescriptor(w.HTMLSelectElement.prototype, 'value')!.set!.call(el, picked);
        el.dispatchEvent(new w.Event('input', { bubbles: true, composed: true }));
        el.dispatchEvent(new w.Event('change', { bubbles: true, composed: true }));
        break;
      }
      // NSP-016 s41 — a slide on an `<input type="range">` (Slider). The browser's rules, not the component's: a disabled element
      // takes no slide; a slide is a keyboard slide here — the keyboard goes onto the element first (the focusing steps), as a
      // Tab's would; the value lands as the BROWSER sanitizes it (`browserRangeValue`: jsdom clamps a range input's value but
      // never rounds it to the step, so the face does, and reads the value the element holds the same way); a slide to the
      // value already held raises nothing. Written through the element's PROTOTYPE setter (as the keyboard acts are), then
      // `input` and `change`, as a browser raises them for a value a person set. A REVERSED range (`max` below `min`) takes no
      // slide here — a face choice, written down: jsdom's sanitization of it does not settle (a value at or above `min` becomes
      // `max`, below `min` becomes `min`), so what the element holds depends on the history of React's writes, where HTML clamps
      // no overflow on a reversed range and Chromium raises `max` to `min`; jsdom and a browser disagree, as on a Number field's
      // sign mid-entry.
      case 'slide': {
        if (disabled || el.type !== 'range' || rangeReversed(el) || !focused()) break;
        const held = browserRangeValue(el, el.value);
        const to = browserRangeValue(el, value);
        if (held === to) break;
        Object.getOwnPropertyDescriptor(w.HTMLInputElement.prototype, 'value')!.set!.call(el, to);
        el.dispatchEvent(new w.Event('input', { bubbles: true, composed: true }));
        el.dispatchEvent(new w.Event('change', { bubbles: true, composed: true }));
        break;
      }
      default:
        throw new Error(`runtime: no person face for the act "${act}"${value === undefined ? '' : ` (${JSON.stringify(value)})`}`);
    }
  }

  /**
   * PERSON (above, NSP-016 s51) — the cards beside the node (`page.cards`) and the pointer off everything. `grab`: the mouse goes down on
   * the card named (its Drag Value and Drag Kind) — `pointerdown`, `mousedown` and, not cancelled, the keyboard onto it — then moves
   * across it past the mouse's slop (a `pointermove` the window hears, then `mousemove`), and the pointer is over the card. `pickUp`: the
   * keyboard onto the card, then Space (`keydown`, `keyup`). `away`: the mouse, or the finger that is down, moves past both slops onto
   * nothing — the page's body — and the pointer is over that. Face choices, written down: as `move`, 10 px from (0, 0); a card is never
   * hidden, so its acts need no hit test; a card that is not on the page, or one the act does not name, is nothing to act on.
   */
  function cardActs(s: State, act: string, value: unknown): void {
    const d = ensureDom();
    const w = d.window;
    const pointerEvent = (on: any, type: string, kind: 'mouse' | 'touch', init: Record<string, unknown>) => {
      const e = new w.MouseEvent(type, { bubbles: true, cancelable: true, composed: true, button: 0, ...init });
      Object.defineProperty(e, 'pointerType', { value: kind });
      Object.defineProperty(e, 'pointerId', { value: kind === 'mouse' ? 1 : 2 });
      Object.defineProperty(e, 'isPrimary', { value: true });
      return on.dispatchEvent(e);
    };
    if (act === 'away') {
      const kind = value === 'touch' ? 'touch' : 'mouse';
      const body = d.document.body;
      pointerAt = body;
      pointerEvent(body, 'pointermove', kind, { button: -1, buttons: 1, clientX: 10, clientY: 0 });
      if (kind === 'mouse') body.dispatchEvent(new w.MouseEvent('mousemove', { bubbles: true, cancelable: true, composed: true, clientX: 10, buttons: 1 }));
      else body.dispatchEvent(new w.TouchEvent('touchmove', { bubbles: true, cancelable: true, composed: true }));
      return;
    }
    const named = JSON.stringify(value);
    const card = s.page?.cards?.find((c) => JSON.stringify(c.value) === named);
    const el = card && elementSeen(card.node as unknown as { getDOMElement(): unknown });
    if (!el || !el.isConnected) return;
    if (act === 'grab') {
      pointerAt = el;
      pointerEvent(el, 'pointerdown', 'mouse', { buttons: 1 });
      if (el.dispatchEvent(new w.MouseEvent('mousedown', { bubbles: true, cancelable: true, composed: true, button: 0 }))) el.focus();
      pointerEvent(el, 'pointermove', 'mouse', { button: -1, buttons: 1, clientX: 10, clientY: 0 });
      el.dispatchEvent(new w.MouseEvent('mousemove', { bubbles: true, cancelable: true, composed: true, clientX: 10, buttons: 1 }));
      return;
    }
    el.focus();
    el.dispatchEvent(new w.KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true, composed: true }));
    el.dispatchEvent(new w.KeyboardEvent('keyup', { key: ' ', bubbles: true, cancelable: true, composed: true }));
  }

  /**
   * PERSON (above, NSP-016 s50) — a file dragged from the desktop, as a browser runs the drag (HTML's drag-and-drop processing model).
   * At each act the browser first moves the drag's target to the element under the pointer (`at`, after the hit test): a `dragleave`
   * at the one it was over, then a `dragenter` at the new one; then a `dragover` there. `fileEnter` starts a drag carrying the act's
   * files when none is under way (no file: a drag of something else, text); `fileLeave` takes it off the element and out of the
   * window (a `dragleave`, and the drag is gone); `fileDrop` lets it go — a `drop` at the target when its last `dragover` was
   * cancelled, else a `dragleave` there instead — and the drag is over. jsdom has no `DragEvent` or `DataTransfer`: each event is a
   * `MouseEvent` carrying a stand-in `dataTransfer` (`types` holds `Files` exactly when it carries a file), which React reads off
   * the native event. An event at an element no longer on the page reaches no handler, as in a browser.
   */
  function fileActs(act: string, value: unknown, at: any): void {
    const w = ensureDom().window;
    if (act === 'fileEnter' && !fileDrag) fileDrag = { files: Array.isArray(value) ? value : [], over: null };
    const drag = fileDrag;
    if (!drag) return;
    const transfer = { types: drag.files.length > 0 ? ['Files'] : ['text/plain'], files: drag.files, dropEffect: 'none', effectAllowed: 'all', getData: () => '' };
    const fire = (type: string, on: any) => {
      const e = new w.MouseEvent(type, { bubbles: true, cancelable: type !== 'dragleave', composed: true });
      Object.defineProperty(e, 'dataTransfer', { value: transfer });
      return on.dispatchEvent(e);
    };
    const moveTo = (to: any) => {
      if (drag.over === to) return;
      if (drag.over) fire('dragleave', drag.over);
      drag.over = to;
      if (to) fire('dragenter', to);
    };
    if (act === 'fileLeave') {
      moveTo(null);
      fileDrag = undefined;
      return;
    }
    moveTo(at);
    const taken = !fire('dragover', at);
    if (act !== 'fileDrop') return;
    fire(taken ? 'drop' : 'dragleave', at);
    fileDrag = undefined;
  }

  /**
   * NSP-016 s56 — THE CALLERS (navigation-stack.ts): a request another node hands the Component Stack, and the stack's answer, each
   * an `answer` event in the LOCATION group when the stack makes it. A caller hands its request at ITS frame's end (navigate.ts and
   * navigate-back.ts `scheduleNavigate` → `scheduleAfterInputsHaveUpdated`), so the face schedules it on the stack's own frame-end list —
   * in the order of the frame's steps with the stack's own frame-end work (a Reset), and with no microtask between two requests, as
   * in an app. A `push` or a `replace` (`{ stack?, target?, params?, transition? }`) then goes through the play's REAL
   * `NavigationHandler` (`installStacks`) under the name it carries (navigate.ts :176-231) — past the handler's own recording, which is
   * the CALLER's `stack` event, not the stack's — with `params` and `transition` copies (a transition clamps its timing curve in place);
   * a push hands a back callback, which records what the stack hands it at a pop (`returned`). A `back` (`{ action?, results? }`) is the
   * Pop Component Stack in the top page as the person sees it at the act: the callback the stack installed on it when it pushed the page
   * (navigation-stack.tsx :981-991), called at the frame's end with the action and the results a Pop hands (navigate-back.ts :154-157) —
   * a page the stack did not push has none, and one deleted by then asks nothing.
   */
  function stackActs(s: State, act: 'push' | 'replace' | 'back', value: unknown): void {
    type Args = { stack?: unknown; target?: unknown; params?: Record<string, unknown>; transition?: Record<string, unknown>; action?: unknown; results?: unknown };
    const v = (value ?? {}) as Args;
    const node = s.h.node as unknown as { scheduleAfterInputsHaveUpdated(cb: () => void): void; _internal: { stack?: Array<{ page: Page }> } };
    type Page = { _deleted?: boolean; getChildren(): Content[] };
    type Pop = { _internal: { backCallback?: (a: { backAction: unknown; results: unknown }) => { ok: boolean; unchanged?: true; code?: string } | undefined } };
    type Content = { nodeScope?: { getNodesWithType(type: string): Pop[] } };
    const answer = (op: 'push' | 'replace' | 'back', outcome: 'done' | 'unchanged' | 'failure', code?: string) =>
      s.frame.location.push(outcome === 'failure' ? { t: 'answer', op, value: outcome, error: code || OUTCOME_UNSPECIFIED } : { t: 'answer', op, value: outcome });
    if (act === 'back') {
      const stack = node._internal.stack ?? [];
      const page = stack[stack.length - 1]?.page;
      const callback = page?.getChildren()[0]?.nodeScope?.getNodesWithType('PageStackNavigateBack')[0]?._internal.backCallback;
      if (!page || !callback) return;
      node.scheduleAfterInputsHaveUpdated(() => {
        if (page._deleted) return;
        // a throw inside the stack's back (navigation-stack.tsx :1060 `_findPage` on a page the Components list no longer has) is the
        // Pop's frame-end callback throwing: the runtime's update loop logs it (nodecontext.ts `updateDirtyNodes`), nothing is answered
        let r: ReturnType<typeof callback>;
        try {
          r = callback({ backAction: v.action, results: v.results ?? {} });
        } catch {
          return;
        }
        if (!r || r.ok) answer('back', 'done');
        else if (r.unchanged) answer('back', 'unchanged');
        else answer('back', 'failure', r.code);
      });
      return;
    }
    const proto = (NavigationHandler as unknown as { prototype: Record<'navigate' | 'replace', (name: unknown, args: unknown) => void> }).prototype;
    const op = act;
    const args = {
      target: v.target,
      params: { ...(v.params ?? {}) },
      transition: JSON.parse(JSON.stringify(v.transition ?? {})),
      ...(act === 'push'
        ? {
            backCallback: (action: unknown, results: unknown) => {
              const e: TraceEvent = { t: 'answer', op: 'returned', results: canonicalise(results) };
              if (action !== undefined) e.action = canonicalise(action);
              s.frame.location.push(e);
            }
          }
        : {}),
      hasNavigated: () => answer(op, 'done'),
      hasUnchanged: () => answer(op, 'unchanged'),
      hasFailed: (code: string) => answer(op, 'failure', code)
    };
    node.scheduleAfterInputsHaveUpdated(() => proto[act === 'push' ? 'navigate' : 'replace'].call(NavigationHandler.instance, v.stack, args));
  }

  /**
   * NSP-016 s57 — THE CALLERS of a Page Router (page-router.ts): a `navigate` (`{ router?, target?, params?, openInNewTab? }`) is what
   * a Navigate hands at ITS frame's end (router-navigate.ts `scheduleNavigate` → `navigate`), so the face schedules it on the router's
   * own frame-end list; it goes through the play's REAL `RouterHandler` (`installRouters`) — past the handler's own recording, which is
   * the CALLER's `route` event — with a copy of `params` (an object, as a Navigate hands one) and `openInNewTab` false unless handed.
   * The router's answer is an `answer` event, op `navigate`, at the call. A `traverse` (a URL) is the person's Back or Forward: the
   * world's location moves there and its `popstate` listeners — the page's — run (world.ts LOCATION).
   */
  function routerActs(s: State, act: 'navigate' | 'traverse', value: unknown): void {
    if (act === 'traverse') {
      if (!world?.location) throw new Error('runtime: a traverse moves the location, and the play has none');
      world.location.traverse(value);
      return;
    }
    const v = (value ?? {}) as { router?: unknown; target?: unknown; params?: Record<string, unknown>; openInNewTab?: unknown };
    const node = s.h.node as unknown as { scheduleAfterInputsHaveUpdated(cb: () => void): void };
    const answer = (outcome: 'done' | 'unchanged' | 'failure', code?: string) =>
      s.frame.location.push(outcome === 'failure' ? { t: 'answer', op: 'navigate', value: outcome, error: code || OUTCOME_UNSPECIFIED } : { t: 'answer', op: 'navigate', value: outcome });
    const args = {
      target: v.target,
      params: { ...(v.params ?? {}) },
      openInNewTab: v.openInNewTab ?? false,
      hasNavigated: () => answer('done'),
      hasUnchanged: () => answer('unchanged'),
      hasFailed: (code: string) => answer('failure', code)
    };
    const proto = (RouterHandler as unknown as { prototype: { navigate(name: unknown, args: unknown): void } }).prototype;
    node.scheduleAfterInputsHaveUpdated(() => proto.navigate.call(RouterHandler.instance, v.router, args));
  }

  /**
   * PERSON (above, NSP-016 s55) — a pointer WITH A POSITION (drag.ts THE GESTURE), the browser's events for it:
   * - `pressAt` (`{ x, y, by?, button? }`): a mouse button (0 unless `button` names another) or, `by: 'touch'`, a finger goes down at
   *   (x, y) on the node's element, under the hit test (the page's body when the node has none on the page): `pointerdown`, then
   *   `mousedown` — or `touchstart` with the touch in its lists;
   * - `moveTo` (`{ x, y }`): the pointer that is down moves to (x, y): `pointermove`, then `mousemove` — or `touchmove`;
   * - `releaseAt` (`{ x, y }`): it comes up at (x, y): `pointerup`, then `mouseup` — or `touchend`, the touch only in `changedTouches`.
   * A mouse's move and release land on whatever is under the pointer and bubble to the document; the face has no geometry, so they are
   * dispatched AT the document (where react-draggable listens). A finger's move and end go to the element the finger went down on
   * (`touchAt`), as a browser sends them — so once that element has left the page the document hears neither. Face choices, written
   * down: no hover, leave or click is raised (a press and release on the same element is a click in a browser; the Drag answers
   * none); the mouse's `buttons` is 1 between a press and its release; a touch is touch identifier 0; one pointer at a time (a
   * mouse press ends what a finger was doing, for the face).
   */
  function positionedAct(act: 'pressAt' | 'moveTo' | 'releaseAt', value: unknown, el: any): void {
    const d = ensureDom();
    const w = d.window;
    const v = (value ?? {}) as { x?: unknown; y?: unknown; by?: unknown; button?: unknown };
    const clientX = Number(v.x ?? 0);
    const clientY = Number(v.y ?? 0);
    const finger = act === 'pressAt' ? v.by === 'touch' : touchAt !== null;
    const at = act === 'pressAt' ? (el ? underPointer(w, el) : d.document.body) : finger ? touchAt : d.document;
    if (act === 'pressAt') pointerAt = at;
    // one pointer at a time: a mouse press is not a finger, so what moves next is the mouse
    if (act === 'pressAt' && !finger) touchAt = null;
    const button = act === 'pressAt' && typeof v.button === 'number' ? v.button : 0;
    const pointer = (type: string) => {
      const e = new w.MouseEvent(type, { bubbles: true, cancelable: true, composed: true, button: act === 'moveTo' ? -1 : button, buttons: act === 'releaseAt' ? 0 : 1, clientX, clientY });
      Object.defineProperty(e, 'pointerType', { value: finger ? 'touch' : 'mouse' });
      Object.defineProperty(e, 'pointerId', { value: finger ? 2 : 1 });
      Object.defineProperty(e, 'isPrimary', { value: true });
      at.dispatchEvent(e);
    };
    pointer(act === 'pressAt' ? 'pointerdown' : act === 'moveTo' ? 'pointermove' : 'pointerup');
    if (!finger) {
      const type = act === 'pressAt' ? 'mousedown' : act === 'moveTo' ? 'mousemove' : 'mouseup';
      at.dispatchEvent(new w.MouseEvent(type, { bubbles: true, cancelable: true, composed: true, button: act === 'moveTo' ? 0 : button, buttons: act === 'releaseAt' ? 0 : 1, clientX, clientY }));
      return;
    }
    const touch = { identifier: 0, target: at, clientX, clientY, pageX: clientX, pageY: clientY, screenX: clientX, screenY: clientY };
    const e = new w.TouchEvent(act === 'pressAt' ? 'touchstart' : act === 'moveTo' ? 'touchmove' : 'touchend', { bubbles: true, cancelable: true, composed: true });
    const down = act === 'releaseAt' ? [] : [touch];
    Object.defineProperty(e, 'touches', { value: down });
    Object.defineProperty(e, 'targetTouches', { value: down });
    Object.defineProperty(e, 'changedTouches', { value: [touch] });
    if (act === 'pressAt') touchAt = at;
    if (act === 'releaseAt') touchAt = null;
    at.dispatchEvent(e);
  }

  /**
   * PERSON (above) — the element a person sees of the node itself (`elementSeen`). NSP-016 s42: on a page whose root is the node's
   * GROUP the container holds its siblings too, so the fallback for a node that lost its root (C66) is its OWN control — found by
   * the `id` its component renders on the input (RadioButton.tsx `inputProps.id`) — and never the first control on the page, which
   * with the node unmounted is a sibling's.
   */
  function ownElement(s: State): any {
    const node = s.h.node as unknown as { getDOMElement(): any; props?: { id?: unknown } };
    if (!s.page?.group) return elementSeen(node, s.page?.container);
    const root = node.getDOMElement();
    if (root && root.isConnected) return elementSeen(node);
    const id = node.props?.id;
    return typeof id === 'string' ? s.page.container.querySelector(`[id="${id}"]`) : null;
  }

  /** PERSON (above, NSP-016 s52) — the element of the page child made with `value` (a Group's child, by its JSON), if it is on the page. */
  function childElement(s: State, value: unknown): any {
    const named = JSON.stringify(value);
    const child = s.page?.children?.find((c) => JSON.stringify(c.value) === named);
    if (!child) return null;
    const el = (child.node as unknown as { getDOMElement(): any }).getDOMElement();
    return el && el.isConnected ? el : null;
  }

  /** PERSON (above, NSP-016 s42) — the control of the page child whose Value is `value` (`Object.is`), if it is on the page. */
  function pickedElement(s: State, value: unknown): any {
    const child = s.page?.children?.find((c) => Object.is(c.value, value));
    if (!child) return null;
    const el = elementSeen(child.node as unknown as { getDOMElement(): unknown });
    return el && el.isConnected ? el : null;
  }

  /**
   * PERSON (above) — the value an `<input type="range">` holds for `v`: jsdom's value sanitization, which it applies to every
   * write (form-controls.js, the `range` case: not a valid floating-point number → the middle, or `min` when `max` is below it;
   * below `min` → `min`; else above `max` → `max`; the attributes read by HTML's lenient rules for parsing floating-point number
   * values, `parseFloatingPointNumber` — `"1,2"` is 1), then the BROWSER's step-mismatch rule, which jsdom lacks (HTML; Chromium
   * `StepRange::ClampValue`), when `max` is not below `min`: rounded to base + n × step (base `min`, else the `value` attribute,
   * else 0), a tie upwards, a rounding past `max` stepped back one, below `min` forward one, still outside → the clamped value;
   * `step` default 1, not a positive number → the default. Face choices, written down: a reversed range is clamped as jsdom
   * clamps it, and an attribute is parsed as jsdom parses it (Chromium reads `min` / `max` strictly) — jsdom re-sanitizes
   * whatever the face writes, so a rule it does not share cannot be played. Number arithmetic: exact for dyadic steps.
   */
  /** PERSON (above) — `max` below `min`, both read as `browserRangeValue` reads them */
  function rangeReversed(el: any): boolean {
    const attr = (name: string, dflt: number): number => {
      const s = el.getAttribute(name);
      if (s === null || /[^\t\n\f\r ]/.test(s.slice(0, s.length - s.trimStart().length))) return dflt;
      const n = parseFloat(s);
      return Number.isFinite(n) ? n : dflt;
    };
    return attr('max', 100) < attr('min', 0);
  }

  function browserRangeValue(el: any, v: unknown): string {
    const attr = (name: string): number | undefined => {
      const s = el.getAttribute(name);
      if (s === null) return undefined;
      const lead = s.length - s.trimStart().length;
      if (/[^\t\n\f\r ]/.test(s.slice(0, lead))) return undefined;
      const n = parseFloat(s);
      return Number.isFinite(n) ? n : undefined;
    };
    const valid = (t: unknown): number | undefined => {
      const s = typeof t === 'number' ? (Number.isFinite(t) ? String(t) : '') : t;
      if (typeof s !== 'string' || !/^-?(?:\d+|\d*\.\d+)(?:[eE][-+]?\d+)?$/.test(s)) return undefined;
      const n = parseFloat(s);
      return Number.isFinite(n) ? n : undefined;
    };
    const minAttr = attr('min');
    const min = minAttr ?? 0;
    const max = attr('max') ?? 100;
    const parsed = valid(v);
    const proposed = parsed === undefined ? (max < min ? min : (min + max) / 2) : parsed;
    const inRange = parsed === undefined ? proposed : proposed < min ? min : proposed > max ? max : proposed;
    if (max < min) return String(inRange);
    const stepAttr = attr('step');
    const step = stepAttr !== undefined && stepAttr > 0 ? stepAttr : 1;
    const base = minAttr ?? attr('value') ?? 0;
    const rounded = base + Math.round((inRange - base) / step) * step;
    const clamped = rounded > max ? rounded - step : rounded < min ? rounded + step : rounded;
    return String(clamped < min || clamped > max ? inRange : clamped);
  }

  /**
   * PERSON (above) — one key on a text field: refused past `maxlength` or, on a Number field, when not a digit; else written at
   * the TEXT ENTRY CURSOR and `input` raised. NSP-016 s40: the key goes in where the browser's cursor is — `selectionStart` on a
   * type the selection API applies to (text, search, url, tel, password, a textarea; HTML keeps it there as a browser does: a
   * fresh `<textarea>` at the start, a type change from a type without the API to one with it at the start, a value write at the
   * end), appended where the type has no readable cursor (email, number). The value setter moves the cursor to the end, so it is
   * put back after the key, as a keystroke leaves it. `maxLength` reads the attribute as HTML does (`-0.5` is a limit of 0).
   */
  function typeKey(w: any, el: any, ch: string): void {
    const area = el.tagName === 'TEXTAREA';
    const limited = area || ['text', 'search', 'url', 'tel', 'email', 'password'].includes(el.type);
    if (!area && el.type === 'number' && !/^[0-9]$/.test(ch)) return;
    if (limited && el.maxLength >= 0 && el.value.length + ch.length > el.maxLength) return;
    const cursor = area || ['text', 'search', 'url', 'tel', 'password'].includes(el.type);
    const at: number = cursor ? el.selectionStart : el.value.length;
    const end: number = cursor ? el.selectionEnd : at;
    const proto = area ? w.HTMLTextAreaElement.prototype : w.HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value')!.set!.call(el, el.value.slice(0, at) + ch + el.value.slice(end));
    if (cursor) el.setSelectionRange(at + ch.length, at + ch.length);
    el.dispatchEvent(new w.Event('input', { bubbles: true, composed: true }));
  }

  /**
   * NSP-014 s29 (T16) — makes the node with its own outcome and signal calls hooked FROM ITS FIRST ONE, even inside its
   * `initialize`: a node that reports at its making (Sign In With applying a sign-in that came back, signinwith.ts :86-88)
   * reaches the wire in the app (a late wire catches up — graph c01), and before this the hooks were installed after the
   * node was made, so the report was off its trace. For the making only, `beginOutcome` / `reportOutcome` /
   * `sendSignalOnOutput` on `Node.prototype` hook THIS node (by id) at its first call — `intercept` as `adopt` does it,
   * the node's error-bus entry with it — and the call goes through the hook; every other call is the original. A type
   * whose own prototype overrides one of the three is hooked at `adopt`, as before. Returns the state made, if one was.
   */
  function createHooked(type: string, id: string, nodeScope: unknown, metadata: NodeMetadata, logs: LogLine[]): { node: RuntimeNode; made?: State } {
    const proto = Node.prototype as unknown as Record<string, (...a: unknown[]) => unknown>;
    const names = ['beginOutcome', 'reportOutcome', 'sendSignalOnOutput'] as const;
    const saved = Object.fromEntries(names.map((m) => [m, proto[m]])) as Record<(typeof names)[number], (...a: unknown[]) => unknown>;
    let made: State | undefined;
    for (const m of names) {
      proto[m] = function (this: RuntimeNode & Record<string, (...a: unknown[]) => unknown>, ...a: unknown[]) {
        if (made === undefined && this.id === id) {
          made = { h: { id, type, node: this, metadata, errors: [], logs, modelCalls: [] }, trace: [], frame: newFrame(), lastSent: {}, settles: 0, currentInput: undefined, inOutcome: 0 };
          states.set(id, made);
          byNodeId.set(id, made);
          intercept(made); // the node's own wrappers now — each calls this function again, which below is the original
          return (this[m] as (...args: unknown[]) => unknown).apply(this, a);
        }
        return saved[m].apply(this, a);
      };
    }
    try {
      const node = context.nodeRegister.createNode(type, id, nodeScope as never) as unknown as RuntimeNode;
      return { node, made };
    } finally {
      for (const m of names) proto[m] = saved[m];
    }
  }

  /** Makes `node` a handle: recorded, intercepted, its `params` applied as `set` events. `made`: the state `createHooked` already made for it (T16). */
  function adopt(node: RuntimeNode, id: string, type: string, metadata: NodeMetadata, params: Record<string, unknown>, logs: LogLine[], made?: State): RuntimeHandle {
    let s = made;
    if (!s) {
      s = { h: { id, type, node, metadata, errors: [], logs, modelCalls: [] }, trace: [], frame: newFrame(), lastSent: {}, settles: 0, currentInput: undefined, inOutcome: 0 };
      states.set(id, s);
      byNodeId.set(id, s);
      intercept(s);
    }
    const h = s.h;
    for (const name of Object.keys(params)) target.set(h, name, params[name]);
    return h;
  }

  /** The owner of the ROOT scope — what the propagation walk and the scope chain read of the app's top component. */
  interface Owner {
    name: string;
    nodeScope?: InstanceType<typeof NodeScope>;
    parentNodeScope?: InstanceType<typeof NodeScope>;
    children?: unknown[];
    getInstanceId(): string;
    getRoots(): never[];
  }

  /** A component instance as the target holds it: the runtime's own node (componentinstance.ts). */
  type Instance = InstanceType<typeof ComponentInstanceNode> & RuntimeNode & {
    _forEachModel?: unknown;
    _internal: { instanceId: string; componentInputs: RuntimeNode[]; componentOutputs: RuntimeNode[] };
    registerComponentInputPort(port: { name: string }): void;
    registerComponentOutputPort(port: { name: string }): void;
  };

  /** A real scope around `owner`, with the log sink; `owner.nodeScope` is set to it. */
  function scopeFor(owner: Owner, logs: LogLine[]): InstanceType<typeof NodeScope> {
    const scope = new NodeScope(context as never, owner);
    (scope as unknown as { runContext: unknown }).runContext = { log: logSink(logs) };
    owner.nodeScope = scope;
    return scope;
  }

  /**
   * The component tree (graph.ts COMPONENTS): one instance per declared component, each the
   * runtime's own `ComponentInstanceNode` (NSP-015 — s10 built a stand-in owner; the boundary needs
   * the real one: its input setters feed `Component Inputs`, `Component Outputs` writes its
   * outputs), placed in its parent's scope as a loaded app places it — an entry of `nodes` and of
   * `componentInstanceChildren` under its id (nodescope.ts :305-312) and a child of a visual node
   * of that scope (the `node-spec/host` entry, standing for the Group), its name a component model
   * the context knows (`hasComponentModelWithName`, what the `children` / `siblings` walk asks).
   * Its instance id is `node-spec/instance/<id>` (the runtime's is a process-wide counter; the
   * Component Object record is keyed on it and must not move between plays). Returns the root
   * scope and each instance.
   */
  function componentTree(components: Readonly<Record<string, ComponentDecl>>, orphanLogs: LogLine[]) {
    const rootOwner: Owner = { name: 'node-spec/root', getInstanceId: () => 'node-spec/root', getRoots: () => [] as never[] };
    const root = scopeFor(rootOwner, orphanLogs);
    const instances: Record<string, Instance> = {};
    const hostOf = (scope: InstanceType<typeof NodeScope>): Owner => {
      const id = 'node-spec/host';
      const nodes = scope.nodes as unknown as Record<string, Owner>;
      if (!nodes[id]) nodes[id] = { name: id, children: [], getInstanceId: () => id, getRoots: () => [] as never[] };
      return nodes[id];
    };
    const build = (cid: string): Instance => {
      if (instances[cid]) return instances[cid];
      const decl = components[cid];
      const parentScope = decl.parent !== undefined ? build(decl.parent).nodeScope : root;
      const instance = new ComponentInstanceNode(context as never, cid, parentScope) as unknown as Instance;
      instance.name = decl.component ?? cid;
      instance._internal.instanceId = `node-spec/instance/${cid}`;
      (instance.nodeScope as unknown as { runContext: unknown }).runContext = { log: logSink(orphanLogs) };
      // the stand-in graph model a loaded instance has (its parameters; `_onNodeDeleted` calls `removeListenersWithRef`)
      (instance as unknown as { model?: unknown }).model = { type: instance.name, parameters: { ...(decl.params ?? {}) }, removeListenersWithRef: () => undefined };
      if (decl.item !== undefined) instance._forEachModel = Model.get(decl.item);
      instances[cid] = instance;
      (parentScope.nodes as unknown as Record<string, unknown>)[cid] = instance;
      (parentScope.componentInstanceChildren as unknown as Record<string, unknown>)[cid] = instance;
      hostOf(parentScope).children!.push(instance);
      // the context's component-model table, written directly: a target plays many scenarios and
      // `registerComponentModel` refuses a name it has seen; only `hasComponentModelWithName` reads it here
      const models = (context as unknown as { componentModels: Record<string, unknown> }).componentModels;
      if (!defined.includes(instance.name)) models[instance.name] = { name: instance.name, on: () => undefined, removeListenersWithRef: () => undefined };
      return instance;
    };
    for (const cid of Object.keys(components)) build(cid);
    return { root, rootOwner, instances };
  }

  /** The component models the previous play's definitions registered — removed when the next graph mounts. */
  let defined: string[] = [];

  /**
   * NSP-015 — the DEFINITIONS (graph.ts): each registered as the app's project registers a
   * component — a real `ComponentModel` built from export data (componentmodel.ts
   * `createFromExportData`: ports, nodes with their parameters, connections) in the context's
   * component-model table — so a node that instantiates a component by name (Run Tasks'
   * `nodeScope.createNode(template)` → `createComponentInstanceNode` → `getComponentModel`) builds
   * it with the runtime's own `setComponentModel`. Written into the table directly for the reason
   * the instance stand-ins are: a target plays many scenarios and `registerComponentModel` refuses
   * a name it has seen.
   */
  async function registerDefinitions(definitions: Readonly<Record<string, ComponentDefinition>>): Promise<void> {
    const models = (context as unknown as { componentModels: Record<string, unknown> }).componentModels;
    for (const name of defined) delete models[name];
    defined = [];
    for (const [name, def] of Object.entries(definitions)) {
      const port = (plug: 'input' | 'output') => ([portName, kind]: [string, string]) => ({ name: portName, plug, type: kind === 'signal' ? { name: 'signal' } : '*' });
      const model = await ComponentModel.createFromExportData({
        name,
        ports: [...Object.entries(def.inputs ?? {}).map(port('input')), ...Object.entries(def.outputs ?? {}).map(port('output'))] as never,
        nodes: Object.entries(def.nodes).map(([id, n]) => ({ id, type: n.type, parameters: { ...(n.params ?? {}) } })) as never,
        connections: (def.wires ?? []).map((w) => {
          const from = parseEndpoint(w.from);
          const to = parseEndpoint(w.to);
          return { sourceId: from.node, sourcePort: from.port, targetId: to.node, targetPort: to.port };
        })
      });
      models[name] = model;
      defined.push(name);
    }
  }

  /**
   * NSP-015 — the boundary, once the instance's own nodes are mounted: what `setComponentModel`
   * does after `nodeScope.setComponentModel` (componentinstance.ts :91-95) — find the scope's
   * `Component Inputs` / `Component Outputs` nodes, register the component's ports — and then the
   * instance becomes a handle, a subject like a node. Its metadata is the component's ports (the
   * port's kind is the component model's port type: what makes a `signal()` step legal on it).
   */
  function boundary(cid: string, instance: Instance, decl: ComponentDecl, logs: LogLine[]): RuntimeHandle {
    const scope = instance.nodeScope as unknown as InstanceType<typeof NodeScope>;
    instance._internal.componentInputs = scope.getNodesWithType('Component Inputs') as unknown as RuntimeNode[];
    instance._internal.componentOutputs = scope.getNodesWithType('Component Outputs') as unknown as RuntimeNode[];
    for (const name of Object.keys(decl.inputs ?? {})) instance.registerComponentInputPort({ name });
    for (const name of Object.keys(decl.outputs ?? {})) instance.registerComponentOutputPort({ name });
    const ports = (kinds: Record<string, string> | undefined) =>
      Object.fromEntries(Object.entries(kinds ?? {}).map(([name, kind]) => [name, { name, type: kind === 'signal' ? 'signal' : '*' }]));
    const metadata = { inputs: ports(decl.inputs), outputs: ports(decl.outputs) } as unknown as NodeMetadata;
    const signals = (kinds: Record<string, string> | undefined) => new Set(Object.keys(kinds ?? {}).filter((name) => kinds![name] === 'signal'));
    // a signal input of the component is a signal OUTPUT of each Component Inputs inside it
    for (const ci of instance._internal.componentInputs) {
      const st = states.get(ci.id);
      if (st) st.signalOutputs = signals(decl.inputs);
    }
    const h = adopt(instance, cid, `component:${instance.name}`, metadata, {}, logs);
    states.get(cid)!.signalOutputs = signals(decl.outputs);
    return h;
  }

  const target: RuntimeTarget = {
    name: 'runtime',
    diagnostics: true,
    context,
    types: () => Object.keys((context.nodeRegister as unknown as { _constructors: Record<string, unknown> })._constructors),
    hasType: (type) => context.nodeRegister.hasNode(type),

    mount(type, params, wired, portContext) {
      return mountIn(type, params, undefined, undefined, wired, portContext);
    },

    set(h, port, value) {
      const s = states.get(h.id);
      if (!s) throw new Error(`runtime: ${h.id} is disposed`);
      const node = h.node as unknown as NodeInstance;
      node.registerInputIfNeeded(port);
      if (!node.hasInput(port)) throw new Error(`${h.type}: no input "${port}" on the runtime`);
      if (isSignalInput(s, port)) throw new Error(`${h.type}: "${port}" is a signal input — use signal()`);
      const c = canonicalise(value);
      s.trace.push(c === undefined ? { t: 'set', port } : { t: 'set', port, value: c });
      // NSP-016 s56 — the app ships React's PRODUCTION build (noodl-viewer-react/static/shared-react19), which leaves a style object
      // alone; the face's React is the development build, which freezes the style object a component hands a DOM element. The
      // Component Stack hands its div the node's own (navigation-stack.tsx :44), so its next `setStyle` threw here and never in an app:
      // a frozen style is given back as a copy (its symbols too — the default-style layer) before the write
      const styled = node as unknown as { style?: object };
      if (styled.style && Object.isFrozen(styled.style)) styled.style = Object.assign({}, styled.style);
      // NSP-020 s82 — the model stays the PLACING's: the headless runtime reads `model.outputPorts` / `model.parameters` as the project
      // saved them (NSP-017's contracts, "the kinds are the placing's"), and a setter that registers at run time (States' `values`)
      // does so itself. The interpreter's `rederive` after a `DerivedPorts.rederive` param mirrors that setter, not the model.
      node.setInputValue(port, value);
    },

    signal(h, port) {
      const s = states.get(h.id);
      if (!s) throw new Error(`runtime: ${h.id} is disposed`);
      const node = h.node as unknown as NodeInstance;
      node.registerInputIfNeeded(port);
      if (!node.hasInput(port)) throw new Error(`${h.type}: no input "${port}" on the runtime`);
      if (!isSignalInput(s, port)) throw new Error(`${h.type}: "${port}" is a value input — use set()`);
      s.trace.push({ t: 'in', port });
      s.currentInput = port;
      try {
        // The rising edge is the event; the falling edge re-arms the detector (edgetriggeredinput.ts).
        node.setInputValue(port, true);
        node.setInputValue(port, false);
      } finally {
        s.currentInput = undefined;
      }
    },

    async settle() {
      if (onPage.size > 0) {
        // PERSON (above) — a frame on a page commits what it rendered: inside React's `act`, so the holder's and
        // the nodes' re-renders (the frame-end `setState`, react-component-node.ts :1675-1689) land in the frame
        await ensureDom().act(async () => {
          frame();
          await yieldToEventLoop();
          drain();
        });
        // NSP-016 s60 — THE LAYOUT (above): the rendering step after the frame's commit reports what the page's observers have not
        for (const p of onPage) {
          if (!p.page?.layout) continue;
          await ensureDom().act(async () => {
            layOut(p);
          });
        }
      } else {
        frame();
        await yieldToEventLoop();
        drain();
      }
      for (const s of states.values()) flush(s);
    },

    // PERSON (above, NSP-016 s37) — the person's act on the painted page (adapter.ts)
    async act(h, act, value) {
      const s = states.get(h.id);
      if (!s) throw new Error(`runtime: ${h.id} is disposed`);
      if (!s.page) throw new Error(`${h.type}: a person cannot act on a node that is not on the page (its spec does not need person)`);
      // NSP-016 s54 — a person's act is a new task, after what a media element queued (`mediaWork`)
      if (mediaWork) {
        mediaWork = false;
        await yieldToEventLoop();
      }
      const c = canonicalise(value);
      s.trace.push(c === undefined ? { t: 'act', act } : { t: 'act', act, value: c });
      paint(s);
      void ensureDom().act(() => {
        personActs(s, act, value);
      });
    },

    install(w) {
      if (world) throw new Error('runtime: a world is already installed — one play at a time');
      world = w;
      w.network.onRequest(recordRequest);
      w.location?.onCall(recordLocation);
      // PICKER (world.ts, NSP-014 s31) — the document itself is `installWorld`'s; a click is the clicking node's
      w.picker.onCall(recordPicker);
      // SOCKET (world.ts, NSP-014 s34) — the WebSocket itself is `installWorld`'s; each call is the node's that made the socket
      w.sockets.onCall(recordSocket);
      // HOST (world.ts, NSP-022 s96) — the services' globals themselves are `installWorld`'s; each call is the node's that made it
      w.host.onCall(recordHost);
      // PROJECT (world.ts, NSP-015 s17) — the settings a node reads through `NoodlRuntime.instance`:
      // the app has one runtime, so the static is this target's for the play, and its project's
      // settings are the script's (graphmodel.ts `setSettings`, what `importEditorData` calls)
      (NoodlRuntime as unknown as { instance: unknown }).instance = rt;
      (rt as unknown as { graphModel: { setSettings(s: Record<string, unknown>): void } }).graphModel.setSettings({ ...w.projectSettings });
      // NSP-022 s99 — and its classes and `dbVersionMajor`, the metadata the legacy store reads (cloudstore.js :120-126, :569-586),
      // its class cache dropped so this play's are what it reads (and dropped again at the undo)
      const projectMeta = (rt as unknown as { graphModel: { getMetaData(k: string): unknown; setMetaData(k: string, v: unknown): void } }).graphModel;
      const savedProjectMeta = { dbCollections: projectMeta.getMetaData('dbCollections'), dbVersionMajor: projectMeta.getMetaData('dbVersionMajor') };
      projectMeta.setMetaData('dbCollections', w.collections.length > 0 ? w.collections.map((c) => JSON.parse(JSON.stringify(c))) : undefined);
      projectMeta.setMetaData('dbVersionMajor', w.dbVersionMajor);
      CloudStore.invalidateCollections();
      // NSP-022 s99 — the cloud bundle's build constant (noodl-viewer-cloud webpack.isolate.*.js: `const _noodl_cloud_runtime_version`),
      // which every "am I in a cloud function" branch reads (the Parse wire's `fetch` face, ParseWireAdapter.ts :233, :241, :303). The
      // cloud target never declared it: no node graded on it before Aggregate Records reached the Parse wire. A global for a cloud play only.
      const g = globalThis as Record<string, unknown>;
      const hadRuntimeVersion = Object.prototype.hasOwnProperty.call(g, '_noodl_cloud_runtime_version');
      const savedRuntimeVersion = g._noodl_cloud_runtime_version;
      if (options.type === 'cloud') g._noodl_cloud_runtime_version = 'node-spec';
      // STACK (world.ts, NSP-015 s18) — the REAL handler, fresh for the play (it is a process-wide static and
      // queues what no stack took), the node's call recorded as handed, and a stand-in stack per scripted name
      const restoreStacks = installStacks(w, recordStack);
      // ROUTE (world.ts, NSP-015 s19) — likewise the REAL RouterHandler, fresh, with a stand-in router per scripted name
      const restoreRouters = installRouters(w, recordStack);
      // POPUP (world.ts, NSP-015 s20) — the REAL `showPopup`, its host, container, frame and root scope stood in
      const restorePopups = installPopups(w);
      // BACKEND (world.ts, NSP-014 s21) — the REAL CloudStore and resolution; only the REST adapter's wire is the world's
      const restoreBackend = installBackend(w, (rt as unknown as { graphModel: { getMetaData(k: string): unknown; setMetaData(k: string, v: unknown): void } }).graphModel, recordBackend);
      // HOST, THE INVOCATION (world.ts, NSP-022 s97) — a cloud play's user service is the CLOUD runtime's (its caller lookup is a
      // `fetch` to `_noodl_cloudservices`, installWorld's), not the browser's AUTH stand-in
      const services = (NoodlRuntime as unknown as { Services: Record<string, unknown> }).Services;
      const playService = services.UserService;
      if (options.type === 'cloud') services.UserService = CloudUserServiceClass;
      const installed = installWorld(w);
      // the three process-wide managers behind the store, history and action nodes (NSP-012 T4): one play, one of each
      globalStoreManager.reset({ clearState: true });
      stateHistoryManager.reset();
      actionRegistry.reset();
      // PERSON (above) — one play, one list of what holds the keyboard
      focusTracker.reset();
      stateHistoryManager.setClock(() => w.clock.now());
      resetRegistry(w);
      // NSP-016 s62 — REGISTRY's writes made elsewhere (world.ts): performed on the runtime's own tables, through the verbs a
      // node would call, so a node bound to the entry hears them as it would another node's write
      const offRegistry = w.onRegistryWrite((write) => performRegistryWrite({ model: (id) => Model.get(id as string), collection: (name) => Collection.get(name as string) } as unknown as RegistryTables, write));
      // NSP-017 s68 — the app's JavaScript API over those tables (`installNoodlApi`)
      const restoreNoodlApi = installNoodlApi();
      // NSP-013 s12 — the last frame's time is the context's, so it outlived the play that ran the
      // frame: a Repeat started before a play's first settle read the PREVIOUS play's last frame time
      // (repeat.ts :120-122) and ticked early or late. Found only once the runner's sequences stopped
      // repeating across days (T4); a fresh context starts at 0 (nodecontext.ts :257), so each play does.
      context.currentFrameTime = 0;
      // NSP-013 s12 (T8) — the play's console goes to a sink. Jest formats a logged Error through
      // `source-map`, whose quick-sort calls `Math.random` — which during a play IS the world's
      // stream — once per process, while the map cache is cold: the first play that logs one (an
      // array port's bad literal, node.ts :456) lost world draws to the host and minted other ids.
      // What the runtime prints is not in the trace; nothing a node does reads it back.
      const consoleMethods = ['log', 'info', 'warn', 'error', 'debug'] as const;
      const hostConsole = consoleMethods.map((m) => console[m]);
      for (const m of consoleMethods) console[m] = () => undefined;
      return () => {
        consoleMethods.forEach((m, i) => (console[m] = hostConsole[i]));
        offRegistry();
        restoreNoodlApi();
        restoreStacks();
        restoreRouters();
        restorePopups();
        services.UserService = playService;
        restoreBackend();
        installed.restore();
        if (hadRuntimeVersion) g._noodl_cloud_runtime_version = savedRuntimeVersion;
        else delete g._noodl_cloud_runtime_version;
        projectMeta.setMetaData('dbCollections', savedProjectMeta.dbCollections);
        projectMeta.setMetaData('dbVersionMajor', savedProjectMeta.dbVersionMajor);
        CloudStore.invalidateCollections();
        stateHistoryManager.setClock(null);
        world = undefined;
      };
    },

    // NSP-014 s25 (adapter.ts) — the runtime's own named array, seeded from the world's registry at `install`
    registryArray(name) {
      if (!world) throw new Error('runtime: a registry array names the play’s world, and none is installed');
      return Collection.get(name);
    },

    // NSP-014 s30 (adapter.ts) — a file the browser hands: Node's own `File` (the class a browser's `File` is), its bytes zeros
    file(desc) {
      return new NodeFile([new Uint8Array(desc.size ?? 0)], desc.name, { type: desc.type ?? '', lastModified: 0 });
    },
    // NSP-014 s30 (adapter.ts) — a stored file: the runtime's own `CloudFile` (cloudfile.ts), what `instanceof` accepts
    cloudFile(desc) {
      return new CloudFileClass(desc as ConstructorParameters<typeof CloudFileClass>[0]);
    },

    async advance(h, ms) {
      const s = states.get(h.id);
      if (!s) throw new Error(`runtime: ${h.id} is disposed`);
      if (!world) throw new Error('runtime: advance() without a world — install one for the play');
      s.trace.push({ t: 'advance', ms });
      await yieldToEventLoop(); // what the world already delivered lands before time passes
      // Timer by timer, yielding between (world.ts CLOCK, T6 — NSP-013 s12): one sweep fired an
      // answer due at +100 and a timeout due at +30000 back to back, and the answer's `.then` chain
      // never ran before the timeout aborted it. An event loop runs those microtasks in between.
      // NSP-015 s19 (T9): ONE timer at a time, not one due TIME at a time — two timers due at the same moment (two
      // Navigates' +1 ms) fired in one sweep, and the first's microtask answer landed after the second's.
      const target = world.clock.now() + Math.max(0, ms);
      while (world.clock.step(target)) await yieldToEventLoop();
      world.clock.advance(target - world.clock.now());
      await yieldToEventLoop(); // and what the move delivered lands before the next step
    },

    trace(h) {
      const s = states.get(h.id);
      if (!s) throw new Error(`runtime: ${h.id} is disposed`);
      return s.trace.map((e) => ({ ...e }));
    },

    dispose(h) {
      const s = states.get(h.id);
      if (!s) return;
      states.delete(h.id);
      byNodeId.delete(h.id);
      // PERSON (above) — off the page before the teardown, so the component's unmount runs while the node is whole
      takeOffPage(s);
      try {
        // NSP-015 — an instance's own teardown resets its whole scope (componentinstance.ts
        // `_onNodeDeleted` → `nodeScope.reset()`), deleting the nodes inside; the runner disposes
        // each of those itself, so an instance is torn down as a node only
        if (h.type.startsWith('component:')) Node.prototype._onNodeDeleted.call(h.node);
        else h.node._onNodeDeleted();
      } catch {
        // a node whose teardown assumes a scope it never had; the instance is unreachable anyway
      }
      // NSP-016 s59 — a Repeater's parent goes after it (its teardown takes its rows out of the parent), and its templates with it
      const rep = repeaters.get(h.id);
      if (rep) {
        repeaters.delete(h.id);
        try {
          rep.group._onNodeDeleted();
        } catch {
          // the parent's own teardown assumes nothing of the play
        }
        const models = (context as unknown as { componentModels: Record<string, unknown> }).componentModels;
        for (const name of rep.models) delete models[name];
      }
      releasePage();
      // NSP-013 s12 (T7) — the play is over, so is its work. A disposed node left in the context's
      // dirty list or after-update callbacks ran in the NEXT play's first frame and drew from THAT
      // play's random stream (Filter Collection minted other ids: a divergence that vanished on a
      // fresh target). Timers too: a teardown that throws part-way (see the stand-in `model` at
      // mount) leaves them in the scheduler, and a play must not inherit them either.
      const c = context as unknown as { _dirtyNodes: unknown[]; callbacksAfterUpdate: unknown[]; timerScheduler: { runningTimers: unknown[]; newTimers: unknown[] } };
      c._dirtyNodes = [];
      c.callbacksAfterUpdate = [];
      c.timerScheduler.runningTimers = [];
      c.timerScheduler.newTimers = [];
    },

    async mountGraph(nodes: Readonly<Record<string, GraphNodeDecl>>, wires: readonly Wire[], components?: Readonly<Record<string, ComponentDecl>>, definitions?: Readonly<Record<string, ComponentDefinition>>) {
      const handles: Record<string, RuntimeHandle> = {};
      const orphanLogs: LogLine[] = [];
      await registerDefinitions(definitions ?? {});
      // a flat graph mounts as before (lone scopes); a graph with components gets the tree — and so
      // does one with definitions, which a node instantiates in its own scope (a real `NodeScope`)
      const hasDefinitions = !!definitions && Object.keys(definitions).length > 0;
      const tree = (components && Object.keys(components).length) || hasDefinitions ? componentTree(components ?? {}, orphanLogs) : undefined;
      // POPUP (world.ts, NSP-015 s20) — the tree's root is the app's root component: a popup is built in its scope
      if (tree) popupRoot(tree.root, tree.rootOwner);
      for (const id of Object.keys(nodes)) {
        const decl = nodes[id];
        const scope = tree ? (decl.in !== undefined ? (tree.instances[decl.in].nodeScope as unknown as InstanceType<typeof NodeScope>) : tree.root) : undefined;
        // NSP-020 s82 — the outputs a wire leaves from to nodes outside the scenario (graph.ts `GraphNodeDecl.wiredOutputs`)
        handles[id] = mountIn(decl.type, decl.params ?? {}, scope, id, undefined, decl.wiredOutputs ? { wiredOutputs: decl.wiredOutputs } : {});
      }
      // NSP-015 — each instance's ports once its nodes exist; then it is a subject (graph.ts BOUNDARY)
      if (tree) for (const cid of Object.keys(components ?? {})) handles[cid] = boundary(cid, tree.instances[cid], components![cid], orphanLogs);
      for (const w of wires) {
        const from = parseEndpoint(w.from);
        const to = parseEndpoint(w.to);
        if (!(from.node in handles) || !(to.node in handles)) throw new Error(`runtime: wire ${w.from} → ${w.to} names a node the graph does not declare`);
        target.connect!(handles[from.node], from.port, handles[to.node], to.port);
      }
      // NSP-015 — the parent sets each instance's parameters (nodescope.ts `setNodeParameters`),
      // after the wires: inside the instance its own wires exist by then (`setComponentModel` made
      // them before the parent got the node back)
      if (tree) for (const cid of Object.keys(components ?? {})) for (const [name, value] of Object.entries(components![cid].params ?? {})) target.set(handles[cid], name, value);
      // nodescope.ts :487-490 — once the whole graph is in place, in declaration order
      for (const id of Object.keys(nodes)) {
        const node = handles[id].node as unknown as { nodeScopeDidInitialize?: () => void };
        if (node.nodeScopeDidInitialize) node.nodeScopeDidInitialize();
      }
      return handles;
    },

    connect(from, fromPort, to, toPort) {
      if (!states.has(from.id) || !states.has(to.id)) throw new Error('runtime: a wire to or from a disposed node');
      const source = from.node as unknown as NodeInstance;
      const sink = to.node as unknown as NodeInstance;
      // nodescope.ts `addConnection` :133-153 — a wire registers a runtime-discovered OUTPUT as well as the input (Receive Event's payload ports)
      source.registerOutputIfNeeded(fromPort);
      if (!source.hasOutput(fromPort)) throw new Error(`${from.type}: no output "${fromPort}" on the runtime`);
      sink.registerInputIfNeeded(toPort);
      if (!sink.hasInput(toPort)) throw new Error(`${to.type}: no input "${toPort}" on the runtime`);
      // node.ts `connectInput`: registers the connection on the source's output and seeds the sink
      // with the source's current value unless it is undefined (C11, C3) — or replays a signal sent
      // during THIS update, which a wire made between frames never meets.
      to.node.connectInput(toPort, from.node, fromPort);
    }
  };
  return target;
}
