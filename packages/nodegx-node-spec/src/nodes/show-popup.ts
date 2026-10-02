/**
 * Show Popup (`NavigationShowPopup`) — read from `packages/noodl-viewer-react/src/nodes/navigation/showpopup.ts`
 * and `packages/noodl-runtime/src/nodecontext.ts` (`showPopup`, `_dismissOpenPopups`, `cancelTopPopup`) on
 * 2026-10-02 (NSP-015 s20).
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * THE RULE, before the citations: `Show` defers its work to the frame's end (:122-131, :202-219) — every press in
 * a frame is answered, all with the ONE outcome of ONE show made against the frame's final inputs. With no Target
 * (`undefined` or `null`, :226) Error is set and every press is Failure `show-popup/no-target`, and nothing is
 * handed. Otherwise the popup is handed to the runtime (world.ts POPUP) — `{ target, params, stackPolicy,
 * closeOnEscape, modal, accessibleName }` (:249-254): Target as stored, the `popupParam-` values by name, When A
 * Popup Is Open `replace` unless set to `stack`, Close On Escape and Modal on unless set to `false`, Accessible
 * Name only when a string was set. What the runtime does with it is the popup STACK, which this spec keeps for the
 * popups this node opened (nodecontext.ts :1212-1330):
 *   - no popup host: nothing opens, and every press is Done (:1213, :288-301);
 *   - `replace`: every popup on the stack is dismissed FIRST, each telling its opener `Dismissed` (:1240-1242,
 *     :1220-1236) — a popup whose build failed included; then the new popup takes a slot on top (:1243);
 *   - the component builds: Done (:288-290); it does not: Error is set to `The popup "<target>" could not be
 *     opened: <why>` and every press is Failure `show-popup/target-failed` (:291-297) — and its slot is never given
 *     back (nodecontext.ts has no `catch` around :1245): it stays on the stack, uncancellable (row C30).
 * LATER, what the person does (world.ts POPUP `events`) — a close through the popup's Close Popup, or Escape (the
 * top popup whose Modal is on, and only when its Close On Escape is on and it was built, :1183-1195) — takes the
 * popup off the stack at the START of the next frame (:1284-1300) and only then tells this node: a close's
 * results become Close Results (every `closeResult-` port named in them is sent, :266-271), then its action's
 * signal or `Closed` (:273-274 — an action this node has no port for sends nothing at all); an Escape is
 * `Cancelled` (:255-257). The first close or Escape aimed at a popup wins; one aimed at a popup no longer open does
 * nothing. Error keeps its last message — nothing clears it.
 * The ports: `popupParam-<name>` (the target component's inputs) and `closeResult-<name>` / `closeAction-<name>`
 * (from the Close Popups inside it) come from the PROJECT (setup :341-416), not from this node's params —
 * NSP-020's case. Inputs are registered on first write (:303-312); the outputs are those of a project whose popup
 * holds a Close Popup with Results `name,ok` and Close Actions `Save,Cancel` (:313-329).
 */

import { defineNode, type OutputDecl, type ValueInputDecl } from '../spec';

type Rec = Readonly<Record<string, unknown>>;

/** One of this node's slots on the context's popup stack (nodecontext.ts `PopupStackEntry`). */
type Slot = Readonly<{
  /** the ordinal of the popup among those this node opened; `undefined` for a build that failed */
  n: number | undefined;
  modal: boolean;
  closeOnEscape: boolean;
  /** a close or an Escape is on its way: it leaves at the next frame's start */
  leaving: boolean;
}>;

/** What the next frame's start tells this node about a popup leaving (:1284-1307). */
type Leave = Readonly<{ n: number; kind: 'closed'; action: unknown; results: Rec } | { n: number; kind: 'cancelled' }>;

