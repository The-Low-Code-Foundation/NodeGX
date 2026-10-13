/**
 * NSP-020 — ports without a running viewer (task §3.1, s79; the format decision of s82 in §6.6).
 *
 * The one answer to "which ports does this node have for these params": what the editor draws
 * today only after a viewer announces them (`sendDynamicPorts`), and for a third of the picker
 * never without one. `portsOf` is the declaration-level list; `drawnPorts` the same as plain
 * data, in the shape the parity drive compares and an editor or the MCP server reads.
 *
 *   portsOf(spec, params, context)
 *     = declared inputs/outputs whose `when(params)` holds (or have none),
 *       a declared value input re-shaped by its `narrow(params, context)`, a value output by its own,
 *     ∪ the outcome ports the runtime declares for `spec.outcomes` (`done`, `completed`, + the listed ones),
 *     ∪ derived.inputs(params, context) ∪ derived.outputs(params, context)
 *
 * A derived port under a declared name is a spec error, as the interpreter already says at mount
 * (interpreter.ts): the only way a declared port changes shape is `narrow`. Order is declaration
 * order, derived after declared — the format has no `index`, and the drive does not compare one.
 *
 * THE SAME FUNCTION PLAYS (s82). A target hands `derived.*` the PLAY's context — `playContextOf(context)`, the wire
 * fields only (spec.ts `PlayContext`) — and registers what comes back, minus the `onWire` outputs no wire asks for
 * (`playOutputs`). An editor hands the project too. One `derived.outputs`, two readers, no padding.
 *
 * `needsContext(spec)` builds the context the NEEDS GATE hands a spec: the fields `derived.needs`
 * names are copied from the caller's context, and a read of any other field THROWS — so a spec that
 * reaches for the schema without declaring it is red, not silently `undefined`.
 */
import type {
  AnyNodeSpec,
  InputDecl,
  OutputDecl,
  PlayContext,
  PortContext,
  SignalInputDecl,
  ValueInputDecl,
  ValueOutputDecl,
  ValueType
} from './spec';
import { PORT_CONTEXT_FIELDS } from './spec';
import { SpecError } from './interpreter';

export interface PortList {
  inputs: Record<string, InputDecl>;
  outputs: Record<string, OutputDecl<unknown>>;
}

/** One port as plain data — the fields the drive compares (NSP-020 §3.1 decision 5). */
export interface DrawnPort {
  name: string;
  plug: 'input' | 'output';
  type: ValueType | 'signal';
  displayName?: string;
  group?: string;
  description?: string;
  default?: unknown;
  /** For an `enum` port: the accepted values, after `narrow`. */
  enums?: readonly string[];
  /** Where the port came from — a declared port, or one `derived.inputs/outputs` drew for these params. */
  source: 'declared' | 'derived';
  /** P107 s101 (R37) — the panel's fields for a value input, from its decl (spec.ts `ValueInputDecl`, "what the property panel draws"). */
  editOnly?: boolean;
  connectionsOnly?: boolean;
  labels?: Readonly<Record<string, string>>;
  codeEditor?: string;
  valuePortPrefix?: string;
  filterBackend?: boolean;
}

const EMPTY: Readonly<PortContext> = Object.freeze({});

/**
 * The params a `when` reads: the node's, with every declared value input's `default` under an unset name.
 * The editor's condition evaluator reads `node.getParameter(name)`, which falls back to the port default
 * (`NodeGraphNode.ts getParameter` :829-833) — so `sizeMode = explicit` on an Image that never set `sizeMode` reads
 * the default `contentSize`, and `<param> NOT SET` is true only for a port WITHOUT a default. A `when` written as
 * `p.sizeMode === 'explicit'` says the same thing here. `derived.inputs/outputs` AND `narrow` (s82, §6.4 gap 3) get
 * the RAW params: the runtime's `setup` hooks read `node.parameters` as stored (And counts its keys; options.ts :417
 * reads a Value set to the default as set), and a default filled in would be a port mentioned.
 */
function effectiveParams(spec: AnyNodeSpec, params: Readonly<Record<string, unknown>>): Readonly<Record<string, unknown>> {
  const out: Record<string, unknown> = {};
  for (const [name, decl] of Object.entries(spec.inputs)) {
    if (decl.type !== 'signal' && (decl as ValueInputDecl).default !== undefined) out[name] = (decl as ValueInputDecl).default;
  }
  for (const [name, value] of Object.entries(params)) if (value !== undefined) out[name] = value;
  return out;
}

