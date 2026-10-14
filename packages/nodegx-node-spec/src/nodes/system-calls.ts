/**
 * The call every cloud user-admin and role node makes on the backend process (NSP-022 s96) — read from
 * `packages/noodl-viewer-cloud/src/nodes/cloud/system-users.ts` (`callSystemUsers`, `scheduleAction`, `drainOutcomes`,
 * `setError`) and its twin `system-roles.ts` (`callSystemRoles`) on 2026-10-12. The two files are the same code but for their
 * words (`user` / `role`), so one spec helper holds both, as `record-relation.ts` holds the two relation nodes.
 *
 * THE RULE (system-users.ts :131-221, system-roles.ts :93-185):
 *   - `Do` takes a token per press and ONE run at the end of the frame (`scheduleAction`); the run drains the batch first
 *     (`drainOutcomes`), so a press while an answer is out is the next run's.
 *   - the node's own checks first (a blank Username, User Id, Role…), each a Failure with its sentence and code at once;
 *   - outside a backend (no `_noodl_system_users` / `_noodl_system_roles` — world.ts HOST): Failure, `<family>/no-backend`, the
 *     node's label and the family's sentence; no call;
 *   - else ONE call with the node's request, its answer taken with `Promise.resolve(…)`:
 *       no answer, or one with no `outcome` → Failure `<family>/no-answer`;
 *       `failure` → Failure with the answer's `code` and `error` (else `<family>/failed` and the family's sentence);
 *       `done` / `unchanged` → Error is the answer's `error` on Unchanged and cleared on Done, the node's outputs written
 *         (`onDone`), then the outcome VERBATIM per press — `unchanged` read through Treat Unchanged as when it is reported
 *         (node.ts :1049-1067: Done, or Failure `outcome/unchanged-as-failure`);
 *       a rejection → Failure `<family>/failed`, "The <family> operation failed: <message>".
 *   Every failure puts its message on Error (`setError`) and touches no other output.
 */

import type { InputDecl } from '../spec';
import type { HostAnswerEvent, WorldView } from '../spec';

export type Family = 'user' | 'role';

/** system-users.ts :54-56, system-roles.ts :55-57 — the second half of the sentence a node outside a backend gives. */
export const NO_BACKEND: Readonly<Record<Family, string>> = Object.freeze({
  user: 'no user store is available. This node only works inside a nodegx-backend cloud function (CWF-015) — it is not usable in the browser viewer, where creating accounts is what Sign Up is for.',
  role: 'no role store is available. This node only works inside a nodegx-backend cloud function — role membership is the only way an account gains privilege, so it is never writable from the browser.'
});

const SERVICE = { user: 'users', role: 'roles' } as const;

/** The state every node of the families carries beside its own. */
export type CallState = {
  error: string | undefined;
  treatUnchangedAs: unknown;
  /** the presses this frame holds tokens for (`pendingOutcomes`) */
  pending: number;
  /** the presses each call settles, by the spec's call id */
  calls: Readonly<Record<string, number>>;
  nextCall: number;
};

export const CALL_STATE: CallState = { error: undefined, treatUnchangedAs: 'unchanged', pending: 0, calls: {}, nextCall: 1 };

/** outcome.ts :228-261 `outcomeInputs` — the families declare all three outcomes, so all three readings. */
export const TREAT_UNCHANGED_INPUT: InputDecl = {
  type: 'enum',
  enums: ['unchanged', 'done', 'failure'],
  default: 'unchanged',
  coerce: 'none',
  editOnly: true,
  displayName: 'Treat Unchanged as',
  group: 'Advanced',
  description:
    'What this node reports when the action was valid and there was nothing to do. Unchanged (the default) keeps it a third outcome of its own. Done suits a project whose chains should carry on either way; Failure suits one whose idiom is that a no-op is a bug. Completed fires whatever this is set to.'
};

