/**
 * TWO-003 slice 5 — the enquire spec's mutants: each loosens one rule in a SHIPPED script (`sendEnquiry`,
 * `answerEnquiry`, in a copy of the template), and `two-003-enquire.test.ts` must go red against it.
 *
 * Slow (one backend spec per mutant), so it runs only when asked:
 *
 *     TWO003_MUTANTS=1 npx jest tests/two-003-enquire-mutants.test.ts
 *
 * A mutant whose text isn't in the script fails here, so a rename can't turn one into a silent green.
 */
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const TEMPLATE = path.join(__dirname, '../../../templates/marketplace');
const RUN = process.env.TWO003_MUTANTS === '1';

jest.setTimeout(1800000);

/** [what it loosens, function, text in its script, what replaces it] */
export const ENQUIRE_MUTANTS: Array<[string, string, string, string]> = [
  ['a product bought through the basket asked about', 'sendEnquiry', "if (p.mode !== 'enquire')", 'if (false)'],
  ['a product off sale asked about', 'sendEnquiry', 'if (!p || !s || p.endedAt || s.endedAt)', 'if (!p || !s || s.endedAt)'],
  ['a stopped seller asked', 'sendEnquiry', 'if (!p || !s || p.endedAt || s.endedAt)', 'if (!p || !s || p.endedAt)'],
  ['no name needed', 'sendEnquiry', "if (!name) { refuse('Say who", "if (false) { refuse('Say who"],
  ['a long name cut to fit', 'sendEnquiry', 'if (name.length > 120)', 'name = name.slice(0, 120); if (false)'],
  ['a number with no country code', 'sendEnquiry', 'if (!international || ', 'if ('],
  ['a number too short', 'sendEnquiry', 'digits.length < 8 || ', ''],
  ['nothing asked', 'sendEnquiry', "if (!message) { refuse('Say what", "if (false) { refuse('Say what"],
  ['a long message cut to fit', 'sendEnquiry', 'if (message.length > 2000)', 'message = message.slice(0, 2000); if (false)'],
  ['the words kept untrimmed', 'sendEnquiry', "function whole(v) { return typeof v === 'string' ? v.trim() : ''; }", "function whole(v) { return typeof v === 'string' ? v : ''; }"],
  ['another seller’s staff mark it', 'answerEnquiry', "if (me.role !== 'admin' && (!idOf(me.seller) || idOf(p.seller) !== idOf(me.seller)))", 'if (false)'],
  ['the seller taken from what was sent', 'answerEnquiry', 'idOf(p.seller) !== idOf(me.seller)', 'idOf(p.seller) !== idOf(a.sellerId || me.seller)'],
  ['anything counts as yes', 'answerEnquiry', "if (typeof a.answered !== 'boolean')", 'if (a.answered === undefined)'],
  ['it can’t be unmarked', 'answerEnquiry', 'answeredAt: a.answered ? now() : null', 'answeredAt: now()'],
  ['the message changed with the mark', 'answerEnquiry', "{ answeredAt: a.answered ? now() : null }", "{ answeredAt: a.answered ? now() : null, message: '' }"]
];

/** A copy of the template with one function's script changed. */
function mutate(fn: string, from: string, to: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'two003-enquire-mutant-'));
  const copy = path.join(dir, 'marketplace');
  fs.cpSync(TEMPLATE, copy, { recursive: true });
  const file = path.join(copy, 'components', '__cloud__', fn, 'nodes.json');
  const doc = JSON.parse(fs.readFileSync(file, 'utf8'));
  let hits = 0;
  for (const node of doc.nodes) {
    const script = node.parameters?.functionScript;
    if (typeof script === 'string' && script.includes(from)) {
      node.parameters.functionScript = script.split(from).join(to);
      hits++;
    }
  }
  if (hits !== 1) throw new Error(`${fn}: the mutant’s text is in ${hits} scripts, not one: ${from}`);
  fs.writeFileSync(file, JSON.stringify(doc, null, 2));
  return copy;
}

(RUN ? describe : describe.skip)('TWO-003 slice 5 — the enquire spec’s mutants', () => {
  it.each(ENQUIRE_MUTANTS)('mutant red: %s (%s)', (_what, fn, from, to) => {
    const copy = mutate(fn, from, to);
    const r = spawnSync('npx', ['jest', 'tests/two-003-enquire.test.ts', '--silent'], {
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, TWO003_TEMPLATE: copy, TWO003_MUTANTS: '' },
      encoding: 'utf8'
    });
    const tally = /Tests:\s+(.*)/.exec(`${r.stdout}\n${r.stderr}`)?.[1] ?? 'no tally';
    // Red means the spec ran and failed: a crash before any test ran would be red for the wrong reason.
    expect([r.status, /failed/.test(tally), /passed/.test(tally)]).toEqual([1, true, true]);
  });
});
