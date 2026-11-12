/**
 * Rule: a Function carries a Run On Value Change setting under a name it does not have.
 *
 * Bug P127-BKO006-RUNONCHANGEGUESS. A Function's script inputs are ports named `in-<name>`, so the
 * box that governs one is `runOnChange-in-<name>` (`simplejavascript.ts` builds the boxes from its
 * `in-` inputs only, `run-on-value-change.ts` `runOnChangePortName`). Two of three stranger agents
 * wrote `runOnChange-title`, `-author`, `-rating`, `-status` on a Function whose inputs were those
 * four: the write was accepted with only the dynamic-port "not checked" note, nothing reads the
 * name, and the Function still ran on every keystroke. Both agents then gave up on the Function.
 *
 * Every `runOnChange-` parameter on a Function that is not `runOnChange-in-…` is dead, so the rule
 * has no benign case: measured over 2,718 Function nodes in `NodeGX test projects` and the shipped
 * templates, 2,805 boxes spelled `runOnChange-in-…` and 5 not, all five in agent-written apps.
 * A `runOnChange-in-<name>` for an input the script does not read is left alone: it becomes live
 * the moment the script reads `Inputs.<name>`.
 *
 * Warning, blocking for a graph an agent just wrote (`AUTHORED_BLOCKING_WARNINGS`): the agent gets
 * the right name back and writes it.
 *
 * @module noodl-editor/validation/rules/functionRunOnChangeUnknown
 */

import { scriptPortsForNode } from '../../models/nodelibrary/cloudDynamicPorts';
import { nearest } from '../CatalogIndex';
import { Diagnostic, DiagnosticCode } from '../diagnostics';
import { FUNCTION_NODE_TYPE } from '../functionScriptUses';
import { ComponentContext, Rule, RuleContext } from './types';

/** `run-on-value-change.ts` `RUN_ON_CHANGE_PREFIX`. */
const RUN_ON_CHANGE_PREFIX = 'runOnChange-';
/** A Function's script inputs are `in-<name>` (`cloudDynamicPorts.ts` `scriptPortsFromSource`). */
const FUNCTION_INPUT_PREFIX = 'in-';

export const functionRunOnChangeUnknown: Rule = {
  code: DiagnosticCode.FunctionRunOnChangeUnknown,
  description: "A Function has a Run On Value Change setting under a name it does not have (its boxes are runOnChange-in-<input>).",
  defaultEnabled: true,

  run(ctx: RuleContext): Diagnostic[] {
    const out: Diagnostic[] = [];

    for (const { component } of ctx.components as ComponentContext[]) {
      for (const node of component.nodes) {
        if (node.type !== FUNCTION_NODE_TYPE || !node.parameters) continue;
        const guessed = Object.keys(node.parameters).filter(
          (key) => key.startsWith(RUN_ON_CHANGE_PREFIX) && !key.startsWith(RUN_ON_CHANGE_PREFIX + FUNCTION_INPUT_PREFIX)
        );
        if (guessed.length === 0) continue;

        const inputs = scriptPortsForNode(node)
          .filter((p) => p.plug === 'input' && p.name.startsWith(FUNCTION_INPUT_PREFIX))
          .map((p) => p.name.slice(FUNCTION_INPUT_PREFIX.length));
        const name = node.label ? `"${node.label}"` : 'This Function';

        for (const key of guessed) {
          const wanted = key.slice(RUN_ON_CHANGE_PREFIX.length);
          const input = inputs.includes(wanted) ? wanted : nearest(wanted, inputs);
          const right = input !== undefined ? `${RUN_ON_CHANGE_PREFIX}${FUNCTION_INPUT_PREFIX}${input}` : undefined;
          out.push({
            code: DiagnosticCode.FunctionRunOnChangeUnknown,
            severity: 'warning',
            message:
              `${name} has no setting "${key}", so nothing reads it` +
              (input === wanted ? ` and a new "${wanted}" still runs it. ` : '. ') +
              `A Function's Run On Value Change box for an input is "runOnChange-in-<input>"` +
              (right
                ? input === wanted
                  ? `: write "${right}".`
                  : `; its script reads no "${wanted}" (the nearest input is "${input}": "${right}").`
                : `, and its script reads no inputs.`),
            location: {
              component: component.name,
              nodeId: node.id,
              nodeType: node.type,
              nodeLabel: node.label,
              port: key,
              plug: 'input'
            },
            ...(right ? { suggestion: `${right}: ${JSON.stringify(node.parameters[key])}` } : {})
          });
        }
      }
    }
    return out;
  }
};
