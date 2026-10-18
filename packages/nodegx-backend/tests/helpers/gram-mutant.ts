/**
 * P121 TWO-005 — a copy of the gram template with one cloud script, or one policy rule, changed: what each mutants
 * spec points its spec at (`TWO005_TEMPLATE`). A mutant whose text isn't in exactly one script throws, so a rename
 * can't turn one into a silent green.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

export function mutateGram(template: string, fn: string, from: string, to: unknown): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'two005-mutant-'));
  const copy = path.join(dir, 'gram');
  fs.cpSync(template, copy, { recursive: true });
  if (fn === 'policy') {
    const file = path.join(copy, 'nodegx.security.json');
    const policy = JSON.parse(fs.readFileSync(file, 'utf8'));
    const keys = from.split('.');
    let at = policy;
    for (const k of keys.slice(0, -1)) at = at[k];
    if (!(keys[keys.length - 1] in at)) throw new Error(`policy has no ${from}`);
    at[keys[keys.length - 1]] = to;
    fs.writeFileSync(file, JSON.stringify(policy, null, 2));
    return copy;
  }
  const file = path.join(copy, 'components', '__cloud__', fn, 'nodes.json');
  const doc = JSON.parse(fs.readFileSync(file, 'utf8'));
  let hits = 0;
  for (const node of doc.nodes) {
    const script = node.parameters?.functionScript;
    if (typeof script === 'string' && script.includes(from)) {
      node.parameters.functionScript = script.split(from).join(String(to));
      hits++;
    }
  }
  if (hits !== 1) throw new Error(`${fn}: the mutant’s text is in ${hits} scripts, not one: ${from}`);
  fs.writeFileSync(file, JSON.stringify(doc, null, 2));
  return copy;
}
