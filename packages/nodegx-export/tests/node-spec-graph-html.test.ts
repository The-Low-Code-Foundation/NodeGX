/**
 * P134 HTX-005 (AC4) — P107's graph scenarios (CONTRACT.md C1–C11) on the HTML export, graded as `node-spec-graph.test.ts`
 * grades the React export and `node-spec-graph-swift.test.ts` the Swift one: the same runner, the same projection, the
 * same three bounds, printed and never hidden.
 *
 * - **outside** is counted apart, by whose limit it is: the harness's (one harness: its limits are read off the React
 *   target's own `canPlay`), the plan's (the plan's own notes, which every printer reads, so the same scenarios in the
 *   same words), and the HTML printer's (a node, button, wire or push the plan keeps and this printer does not print).
 *   Outside is never conforming.
 * - **the reach** is the lifted outputs whose push the HTML printer printed; signals and outcomes are projected out.
 * - **C7, C8 and G1** are asserted as DIFFERENCES, as on React and Swift: the scenario's `divergence.export` is carried to
 *   this target, because the HTML export prints the same plan over the same `@nodegx/core`.
 *
 * And the row React's file has no counterpart for, Swift's B2: on every scenario both exports play, the HTML export's
 * trace equals React's, event for event. Then three mutants on the printed files (never the printer, so no peer's suite
 * reads one), each changing at least one file: two turn the line red, one is equivalent and says why.
 *
 * It runs in this process (helpers/html-graph-target.ts: jsdom, the printed files joined by esbuild), in a few seconds,
 * so every row is in the package suite.
 *
 *   npx jest tests/node-spec-graph-html.test.ts
 */

import { formatGraphReport, loadGraphScenarios, runGraphScenarios, type GraphReport, type GraphScenario } from '../../nodegx-node-spec/src';
import { exportGraphTarget } from './helpers/node-spec-target';
import { EXPORTER_VERDICT, HTML_PRINTER_VERDICT, htmlGraphTarget, htmlGraphVerdicts } from './helpers/html-graph-target';

