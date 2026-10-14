/**
 * NSP-019 R40 (s105) — what a node tells the editor about its SAVED SETTINGS, read without running the app.
 *
 * Some of what a node tells the editor follows from its settings alone: a Counter whose Min Value is above its Max Value, a
 * Date Add whose Unit is not one of the eight. A spec marks such a diagnostic with the inputs it follows from (`settings:
 * ['limitsMin', 'limitsMax']`, spec.ts `DiagnosticDecl`).
 * Placed with its saved params and settled once, the node shows the sentence whenever an app would, so an editor can show it
 * before the app runs: the validator's `settings-diagnostic` rule (the Problems panel and the MCP server's `validate_*`).
 *
 * The rest are left out on purpose. A Focus that found nothing needs a Focus, a Refresh's failure needs a Refresh, and For
 * Each's "no such component" is read against the play's own templates, not the project's. Read from the settings, each would
 * warn about an app that never shows it.
 *
 * Two things make a saved setting not what the node runs with, and then a sentence that follows from it is not read:
 *   - a wire reaching that input: the wire's value replaces the saved one as soon as it arrives;
 *   - a setting that is an expression (`{ mode: 'expression', expression }`, node.ts :56-64): its value is computed at run time.
 * A wire or an expression on another input changes nothing here (a For Each's Items is almost always wired; its Script is
 * not). A saved setting the spec has no input for (a visual state's variant, a port the node no longer has) is not handed
 * over, and an expression is handed over as its absence.
 */

import { run } from './interpreter';
import type { AnyNodeSpec, InputDecl } from './spec';

export interface SettingsDiagnostic {
  /** The key, as the runtime keys it: `counter/min-above-max`. */
  key: string;
  /** The condition, in words (`DiagnosticDecl.says`). */
  says: string;
  /** The sentence the editor shows. */
  message: string;
}

/** node.ts :56-64 `isExpressionParameter` */
function isExpression(value: unknown): boolean {
  return (
    value !== null &&
    typeof value === 'object' &&
    (value as { mode?: unknown }).mode === 'expression' &&
    typeof (value as { expression?: unknown }).expression === 'string'
  );
}

/** The input `name` is on a node placed with `params`: declared, derived from the params, or one the spec discovers (interpreter.ts `mount`). */
function inputOf(spec: AnyNodeSpec, params: Readonly<Record<string, unknown>>, name: string): InputDecl | undefined {
  if (name in spec.inputs) return spec.inputs[name];
  if (!spec.derived) return undefined;
  let derived: Readonly<Record<string, InputDecl>> = {};
  try {
    derived = spec.derived.inputs(params, {}) as Readonly<Record<string, InputDecl>>;
  } catch {
    // a derivation that cannot read these params derives nothing here
  }
  return derived[name] ?? spec.derived.discover?.(name);
}

/** The keys a spec marks `settings` (empty: nothing to read). */
export function settingsDiagnosticKeys(spec: AnyNodeSpec): string[] {
  return Object.entries(spec.diagnostics ?? {})
    .filter(([, d]) => d.settings !== undefined)
    .map(([key]) => key)
    .sort();
}

/**
 * What a node placed with `params` shows of its `settings` diagnostics, once settled. `wired`: the input ports a wire reaches
 * on it (a project's connections into the node). A node the spec cannot place with these params shows nothing here: this is
 * a reading for an editor, and a play that throws says nothing about the settings.
 */
export function settingsDiagnostics(spec: AnyNodeSpec, params: Readonly<Record<string, unknown>>, wired: readonly string[] = []): SettingsDiagnostic[] {
  if (settingsDiagnosticKeys(spec).length === 0) return [];
  const own: Record<string, unknown> = {};
  const computed = new Set<string>(wired);
  for (const [name, value] of Object.entries(params)) {
    if (!inputOf(spec, params, name)) continue;
    if (isExpression(value)) computed.add(name);
    else own[name] = value;
  }
  // a sentence that follows from an input a wire or an expression feeds is not read
  const keys = settingsDiagnosticKeys(spec).filter((k) => !spec.diagnostics![k].settings!.some((port) => computed.has(port)));
  if (keys.length === 0) return [];
  let trace;
  try {
    trace = run(spec, own, ['settle']);
  } catch {
    return [];
  }
  const shown = new Map<string, string>();
  for (const e of trace) {
    if (e.t !== 'diagnostic' || !keys.includes(e.key)) continue;
    if (e.message === undefined) shown.delete(e.key);
    else shown.set(e.key, e.message);
  }
  return [...shown].map(([key, message]) => ({ key, says: spec.diagnostics![key].says, message }));
}
