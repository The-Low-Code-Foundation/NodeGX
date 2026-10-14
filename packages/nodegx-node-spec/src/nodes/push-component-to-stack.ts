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
 *     nothing; Error is "Unknown mode '<the value>' — Mode must be push or replace" and every press is
 *     Failure `push-component-stack/unknown-mode` (v2, row C28 — v1 never answered them).
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
 * TWO ROWS (NSP-015 §6.2) the trace cannot show through the world's stand-in stacks, both fixed in P109 ISL-028:
 *   C26 (fixed) — the `backResult-<name>` and `backAction-<name>` outputs the editor draws (from the target
 *         component's Pop Component Stack nodes) were never registered (`registerOutputIfNeeded` was dropped
 *         in the TypeScript port), so a wire from one was refused. The method is back. The world's stacks have
 *         no back channel, so the spec still declares no such output; graded in the viewer
 *         (`isl-028-push-back-results-and-actions.test.ts`).
 *   C27 (fixed, P109 ISL-028) — `params` was the node's LIVE object, which the stack kept on the entry, so a
 *         later press of the same page with new `pm-` values was "already showing". The node now hands a
 *         copy (:183, :214). The world records `params` canonically at the call and answers by script, so
 *         this is graded in the viewer (`isl-028-a-second-press-with-new-parameters.test.ts`), not here.
 * ONE ROW the trace shows, fixed in P109 ISL-028: C28 — a Mode that is neither `push` nor `replace` answered no press.
 */

import { defineNode, type ComponentInterface, type InputDecl, type OutputDecl, type PortContext, type ValueInputDecl } from '../spec';

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

/**
 * transitions/push-transition.ts :133-196 and popup-transition.ts :83-136 `ports` — the `tr-` ports per transition, as the editor
 * draws them: typed, named, and with the default the panel shows (`drawnDefault`; the node holds nothing until one is written).
 * Direction In or Out swaps Shift Distance for Zoom. None draws none (none-transition.ts :23).
 */
const DIRECTIONS = ['Right', 'Left', 'Up', 'Down', 'In', 'Out'];
const trPort = (displayName: string, type: ValueInputDecl['type'], drawnDefault?: unknown): ValueInputDecl => ({ ...transitionParamPort(), type, displayName, ...(drawnDefault !== undefined ? { drawnDefault } : {}) });
const distance = (p: Rec): Record<string, ValueInputDecl> =>
  p['tr-direction'] === 'In' || p['tr-direction'] === 'Out' ? { 'tr-zoom': trPort('Zoom', 'number', { value: 25, unit: '%' }) } : { 'tr-shift': trPort('Shift Distance', 'number', { value: 25, unit: '%' }) };
const TRANSITION_PORTS: Readonly<Record<string, (params: Rec) => Record<string, ValueInputDecl>>> = {
  None: () => ({}),
  Push: (p) => ({
    'tr-direction': { ...trPort('Direction', 'enum', 'Left'), enums: DIRECTIONS },
    ...distance(p),
    'tr-crossfade': trPort('Crossfade', 'boolean', false),
    'tr-darkoverlay': trPort('Dark Overlay', 'boolean', true),
    'tr-darkoverlayamount': trPort('Dark Overlay Amount', 'number', 0.5),
    'tr-timing': trPort('Timing', 'curve')
  }),
  Popup: (p) => ({
    'tr-direction': { ...trPort('Direction', 'enum', 'Right'), enums: DIRECTIONS },
    ...distance(p),
    'tr-fadein': trPort('Fade In', 'boolean', false),
    'tr-timing': trPort('Timing', 'curve')
  })
};

/** :365-404 — a list param of a node inside the target page (`'a,b'`), split on commas. */
const listOf = (v: unknown): string[] => (typeof v === 'string' ? v.split(',') : []);

// :242-261 `registerInputIfNeeded` — `registerInput(name, { set })`: no type, no conversion, stored raw
const targetPort = (): ValueInputDecl => ({ type: 'string', coerce: 'none', displayName: 'Target Page', group: 'General', examples: ['detail', 'home', '', null, 'nope'] });
const transitionPort = (): ValueInputDecl => ({ type: 'enum', enums: Object.keys(TRANSITION_PORTS), coerce: 'none', displayName: 'Transition', group: 'Transition', examples: ['Push', 'None', 'Popup', '', 'Fade'] });
const transitionParamPort = (): ValueInputDecl => ({ type: '*', coerce: 'none', group: 'Transition', examples: ['Left', 'In', { value: 25, unit: '%' }, true, 0.5] });
const pageParamPort = (): ValueInputDecl => ({ type: '*', coerce: 'none', group: 'Parameters', examples: [1, 2, 'a', '', null] });

