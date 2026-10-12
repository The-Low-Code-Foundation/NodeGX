/**
 * The trace — what a node did, in one form whichever implementation did it (NSP-002 §2.1).
 *
 * Inputs and outputs in one ordered stream; `settle` marks where the target drains its frame.
 * Between two settles the events are grouped canonically: `value` events SORTED BY PORT NAME
 * (changed since the last settle only), then `signal` events in emission order, then `outcome`
 * events in the order they were REPORTED, then `request` events, (s21) `backend` events, (s34) `socket` events and (NSP-022) `host` events, one group, in the order they
 * were issued, then
 * the LOCATION events — `open`, `history`, `dispatch`, (s18) `stack`, (s19) `route`, (s20) `popup`, (NSP-014 s31) `picker` and (NSP-016 s56) `answer`, one group — in the order they were made
 * (NSP-015).
 * "Changed" is canonical inequality with the last value RECORDED for
 * the port (nothing before the first settle, so the first settle records every defined output),
 * "sorted by port name" is code-unit order, and what a frame records for an output is the last
 * DEFINED value it held after any step of the frame — adapter.ts spells the three out (NSP-006).
 * "Reported" (NSP-007): an outcome reported at its invocation sits in invocation order; one the
 * frame-end reducer settles (`deferred`) sits where the frame end put it, in invocation order
 * among its kind; one the world settles (`pending` — an answer landing, a timeout firing) sits
 * where that delivery was, which may be frames after the invocation and after a later, immediate
 * outcome. Before NSP-007 every outcome was reported at or before its frame's end and the three
 * readings were one.
 *
 * Two events for the WORLD (NSP-007): `advance` is a stimulus — the clock moved by `ms`; `request`
 * is an observation — the node handed the world a request (`method`, `url`, `headers` with
 * lower-cased names, `body` as it travelled: a string, `{ "$form": [[name, value], …] }`, or
 * absent). NSP-015 adds three, the LOCATION's, each an observation of a call AS HANDED (world.ts
 * LOCATION): `open` — the node asked the browser to open a URL (`window.open(url, target,
 * features)`), each canonical, a `target` or `features` not handed absent; `history` — it pushed a
 * history entry (`history.pushState(state, title, url)`: `op: 'push'`, `url` canonical); `dispatch`
 * — it dispatched an event on the window (`window.dispatchEvent(event)`: `event` is its type). s18 adds `stack` — it handed a
 * Component Stack a push, a replace or a pop (world.ts STACK); s19 `route` — it handed the Routers a navigate
 * (world.ts ROUTE). NSP-014 s21 adds `backend` — it handed a backend an operation in the backend contract's words
 * (world.ts BACKEND, R9): `op`, `backend` the id it went to, `args` canonical, callbacks left out. s31 adds `picker` — it clicked a file
 * input (world.ts PICKER): `accept` and `capture`, what the element held at the click, each a string. s34 adds `socket` — it made a call on a WebSocket (world.ts SOCKET): a `connect`, a `send` or a `close`, as handed, in the request group. NSP-022 s96 adds `host` — it called a service of the backend process (world.ts HOST): `service` and `request` as handed, in the request group. The world's answers are not events: they are scripted (world.ts), so what they were is
 * known from the scenario, and what the node did with them is on the wire.
 * That grouping is a rule of the FORMAT, so that a runtime which
 * pulses a signal synchronously inside a setter and delivers the value at frame end (the
 * interpreted runtime) and one that does both at once (the interpreter) produce the same trace —
 * and so that a target which knows nothing of the spec's declaration order (NSP-006) can still
 * produce a comparable one. `completed` is never an event: every `outcome` implies it. A `failure`
 * outcome's `error` is the implementation's error CODE, not its message.
 *
 * `subject` — what the event happened to — is omitted in a one-node trace, names a node id in a
 * graph trace (NSP-008), and is left open for an app-level subject later (README §8). Nothing in
 * this package emits one; the type must not forbid one.
 *
 * The JSON schema is `schema/trace.schema.json` (`src/schema.ts` validates against it), the
 * canonicaliser is `src/canonical.ts`; this file is the type both agree with.
 */

import type { Outcome } from './spec';

interface Base {
  subject?: string;
}

