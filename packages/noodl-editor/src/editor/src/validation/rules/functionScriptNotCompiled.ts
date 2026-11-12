/**
 * Rule: a Function's script does not compile.
 *
 * Bug P121-TWO003-SCRIPTCOMPILE. An agent wrote a Function whose script held `/^https?:\/\//`
 * inside a TypeScript template literal, which reached the script as `/^https?:///`: the rest of
 * the line became a comment and the next `if` a syntax error. The door accepted the write with
 * exactly the diagnostics the compiling version raised; the first person to run the function got
 * "That could not be done.", and the reason was only in the runtime's console
 * (`function/script-not-compiled`).
 *
 * The verdict is the runtime's own compile — the same `AsyncFunction` parameters and code prefix
 * `simplejavascript.ts` `parseScript` uses — so a script is refused here exactly when it would
 * fail there. Node's `vm` is asked only for the line, which the `Function` constructor does not
 * give; where there is no `vm`, the message has no line and the verdict stands.
 *
 * Warning severity with an `AUTHORED_BLOCKING_WARNINGS` entry, the file's convention: advisory
 * over hand-authored corpora, refused for a graph an agent just wrote (a script that cannot
 * compile has no benign reading).
 *
 * @module noodl-editor/validation/rules/functionScriptNotCompiled
 */

import { Diagnostic, DiagnosticCode } from '../diagnostics';
import { FUNCTION_NODE_TYPE } from '../functionScriptUses';
import { ComponentContext, Rule, RuleContext } from './types';

/** `JavascriptNodeParser.getCodePrefix()`, which the runtime puts before every Function script. */
const CODE_PREFIX = "const Script = (typeof Node !== 'undefined')?Node:undefined;\n";
const PARAMS = ['Inputs', 'Outputs', 'Noodl', 'Component', 'Scripts'];

/** The compile error the runtime would meet, with the line when it can be found; undefined when it compiles. */
export function functionScriptCompileError(script: string): { message: string; line?: number } | undefined {
  try {
    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
    new AsyncFunction(...PARAMS, CODE_PREFIX + script);
    return undefined;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const line = syntaxErrorLine(script);
    return line === undefined ? { message } : { message, line };
  }
}

function syntaxErrorLine(script: string): number | undefined {
  const file = 'nodegx-function-script';
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const vm = typeof require === 'function' ? require('vm') : undefined;
    if (!vm?.Script) return undefined;
    new vm.Script(`(async function (${PARAMS.join(', ')}) {\n${script}\n})`, { filename: file });
  } catch (e) {
    // Read by shape, not `instanceof Error`: `vm`'s error can come from another realm (jest's).
    const stack = e && typeof e === 'object' ? (e as { stack?: unknown }).stack : undefined;
    const match = typeof stack === 'string' ? new RegExp(`${file}:(\\d+)`).exec(stack) : null;
    if (match) return Math.max(1, Number(match[1]) - 1);
  }
  return undefined;
}

export const functionScriptNotCompiled: Rule = {
  code: DiagnosticCode.FunctionScriptNotCompiled,
  description: "A Function's script does not compile, so the Function can never run.",
  defaultEnabled: true,

  run(ctx: RuleContext): Diagnostic[] {
    const out: Diagnostic[] = [];
    for (const { component } of ctx.components as ComponentContext[]) {
      for (const node of component.nodes) {
        if (node.type !== FUNCTION_NODE_TYPE) continue;
        const script = node.parameters?.functionScript;
        if (typeof script !== 'string' || script.trim() === '') continue;
        const error = functionScriptCompileError(script);
        if (!error) continue;
        const name = node.label ? `"${node.label}"` : 'This Function';
        out.push({
          code: DiagnosticCode.FunctionScriptNotCompiled,
          severity: 'warning',
          message:
            `${name}'s script does not compile${error.line !== undefined ? ` (line ${error.line})` : ''}: ${error.message}. ` +
            'It can never run: every Run fails with function/script-not-compiled. Fix the script; a regular ' +
            "expression or URL written inside a template literal loses its backslashes, so `\\/\\/` arrives as `//`, which starts a comment.",
          location: {
            component: component.name,
            nodeId: node.id,
            nodeType: node.type,
            nodeLabel: node.label,
            port: 'functionScript'
          }
        });
      }
    }
    return out;
  }
};