/** The scenarios, each declared difference on the export carried to the HTML target: it prints the same plan. */
const scenarios: GraphScenario[] = loadGraphScenarios().map((sc) => (sc.divergence?.export !== undefined ? { ...sc, divergence: { ...sc.divergence, html: sc.divergence.export } } : sc));
const verdicts = htmlGraphVerdicts(scenarios);
const react = exportGraphTarget();
const reactOutside = new Map(scenarios.map((sc) => [sc.name, react.canPlay!(sc)]));
const fileOf = (name: string) => (scenarios.find((s) => s.name === name)!.file ?? '').replace(/^.*\//, '').replace(/\.json$/, '');

let report: GraphReport;
let reactReport: GraphReport;

beforeAll(async () => {
  report = await runGraphScenarios(htmlGraphTarget(verdicts), scenarios);
  // eslint-disable-next-line no-console
  console.log(formatGraphReport(report));
  reactReport = await runGraphScenarios(exportGraphTarget(), loadGraphScenarios());
}, 120_000);

describe('the verdicts: what the HTML export can play, and whose limit the rest is', () => {
  const outside = verdicts.filter((v) => v.outside !== undefined);
  const htmlPrinter = outside.filter((v) => HTML_PRINTER_VERDICT.test(v.outside!));
  const plan = outside.filter((v) => !HTML_PRINTER_VERDICT.test(v.outside!) && EXPORTER_VERDICT.test(v.outside!));
  const harness = outside.filter((v) => !EXPORTER_VERDICT.test(v.outside!) && !HTML_PRINTER_VERDICT.test(v.outside!));

  test('V1 the split, pinned: 5 playable; 22 outside on the plan, 13 on the HTML printer, 46 on the harness', () => {
    expect({ of: verdicts.length, playable: verdicts.length - outside.length, plan: plan.length, htmlPrinter: htmlPrinter.length, harness: harness.length }).toEqual({
      of: 86,
      playable: 5,
      plan: 22,
      htmlPrinter: 13,
      harness: 46
    });
  });

  test("V2 the plan's verdict is one verdict: the scenarios React leaves outside on the exporter's words are the HTML export's, in the same words", () => {
    const reactExporter = scenarios.filter((sc) => EXPORTER_VERDICT.test(reactOutside.get(sc.name) ?? '')).map((sc) => sc.name);
    expect(plan.map((v) => v.name)).toEqual(reactExporter);
    for (const v of plan) expect(v.outside).toBe(reactOutside.get(v.name)!.replace(/Components\/Probe: /g, ''));
    for (const v of harness) expect(v.outside).toBe(reactOutside.get(v.name));
  });

  test('V3 the HTML printer leaves out 13 React plays, by family: a Log step, the streaming stores, On App Error with the parsers', () => {
    const family = (why: string) =>
      /runs a log step/.test(why) ? 'log' : /stream-action step|streaming node|stream-out value/.test(why) ? 'streams' : /app-error-out|util-call/.test(why) ? 'app-error' : `other: ${why}`;
    expect(htmlPrinter.map((v) => `${fileOf(v.name)} ${family(v.outside!)}`)).toEqual([
      'c10-units-travel-as-objects log',
      't02-state-history streams',
      't02-state-history streams',
      't02-state-history streams',
      't02-state-history streams',
      't03-optimistic-update streams',
      't03-optimistic-update streams',
      't04-action-dispatcher streams',
      't04-action-dispatcher streams',
      't07-on-app-error app-error',
      't07-on-app-error app-error',
      't07-on-app-error app-error',
      't07-on-app-error app-error'
    ]);
    // every one of them React plays: the difference between the two lines is this printer's, scenario by scenario
    for (const v of htmlPrinter) expect(reactOutside.get(v.name)).toBeUndefined();
  });

  test('V4 the HTML export plays nothing React does not: the five clause and store scenarios', () => {
    const playable = verdicts.filter((v) => v.outside === undefined);
    for (const v of playable) expect(reactOutside.get(v.name)).toBeUndefined();
    expect(playable.map((v) => fileOf(v.name))).toEqual(['c02-every-send-is-delivered', 'c06-upstream-is-pulled-first', 'c07-lockstep', 'c08-the-first-update-consolidates', 't01-global-store']);
  });
});

describe('the play: every playable scenario in jsdom, step by step', () => {
  test("B1 the ledger line (HTML), pinned beside React's and Swift's: played, conforming and declared-different counted apart; outside never conforms", () => {
    const r = report;
    // a play that threw reads "differs as declared" on a declared difference (P18-EXP022-S5-THROWDIVERGES): none may throw
    expect(r.results.filter((x) => x.status !== 'outside' && /threw/.test(x.reason ?? '')).map((x) => `${x.name}: ${x.reason}`)).toEqual([]);
    const count = (s: string) => r.results.filter((x) => x.status === s).length;
    const outside = r.results.filter((x) => x.status === 'outside');
    const htmlPrinter = outside.filter((x) => HTML_PRINTER_VERDICT.test(x.reason ?? '')).length;
    const exporter = outside.filter((x) => EXPORTER_VERDICT.test(x.reason ?? '') || HTML_PRINTER_VERDICT.test(x.reason ?? '')).length;
    const line = {
      of: r.results.length,
      played: r.results.length - outside.length,
      conforming: count('passed'),
      declaredDifferent: count('diverged'),
      knownRows: count('known'),
      failing: count('failed'),
      outsideExporter: exporter,
      outsideHtmlPrinter: htmlPrinter,
      outsideHarness: outside.length - exporter
    };
    // eslint-disable-next-line no-console
    console.log(`P18 ledger (HTML): ${line.conforming} of ${line.of} graph scenarios conform on the HTML export — ${line.played} played (${line.conforming} conform, ${line.declaredDifferent} differ as declared, ${line.knownRows} known rows, ${line.failing} fail on filed rows); ${line.outsideExporter} outside on the exporter's verdict (${line.outsideExporter - line.outsideHtmlPrinter} the plan's, ${line.outsideHtmlPrinter} the HTML printer's), ${line.outsideHarness} on this harness's limits`);
    expect(r.results.filter((x) => x.status === 'refused')).toEqual([]);
    expect(line).toEqual({ of: 86, played: 5, conforming: 2, declaredDifferent: 3, knownRows: 0, failing: 0, outsideExporter: 35, outsideHtmlPrinter: 13, outsideHarness: 46 });
  });

  test("B2 the claim: on every scenario both exports play, the HTML export's trace equals the React export's, event for event", () => {
    const both = report.results.filter((s) => s.status !== 'outside' && reactReport.results.find((x) => x.name === s.name)?.status !== 'outside');
    expect(both.length).toBe(5);
    for (const s of both) {
      const r = reactReport.results.find((x) => x.name === s.name)!;
      expect({ name: s.name, status: s.status, trace: s.actual }).toEqual({ name: s.name, status: r.status, trace: r.actual });
    }
  });

  test("B3 the three declared differences differ on the HTML export as on React: the Counter behind the And stays at 1 (C7, G1); C8's two Increases are two deliveries", () => {
    const result = (file: string) => report.results.find((x) => fileOf(x.name) === file && x.status !== 'outside')!;
    for (const file of ['c06-upstream-is-pulled-first', 'c07-lockstep']) {
      const r = result(file);
      expect(r.status).toBe('diverged');
      expect(r.actual?.some((e) => e.t === 'value' && e.subject === 'c' && e.port === 'currentCount' && e.value === 3)).toBe(false);
    }
    const c8 = result('c08-the-first-update-consolidates');
    expect(c8.status).toBe('diverged');
    expect(c8.actual?.some((e) => e.t === 'value' && e.subject === 'c' && e.port === 'currentCount' && e.value === 3)).toBe(true);
  });
});

/**
 * The mutants, each on the printed `.js` (html-graph-target's `mutate`). A mutant that matches no printed text is not
 * equivalent, it is missing: each must change at least one file, or its row is red.
 */
describe('the mutants: the line turns red when the printed files are wrong', () => {
  type Mutate = (file: string, text: string) => string;
  const probe = (f: string) => f === 'components/Probe.js';
  const play = async (mutate: Mutate) => {
    let changed = 0;
    const target = htmlGraphTarget(verdicts, {
      mutate: (f, t) => {
        const out = mutate(f, t);
        if (out !== t) changed++;
        return out;
      }
    });
    const r = await runGraphScenarios(target, scenarios);
    const played = r.results.filter((x) => x.status !== 'outside');
    const rows = played.map((x) => {
      const same = JSON.stringify(reactReport.results.find((y) => y.name === x.name)?.actual) === JSON.stringify(x.actual);
      return `${fileOf(x.name)} ${x.status}${same ? '' : ' DIFFERS from React'}`;
    });
    return { changed, rows };
  };

  test("M1 Value Changed's chain adds 2 to the Counter behind it: C2 fails, and C8 differs from React", async () => {
    const m = await play((f, t) => (probe(f) ? t.replace(/(valueChangedLast = arrival;\n\s+state\.count2\.set\(state\.count2\.peek\(\) \+ )1\)/g, '$12)') : t));
    expect(m.changed).toBeGreaterThan(0);
    expect(m.rows).toEqual([
      'c02-every-send-is-delivered failed DIFFERS from React',
      'c06-upstream-is-pulled-first diverged',
      'c07-lockstep diverged',
      'c08-the-first-update-consolidates diverged DIFFERS from React',
      't01-global-store passed'
    ]);
  });

  test("M2 Value Changed's same-value guard taken out is EQUIVALENT: the watch it sits in already runs only when its value moved (lib/dom.js `watch`)", async () => {
    const m = await play((f, t) => (probe(f) ? t.replace(/\n\s+if \(valueChangedLast === arrival\) return;/g, '') : t));
    expect(m.changed).toBeGreaterThan(0);
    expect(m.rows).toEqual(['c02-every-send-is-delivered passed', 'c06-upstream-is-pulled-first diverged', 'c07-lockstep diverged', 'c08-the-first-update-consolidates diverged', 't01-global-store passed']);
  });

  // Predicted "every played trace differs"; measured three. C8 presses before its first settle, so the mount's value is
  // overwritten before the settle reads it; the Global Store key starts undefined, which the settle rule never records.
  test('M3 a lifted output is not sent at mount, only on a change: C2 fails, C6 and C7 differ from React; C8 and the store cannot see it', async () => {
    const m = await play((f, t) =>
      probe(f) ? `const __unsent = new Set();\n${t.replace(/\}, function \(value\) \{\n(\s+)if \(given\.(\w+)\) given\.\2\(value\);/g, "}, function (value) {\n$1if (!__unsent.has('$2')) { __unsent.add('$2'); return; }\n$1if (given.$2) given.$2(value);")}` : t
    );
    expect(m.changed).toBeGreaterThan(0);
    expect(m.rows).toEqual([
      'c02-every-send-is-delivered failed DIFFERS from React',
      'c06-upstream-is-pulled-first diverged DIFFERS from React',
      'c07-lockstep diverged DIFFERS from React',
      'c08-the-first-update-consolidates diverged',
      't01-global-store passed'
    ]);
  });
});
