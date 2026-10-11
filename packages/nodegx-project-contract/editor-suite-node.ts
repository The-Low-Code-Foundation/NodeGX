/**
 * P112 OWN-006 — the one command: `node editor-suite-node.ts <adapter.js> <project-dir> <edits.json>`.
 *
 * Reads a v2 project folder and an edit script, loads the adapter module (CommonJS or ESM; its
 * default export or `adapter` export is an `EditorAdapter`, or a function returning one), runs the
 * suite and prints PASS or the first ten sentences. Exit 0 on PASS, 1 otherwise, 2 for a usage
 * error. Node only; the in-memory suite is `@nodegx/project-contract/editor-suite`.
 */
import * as fs from 'fs';
import * as path from 'path';

// P112 OWN-003 — the graph half's grader needs the spec package's scenarios on disk and its runner. Imported from the
// sibling package's source, as every in-repo consumer of it does (the runtime test helper, the MCP), and NAMED in P116's
// import gate (`tests/project.test.ts`): the suite itself stays free of it. OWN-011's publish declares `@nodegx/node-spec`.
import { formatDifference, gradeGraphScenario, isGraphTarget, loadGraphScenarios, runGraphScenarios, type GraphPlay, type GraphScenario, type GraphTarget } from '../nodegx-node-spec/src';

import { formatReport, runSuite, type Edit, type EditorAdapter, type Files, type GraphGrader, type SuiteOptions } from './editor-suite';

/** Every file under a project folder as project-relative path → text (text files only; `.git` and `node_modules` skipped). */
export function readProjectTree(root: string): Files {
  const out: Files = {};
  const walk = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name === '.git' || e.name === 'node_modules') continue;
      const abs = path.join(dir, e.name);
      if (e.isDirectory()) walk(abs);
      else out[path.relative(root, abs).split(path.sep).join('/')] = fs.readFileSync(abs, 'utf8');
    }
  };
  walk(root);
  return out;
}

export async function loadAdapter(modulePath: string): Promise<EditorAdapter> {
  const abs = path.resolve(modulePath);
  const mod = (await import(abs)) as Record<string, unknown>;
  const candidate = (mod.adapter ?? mod.default ?? mod) as unknown;
  const adapter = typeof candidate === 'function' ? (candidate as () => EditorAdapter)() : (candidate as EditorAdapter);
  if (
    !adapter ||
    typeof adapter.open !== 'function' ||
    typeof adapter.apply !== 'function' ||
    typeof adapter.save !== 'function'
  ) {
    throw new Error(`${modulePath} does not export an adapter with open(), apply() and save().`);
  }
  return adapter;
}

/**
 * OWN-003 — the graph half's grader in a checkout: the spec package's graph scenarios (`scenarios/graph/`, every one)
 * on the adapter's runner, graded by the package's own runner (`runGraphScenarios`: equal to the runtime's recorded
 * trace and every claim holds; a declared divergence must occur; a known row or a scenario outside the runner's reach
 * conforms). A FRESH runner per scenario (`make()`), as the recordings were made (suite.ts `graphTarget`). One sentence
 * per scenario that does not conform, the runner's own words.
 */
export function graphGraderFromNodeSpec(scenariosDir?: string): GraphGrader {
  /** The scenario as its file holds it, `expect` stripped — what the second door's `play` is handed (the page revives it). */
  const raw = (sc: GraphScenario): unknown => {
    const all = JSON.parse(fs.readFileSync(sc.file!, 'utf8')) as Array<{ name: string; expect?: unknown }>;
    const entry = all.find((s) => s.name === sc.name);
    if (!entry) throw new Error(`${sc.file}: no scenario named ${JSON.stringify(sc.name)}`);
    const { expect: _expect, ...rest } = entry;
    return rest;
  };
  /** What `play` handed back, checked: `{ trace }` with an optional `error`, or `{ outside }`. */
  const asPlay = (out: unknown): GraphPlay => {
    const o = out as { trace?: unknown; error?: unknown; outside?: unknown } | null;
    if (o && typeof o.outside === 'string') return { outside: o.outside };
    if (o && Array.isArray(o.trace)) return o.error !== undefined ? { trace: o.trace, error: String(o.error) } : { trace: o.trace };
    throw new Error(`playGraph() handed back ${JSON.stringify(out)?.slice(0, 120)} — it hands back { trace, error? } or { outside }`);
  };
  return async (runner) => {
    const scenarios = loadGraphScenarios(scenariosDir);
    const results: Awaited<ReturnType<typeof runGraphScenarios>>['results'] = [];
    let name = 'the runner';
    for (const sc of scenarios) {
      if (runner.make) {
        const target = await runner.make();
        if (!target || typeof target !== 'object' || !isGraphTarget(target as GraphTarget)) {
          const sentence = 'graphTarget() returned something without mountGraph — a GraphTarget mounts a graph, sets, signals, settles and traces (@nodegx/node-spec `GraphTarget`)';
          return { summary: sentence, sentences: [sentence] };
        }
        const report = await runGraphScenarios(target as GraphTarget, [sc]);
        name = report.target;
        results.push(...report.results);
      } else if (runner.play) {
        name = "the editor's runner (playGraph)";
        const started = Date.now();
        const play = runner.play;
        const graded = await gradeGraphScenario(sc, name, async () => asPlay(await play(raw(sc), sc.file!)));
        results.push({ ...graded, timeMs: Date.now() - started });
      } else {
        const sentence = 'the adapter offers neither graphTarget() nor playGraph()';
        return { summary: sentence, sentences: [sentence] };
      }
    }
    const count = (status: string) => results.filter((r) => r.status === status).length;
    const bad = results.filter((r) => r.status === 'failed' || r.status === 'refused');
    return {
      summary: `graph scenarios on ${name}: ${count('passed')} passed, ${count('diverged')} diverged as declared, ${count('known')} known rows, ${count('outside')} outside, ${count('failed')} failed, ${count('refused')} refused of ${results.length}, each on a fresh runner`,
      sentences: bad.map((r) => {
        const why = [r.reason, r.claimFailures?.[0], r.difference ? formatDifference(r.difference, 'runtime', name).replace(/\s*\n\s*/g, ' ') : undefined].filter(Boolean).join(' — ');
        return `[${r.clauses.join(' ')}] ${r.name}: ${r.status}${why ? ' — ' + why : ''}`;
      })
    };
  };
}

export async function runCommand(argv: string[], options: SuiteOptions = {}): Promise<number> {
  const [adapterPath, projectDir, editsPath] = argv;
  if (!adapterPath || !projectDir || !editsPath) {
    process.stderr.write('usage: editor-suite <adapter.js> <project-dir> <edits.json>\n');
    return 2;
  }
  const adapter = await loadAdapter(adapterPath);
  const files = readProjectTree(projectDir);
  const edits = JSON.parse(fs.readFileSync(editsPath, 'utf8')) as Edit[];
  const report = await runSuite(adapter, { name: path.basename(path.resolve(projectDir)), files, edits }, { graph: graphGraderFromNodeSpec(), ...options });
  process.stdout.write(formatReport(report) + '\n');
  return report.pass ? 0 : 1;
}

if (require.main === module) {
  runCommand(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (err) => {
      process.stderr.write(`${(err as Error).message}\n`);
      process.exit(2);
    }
  );
}
