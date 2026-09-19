'use strict';

/**
 * The per-run services a graph may reach (CWF-013).
 *
 * ## Why this is not a process global
 *
 * `_noodl_send_email` and `_noodl_get_secret` are process globals, and for those two that is
 * right: neither answer depends on *which request* is asking. A log line does. It has to carry the
 * request id, or it cannot be lined up against the access log and the execution record — which is
 * the entire reason CWF-013 exists rather than leaving authors on `console.log`.
 *
 * Two cloud functions run concurrently in one process (`cloud-array-vocabulary.test.ts` asserts
 * exactly that, and inverted: state that silently *persists* between two callers is as wrong as
 * state that silently forgets). So a module-level "current run" would attribute one caller's log
 * line to the other's request id the first time two requests overlapped — a lie that is worse than
 * no id at all, because it would be believed.
 *
 * ## How it reaches a node
 *
 * `NodeScope.runContext`, propagated down component instances exactly as `modelScope` already is
 * (`componentinstance.ts`). The cloud runner sets it on the per-request scope it creates; every
 * nested component instance inherits it; a node reads `this.nodeScope.runContext`. In the browser
 * nothing sets it, which is how one node ends up with two destinations and no `if (cloud)`.
 *
 * @module noodl-runtime/runcontext
 */

/** The four levels the structured logger already understands (`nodegx-backend/ops/logger`). */
export type RuntimeLogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface RuntimeLogEntry {
  level: RuntimeLogLevel;
  /** The author's line. Free text — see the redaction note on the `Log` node. */
  message: string;
  /** An optional structured payload, redacted by whatever consumes this. */
  data?: unknown;
  /** The graph node that logged, so a line can be traced back to a place on a canvas. */
  nodeId?: string;
}

/**
 * One action invocation, opened at {@link NodeInstance.beginOutcome} (DEF-004).
 *
 * ⚠️ **A "step" is an action invocation, not a node the graph passed through.** A `String Format`
 * neither succeeds nor fails, so there is nothing to record about it beyond that a value crossed
 * a wire — which is the per-edge trace's job (`tracebuffer.ts`), a different instrument with a
 * different cost. What an author debugging a wrong result needs is the list of things the graph
 * *did*, each with a verdict, and that set is exactly the set of outcome-reporting invocations.
 */
export interface RuntimeStepStart {
  /** The graph node that acted, so a step can be traced back to a place on a canvas. */
  nodeId: string;
  /** Its registered type name, e.g. `net.noodl.Log`. */
  nodeType: string;
  /**
   * Optional per-node context for the record. ⚠️ Whatever consumes this is responsible for
   * redacting it — a node hands over its own inputs and cannot know what the host considers a
   * secret. The backend sink runs the same two redactions the log line gets, so a record is
   * never less safe than the log.
   */
  inputData?: Record<string, unknown>;
}

/** How an invocation ended. `code` and `message` are present on `failure` only. */
export interface RuntimeStepEnd {
  status: 'done' | 'unchanged' | 'failure';
  code?: string;
  message?: string;
}

/**
 * One model call made by a `Model Request` node during this run (FED-003 §3.4).
 *
 * ⚠️ **Every field here is a COUNT or an IDENTIFIER, and that is the whole design.** The phase's
 * rule 3 says a model key never reaches a log line or an execution record; the prompt is the
 * author's own data and the response is the model's, and neither is something this channel is
 * entitled to persist. What a person needs after the fact is what the run COST — which is four
 * numbers and a model id — and that is exactly what this carries.
 */
export interface RuntimeModelCall {
  /** The model id the request was sent with, e.g. `claude-opus-5`. */
  model: string;
  inputTokens: number;
  outputTokens: number;
  /** Tokens served from the prompt cache, which are billed at a fraction of the rest. */
  cacheReadTokens: number;
  /** Wall-clock for the call, retries included — what the graph actually waited. */
  durationMs: number;
}

