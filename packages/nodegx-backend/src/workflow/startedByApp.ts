/**
 * P127-BKO006-SCHEDULEAUTH — a run the app starts itself counts as the app.
 *
 * Richard's ruling, 2026-10-27. The question: a schedule fires with nobody signed in, so a function left at the Request
 * node's default ("Allow Unauthenticated" off) refused every fire, and two of BKO-006's three stranger agents made the
 * function public to get their weekly job to run. Should a run the app starts by itself pass that check? Answer: yes —
 * a schedule, a row change, and a run started from Studio count as the app; a webhook (anyone with the link) and a
 * direct call stay visitors. The function still sees nobody signed in (`Authenticated` false, `UserId` blank).
 *
 * The answer travels as `RunnerRequest.startedByApp`, set in process only. It is never a header or a body field: the
 * function routes and the webhook route copy a caller's headers and body into the run, so either would be a way for
 * a stranger to claim it.
 */
import type { RunTriggerContext } from './WorkflowRunner';

/** Whether a run of this type was started by the app itself rather than by a request from outside. */
export function runStartedByApp(type: RunTriggerContext['type'] | undefined): boolean {
  return type === 'schedule' || type === 'db_change' || type === 'manual';
}
