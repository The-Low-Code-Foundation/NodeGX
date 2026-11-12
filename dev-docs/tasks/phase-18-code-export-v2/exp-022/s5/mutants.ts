/**
 * EXP-022 S5 — the mutants for the Swift ledger line. Each changes the PRINTED Swift (not the printer, so a peer's suite
 * reading the printer never sees a mutant), builds and plays the five scenarios in one `swift test`, and reports what
 * the rows would read: each scenario's status, and whether its trace still equals the React export's (B2).
 *
 *   cd packages/nodegx-export && nice -n 19 npx ts-node --transpile-only \
 *     -O '{"module":"commonjs","esModuleInterop":true}' ../../dev-docs/tasks/phase-18-code-export-v2/exp-022/s5/mutants.ts
 *
 * A heavy job: one `swift build` per mutant. Check the box first.
 */

const PKG = '../../../../../packages/nodegx-export';
/* eslint-disable @typescript-eslint/no-var-requires */
const spec = require(`${PKG}/../nodegx-node-spec/src`);
const { exportGraphTarget } = require(`${PKG}/tests/helpers/node-spec-target`);
const { playSwiftGraphs, swiftGraphTarget, swiftGraphVerdicts } = require(`${PKG}/tests/helpers/swift-graph-target`);

type Mutate = (file: string, text: string) => string;
const probes = (f: string) => /\/Views\/Probe\d+View\.swift$/.test(f);

const MUTANTS: Array<{ name: string; predicted: string; mutate: Mutate }> = [
  {
    name: "M1 Value Changed's chain adds 2 to the Counter behind it",
    predicted: 'C2 failed; B2 red on C2 and C8',
    mutate: (f, t) => (probes(f) ? t.replace(/(valueChangedLast\.current = arrival\.value\n\s+count2 \+= )1/g, '$12') : t)
  },
  {
    name: "M2 Value Changed's same-value guard removed",
    predicted: 'equivalent: .onChange(of: Same(…)) already drops a repeat',
    mutate: (f, t) => (probes(f) ? t.replace(/\n\s+if JS\.same\(valueChangedLast\.current, arrival\.value\) \{ return \}/g, '') : t)
  },
  {
    name: 'M3 a lifted output is not pushed at mount (initial: false)',
    predicted: 'C2 and C10 failed; B2 red',
    mutate: (f, t) => (probes(f) ? t.replace(/\.onChange\(of: Same\(([^\n]*)\), initial: true\) \{ _, value in (on\w+Changed)\(value\.value\) \}/g, '.onChange(of: Same($1), initial: false) { _, value in $2(value.value) }') : t)
  }
];

async function main(): Promise<void> {
  const raw = spec.loadGraphScenarios();
  const scenarios = raw.map((sc: any) => (sc.divergence?.export !== undefined ? { ...sc, divergence: { ...sc.divergence, swift: sc.divergence.export } } : sc));
  const verdicts = swiftGraphVerdicts(scenarios);
  const react = await spec.runGraphScenarios(exportGraphTarget(), raw);
  for (const m of MUTANTS) {
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
        return `    ${r.status.padEnd(8)} ${same ? 'same as React' : 'DIFFERS from React'}  ${r.name.slice(0, 70)}`;
      });
    const errors = [...run.plays.values()].filter((p: any) => p.error).length;
    console.log(`\n${m.name} (${changed} files changed; predicted: ${m.predicted})${errors ? ` — ${errors} plays threw` : ''}\n${rows.join('\n')}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
