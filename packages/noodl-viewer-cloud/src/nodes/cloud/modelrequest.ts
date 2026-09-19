/**
 * Model Request node (FED-003) — a cloud function calls a language model.
 *
 * ## Why this is a node and not a kit module
 *
 * A cloud kit could carry a hand-rolled client today with no backend change, and FED-003 §3.5
 * rejects that for one reason that outranks the convenience: the key. A kit is invisible in the
 * node picker, unversioned with the backend, and — the part that matters — outside the secret
 * path, which means the key would have to arrive as a value somebody typed into a graph. Here it
 * is a NAME, resolved server-side at the moment of the call and dropped.
 *
 * ## ⚠️ Cloud only, for the same reason `Secret` is
 *
 * Registered in `noodl-viewer-cloud/src/nodes/index.ts`, NOT in `@noodl/runtime`'s shared list.
 * That list reaches every runtime, and this node reads a credential: in a browser bundle it would
 * be a credential in a browser bundle, one wire from anyone who opens the page. The generated
 * catalog records `availableIn: ["cloud"]`; if it ever says `browser`, the registration moved.
 *
 * ## ⚠️ `fetch`, not the SDK, and that is not a preference
 *
 * `@anthropic-ai/sdk` is the right way to call this API from ordinary TypeScript, and it is
 * unreachable from here: a cloud function is a node graph inside a single prebuilt bundle with no
 * `node_modules` and no `require()` (`kitModules.ts:111-118`, TALK-007 §3.2). Node 22 supplies
 * `fetch` as a global in this process, so the call is raw HTTP against the Messages API and
 * nothing else. The request shape below was taken from the API docs at build time (2026-09-19),
 * not from memory — `output_config.format` is `{ type: 'json_schema', schema }` with no beta
 * header, and `effort` lives inside `output_config` beside it.
 *
 * ## What stops the key escaping (phase 96 rule 3, graded by AC3)
 *
 *  - **The key is never a port.** `apiKeySecret` carries the NAME of a secret in the `functions`
 *    namespace. There is no input that could hold the value, so nothing lands in the exported
 *    `.workflow.json` a deploy ships.
 *  - **The key is never on `_internal`.** It is a `const` inside one async function, used in one
 *    header, and out of scope when that function returns. `getInspectInfo` cannot reach it even
 *    by accident, and neither can a future field someone adds without reading this.
 *  - **The execution record is counts only.** The step's `inputData` carries the secret's NAME,
 *    the model and the shape of the request — never the key, never the prompt, never the answer.
 *    The cost channel (`recordModelCall`) carries four numbers and a model id. See
 *    `runcontext.ts`'s `RuntimeModelCall`.
 *  - **Nothing here logs.** Not on failure either; the messages below are built from the name and
 *    the status, which is all an operator needs and all they are owed.
 */

import type { NodeRunContext } from '@noodl/runtime/src/runcontext';

import { outcomeOutputs, reportOutcomes } from '@noodl/runtime/src/outcome';

/** What `_noodl_get_secret` answers with — see nodegx-backend `service.ts`, and `secret.ts`. */
interface SecretLookupResult {
  found: boolean;
  value?: string;
  error?: string;
}

/**
 * The author-facing failure vocabulary, which is a PORT VALUE and therefore a promise.
 *
 * These are the strings FED-003's acceptance criteria name and the strings a feed graph will
 * branch on in FED-006, so they are spelled here once rather than at each throw site. They are
 * deliberately NOT the `family/kebab` form `Parse Feed` uses on its own `Error Code`: the ACs
 * fixed this spelling before either node existed, and a code a graph switches on is not worth
 * renaming for symmetry. The `model-request/…` form still appears on the OUTCOME, which is the
 * execution record's vocabulary and not the graph's.
 */
const CODES = {
  notImplemented: 'not_implemented',
  secretMissing: 'secret_missing',
  refusal: 'refusal',
  badJson: 'bad_json',
  /** The provider answered, with a status this node will not retry or cannot use. */
  httpError: 'http_error',
  /** Retries were spent and the provider was still failing. */
  rateLimited: 'rate_limited',
  /** The call did not complete inside `timeoutMs`. */
  timeout: 'timeout',
  /** The request never reached the provider, or its answer was not JSON. */
  network: 'network',
  /** This graph is not running inside nodegx-backend at all. */
  unavailable: 'unavailable'
} as const;