export type TraceEvent =
  | (Base & { t: 'set'; port: string; value?: unknown })
  | (Base & { t: 'in'; port: string })
  | (Base & { t: 'settle' })
  | (Base & { t: 'value'; port: string; value: unknown })
  | (Base & { t: 'signal'; port: string })
  /** `port` is the INPUT that was invoked (the signal whose reducer reported), never an output name — `''` (s29) for an invocation no input opened (spec.ts `opens`). */
  | (Base & { t: 'outcome'; port: string; value: Outcome; error?: string })
  /** stimulus (NSP-007): the world's clock moved by `ms` milliseconds. */
  | (Base & { t: 'advance'; ms: number })
  /**
   * stimulus (NSP-016 s37): a person did `act` to the node on the page (spec.ts THE PERSON) — one of the acts the spec
   * declares, with the value the act carries (`type`'s text, `choose`'s option, `key`'s key; canonical) or none.
   */
  | (Base & { t: 'act'; act: string; value?: unknown })
  /** observation (NSP-007): the node handed the world a request. `method` is canonical (a node may hand a non-string). */
  | (Base & { t: 'request'; method: unknown; url: string; headers: Record<string, string>; body?: unknown })
  /** observation (NSP-015): the node asked the browser to open a URL — `window.open(url, target, features)`, each canonical, as handed. */
  | (Base & { t: 'open'; url: unknown; target?: unknown; features?: unknown })
  /** observation (NSP-015 s17): the node pushed a history entry — `history.pushState(state, title, url)`, `url` canonical, as handed. */
  | (Base & { t: 'history'; op: 'push'; url: unknown })
  /** observation (NSP-016 s70): the node replaced the current history entry — `history.replaceState(state, title, url)` — or stepped back, `history.back()` (world.ts LOCATION). */
  | (Base & { t: 'history'; op: 'replace'; url: unknown })
  | (Base & { t: 'history'; op: 'back' })
  /** observation (NSP-015 s17): the node dispatched an event on the window — `window.dispatchEvent(event)`, named by its type. */
  | (Base & { t: 'dispatch'; event: string })
  /**
   * observation (NSP-015 s18): the node handed a Component Stack a request (world.ts STACK) — a `push` or `replace`
   * (`stack` / `target` as handed, absent when not; `params` / `transition` canonical at the call) or a `back`
   * (`action` absent when none; `results` canonical at the call).
   */
  | (Base & { t: 'stack'; op: 'push' | 'replace' | 'back'; stack?: unknown; target?: unknown; params?: unknown; transition?: unknown; action?: unknown; results?: unknown })
  /**
   * observation (NSP-015 s19): the node handed the Routers a navigate (world.ts ROUTE) — `RouterHandler.navigate(router, args)`:
   * `router` / `target` as handed, absent when not; `params` and `openInNewTab` canonical at the call.
   */
  | (Base & { t: 'route'; router?: unknown; target?: unknown; params: unknown; openInNewTab: unknown })
  /**
   * observation (NSP-015 s20): the popups (world.ts POPUP) — a `show` (`context.showPopup(target, params, args)`, Show Popup:
   * `target` as handed, `params` canonical at the call, `stackPolicy` / `closeOnEscape` / `modal` as handed, `accessibleName`
   * absent when not handed) or a `close` (the close handler a Close Popup resolved, called with `(action, results)`: `popup`
   * the name of the popup it closes, absent when unnamed; `action` absent when none; `results` canonical at the call).
   */
  | (Base & { t: 'popup'; op: 'show' | 'close'; target?: unknown; params?: unknown; stackPolicy?: unknown; closeOnEscape?: unknown; modal?: unknown; accessibleName?: unknown; popup?: unknown; action?: unknown; results?: unknown })
  /**
   * observation (NSP-014 s21): the node handed a backend an operation (world.ts BACKEND, R9) — `op` the contract's
   * method name (`delete`, `query`, …), `backend` the id it went to, `args` the options as handed, callbacks left out,
   * canonical at the call. In the request group.
   */
  | (Base & { t: 'backend'; op: string; backend: string; args: unknown })
  /**
   * observation (NSP-014 s31): the node clicked a file input (world.ts PICKER) — `input.click()`: `accept` and `capture`, what
   * the element held at the click (reflected attributes, so strings; `''` when never assigned). In the LOCATION group.
   */
  | (Base & { t: 'picker'; accept: string; capture: string })
  /**
   * observation (NSP-014 s34): the node made a call on a WebSocket (world.ts SOCKET) — a `connect` (`new WebSocket(url,
   * protocols)`: `url` as handed, `protocols` absent when not handed), a `send` (`data` as handed: text as itself, bytes as
   * `$bytes`) or a `close` (`code`, `reason`, each absent when not handed); each canonical. In the request group.
   */
  | (Base & { t: 'socket'; op: 'connect' | 'send' | 'close'; url?: unknown; protocols?: unknown; data?: unknown; code?: unknown; reason?: unknown })
  /**
   * observation (NSP-022 s96): the node called a service of the backend process it runs in (world.ts HOST) — `service`
   * `secrets`, `users`, `roles` or `mail`, `request` as handed (for `secrets` the name; absent when it was `undefined`),
   * canonical at the call. In the request group.
   */
  | (Base & { t: 'host'; service: 'secrets' | 'users' | 'roles' | 'mail'; request?: unknown })
  /**
   * observation (NSP-016 s56): the node answered a request another node handed it (spec.ts THE CALLERS) — a Component Stack's
   * answer to a `push`, a `replace` or a `back`: `value` done, unchanged or failure, `error` the failure's CODE (as an outcome's);
   * or `returned` — the page a back popped hands the node that pushed it the back's `action` (absent when none) and `results`
   * (canonical at the call). In the LOCATION group, in the order made. NSP-016 s57 adds a Page Router's: `navigate` — its answer to
   * a Navigate (`value`, `error` as a push's) — and `page`: the `params` it hands the Page Inputs of the page it shows (canonical at
   * the call), one per Page Inputs.
   */
  | (Base & { t: 'answer'; op: 'push' | 'replace' | 'back' | 'returned' | 'navigate' | 'page'; value?: Outcome; error?: string; action?: unknown; results?: unknown; params?: unknown })
  /**
   * observation (NSP-019 s95): what the node tells the EDITOR about its own settings (spec.ts `diagnostics`; the runtime's
   * `setDiagnostic`) — `key` as the runtime keys it, `message` the sentence it now shows, absent when it was withdrawn. One per
   * declared key whose sentence changed since the last settle, sorted by key, closing the frame's group. A target without an
   * editor (adapter.ts `diagnostics`) is not graded on these: the runner leaves them out of its reference.
   */
  | (Base & { t: 'diagnostic'; key: string; message?: string });

/**
 * NSP-016 s37 — the canonical form of a node's reference to ITSELF (a visual node's `This` output,
 * `type: 'reference'`): what a wire from it carries is the node, which no trace can hold, so both
 * targets record the reference as this tag. A reference to another node is not yet a trace value.
 */
export const SELF_REFERENCE = Object.freeze({ $node: 'self' });

/** Trace-format version — must match the `/v1.json` in the schema's `$id` (tests/schema.test.ts). */
export const TRACE_FORMAT_VERSION = 1;
