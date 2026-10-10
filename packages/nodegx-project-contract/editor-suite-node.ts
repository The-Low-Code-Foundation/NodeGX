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

import { formatReport, runSuite, type Edit, type EditorAdapter, type Files, type SuiteOptions } from './editor-suite';

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

export async function runCommand(argv: string[], options: SuiteOptions = {}): Promise<number> {
  const [adapterPath, projectDir, editsPath] = argv;
  if (!adapterPath || !projectDir || !editsPath) {
    process.stderr.write('usage: editor-suite <adapter.js> <project-dir> <edits.json>\n');
    return 2;
  }
  const adapter = await loadAdapter(adapterPath);
  const files = readProjectTree(projectDir);
  const edits = JSON.parse(fs.readFileSync(editsPath, 'utf8')) as Edit[];
  const report = await runSuite(adapter, { name: path.basename(path.resolve(projectDir)), files, edits }, options);
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