/**
 * What a host remembers about the last answer a URL gave (FED-004 §3.2).
 *
 * Two strings and nothing else, because two strings are the whole of HTTP's
 * conditional-request vocabulary: an `ETag` goes back out as `If-None-Match`,
 * a `Last-Modified` as `If-Modified-Since`, and a server that recognises either
 * answers 304 with no body. Anything richer — a cached BODY, an expiry, a
 * freshness heuristic — would be a cache, and a cache is a thing that can be
 * wrong. This cannot: every conditional request still goes to the server, and
 * the server decides.
 */
export interface HttpValidators {
  /** The `ETag` header the last 200 carried, verbatim, weak prefix included. */
  etag?: string;
  /** The `Last-Modified` header the last 200 carried, verbatim. */
  lastModified?: string;
}

/**
 * Where an `HTTP Request` node with `Conditional` on remembers what it last saw.
 *
 * ⚠️ **Per HOST, not per run**, unlike everything else on the context — and it is
 * here anyway, for the same reason `log` is: a browser has no such store, and a
 * node that reached for a module-level one would have to ask `if (cloud)`. The
 * absence of this member IS the browser, and the node's own `Conditional` port
 * degrades to a console warning there without a second code path.
 */
export interface HttpValidatorStore {
  /** The validators last seen for this exact URL, or `null`. Never throws. */
  read(url: string): Promise<HttpValidators | null>;
  /**
   * Remember what a 200 answered with. Fire-and-forget: a store that cannot
   * write must never fail the request that was already served.
   */
  write(url: string, validators: HttpValidators): void;
}

/**
 * Services scoped to one run of one graph.
 *
 * Deliberately small. This is not a general-purpose bag: everything on it has to be something that
 * genuinely differs *per run*, or it belongs on a process global where it cannot be forgotten.
 */
export interface NodeRunContext {
  /** Where a `Log` node's line goes. Absent in the browser, where the console is the answer. */
  log?(entry: RuntimeLogEntry): void;
  /**
   * DEF-004 — where an action invocation is recorded. Returns an opaque handle the runtime hands
   * back to {@link endStep}; `undefined` means the host declined to record this one (a cap, a
   * disabled history) and the runtime must not then call `endStep`.
   *
   * ⚠️ **This has to be the per-run channel and not the error bus**, which is the obvious
   * alternative and the wrong one: the bus hangs off `NodeContext`, there is one of those per
   * `CloudRunner`, and two cloud functions run concurrently in it. A bus subscriber cannot say
   * whose request an event belongs to. This can, for the same reason `log` can.
   */
  beginStep?(step: RuntimeStepStart): unknown;
  /** Close the invocation opened by {@link beginStep}. Never called without a handle from it. */
  endStep?(handle: unknown, end: RuntimeStepEnd): void;
  /**
   * FED-003 — where a model call's cost lands. Absent in the browser, and absent in any host
   * that has no execution record to stamp; a node must treat it as optional exactly as it treats
   * {@link log}.
   *
   * ⚠️ **Per run, for the same reason {@link beginStep} is.** A backend serving two feed
   * functions at once would otherwise bill one graph's tokens to the other's execution record,
   * and a cost number attributed to the wrong run is worse than no cost number — it is a number
   * somebody will act on.
   */
  recordModelCall?(call: RuntimeModelCall): void;
  /** The HTTP request id this run belongs to, when there is one. Diagnostics only. */
  requestId?: string;
  /**
   * FED-004 §3.2 — the conditional-request memory. Absent in the browser, and
   * absent in any host that declines to keep one; a node must treat its absence
   * as "no conditional requests here", never as an error.
   */
  httpValidators?: HttpValidatorStore;
  /**
   * FED-004 §3.3 — the `User-Agent` this host puts on outbound requests that do
   * not set their own.
   *
   * ⚠️ **Absent in the browser deliberately, and not merely unset there.** A
   * browser REFUSES to let script set `User-Agent` (it is a forbidden header
   * name), so a value here would be silently dropped — and a setting that is
   * silently dropped is worse than one that is visibly absent.
   */
  httpUserAgent?: string;
}
