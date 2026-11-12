/**
 * P115 HST-013 (P115-HST004-NOCODEGEN) — code printed at deploy, looked up before compiling a string.
 *
 * A Cloudflare Worker refuses `new Function` and `eval` (*Code generation from strings disallowed for this context*).
 * Every code node the cloud runtime carries compiles its author's text that way when it loads, so on a Worker a
 * Function node never ran (the call waited out the 30 s timeout) and an Expression answered a default.
 *
 * The way through: at deploy, every code node's text is printed as a real function into the Worker's bundle, and the
 * host hands that table in with {@link installPrintedCode} before any function loads. Every compile site in the runtime
 * goes through {@link compileCode}, which answers from the table when the exact text is in it, and otherwise compiles
 * the string as before. With no table installed (Node, the editor, the browser) nothing changes: the lookup misses
 * and the same constructor runs with the same arguments.
 *
 * ⚠️ **The conventions below are the contract between a node and the printer.** Each code node compiles
 * `compileCode(<its params>, <its body>)` built from the helpers here, and `printcode.ts` prints from the SAME helpers,
 * so a printed function and the string the node would have compiled cannot drift apart. A node that compiles text
 * without going through this file is a node whose code cannot run on a Worker.
 *
 * ⚠️ **One table per process, on `globalThis`.** The backend bundles the cloud runtime under an alias, and a second
 * copy of this module must see the table the host installed through the first.
 */

/** One printed function: the parameter names and the exact body text it was printed from. */
export type PrintedCode = {
  async: boolean;
  params: string[];
  body: string;
  fn: (...args: unknown[]) => unknown;
};

/** The shape a printed module's default export has: `[async, params, body, fn]` per function. */
export type PrintedCodeRow = [boolean, string[], string, (...args: unknown[]) => unknown];

type Table = Map<string, PrintedCode[]> & { refuseOthers?: boolean };

/** The message a host that refuses unprinted code gives instead of the Worker's own. */
export const NOT_PRINTED_MESSAGE =
  'This code was not printed when the app was deployed, and code cannot be compiled here. Deploy the app again.';

const TABLE = Symbol.for('nodegx.printedCode');

function table(): Table | undefined {
  return (globalThis as unknown as Record<symbol, Table | undefined>)[TABLE];
}

/**
 * Hand the runtime the functions printed at deploy. `null` removes the table (tests). Rows with the same body and
 * parameters are kept once. `refuseOthers`: a text that is not in the table throws {@link NOT_PRINTED_MESSAGE}
 * instead of reaching the constructor (a Worker's host passes it, so the reason a node gives is one a person can act
 * on, and a test can tell a miss from a fallback).
 */
export function installPrintedCode(rows: PrintedCodeRow[] | null, options?: { refuseOthers?: boolean }): void {
  const g = globalThis as unknown as Record<symbol, Table | undefined>;
  if (!rows) {
    delete g[TABLE];
    return;
  }
  const t: Table = new Map();
  rows.forEach(([async, params, body, fn]) => {
    const list = t.get(body) || [];
    if (!list.some((e) => e.async === async && sameParams(e.params, params))) list.push({ async, params, body, fn });
    t.set(body, list);
  });
  t.refuseOthers = !!(options && options.refuseOthers);
  g[TABLE] = t;
}

/** True when a host installed a table: the runtime is somewhere code cannot be generated from strings. */
export function hasPrintedCode(): boolean {
  return table() !== undefined;
}

function sameParams(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((p, i) => p === b[i]);
}

/** The printed function for this exact body and parameter list, if the deploy printed one. */
export function findPrintedCode(params: string[], body: string, async: boolean): PrintedCode | undefined {
  const list = table()?.get(body);
  return list && list.find((e) => e.async === async && sameParams(e.params, params));
}

/**
 * The printed function for this body whatever its parameters. Only the Expression node asks this way: its parameter
 * list is the names in its scope at compile time, which depends on the order its ports were registered in, so the
 * printer prints the names the expression reads and the node binds by the names the printed function declares.
 */
export function findPrintedBody(body: string, async: boolean): PrintedCode | undefined {
  const list = table()?.get(body);
  return list && list.find((e) => e.async === async);
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor as FunctionConstructor;

/**
 * Compile `body` with `params`, as `new Function(...params, body)` (or `new AsyncFunction`) does, unless the deploy
 * printed exactly this text: then the printed function. Throws what the constructor throws (a syntax error in Node;
 * on a Worker without the text printed, *Code generation from strings disallowed*), so every caller's existing
 * compile-error path still reports it.
 */
export function compileCode<F extends (...args: unknown[]) => unknown>(
  params: string[],
  body: string,
  options?: { async?: boolean }
): F {
  const async = !!(options && options.async);
  const printed = findPrintedCode(params, body, async);
  if (printed) return printed.fn as F;
  if (table()?.refuseOthers) throw new Error(NOT_PRINTED_MESSAGE);
  const Ctor = async ? AsyncFunction : Function;
  return new Ctor(...params, body) as unknown as F;
}

// ─── The conventions: what each code node compiles ────────────────────────────────────────────────────────────────

/** Function (`JavaScriptFunction`): `functionScript`, compiled as an async function. */
export const FUNCTION_NODE_PARAMS = ['Inputs', 'Outputs', 'Noodl', 'Component', 'Scripts'];
export function functionNodeBody(script: string): string {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const JavascriptNodeParser = require('./javascriptnodeparser');
  return JavascriptNodeParser.getCodePrefix() + script;
}

/** Expression: the Math shortcuts and the Noodl context in front of `return (<expression>);`. */
export const EXPRESSION_PREAMBLE = [
  'var min = Math.min,' +
    '    max = Math.max,' +
    '    cos = Math.cos,' +
    '    sin = Math.sin,' +
    '    tan = Math.tan,' +
    '    sqrt = Math.sqrt,' +
    '    pi = Math.PI,' +
    '    round = Math.round,' +
    '    floor = Math.floor,' +
    '    ceil = Math.ceil,' +
    '    abs = Math.abs,' +
    '    random = Math.random,' +
    '    pow = Math.pow,' +
    '    log = Math.log,' +
    '    exp = Math.exp;' +
    // Add Noodl global context
    'try {' +
    '  var NoodlContext = (typeof Noodl !== "undefined") ? Noodl : (typeof global !== "undefined" && global.Noodl) || {};' +
    '  var Variables = NoodlContext.Variables || {};' +
    '  var Objects = NoodlContext.Objects || {};' +
    '  var Arrays = NoodlContext.Arrays || {};' +
    '} catch (e) {' +
    '  var Variables = {}, Objects = {}, Arrays = {};' +
    '}'
].join('');
export function expressionNodeBody(expression: string): string {
  return EXPRESSION_PREAMBLE + 'return (' + expression + ');';
}

/** REST (`REST2`): the two scripts. */
export const REST_REQUEST_PARAMS = ['Inputs', 'Outputs', 'Request'];
export const REST_RESPONSE_PARAMS = ['Inputs', 'Outputs', 'Response'];

/** Map Collection: `mapScript`. */
export const MAP_COLLECTION_PARAMS = ['map', 'object'];

/**
 * Logic Builder: `generatedCode`. ⚠️ **Order is the contract**: positional, matched by the argument list in
 * `logic-builder.ts` `_executeLogic`. The note on each name is there, beside the call that passes it.
 */
export const LOGIC_BUILDER_PARAMS = [
  'Inputs',
  'Outputs',
  'Noodl',
  'Variables',
  'Objects',
  'Arrays',
  'sendSignalOnOutput',
  '__triggerSignal__',
  '__p',
  '__s',
  'console'
];
