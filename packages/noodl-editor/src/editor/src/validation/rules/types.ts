/**
 * SUB-006 — Semantic Validator: rule contract
 *
 * A rule is a pure function from (normalized project + catalog + options) to a
 * list of diagnostics. Rules are independent and individually toggleable so a
 * rule that ever misfires can be disabled without losing the rest — a core
 * design requirement of this task.
 *
 * @module noodl-editor/validation/rules/types
 */

import { CatalogIndex } from '../CatalogIndex';
import { Diagnostic, DiagnosticCode } from '../diagnostics';
import { NormComponent, NormNode, NormProject } from '../model';

export interface ValidatorOptions {
  /**
   * Greenfield/strict mode: promote "unknown node type" from a warning to an
   * error. Off by default so real projects (which legitimately carry
   * module/legacy nodes the catalog can't enumerate) don't fail CI.
   */
  strict?: boolean;
  /**
   * Emit info-level notes for ports that were skipped because the node creates
   * them at runtime. Off by default — on a large project this is thousands of
   * notes. Turn on when explaining *why* a port was not checked.
   */
  emitDynamicPortInfo?: boolean;
  /**
   * P107 NSP-020 R19 — the ports a node has NOW, drawn from its spec over the project (its settings, its wires, the
   * schema, the components). `nonexistentPort` asks it only for a wire to a port that neither the catalog nor the node's
   * saved lists name, on a type whose ports appear at run time: a port in the answer is OK; one not in it is an error
   * that names the near one; `undefined` (a type the spec does not draw) leaves the port unchecked, as before. The
   * validator stays free of the specs and the project files: the caller (the agent server) supplies it.
   */
  drawnPorts?: DrawnPortsLookup;
  /**
   * P107 R40 — what a node's saved settings make it tell the editor once the app runs, read from its spec's `settings: true`
   * diagnostics (`settingsDiagnosticLookup.ts`). `settingsDiagnostic` asks it of every node; absent, that rule reads nothing.
   * Supplied by the caller (the Problems panel, the agent server) for the same reason as `drawnPorts`: the validator stays free
   * of the specs, and a consumer that cannot resolve `@nodegx/node-spec` (the CLIs under scripts/) still loads it.
   */
  settingsDiagnostics?: SettingsDiagnosticsLookup;
  /** When set, only these rules run. */
  only?: Set<DiagnosticCode>;
  /** Rules to skip. */
  disabled?: Set<DiagnosticCode>;
}

/** `ValidatorOptions.drawnPorts`: one node's ports by plug, by its component's name and its id. */
export type DrawnPortsLookup = (
  component: string,
  nodeId: string,
  nodeType: string
) => { input: ReadonlySet<string>; output: ReadonlySet<string> } | undefined;

/** `ValidatorOptions.settingsDiagnostics`: one node's settings-only warnings, by its type, its saved params and the input ports wired into it. */
export type SettingsDiagnosticsLookup = (
  nodeType: string,
  params: Readonly<Record<string, unknown>>,
  wired: readonly string[]
) => readonly { key: string; message: string }[];

/** Per-component view precomputed once and shared across rules. */
export interface ComponentContext {
  component: NormComponent;
  nodeById: Map<string, NormNode>;
}

export interface RuleContext {
  project: NormProject;
  catalog: CatalogIndex;
  options: ValidatorOptions;
  /** Components with their id→node maps, computed once by the validator. */
  components: ComponentContext[];
  /** Running tally the validator reads for the summary. */
  counters: { nodesChecked: number; endpointsChecked: number };
}

export interface Rule {
  code: DiagnosticCode;
  /** One-line description shown in `--list-rules`. */
  description: string;
  /** Whether the rule runs unless explicitly disabled. */
  defaultEnabled: boolean;
  run(ctx: RuleContext): Diagnostic[];
}
