/**
 * P115 HST-013 (P115-HST013-UPLOADCODEGEN) — on a host that refuses `new Function`, a function upload whose code was
 * printed is accepted, and one with new code is refused in words.
 *
 * The bug: `unprintedCodeOnThisHost` (the check `PUT /admin/workflows/:name` runs before loading a function) called
 * `collectCode`, which compiles every text with `new Function` to see whether it CAN be printed. A Cloudflare Worker
 * refuses that, so every text came back "its code does not compile: Code generation from strings disallowed…" and
 * every upload was refused, printed or not. `nodegx-backend/tests/p115-hst013-code-nodes-printed.test.ts` has an
 * upload arm, but it runs in Node, where `new Function` works, so it could not see this.
 *
 * Here the printer and the seam are bundled (esbuild, as the Worker's bundle carries them) and run in a V8 context
 * made with `codeGeneration: { strings: false }`: the same refusal workerd makes, with the same message. The printed
 * module is evaluated in that context the way a Worker imports it (a script compiled by the host, not a string the
 * code compiles), and installed with `refuseOthers`, as the Worker's entry does.
 *
 * Sabotage (both run): put `printcode.ts` back as it was (compile check in, its refusals returned) → the last three
 * fail, every text refused as "does not compile: Code generation from strings disallowed". Only drop
 * `{ compile: false }` → the two refusal tests fail: the changed text is dropped as unprintable and nothing is said.
 */
import * as path from 'path';
import * as vm from 'vm';

import { buildSync } from 'esbuild';

import { collectCode, printCodeModule, type PrintableComponent } from '../src/printcode';

type Host = {
  unprintedCodeOnThisHost: (components: PrintableComponent[]) => string[];
  installPrintedCode: (rows: unknown, options?: { refuseOthers?: boolean }) => void;
};

/** A context where compiling a string throws, as on workerd, with the printer and the seam loaded into it. */
function workerdLikeHost(): { ctx: vm.Context; host: Host } {
  const out = buildSync({
    stdin: {
      contents:
        "export { unprintedCodeOnThisHost } from './printcode';\nexport { installPrintedCode } from './printedcode';\n",
      resolveDir: path.join(__dirname, '..', 'src'),
      sourcefile: 'host.ts',
      loader: 'ts'
    },
    bundle: true,
    format: 'iife',
    globalName: '__host',
    platform: 'neutral',
    mainFields: ['main', 'module'],
    write: false,
    logLevel: 'silent'
  });
  const ctx = vm.createContext({ console }, { codeGeneration: { strings: false, wasm: false } });
  vm.runInContext(out.outputFiles[0].text, ctx);
  return { ctx, host: (ctx as unknown as { __host: Host }).__host };
}

/** Request → Function (a * 2) → Expression → Response: one async text and one sync text. */
const app = (functionScript: string): PrintableComponent[] => [
  {
    name: '/#__cloud__/double',
    nodes: [
      { id: 'req', type: 'noodl.cloud.request', parameters: { params: 'a' } },
      { id: 'fn', type: 'JavaScriptFunction', parameters: { functionScript } },
      { id: 'ex', type: 'Expression', parameters: { expression: 'Number(a) + min(Number(b), 10)' } },
      { id: 'res', type: 'noodl.cloud.response', parameters: { params: 'total' } }
    ]
  }
];
const deployed = 'Outputs.total = Number(Inputs.a) * 2;\nOutputs.done();';

/** The deploy (in Node, where compiling is allowed) prints the table; the Worker imports it. */
function installDeployed(ctx: vm.Context, host: Host) {
  const { print, refusals } = collectCode(app(deployed));
  expect(refusals).toEqual([]);
  vm.runInContext(printCodeModule(print).replace('export default [', 'globalThis.__rows = ['), ctx);
  host.installPrintedCode((ctx as unknown as { __rows: unknown }).__rows, { refuseOthers: true });
}

describe('a function upload on a host that cannot compile strings (a Cloudflare Worker)', () => {
  test('the host really refuses to compile a string, with workerd\'s message', () => {
    const { ctx } = workerdLikeHost();
    expect(() => vm.runInContext("new Function('return 1')", ctx)).toThrow(/Code generation from strings disallowed/);
    expect(() => vm.runInContext("new (Object.getPrototypeOf(async function () {}).constructor)('return 1')", ctx)).toThrow(
      /Code generation from strings disallowed/
    );
  });

  test('a function whose code was printed is accepted', () => {
    const { ctx, host } = workerdLikeHost();
    installDeployed(ctx, host);
    expect(host.unprintedCodeOnThisHost(app(deployed))).toEqual([]);
  });

  test('a function with new code is refused, by node and function, with the sentence that says what to do', () => {
    const { ctx, host } = workerdLikeHost();
    installDeployed(ctx, host);
    const refused = host.unprintedCodeOnThisHost(app('Outputs.total = Number(Inputs.a) * 3;\nOutputs.done();'));
    expect(refused).toEqual([
      'The Function node "fn" in the cloud function "double" has code that was not part of this app\'s last deploy, and code cannot be compiled here. Deploy the whole app again to change its code.'
    ]);
  });

  test('a text that would not compile is refused the same way: it cannot have been printed', () => {
    const { ctx, host } = workerdLikeHost();
    installDeployed(ctx, host);
    const refused = host.unprintedCodeOnThisHost(app('Outputs.total = (;'));
    expect(refused).toHaveLength(1);
    expect(refused[0]).toMatch(/^The Function node "fn" in the cloud function "double" .*Deploy the whole app again/);
  });
});
