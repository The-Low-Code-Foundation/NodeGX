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
 *    The cost channel (`recordModelCall`) carries five numbers and a model id. See
 *    `runcontext.ts`'s `RuntimeModelCall`.
 *  - **Nothing here logs.** Not on failure either; the messages below are built from the name and
 *    the status, which is all an operator needs and all they are owed.
 *  - **A provider's error prose stays off the record (ISL-010).** A failed call's message on the
 *    record carries the status and the error's type/code identifiers only. A provider's own
 *    sentence can quote the request — a local server's "could not parse …" echoes the prompt —
 *    so it goes on the `Error` port, where the author's graph decides what to do with it, and
 *    nowhere else.
 *
 * ## The OpenAI-compatible provider (ISL-010)
 *
 * The shape every local model server speaks (Ollama, llama.cpp's server, LM Studio, vLLM):
 * `POST <base>/v1/chat/completions`, a structured answer through `response_format`'s
 * `json_schema`. The node stays general: a fixed question with slots, a word list and an output
 * check are the GRAPH's job (ISL-010 ruling 3), because the fence is policy and policy varies by
 * app. Its one rule of its own is the key (ruling 2): a key is optional only when Base URL is
 * this computer, read from the parsed host — see {@link isThisComputer}. Stop reasons and usage
 * are mapped onto the Anthropic vocabulary the ports already promise, so a graph switching
 * provider is never rewired (FED-003 R2).
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
  /** Tokens written to the prompt cache by this call — the only way to tell "cached, read next
   *  time" apart from "nothing cached", and a write on every call is the sign the prefix varies. */
  cacheWriteTokens: number;
}

const EMPTY_USAGE: ModelUsage = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 };

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
    cacheReadTokens: n(usage.cache_read_input_tokens),
    cacheWriteTokens: n(usage.cache_creation_input_tokens)
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

/**
 * ISL-010 ruling 2: is Base URL this computer? Read from the PARSED host, never a prefix —
 * `http://127.0.0.1.evil.example` begins with "127.0.0.1" and is somebody else's machine. The
 * URL parser already folds `127.1`, `0x7f.0.0.1` and `[0:0::1]` into the three spellings below.
 *
 * ⚠️ Not resolved through DNS, deliberately: `localhost` is reserved for loopback (RFC 6761), and
 * all this decides is whether a MISSING key is a mistake. With no key nothing secret is sent
 * anywhere; with a key provisioned the key is sent as it always was.
 */
export function isThisComputer(baseUrl: string): boolean {
  let host: string;
  try {
    host = new URL(baseUrl).hostname.toLowerCase();
  } catch {
    return false;
  }
  return host === '127.0.0.1' || host === '[::1]' || host === 'localhost';
}

/**
 * Where a chat completion goes. A base already ending in `/v1` is taken as given (it is what the
 * OpenAI SDKs and Ollama's and llama.cpp's docs print), and so is a full `/chat/completions` URL —
 * otherwise a person pasting either would be sent to `/v1/v1/chat/completions`.
 */
function chatCompletionsUrl(base: string): string {
  if (/\/chat\/completions$/.test(base)) return base;
  if (/\/v1$/.test(base)) return `${base}/chat/completions`;
  return `${base}/v1/chat/completions`;
}

/** A chat completion's answer. `content` is a string on every server measured; parts are joined. */
function chatTextOf(message: any): string {
  if (!message) return '';
  if (typeof message.content === 'string') return message.content;
  if (!Array.isArray(message.content)) return '';
  return message.content
    .filter((part: any) => part && part.type === 'text' && typeof part.text === 'string')
    .map((part: any) => part.text)
    .join('');
}

/**
 * Chat usage onto {@link ModelUsage}. ⚠️ `prompt_tokens` INCLUDES cached tokens where Anthropic's
 * `input_tokens` excludes them, so the cached part is taken out: Input Tokens means the same
 * uncached count whichever provider answered. Nothing reports a cache write.
 */