/**
 * The outcome ports the runtime declares beside a spec's outputs (`outcome.ts outcomeOutputs` :148-190; ERG-001): `done`
 * and `completed` for any node with an `outcome: true` input, `unchanged` and `failure` when the spec lists them. Drawn
 * so an editor's per-instance list (AC3) has them (§6.4 gap 1); the oracle compares their type only — a node may put
 * them in a group of its own (`options.group`), which the spec does not say.
 */
export function outcomePorts(spec: AnyNodeSpec): Record<string, OutputDecl<unknown>> {
  if (!spec.outcomes || spec.outcomes.length === 0) return {};
  const out: Record<string, OutputDecl<unknown>> = {
    done: { type: 'signal', displayName: 'Done', group: 'Events', description: 'Fires when the action ran and changed something' },
    completed: { type: 'signal', displayName: 'Completed', group: 'Events', description: 'Fires after Done, Unchanged or Failure — whichever the action reports' }
  };
  if ((spec.outcomes as readonly string[]).includes('unchanged')) out.unchanged = { type: 'signal', displayName: 'Unchanged', group: 'Events', description: 'Fires when the action ran and nothing changed' };
  if ((spec.outcomes as readonly string[]).includes('failure')) out.failure = { type: 'signal', displayName: 'Failure', group: 'Events', description: 'Fires when the action could not run; Error says why' };
  return out;
}

export function portsOf(spec: AnyNodeSpec, params: Readonly<Record<string, unknown>> = {}, context: Readonly<PortContext> = EMPTY): PortList {
  const effective = effectiveParams(spec, params);
  const inputs: Record<string, InputDecl> = {};
  for (const [name, decl] of Object.entries(spec.inputs)) {
    if (decl.when && !decl.when(effective)) continue;
    inputs[name] = decl.type !== 'signal' && (decl as ValueInputDecl).narrow ? { ...decl, ...(decl as ValueInputDecl).narrow!(params, context) } : decl;
  }
  const outputs: Record<string, OutputDecl<unknown>> = {};
  for (const [name, decl] of Object.entries(spec.outputs as Record<string, OutputDecl<unknown>>)) {
    if (decl.when && !decl.when(effective)) continue;
    outputs[name] = decl.type !== 'signal' && (decl as ValueOutputDecl<unknown>).narrow ? { ...decl, ...(decl as ValueOutputDecl<unknown>).narrow!(params, context) } : decl;
  }
  for (const [name, decl] of Object.entries(outcomePorts(spec))) if (!(name in outputs)) outputs[name] = decl;
  if (spec.derived) {
    for (const [name, decl] of Object.entries(spec.derived.inputs(params, context))) {
      if (name in spec.inputs) throw new SpecError(`${spec.type}: derived port "${name}" shadows a declared input`);
      inputs[name] = decl;
    }
    if (spec.derived.outputs) {
      for (const [name, decl] of Object.entries(spec.derived.outputs(params, context) as Record<string, OutputDecl<unknown>>)) {
        if (name in spec.outputs) throw new SpecError(`${spec.type}: derived output "${name}" shadows a declared output`);
        outputs[name] = decl;
      }
    }
  }
  return { inputs, outputs };
}

/**
 * NSP-020 (s82) — the derived OUTPUTS a target registers for a play: `derived.outputs(params, playContext)` minus the
 * `onWire` ones no wire asks for (spec.ts `ValueOutputDecl.onWire`), plus `discoverOutput` for each `wiredOutputs` name
 * nothing else derived (nodescope.ts :150). What the interpreter's `mount` registers and re-registers after each param
 * write, and what the runtime target `registerOutputIfNeeded`s — the one list, built in one place.
 */
export function playOutputs(spec: AnyNodeSpec, params: Readonly<Record<string, unknown>>, play: Readonly<PlayContext>, onShadow: 'throw' | 'skip' = 'throw'): Record<string, OutputDecl<unknown>> {
  const out: Record<string, OutputDecl<unknown>> = {};
  const wired = new Set(play.wiredOutputs ?? []);
  if (spec.derived?.outputs) {
    for (const [name, decl] of Object.entries(spec.derived.outputs(params, play) as Record<string, OutputDecl<unknown>>)) {
      // at mount a shadow is the spec error it always was; re-derived after a write (`onShadow: 'skip'`) the declaration wins, as
      // the runtime's `registerOutputIfNeeded` is a no-op on a port the node has
      if (name in spec.outputs) {
        if (onShadow === 'throw') throw new SpecError(`${spec.type}: derived output "${name}" shadows a declared output`);
        continue;
      }
      if (decl.onWire && !wired.has(name)) continue;
      out[name] = decl;
    }
  }
  for (const name of wired) {
    if (name in spec.outputs || name in out) continue;
    const decl = spec.derived?.discoverOutput?.(name);
    if (!decl) throw new SpecError(`${spec.type}: wired output "${name}" is not an output`);
    out[name] = decl as OutputDecl<unknown>;
  }
  return out;
}

