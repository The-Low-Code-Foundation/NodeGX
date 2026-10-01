/**
 * Push Component To Stack (`PageStackNavigate`) — read from
 * `packages/noodl-viewer-react/src/nodes/navigation/navigate.ts` on 2026-10-01 (NSP-015 s18).
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * THE RULE, before the citations: `Navigate` defers its work to the frame's end (:103-110, :160-175) —
 * every press in a frame is answered, all with the ONE outcome of ONE request handed to the Component
 * Stacks (world.ts STACK), made against the frame's final inputs:
 *   - Mode `push`, or never set (`undefined`), hands `{ target, transition, params }` to the stacks
 *     under Stack's name as a PUSH (:177-202, :180), with `transition` = `{ type: <Transition> }` spread with
 *     every `tr-<name>` value by name (`type` absent when Transition was never set);
 *   - Mode `replace` hands the same as a REPLACE (:203-231, :209), with `type` = Transition or `'None'` when
 *     it is empty;
 *   - any other Mode (`'Push'`, `''`, `null` — the port is an enum, a wire carries anything) hands
 *     NOTHING and the presses are never answered (row C28).
 * Stack, Target and every `pm-<name>` are handed as stored (raw) — Stack `undefined` until written, its
 * declared default `Main` never reaching the setter; `params` is the `pm-` values by name.
 * The stacks' answer settles every press of the frame alike (:142-152, one settle per request even when
 * two stacks share the name): `done` is Done, `unchanged` Unchanged, a failure sets Error to its message
 * and is Failure with its code (:153-159). A request no stack is registered for is queued by the
 * handler and, in a play, never answered. Error keeps its last message — nothing clears it.
 * The ports: `transition` and the transition's own `tr-` ports are what the editor draws from the
 * params (:282-300, transitions/*.ts `ports`); `target` and the `pm-` ports come from the PROJECT —
 * the Component Stack named Stack, its pages and the target component's inputs (:301-345) — so they are
 * registered on first write here (:242-261), as the runtime registers them.
 *
 * TWO ROWS (NSP-015 §6.2) the trace cannot show through the world's stand-in stacks:
 *   C26 — the `backResult-<name>` and `backAction-<name>` outputs the editor draws (from the target
 *         component's Pop Component Stack nodes, :347-375) are never registered (no
 *         `registerOutputIfNeeded`; dropped in the TypeScript port), so a wire from one is refused and
 *         the back channel reaches nothing. The spec declares no such output, as the runtime has none.
 *   C27 — `params` is the node's LIVE object (:181, :210); the stack keeps it, so a later press of the
 *         same page with new `pm-` values is "already showing" to a real stack. The world records
 *         `params` canonically at the call and answers by script, so this is graded nowhere here.
 * ONE ROW the trace shows: C28 — a Mode that is neither `push` nor `replace` answers no press.
 */

import { defineNode, type InputDecl, type ValueInputDecl } from '../spec';

type Rec = Readonly<Record<string, unknown>>;

type State = {
  /** `_internal.stack` — `undefined` until written: a declared default never runs its setter (nodedefinition.ts :539, :575 write it into `_inputValues` only) */
  stack: unknown;
  /** `_internal.navigationMode` — likewise `undefined` until written, which is why :177 reads `undefined` as push */
  mode: unknown;
  /** `_internal.target` (dynamic port, registered on first write) */
  target: unknown;
  /** `_internal.transition` (dynamic port) */
  transition: unknown;
  /** :72 `_internal.transitionParams` — the `tr-` values by name */
  transitionParams: Rec;
  /** :73 `_internal.pageParams` — the `pm-` values by name */
  pageParams: Rec;
  /** `_internal.lastError` */
  error: string | undefined;
  /** :165-174 `hasScheduledNavigate` */
  scheduled: boolean;
  /** :163-164 `pendingOutcomes.length` — the presses this frame's request answers */
  presses: number;
};

// transitions/push-transition.ts and popup-transition.ts `ports` — the `tr-` ports per transition
const TRANSITION_PORTS: Readonly<Record<string, (params: Rec) => string[]>> = {
  None: () => [],
  Push: (p) => ['tr-direction', p['tr-direction'] === 'In' || p['tr-direction'] === 'Out' ? 'tr-zoom' : 'tr-shift', 'tr-crossfade', 'tr-darkoverlay', 'tr-darkoverlayamount', 'tr-timing'],
  Popup: (p) => ['tr-direction', p['tr-direction'] === 'In' || p['tr-direction'] === 'Out' ? 'tr-zoom' : 'tr-shift', 'tr-fadein', 'tr-timing']
};

// :242-261 `registerInputIfNeeded` — `registerInput(name, { set })`: no type, no conversion, stored raw
const targetPort = (): ValueInputDecl => ({ type: 'string', coerce: 'none', displayName: 'Target Page', group: 'General', examples: ['detail', 'home', '', null, 'nope'] });
const transitionPort = (): ValueInputDecl => ({ type: 'enum', enums: Object.keys(TRANSITION_PORTS), coerce: 'none', displayName: 'Transition', group: 'Transition', examples: ['Push', 'None', 'Popup', '', 'Fade'] });
const transitionParamPort = (): ValueInputDecl => ({ type: '*', coerce: 'none', group: 'Transition', examples: ['Left', 'In', { value: 25, unit: '%' }, true, 0.5] });
const pageParamPort = (): ValueInputDecl => ({ type: '*', coerce: 'none', group: 'Parameters', examples: [1, 2, 'a', '', null] });

function discover(port: string): InputDecl | undefined {
  if (port === 'target') return targetPort();
  if (port === 'transition') return transitionPort();
  if (port.startsWith('tr-')) return transitionParamPort();
  if (port.startsWith('pm-')) return pageParamPort();
  return undefined;
}

