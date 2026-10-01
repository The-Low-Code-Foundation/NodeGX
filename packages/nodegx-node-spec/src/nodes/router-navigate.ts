/**
 * Navigate (`RouterNavigate`) — read from `packages/noodl-viewer-react/src/nodes/navigation/router-navigate.ts`
 * and `router-handler.ts` on 2026-10-01 (NSP-015 s19).
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * THE RULE, before the citations: `Navigate` defers its work to the frame's end (:46-48, :112-128) — every
 * press in a frame is answered, all with the ONE outcome of ONE navigate handed to the Routers (world.ts
 * ROUTE), made against the frame's final inputs: `{ router, target, params, openInNewTab }` (:129-147), each
 * as stored — Router and Target `undefined` until written, `params` the `pm-` values by name, Open in new tab
 * `!!value` (:57-59), `false` until written (:39). The handler hands it on ONE MILLISECOND later (a world
 * timer, router-handler.ts :53) and only then is it answered — never in the frame that asked:
 *   - a failure (the Router's own checks: no Target, a Target that is not one of its pages) sets Error to its
 *     message and is Failure with its code AT ONCE (:144-146, :104-111);
 *   - `done` / `unchanged` settle the presses at the end of the frame the answer lands in (:134-143) — so when two
 *     navigates are answered in one millisecond, a LATER one's Failure is reported before an earlier one's Done
 *     (found by the deep run, s19: the first spec settled both in arrival order).
 * A navigate no router answers to (world.ts ROUTE: one registered name takes everything; otherwise the name
 * as handed, a blank one included — there is no `Main` rule on this side) is queued and, in a play, never
 * answered. One settle per navigate even when two routers share the name (:99-103). Error keeps its last
 * message — nothing clears it.
 * The ports: `router` (an enum of the project's Routers, drawn only when there are two or more), `target`
 * (the Router's pages) and `pm-<name>` (the target page's Page Inputs) come from the PROJECT (the editor's
 * RouterNavigateAdapter), not from this node's params — so they are registered on first write here
 * (:158-176), as the runtime registers them. NSP-020's case, as Push Component To Stack's.
 *
 * READ, NOT GRADED HERE (the stand-in router answers by script; NSP-015 §6.2):
 *   - `params` is the node's LIVE object (:132). The handler reads it 1 ms after the call, and the Router keeps
 *     it as `currentParams` (router.tsx :917), comparing it with the next navigate's — which, from the same
 *     node, is the same object. Push Component To Stack's C27, on the Router (row C29).
 */

import { defineNode, type InputDecl, type ValueInputDecl } from '../spec';

type Rec = Readonly<Record<string, unknown>>;

/** One navigate handed and not yet handed on (the handler's 1 ms). */
type Request = Readonly<{ presses: number; router: unknown; target: unknown; openInNewTab: unknown }>;

type State = {
  /** `_internal.router` (dynamic port) — `undefined` until written */
  router: unknown;
  /** `_internal.target` (dynamic port) — `undefined` until written */
  target: unknown;
  /** :38 `_internal.pageParams` — the `pm-` values by name */
  pageParams: Rec;
  /** :39 `_internal.openInNewTab` */
  openInNewTab: boolean;
  /** `_internal.lastError` */
  error: string | undefined;
  /** :117-118 `hasScheduledNavigate` */
  scheduled: boolean;
  /** :114-115 `pendingOutcomes.length` — the presses this frame's navigate answers */
  presses: number;
  /** navigates handed, waiting for the handler's +1 ms, oldest first */
  requests: readonly Request[];
  /** :134-143 — Done / Unchanged answers waiting for the frame's end (`scheduleAfterInputsHaveUpdated`), in arrival order */
  answered: ReadonlyArray<Readonly<{ outcome: 'done' | 'unchanged'; presses: number }>>;
};

// :158-176 `registerInputIfNeeded` — `registerInput(name, { set })`: no type, no conversion, stored raw
const targetPort = (): ValueInputDecl => ({ type: 'component', coerce: 'none', displayName: 'Target Page', group: 'General', examples: ['/Home', '/Detail', '', null, '/Nope'] });
const routerPort = (): ValueInputDecl => ({ type: 'enum', enums: [], coerce: 'none', displayName: 'Router', group: 'General', examples: ['Main', 'Other', '', null] });
const pageParamPort = (): ValueInputDecl => ({ type: '*', coerce: 'none', group: 'Parameters', examples: [1, 2, 'a', '', null] });

function discover(port: string): InputDecl | undefined {
  if (port === 'target') return targetPort();
  if (port === 'router') return routerPort();
  if (port.startsWith('pm-')) return pageParamPort();
  return undefined;
}

const NO_TARGET = { failure: { code: 'navigate/no-target-page', message: 'No Target Page is set on this Navigate node' } } as const;
const NOT_A_PAGE = { failure: { code: 'navigate/page-not-found', message: '"/Nope" is not a page of this Router — check the Target Page against the Router\'s Pages' } } as const;

