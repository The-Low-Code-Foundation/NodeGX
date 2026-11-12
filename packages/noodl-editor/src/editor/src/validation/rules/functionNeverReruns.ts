/**
 * Rule: nothing re-runs a node when its inputs change — its control signal is not wired and
 * every wired input has *Run On Value Change* unticked.
 *
 * Bug P121-TWO005-NEVERRUNS, the opposite case of `signalDrivenStaleInput`. A node in NDA-017's
 * run-on-value-change family runs when its control signal (`Run`) arrives, or when an input whose
 * box is ticked gets a new value. Untick the box on every input it is wired to and leave `Run`
 * unwired, and the values arrive and the script never sees them. A Function still runs once at
 * load (its script setter schedules a run when `Run` is not wired) and never again: whether a
 * wired value is there by then depends on timing (a repeated row's often is; a later answer is not),
 * so the message says only what is always true. Measured in the community template's Edit profile page: three wired inputs,
 * all three unticked by a helper's "quiet inputs" list, no `Run` wire — the uploaded photo was
 * stored and the circle never showed it, with no console line and a clean report from the door.
 *
 * Only WIRED inputs are graded: an input set as a parameter gets its value once at load, which
 * the load run covers. Absent means ticked (`run-on-value-change.ts` `runOnValueChange`), so only
 * an explicit `false` counts as unticked. A Function's governed inputs are its script inputs
 * (`in-<name>`, not in the catalog); any other family's are the inputs the catalog gives a
 * `runOnChange-<name>` twin. An input the rule cannot tell is governed is left out, so the
 * failure mode is a missed report, never a false one.
 *
 * Warning: the door reports it on the write (the bug was that it said nothing); not blocking.
 *
 * @module noodl-editor/validation/rules/functionNeverReruns
 */

import { Diagnostic, DiagnosticCode } from '../diagnostics';
import { FUNCTION_NODE_TYPE } from '../functionScriptUses';
import { NormConnection } from '../model';
import { ComponentContext, Rule, RuleContext } from './types';

/** `run-on-value-change.ts` `RUN_ON_CHANGE_PREFIX`. */
const RUN_ON_CHANGE_PREFIX = 'runOnChange-';

export const functionNeverReruns: Rule = {
  code: DiagnosticCode.FunctionNeverReruns,
  description: 'Nothing re-runs a node when its inputs change: its control signal is unwired and every wired input is set not to run on change.',
  defaultEnabled: true,

  run(ctx: RuleContext): Diagnostic[] {
    const out: Diagnostic[] = [];
    const { catalog } = ctx;

    for (const { component } of ctx.components as ComponentContext[]) {
      const incoming = new Map<string, NormConnection[]>();
      for (const c of component.connections) {
        const list = incoming.get(c.toId);
        if (list) list.push(c);
        else incoming.set(c.toId, [c]);
      }

      for (const node of component.nodes) {
        const isFunction = node.type === FUNCTION_NODE_TYPE;
        if (!isFunction && !catalog.isRunOnValueChangeFamily(node.type)) continue;
        const inbound = incoming.get(node.id) ?? [];
        if (inbound.length === 0) continue;

        // A control signal wired is a way to run it; nothing to report.
        if (inbound.some((c) => catalog.getPort(node.type, 'input', c.toProperty)?.isSignal)) continue;

        const governed = [
          ...new Set(
            inbound
              .map((c) => c.toProperty)
              .filter((port) =>
                isFunction ? port.startsWith('in-') : !!catalog.getPort(node.type, 'input', RUN_ON_CHANGE_PREFIX + port)
              )
          )
        ];
        if (governed.length === 0) continue;
        const params = node.parameters ?? {};
        if (!governed.every((port) => params[RUN_ON_CHANGE_PREFIX + port] === false)) continue;

        const name = node.label ? `"${node.label}"` : isFunction ? 'This Function' : 'This node';
        const shown = governed.map((p) => `"${isFunction ? p.slice('in-'.length) : p}"`).join(', ');
        out.push({
          code: DiagnosticCode.FunctionNeverReruns,
          severity: 'warning',
          message:
            `Nothing re-runs ${name} when its inputs change: Run is not wired, and every wired input (${shown}) ` +
            'has Run On Value Change unticked. ' +
            (isFunction ? 'It runs once when it loads, and a new value on any of them never runs it again. ' : '') +
            'Wire Run to what should start it, or tick Run On Value Change on the input whose new value should run it.',
          location: {
            component: component.name,
            nodeId: node.id,
            nodeType: node.type,
            nodeLabel: node.label,
            port: RUN_ON_CHANGE_PREFIX + governed[0],
            plug: 'input'
          },
          suggestion: `${RUN_ON_CHANGE_PREFIX}${governed[0]}: true`,
          alternatives: governed.map((p) => `${RUN_ON_CHANGE_PREFIX}${p}: true`)
        });
      }
    }
    return out;
  }
};
