/**
 * P127-BKO006-TRIGGERNAME — which served function a trigger means.
 *
 * A function is served under its folder too ("Cloud Functions/Weekly Digest"), and `deploy_cloud_functions` reports it
 * as `/#__cloud__/Cloud Functions/Weekly Digest`. The book club's agent named "Weekly Digest": the trigger was stored,
 * and it failed at its first fire ("not found on this backend"). Pure: the trigger tools fetch what is served.
 *
 * @module noodl-mcp/backend/functionTarget
 */

export type FunctionTarget =
  | { kind: 'served'; name: string }
  | { kind: 'resolved'; name: string; note: string }
  | { kind: 'ambiguous'; matches: string[]; message: string }
  | { kind: 'unknown'; name: string; warning: string };

export function resolveFunctionName(asked: string, served: readonly string[]): FunctionTarget {
  if (served.includes(asked)) return { kind: 'served', name: asked };
  const bare = asked.replace(/^\/?#__cloud__\//, '').replace(/^\//, '');
  const matches = served.filter((n) => n === bare || n.endsWith('/' + bare));
  if (matches.length === 1) {
    return { kind: 'resolved', name: matches[0], note: `"${asked}" is served as "${matches[0]}"; the trigger names it that way.` };
  }
  if (matches.length > 1) {
    return { kind: 'ambiguous', matches, message: `"${asked}" could be any of ${matches.map((m) => `"${m}"`).join(', ')}. Name the one the trigger runs.` };
  }
  return {
    kind: 'unknown',
    name: asked,
    warning:
      `No function called "${asked}" is on this backend yet, so this trigger fails every time it fires until one is. ` +
      (served.length ? `It serves: ${served.map((n) => `"${n}"`).join(', ')}. ` : '') +
      'A function is named by its folder too ("Cloud Functions/<name>"); deploy it with deploy_cloud_functions, or update the trigger to a served name.'
  };
}
