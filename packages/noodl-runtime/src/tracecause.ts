/**
 * Bug P123-STU030-SIGNALCAUSE — the trace's `cause` across a deferred or asynchronous step.
 *
 * `NodeContext._currentCause` names the event that delivered the input a node is processing, and
 * `Node.update` sets it only while it drains a queued input. Anything a node does LATER on that
 * input's behalf — a callback it scheduled for after its inputs update (where a Function's Run
 * runs), an action's Done reported after a request answers, a script's signal after an `await` —
 * ran with it reset to 0 and was recorded as a root. So the trace said in what order things ran
 * and not why.
 *
 * These two functions carry it: read the cause where the work is started, run the later send
 * under it. Free functions rather than `Node.prototype` methods on purpose: several suites build a
 * node as a bag of bound prototype methods, and a new required method breaks them all (the note on
 * `Node.prototype.reportOutcome`). Both cost one property read when tracing is off.
 */

/** What these read of a `NodeContext`. Taken as `object`, because the std library types a node's context as `NodeContextLike`. */
interface TraceCauseContext {
  traceEnabled?: boolean;
  _currentCause?: number;
}

/** The cause in force now, or 0 when nothing is tracing. */
export function currentTraceCause(context: object | undefined | null): number {
  const c = context as TraceCauseContext | undefined | null;
  return c && c.traceEnabled ? c._currentCause || 0 : 0;
}

/** Run `fn` with `cause` as the trace's current cause, restored afterwards. A 0 cause changes nothing. */
export function withTraceCause<T>(context: object | undefined | null, cause: number, fn: () => T): T {
  const c = context as TraceCauseContext | undefined | null;
  if (!cause || !c || !c.traceEnabled) return fn();
  const previous = c._currentCause;
  c._currentCause = cause;
  try {
    return fn();
  } finally {
    c._currentCause = previous;
  }
}
