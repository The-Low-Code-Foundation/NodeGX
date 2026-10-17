---
title: "JWT Sign"
---
Mint a signed JSON Web Token (HS256/384/512). Cloud-only — signing in a browser means the key is in the browser.

JWT Sign serialises the Claims object into a JWT signed with the secret on Key. It always stamps `iat`; it stamps `exp` only when Expires In is set, so a token with no expiry is something you chose rather than something that happened. A JWT is signed, not encrypted: everything in Claims is readable by whoever holds the token. RS256 is not offered in this pass — it needs a PEM key import, still with no dependency, and is a slice of its own.

## When to use it

Issuing a short-lived token your own system will check later — a download link, a callback nonce, a hand-off to a partner who has your shared secret. To authenticate your own users, do not mint tokens here: the Request node already resolves the caller from their session.

## At a glance

| | |
|---|---|
| Category | Cloud |
| Type name | `noodl.cloud.jwtsign` |
| Available in | cloud |
| SSR compatibility | — |
| Provided by | `noodl-viewer-cloud` |
| Behaviour spec | version 1 ([under the hood](#under-the-hood)) |

## Inputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `algorithm` | Enum (`HS256`, `HS384`, `HS512`) | `HS256` | Which HMAC signs the token. RS256 is not offered yet — it needs a key-import pass of its own |
| `claims` | Object | — | The payload object. `iat` is always added; `exp` is added when Expires In is set. Anything you put here is readable by whoever holds the token — a JWT is signed, not encrypted |
| `expiresIn` | Number | — | Seconds until the token expires, stamped as `exp`. Leave empty for a token with no expiry — which is a decision, not a default |
| `key` | String | — | The signing secret. Wire this from a Secret node — never type a credential into the graph |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `sign` | Signal | — | Signs the claims and puts the token on Token |

### What each input does

**Claims** (`claims`)

- always: read at the end of the frame by a Do pressed in it — nothing signs no claims of its own; text is read as an object literal (not one: no claims); an array, null, a number or true/false fails that Do

**Key** (`key`)

- always: read at the end of the frame by a Do pressed in it — nothing, empty, 0 or false fails that Do; otherwise its text in UTF-8 bytes

**Algorithm** (`algorithm`)

- always: read at the end of the frame by a Do pressed in it (empty reads as HS256; one not HS256/384/512 fails that Do)

**Expires In (s)** (`expiresIn`)

- always: read at the end of the frame by a Do pressed in it — as a number above 0, exp is that many whole seconds after iat; anything else, no exp

**Do** (`sign`)

- always: one token at the end of the frame however many presses, iat the clock's second — Token and a cleared Error, then Done per press; claims that are not an object, an unknown Algorithm or no Key put the reason on Error, Token untouched, Failure per press

## Outputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `token` | String | — | The signed JWT, available once Done has fired |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `completed` | Signal | — | Fires after every invocation, whatever the outcome — wire this to carry on regardless. Failure still fires and still carries its reason, so this cannot hide an error |
| `done` | Signal | — | Fires once the token has been signed and is available on Token |

### Failure outputs

| Name | Type | Default | Description |
|---|---|---|---|
| `error` | String | — | Why no token was produced. It names the problem, never the key |
| `failure` | Signal | — | Fires when the token could not be signed — no Key, or claims that will not serialise |

## Patterns

- Secret Done → JWT Sign Do, then Token into a URL or a response: the whole shape of a signed link.

## Watch out for

- Putting a secret in Claims. The payload is base64, not encryption — anyone with the token can read it.
- Leaving Expires In empty for a token that reaches a user's browser. A token with no expiry is valid until the key changes.

## Examples

**Mint a signed token for another service to check**

The key never appears in the graph — only the NAME of the secret does, which is what makes this function safe to commit and safe to export. Secret resolves that name against the backend's machine-local `secrets.json` and then against a `NODEGX_SECRET_<NAME>` environment variable, and it reaches the project author's own credentials only: the backend's own webhook, email, auth and admin credentials are not addressable from a graph at all. Signing is cloud-only for the obvious reason — a browser node with a key input would be a browser holding the key. Two things about the token itself. A JWT is SIGNED, NOT ENCRYPTED: everything in Claims is readable by anyone who holds the token, so it carries identifiers and never secrets, and 'nobody will look' is not a security property. And `exp` is stamped only when Expires In is set — `iat` is always stamped, `exp` is not — so a token with no expiry is something you chose rather than something that happened to you. Ten minutes is set here because this token exists to be handed to one other service for one call. The chain is Do-driven throughout: Secret publishes Value on `done`, and only then is there a key to sign with, so the signature is wired to fire from that signal rather than from the request. Failure is a single Response, because a function that cannot read its secret and a function that cannot sign look identical from the caller's side and neither should return a token-shaped blank.

## Related nodes

[JWT Verify](./noodl-cloud-jwtverify.md), [Secret](./noodl-cloud-secret.md), [HMAC](./noodl-cloud-hmac.md)

## Code export

Runs only on the backend, inside cloud functions, so it has no React form.

## Under the hood

This node's behaviour is written down as an executable spec in `@nodegx/node-spec`, version 1. The spec is the reference: the runtime, the React export and the conformance tests are all graded against it. Every rule in it cites the line of the runtime it was read from. The full spec is at the bottom of this page.

### What it depends on outside the node

- the browser's SHA-2 hashing (`digest`)
- time: timers, delays and the frame clock (`clock`)

### Starting state

```json
{
  "algorithm": "HS256",
  "pending": 0
}
```

### How inputs are converted

Inputs not listed arrive as sent.

| Input | Conversion | What it does |
|---|---|---|
| Claims (`claims`) | `object-literal` | text is evaluated as a JavaScript object literal; text that does not evaluate becomes `{}` |

### How actions report back

Each time Do is triggered, the node reports exactly one of **Done** or **Failure**.

## The full spec {#spec-source}

The spec's source, as the docs were generated. Helpers it imports live beside it in `packages/nodegx-node-spec/src`.

```ts title="packages/nodegx-node-spec/src/nodes/jwt.ts"
/**
 * JWT Sign (`noodl.cloud.jwtsign`) and JWT Verify (`noodl.cloud.jwtverify`) — read from
 * `packages/noodl-viewer-cloud/src/nodes/cloud/jwtsign.ts`, `jwtverify.ts` and the shared
 * `packages/noodl-runtime/src/nodes/std-library/crypto/jwt.ts` (+ `encoding.ts`) on 2026-10-12 (NSP-022 s96). Cloud-only:
 * graded on the runtime's cloud target.
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from (`sign` = jwtsign.ts, `verify` =
 * jwtverify.ts, `jwt` = crypto/jwt.ts, `enc` = crypto/encoding.ts).
 *
 * THE RULE, before the citations. Both are HMAC's shape: `Do` takes a token per press and ONE run at the frame end
 * (sign :78-94, verify :83-101), the inputs read as they stand then, the HMAC asked of the host's WebCrypto and landing in the
 * microtasks after (world.ts DIGEST, the keyed sign), so every press of the frame reports in that frame's settle.
 *
 * - SIGN (jwt :48-67): Claims that are set and not a plain object (an array, `null`, a number…) fail at once with the node's
 *   sentence (sign :129-133); a string never reaches the node as one — the object port evaluates it (`{}` when it is no literal). Then the algorithm must be one of HS256/384/512 and a Key must be there (`!key`), each a thrown
 *   sentence; `iat` is the clock's second (`Math.floor(Date.now() / 1000)`, under a world the world's clock) stamped over the
 *   claims, and `exp` = `iat + floor(Expires In)` only when Expires In, as a number, is finite and above 0 (sign :135 — never
 *   set is no expiry). The token is `base64url(JSON {alg, typ:'JWT'}) . base64url(JSON payload) . base64url(HMAC)`. Done:
 *   Token and a cleared Error sent, `done` per press (sign :137-144); any throw on the way — a Key whose text is empty, claims
 *   JSON cannot write — fails every press with its message (`jwt-sign/failed`, sign :121-125, :146), Token untouched.
 * - VERIFY (jwt :76-145): returns, never throws, for every check it makes — in this order: the algorithm, the Key, the
 *   Token (`!token`), three dot-separated parts, a readable header, the header's `alg` EQUAL to the one expected (the
 *   alg:none gate, before the signature), the signature (an HMAC over the first two parts, compared byte for byte), a
 *   readable payload, `nbf`, `exp` (the clock's second, with Clock Tolerance's leeway: `Number(tolerance) || 0`, verify :153,
 *   then floored at 0 when finite). A refusal is Failure (`jwt-verify/rejected`) with its reason on Error and Valid false
 *   (verify :142-147); Claims is left alone. A token that is not a string, a header or payload that is JSON `null`, throws on
 *   the way (`token.split`, `header.alg`, `claims.nbf`) and the throw's message is the reason, the same Failure (verify :168).
 *   Verified: Valid true, Claims the payload, Error cleared — `done` per press (verify :158-166).
 */

import { defineNode } from '../spec';
import { hmacBytes } from '../world';
import { bytesToBase64Url, utf8Bytes } from './bytes';

/** jwt :23-28 — a PLAIN object, read with `[alg]` (so a name on Object.prototype finds a value; the HMAC then refuses it). */
const HS_ALGORITHMS: Record<string, string> = { HS256: 'SHA-256', HS384: 'SHA-384', HS512: 'SHA-512' };
const lookup = (alg: unknown): unknown => (HS_ALGORITHMS as Record<string, unknown>)[alg as string];

/** The enum both nodes offer (sign :50-62, verify :56-73). */
export const JWT_ALGORITHM_VALUES = ['HS256', 'HS384', 'HS512'] as const;

/** jwt :38-40 */
const base64UrlJson = (value: unknown): string => bytesToBase64Url(utf8Bytes(JSON.stringify(value)));

/** enc `base64UrlToBytes` — `atob` throws on a character it does not read, as the runtime's does. */
function base64UrlToBytes(text: string): Uint8Array {
  const padded = text.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

/** enc `bytesEqual` */
function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

/** jwt :48-67 `signJwt`, at clock second `nowMs`. Throws what it throws. */
export function signJwt(claims: Record<string, unknown>, key: unknown, alg: unknown, expiresInSeconds: number | undefined, nowMs: number): string {
  const hash = lookup(alg);
  if (!hash) throw new Error(`Unsupported algorithm "${String(alg)}". This node signs HS256, HS384 and HS512.`);
  if (!key) throw new Error('A signing Key is required.');
  const issuedAt = Math.floor(nowMs / 1000);
  const payload: Record<string, unknown> = { ...claims, iat: issuedAt };
  if (typeof expiresInSeconds === 'number' && Number.isFinite(expiresInSeconds) && expiresInSeconds > 0) payload.exp = issuedAt + Math.floor(expiresInSeconds);
  const signingInput = `${base64UrlJson({ alg, typ: 'JWT' })}.${base64UrlJson(payload)}`;
  return `${signingInput}.${bytesToBase64Url(hmacBytes(hash, utf8Bytes(key), utf8Bytes(signingInput)))}`;
}

/** jwt :76-145 `verifyJwt`, at clock second `nowMs`: a reason, or the claims. Throws what the runtime's throws (a non-string token, a `null` header or payload). */
export function verifyJwt(token: unknown, key: unknown, alg: unknown, tolerance: number, nowMs: number): { valid: true; claims: unknown } | { valid: false; reason: string } {
  const hash = lookup(alg);
  if (!hash) return { valid: false, reason: `Unsupported algorithm "${String(alg)}". This node verifies HS256/384/512.` };
  if (!key) return { valid: false, reason: 'A Key is required to verify a token.' };
  if (!token) return { valid: false, reason: 'No token was supplied.' };
  if (typeof token !== 'string') throw new TypeError('token.split is not a function'); // jwt :87, V8's words
  const parts = token.split('.');
  if (parts.length !== 3) return { valid: false, reason: 'Not a JWT: a token has three dot-separated parts.' };
  let header: { alg?: unknown } | null;
  try {
    header = JSON.parse(new TextDecoder().decode(base64UrlToBytes(parts[0])));
  } catch {
    return { valid: false, reason: 'The token header is not readable base64url JSON.' };
  }
  if (header === null) throw new TypeError("Cannot read properties of null (reading 'alg')"); // jwt :101, outside the try
  if (header.alg !== alg) return { valid: false, reason: `The token says alg "${String(header.alg)}" and this node was told to expect "${String(alg)}". Refused.` };
  let expected: Uint8Array;
  try {
    expected = hmacBytes(hash, utf8Bytes(key), utf8Bytes(`${parts[0]}.${parts[1]}`));
  } catch (e) {
    return { valid: false, reason: (e as Error).message };
  }
  let actual: Uint8Array;
  try {
    actual = base64UrlToBytes(parts[2]);
  } catch {
    return { valid: false, reason: 'The signature is not readable base64url.' };
  }
  if (!bytesEqual(expected, actual)) return { valid: false, reason: 'The signature does not match — wrong key, or the token was tampered with.' };
  let claims: { nbf?: unknown; exp?: unknown } | null;
  try {
    claims = JSON.parse(new TextDecoder().decode(base64UrlToBytes(parts[1])));
  } catch {
    return { valid: false, reason: 'The token payload is not readable base64url JSON.' };
  }
  if (claims === null) throw new TypeError("Cannot read properties of null (reading 'nbf')"); // jwt :135
  const now = Math.floor(nowMs / 1000);
  const t = Number.isFinite(tolerance) ? Math.max(0, tolerance) : 0;
  if (typeof claims.nbf === 'number' && now + t < claims.nbf) return { valid: false, reason: 'The token is not valid yet (nbf is in the future).' };
  if (typeof claims.exp === 'number' && now - t >= claims.exp) return { valid: false, reason: 'The token has expired (exp is in the past).' };
  return { valid: true, claims };
}

type SignState = { claims: unknown; key: unknown; algorithm: unknown; expiresIn: unknown; token: string | undefined; error: string | undefined; pending: number };

export const JwtSign = defineNode({
  type: 'noodl.cloud.jwtsign',
  version: 1,
  source: 'packages/noodl-viewer-cloud/src/nodes/cloud/jwtsign.ts; packages/noodl-runtime/src/nodes/std-library/crypto/jwt.ts; packages/noodl-runtime/src/nodes/std-library/crypto/encoding.ts',
  needs: ['digest', 'clock'],

  // sign :26-28 initialize — algorithm 'HS256'
  state: { claims: undefined, key: undefined, algorithm: 'HS256', expiresIn: undefined, token: undefined, error: undefined, pending: 0 } as SignState,
  // sign :106-109
  outcomes: ['done', 'failure'],

  inputs: {
    // sign :30-40 — an object, connections only; stored as the runtime's object port hands it (a string is evaluated as an
    // object literal, `{}` when it is not one — node.ts setInputValue), so only an array, null, a number or a boolean is refused
    claims: { type: 'object', coerce: 'object-literal', displayName: 'Claims', group: 'General', description: 'The payload object. `iat` is always added; `exp` is added when Expires In is set. Anything you put here is readable by whoever holds the token — a JWT is signed, not encrypted', examples: [{ sub: 'u1' }, { sub: 'u1', role: 'admin', iat: 7 }, {}, [1], null, 5, 'text', '{a:1}'] },
    // sign :41-49
    key: { type: 'string', coerce: 'none', displayName: 'Key', group: 'General', description: 'The signing secret. Wire this from a Secret node — never type a credential into the graph', examples: ['secret', '', 0, []] },
    // sign :50-66
    algorithm: { type: 'enum', enums: JWT_ALGORITHM_VALUES, default: 'HS256', coerce: 'none', displayName: 'Algorithm', group: 'General', description: 'Which HMAC signs the token. RS256 is not offered yet — it needs a key-import pass of its own', examples: ['RS256'] },
    // sign :67-77
    expiresIn: { type: 'number', coerce: 'none', displayName: 'Expires In (s)', group: 'General', description: 'Seconds until the token expires, stamped as `exp`. Leave empty for a token with no expiry — which is a decision, not a default', examples: [60, 3600, 0, -5, 1.9, '30', ''] },
    // sign :78-94
    sign: { type: 'signal', outcome: true, displayName: 'Do', group: 'Actions', description: 'Signs the claims and puts the token on Token' }
  },

  outputs: {
    // sign :97-105
    token: { type: 'string', from: (s) => s.token, displayName: 'Token', group: 'Values', description: 'The signed JWT, available once Done has fired' },
    // sign :110-118
    error: { type: 'string', from: (s) => s.error, displayName: 'Error', group: 'Error', description: 'Why no token was produced. It names the problem, never the key' }
  }
}).on(
  {
    claims: (_s, v) => ({ says: 'always: read at the end of the frame by a Do pressed in it — nothing signs no claims of its own; text is read as an object literal (not one: no claims); an array, null, a number or true/false fails that Do', set: { claims: v }, send: [] }),
    key: (_s, v) => ({ says: 'always: read at the end of the frame by a Do pressed in it — nothing, empty, 0 or false fails that Do; otherwise its text in UTF-8 bytes', set: { key: v }, send: [] }),
    algorithm: (_s, v) => ({ says: 'always: read at the end of the frame by a Do pressed in it (empty reads as HS256; one not HS256/384/512 fails that Do)', set: { algorithm: v }, send: [] }),
    expiresIn: (_s, v) => ({ says: 'always: read at the end of the frame by a Do pressed in it — as a number above 0, exp is that many whole seconds after iat; anything else, no exp', set: { expiresIn: v }, send: [] }),
    sign: (s) => ({ says: 'always: one token at the end of the frame however many presses, iat the clock\'s second — Token and a cleared Error, then Done per press; claims that are not an object, an unknown Algorithm or no Key put the reason on Error, Token untouched, Failure per press', set: { pending: s.pending + 1 }, outcome: 'deferred' })
  },
  {
    // sign :126-147 `runSign` and its continuation
    afterInputs: (s, _i, w) => {
      if (s.pending === 0) return { send: [] };
      const outcomes = (outcome: 'done' | 'failure', error?: string) => Array.from({ length: s.pending }, () => (error === undefined ? { port: 'sign' as const, outcome } : { port: 'sign' as const, outcome, error }));
      const fail = (message: string) => ({ set: { pending: 0, error: message }, send: ['error'] as Array<'error'>, outcomes: outcomes('failure', 'jwt-sign/failed') });
      const claims = s.claims;
      if (claims !== undefined && (typeof claims !== 'object' || claims === null || Array.isArray(claims))) return fail('JWT Sign: Claims must be an object.'); // :129-133
      const expiresIn = s.expiresIn === undefined ? undefined : Number(s.expiresIn); // :135
      let token: string;
      try {
        token = signJwt((claims || {}) as Record<string, unknown>, s.key, s.algorithm || 'HS256', expiresIn, w.now()); // :137
      } catch (e) {
        return fail((e as Error).message); // :146
      }
      return { set: { pending: 0, token, error: undefined }, send: ['token', 'error'], outcomes: outcomes('done') }; // :139-144
    }
  }
);

type VerifyState = { token: unknown; key: unknown; algorithm: unknown; clockTolerance: unknown; valid: boolean; claims: unknown; error: string | undefined; pending: number };

export const JwtVerify = defineNode({
  type: 'noodl.cloud.jwtverify',
  version: 1,
  source: 'packages/noodl-viewer-cloud/src/nodes/cloud/jwtverify.ts; packages/noodl-runtime/src/nodes/std-library/crypto/jwt.ts; packages/noodl-runtime/src/nodes/std-library/crypto/encoding.ts',
  needs: ['digest', 'clock'],

  // verify :33-36 initialize — algorithm 'HS256', tolerance 0; `valid` reads `=== true` (:110), so false before any Do
  state: { token: undefined, key: undefined, algorithm: 'HS256', clockTolerance: 0, valid: false, claims: undefined, error: undefined, pending: 0 } as VerifyState,
  // verify :124-129
  outcomes: ['done', 'failure'],

  inputs: {
    // verify :38-46
    token: { type: 'string', coerce: 'none', displayName: 'Token', group: 'General', description: 'The JWT to check, without any "Bearer " prefix', examples: [
        // signed with 'secret' (HS256): iat 0; iat 0 and exp 10; nbf 20; HS384 with no iat; alg none; a payload of JSON null
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1MSIsImlhdCI6MH0.au2ZbFerRH7SpxIe2fpwCbtudXnTPJ-_EKRuDweRuEA',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1MSIsImlhdCI6MCwiZXhwIjoxMH0.b7yrzVolzqlCpqQhqbu_VrQOrExqvfOw_2eOe_E9esA',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1MSIsIm5iZiI6MjB9.a-JSR2DaqP_WCqqTbPPNuHmMGwJLl9-M_aLEaEdh4i8',
        'eyJhbGciOiJIUzM4NCIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1MSJ9.PLM-OYHXBjvWaNGxuUacGTaaRcp0cDU1uLhNmDqlqfIcIl_-iPsAtxGCvXKf6479',
        'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiJ1MSJ9.k8ExIOGgi5rEBooPFmq8IAVcU30oIV2b5sOeQoJrAcU',
        'eyJhbGciOiJIUzI1NiJ9.bnVsbA.Hx-Q-k2OqbmJj8E3dbuK5caoD2C_bCEzOKbJANQNA9Q',
        'a.b.c',
        'a.b',
        'bnVsbA.e30.x',
        5,
        ''
      ] },
    // verify :47-55
    key: { type: 'string', coerce: 'none', displayName: 'Key', group: 'General', description: 'The shared secret the issuer signed with. Wire this from a Secret node', examples: ['secret', 'wrong', '', []] },
    // verify :56-77
    algorithm: { type: 'enum', enums: JWT_ALGORITHM_VALUES, default: 'HS256', coerce: 'none', displayName: 'Algorithm', group: 'General', description: 'The algorithm the token MUST have been signed with. A token whose header says anything else is refused unread — that is what stops alg:none and algorithm confusion', examples: ['none'] },
    // verify :78-86
    clockTolerance: { type: 'number', default: 0, coerce: 'none', displayName: 'Clock Tolerance (s)', group: 'General', description: 'Seconds of leeway on exp and nbf, for issuers whose clock is not quite yours', examples: [0, 5, 3600, -10, 'abc'] },
    // verify :87-101
    verify: { type: 'signal', outcome: true, displayName: 'Do', group: 'Actions', description: 'Checks the token' }
  },

  outputs: {
    // verify :104-112 — `=== true`
    valid: { type: 'boolean', from: (s) => s.valid, displayName: 'Valid', group: 'Values', description: 'Whether the token verified. False whenever Failure fired, so either can be wired' },
    // verify :113-123
    claims: { type: 'object', from: (s) => s.claims, displayName: 'Claims', group: 'Values', description: 'The token payload — set ONLY after the signature verified. Nothing in a token can be believed before that, so this is left alone on a failure rather than handed over unchecked' },
    // verify :130-138
    error: { type: 'string', from: (s) => s.error, displayName: 'Error', group: 'Error', description: 'Why the token did not verify' }
  }
}).on(
  {
    token: (_s, v) => ({ says: 'always: read at the end of the frame by a Do pressed in it', set: { token: v }, send: [] }),
    key: (_s, v) => ({ says: 'always: read at the end of the frame by a Do pressed in it — nothing, empty, 0 or false refuses that Do', set: { key: v }, send: [] }),
    algorithm: (_s, v) => ({ says: 'always: read at the end of the frame by a Do pressed in it (empty reads as HS256); the token\'s header must name the same one', set: { algorithm: v }, send: [] }),
    clockTolerance: (_s, v) => ({ says: 'always: read at the end of the frame by a Do pressed in it — that many seconds of leeway on nbf and exp (not a number, or below 0, none)', set: { clockTolerance: v }, send: [] }),
    verify: (s) => ({ says: 'always: one check at the end of the frame however many presses — verified: Valid true, Claims the payload, Error cleared, Done per press; refused: Valid false, the reason on Error, Claims untouched, Failure per press', set: { pending: s.pending + 1 }, outcome: 'deferred' })
  },
  {
    // verify :148-169 `runVerify` and its continuation
    afterInputs: (s, _i, w) => {
      if (s.pending === 0) return { send: [] };
      const outcomes = (outcome: 'done' | 'failure', error?: string) => Array.from({ length: s.pending }, () => (error === undefined ? { port: 'verify' as const, outcome } : { port: 'verify' as const, outcome, error }));
      const fail = (message: string) => ({ set: { pending: 0, valid: false, error: message }, send: ['valid', 'error'] as Array<'valid' | 'error'>, outcomes: outcomes('failure', 'jwt-verify/rejected') }); // :142-147
      let result: ReturnType<typeof verifyJwt>;
      try {
        result = verifyJwt(s.token, s.key, s.algorithm || 'HS256', Number(s.clockTolerance) || 0, w.now()); // :151-153
      } catch (e) {
        return fail((e as Error).message); // :168
      }
      if ('reason' in result) return fail(result.reason || 'JWT Verify: the token did not verify.'); // :155-157
      return { set: { pending: 0, valid: true, claims: result.claims, error: undefined }, send: ['valid', 'claims', 'error'], outcomes: outcomes('done') }; // :158-166
    }
  }
);
```


:::info Generated
This page is generated from `node-catalog-enriched.json`, the node's spec in `packages/nodegx-node-spec` and the export ledger. Do not edit it by hand — run `npm run docs:nodes` to regenerate, and fix the source instead.
:::
