/**
 * P109 ISL-006 AC6 — the exporter's Function port grammar agrees with the runtime's.
 *
 * `jsfun.ts` says its mining regexes are "verbatim clones" of `javascriptnodeparser.js`'s
 * `parseAndAddPortsFromScript`, "so the two must not drift". Until this file nothing compared them; the
 * editor's two copies are pinned by `noodl-editor/tests-unit/fix-007` and `sb-017`. The runtime's function is
 * read from its source and evaluated alone (its module `require`s TypeScript files this package cannot load),
 * so this compares against the code the runtime runs, not a third transcription.
 *
 * The one difference is deliberate and asserted on its own: the exporter also reads `Outputs.x.send()` as a
 * signal, the documented second spelling, where the runtime's miner makes `x` a `*` value port.
 */
import * as fs from 'fs';
import * as path from 'path';

import { functionMinedPortsOf } from '../src/analyze/jsfun';

type RuntimePort = { name: string; plug: string; type: unknown };
type Parse = (script: string, ports: RuntimePort[], options: Record<string, unknown>) => void;

function runtimeParser(): Parse {
  const file = path.join(__dirname, '../../noodl-runtime/src/javascriptnodeparser.js');
  const src = fs.readFileSync(file, 'utf8');
  const start = src.indexOf('JavascriptNodeParser.parseAndAddPortsFromScript = function');
  const end = src.indexOf('JavascriptNodeParser.prototype.getPorts');
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  const holder: { parseAndAddPortsFromScript?: Parse } = {};
  new Function('JavascriptNodeParser', src.slice(start, end))(holder);
  return holder.parseAndAddPortsFromScript as Parse;
}

/** The runtime's ports for a script, in the exporter's three lists. */
function runtimeMined(parse: Parse, script: string) {
  const ports: RuntimePort[] = [];
  parse(script, ports, {});
  const names = (keep: (p: RuntimePort) => boolean) => ports.filter(keep).map((p) => p.name).sort();
  return {
    inputs: names((p) => p.plug === 'input' || p.plug === 'inputs'),
    outputs: names((p) => p.plug === 'output' && p.type !== 'signal'),
    signals: names((p) => p.plug === 'output' && p.type === 'signal')
  };
}

const sorted = (m: { inputs: string[]; outputs: string[]; signals: string[] }) => ({
  inputs: [...m.inputs].sort(),
  outputs: [...m.outputs].sort(),
  signals: [...m.signals].sort()
});

const CORPUS = [
  'const a = Inputs.amount;\nOutputs.formatted = a;\nOutputs.done();',
  "Outputs.total = Inputs['unit price'] * Inputs.qty;",
  'Outputs["Ready"]();\nOutputs.Failure();',
  'Outputs["payload"] = { ok: true };',
  '// Inputs.commented is mined too: the parser does not strip comments\nOutputs.x = 1;',
  'const snake_case = Inputs.first_name + Inputs.last_name;\nOutputs.full_name = snake_case;',
  // ISL-006 AC5's shapes: no `_` in the signal family, and a computed key mints nothing.
  'Outputs.do_it();',
  "const k = 'c';\nOutputs[k] = 1;\nconst v = Inputs[k];",
  '',
  'const nothing = 1;'
];

describe('ISL-006 AC6 — the exporter mines a Function the way the runtime does', () => {
  const parse = runtimeParser();

  it.each(CORPUS.map((s) => [JSON.stringify(s).slice(0, 60), s]))('%s', (_label, script) => {
    expect(sorted(functionMinedPortsOf(script))).toEqual(runtimeMined(parse, script));
  });

  it('not vacuous: the runtime types `do_it` as a value and a computed key mints nothing', () => {
    expect(runtimeMined(parse, 'Outputs.do_it();').outputs).toEqual(['do_it']);
    expect(runtimeMined(parse, "const k = 'c';\nOutputs[k] = 1;")).toEqual({ inputs: [], outputs: [], signals: [] });
  });

  it('the one deliberate difference: `Outputs.x.send()` is a signal to the exporter, a value to the runtime', () => {
    const script = 'Outputs.ready.send();';
    expect(functionMinedPortsOf(script).signals).toEqual(['ready']);
    expect(runtimeMined(parse, script)).toEqual({ inputs: [], outputs: ['ready'], signals: [] });
  });
});
