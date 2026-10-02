/**
 * Request Magic Link (`net.noodl.user.RequestMagicLink`) and Sign In With (`net.noodl.user.SignInWith`) — read from
 * `packages/noodl-viewer-react/src/nodes/std-library/user/{requestmagiclink,signinwith}.ts` on 2026-10-02 (NSP-014 s28),
 * with the viewer's `userservice.ts`, `RestAuthAdapter.ts` and `ParseAuthAdapter.ts` beside them. The two user nodes whose
 * sign-in finishes SOMEWHERE ELSE — in an inbox, at a provider — so neither moves the session on the page that pressed Do.
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from (requestmagiclink.ts or
 * signinwith.ts, named).
 *
 * HELD VALUES: Email and Redirect (requestmagiclink.ts :103-120), Provider and Redirect (signinwith.ts :149-166) are held
 * as they arrive, no conversion. Neither node has a Backend input: every call goes to the ACTIVE backend
 * (userservice.ts :408-418, `backendId` absent).
 *
 * DO — Log In's shape (user-actions.ts): one token per press, minted before the guard; ONE call per frame for any number
 * of presses; the batch taken before the call goes out (requestmagiclink.ts :140-165, signinwith.ts :242-264). At the frame
 * end the node reaches the service (`UserService.instance` — the first reach in a play makes it, and its start-up check,
 * world.ts AUTH) and hands it the operation with the held values AS THEY ARE AT THE FRAME END:
 *   Request Magic Link — `requestMagicLink({ email, redirect })`. Success: Error cleared (:158-159 — `undefined`, which is
 *     never SENT, CONTRACT C3: the wire keeps the last failure; row D25) and every press Done (:161). Failure: Error is the
 *     message AS GIVEN and every press Failure with the node's code (:163 → `setError` :124-132). No Unchanged (:71-78).
 *   Sign In With — Signing In becomes true (:251-252), then `signInWithProvider({ provider, redirect })`. The operation has
 *     no success (world.ts AUTH): a handover the backend accepts sends the browser away, nothing comes back, and every
 *     press of the batch is left open for good (:227-241 — "the page is gone before it could matter"). Failure — refused
 *     in the call with no provider set, or answered with an error — Error as given, Signing In false (`setError`
 *     :170-180), every press Failure with the node's code. No Unchanged (:106).
 *
 * MOUNT: Sign In With reaches the service in `initialize` (:79 — `UserService.instance`: the first reach in a play makes
 * it, and its start-up check) and listens for a return leg (:85-88); Signing In starts false (:77, not sent). Request
 * Magic Link reaches nothing at mount.
 *
 * NOT GRADED HERE, named:
 *   - Sign In With's RECEIVER half — a sign-in coming back on a later page load (`applyReturn` :202-226, the service's
 *     `_consumeAuthReturn` at its construction, userservice.ts :138): no world plays a return leg yet (world.ts AUTH "Not
 *     played"), so `oauthReturn` never fires and Notice is never written. Slice B.
 *   - where the browser goes on a handover (the adapter's discovery request, its parked flow, the provider URL), and the
 *     adapters' own `redirect` default (the page's URL without auth parameters) — R9's seam (world.ts AUTH);
 *   - the capability gate (`begin`): only the `nodegx` backend type offers magic links (RestAuthAdapter.ts :1562-1570
 *     refuses every REST one in the call) — a world plays that refusal as an answer;
 *   - the editor's warnings (`clearWarnings`) and the error-channel raise — not ports.
 */

import type { BackendAnswerEvent, WorldView } from '../spec';
import { defineNode } from '../spec';
import { dones, failures, pool, stringInput } from './user-actions';

/** requestmagiclink.ts :23, signinwith.ts :22 */
export const REQUEST_MAGIC_LINK_ERROR_CODE = 'user/request-magic-link-failed';
export const SIGN_IN_WITH_ERROR_CODE = 'user/sign-in-with-failed';

type Batch = {
  /** `sendScheduled` / `signInScheduled` */
  scheduled: boolean;
  /** `pendingSend.length` / `pendingSignIn.length` — the presses the frame's batch holds */
  presses: number;
  /** every call made, by the spec's call id: how many presses its answer settles */
  calls: Readonly<Record<string, number>>;
  nextCall: number;
};

/** a token per press, minted before the guard; one call per frame (requestmagiclink.ts :142-146, signinwith.ts :243-247) */
const press = (s: Batch) => ({ set: s.scheduled ? { presses: s.presses + 1 } : { presses: s.presses + 1, scheduled: true }, send: [] as never[], outcome: 'pending' as const });

/** the frame's batch: one call, to the active backend, with the held values as they are now */
function call(s: Batch, w: WorldView, op: 'requestMagicLink' | 'signInWithProvider', args: Record<string, unknown>) {
  w.userService(); // `UserService.instance`: the first reach makes the service
  const backend = w.backendFor(undefined) as string; // userservice.ts :408-418 — no `backendId`: the active one, never none
  const id = op + ':' + s.nextCall;
  return { set: { presses: 0, scheduled: false, calls: { ...s.calls, [id]: s.presses }, nextCall: s.nextCall + 1 }, backend: { id, op, backend, args } };
}

type MagicLinkState = Batch & {
  email: unknown;
  redirect: unknown;
  /** `_internal.error` (:125) */
  error: string | undefined;
};