/** The outcome code, which is the execution record's vocabulary. One prefix, one node. */
const outcomeCode = (code: string) => `model-request/${code}`;

const DEFAULTS = {
  provider: 'anthropic',
  model: 'claude-opus-5',
  apiKeySecret: 'MODEL_KEY',
  baseUrl: 'https://api.anthropic.com',
  effort: 'high',
  maxTokens: 16000,
  timeoutMs: 120000
};

/** The version header the Messages API has required since 2023 and still does. */
const ANTHROPIC_VERSION = '2023-06-01';

/**
 * §3.2 — 429 and 5xx are retried twice, 4xx never. So three attempts at most, and `attempts`
 * says how many were actually spent.
 */
const MAX_ATTEMPTS = 3;
/** First backoff; doubled per retry, and always cut short by the run's remaining time. */
const RETRY_BASE_MS = 500;
/** A provider's `retry-after` is honoured, but it does not get to hold a function open forever. */
const MAX_RETRY_AFTER_MS = 30000;

interface ModelUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
}

const EMPTY_USAGE: ModelUsage = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0 };

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Read a `retry-after` header in either of the two forms the spec allows. */
function retryAfterMs(header: string | null): number | undefined {
  if (!header) return undefined;
  const seconds = Number(header);
  if (isFinite(seconds) && seconds >= 0) return Math.min(seconds * 1000, MAX_RETRY_AFTER_MS);
  const at = Date.parse(header);
  if (!isNaN(at)) return Math.min(Math.max(at - Date.now(), 0), MAX_RETRY_AFTER_MS);
  return undefined;
}

/** Every `text` block, joined. Thinking blocks are not text and are not the answer. */
function textOf(content: any): string {
  if (!Array.isArray(content)) return '';
  return content
    .filter((block) => block && block.type === 'text' && typeof block.text === 'string')
    .map((block) => block.text)
    .join('');
}

function usageOf(usage: any): ModelUsage {
  const n = (v: unknown) => (typeof v === 'number' && isFinite(v) ? v : 0);
  if (!usage) return { ...EMPTY_USAGE };
  return {
    inputTokens: n(usage.input_tokens),
    outputTokens: n(usage.output_tokens),
    cacheReadTokens: n(usage.cache_read_input_tokens)
  };
}

/**
 * The sentence a refusal gets. `stop_details` is populated ONLY on a refusal and is `null` for
 * every other stop reason, so it is guarded rather than read.
 */
function refusalMessage(stopDetails: any): string {
  const category = stopDetails && stopDetails.category ? String(stopDetails.category) : 'unspecified';
  const explanation = stopDetails && stopDetails.explanation ? ` — ${String(stopDetails.explanation)}` : '';
  return `Model Request: the model declined this request (${category})${explanation}`;
}

