---
title: "Send Email"
---
Sends an email through the backend's configured SMTP server from inside a cloud function or workflow.

Send Email is a server-side-only action node (it only runs inside a cloud function, never in a browser component). Wire `send` to fire it: it either renders one of the backend's built-in templates (Password Reset, Verify Email) against the `variables` object, or sends the raw `subject`/`text`/`html` inputs directly. The send is synchronous from the graph's point of view — `done` or `failure` fires once the attempt (plus one automatic retry on transient failure) has finished. If the backend has no SMTP configured, or this component is somehow evaluated outside a nodegx-backend process, it fails loudly on `failure`/`error` — it never drops a send silently or queues it for later.

## When to use it

Use it wherever a workflow needs to notify someone by email — a signup confirmation, an order receipt, an internal alert. Do not use it for the account password-reset/verify-email flows the backend already runs (BAK-002) — those are automatic; wire this node only for YOUR OWN application notifications.

## At a glance

| | |
|---|---|
| Category | Cloud |
| Type name | `noodl.cloud.sendemail` |
| Available in | cloud |
| SSR compatibility | — |
| Provided by | `noodl-viewer-cloud` |
| Behaviour spec | version 1 ([under the hood](#under-the-hood)) |

## Inputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `html` | String | — | HTML body sent alongside Text Body; optional, and ignored when Template is set |
| `subject` | String | — | Subject line of the message, and ignored when Template is set |
| `template` | Enum (`none`, `passwordReset`, `verifyEmail`) | `none` | Which stored template to render, or None to use Subject, Text Body and HTML Body instead |
| `text` | String | — | Plain-text body of the message, and ignored when Template is set |
| `to` | String | — | Address the message goes to; the send fails outright when this is blank |
| `variables` | Object | — | Values substituted into the template placeholders, and ignored when Template is None |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `send` | Signal | — | Sends the message |

### What each input does

**To** (`to`)

- always: stamped on each Do pressed after it; read at the end of the frame by a send whose presses agree

**Template** (`template`)

- always: read when a send is made — set and not None, the message is that template

**Template Variables** (`variables`)

- always: read when a send is made

**Subject** (`subject`)

- always: read when a send is made

**Text Body** (`text`)

- always: read when a send is made

**HTML Body** (`html`)

- always: read when a send is made

**Do** (`send`)

- always: at the end of the frame, one send when the frame's presses agree on To (to To as it stands then), or one send per run of presses stamped with the same To, each after the one before is answered — Done per press, or the reason on Error and Failure per press

## Outputs

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `completed` | Signal | — | Fires after every invocation, whatever the outcome — wire this to carry on regardless. Failure still fires and still carries its reason, so this cannot hide an error |
| `done` | Signal | — | Fires once the mail server has accepted the message for delivery |

### Failure outputs

| Name | Type | Default | Description |
|---|---|---|---|
| `error` | String | — | Why the message could not be sent |
| `failure` | Signal | — | Fires when the message could not be sent, including when no mail service is configured |

## Patterns

- Request `receive` → Send Email `send` → Response `send`: a fire-and-notify cloud function, the same shape as the Request/Response round trip but with a side effect instead of (or in addition to) a computed value.

## Watch out for

- Wiring this into a browser component — it has no effect there (no `_noodl_send_email` exists outside nodegx-backend) and the failure is confusing without knowing this node is cloud-only.
- Assuming a fired `sent` means the recipient's inbox will show it soon — deliverability (SPF/DKIM/provider reputation) is the operator's SMTP provider's job, not this node's.

## Examples

**Cloud function that sends an email notification**

A cloud function that receives a recipient/subject/message from its caller and emails it through the backend's configured SMTP server. Request's `params` become this function's inputs; Send Email fires on `receive` and reports success/failure back to Response, which the caller reads as usual. This is the general-purpose shape for any application email (signup confirmations, receipts, alerts) — distinct from the backend's own automatic password-reset/verify-email flows (BAK-002), which never need a Send Email node.

## Related nodes

[Request](./noodl-cloud-request.md), [Response](./noodl-cloud-response.md)

## Code export

Runs only on the backend, inside cloud functions, so it has no React form.

## Under the hood

This node's behaviour is written down as an executable spec in `@nodegx/node-spec`, version 1. The spec is the reference the conformance tests grade the runtime against. Every rule in it cites the line of the runtime it was read from. The full spec is at the bottom of this page.

### What it depends on outside the node

- services of the backend process a cloud function runs in (`host`)

### Starting state

```json
{
  "template": "none",
  "stamps": [],
  "calls": {},
  "nextCall": 1
}
```

### How inputs are converted

Inputs not listed arrive as sent.

| Input | Conversion | What it does |
|---|---|---|
| Template Variables (`variables`) | `object-literal` | text is evaluated as a JavaScript object literal; text that does not evaluate becomes `{}` |

### How actions report back

Each time Do is triggered, the node reports exactly one of **Done** or **Failure**.

## The full spec {#spec-source}

The spec's source, as the docs were generated. Helpers it imports live beside it in `packages/nodegx-node-spec/src`.

```ts title="packages/nodegx-node-spec/src/nodes/send-email.ts"
/**
 * Send Email (`noodl.cloud.sendemail`) — read from `packages/noodl-viewer-cloud/src/nodes/cloud/sendemail.ts` on 2026-10-12
 * (NSP-022 s96). Cloud-only: graded on the runtime's cloud target, in a backend process the world plays (world.ts HOST, the
 * `mail` service).
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * THE RULE, before the citations: `Do` takes a token per press, stamped with the `To` it was pressed under (:151-158), and ONE
 * run at the end of the frame (:160-165). The run asks whether the frame's presses agree on the address (DEF-021, :180):
 *   - they agree (or there is one): ONE send to the `To` as it stands at the end of the frame — not the stamp, a press can
 *     arrive before its `To` — settling every press (:181-187);
 *   - they disagree (a FAN-OUT): one send per run of consecutive presses stamped with the same address, each to its stamp,
 *     ONE AFTER ANOTHER — a run is sent only when the run before it has been answered (:189-205), so a run behind an answer
 *     that never comes is never sent.
 * A send (`dispatchSend`, :208-249): no address → Failure with the node's sentence, no call; outside a backend
 * (`typeof _noodl_send_email === 'undefined'`) → Failure with the node's sentence; else one call with the content as it
 * stands WHEN THE SEND IS MADE (Subject, Text Body, HTML Body; the Template when it is set and not `none`, else none;
 * Template Variables), and its answer settles the run's presses: `success` → Done; else Failure with the answer's `error`
 * (else the node's sentence); a rejection → Failure with its message. Every failure puts its message on Error, code
 * `send-email/failed` (:137-141). A Done never touches Error (:237-239) — unlike its siblings, which clear it; on a wire the two
 * are the same, because a cleared output is never sent (node.ts :858 `sendValue` returns on `undefined`; trace rule C3).
 */

import { defineNode } from '../spec';
import type { HostScript } from '../world';

/** One run of a fan-out: the address its presses were stamped with, and how many presses it settles. */
type Run = { to: unknown; n: number };

type State = {
  to: unknown;
  template: unknown;
  variables: unknown;
  subject: unknown;
  text: unknown;
  html: unknown;
  error: string | undefined;
  /** :151-158 `pendingSendOutcomes` — each press's stamped address, in press order */
  stamps: readonly unknown[];
  /** each send out, by the spec's call id: how many presses it settles, and the runs waiting behind it */
  calls: Readonly<Record<string, { n: number; rest: readonly Run[] }>>;
  nextCall: number;
};

const NO_TO = 'Send Email: "To" is required.'; // :210
const NO_SERVICE = 'Send Email: no email service is available. This node only works inside a nodegx-backend cloud function/workflow (BAK-002) — it is not usable in the browser viewer.'; // :217-221

type Settled = { port: 'send'; outcome: 'done' | 'failure'; error?: string };
const failures = (n: number): Settled[] => Array.from({ length: n }, () => ({ port: 'send', outcome: 'failure', error: 'send-email/failed' }));
const dones = (n: number): Settled[] => Array.from({ length: n }, () => ({ port: 'send', outcome: 'done' }));

/**
 * Sends runs in order until one makes a call (`dispatchSend`): a run with no address, or no mail service, fails at once and the
 * next is sent; the first that calls stops the loop, the rest waiting behind its answer. What it does to the state, the
 * outcomes it settles now, and the call.
 */
function sendRuns(s: Readonly<State>, runs: readonly Run[], hasMail: boolean) {
  let error = s.error;
  const outcomes: Settled[] = [];
  for (let i = 0; i < runs.length; i++) {
    const run = runs[i];
    if (!run.to) {
      error = NO_TO;
      outcomes.push(...failures(run.n));
      continue;
    }
    if (!hasMail) {
      error = NO_SERVICE;
      outcomes.push(...failures(run.n));
      continue;
    }
    // :225-233 — the content as it stands now
    const useTemplate = s.template && s.template !== 'none';
    const id = 'mail:' + s.nextCall;
    return {
      error,
      outcomes,
      calls: { ...s.calls, [id]: { n: run.n, rest: runs.slice(i + 1) } },
      nextCall: s.nextCall + 1,
      host: { id, service: 'mail' as const, request: { to: run.to, subject: s.subject, text: s.text, html: s.html, template: useTemplate ? s.template : undefined, variables: s.variables } }
    };
  }
  return { error, outcomes, calls: s.calls, nextCall: s.nextCall, host: undefined };
}

const answers = (answer: HostScript['answers']): HostScript => ({ services: ['mail'], answers: answer });

/** The processes a sequence plays in: no mail service, and one per way the mailer answers — weighted to sending. */
const HOSTS: ReadonlyArray<HostScript> = [
  {},
  answers([{ answer: { ok: { success: true } } }]),
  answers([{ answer: { ok: { success: true } } }]),
  answers([{ answer: { ok: { success: true } }, after: 5 }]),
  answers([{ answer: { ok: { success: false, error: 'SMTP 550: mailbox unavailable' } } }]),
  answers([{ answer: { ok: { success: false } } }]),
  answers([{ answer: { ok: null } }]),
  answers([{ answer: { throws: 'connect ECONNREFUSED 127.0.0.1:587' }, after: 1 }]),
  answers([{ match: { request: { to: 'b@example.com' } }, answer: { never: true } }, { answer: { ok: { success: true } } }])
];

export const SendEmail = defineNode({
  type: 'noodl.cloud.sendemail',
  version: 1,
  source: 'packages/noodl-viewer-cloud/src/nodes/cloud/sendemail.ts',
  needs: ['host'],
  worldPool: { hosts: HOSTS },

  // :33-35 initialize — template 'none'
  state: { to: undefined, template: 'none', variables: undefined, subject: undefined, text: undefined, html: undefined, error: undefined, stamps: [], calls: {}, nextCall: 1 } as State,
  // :124-130 outcomeOutputs({ done, failure }) — no Unchanged
  outcomes: ['done', 'failure'],

  inputs: {
    // :37-45 — stored raw; each press stamps it
    to: { type: 'string', coerce: 'none', displayName: 'To', group: 'General', description: 'Address the message goes to; the send fails outright when this is blank', examples: ['a@example.com', 'b@example.com', '', 0] },
    // :46-62 — stored raw
    template: { type: 'enum', enums: ['none', 'passwordReset', 'verifyEmail'], default: 'none', coerce: 'none', displayName: 'Template', group: 'Content', description: 'Which stored template to render, or None to use Subject, Text Body and HTML Body instead' },
    // :63-71 — an object port: a string is read as an object literal (node.ts setInputValue)
    variables: { type: 'object', coerce: 'object-literal', displayName: 'Template Variables', group: 'Content', description: 'Values substituted into the template placeholders, and ignored when Template is None', examples: [{ name: 'Ada' }, { link: 'https://app.example/reset?t=1' }] },
    // :72-98
    subject: { type: 'string', coerce: 'none', displayName: 'Subject', group: 'Content', description: 'Subject line of the message, and ignored when Template is set', examples: ['Welcome', ''] },
    text: { type: 'string', coerce: 'none', displayName: 'Text Body', group: 'Content', description: 'Plain-text body of the message, and ignored when Template is set', examples: ['Hello', ''] },
    html: { type: 'string', coerce: 'none', displayName: 'HTML Body', group: 'Content', description: 'HTML body sent alongside Text Body; optional, and ignored when Template is set', examples: ['<p>Hello</p>'] },
    // :99-109
    send: { type: 'signal', outcome: true, displayName: 'Do', group: 'Actions', description: 'Sends the message' }
  },

  outputs: {
    // :131-136
    error: { type: 'string', from: (s) => s.error, displayName: 'Error', group: 'Error', description: 'Why the message could not be sent' }
  }
}).on(
  {
    to: (_s, v) => ({ says: 'always: stamped on each Do pressed after it; read at the end of the frame by a send whose presses agree', set: { to: v }, send: [] }),
    template: (_s, v) => ({ says: 'always: read when a send is made — set and not None, the message is that template', set: { template: v }, send: [] }),
    variables: (_s, v) => ({ says: 'always: read when a send is made', set: { variables: v }, send: [] }),
    subject: (_s, v) => ({ says: 'always: read when a send is made', set: { subject: v }, send: [] }),
    text: (_s, v) => ({ says: 'always: read when a send is made', set: { text: v }, send: [] }),
    html: (_s, v) => ({ says: 'always: read when a send is made', set: { html: v }, send: [] }),
    // :151-165 — stamped with the To it was pressed under
    send: (s) => ({
      says: "always: at the end of the frame, one send when the frame's presses agree on To (to To as it stands then), or one send per run of presses stamped with the same To, each after the one before is answered — Done per press, or the reason on Error and Failure per press",
      set: { stamps: [...s.stamps, s.to] },
      send: [],
      outcome: 'pending'
    })
  },
  {
    // :167-206 `doSend`
    afterInputs: (s, _i, w) => {
      if (s.stamps.length === 0) return { send: [] };
      const stamps = s.stamps;
      const fanOut = stamps.length > 1 && stamps.some((t) => t !== stamps[0]); // :180
      const runs: Run[] = [];
      if (!fanOut) runs.push({ to: s.to, n: stamps.length }); // :181-187 — To as it stands now
      else
        for (const to of stamps) {
          const last = runs[runs.length - 1];
          if (last && last.to === to) last.n++;
          else runs.push({ to, n: 1 });
        }
      const r = sendRuns(s, runs, w.hostHas('mail'));
      const patch = { set: { stamps: [], error: r.error, calls: r.calls, nextCall: r.nextCall }, send: r.outcomes.length > 0 ? (['error'] as Array<'error'>) : [], outcomes: r.outcomes };
      return r.host ? { ...patch, host: r.host } : patch;
    },
    world: {
      // :236-246 — the answer settles its run, then the next run is sent
      host: (s, _i, answer, w) => {
        const call = s.calls[answer.id];
        const n = call ? call.n : 0;
        let error = s.error;
        const outcomes: Settled[] = [];
        let failed = false;
        if ('threw' in answer) {
          error = answer.threw; // :243-245
          failed = true;
        } else {
          const result = answer.ok as { success?: unknown; error?: unknown } | null | undefined;
          if (result && result.success) outcomes.push(...dones(n)); // :237-238 — Error left as it was
          else {
            error = ((result && result.error) as string) || 'Send Email: failed to send.'; // :240
            failed = true;
          }
        }
        if (failed) outcomes.push(...failures(n));
        const next = sendRuns({ ...s, error }, call ? call.rest : [], w.hostHas('mail'));
        const sentError = failed || next.outcomes.length > 0;
        // only what changes: a Done that sends nothing more writes nothing (a no-op write is a branch no wire can see)
        const set = { ...(sentError ? { error: next.error } : {}), ...(next.host ? { calls: next.calls, nextCall: next.nextCall } : {}) };
        const patch = { ...(Object.keys(set).length > 0 ? { set } : {}), send: sentError ? (['error'] as Array<'error'>) : [], outcomes: [...outcomes, ...next.outcomes] };
        return next.host ? { ...patch, host: next.host } : patch;
      }
    }
  }
);
```


:::info Generated
This page is generated from `node-catalog-enriched.json`, the node's spec in `packages/nodegx-node-spec` and the export ledger. Do not edit it by hand — run `npm run docs:nodes` to regenerate, and fix the source instead.
:::