function chatUsageOf(usage: any): ModelUsage {
  const n = (v: unknown) => (typeof v === 'number' && isFinite(v) ? v : 0);
  if (!usage) return { ...EMPTY_USAGE };
  const cached = n(usage.prompt_tokens_details && usage.prompt_tokens_details.cached_tokens);
  return {
    inputTokens: Math.max(0, n(usage.prompt_tokens) - cached),
    outputTokens: n(usage.completion_tokens),
    cacheReadTokens: cached,
    cacheWriteTokens: 0
  };
}

/** `finish_reason` onto the Stop Reason the port promises (R2: a graph is never rewired). */
const CHAT_STOP_REASONS: Record<string, string> = {
  stop: 'end_turn',
  length: 'max_tokens',
  tool_calls: 'tool_use',
  function_call: 'tool_use'
};

/** One answer, read from either API into what the ports publish. */
interface ReadAnswer {
  usage: ModelUsage;
  text: string;
  stopReason: string;
  /** Set when the model declined: the sentence the failure carries. */
  refusal?: string;
}

function readMessagesAnswer(payload: any): ReadAnswer {
  return {
    usage: usageOf(payload.usage),
    text: textOf(payload.content),
    stopReason: payload.stop_reason ? String(payload.stop_reason) : '',
    refusal: payload.stop_reason === 'refusal' ? refusalMessage(payload.stop_details) : undefined
  };
}

/**
 * A chat completion, or `undefined` when the JSON is not one (no `choices`) — a wrong Base URL
 * answering 200 with some other JSON must not reach the graph as an empty answer.
 *
 * A refusal is `message.refusal` or `finish_reason: content_filter`. ⚠️ The model's refusal
 * WORDS are not put in the sentence: that sentence reaches the record, and the words can quote
 * the request.
 */
function readChatAnswer(payload: any): ReadAnswer | undefined {
  const choice = payload && Array.isArray(payload.choices) ? payload.choices[0] : undefined;
  if (!choice) return undefined;
  const finish = choice.finish_reason ? String(choice.finish_reason) : '';
  const declined =
    (choice.message && typeof choice.message.refusal === 'string' && choice.message.refusal.length > 0) ||
    finish === 'content_filter';
  return {
    usage: chatUsageOf(payload.usage),
    text: chatTextOf(choice.message),
    stopReason: declined ? 'refusal' : CHAT_STOP_REASONS[finish] || finish,
    refusal: declined
      ? `Model Request: the model declined this request (${finish === 'content_filter' ? 'content_filter' : 'refusal'})`
      : undefined
  };
}

/**
 * The parts of a provider's error body that may go on the record: its `error.type` and
 * `error.code`, and only when each is an identifier. A free-text message never qualifies — see the
 * module note. Ollama answers `{ "error": "<a sentence>" }`, which yields nothing, on purpose.
 */