export const RouterNavigate = defineNode({
  type: 'RouterNavigate',
  // v2 (NSP-015 s19, the same session): a Done or Unchanged is reported at the end of the frame its answer lands in,
  // a Failure at once — so when two navigates are answered in one millisecond, a later one's Failure comes before an
  // earlier one's Done. v1 reported every answer at once, in arrival order. Found by the 10,000 deep run.
  version: 2,
  source: 'packages/noodl-viewer-react/src/nodes/navigation/router-navigate.ts',
  needs: ['router'],
  worldPool: {
    routers: [
      {},
      { names: ['Main'] },
      { names: ['Main'], answers: [{ match: { noTarget: true }, answer: NO_TARGET }, { match: { target: '/Nope' }, answer: NOT_A_PAGE }, { match: { target: '/Detail', openInNewTab: false }, answer: 'unchanged' }] },
      { names: ['Other'] },
      { names: ['Main', 'Main'], answers: [{ answer: 'unchanged' }] },
      { names: ['Main', 'Other'], answers: [{ match: { noTarget: true }, answer: NO_TARGET }] }
    ],
    advances: [0, 1, 2, 10]
  },

  // :37-40 initialize; the declared default reaches `_inputValues`, never the setter
  state: { router: undefined, target: undefined, pageParams: {}, openInNewTab: false, error: undefined, scheduled: false, presses: 0, requests: [], answered: [] } as State,
  // :71-79 outcomeOutputs({ done, unchanged, failure })
  outcomes: ['done', 'unchanged', 'failure'],

  inputs: {
    // :42-49
    navigate: { type: 'signal', outcome: true, displayName: 'Navigate', group: 'Actions', description: 'Navigates the Router to Target Page' },
    // :50-60 — `!!value`
    openInNewTab: {
      type: 'boolean',
      default: false,
      coerce: 'none',
      displayName: 'Open in new tab',
      group: 'General',
      description: 'Opens the target page in a new browser tab instead of navigating this one',
      examples: [true, false, 'yes', 0, null]
    }
  },

  outputs: {
    // :80-88
    error: { type: 'string', from: (s) => s.error, displayName: 'Error', group: 'Error', description: 'Why the navigation did not happen, set just before Failure fires' }
  }
}).on(
  {
    openInNewTab: (_s, v) => ({ set: { openInNewTab: !!v }, send: [] }),
    // :46-48, :112-128 — every press is answered once the handler hands the frame's navigate on, or (no router) never
    navigate: (s) => ({ set: { scheduled: true, presses: s.presses + 1 }, send: [], outcome: 'pending' })
  },
  {
    // The frame's end, in the runtime's callback order: first the Done / Unchanged answers that landed since the last
    // frame (:134-143 — each registered when its answer landed, before any press of this frame registered its own),
    // then :119-127, :129-133 — ONE navigate for the frame's presses, handed now and handed on at +1 ms (router-handler.ts :53)
    afterInputs: (s) => {
      if (!s.scheduled && s.answered.length === 0) return { send: [] };
      const outcomes = s.answered.flatMap((a) => Array.from({ length: a.presses }, () => ({ port: 'navigate', outcome: a.outcome })));
      if (!s.scheduled) return { set: { answered: [] }, send: [], outcomes };
      const request: Request = { presses: s.presses, router: s.router, target: s.target, openInNewTab: s.openInNewTab };
      return {
        set: { scheduled: false, presses: 0, requests: [...s.requests, request], answered: [] },
        send: [],
        outcomes,
        route: { router: s.router, target: s.target, params: s.pageParams, openInNewTab: s.openInNewTab },
        after: [{ ms: 1, tag: 'route' }]
      };
    },
    derived: {
      inputs: () => ({}),
      // :149-157 — target, router and `pm-` stored raw
      on: (s, port, value) => {
        if (port === 'target') return { set: { target: value }, send: [] };
        if (port === 'router') return { set: { router: value }, send: [] };
        return { set: { pageParams: { ...s.pageParams, [port.slice(3)]: value } }, send: [] };
      },
      discover,
      candidates: ['target', 'router', 'pm-id', 'pm-name']
    },
    world: {
      // router-handler.ts :53-66 — the oldest navigate is handed on; the routers under the resolved name answer it
      timer: (s, _inputs, _tag, world) => {
        const [request, ...rest] = s.requests;
        const answer = world.routeAnswer(request.router, request.target, request.openInNewTab);
        if (answer === undefined) return { set: { requests: rest }, send: [] }; // queued — never answered in a play
        // :134-143 — Done / Unchanged wait for the frame's end; a later navigate's Failure (below, at once) overtakes them
        if (answer === 'done' || answer === 'unchanged') return { set: { requests: rest, answered: [...s.answered, { outcome: answer, presses: request.presses }] }, send: [] };
        // :144-146, :104-111 reportFailure — at once: Error first, then Failure
        const failures = Array.from({ length: request.presses }, () => ({ port: 'navigate', outcome: 'failure' as const, error: answer.failure.code }));
        return { set: { requests: rest, error: answer.failure.message }, send: ['error'], outcomes: failures };
      }
    }
  }
);
