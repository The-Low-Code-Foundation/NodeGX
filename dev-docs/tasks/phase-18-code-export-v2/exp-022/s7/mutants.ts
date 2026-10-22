/**
 * EXP-022 S7 — the mutants for the stores. Each changes the PRINTED Swift (or the generated test), never the printer, so
 * a peer's suite reading the printer never sees a mutant. One `swift test` per mutant plays the 14 scenarios, and each
 * row says its status and whether its trace still equals the React export's (B2). Predictions written before any ran.
 *
 *   cd packages/nodegx-export && nice -n 19 npx ts-node --transpile-only \
 *     -O '{"module":"commonjs","esModuleInterop":true}' ../../dev-docs/tasks/phase-18-code-export-v2/exp-022/s7/mutants.ts
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
    name: 'M1 no fresh() between plays: one store, one history manager, one action registry for all 14',
    predicted: 'store scenarios after the first fail (t02 history starts with the last one\'s entries); B1 and B2 red',
    mutate: (f, t) => (/GraphTests\.swift$/.test(f) ? t.replace(/\n    Scripts\.shared\.fresh\(\)/g, '') : t)
  },
  {
    name: 'M2 Undo sends Redo',
    predicted: 't02:0, t02:1 and t02:3 fail',
    mutate: (f, t) => (probes(f) ? t.replace(/\.act\("undo"\)/g, '.act("redo")') : t)
  },
  {
    name: 'M3 a store write tells no view (JSStore never notifies)',
    predicted: "t01:0 and t03:0 fail: their Subscribe's push never sees the write",
    mutate: (f, t) => (/Scripts\.swift$/.test(f) ? t.replace('relay.fire = { [weak self] in self?.objectWillChange.send() }', 'relay.fire = {}') : t)
  },
  {
    name: "M4 State History's setup runs after the component's pushes",
    predicted: 'equivalent: a settle records the last value, and the setup draws again before the settle ends',
    mutate: (f, t) => {
      if (!probes(f)) return t;
      const m = /\n( +)(\.onChange\(of: (\w+)\.changes, initial: true\) \{ _, _ in \w+\.call\("setupTracking"\) \})/.exec(t);
      if (!m) return t;
      const without = t.replace(m[0], '');
      return without.replace(`.onDisappear { ${m[3]}.call("dispose") }`, `${m[2]}\n${m[1]}.onDisappear { ${m[3]}.call("dispose") }`);
    }
  },
  {
    name: 'M5 no listener is ever set',
    predicted: 'equivalent on this corpus: no played scenario wires a signal output of a store node to anything it observes',
    mutate: (f, t) => (probes(f) ? t.replace(/\n {4}let _ = \w+\.on\(\[\n[\s\S]*?\n {4}\]\)/g, '') : t)
  },
  {
    name: 'M6 Dispatch drops its Action',
    predicted: 't04:0 and t04:2 fail',
    mutate: (f, t) => (probes(f) ? t.replace(/\.act\("dispatch", [^)]+\)/g, '.act("dispatch")') : t)
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
