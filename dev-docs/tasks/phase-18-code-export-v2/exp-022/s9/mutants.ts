/**
 * EXP-022 S9 — the mutants for On App Error and the parsers' raise. Each changes the PRINTED Swift, never the printer, so a
 * peer's suite reading the printer never sees a mutant. One `swift test` per mutant plays the 18 scenarios, and each row
 * says its status and whether its trace still equals the React export's (B2). Predictions written before any ran.
 *
 *   cd packages/nodegx-export && nice -n 19 npx ts-node --transpile-only \
 *     -O '{"module":"commonjs","esModuleInterop":true}' ../../dev-docs/tasks/phase-18-code-export-v2/exp-022/s9/mutants.ts
 *
 * A heavy job: one `swift build` per mutant. Check the box first. S7's harness, its mutants replaced.
 */

const PKG = '../../../../../packages/nodegx-export';
/* eslint-disable @typescript-eslint/no-var-requires */
const spec = require(`${PKG}/../nodegx-node-spec/src`);
const { exportGraphTarget } = require(`${PKG}/tests/helpers/node-spec-target`);
const { playSwiftGraphs, swiftGraphTarget, swiftGraphVerdicts } = require(`${PKG}/tests/helpers/swift-graph-target`);

type Mutate = (file: string, text: string) => string;
const probes = (f: string) => /\/Views\/Probe\d+View\.swift$/.test(f);
const scripts = (f: string) => /\/Scripts\.swift$/.test(f);

const MUTANTS: Array<{ name: string; predicted: string; mutate: Mutate }> = [
  {
    name: 'M1 no parser raises (the raise effect removed)',
    predicted: 'all four t07 fail: no boundary value ever arrives; the other 14 pass',
    mutate: (f, t) => (probes(f) ? t.replace(/\n +\/\/ Parse \w+ raises a failed parse[^\n]*\n +\.onChange\([^\n]*AppErrors\.raiseParse\([^\n]*\n/g, '\n') : t)
  },
  {
    name: 'M2 a boundary ignores its Filter',
    predicted: 't07:1 (prefix filters) and t07:2 (filter set, then cleared) fail; t07:0 and t07:3 (no Filter) pass',
    mutate: (f, t) => (scripts(f) ? t.replace('if !prefix.isEmpty && !error.forProperty("code").toString().hasPrefix(prefix) { return }', '_ = prefix') : t)
  },
  {
    name: 'M3 a boundary runs its Error chain before its values describe the error',
    predicted: 'equivalent: the graph target reads values at each settle and no t07 scenario wires Error to anything it observes',
    mutate: (f, t) => (scripts(f) ? t.replace('    last = Scripts.shared.swift(error) as? [String: Any]\n    onError()', '    onError()\n    last = Scripts.shared.swift(error) as? [String: Any]') : t)
  }
];

async function main(): Promise<void> {
  const raw = spec.loadGraphScenarios();
  const scenarios = raw.map((sc: any) => (sc.divergence?.export !== undefined ? { ...sc, divergence: { ...sc.divergence, swift: sc.divergence.export } } : sc));
  const verdicts = swiftGraphVerdicts(scenarios);
  const react = await spec.runGraphScenarios(exportGraphTarget(), raw);
  const only = process.env.ONLY;
  for (const m of MUTANTS.filter((x) => !only || x.name.startsWith(only))) {
    let changed = 0;
    const run = playSwiftGraphs('node-spec-graphs-mutant', scenarios, verdicts, (f: string, t: string) => {
      const out = m.mutate(f, t);
      if (out !== t) changed++;
      return out;
    });
    const report = await spec.runGraphScenarios(swiftGraphTarget(verdicts, run), scenarios);
    const rows = report.results
      .filter((r: any) => r.status !== 'outside')
      .map((r: any) => {
        const same = JSON.stringify(react.results.find((x: any) => x.name === r.name)?.actual) === JSON.stringify(r.actual);
        const file = (scenarios.find((s: any) => s.name === r.name)?.file ?? '').replace(/^.*\//, '').replace(/\.json$/, '');
        return `    ${r.status.padEnd(8)} ${same ? 'same as React' : 'DIFFERS from React'}  ${file}: ${r.name.slice(0, 60)}`;
      });
    const errors = [...run.plays.values()].filter((p: any) => p.error).map((p: any) => p.error);
    console.log(`\n${m.name} (${changed} files changed; predicted: ${m.predicted})${errors.length ? ` — ${errors.length} plays threw: ${errors[0]}` : ''}\n${rows.join('\n')}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
