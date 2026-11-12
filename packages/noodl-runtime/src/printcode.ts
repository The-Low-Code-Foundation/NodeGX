/**
 * P115 HST-013 (P115-HST004-NOCODEGEN) — the deploy half: every code node's text in a set of cloud functions, printed
 * as real functions into one module a Worker's bundle carries. The runtime half is `printedcode.ts`.
 *
 * Reads cloud function components as they sit in a workflow file (`{ name, nodes: [{ id, type, parameters,
 * children }] }`), and for each code node the runtime carries in a cloud function builds the exact parameters and
 * body that node compiles, from the same helpers the node calls. A node whose text cannot be printed is a REFUSAL,
 * named by function and node, for the deploy to refuse on: it is never left to fail at a visitor's call.
 *
 * ⚠️ **Strict mode.** `new Function` compiles a sloppy-mode body; a printed function sits in an ES module, which is
 * strict. A text that compiles only outside strict mode (`with`, a legacy octal, `delete x`) is refused here, by
 * name. What strict mode changes at RUN time (an assignment to an undeclared name throws instead of making a global;
 * `this` is not the global object) cannot be seen in the text and is not refused: it is HST-013 §5's known difference.
 */
import { expressionPorts } from './nodes/std-library/expression-ports';
import {
  findPrintedCode,
  hasPrintedCode,
  FUNCTION_NODE_PARAMS,
  LOGIC_BUILDER_PARAMS,
  MAP_COLLECTION_PARAMS,
  REST_REQUEST_PARAMS,
  REST_RESPONSE_PARAMS,
  expressionNodeBody,
  functionNodeBody
} from './printedcode';

/** A node as a cloud function component holds it. */
export type PrintableNode = {
  id: string;
  type: string;
  parameters?: Record<string, unknown>;
  children?: PrintableNode[];
};
export type PrintableComponent = { name: string; nodes?: PrintableNode[] };

/** Where a printed text came from: the function (component name without `/#__cloud__/`) and the node. */
export type CodeSite = { fn: string; nodeId: string; type: string; port: string };
export type CodeToPrint = { async: boolean; params: string[]; body: string; sites: CodeSite[] };
export type CodeRefusal = CodeSite & { reason: string };

/** The node types that compile their author's text in a cloud function, and the ports that text sits on. */
export const CODE_NODE_TYPES = ['JavaScriptFunction', 'Expression', 'Logic Builder', 'REST2', 'Map Collection'];

/** The display names a person knows these nodes by, for a refusal they read. */
const DISPLAY: Record<string, string> = {
  JavaScriptFunction: 'Function',
  Expression: 'Expression',
  'Logic Builder': 'Logic Builder',
  REST2: 'REST',
  'Map Collection': 'Map Collection'
};

/** A port's default, read off the node's own definition. Each `require` is literal, so a bundler carries the module. */
function inputDefault(which: 'rest' | 'map', port: string): string | undefined {
  /* eslint-disable @typescript-eslint/no-var-requires */
  const mod = which === 'rest' ? require('./nodes/std-library/data/restnode') : require('./nodes/std-library/data/mapcollectionnode');
  /* eslint-enable @typescript-eslint/no-var-requires */
  const value = mod && mod.node && mod.node.inputs && mod.node.inputs[port] && mod.node.inputs[port].default;
  return typeof value === 'string' ? value : undefined;
}

