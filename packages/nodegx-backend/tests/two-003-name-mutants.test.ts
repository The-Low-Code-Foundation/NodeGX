/**
 * P121 s19 — the rename's mutants: each loosens one rule of `nameMarketplace` (its script, or its policy rule, in a
 * copy of the template), and `two-003-sellers.test.ts` must go red against it.
 *
 * Slow (one backend spec per mutant), so it runs only when asked:
 *
 *     TWO003_MUTANTS=1 npx jest tests/two-003-name-mutants.test.ts
 *
 * A mutant whose text isn't in the script (or the policy) fails here, so a rename can't turn one into a silent green.
 */
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const TEMPLATE = path.join(__dirname, '../../../templates/marketplace');
const RUN = process.env.TWO003_MUTANTS === '1';

jest.setTimeout(1800000);

/** [what it loosens, the function's script or `policy`, text in it, what replaces it] */
export const NAME_MUTANTS: Array<[string, string, string, string]> = [
  ['an empty name kept', 'nameMarketplace', "if (!name) { refuse('The marketplace", "if (false) { refuse('The marketplace"],
  ['a long name cut to fit', 'nameMarketplace', 'if (name.length > 60)', 'name = name.slice(0, 60); if (false)'],
  ['the name kept untrimmed', 'nameMarketplace', "a.name.trim() : ''", "a.name : ''"],
  ['no history written', 'nameMarketplace', "await history('Marketplace', 'marketplace', row.objectId, Inputs.userId, changed);", ''],
  ['history for no change', 'nameMarketplace', 'if (Object.keys(changed).length) {', 'if (true) {'],
  ['the history says nobody did it', 'nameMarketplace', 'row.objectId, Inputs.userId, changed', 'row.objectId, null, changed'],
  ['a second row made instead', 'nameMarketplace', "await Noodl.Records.save(row.objectId, { name: name }, { className: 'Marketplace' });", "await Noodl.Records.create('Marketplace', { name: name });"],
  ['a seller’s staff may rename', 'policy', '"nameMarketplace": {\n      "call": "role:admin"', '"nameMarketplace": {\n      "call": ["role:admin", "role:staff"]']
];

/** A copy of the template with one function's script, or the policy, changed. */
function mutate(target: string, from: string, to: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'two003-name-mutant-'));
  const copy = path.join(dir, 'marketplace');
  fs.cpSync(TEMPLATE, copy, { recursive: true });
  if (target === 'policy') {
    const file = path.join(copy, 'nodegx.security.json');
    const text = fs.readFileSync(file, 'utf8');
    if (text.split(from).length !== 2) throw new Error(`policy: the mutant’s text is not there exactly once: ${from}`);
    fs.writeFileSync(file, text.split(from).join(to));
    return copy;
  }
  const file = path.join(copy, 'components', '__cloud__', target, 'nodes.json');
  const doc = JSON.parse(fs.readFileSync(file, 'utf8'));
  let hits = 0;
  for (const node of doc.nodes) {
    const script = node.parameters?.functionScript;
    if (typeof script === 'string' && script.includes(from)) {
      node.parameters.functionScript = script.split(from).join(to);
      hits++;
    }
  }
  if (hits !== 1) throw new Error(`${target}: the mutant’s text is in ${hits} scripts, not one: ${from}`);
  fs.writeFileSync(file, JSON.stringify(doc, null, 2));
  return copy;
}

(RUN ? describe : describe.skip)('P121 s19 — the rename’s mutants', () => {
  it.each(NAME_MUTANTS)('mutant red: %s (%s)', (_what, target, from, to) => {
    const copy = mutate(target, from, to);
    const r = spawnSync('npx', ['jest', 'tests/two-003-sellers.test.ts', '--silent'], {
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, TWO003_TEMPLATE: copy, TWO003_MUTANTS: '' },
      encoding: 'utf8'
    });
    const tally = /Tests:\s+(.*)/.exec(`${r.stdout}\n${r.stderr}`)?.[1] ?? 'no tally';
    // Red means the spec ran and failed: a crash before any test ran would be red for the wrong reason.
    expect([r.status, /failed/.test(tally), /passed/.test(tally)]).toEqual([1, true, true]);
  });
});