export function drawnPorts(spec: AnyNodeSpec, params: Readonly<Record<string, unknown>> = {}, context: Readonly<PortContext> = EMPTY): DrawnPort[] {
  const list = portsOf(spec, params, context);
  const out: DrawnPort[] = [];
  for (const [name, decl] of Object.entries(list.inputs)) out.push(drawn(name, 'input', decl, name in spec.inputs));
  const outcomes = outcomePorts(spec);
  for (const [name, decl] of Object.entries(list.outputs)) out.push(drawn(name, 'output', decl, name in spec.outputs || name in outcomes));
  return out;
}

/**
 * P107 s101 (R37) — one port the runtime registers on a WIRE (`derived.discover` / `discoverOutput`, nodescope.ts :149-150) as
 * plain data: what an editor draws for a wired name the params do not draw, so the wire keeps its port.
 */
export function drawnWiredPort(name: string, plug: 'input' | 'output', decl: InputDecl | OutputDecl<unknown>): DrawnPort {
  return drawn(name, plug, decl, false);
}

function drawn(name: string, plug: 'input' | 'output', decl: InputDecl | OutputDecl<unknown>, declared: boolean): DrawnPort {
  const port: DrawnPort = { name, plug, type: decl.type, source: declared ? 'declared' : 'derived' };
  if (decl.displayName !== undefined) port.displayName = decl.displayName;
  if (decl.group !== undefined) port.group = decl.group;
  if (decl.description !== undefined) port.description = decl.description;
  if (plug === 'input' && decl.type === 'signal' && (decl as SignalInputDecl).connectionsOnly) port.connectionsOnly = true;
  if (plug === 'input' && decl.type !== 'signal') {
    const v = decl as ValueInputDecl;
    // s82 (§6.4 gap 4): the default the editor's announcement shows, when it is not the value at mount
    const d = v.drawnDefault !== undefined ? v.drawnDefault : v.default;
    if (d !== undefined) port.default = d;
    if (v.enums !== undefined) port.enums = v.enums;
    if (v.editOnly) port.editOnly = true;
    if (v.connectionsOnly) port.connectionsOnly = true;
    if (v.labels !== undefined) port.labels = v.labels;
    if (v.codeEditor !== undefined) port.codeEditor = v.codeEditor;
    if (v.valuePortPrefix !== undefined) port.valuePortPrefix = v.valuePortPrefix;
    if (v.filterBackend) port.filterBackend = true;
  }
  return port;
}

/**
 * The context the needs gate hands a spec: `derived.needs` copied from `from`, every other field a
 * trap. The trap is a getter that throws, not a Proxy — a Proxy survives `{ ...context }` as a
 * plain copy of its own keys, and a spec that spread the context would read nothing and pass.
 * Also what a target with a partial context should pass: a spec that asks for more than the
 * target has is told so, where it asks.
 */
export function needsContext(spec: AnyNodeSpec, from: Readonly<PortContext> = EMPTY): Readonly<PortContext> {
  const needs = new Set<string>(spec.derived?.needs ?? []);
  const ctx: Record<string, unknown> = {};
  for (const field of PORT_CONTEXT_FIELDS) {
    if (needs.has(field)) {
      ctx[field] = from[field];
    } else {
      Object.defineProperty(ctx, field, {
        enumerable: false,
        get() {
          throw new SpecError(`${spec.type}: derived ports read context.${field}, which derived.needs does not declare`);
        }
      });
    }
  }
  return Object.freeze(ctx) as Readonly<PortContext>;
}

/** The ledger's AC4 class for a spec's ports (NSP-020 §3.1 decision 2). */
export type PortsDerivability = 'params-only' | 'with-project' | 'with-schema' | 'none';

export function portsDerivability(spec: AnyNodeSpec): PortsDerivability {
  if (!spec.derived) return 'params-only';
  const needs = spec.derived.needs ?? [];
  if (needs.includes('schema')) return 'with-schema';
  if (needs.length) return 'with-project';
  return 'params-only';
}