/** The texts one node compiles when it loads: `[port, async, params, body]`. Empty for a node that is not code. */
export function codeOfNode(node: PrintableNode): Array<{ port: string; async: boolean; params: string[]; body: string }> {
  const p = node.parameters || {};
  const str = (v: unknown) => (typeof v === 'string' ? v : undefined);
  switch (node.type) {
    case 'JavaScriptFunction': {
      const script = str(p.functionScript);
      return script === undefined ? [] : [{ port: 'functionScript', async: true, params: FUNCTION_NODE_PARAMS, body: functionNodeBody(script) }];
    }
    case 'Expression': {
      const expression = str(p.expression);
      // An empty Expression compiles nothing: `_calculateExpression` answers before it gets there.
      if (expression === undefined || expression.trim() === '') return [];
      // The node binds a printed expression by the names it declares (`expression.ts` `_compileFunction`).
      return [{ port: 'expression', async: false, params: [...expressionPorts(expression), 'Noodl'], body: expressionNodeBody(expression) }];
    }
    case 'Logic Builder': {
      const code = str(p.generatedCode);
      return code ? [{ port: 'generatedCode', async: false, params: LOGIC_BUILDER_PARAMS, body: code }] : [];
    }
    case 'REST2': {
      // Both scripts compile at load, the default when the author left one alone.
      const request = str(p.requestScript) ?? inputDefault('rest', 'requestScript');
      const response = str(p.responseScript) ?? inputDefault('rest', 'responseScript');
      return [
        ...(request === undefined ? [] : [{ port: 'requestScript', async: false, params: REST_REQUEST_PARAMS, body: request }]),
        ...(response === undefined ? [] : [{ port: 'responseScript', async: false, params: REST_RESPONSE_PARAMS, body: response }])
      ];
    }
    case 'Map Collection': {
      const code = str(p.mapScript) ?? inputDefault('map', 'mapScript');
      return code === undefined ? [] : [{ port: 'mapScript', async: false, params: MAP_COLLECTION_PARAMS, body: code }];
    }
    default:
      return [];
  }
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor as FunctionConstructor;

/**
 * Why this text cannot be printed, or `undefined` when it can. A body that compiles on its own as a function body
 * (what `new Function` checks) is safe to put between `{` and `}`: it cannot close the function early or leave a
 * comment or string open.
 */
export function whyNotPrintable(params: string[], body: string, async: boolean): string | undefined {
  const Ctor = async ? AsyncFunction : Function;
  try {
    new Ctor(...params, body);
  } catch (e) {
    return 'its code does not compile: ' + (e && (e as Error).message ? (e as Error).message : String(e));
  }
  try {
    new Ctor(...params, '"use strict";\n' + body);
  } catch (e) {
    return (
      'its code uses JavaScript that works only outside strict mode, and code on Cloudflare runs in strict mode: ' +
      (e && (e as Error).message ? (e as Error).message : String(e))
    );
  }
  return undefined;
}

const fnName = (componentName: string) => componentName.replace(/^\/?#__cloud__\//, '');

/**
 * Every code node's text in these cloud functions: what to print (one entry per distinct text) and what cannot be.
 * Components that are not cloud functions are read too, so a deploy can hand in a project's whole component list.
 */
export function collectCode(components: PrintableComponent[]): { print: CodeToPrint[]; refusals: CodeRefusal[] } {
  const byKey = new Map<string, CodeToPrint>();
  const refusals: CodeRefusal[] = [];
  const visit = (component: PrintableComponent, node: PrintableNode) => {
    for (const code of codeOfNode(node)) {
      const site: CodeSite = { fn: fnName(component.name), nodeId: node.id, type: node.type, port: code.port };
      const why = whyNotPrintable(code.params, code.body, code.async);
      if (why) {
        refusals.push({ ...site, reason: why });
        continue;
      }
      const key = JSON.stringify([code.async, code.params, code.body]);
      const entry = byKey.get(key);
      if (entry) entry.sites.push(site);
      else byKey.set(key, { async: code.async, params: code.params, body: code.body, sites: [site] });
    }
    (node.children || []).forEach((c) => visit(component, c));
  };
  components.forEach((c) => (c.nodes || []).forEach((n) => visit(c, n)));
  return { print: Array.from(byKey.values()), refusals };
}

/** One refusal as a sentence a person reads: which function, which node, and why. */
export function refusalSentence(r: CodeRefusal): string {
  return `The ${DISPLAY[r.type] || r.type} node "${r.nodeId}" in the cloud function "${r.fn}" cannot run on Cloudflare: ${r.reason}`;
}

/**
 * The module a Worker's bundle carries: `export default [[async, params, body, fn], …]`, handed to
 * `installPrintedCode`. Ship it as its OWN module (not bundled into the Worker): bundled, a printed function would
 * see the bundle's top-level names, which `new Function` code never sees.
 */
export function printCodeModule(print: CodeToPrint[]): string {
  const lines = [
    '// Printed by NodeGX at deploy (P115 HST-013): every code node in this app\'s cloud functions, as a function.',
    '// Do not edit: the runtime matches each body below to the text its node compiles, character for character.',
    'export default ['
  ];
  for (const e of print) {
    const where = e.sites.map((s) => `${s.fn} / ${s.nodeId} (${DISPLAY[s.type] || s.type} ${s.port})`).join(', ');
    lines.push(`  // ${where.replace(/\*\//g, '* /').replace(/[\r\n\u2028\u2029]/g, ' ')}`);
    lines.push(
      `  [${e.async}, ${JSON.stringify(e.params)}, ${JSON.stringify(e.body)}, ${e.async ? 'async ' : ''}function (${e.params.join(', ')}) {\n${e.body}\n}],`
    );
  }
  lines.push('];', '');
  return lines.join('\n');
}

/**
 * On a host whose code was printed at deploy (a table is installed): a sentence per code text in these functions the
 * table does not hold, for a function UPLOAD to refuse before it is loaded. Empty where code can be compiled (no
 * table), and empty when every text was printed. A new or changed code node on a Worker means a new deploy of the
 * whole app: refused at the upload, never left to fail at a visitor's call.
 */
export function unprintedCodeOnThisHost(components: PrintableComponent[]): string[] {
  if (!hasPrintedCode()) return [];
  const { print, refusals } = collectCode(components);
  const missing = print
    .filter((e) => !findPrintedCode(e.params, e.body, e.async))
    .flatMap((e) =>
      e.sites.map(
        (s) =>
          `The ${DISPLAY[s.type] || s.type} node "${s.nodeId}" in the cloud function "${s.fn}" has code that was not part of this app's last deploy, and code cannot be compiled here. Deploy the whole app again to change its code.`
      )
    );
  return [...refusals.map(refusalSentence), ...missing];
}
