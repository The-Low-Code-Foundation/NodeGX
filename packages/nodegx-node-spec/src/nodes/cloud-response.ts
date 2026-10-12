/**
 * Response (`noodl.cloud.response`) — read from `packages/noodl-viewer-cloud/src/nodes/cloud/response.ts` and the runner that
 * hands it the request's callbacks (`noodl-viewer-cloud/src/index.ts` `CloudRunner.run` :297-323) on 2026-10-12 (NSP-022 s97).
 * Cloud-only: graded on the runtime's cloud target, in a function the world hands a request (world.ts HOST, THE INVOCATION).
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * THE RULE. Send takes a token per press and answers at once (`sendResponse` :148-211), reading the inputs as they stand:
 *   - a Response that holds no request — it was not part of the function when the request arrived, or no request reached the
 *     function (the runner installs the callbacks only on the Response nodes of the component it built, :301-323) — fails:
 *     `response/no-request-in-scope` (:157-164);
 *   - a request already answered — by another Response, by this one, by the request's refusal, or abandoned by the runner's
 *     timeout — fails: `response/already-sent` (:172-179);
 *   - otherwise the payload goes out: Status unset or `success` (exactly) is `200` carrying `{"result": <Parameters>}`; anything
 *     else `400` carrying `{"error": <Error Message>}` (:149, :181-183). Done is reported BEFORE the payload is delivered
 *     (:198 then :208): delivering tears the function down. Every failure puts its reason on Error (`_failResponse` :139-147);
 *     a Done touches nothing.
 * Parameters (`params`) lists names; each makes an INPUT `pm-<name>` (shown while Status is Success or unset, :15-44) whose
 * value the payload carries under its name — every `pm-` input written, whatever the list says (`registerInputIfNeeded`
 * :212-220), from its first write on.
 *
 * Not in a one-node play: the runner's teardown once the payload is delivered (index.ts :238-271, graded by its own tests), and
 * the branch reached only when something downstream of this node's own Done answers the request first (:200-210).
 */

import { defineNode, type ValueInputDecl } from '../spec';
import type { HostScript } from '../world';

type State = {
  /** :45-47, :127-129 — by name, in the order first written */
  responseParameters: Readonly<Record<string, unknown>>;
  /** :116-124, :140 */
  lastError: string | undefined;
};

/** :160 */
export const NO_REQUEST = 'This Response node has no request to answer — it was not part of the cloud function when the request arrived';
/** :166-167 */
export const ALREADY_SENT = 'The request has already been answered — a cloud function can only send one response';

/** :32-43 / :217-219 — a parameter's value input, type `*`, raw */
const paramInput = (name: string): ValueInputDecl => ({ type: '*', coerce: 'none', displayName: name, group: 'Parameters', description: `The value returned under ${name} in the response body`, examples: [42, 'ok', true, null, { a: 1 }, [1, 2]] });

const NAMES = ['total', 'ok'];

/** The processes a sequence plays in: no request; a request open the whole play; one another Response, or the runner's timeout, settles. */
const HOSTS: ReadonlyArray<HostScript> = [{}, { invocation: {} }, { invocation: {} }, { invocation: { settledAt: 10 } }, { invocation: { settledAt: 1 } }];

export const CloudResponse = defineNode({
  type: 'noodl.cloud.response',
  version: 1,
  source: 'packages/noodl-viewer-cloud/src/nodes/cloud/response.ts; packages/noodl-viewer-cloud/src/index.ts',
  needs: ['host'],
  worldPool: { hosts: HOSTS },

  state: { responseParameters: {}, lastError: undefined } as State,
  // :111-115 outcomeOutputs({ done, failure }) — no Unchanged
  outcomes: ['done', 'failure'],

  inputs: {
    // :49-56 — held raw
    params: { type: 'stringlist', coerce: 'none', editOnly: true, group: 'Parameters', description: 'Names to return in the response body, each becoming an input to supply it', examples: ['total', 'total,ok', 'ok', ''] },
    // :57-65 — held raw
    errorMessage: { type: 'string', coerce: 'none', displayName: 'Error Message', group: 'General', description: 'Message returned to the caller; used only when Status is Failure', examples: ['Not allowed', '', 0] },
    // :77-98 — held raw; the declared default never runs the setter, so unset reads as success (:149)
    status: { type: 'enum', enums: ['success', 'failure'], default: 'success', coerce: 'none', displayName: 'Status', group: 'General', description: 'Whether the caller gets a 200 carrying Parameters or a 400 carrying Error Message', examples: ['success', 'failure', 'Success'] },
    // :66-76
    send: { type: 'signal', outcome: true, displayName: 'Send', group: 'General', description: 'Sends the response and ends the request, which can only happen once' }
  },

  outputs: {
    // :116-124
    error: { type: 'string', from: (s) => s.lastError, displayName: 'Error', group: 'Error', description: 'Why the response could not be sent' }
  }
}).on(
  {
    params: () => ({ says: 'always: nothing while it runs; each name makes a value input the payload carries', send: [] }),
    errorMessage: () => ({ says: 'always: read when Send is pressed with Status Failure', send: [] }),
    status: () => ({ says: 'always: read when Send is pressed — unset or success is a 200, anything else a 400', send: [] }),
    send: (s, i, w) => {
      const req = w.invocation();
      if (req === 'none') return { says: 'no request reached the function this node is part of: the reason on Error', set: { lastError: NO_REQUEST }, send: ['error'], outcome: 'failure', error: 'response/no-request-in-scope' };
      if (req === 'settled') return { says: 'the request was already answered — by another Response, by a refusal, or by the runner\'s timeout: the reason on Error', set: { lastError: ALREADY_SENT }, send: ['error'], outcome: 'failure', error: 'response/already-sent' };
      const success = i.status === undefined || i.status === 'success';
      const payload = success ? { status: 200, body: JSON.stringify({ result: s.responseParameters }) } : { status: 400, body: JSON.stringify({ error: i.errorMessage }) };
      return { says: 'otherwise: the payload goes out just after — a 200 carrying the Parameters when Status is unset or success, else a 400 carrying the Error Message', send: [], outcome: 'done', answers: [{ op: 'respond', ...payload }] };
    }
  },
  {
    derived: {
      // :32-43 — drawn while Status is Success or unset
      inputs: (params) => (params.status === 'success' || params.status === undefined ? Object.fromEntries(paramNamesOf(params.params).map((n) => ['pm-' + n, paramInput(n)])) : {}),
      // :212-220 — any `pm-` name, on its first write
      discover: (port) => (port.startsWith('pm-') ? paramInput(port.slice('pm-'.length)) : undefined),
      candidates: NAMES.map((n) => 'pm-' + n),
      // :127-129
      on: (s, port, v) => ({ set: { responseParameters: { ...s.responseParameters, [port.slice('pm-'.length)]: v } }, send: [] })
    }
  }
);

/** :244 — the editor-side split of the list (`decodeStringList`): empty entries dropped, repeats collapsed */
function paramNamesOf(value: unknown): string[] {
  if (value === undefined) return [];
  return String(value)
    .split(',')
    .filter((p, i, all) => p && all.indexOf(p) === i);
}