type State = {
  /** :20 `_internal.target` — `undefined` until written */
  target: unknown;
  /** :22 `_internal.stackPolicy` — `undefined` until written (the declared default never runs the setter) */
  stackPolicy: 'replace' | 'stack' | undefined;
  /** :24 */
  closeOnEscape: boolean | undefined;
  /** :28 */
  modal: boolean | undefined;
  /** :26 */
  accessibleName: string | undefined;
  /** :53 `_internal.popupParams` */
  popupParams: Rec;
  /** :54 `_internal.closeResults` */
  closeResults: Rec;
  /** `_internal.lastError` */
  error: string | undefined;
  /** :21 `hasScheduledShow` */
  scheduled: boolean;
  /** :38 `pendingShowOutcomes.length` */
  presses: number;
  /** how many popups this node has opened (built) */
  opened: number;
  /** this node's slots on the popup stack, bottom first */
  stack: readonly Slot[];
  /** popups leaving at the next frame's start, in the order they were closed */
  leaving: readonly Leave[];
};

// :303-312 `registerInputIfNeeded` — `registerInput(name, { set })`: no type, no conversion, stored raw
const popupParamPort = (): ValueInputDecl => ({ type: '*', coerce: 'none', group: 'Params', examples: [1, 'a', '', null, { id: 2 }] });

/** The project's Close Popup ports (see the header): Results `name,ok`, Close Actions `Save,Cancel`. */
const RESULTS = ['name', 'ok'] as const;
const ACTIONS = ['closeAction-Save', 'closeAction-Cancel'] as const;

const NO_TARGET = 'No Target component is set on this Show Popup node';