const FAILURE = { failure: { code: 'push-component-stack/component-not-found', message: 'The Component Stack "Main" has no component "nope" — check the Target Page against its Components list' } } as const;
const TRANSITIONING = { failure: { code: 'push-component-stack/stack-transitioning', message: 'The Component Stack is still animating the previous navigation — this one was dropped' } } as const;

export const PushComponentToStack = defineNode({
  type: 'PageStackNavigate',
  version: 1,
  source: 'packages/noodl-viewer-react/src/nodes/navigation/navigate.ts',
  needs: ['stack'],
  worldPool: {
    stacks: [
      {},
      { names: ['Main'] },
      { names: ['Main'], answers: [{ match: { target: 'nope' }, answer: FAILURE }, { match: { op: 'replace', target: 'detail' }, answer: 'unchanged' }] },
      { names: ['Other'] },
      { names: ['Main', 'Main'], answers: [{ match: { op: 'push' }, answer: 'unchanged' }] },
      { names: ['Main', 'Other'], answers: [{ answer: TRANSITIONING }] }
    ]
  },

  // :71-75 initialize; the declared defaults reach `_inputValues`, never the setters
  state: { stack: undefined, mode: undefined, target: undefined, transition: undefined, transitionParams: {}, pageParams: {}, error: undefined, scheduled: false, presses: 0 } as State,
  // :119-129 outcomeOutputs({ done, unchanged, failure })
  outcomes: ['done', 'unchanged', 'failure'],

  inputs: {
    // :77-86 — stored raw
    stack: {
      type: 'string',
      default: 'Main',
      coerce: 'none',
      displayName: 'Stack',
      group: 'General',
      description: 'Name of the Component Stack to navigate; leave blank for the one named Main',
      examples: ['Main', '', 'Other', null, 0]
    },
    // :87-102 — stored raw
    mode: {
      type: 'enum',
      enums: ['push', 'replace'],
      default: 'push',
      coerce: 'none',
      displayName: 'Mode',
      group: 'General',
      description: 'Push adds the target on top of the stack, Replace swaps it for the component currently showing',
      examples: ['push', 'replace', 'Push', '', null]
    },
    // :103-110
    navigate: { type: 'signal', outcome: true, displayName: 'Navigate', group: 'Actions', description: 'Navigates the Component Stack to Target Page' }
  },

  outputs: {
    // :130-138
    error: { type: 'string', from: (s) => s.error, displayName: 'Error', group: 'Error', description: 'Why the navigation did not happen, set just before Failure fires' }
  }
}).on(
  {
    stack: (_s, v) => ({ set: { stack: v }, send: [] }),
    mode: (_s, v) => ({ set: { mode: v }, send: [] }),
    // :103-110, :160-175 — every press is answered at the frame's end, or (no stack registered) never
    navigate: (s) => ({ set: { scheduled: true, presses: s.presses + 1 }, send: [], outcome: 'pending' })
  },
  {
    // :176-232 — ONE request for the frame's presses
    afterInputs: (s, _inputs, world) => {
      if (!s.scheduled) return { send: [] };
      const reset = { scheduled: false, presses: 0 };
      let op: 'push' | 'replace';
      let type: unknown;
      if (s.mode === 'push' || s.mode === undefined) {
        op = 'push';
        type = s.transition; // :180
      } else if (s.mode === 'replace') {
        op = 'replace';
        type = s.transition || 'None'; // :209
      } else {
        return { set: reset, send: [] }; // C28 — no branch: nothing handed, the presses stay unanswered
      }
      const stack = { op, stack: s.stack, target: s.target, params: s.pageParams, transition: { ...{ type }, ...s.transitionParams } };
      const answer = world.stackAnswer(op, s.stack, s.target);
      if (answer === undefined) return { set: reset, send: [], stack }; // queued by the handler — never answered in a play
      const answerAll = (outcome: 'done' | 'unchanged' | 'failure', error?: string) =>
        Array.from({ length: s.presses }, () => (error === undefined ? { port: 'navigate', outcome } : { port: 'navigate', outcome, error }));
      if (answer === 'done') return { set: reset, send: [], stack, outcomes: answerAll('done') };
      if (answer === 'unchanged') return { set: reset, send: [], stack, outcomes: answerAll('unchanged') };
      // :153-159 reportFailure — Error first, then Failure
      return { set: { ...reset, error: answer.failure.message }, send: ['error'], stack, outcomes: answerAll('failure', answer.failure.code) };
    },
    derived: {
      // :282-300 — Transition always, then the chosen transition's own ports (default per Mode: replace → None, else Push)
      inputs: (params) => {
        const ports: Record<string, InputDecl> = { transition: transitionPort() };
        const chosen = (params.transition as string) || (params.mode === 'replace' ? 'None' : 'Push');
        const of = TRANSITION_PORTS[chosen];
        if (of) for (const name of of(params)) ports[name] = transitionParamPort();
        return ports;
      },
      // :242-261 — target, transition, `tr-` and `pm-` stored raw
      on: (s, port, value) => {
        if (port === 'target') return { set: { target: value }, send: [] };
        if (port === 'transition') return { set: { transition: value }, send: [] };
        if (port.startsWith('tr-')) return { set: { transitionParams: { ...s.transitionParams, [port.slice(3)]: value } }, send: [] };
        return { set: { pageParams: { ...s.pageParams, [port.slice(3)]: value } }, send: [] };
      },
      discover,
      candidates: ['target', 'transition', 'tr-direction', 'tr-type', 'pm-id', 'pm-name']
    },
    // the stacks' answers are read and settled in `afterInputs` (WorldView.stackAnswer); a press no stack answers stays pending
    world: {}
  }
);