function errorIdentifiers(raw: string): string[] {
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  const err = parsed && parsed.error && typeof parsed.error === 'object' ? parsed.error : undefined;
  if (!err) return [];
  const words: string[] = [];
  for (const word of [err.type, err.code]) {
    if (typeof word === 'string' && /^[A-Za-z0-9_.:-]{1,64}$/.test(word) && words.indexOf(word) === -1) words.push(word);
  }
  return words;
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
          { label: 'OpenAI-compatible', value: 'openai-compatible' }
        ]
      },
      default: DEFAULTS.provider,
      description:
        'Which API shape the request is built in. OpenAI-compatible is what a model running on your ' +
        'own computer speaks (Ollama, llama.cpp\'s server, LM Studio): point Base URL at it, for ' +
        'example http://127.0.0.1:11434, and set Model to the name that server knows the model by. ' +
        'A key is optional only when Base URL is this computer (127.0.0.1, ::1, localhost)',
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
        'one header and dropped. There is deliberately no port that could hold the value. With ' +
        'OpenAI-compatible and a Base URL on this computer, a secret that is not provisioned means ' +
        'no key is sent; anywhere else a missing secret fails with secret_missing',
      set: function (this: any, value: string) {
        this._internal.apiKeySecret = value;
      }
    },
    baseUrl: {
      group: 'General',
      displayName: 'Base URL',
      type: 'string',
      default: DEFAULTS.baseUrl,
      description:
        'Where the request goes. Change it for a local model server, a proxy, a gateway, or a test ' +
        'double. For OpenAI-compatible, a URL ending in /v1 or /chat/completions is used as given',
      set: function (this: any, value: string) {
        this._internal.baseUrl = value || DEFAULTS.baseUrl;
      }
    },
    instructions: {
      group: 'Request',
      displayName: 'Instructions',
      type: { name: 'string', codeeditor: 'text' },
      description:
        'The system prompt — who the model is being asked to be, and the rules of the task. Cached: ' +
        'the first call writes it to the provider\'s prompt cache and calls in the next 5 minutes read ' +
        'it at a tenth of the price. Keep it the same on every call; anything that changes per call ' +
        '(a name, today\'s date) belongs in Per-Call Instructions or Input, or nothing is ever read back. ' +
        'Instructions shorter than the model\'s minimum (512 tokens on Claude Opus 5, up to 4,096 on ' +
        'some older models) are not cached at all: the call works, and Usage shows 0 written. ' +
        'OpenAI-compatible: Instructions and Per-Call Instructions are sent as one system message, ' +
        'and any caching is the server\'s own',
      set: function (this: any, value: string) {
        this._internal.instructions = value;
      }
    },
    callInstructions: {
      group: 'Request',
      displayName: 'Per-Call Instructions',
      type: { name: 'string', codeeditor: 'text' },
      description:
        'More instructions that change from call to call — who this learner is, what happened last ' +
        'time. Sent after Instructions and never cached, so changing them does not throw the cached ' +
        'Instructions away',
      set: function (this: any, value: string) {
        this._internal.callInstructions = value;
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
        'false, and the provider refuses the request outright if they do not have it. An ' +
        'OpenAI-compatible server is sent it as response_format json_schema; a server that ignores ' +
        'it and answers in prose fails with bad_json, and an answer that parses is not re-checked ' +
        'against the schema here',
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
          { label: 'None (no thinking)', value: 'none' },
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
        'quality. Low for tagging and classifying, high for anything that has to be right. ' +
        'OpenAI-compatible: only None is sent (as reasoning_effort none), and it is the setting a ' +
        'small thinking model on this computer needs — without it a Qwen 3 spends a short Max ' +
        'Tokens thinking and answers nothing; the other values are not sent, because a model that ' +
        'does not think refuses them. Anthropic: None is sent as Low, the lowest it takes',
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
        'What the call cost, as { inputTokens, outputTokens, cacheReadTokens, cacheWriteTokens }. ' +
        'A write on every call and reads of 0 means Instructions differ between calls. The same ' +
        'numbers land on the run\'s execution record, where they are summed per run',
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
        'missing secret, a provider this node does not know, a timeout',
      getter: function (this: any) {
        return this._internal.status;
      }
    },
    error: {
      group: 'Error',
      displayName: 'Error',
      type: 'string',
      description:
        'Why there is no answer, in a sentence. Names the secret or the status, never a key. When the ' +
        'provider answered with an error, its own words follow — here only, never on the execution ' +
        'record, because a server\'s error can quote the request',
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
    /**
     * Publish on the Error ports and settle every invocation in this batch as a failure.
     *
     * `portDetail` is the provider's own words, and it goes on the `Error` PORT only: the runtime
     * error and the outcome are the execution record, and the record is counts only (ISL-010).
     */
    setError: function (this: any, message: string, code: string, tokens: any[], status?: number, portDetail?: string) {
      this._internal.error = portDetail ? `${message} ${portDetail}` : message;
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

      const provider = this._internal.provider || DEFAULTS.provider;
      if (provider !== 'anthropic' && provider !== 'openai-compatible') {
        // A value the enum never offered (a hand-edited project, a provider from a newer release).
        // Refused before the secret is touched — an unknown provider is not a reason to read a
        // credential.
        this.setError(
          `Model Request: provider '${provider}' is not implemented. This release speaks anthropic ` +
            'and openai-compatible.',
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
        const baseUrl = String(this._internal.baseUrl || DEFAULTS.baseUrl);
        if (provider === 'openai-compatible' && isThisComputer(baseUrl)) {
          // ISL-010 ruling 2: a model server on this computer has no key to give.
          this.dispatch(undefined, tokens);
          return;
        }
        // AC4 — names the secret, before any request is made, and never a value.
        this.setError(
          (secret && secret.error) ||
            `Model Request: no secret named '${name}' is provisioned for this backend's functions. ` +
              'Add it in the admin dashboard under Secrets, or set NODEGX_SECRET_' +
              String(name || '').toUpperCase() +
              ' in the environment.' +
              (provider === 'openai-compatible'
                ? ' A key is optional only when Base URL is this computer (127.0.0.1, ::1, localhost).'
                : ''),
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
      const body: Record<string, unknown> = {
        model: this._internal.model || DEFAULTS.model,
        max_tokens: this._internal.maxTokens || DEFAULTS.maxTokens,
        messages: this.conversation()
      };
      const system = this.buildSystem();
      if (system !== undefined) body.system = system;

      // `effort` and `format` are both inside `output_config` — taken from the API docs at build
      // time (2026-09-19), where the older top-level `output_format` is the deprecated spelling.
      // `none` is OpenAI-compatible's (ISL-010); the lowest this API takes is `low`.
      const effort = this._internal.effort === 'none' ? 'low' : this._internal.effort || DEFAULTS.effort;
      const outputConfig: Record<string, unknown> = { effort };
      if (this._internal.outputSchema !== undefined && this._internal.outputSchema !== null) {
        outputConfig.format = { type: 'json_schema', schema: this._internal.outputSchema };
      }
      body.output_config = outputConfig;

      // No `thinking` field and no `budget_tokens`, deliberately: current models think
      // adaptively by default and reject a token budget outright.
      return body;
    },
    /** Messages when wired and non-empty, else Input as one user turn — the same for both APIs. */
    conversation: function (this: any): unknown[] {
      return Array.isArray(this._internal.messages) && this._internal.messages.length > 0
        ? this._internal.messages
        : [{ role: 'user', content: this._internal.input === undefined ? '' : String(this._internal.input) }];
    },
    /**
     * The OpenAI-compatible body (ISL-010). `max_tokens`, not `max_completion_tokens`: it is the
     * spelling every local server reads. Instructions travel as ONE system message — several
     * chat templates (Qwen's among them) accept a system turn only first and only once.
     *
     * Effort is sent ONLY as `reasoning_effort: 'none'` (measured on Ollama 0.34.4, ISL-010 AC4):
     * `none` turns a Qwen 3's thinking off and a non-thinking model accepts it, while `low` still
     * spends 64 tokens thinking and `high` is a 400 ("does not support thinking") from a model that
     * does not think — so the default `high` must never be sent.
     */
    buildChatBody: function (this: any) {
      const fixed = this._internal.instructions ? String(this._internal.instructions) : '';
      const perCall = this._internal.callInstructions ? String(this._internal.callInstructions) : '';
      const system = [fixed, perCall].filter(Boolean).join('\n\n');

      const body: Record<string, unknown> = {
        model: this._internal.model || DEFAULTS.model,
        max_tokens: this._internal.maxTokens || DEFAULTS.maxTokens,
        messages: system ? [{ role: 'system', content: system }, ...this.conversation()] : this.conversation()
      };
      if (this._internal.effort === 'none') body.reasoning_effort = 'none';
      if (this._internal.outputSchema !== undefined && this._internal.outputSchema !== null) {
        body.response_format = {
          type: 'json_schema',
          json_schema: { name: 'answer', strict: true, schema: this._internal.outputSchema }
        };
      }
      return body;
    },
    /**
     * `system`, split at the one boundary the node knows is stable (HLT-019, ruled 2026-09-22).
     *
     * `Instructions` is one text block marked `cache_control` (5-minute TTL); `Per-Call
     * Instructions` follows it unmarked, so the cached prefix ends before the part that varies.
     *
     * ⚠️ **Never the API's top-level automatic `cache_control`.** It marks the LAST block, which
     * here is per-call text: every call would write an entry no other call begins with, paying
     * 1.25× and never reading ([HLT-019 worked example](dev-docs/tasks/phase-99-the-ones-nobody-owned/HLT-019-WORKED-EXAMPLE.md),
     * case C). Instructions under the model's minimum (512 tokens on Opus 5) are simply not
     * cached — no error, no charge.
     *
     * With only Per-Call Instructions it stays the plain string it always was: there is nothing
     * stable to cache. Empty blocks are never sent; the API refuses an empty text block.
     */
    buildSystem: function (this: any): string | Array<Record<string, unknown>> | undefined {
      const fixed = this._internal.instructions ? String(this._internal.instructions) : '';
      const perCall = this._internal.callInstructions ? String(this._internal.callInstructions) : '';
      if (!fixed) return perCall || undefined;

      const blocks: Array<Record<string, unknown>> = [
        { type: 'text', text: fixed, cache_control: { type: 'ephemeral' } }
      ];
      if (perCall) blocks.push({ type: 'text', text: perCall });
      return blocks;
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
        cacheWriteTokens: usage.cacheWriteTokens,
        durationMs
      });
    },
    /**
     * One call, up to {@link MAX_ATTEMPTS} attempts, settling exactly `tokens`.
     *
     * ⚠️ `key` is a parameter and never a field. It is in scope for this function and gone when
     * it returns; nothing it touches is stored. `undefined` only for an OpenAI-compatible server
     * on this computer (ISL-010 ruling 2), which is then sent no authorization header at all.
     *
     * Returns a promise that resolves (never rejects) when the call is settled, so a spec can
     * await it.
     */
    dispatch: function (this: any, key: string | undefined, tokens: any[]) {
      const started = Date.now();
      // One deadline for the whole call, retries included — a per-attempt timeout would let three
      // attempts quietly spend three times the budget the author set.
      const deadline = started + (this._internal.timeoutMs || DEFAULTS.timeoutMs);
      const base = String(this._internal.baseUrl || DEFAULTS.baseUrl).replace(/\/+$/, '');
      const chat = this._internal.provider === 'openai-compatible';
      const url = chat ? chatCompletionsUrl(base) : `${base}/v1/messages`;
      const body = JSON.stringify(chat ? this.buildChatBody() : this.buildBody());
      const headers: Record<string, string> = chat
        ? { 'content-type': 'application/json' }
        : { 'x-api-key': key as string, 'anthropic-version': ANTHROPIC_VERSION, 'content-type': 'application/json' };
      if (chat && key) headers.authorization = `Bearer ${key}`;

      let attempts = 0;

      const finishFailure = (message: string, code: string, status?: number, portDetail?: string) => {
        this._internal.attempts = attempts;
        this.flagOutputDirty('attempts');
        this.setError(message, code, tokens, status, portDetail);
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
          headers,
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
                // them apart. ⚠️ The message is NOT a credential but it can be the prompt: a
                // server's error may quote the request. The record gets the status and the
                // error's identifiers; the provider's words go on the Error port only.
                const code = status === 429 || status >= 500 ? CODES.rateLimited : CODES.httpError;
                const words = errorIdentifiers(raw);
                finishFailure(
                  `Model Request: the provider answered ${status}${words.length ? ` (${words.join(', ')})` : ''}.`,
                  code,
                  status,
                  raw.slice(0, 400).trim() || undefined
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

              const read = chat ? readChatAnswer(payload) : readMessagesAnswer(payload);
              if (!read) {
                finishFailure(
                  `Model Request: the provider answered ${status} with JSON that is not a chat completion. ` +
                    'Check Base URL.',
                  CODES.network,
                  status
                );
                return;
              }

              const usage = read.usage;
              const durationMs = Date.now() - started;
              // The cost is recorded for every answered call, including a refusal: it was paid.
              this.recordCall(usage, durationMs);
              this._internal.usage = usage;
              this._internal.attempts = attempts;
              this._internal.status = status;
              this.flagOutputDirty('usage');
              this.flagOutputDirty('attempts');
              this.flagOutputDirty('status');

              if (read.refusal) {
                // AC6. A refusal is an HTTP 200 — a graph that only checked the status would read
                // it as an answer and hand an empty string downstream.
                this._internal.stopReason = 'refusal';
                this.flagOutputDirty('stopReason');
                this.setError(read.refusal, CODES.refusal, tokens, status);
                return;
              }

              const text = read.text;
              this._internal.stopReason = read.stopReason;

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
