---
title: "Request Magic Link"
---
Asks the backend to email a one-click sign-in link. Succeeds identically whether or not the address has an account.

Request Magic Link posts `email` (string value) to the backend's `/auth/magic-link` when `send` (Do, signal) is triggered. The backend mails a single-use, short-lived link; clicking it signs the user in on the page named by `redirect` (defaulting to the page the request was made from), where the runtime picks up the one-time code and establishes an ordinary session. `done` (signal) means THE REQUEST WAS ACCEPTED — never that an account exists. The endpoint answers identically for known and unknown addresses on purpose, because a public endpoint that answers differently is an account-existence oracle. `failure` (signal) with `error` (string value) means the request itself failed: no backend configured, a network error, or the rate limit.

## When to use it

For passwordless sign-in, and as a password-free recovery path on backends that use provider sign-in. Requires the backend to have SMTP configured (BAK-002) and magic links enabled in the Auth section — with either missing, the request is still accepted and no mail is sent, which is deliberate anti-enumeration and shows up in the backend's log rather than in the app.

## At a glance

| | |
|---|---|
| Category | Cloud Services |
| Type name | `net.noodl.user.RequestMagicLink` |
| Available in | browser |
| SSR compatibility | partial — Sends a request from the browser; a server render never triggers it. |
| Provided by | `noodl-viewer-react` |
| Behaviour spec | version 2 ([under the hood](#under-the-hood)) |

## Inputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `email` | String | — | Address to send the sign-in link to |
| `redirect` | String | — | Page the link should return to; leave blank to come back to the page the request was made from |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `send` | Signal | — | Asks the backend to email a one-click sign-in link to Email |

### What each input does

**Do** (`send`)

- the first press this frame: the call goes to the backend at the frame's end, with the values held then
- another press this frame: it joins that call, and is answered with it

**Email** (`email`)

- always: held as handed; read when the next request goes

**Redirect** (`redirect`)

- always: held as handed; read when the next request goes

## Outputs

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `completed` | Signal | — | Fires after every invocation, whatever the outcome — wire this to carry on regardless. Failure still fires and still carries its reason, so this cannot hide an error |
| `done` | Signal | — | Fires once the request has been accepted, which never means an account exists for that address |

### Failure outputs

| Name | Type | Default | Description |
|---|---|---|---|
| `error` | String | — | Why the last request failed; empty until one does |
| `failure` | Signal | — | Fires when the request itself failed — no backend, no network, or rate limited — never because the address is unknown |

## Patterns

- Text Input `text` → `email`, Button `onClick` → `send`, `done` → a neutral confirmation message.
- Put a Sign In With node on the landing page named by `redirect` so the app can react to the click's outcome.

## Watch out for

- Showing 'check your inbox' only when the account exists — this node cannot tell you that, and a UI that appears to know re-creates the oracle the backend removed.
- Treating `done` as 'signed in'. The sign-in happens when the user clicks the link, on a later page load.

## Examples

**Sign in with a emailed link, or with Google**

Two ways past the password field, and both have a behaviour that decides how the screen around them must be built. Request Magic Link posts the address and the backend mails a single-use, short-lived link; `done` means THE REQUEST WAS ACCEPTED and never that an account exists — the endpoint answers identically either way, deliberately, because a different answer would turn the sign-in form into a way to test whether somebody has an account here. So the message on `done` has to be 'if that address has an account, a link is on its way', and a screen that says 'check your inbox' for one address and 'no such user' for another has reintroduced exactly the leak the endpoint is avoiding. Sign In With is more drastic: triggering it NAVIGATES THE BROWSER AWAY to the provider, so nothing downstream of that signal runs and the graph on this page is torn down mid-flight. Treat it as the end of the flow, not a step in it — there is no 'after' to wire, and a spinner set by the same click is a spinner nobody ever sees stop. `signingIn` is the output for the brief moment before the redirect. Both take a `redirect` that must be same-origin with the backend or on its redirect allow-list; an off-list target means no mail is sent and no provider round trip starts, which is a configuration failure that looks exactly like nothing happening. Provider ids ('google', 'github', or whatever the operator named their OIDC provider) come from the backend, not from this graph. One wiring detail that catches people: `done` is a SIGNAL, and a signal wired straight into a value input like `visible` is played as true and then false in the same pass, so the confirmation would flash and vanish. A Switch latches the pulse into remembered state, which is what 'we have sent it' actually is.

## Related nodes

[Sign In With](./net-noodl-user-sign-in-with.md), [User](./net-noodl-user-user.md), [Log In](./net-noodl-user-log-in.md), [Request Password Reset](./net-noodl-user-request-password-reset.md)

## Code export

Exports to React. A project that uses it exports this node as React code.

[How export works](../../how-export-works.md) shows what an export writes, with a worked example.

## Under the hood

This node's behaviour is written down as an executable spec in `@nodegx/node-spec`, version 2. The spec is the reference the conformance tests grade the runtime against. Every rule in it cites the line of the runtime it was read from. The full spec is at the bottom of this page.

### What it depends on outside the node

- a backend: records, users and cloud functions (`backend`)
- the shared store of Objects and Arrays, looked up by id (`registry`)
- time: timers, delays and the frame clock (`clock`)

### Starting state

```json
{
  "scheduled": false,
  "presses": 0,
  "calls": {},
  "nextCall": 1
}
```

### How actions report back

Each time Do is triggered, the node reports exactly one of **Done** or **Failure**.

## The full spec {#spec-source}

The spec's source, as the docs were generated. Helpers it imports live beside it in `packages/nodegx-node-spec/src`.

```ts title="packages/nodegx-node-spec/src/nodes/user-handovers.ts"
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
 *   Request Magic Link — `requestMagicLink({ email, redirect })`. Success: Error cleared to blank text, SENT (v2, row D25
 *     ruled "Clear it to blank text"; v1's `undefined` never was, and the wire kept the last failure) and every press Done (:161). Failure: Error is the
 *     message AS GIVEN and every press Failure with the node's code (:163 → `setError` :124-132). No Unchanged (:71-78).
 *   Sign In With — Signing In becomes true (:251-252), then `signInWithProvider({ provider, redirect })`. The operation has
 *     no success (world.ts AUTH): a handover the backend accepts sends the browser away, nothing comes back, and every
 *     press of the batch is left open for good (:227-241 — "the page is gone before it could matter"). Failure — refused
 *     in the call with no provider set, or answered with an error — Error as given, Signing In false (`setError`
 *     :170-180), every press Failure with the node's code. No Unchanged (:106).
 *
 * MOUNT: Sign In With reaches the service in `initialize` (:79 — `UserService.instance`: the first reach in a play makes
 * it, and with it either the start-up check or, on a page load carrying a sign-in, THE RETURN LEG — world.ts AUTH),
 * subscribes to its `oauthReturn` event (:85) and READS its `oauthReturn` state (:86-88); Signing In starts false (:77,
 * not sent). Request Magic Link reaches nothing at mount.
 *
 * THE RECEIVER (v2, s29) — `applyReturn` (:202-226), reached two ways: at mount, when the state it read is in progress or
 * settled (:86-88), and at every `oauthReturn` event (:85). In progress: Signing In true, nothing reported (:203-207 — a
 * state, not an outcome). Settled: Signing In false, then an invocation NO INPUT opened (`beginOutcome` :211 — the Do that
 * started it was pressed on a page that is gone; spec.ts `opens`, trace port `''`) reported — succeeded: Notice the
 * state's (`undefined` when it has none: never sent, C3), Error cleared (`undefined`, never sent — D25's shape), Done;
 * failed: `setError` (:225 → :170-180) with the state's error or `Sign-in could not be completed.` — Error, Signing In
 * false, Failure with the node's code. A provider's error is final when the node is made AND announced a tick later
 * (world.ts AUTH); v3 (row C50, ruled "Fire it once") reports it ONCE — the node remembers it reported the return
 * (`returned`) and ignores the repeat. v2 reported it twice, every call minting a fresh token.
 *
 * NOT GRADED HERE, named:
 *   - where the browser goes on a handover (the adapter's discovery request, its parked flow, the provider URL), and the
 *     adapters' own `redirect` default (the page's URL without auth parameters) — R9's seam (world.ts AUTH);
 *   - the capability gate (`begin`): only the `nodegx` backend type offers magic links (RestAuthAdapter.ts :1562-1570
 *     refuses every REST one in the call) — a world plays that refusal as an answer;
 *   - the editor's warnings (`clearWarnings`) and the error-channel raise — not ports.
 */

import type { BackendAnswerEvent, WorldView } from '../spec';
import { defineNode } from '../spec';
import type { AuthReturnState, BackendScript } from '../world';
import { SIGN_IN_NOT_COMPLETED } from '../world';
import { ANN, dones, failures, pool, stringInput } from './user-actions';

/**
 * v2 (s29) — page loads that are a sign-in coming back (world.ts AUTH, THE RETURN LEG), for the generator: a provider's
 * error; an exchange that lands — at once, later, with a notice — or fails, with and without a message; one that never lands.
 */
const RETURNS: ReadonlyArray<BackendScript> = [
  { return: { error: 'access_denied' }, answers: [{ match: { op: 'signInWithProvider' }, answer: { ok: null } }] },
  { return: { exchange: { ok: ANN, outcome: 'signed-in' } }, answers: [{ match: { op: 'signInWithProvider' }, answer: { ok: null } }] },
  { return: { exchange: { ok: ANN, outcome: 'linked-credentials-revoked', notice: 'Your password was removed.' }, after: 20 }, answers: [{ match: { op: 'signInWithProvider' }, answer: { ok: null }, after: 5 }] },
  { return: { exchange: { error: 'The sign-in code has expired.' }, after: 5 }, answers: [{ match: { op: 'signInWithProvider' }, answer: { error: 'Invalid credentials.' } }] },
  { return: { exchange: { error: null }, after: 1 }, answers: [{ match: { op: 'signInWithProvider' }, answer: { error: null }, after: 1 }] },
  { return: { exchange: { never: true } }, answers: [{ match: { op: 'signInWithProvider' }, answer: { error: 'HTTP 503: {}' } }] }
];

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
const press = (s: Batch) =>
  !s.scheduled
    ? { says: 'the first press this frame: the call goes to the backend at the frame\'s end, with the values held then', set: { presses: s.presses + 1, scheduled: true }, send: [] as never[], outcome: 'pending' as const }
    : { says: 'another press this frame: it joins that call, and is answered with it', set: { presses: s.presses + 1 }, send: [] as never[], outcome: 'pending' as const };

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
  // v2 (P109 ISL-030, row D25 ruled "Clear it to blank text"): a Done sends blank Error, so a label lets go of the last
  // failure; v1 cleared it to `undefined`, which is never sent.
  version: 2,
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
    email: (_s, v) => ({ says: 'always: held as handed; read when the next request goes', set: { email: v }, send: [] }),
    redirect: (_s, v) => ({ says: 'always: held as handed; read when the next request goes', set: { redirect: v }, send: [] })
  },
  {
    // :148-165
    afterInputs: (s, _i, w) => (s.scheduled ? { ...call(s, w, 'requestMagicLink', { email: s.email, redirect: s.redirect }), send: [] } : { send: [] }),
    world: {
      backend: (s, _i, answer: BackendAnswerEvent) => {
        const n = s.calls[answer.id] ?? 0;
        // :163 → :124-132 — Error as given, then Failure with the node's code
        if (!('ok' in answer)) return { set: { error: answer.error }, send: ['error' as const], outcomes: failures('send', REQUEST_MAGIC_LINK_ERROR_CODE, n) };
        // :157-161 — Error cleared to blank text, SENT (v2, row D25 ruled "Clear it to blank text"; v1's `undefined` never was), then Done
        return { set: { error: '' }, send: ['error' as const], outcomes: dones('send', n) };
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
  /** `_internal.notice` (:217) — v2 */
  notice: string | undefined;
  /** `_internal.returnReported` — v3, C50: the return's final state was reported */
  returned: boolean;
};

/** :203-226 — a return applied: a state in progress sets Signing In; a settled one reports on an invocation no input opened (v2) */
function applyReturn(s: SignInWithState, r: AuthReturnState) {
  if (r.inProgress) return { set: { signingIn: true }, send: ['signingIn' as const] }; // :203-207
  // v3 (C50): one return per page load — its final state is reported once, and a repeat (the announcement after the read) ignored
  if (s.returned) return { send: [] };
  if (r.succeeded) {
    // :208-223 — Signing In false, Notice, Error cleared (never sent: C3), then Done, last
    return { set: { signingIn: false, notice: r.notice, error: undefined, returned: true }, send: ['signingIn' as const, 'notice' as const, 'error' as const], opens: [{ outcome: 'done' as const }] };
  }
  // :225 → :170-180 — Error, Signing In false, then Failure with the node's code
  return { set: { signingIn: false, error: r.error || SIGN_IN_NOT_COMPLETED, returned: true }, send: ['signingIn' as const, 'error' as const], opens: [{ outcome: 'failure' as const, error: SIGN_IN_WITH_ERROR_CODE }] };
}

export const SignInWith = defineNode({
  type: 'net.noodl.user.SignInWith',
  // v2 (s29): the receiver — a return already resolved at mount (:86-88) and every `oauthReturn` (:85) applied; Notice written.
  // v1 played the launcher only; no v1 trace moves (no v1 world carried a return)
  // v3 (P109 ISL-030, row C50 ruled "Fire it once"): a return's final state is reported once per page load; v2 reported a
  // provider's error twice — at mount and at the announcement a tick later.
  version: 3,
  source: 'packages/noodl-viewer-react/src/nodes/std-library/user/signinwith.ts; userservice.ts; RestAuthAdapter.ts; ParseAuthAdapter.ts',
  needs: ['backend', 'registry', 'clock'],
  worldPool: { backends: [...pool('signInWithProvider', null), ...RETURNS] },
  state: { provider: undefined, redirect: undefined, error: undefined, signingIn: false, notice: undefined, returned: false, scheduled: false, presses: 0, calls: {}, nextCall: 1 } as SignInWithState,
  outcomes: ['done', 'failure'],
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
      from: (s) => s.notice
    }
  }
}).on(
  {
    signIn: press,
    provider: (_s, v) => ({ says: 'always: held as handed; read when the next handover goes — none set, the handover is refused with Error and Failure', set: { provider: v }, send: [] }),
    redirect: (_s, v) => ({ says: 'always: held as handed; read when the next handover goes', set: { redirect: v }, send: [] })
  },
  {
    // :249-264 — Signing In first, then the call
    afterInputs: (s, _i, w) => {
      if (!s.scheduled) return { send: [] };
      const made = call(s, w, 'signInWithProvider', { provider: s.provider, redirect: s.redirect });
      return { ...made, set: { ...made.set, signingIn: true }, send: ['signingIn' as const] };
    },
    world: {
      // :76-89 — the service reached (made, the first time in a play — and with it a return consumed), then a return it
      // already holds applied (:86-88: in progress, or settled)
      mount: (s, _i, w) => {
        w.userService();
        const r = w.authReturn();
        return r.inProgress || r.succeeded !== undefined ? applyReturn(s, r) : { send: [] };
      },
      // :85 — every `oauthReturn` the service announces
      authReturn: (s, _i, r) => applyReturn(s, r),
      backend: (s, _i, answer: BackendAnswerEvent) => {
        // the handover lands nothing (world.ts AUTH) — only a failure reaches the node
        if ('ok' in answer) return { send: [] };
        // :262 → :170-180 — Error as given, Signing In false, then Failure with the node's code
        return { set: { error: answer.error, signingIn: false }, send: ['error' as const, 'signingIn' as const], outcomes: failures('signIn', SIGN_IN_WITH_ERROR_CODE, s.calls[answer.id] ?? 0) };
      }
    }
  }
);
```


:::info Generated
This page is generated from `node-catalog-enriched.json`, the node's spec in `packages/nodegx-node-spec` and the export ledger. Do not edit it by hand — run `npm run docs:nodes` to regenerate, and fix the source instead.
:::