export const ShowPopup = defineNode({
  type: 'NavigationShowPopup',
  version: 1,
  source: 'packages/noodl-viewer-react/src/nodes/navigation/showpopup.ts',
  needs: ['popup'],
  worldPool: {
    popups: [
      {},
      { components: ['Popup'] },
      { host: false },
      { components: ['Popup', 'Other'], events: [{ at: 1, close: { results: { name: 'A', ok: true } } }, { at: 5, escape: true }] },
      { components: ['Popup'], events: [{ at: 2, escape: true }, { at: 2, escape: true }, { at: 10, close: { action: 'closeAction-Save', results: { ok: false, extra: 1 } } }] },
      { components: ['Other'], events: [{ at: 1, close: { action: 'closeAction-Nope', results: {} }, popup: 0 }, { at: 3, close: { action: 'closeAction-Cancel' }, popup: 1 }, { at: 3, escape: true }] },
      { components: ['Popup', 'Other'], events: [{ at: 1, close: { action: '', results: { name: null } } }, { at: 1, close: { results: { name: 'B' } } }, { at: 4, escape: true }, { at: 6, close: { results: { ok: 1 } }, popup: 0 }] }
    ],
    advances: [0, 1, 2, 5, 10]
  },

  // :52-55 initialize; every declared default reaches `_inputValues`, never the setter
  state: {
    target: undefined,
    stackPolicy: undefined,
    closeOnEscape: undefined,
    modal: undefined,
    accessibleName: undefined,
    popupParams: {},
    closeResults: {},
    error: undefined,
    scheduled: false,
    presses: 0,
    opened: 0,
    stack: [],
    leaving: []
  } as State,
  // :176-179 outcomeOutputs({ done, failure })
  outcomes: ['done', 'failure'],

  inputs: {
    // :57-65 — stored raw
    target: { type: 'component', coerce: 'none', displayName: 'Target', group: 'General', description: 'Component to open as a popup; its Component Inputs become input ports on this node', examples: ['Popup', 'Other', 'Nope', '', null] },
    // :66-81 — `stack` or else `replace`
    stackPolicy: {
      type: 'enum',
      enums: ['replace', 'stack'],
      default: 'replace',
      coerce: 'none',
      displayName: 'When A Popup Is Open',
      group: 'General',
      description: 'Replace It closes the popup already showing, Show On Top opens this one over it',
      examples: ['replace', 'stack', 'other', null]
    },
    // :87-96 — `value !== false`
    closeOnEscape: {
      type: 'boolean',
      default: true,
      coerce: 'none',
      displayName: 'Close On Escape',
      group: 'General',
      description: 'Lets the person close the popup with the Escape key, which fires Cancelled. Turn off for a popup that must be finished or closed by its own buttons',
      examples: [true, false, 0, 'false', null]
    },
    // :103-112 — `value !== false`
    modal: {
      type: 'boolean',
      default: true,
      coerce: 'none',
      displayName: 'Modal',
      group: 'General',
      description: 'A modal popup is a dialog: the page behind it cannot be used, focus moves into it and Escape closes it. Turn off for an overlay that is not a dialog, such as a toast',
      examples: [true, false, 0, null]
    },
    // :113-121 — a string, or else `undefined`
    accessibleName: {
      type: 'string',
      coerce: 'none',
      displayName: 'Accessible Name',
      group: 'General',
      description: 'What a screen reader announces when the popup opens. Leave empty to use the first heading inside the popup',
      examples: ['Pick a date', '', 5, null]
    },
    // :122-131
    show: { type: 'signal', outcome: true, displayName: 'Show', group: 'Actions', description: 'Opens Target as a popup' }
  },

  outputs: {
    // :141-146
    Closed: { type: 'signal', displayName: 'Closed', group: 'Events', description: 'Fires when the popup was closed without a close action, after Close Results are up to date' },
    // :147-152
    Dismissed: { type: 'signal', displayName: 'Dismissed', group: 'Events', description: 'Fires when another popup replaced this one before the user closed it, so there are no Close Results' },
    // :158-163
    Cancelled: { type: 'signal', displayName: 'Cancelled', group: 'Events', description: 'Fires when the person closed the popup with the Escape key, so there are no Close Results' },
    // :180-188
    error: { type: 'string', from: (s) => s.error, displayName: 'Error', group: 'Error', description: 'Why the popup did not open, set just before Failure fires' }
  }
}).on(
  {
    target: (_s, v) => ({ set: { target: v }, send: [] }),
    stackPolicy: (_s, v) => ({ set: { stackPolicy: v === 'stack' ? 'stack' : 'replace' }, send: [] }),
    closeOnEscape: (_s, v) => ({ set: { closeOnEscape: v !== false }, send: [] }),
    modal: (_s, v) => ({ set: { modal: v !== false }, send: [] }),
    accessibleName: (_s, v) => ({ set: { accessibleName: typeof v === 'string' ? v : undefined }, send: [] }),
    // :127-130, :202-219 — every press is answered at the frame's end
    show: (s) => ({ set: { scheduled: true, presses: s.presses + 1 }, send: [], outcome: 'deferred' })
  },
  {
    afterInputs: (s, _inputs, world) => {
      if (!s.scheduled && s.leaving.length === 0) return { send: [] };
      // The next frame's start (:1287-1300), in the order the popups were closed: each leaves the stack, then tells this node
      let stack = s.stack;
      let closeResults = s.closeResults;
      const pulses: Array<'Closed' | 'Dismissed' | 'Cancelled' | { derived: string }> = [];
      const flagged = new Set<string>();
      for (const l of s.leaving) {
        stack = stack.filter((slot) => slot.n !== l.n);
        if (l.kind === 'cancelled') {
          pulses.push('Cancelled'); // :255-257
          continue;
        }
        // :266-275 — the results replace Close Results; each named port is flagged; then the action, or Closed
        closeResults = l.results;
        for (const key of Object.keys(l.results)) if ((RESULTS as readonly string[]).includes(key)) flagged.add('closeResult-' + key);
        if (!l.action) pulses.push('Closed');
        else if ((ACTIONS as readonly unknown[]).includes(l.action)) pulses.push({ derived: l.action as string });
        // an action with no port: `sendSignalOnOutput` finds no output and sends nothing (node.ts)
      }
      const base = { stack, closeResults, leaving: [] as readonly Leave[] };
      const sendDerived = [...flagged].sort();
      if (!s.scheduled) return { set: base, send: [], sendDerived, pulses };
      // :220-232 — the frame's show, for every press of the frame
      const presses = s.presses;
      const all = (outcome: 'done' | 'failure', error?: string) => Array.from({ length: presses }, () => (error === undefined ? { port: 'show', outcome } : { port: 'show', outcome, error }));
      const shown = { ...base, scheduled: false, presses: 0 };
      if (s.target == undefined) {
        return { set: { ...shown, error: NO_TARGET }, send: ['error'], sendDerived, pulses, outcomes: all('failure', 'show-popup/no-target') };
      }
      const stackPolicy = s.stackPolicy ?? 'replace';
      const popup = { op: 'show' as const, target: s.target, params: s.popupParams, stackPolicy, closeOnEscape: s.closeOnEscape !== false, modal: s.modal !== false, accessibleName: s.accessibleName };
      const answer = world.popupAnswer(s.target);
      // nodecontext.ts :1213 — no host: nothing opens; the promise resolves (:288-290)
      if (answer === 'nohost') return { set: shown, send: [], sendDerived, pulses, popup, outcomes: all('done') };
      // :1240-1242 — `replace` dismisses every popup on the stack first, each told Dismissed (:1220-1236)
      if (stackPolicy === 'replace') {
        for (let i = 0; i < stack.length; i++) pulses.push('Dismissed');
        stack = [];
      }
      // :1243 — the new slot, on top, before the build
      if (answer === 'opened') {
        const slot: Slot = { n: s.opened, modal: popup.modal, closeOnEscape: popup.closeOnEscape, leaving: false };
        return { set: { ...shown, stack: [...stack, slot], opened: s.opened + 1 }, send: [], sendDerived, pulses, popup, outcomes: all('done') };
      }
      // :291-297 — the build failed; the slot stays (C30)
      const slot: Slot = { n: undefined, modal: popup.modal, closeOnEscape: popup.closeOnEscape, leaving: false };
      const error = 'The popup "' + String(s.target) + '" could not be opened: ' + answer.error;
      return { set: { ...shown, stack: [...stack, slot], error }, send: ['error'], sendDerived, pulses, popup, outcomes: all('failure', 'show-popup/target-failed') };
    },
    derived: {
      inputs: () => ({}),
      // :313-329 — the project's ports (see the header)
      outputs: () => {
        const out: Record<string, OutputDecl<State>> = {};
        for (const name of RESULTS) out['closeResult-' + name] = { type: '*', displayName: name, group: 'Close Results', description: 'The close result ' + name + ', as the popup handed it back', from: (s) => s.closeResults[name] };
        for (const port of ACTIONS) out[port] = { type: 'signal', displayName: port.slice('closeAction-'.length), group: 'Close Actions', description: 'Fires when the popup was closed with this close action' };
        return out;
      },
      // :196-198 — stored raw under the name after the prefix
      on: (s, port, value) => ({ set: { popupParams: { ...s.popupParams, [port.slice('popupParam-'.length)]: value } }, send: [] }),
      discover: (port) => (port.startsWith('popupParam-') ? popupParamPort() : undefined),
      candidates: ['popupParam-title', 'popupParam-id']
    },
    world: {
      // What the person did, at its time (world.ts POPUP): marks the popup leaving; the next frame's start tells this node
      popup: (s, _inputs, event) => {
        if (event.kind === 'escape') {
          // nodecontext.ts :1183-1195 — the top MODAL popup, and only it
          const top = [...s.stack].reverse().find((slot) => slot.modal);
          if (!top || !top.closeOnEscape || top.n === undefined || top.leaving) return { send: [] };
          return { set: { stack: s.stack.map((slot) => (slot === top ? { ...slot, leaving: true } : slot)), leaving: [...s.leaving, { n: top.n, kind: 'cancelled' }] }, send: [] };
        }
        // the handler of the n-th popup opened (absent: the last); one no longer open, or already leaving, does nothing (:1289)
        const n = event.popup ?? s.opened - 1;
        const slot = s.stack.find((x) => x.n === n);
        if (!slot || slot.leaving) return { send: [] };
        return { set: { stack: s.stack.map((x) => (x === slot ? { ...x, leaving: true } : x)), leaving: [...s.leaving, { n, kind: 'closed', action: event.action, results: event.results }] }, send: [] };
      }
    }
  }
);