export const RequestMagicLink = defineNode({
  type: 'net.noodl.user.RequestMagicLink',
  version: 1,
  source: 'packages/noodl-viewer-react/src/nodes/std-library/user/requestmagiclink.ts; userservice.ts; ParseAuthAdapter.ts',
  needs: ['backend', 'registry', 'clock'],
  worldPool: { backends: pool('requestMagicLink', null) },
  state: { email: undefined, redirect: undefined, error: undefined, scheduled: false, presses: 0, calls: {}, nextCall: 1 } as MagicLinkState,
  outcomes: ['done', 'failure'],
  inputs: {
    // :95-102
    send: { type: 'signal', outcome: true, displayName: 'Do', group: 'Actions', description: 'Asks the backend to email a one-click sign-in link to Email' },
    email: stringInput('Email', 'Address to send the sign-in link to', ['ann@example.com', '']), // :103-111
    redirect: stringInput('Redirect', 'Page the link should return to; leave blank to come back to the page the request was made from', ['/welcome', '']) // :112-120
  },
  outputs: {
    // :84-92
    error: { type: 'string', displayName: 'Error', group: 'Error', description: 'Why the last request failed; empty until one does', from: (s) => s.error }
  }
}).on(
  {
    send: press,
    email: (_s, v) => ({ set: { email: v }, send: [] }),
    redirect: (_s, v) => ({ set: { redirect: v }, send: [] })
  },
  {
    // :148-165
    afterInputs: (s, _i, w) => (s.scheduled ? { ...call(s, w, 'requestMagicLink', { email: s.email, redirect: s.redirect }), send: [] } : { send: [] }),
    world: {
      backend: (s, _i, answer: BackendAnswerEvent) => {
        const n = s.calls[answer.id] ?? 0;
        // :163 → :124-132 — Error as given, then Failure with the node's code
        if (!('ok' in answer)) return { set: { error: answer.error }, send: ['error' as const], outcomes: failures('send', REQUEST_MAGIC_LINK_ERROR_CODE, n) };
        // :157-161 — Error cleared (never sent: C3, row D25), then Done
        return { set: { error: undefined }, send: ['error' as const], outcomes: dones('send', n) };
      }
    }
  }
);

type SignInWithState = Batch & {
  provider: unknown;
  redirect: unknown;
  /** `_internal.error` (:171) */
  error: string | undefined;
  /** `_internal.signingIn` (:77) */
  signingIn: boolean;
};

export const SignInWith = defineNode({
  type: 'net.noodl.user.SignInWith',
  version: 1,
  source: 'packages/noodl-viewer-react/src/nodes/std-library/user/signinwith.ts; userservice.ts; RestAuthAdapter.ts; ParseAuthAdapter.ts',
  needs: ['backend', 'registry', 'clock'],
  worldPool: { backends: pool('signInWithProvider', null) },
  state: { provider: undefined, redirect: undefined, error: undefined, signingIn: false, scheduled: false, presses: 0, calls: {}, nextCall: 1 } as SignInWithState,
  outcomes: ['done', 'failure'],
  // :76-89 — the service reached (made, the first time in a play); a return leg listened for (slice B)
  init: (w) => {
    w.userService();
    return {};
  },
  inputs: {
    // :141-148
    signIn: { type: 'signal', outcome: true, displayName: 'Do', group: 'Actions', description: 'Hands over to the provider, which navigates the browser away — nothing downstream of this runs' },
    provider: stringInput('Provider', 'Id of the sign-in provider to use, as the backend lists it', ['google', '']), // :149-157
    redirect: stringInput('Redirect', 'Page the provider should return to; leave blank to come back to the page sign-in started from', ['/welcome', '']) // :158-166
  },
  outputs: {
    // :111-119
    signingIn: { type: 'boolean', displayName: 'Signing In', group: 'States', description: 'True while a sign-in started on an earlier page load is still being exchanged', from: (s) => s.signingIn },
    // :120-128
    error: { type: 'string', displayName: 'Error', group: 'Error', description: 'Why the last sign-in failed; empty until one does', from: (s) => s.error },
    // :129-138 — written only by a return leg (slice B)
    notice: {
      type: 'string',
      displayName: 'Notice',
      group: 'General',
      description: 'Something the user should be told about a sign-in that nevertheless succeeded, such as an old password having been revoked',
      from: () => undefined
    }
  }
}).on(
  {
    signIn: press,
    provider: (_s, v) => ({ set: { provider: v }, send: [] }),
    redirect: (_s, v) => ({ set: { redirect: v }, send: [] })
  },
  {
    // :249-264 — Signing In first, then the call
    afterInputs: (s, _i, w) => {
      if (!s.scheduled) return { send: [] };
      const made = call(s, w, 'signInWithProvider', { provider: s.provider, redirect: s.redirect });
      return { ...made, set: { ...made.set, signingIn: true }, send: ['signingIn' as const] };
    },
    world: {
      backend: (s, _i, answer: BackendAnswerEvent) => {
        // the handover lands nothing (world.ts AUTH) — only a failure reaches the node
        if ('ok' in answer) return { send: [] };
        // :262 → :170-180 — Error as given, Signing In false, then Failure with the node's code
        return { set: { error: answer.error, signingIn: false }, send: ['error' as const, 'signingIn' as const], outcomes: failures('signIn', SIGN_IN_WITH_ERROR_CODE, s.calls[answer.id] ?? 0) };
      }
    }
  }
);