/** :338-363 — the Component Stack named Stack, its pages, and the component the target page (Target, else the first) shows. */
function targetPage(params: Rec, context: Readonly<PortContext>): { pages: readonly string[]; labels?: Readonly<Record<string, string>>; component: ComponentInterface | undefined } | undefined {
  const stack = (context.stacks ?? []).find((st) => st.name === ((params.stack as string) || 'Main'));
  if (!stack || stack.pages.length === 0) return undefined;
  const id = (params.target as string) || stack.pages[0];
  const name = stack.components?.[id];
  return { pages: stack.pages, labels: stack.labels, component: name !== undefined ? context.components?.[name] : undefined };
}

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
  // v2 (P109 ISL-028, row C28 ruled "Fail and name the value"): a press with a Mode that is neither push nor replace
  // is Failure `push-component-stack/unknown-mode`, Error naming the value. v1 handed nothing and never answered it.
  version: 2,
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
    stack: (_s, v) => ({ says: 'always: kept as written; the next Navigate goes to the Page Stack of this name (blank: Main)', set: { stack: v }, send: [] }),
    mode: (_s, v) => ({ says: 'always: kept; read by the next Navigate — Push adds Target Page on top of the stack, Replace swaps it for every page showing; anything else (a wire can carry any value) fails the Navigate, Error naming the value', set: { mode: v }, send: [] }),
    // :103-110, :160-175 — every press is answered at the frame's end, or (no stack registered) never
    navigate: (s) => ({
      says: "always: one request at the end of the frame, however many presses, from the frame's final Stack, Mode, Target Page, Transition and parameters — Done for each press when the stack shows the page (Unchanged when that page with those parameters is already on top), Error and Failure for each when it cannot (no such page, an empty Components list, a transition still running) or when Mode is neither Push nor Replace; while no Page Stack is mounted under the name the request waits, and runs when one mounts (a push: after that stack rebuilds its start page)",
      set: { scheduled: true, presses: s.presses + 1 },
      send: [],
      outcome: 'pending'
    })
  },
  {
    // :176-232 — ONE request for the frame's presses
    afterInputs: (s, _inputs, world) => {
      if (!s.scheduled) return { send: [] };
      const reset = { scheduled: false, presses: 0 };
      const answerAll = (outcome: 'done' | 'unchanged' | 'failure', error?: string) =>
        Array.from({ length: s.presses }, () => (error === undefined ? { port: 'navigate', outcome } : { port: 'navigate', outcome, error }));
      let op: 'push' | 'replace';
      let type: unknown;
      if (s.mode === 'push' || s.mode === undefined) {
        op = 'push';
        type = s.transition; // :180
      } else if (s.mode === 'replace') {
        op = 'replace';
        type = s.transition || 'None'; // :209
      } else {
        // C28 (v2): nothing handed; Error names the value, then every press is Failure
        const error = `Unknown mode '${String(s.mode)}' — Mode must be push or replace`;
        return { set: { ...reset, error }, send: ['error'], outcomes: answerAll('failure', 'push-component-stack/unknown-mode') };
      }
      const stack = { op, stack: s.stack, target: s.target, params: s.pageParams, transition: { ...{ type }, ...s.transitionParams } };
      const answer = world.stackAnswer(op, s.stack, s.target);
      if (answer === undefined) return { set: reset, send: [], stack }; // queued by the handler — never answered in a play
      if (answer === 'done') return { set: reset, send: [], stack, outcomes: answerAll('done') };
      if (answer === 'unchanged') return { set: reset, send: [], stack, outcomes: answerAll('unchanged') };
      // :153-159 reportFailure — Error first, then Failure
      return { set: { ...reset, error: answer.failure.message }, send: ['error'], stack, outcomes: answerAll('failure', answer.failure.code) };
    },
    derived: {
      // :309-336 — Transition always, its default per Mode (replace → None, else Push), then the chosen transition's own ports.
      // NSP-020 s84 — then, from the PROJECT (:338-404): the Component Stack named Stack (`Main` unset, either side); with pages,
      // Target Page over them (the first the default), and the target page's component's inputs as `pm-` ports. At play the
      // context has no stacks: a write registers each (:242-261)
      inputs: (params, context) => {
        const fallback = params.mode === 'replace' ? 'None' : 'Push';
        const ports: Record<string, InputDecl> = { transition: { ...transitionPort(), drawnDefault: fallback } };
        const of = TRANSITION_PORTS[(params.transition as string) || fallback];
        if (of) Object.assign(ports, of(params));
        const page = targetPage(params, context);
        if (page) {
          ports.target = { ...targetPort(), type: 'enum', enums: page.pages, drawnDefault: page.pages[0], ...(page.labels ? { labels: page.labels } : {}) };
          for (const name of Object.keys(page.component?.inputs ?? {})) ports['pm-' + name] = { ...pageParamPort(), displayName: name };
        }
        return ports;
      },
      // :380-404 — each Pop Component Stack node inside the target page: its Back Actions as signals, its Results as values,
      // each once. The runtime registers them on a wire (C26, P109 ISL-028); the world's stacks have no back channel, so no
      // play wires one (no `outputCandidates`) and they are graded in the viewer (header)
      outputs: (params, context) => {
        const out: Record<string, OutputDecl<State>> = {};
        for (const back of targetPage(params, context)?.component?.nodes?.PageStackNavigateBack ?? []) {
          for (const a of listOf(back.backActions)) if (!('backAction-' + a in out)) out['backAction-' + a] = { type: 'signal', displayName: a, group: 'Back Actions', onWire: true };
          for (const r of listOf(back.results)) if (!('backResult-' + r in out)) out['backResult-' + r] = { type: '*', displayName: r, group: 'Back Results', onWire: true, from: () => undefined };
        }
        return out;
      },
      needs: ['stacks', 'components'],
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
