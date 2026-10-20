---
title: "Secret"
---
Reads one of the project's stored credentials by name, inside a cloud function. Cloud-only — it does not exist in the browser.

Secret is the door to a stored credential from inside a cloud function. Set Name to the secret you want, pulse Do, and the value appears on Value with Done. The backend resolves the name against the `functions` section of its machine-local `secrets.json`, then falls back to a `NODEGX_SECRET_<NAME>` environment variable — the project author's own credentials, and nothing else: the backend's webhook, email, auth and admin credentials are not addressable from a graph at all. A name that resolves to nothing is a Failure with a message naming the secret and the two places to put it, never an empty string — a silently missing credential turns into somebody else's 401 an hour later. This node is registered only in the cloud runtime: a Secret node in a browser bundle would be a secret in a browser bundle.

## When to use it

Whenever a cloud function calls a third-party API, signs something, or otherwise needs a credential. Wire Value straight into the HTTP Request node's header or the HMAC / JWT Sign node's Key — do not copy the credential into a parameter, a Function node script or a Response.

## At a glance

| | |
|---|---|
| Category | Cloud |
| Type name | `noodl.cloud.secret` |
| Available in | cloud |
| SSR compatibility | — |
| Provided by | `noodl-viewer-cloud` |
| Behaviour spec | version 1 ([under the hood](#under-the-hood)) |

## Inputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `name` | String | — | Which stored secret to read. A cloud function can only ever read the project's own secrets — the backend's webhook, email, auth and admin credentials are not addressable from here |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `fetch` | Signal | — | Reads the secret and puts it on Value |

### What each input does

**Name** (`name`)

- always: read at the end of the frame by a Do pressed in it

**Do** (`fetch`)

- always: one read at the end of the frame however many presses — found: Value and a cleared Error, Done per press; outside a backend, not found, or a store that cannot be read: the reason on Error, Value cleared, Failure per press

## Outputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `value` | String | — | The secret, available once Done has fired. Blank until then, and blank after a Failure |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `completed` | Signal | — | Fires after every invocation, whatever the outcome — wire this to carry on regardless. Failure still fires and still carries its reason, so this cannot hide an error |
| `done` | Signal | — | Fires once the secret has been read and is available on Value |

### Failure outputs

| Name | Type | Default | Description |
|---|---|---|---|
| `error` | String | — | Why the secret could not be read — names the secret and where to put it, never a value |
| `failure` | Signal | — | Fires when the secret is not provisioned on this machine, or the Name is unusable. A missing credential is loud here rather than an empty string that becomes a 401 from somebody else an hour later |

## Patterns

- Request `receive` → Secret `fetch`; Secret `done` → HTTP Request `fetch`, with Value wired into the Authorization header: the ordinary shape of calling a paid API from the server.
- Wire `failure` somewhere that answers the caller. A function whose only wired path is the happy one hangs forever when the credential is missing (CWF-018).

## Watch out for

- Wiring Value into a Response node's parameter. That writes the credential into your own API's reply — the one leak this node cannot prevent for you.
- Reading a secret with a Function node and `process.env` instead. It works, but the name is then invisible to every tool that reads the graph.

## Examples

**Mint a signed token for another service to check**

The key never appears in the graph — only the NAME of the secret does, which is what makes this function safe to commit and safe to export. Secret resolves that name against the backend's machine-local `secrets.json` and then against a `NODEGX_SECRET_<NAME>` environment variable, and it reaches the project author's own credentials only: the backend's own webhook, email, auth and admin credentials are not addressable from a graph at all. Signing is cloud-only for the obvious reason — a browser node with a key input would be a browser holding the key. Two things about the token itself. A JWT is SIGNED, NOT ENCRYPTED: everything in Claims is readable by anyone who holds the token, so it carries identifiers and never secrets, and 'nobody will look' is not a security property. And `exp` is stamped only when Expires In is set — `iat` is always stamped, `exp` is not — so a token with no expiry is something you chose rather than something that happened to you. Ten minutes is set here because this token exists to be handed to one other service for one call. The chain is Do-driven throughout: Secret publishes Value on `done`, and only then is there a key to sign with, so the signature is wired to fire from that signal rather than from the request. Failure is a single Response, because a function that cannot read its secret and a function that cannot sign look identical from the caller's side and neither should return a token-shaped blank.

**Prove an inbound request really came from who it says**

Two different 'is this genuine' questions, side by side, because choosing the wrong one is the common mistake. HMAC is for a webhook: the sender computed a keyed digest of the body with a shared secret and put it in a header, and you recompute it and compare. The input that decides whether this works is Value — it must be the RAW body, byte for byte, exactly as it arrived. Re-serialising the parsed object first produces a different string (key order, whitespace, number formatting) and therefore a different signature, and the symptom is every webhook failing verification with no clue why. JWT Verify is for a token somebody else ISSUED to you, and it refuses any token whose header names an algorithm other than the one you selected — which is what defeats both `alg: none` and algorithm confusion, and is why Algorithm is set here rather than read from the token. Nothing inside a token may be believed before the signature check, so Claims is left alone on failure rather than handed over unchecked; reading claims off a token you have not verified is the same bug as trusting the webhook body. Clock Tolerance exists for issuers whose clock is not quite yours and defaults to 0. Both keys come from Secret nodes by name, so neither credential is in the graph. Note what neither node is for: your own users' sessions. That is Verify Session Token, which asks this backend about its own `_Session` rows.

## Related nodes

[Request](./noodl-cloud-request.md), [Response](./noodl-cloud-response.md), [HTTP Request](../data/net-noodl-http.md)

## Code export

Runs only on the backend, inside cloud functions, so it has no React form.

[How export works](../../how-export-works.md) shows what an export writes, with a worked example.

## Under the hood

This node's behaviour is written down as an executable spec in `@nodegx/node-spec`, version 1. The spec is the reference the conformance tests grade the runtime against. Every rule in it cites the line of the runtime it was read from. The full spec is at the bottom of this page.

### What it depends on outside the node

- services of the backend process a cloud function runs in (`host`)

### Starting state

```json
{
  "pending": 0,
  "calls": {},
  "nextCall": 1
}
```

### How actions report back

Each time Do is triggered, the node reports exactly one of **Done** or **Failure**.

## The full spec {#spec-source}

The spec's source, as the docs were generated. Helpers it imports live beside it in `packages/nodegx-node-spec/src`.

```ts title="packages/nodegx-node-spec/src/nodes/secret.ts"
/**
 * Secret (`noodl.cloud.secret`) — read from `packages/noodl-viewer-cloud/src/nodes/cloud/secret.ts` on 2026-10-12 (NSP-022
 * s96). A cloud-only node: graded on the runtime's cloud target, in a backend process the world plays (world.ts HOST).
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * THE RULE, before the citations: `Do` takes a token per press and ONE read at the end of the frame (:75-86, :128-140), of the
 * Name as it stands then. Outside a backend (the process has no secret store: `typeof _noodl_get_secret !== 'function'`) every
 * press of the frame fails with the node's sentence and nothing is asked (:147-157). Otherwise the store is asked for the Name
 * — SYNCHRONOUSLY, inside the frame-end run (:159-161) — and answers in one of four ways: it throws (the node does not repeat
 * what it threw: its own sentence, :162-167); it answers nothing, or not found (the store's `error` when it gave one, else the
 * node's sentence, :169-172); or found — Value is the store's value, Error cleared, `done` per press (:174-178). Every failure
 * puts its reason on Error and clears Value (`setError`, :115-121), code `secret/unavailable`.
 */

import { defineNode } from '../spec';
import type { HostScript } from '../world';

type State = {
  name: unknown;
  value: unknown;
  error: string | undefined;
  /** :128-133 `pendingReadOutcomes` — the presses this frame holds tokens for. */
  pending: number;
  /** the presses each read settles, by the spec's call id (ids never repeat) */
  calls: Readonly<Record<string, number>>;
  nextCall: number;
};

/** :151-155 */
export const SECRET_NO_STORE = 'Secret: no secret store is available. This node only works inside a nodegx-backend cloud function (CWF-009) — it is not usable in the browser viewer.';

const failures = (n: number) => Array.from({ length: n }, () => ({ port: 'fetch' as const, outcome: 'failure' as const, error: 'secret/unavailable' }));
const dones = (n: number) => Array.from({ length: n }, () => ({ port: 'fetch' as const, outcome: 'done' as const }));

/** Every name the pool's Name draws is answered (an unanswered lookup is a violation): found, found empty, not provisioned with and without the store's reason, an empty answer, a store that throws. */
const STORE_ANSWERS: HostScript['answers'] = [
  { match: { service: 'secrets', request: 'STRIPE_KEY' }, answer: { ok: { found: true, value: 'sk_test_51' } } },
  { match: { service: 'secrets', request: 'EMPTY' }, answer: { ok: { found: true, value: '' } } },
  { match: { service: 'secrets', request: 'MISSING' }, answer: { ok: { found: false, error: 'Secret "MISSING" is not set. Add it with `nodegx secrets set MISSING`.' } } },
  { match: { service: 'secrets', request: 'BROKEN' }, answer: { throws: 'EACCES: the vault is locked' } },
  { match: { service: 'secrets', request: 'NOTHING' }, answer: { ok: null } },
  { answer: { ok: { found: false } } }
];

/** The processes a sequence plays in: no store at all (a browser, a test), and a backend's (weighted: it is where the node works). */
const HOSTS: ReadonlyArray<HostScript> = [{}, { services: ['secrets'], answers: STORE_ANSWERS }, { services: ['secrets'], answers: STORE_ANSWERS }];

export const Secret = defineNode({
  type: 'noodl.cloud.secret',
  version: 1,
  source: 'packages/noodl-viewer-cloud/src/nodes/cloud/secret.ts',
  needs: ['host'],
  worldPool: { hosts: HOSTS },

  state: { name: undefined, value: undefined, error: undefined, pending: 0, calls: {}, nextCall: 1 } as State,
  // :99-102 outcomeOutputs({ done, failure })
  outcomes: ['done', 'failure'],

  inputs: {
    // :64-74 — stored raw
    name: { type: 'string', coerce: 'none', displayName: 'Name', group: 'General', description: "Which stored secret to read. A cloud function can only ever read the project's own secrets — the backend's webhook, email, auth and admin credentials are not addressable from here", examples: ['STRIPE_KEY', 'EMPTY', 'MISSING', 'BROKEN', 'NOTHING', 'OTHER', ''] },
    // :75-86 — only the port mints a token
    fetch: { type: 'signal', outcome: true, displayName: 'Do', group: 'Actions', description: 'Reads the secret and puts it on Value' }
  },

  outputs: {
    // :88-96
    value: { type: 'string', from: (s) => s.value, displayName: 'Value', group: 'Values', description: 'The secret, available once Done has fired. Blank until then, and blank after a Failure' },
    // :103-111
    error: { type: 'string', from: (s) => s.error, displayName: 'Error', group: 'Error', description: 'Why the secret could not be read — names the secret and where to put it, never a value' }
  }
}).on(
  {
    name: (_s, v) => ({ says: 'always: read at the end of the frame by a Do pressed in it', set: { name: v }, send: [] }),
    fetch: (s) => ({
      says: 'always: one read at the end of the frame however many presses — found: Value and a cleared Error, Done per press; outside a backend, not found, or a store that cannot be read: the reason on Error, Value cleared, Failure per press',
      set: { pending: s.pending + 1 },
      send: [],
      outcome: 'pending'
    })
  },
  {
    // :141-179 `doRead` at the frame end
    afterInputs: (s, _i, w) => {
      if (s.pending === 0) return { send: [] };
      const n = s.pending;
      if (!w.hostHas('secrets')) return { set: { pending: 0, error: SECRET_NO_STORE, value: undefined }, send: ['error', 'value'], outcomes: failures(n) }; // :147-157
      const id = 'read:' + s.nextCall;
      return { set: { pending: 0, calls: { ...s.calls, [id]: n }, nextCall: s.nextCall + 1 }, send: [], host: { id, service: 'secrets', request: s.name } }; // :159-161
    },
    world: {
      // :159-178 — the store's answer, inside the run
      host: (s, _i, answer) => {
        const n = s.calls[answer.id] ?? 0;
        const fail = (message: string) => ({ set: { error: message, value: undefined }, send: ['error', 'value'] as Array<'error' | 'value'>, outcomes: failures(n) });
        if ('threw' in answer) return fail('Secret: the secret store could not be read.'); // :162-167
        const result = answer.ok as { found?: unknown; value?: unknown; error?: unknown } | null | undefined;
        if (!result || !result.found) return fail(((result && result.error) as string) || 'Secret: the secret could not be read.'); // :169-172
        return { set: { error: undefined, value: result.value }, send: ['error', 'value'], outcomes: dones(n) }; // :174-178
      }
    }
  }
);
```


:::info Generated
This page is generated from `node-catalog-enriched.json`, the node's spec in `packages/nodegx-node-spec` and the export ledger. Do not edit it by hand — run `npm run docs:nodes` to regenerate, and fix the source instead.
:::