/** system-users.ts :226-234 / system-roles.ts :199-207 — the `Error` output, the same on every node of a family. */
export const errorOutput = (family: Family) =>
  ({ type: 'string', from: (s: { error: string | undefined }) => s.error, displayName: 'Error', group: 'Error', description: family === 'user' ? 'Why the last operation could not be performed. It never contains a password, a hash or a token' : 'Why the last operation could not be performed' }) as const;

type Settled = { port: string; outcome: 'done' | 'unchanged' | 'failure'; error?: string };

/**
 * What the two helpers hand back: a patch over port names the CALLING spec declares (`error`, its outputs, its Do), which this
 * shared module cannot name in its types — so erased here, and checked where it counts, by the interpreter at run time.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ErasedPatch = any;
const many = (n: number, o: Settled): Settled[] => Array.from({ length: n }, () => ({ ...o }));

/** A press: one more token in the frame's batch. */
export function press<S extends CallState>(s: S, says: string) {
  return { says, set: { pending: s.pending + 1 } as Partial<S>, send: [] as never[], outcome: 'pending' as const };
}

/**
 * The frame-end run. `check` is the node's own pre-checks, in order (`[code, message]` for the first that fails, else
 * `undefined`); `clear` the outputs the node clears before it checks anything (Verify Session Token's three).
 */
export function frameEnd<S extends CallState>(
  s: S,
  w: WorldView,
  family: Family,
  port: string,
  label: string,
  check: () => readonly [string, string] | undefined,
  request: () => Record<string, unknown>,
  clear: { set?: Partial<S>; send?: readonly string[] } = {}
): ErasedPatch {
  if (s.pending === 0) return { send: [] };
  const n = s.pending;
  const base = { ...(clear.set ?? {}), pending: 0 } as Partial<S>;
  const sent = [...(clear.send ?? [])];
  const failed = check();
  if (failed) return { set: { ...base, error: failed[1] }, send: [...sent, 'error'], outcomes: many(n, { port, outcome: 'failure', error: failed[0] }) };
  if (!w.hostHas(SERVICE[family])) return { set: { ...base, error: `${label}: ${NO_BACKEND[family]}` }, send: [...sent, 'error'], outcomes: many(n, { port, outcome: 'failure', error: `${family}/no-backend` }) };
  const id = `${family}:${s.nextCall}`;
  return { set: { ...base, calls: { ...s.calls, [id]: n }, nextCall: s.nextCall + 1 }, send: sent, host: { id, service: SERVICE[family], request: request() } };
}

/** The answer. `onDone` writes the node's outputs from a `done` / `unchanged` result: what it sets and sends. */
export function answered<S extends CallState>(
  s: S,
  answer: HostAnswerEvent,
  family: Family,
  port: string,
  onDone: (result: Record<string, unknown>) => { set: Partial<S>; send: readonly string[] }
): ErasedPatch {
  const n = s.calls[answer.id] ?? 0;
  const fail = (code: string, message: string) => ({ set: { error: message } as Partial<S>, send: ['error'], outcomes: many(n, { port, outcome: 'failure', error: code }) });
  if ('threw' in answer) return fail(`${family}/failed`, `The ${family} operation failed: ${answer.threw}`);
  const result = answer.ok as Record<string, unknown> | null | undefined;
  if (!result || !result.outcome) return fail(`${family}/no-answer`, `The backend gave no answer to this ${family} operation.`);
  if (result.outcome === 'failure') return fail((result.code as string) || `${family}/failed`, (result.error as string) || `The ${family} operation failed.`);
  const outputs = onDone(result);
  const reported: Settled =
    result.outcome === 'unchanged' && s.treatUnchangedAs === 'done'
      ? { port, outcome: 'done' }
      : result.outcome === 'unchanged' && s.treatUnchangedAs === 'failure'
        ? { port, outcome: 'failure', error: 'outcome/unchanged-as-failure' }
        : { port, outcome: result.outcome as 'done' | 'unchanged' };
  return {
    set: { ...outputs.set, error: result.outcome === 'unchanged' ? (result.error as string | undefined) : undefined } as Partial<S>,
    send: ['error', ...outputs.send],
    outcomes: many(n, reported)
  };
}