export const node = {
  name: 'noodl.cloud.modelrequest',
  displayNodeName: 'Model Request',
  category: 'Cloud',
  docs: 'https://docs.noodl.net/nodes/cloud-functions/model-request',
  color: 'data',
  connectionPanel: {
    groupPriority: ['General', 'Request', 'Limits', 'Actions', 'Values', 'Events', 'Error']
  },
  initialize: function (this: any) {
    this._internal.provider = DEFAULTS.provider;
    this._internal.model = DEFAULTS.model;
    this._internal.apiKeySecret = DEFAULTS.apiKeySecret;
    this._internal.baseUrl = DEFAULTS.baseUrl;
    this._internal.effort = DEFAULTS.effort;
    this._internal.maxTokens = DEFAULTS.maxTokens;
    this._internal.timeoutMs = DEFAULTS.timeoutMs;
    this._internal.text = '';
    this._internal.stopReason = '';
    this._internal.attempts = 0;
    this._internal.status = 0;
    this._internal.usage = { ...EMPTY_USAGE };
  },
  /**
   * ⚠️ **Read the module note before adding a field here.** The debug inspector shows whatever
   * this returns (`nodecontext.ts:_getDebugInspectorValueForNode`), so it shows the ANSWER and
   * the cost — never the request, which carries the author's prompt, and never anything derived
   * from the key, which this node does not hold long enough to return.
   */
  getInspectInfo: function (this: any) {
    if (this._internal.error) return this._internal.error;
    return [
      {
        type: 'value',
        value: {
          model: this._internal.model,
          stopReason: this._internal.stopReason,
          attempts: this._internal.attempts,
          usage: this._internal.usage,
          text: this._internal.text
        }
      }
    ];
  },
  inputs: {
    provider: {
      group: 'General',
      displayName: 'Provider',
      type: {
        name: 'enum',
        enums: [
          { label: 'Anthropic', value: 'anthropic' },
          { label: 'OpenAI-compatible (not yet implemented)', value: 'openai-compatible' }
        ]
      },
      default: DEFAULTS.provider,
      description:
        'Which API shape the request is built in. Only Anthropic is implemented; OpenAI-compatible ' +
        'is listed so a graph drawn today keeps its wiring when it arrives, and until then it fails ' +
        'on Failure with Error Code not_implemented rather than pretending',
      set: function (this: any, value: string) {
        this._internal.provider = value || DEFAULTS.provider;
      }
    },
    model: {
      group: 'General',
      displayName: 'Model',
      type: 'string',
      default: DEFAULTS.model,
      description:
        'The model id, sent verbatim. Free text on purpose: a model released after this backend ' +
        'was built needs no release of NodeGX to be usable',
      set: function (this: any, value: string) {
        this._internal.model = value || DEFAULTS.model;
      }
    },
    apiKeySecret: {
      group: 'General',
      displayName: 'API Key Secret',
      type: 'string',
      default: DEFAULTS.apiKeySecret,
      description:
        'The NAME of a secret in the project\'s functions namespace — never the key itself. It is ' +
        'read server-side at the moment of the call, exactly as the Secret node reads one, used in ' +
        'one header and dropped. There is deliberately no port that could hold the value',
      set: function (this: any, value: string) {
        this._internal.apiKeySecret = value;
      }
    },
    baseUrl: {
      group: 'General',
      displayName: 'Base URL',
      type: 'string',
      default: DEFAULTS.baseUrl,
      description: 'Where the request goes. Change it for a proxy, a gateway, or a test double',
      set: function (this: any, value: string) {
        this._internal.baseUrl = value || DEFAULTS.baseUrl;
      }
    },
    instructions: {
      group: 'Request',
      displayName: 'Instructions',
      type: { name: 'string', codeeditor: 'text' },
      description: 'The system prompt — who the model is being asked to be, and the rules of the task',
      set: function (this: any, value: string) {
        this._internal.instructions = value;
      }
    },
    input: {
      group: 'Request',
      displayName: 'Input',
      type: { name: 'string', codeeditor: 'text' },
      description:
        'The one thing being asked, as a single user turn. Ignored when Messages is wired — a graph ' +
        'holding a conversation sends the whole conversation',
      set: function (this: any, value: string) {
        this._internal.input = value;
      }
    },
    messages: {
      group: 'Request',
      displayName: 'Messages',
      type: { name: 'array', allowConnectionsOnly: true },
      description:
        'A whole conversation as [{ role, content }], for a graph that is holding one. When this is ' +
        'wired and non-empty it replaces Input entirely',
      set: function (this: any, value: unknown) {
        this._internal.messages = value;
      }
    },
    outputSchema: {
      group: 'Request',
      displayName: 'Output Schema',
      type: { name: 'object', allowConnectionsOnly: true },
      description:
        'A JSON schema the answer must match. When set, the answer is constrained to it and arrives ' +
        'parsed on Json as well as raw on Text. Objects in the schema need additionalProperties ' +
        'false, and the provider refuses the request outright if they do not have it',
      set: function (this: any, value: unknown) {
        this._internal.outputSchema = value;
      }
    },
    effort: {
      group: 'Limits',
      displayName: 'Effort',
      type: {
        name: 'enum',
        enums: [
          { label: 'Low', value: 'low' },
          { label: 'Medium', value: 'medium' },
          { label: 'High', value: 'high' },
          { label: 'Extra high', value: 'xhigh' },
          { label: 'Max', value: 'max' }
        ]
      },
      default: DEFAULTS.effort,
      description:
        'How hard the model works before answering — the first lever to reach for on both cost and ' +
        'quality. Low for tagging and classifying, high for anything that has to be right',
      set: function (this: any, value: string) {
        this._internal.effort = value || DEFAULTS.effort;
      }
    },
    maxTokens: {
      group: 'Limits',
      displayName: 'Max Tokens',
      type: 'number',
      default: DEFAULTS.maxTokens,
      description:
        'The ceiling on the answer. Hitting it is not an error: Done fires with Stop Reason set to ' +
        'max_tokens and a truncated Text, so the graph can decide what that means',
      set: function (this: any, value: number) {
        const n = Number(value);
        this._internal.maxTokens = isFinite(n) && n > 0 ? Math.floor(n) : DEFAULTS.maxTokens;
      }
    },
    timeoutMs: {
      group: 'Limits',
      displayName: 'Timeout (ms)',
      type: 'number',
      default: DEFAULTS.timeoutMs,
      description:
        'The whole call\'s budget, retries included. Keep it under the function\'s own timeout, or ' +
        'the function answers 504 before this node gets to report anything',
      set: function (this: any, value: number) {
        const n = Number(value);
        this._internal.timeoutMs = isFinite(n) && n > 0 ? Math.floor(n) : DEFAULTS.timeoutMs;
      }
    },
    send: {
      group: 'Actions',
      displayName: 'Do',
      type: 'signal',
      description: 'Sends the request',
      valueChangedToTrue: function (this: any) {
        // ERG-001 §4: only the port mints an outcome token, and `scheduleSend` has no other
        // caller — no value setter on this node starts a request.
        this.scheduleSend(
          this.beginOutcome({
            provider: this._internal.provider,
            model: this._internal.model,
            // The NAME. AC3 greps the record for the VALUE and must not find it.
            apiKeySecret: this._internal.apiKeySecret,
            hasOutputSchema: this._internal.outputSchema !== undefined && this._internal.outputSchema !== null,
            effort: this._internal.effort,
            maxTokens: this._internal.maxTokens
          })
        );
      }
    }
  },
  outputs: {
    text: {
      group: 'Values',
      displayName: 'Text',
      type: 'string',
      description: 'The model\'s answer. When Output Schema is set this is the raw JSON of it',
      getter: function (this: any) {
        return this._internal.text;
      }
    },
    json: {
      group: 'Values',
      displayName: 'Json',
      type: 'object',
      description:
        'The answer parsed, when Output Schema asked for one. Untouched when no schema was set — a ' +
        'graph that wants an object has to say what shape it is',
      getter: function (this: any) {
        return this._internal.json;
      }
    },
    usage: {
      group: 'Values',
      displayName: 'Usage',
      type: 'object',
      description:
        'What the call cost, as { inputTokens, outputTokens, cacheReadTokens }. The same numbers ' +
        'land on the run\'s execution record, where they are summed per run',
      getter: function (this: any) {
        return this._internal.usage;
      }
    },
    stopReason: {
      group: 'Values',
      displayName: 'Stop Reason',
      type: 'string',
      description:
        'Why the model stopped: end_turn when it finished, max_tokens when it ran out of room, ' +
        'tool_use when it wants a tool. A refusal never arrives here — it fires Failure',
      getter: function (this: any) {
        return this._internal.stopReason;
      }
    },
    attempts: {
      group: 'Values',
      displayName: 'Attempts',
      type: 'number',
      description:
        'How many HTTP requests this call actually took. More than one means the provider rate-' +
        'limited or faulted and the node retried; it is the number to watch before raising a quota',
      getter: function (this: any) {
        return this._internal.attempts;
      }
    },
    ...outcomeOutputs({
      done: 'Fires once the model has answered and Text, Json, Usage and Stop Reason hold that answer',
      failure:
        'Fires when no answer was obtained — a missing secret, a refusal, a provider error that ' +
        'outlived its retries, or an answer that did not match the schema. Read Error Code to tell ' +
        'them apart rather than matching on Error, which is written for a person'
    }),
    status: {
      group: 'Error',
      displayName: 'Status',
      type: 'number',
      description:
        'The HTTP status of the last attempt, or 0 when the request never reached the provider — a ' +
        'missing secret, an unimplemented provider, a timeout',
      getter: function (this: any) {
        return this._internal.status;
      }
    },
    error: {
      group: 'Error',
      displayName: 'Error',
      type: 'string',
      description: 'Why there is no answer, in a sentence. Names the secret or the status, never a key',
      getter: function (this: any) {
        return this._internal.error;
      }
    },
    errorCode: {
      group: 'Error',
      displayName: 'Error Code',
      type: 'string',
      description:
        'A stable code for the failure, for a graph that branches rather than reads: not_implemented, ' +
        'secret_missing, refusal, bad_json, http_error, rate_limited, timeout, network, unavailable',
      getter: function (this: any) {
        return this._internal.errorCode;
      }
    }
  },
  methods: {
    /** Publish on the Error ports and settle every invocation in this batch as a failure. */
    setError: function (this: any, message: string, code: string, tokens: any[], status?: number) {
      this._internal.error = message;
      this._internal.errorCode = code;
      this._internal.status = typeof status === 'number' ? status : 0;
      this.flagOutputDirty('error');
      this.flagOutputDirty('errorCode');
      this.flagOutputDirty('status');
      this.raiseRuntimeError(outcomeCode(code), message);
      reportOutcomes(this, tokens || [], 'failure', { code: outcomeCode(code), message });
    },
    /**
     * ⚠️ The pending array is created lazily rather than in `initialize`, for the reason Send
     * Email records: several suites build a node as a bag of bound methods and never call
     * `initialize`, and an eager field is `undefined` exactly where the first invocation reads it.
     */
    scheduleSend: function (this: any, token: unknown) {
      if (token) {
        if (!this._internal.pendingSendOutcomes) this._internal.pendingSendOutcomes = [];
        this._internal.pendingSendOutcomes.push(token);
      }

      if (this._internal.sendScheduled) return;
      this._internal.sendScheduled = true;
      this.scheduleAfterInputsHaveUpdated(() => {
        this._internal.sendScheduled = false;
        this.doSend();
      });
    },
    doSend: function (this: any) {
      // Drained BEFORE the request starts, so a second `Do` arriving mid-flight owns its own
      // batch rather than being settled by this request's answer.
      const tokens = this._internal.pendingSendOutcomes || [];
      this._internal.pendingSendOutcomes = undefined;

      if (this._internal.provider && this._internal.provider !== 'anthropic') {
        // R2's whole point: the port exists so no graph is ever rewired, and it refuses loudly
        // until it does something. Before the secret is touched — an unimplemented provider is
        // not a reason to read a credential.
        this.setError(
          `Model Request: provider '${this._internal.provider}' is not implemented yet. Only ` +
            'anthropic is available in this release; the port exists so a graph drawn now keeps its ' +
            'wiring when another provider arrives.',
          CODES.notImplemented,
          tokens
        );
        return;
      }

      const name = this._internal.apiKeySecret;
      const getSecret = (globalThis as any)._noodl_get_secret;
      if (typeof getSecret !== 'function') {
        // Same two-case split as Secret and Send Email: absent means "this graph is not running
        // inside nodegx-backend at all", which is a different problem from "running here but the
        // secret is not provisioned".
        this.setError(
          'Model Request: no secret store is available. This node only works inside a nodegx-backend ' +
            'cloud function (FED-003) — it is not usable in the browser viewer.',
          CODES.unavailable,
          tokens
        );
        return;
      }

      let secret: SecretLookupResult;
      try {
        secret = getSecret(name);
      } catch {
        // Deliberately does NOT forward the thrown value: a store that throws while holding a
        // credential must not get to choose the message.
        this.setError('Model Request: the secret store could not be read.', CODES.secretMissing, tokens);
        return;
      }

      if (!secret || !secret.found || !secret.value) {
        // AC4 — names the secret, before any request is made, and never a value.
        this.setError(
          (secret && secret.error) ||
            `Model Request: no secret named '${name}' is provisioned for this backend's functions. ` +
              'Add it in the admin dashboard under Secrets, or set NODEGX_SECRET_' +
              String(name || '').toUpperCase() +
              ' in the environment.',
          CODES.secretMissing,
          tokens
        );
        return;
      }

      // From here the key exists in ONE local, inside ONE promise chain, and nowhere else.
      this.dispatch(secret.value, tokens);
    },
    /** Build the body §3.2 describes. Split out so a spec can read it without a network. */
    buildBody: function (this: any) {
      const messages =
        Array.isArray(this._internal.messages) && this._internal.messages.length > 0
          ? this._internal.messages
          : [{ role: 'user', content: this._internal.input === undefined ? '' : String(this._internal.input) }];

      const body: Record<string, unknown> = {
        model: this._internal.model || DEFAULTS.model,
        max_tokens: this._internal.maxTokens || DEFAULTS.maxTokens,
        messages
      };
      if (this._internal.instructions) body.system = this._internal.instructions;

      // `effort` and `format` are both inside `output_config` — taken from the API docs at build
      // time (2026-09-19), where the older top-level `output_format` is the deprecated spelling.
      const outputConfig: Record<string, unknown> = { effort: this._internal.effort || DEFAULTS.effort };
      if (this._internal.outputSchema !== undefined && this._internal.outputSchema !== null) {
        outputConfig.format = { type: 'json_schema', schema: this._internal.outputSchema };
      }
      body.output_config = outputConfig;

      // No `thinking` field and no `budget_tokens`, deliberately: current models think
      // adaptively by default and reject a token budget outright.
      return body;
    },
    /** Hand the cost to the run that paid it (FED-003 §3.4). Absent host, no-op, no branch. */
    recordCall: function (this: any, usage: ModelUsage, durationMs: number) {
      const scope = this.nodeScope as { runContext?: NodeRunContext } | undefined;
      const sink = scope && scope.runContext && scope.runContext.recordModelCall;
      if (!sink) return;
      sink.call(scope!.runContext, {
        model: this._internal.model || DEFAULTS.model,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        cacheReadTokens: usage.cacheReadTokens,
        durationMs
      });
    },
    /**
     * One call, up to {@link MAX_ATTEMPTS} attempts, settling exactly `tokens`.
     *
     * ⚠️ `key` is a parameter and never a field. It is in scope for this function and gone when
     * it returns; nothing it touches is stored.
     *
     * Returns a promise that resolves (never rejects) when the call is settled, so a spec can
     * await it.
     */
    dispatch: function (this: any, key: string, tokens: any[]) {
      const started = Date.now();
      // One deadline for the whole call, retries included — a per-attempt timeout would let three
      // attempts quietly spend three times the budget the author set.
      const deadline = started + (this._internal.timeoutMs || DEFAULTS.timeoutMs);
      const base = String(this._internal.baseUrl || DEFAULTS.baseUrl).replace(/\/+$/, '');
      const url = `${base}/v1/messages`;
      const body = JSON.stringify(this.buildBody());

      let attempts = 0;

      const finishFailure = (message: string, code: string, status?: number) => {
        this._internal.attempts = attempts;
        this.flagOutputDirty('attempts');
        this.setError(message, code, tokens, status);
      };

      const attempt = (): Promise<void> => {
        const remaining = deadline - Date.now();
        if (remaining <= 0) {
          finishFailure(
            `Model Request: the call did not finish inside ${this._internal.timeoutMs}ms.`,
            CODES.timeout
          );
          return Promise.resolve();
        }

        attempts++;
        const controller = typeof AbortController === 'function' ? new AbortController() : undefined;
        const timer = controller ? setTimeout(() => controller.abort(), remaining) : undefined;

        return fetch(url, {
          method: 'POST',
          headers: {
            'x-api-key': key,
            'anthropic-version': ANTHROPIC_VERSION,
            'content-type': 'application/json'
          },
          body,
          signal: controller ? controller.signal : undefined
        })
          .then((response: any) => {
            if (timer) clearTimeout(timer);
            const status = response.status;

            const retryable = status === 429 || status >= 500;
            if (retryable && attempts < MAX_ATTEMPTS) {
              const after =
                retryAfterMs(response.headers && response.headers.get ? response.headers.get('retry-after') : null) ??
                RETRY_BASE_MS * Math.pow(2, attempts - 1);
              // Never sleep past the deadline: waiting out a backoff only to fail on the clock
              // spends the function's whole budget to reach the same answer.
              const wait = Math.max(0, Math.min(after, deadline - Date.now()));
              // ⚠️ Drain the body we are about to throw away. An undiscarded response body holds
              // its socket open in Node's fetch, and this is the ONE path that abandons a
              // response — a backend retrying rate limits all day would leak one per retry.
              return Promise.resolve(response.text())
                .catch(() => undefined)
                .then(() => new Promise<void>((resolve) => setTimeout(resolve, wait)))
                .then(attempt);
            }

            return response.text().then((raw: string) => {
              if (status < 200 || status >= 300) {
                // 4xx is the caller's mistake and 5xx has outlived its retries; both are the same
                // shape to a graph, and `status` plus the provider's own message is what tells
                // them apart. The body is the provider's error JSON — not a credential.
                const code = status === 429 || status >= 500 ? CODES.rateLimited : CODES.httpError;
                finishFailure(
                  `Model Request: the provider answered ${status}. ${raw.slice(0, 400)}`.trim(),
                  code,
                  status
                );
                return;
              }

              let payload: any;
              try {
                payload = JSON.parse(raw);
              } catch {
                finishFailure(
                  `Model Request: the provider answered ${status} with something that is not JSON.`,
                  CODES.network,
                  status
                );
                return;
              }

              const usage = usageOf(payload.usage);
              const durationMs = Date.now() - started;
              // The cost is recorded for every answered call, including a refusal: it was paid.
              this.recordCall(usage, durationMs);
              this._internal.usage = usage;
              this._internal.attempts = attempts;
              this._internal.status = status;
              this.flagOutputDirty('usage');
              this.flagOutputDirty('attempts');
              this.flagOutputDirty('status');

              if (payload.stop_reason === 'refusal') {
                // AC6. A refusal is an HTTP 200 — a graph that only checked the status would read
                // it as an answer and hand an empty string downstream.
                this._internal.stopReason = 'refusal';
                this.flagOutputDirty('stopReason');
                this.setError(refusalMessage(payload.stop_details), CODES.refusal, tokens, status);
                return;
              }

              const text = textOf(payload.content);
              this._internal.stopReason = payload.stop_reason ? String(payload.stop_reason) : '';

              if (this._internal.outputSchema !== undefined && this._internal.outputSchema !== null) {
                let parsed: unknown;
                try {
                  parsed = JSON.parse(text);
                } catch {
                  // AC2. The text is kept: an author debugging a schema needs to see what came
                  // back, and it is the model's own words, not a secret.
                  this._internal.text = text;
                  this.flagOutputDirty('text');
                  this.flagOutputDirty('stopReason');
                  finishFailure(
                    'Model Request: Output Schema was set, but the answer did not parse as JSON. ' +
                      'Text holds what came back.',
                    CODES.badJson,
                    status
                  );
                  return;
                }
                this._internal.json = parsed;
                this.flagOutputDirty('json');
              }

              this._internal.text = text;
              this._internal.error = undefined;
              this._internal.errorCode = undefined;
              this.flagOutputDirty('text');
              this.flagOutputDirty('stopReason');
              this.flagOutputDirty('error');
              this.flagOutputDirty('errorCode');

              // Last, always: every value this outcome describes is already published.
              reportOutcomes(this, tokens, 'done');
            });
          })
          .catch((e: any) => {
            if (timer) clearTimeout(timer);
            const aborted = e && (e.name === 'AbortError' || e.name === 'TimeoutError');
            if (aborted) {
              finishFailure(
                `Model Request: the call did not finish inside ${this._internal.timeoutMs}ms.`,
                CODES.timeout
              );
              return;
            }
            // A transport fault is retryable for the same reason a 5xx is.
            if (attempts < MAX_ATTEMPTS && Date.now() < deadline) {
              const wait = Math.max(0, Math.min(RETRY_BASE_MS * Math.pow(2, attempts - 1), deadline - Date.now()));
              return new Promise<void>((resolve) => setTimeout(resolve, wait)).then(attempt);
            }
            finishFailure(
              `Model Request: the request did not reach the provider. ${e instanceof Error ? e.message : String(e)}`,
              CODES.network
            );
          });
      };

      return attempt();
    }
  }
};

export function setup() {
  // No editor-only dynamic-port behaviour (unlike Request/Response) — every port here is static,
  // and deliberately so: a dynamic port on this node would be a port whose name is derived from a
  // credential's surroundings.
}
