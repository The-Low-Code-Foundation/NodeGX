/**
 * P102 CMP-006 corpus (4) — every NodeGX-format project on this machine, through the codecs.
 *
 *   npx ts-node -P scripts/tsconfig.json scripts/devtools/cmp006-project-census.ts [root…]
 *
 * Walks each root (default: the home directory) for `nodegx.project.json` (the NodeGX format) and
 * legacy `project.json` files that carry `metadata.designTokens`, skipping node_modules, .git and
 * git worktrees, and reads every **custom** token of the five composer types. Prints, per format,
 * per type: seen, visual, visual-kept-literal, text, rewrite — and every `text` value with the
 * number of projects it appears in, so AC4 (a value seen 3+ times is taught or explained) is a
 * list, not a guess. Reads only; writes nothing into any project.
 */
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import {
  COMPOSER_CATEGORIES,
  refusalReason,
  roundTripOutcome,
  type RoundTripOutcome
} from '../../packages/nodegx-project-contract/token-codecs';
import { DEFAULT_TOKENS } from '../../packages/nodegx-project-contract/tokens';

const roots = process.argv.slice(2).length ? process.argv.slice(2) : [os.homedir()];

function findProjects(root: string, file: string): string[] {
  try {
    const out = execFileSync(
      'find',
      [
        root,
        '-name',
        file,
        '-not',
        '-path',
        '*/node_modules/*',
        '-not',
        '-path',
        '*/.git/*',
        '-not',
        '-path',
        '*/worktrees/*'
      ],
      { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] }
    );
    return out.split('\n').filter(Boolean);
  } catch (e) {
    // `find` exits 1 when any directory under the root refuses it (a Library folder does), and
    // still prints every match it reached. The matches are on stdout either way.
    const stdout = (e as { stdout?: string | Buffer }).stdout;
    return stdout ? String(stdout).split('\n').filter(Boolean) : [];
  }
}

type Cell = Record<RoundTripOutcome | 'seen', number>;
type Table = Record<string, Cell>;

function blank(): Table {
  const t: Table = {};
  for (const c of COMPOSER_CATEGORIES) t[c] = { seen: 0, visual: 0, 'visual-kept-literal': 0, text: 0, rewrite: 0 };
  return t;
}

const categoryOf = new Map(DEFAULT_TOKENS.map((t) => [t.name, t.category] as const));

function readCustomTokens(file: string): { name: string; value: string; category?: string }[] {
  try {
    const json = JSON.parse(fs.readFileSync(file, 'utf8'));
    const list = json?.metadata?.designTokens?.customTokens;
    return Array.isArray(list)
      ? list.filter((t) => t && typeof t.name === 'string' && typeof t.value === 'string')
      : [];
  } catch {
    return [];
  }
}

for (const [format, file] of [
  ['NodeGX format (nodegx.project.json)', 'nodegx.project.json'],
  ['legacy format (project.json)', 'project.json']
] as const) {
  const projects = roots.flatMap((r) => findProjects(r, file));
  const table = blank();
  const textValues = new Map<string, { category: string; projects: Set<string>; reason: string | null }>();
  let withTokens = 0;
  for (const p of projects) {
    const tokens = readCustomTokens(p);
    const composer = tokens.filter((t) =>
      (COMPOSER_CATEGORIES as string[]).includes(t.category ?? categoryOf.get(t.name) ?? '')
    );
    if (composer.length > 0) withTokens++;
    for (const t of composer) {
      const category = t.category ?? categoryOf.get(t.name)!;
      const outcome = roundTripOutcome(category, t.value);
      table[category].seen++;
      table[category][outcome]++;
      if (outcome === 'text') {
        const key = `${category}\t${t.value}`;
        const entry = textValues.get(key) ?? {
          category,
          projects: new Set<string>(),
          reason: refusalReason(category, t.value)
        };
        entry.projects.add(path.dirname(p));
        textValues.set(key, entry);
      }
    }
  }

  console.log(
    `\n## ${format}: ${projects.length} projects found, ${withTokens} carry a custom token of a composer type`
  );
  console.log('| type | seen | visual | visual, kept literal | text | rewrite |');
  console.log('|---|---|---|---|---|---|');
  for (const [category, cell] of Object.entries(table)) {
    console.log(
      `| ${category} | ${cell.seen} | ${cell.visual} | ${cell['visual-kept-literal']} | ${cell.text} | ${cell.rewrite} |`
    );
  }
  const rewrite = Object.values(table).reduce((n, c) => n + c.rewrite, 0);
  console.log(`\nrewrite total: ${rewrite}${rewrite === 0 ? ' ✅' : ' 🔴'}`);
  if (textValues.size > 0) {
    console.log('\ntext values (value · projects · reason):');
    const sorted = [...textValues.entries()].sort((a, b) => b[1].projects.size - a[1].projects.size);
    for (const [key, entry] of sorted) {
      const [category, value] = key.split('\t');
      console.log(`- ${category} · \`${value}\` · ${entry.projects.size} · ${entry.reason ?? ''}`);
    }
  }
}
