/**
 * P112-OWN021-GRAMWORDMARK and P112-OWN021-WELCOMEDEVOTIONAL — the community app's words about itself.
 *
 * On 0.4.2 the bar said **gram**, the template's working name, on every page a member sees, while the Welcome page
 * under it showed the name the first admin gave the community. And the Welcome page told every visitor that members
 * "read the day's devotional", which the app doesn't have (TWO-006, not built).
 *
 * 1. **`GRAM_NAME_LOAD`**, the script the bar runs: it reads the one `Community` row and hands its name to the
 *    app-wide variable, only when it differs, and says nothing when the read fails. The marketplace's R13, for the
 *    community (`two003Name.test.ts`).
 * 2. **The generated template**: `/UI/Bar`'s wordmark takes the variable; no Text says "gram"; no Text or Button
 *    promises a devotional.
 */
import * as fs from 'fs';
import * as path from 'path';

import { run, type Row } from './two003Run';
import { GRAM_NAME_LOAD, GRAM_NAME_VARIABLE } from './two005Pages';
import { TEMPLATE_DIR } from './two005Template';

type Scripts = { GRAM_NAME_LOAD: string };
const SHIPPED: Scripts = { GRAM_NAME_LOAD };

const CHECKS: Record<string, (s: Scripts) => Promise<void>> = {
  'the name read is handed on, once: the same name again sets nothing': async (s) => {
    const tables = { Community: [{ objectId: 'c1', name: 'Grace Fellowship' }] };
    const first = await run(s.GRAM_NAME_LOAD, { current: '' }, { tables });
    if (first.out.name !== 'Grace Fellowship' || !first.fired.includes('set')) throw new Error(`first read: ${JSON.stringify(first)}`);
    const again = await run(s.GRAM_NAME_LOAD, { current: 'Grace Fellowship' }, { tables });
    if (again.fired.length) throw new Error(`the same name set again: ${JSON.stringify(again.fired)}`);
    const renamed = await run(s.GRAM_NAME_LOAD, { current: 'Old name' }, { tables });
    if (renamed.out.name !== 'Grace Fellowship' || !renamed.fired.includes('set')) throw new Error(`a rename not shown: ${JSON.stringify(renamed)}`);
  },
  'before set-up there is no name, and nothing is made up': async (s) => {
    const none = await run(s.GRAM_NAME_LOAD, { current: '' }, { tables: { Community: [] } });
    if (none.fired.length || none.out.name !== undefined) throw new Error(`a name with no row: ${JSON.stringify(none)}`);
  },
  'a read that fails leaves the name as it was': async (s) => {
    const refusing = {
      get Community(): Row[] {
        throw new Error('refused');
      }
    };
    const failed = await run(s.GRAM_NAME_LOAD, { current: 'Grace Fellowship' }, { tables: refusing as unknown as Record<string, Row[]> }).catch((e) => ({ threw: e }) as unknown as Row);
    if ((failed as Row).threw) throw new Error(`the read's failure escaped: ${(failed as Row).threw}`);
    if ((failed as Row).fired.length) throw new Error(`a failed read changed the name: ${JSON.stringify(failed)}`);
  }
};

describe('P112-OWN021-GRAMWORDMARK — the community’s name, read for the bar', () => {
  for (const [name, check] of Object.entries(CHECKS)) it(name, () => check(SHIPPED));

  /** Each breaks one rule; the named check must go red. */
  const MUTANTS: Array<[string, keyof Scripts, string, string, string]> = [
    ['set even when unchanged', 'GRAM_NAME_LOAD', "if (name === String(Inputs.current || '')) return;", '', 'the name read is handed on, once: the same name again sets nothing'],
    ['a rename never shown', 'GRAM_NAME_LOAD', "if (name === String(Inputs.current || '')) return;", 'if (Inputs.current) return;', 'the name read is handed on, once: the same name again sets nothing'],
    ['the old word before set-up', 'GRAM_NAME_LOAD', "rows[0].name ? String(rows[0].name) : ''", "rows[0].name ? String(rows[0].name) : 'gram'", 'before set-up there is no name, and nothing is made up'],
    ['a failed read escapes', 'GRAM_NAME_LOAD', "try { rows = await Noodl.Records.query('Community', {}, { plain: true, limit: 1 }); } catch (e) { return; }", "rows = await Noodl.Records.query('Community', {}, { plain: true, limit: 1 });", 'a read that fails leaves the name as it was']
  ];

  it.each(MUTANTS)('mutant red: %s', async (_what, script, from, to, check) => {
    expect(SHIPPED[script].includes(from)).toBe(true);
    const mutated = { ...SHIPPED, [script]: SHIPPED[script].split(from).join(to) };
    await expect(CHECKS[check](mutated)).rejects.toThrow();
  });
});

describe('P112-OWN021-GRAMWORDMARK / WELCOMEDEVOTIONAL — the generated community app', () => {
  interface N {
    id: string;
    type: string;
    parameters?: Record<string, unknown>;
  }
  interface C {
    fromId: string;
    toId: string;
    toProperty: string;
  }
  const read = (rel: string) => {
    const dir = path.join(TEMPLATE_DIR, 'components', rel);
    return {
      nodes: JSON.parse(fs.readFileSync(path.join(dir, 'nodes.json'), 'utf8')).nodes as N[],
      connections: JSON.parse(fs.readFileSync(path.join(dir, 'connections.json'), 'utf8')).connections as C[]
    };
  };
  const all = (root: string): string[] =>
    fs.readdirSync(root, { withFileTypes: true }).flatMap((e) => {
      const p = path.join(root, e.name);
      if (!e.isDirectory()) return [];
      return fs.existsSync(path.join(p, 'nodes.json')) ? [path.relative(path.join(TEMPLATE_DIR, 'components'), p), ...all(p)] : all(p);
    });
  /** Every Text's text and Button's label in the app, as `component node: words`. */
  const words = () =>
    all(path.join(TEMPLATE_DIR, 'components')).flatMap((rel) =>
      read(rel)
        .nodes.filter((n) => n.type === 'Text' || n.type === 'net.noodl.controls.button')
        .map((n) => `${rel} ${n.id}: ${String(n.parameters?.text ?? n.parameters?.label ?? '')}`)
    );

  it('known-firing: the reader sees the Welcome page’s words', () => {
    expect(words().some((w) => /^Pages\/Welcome wcLead: Members /.test(w))).toBe(true);
  });

  it('the bar’s wordmark takes the community’s name from the one variable', () => {
    const bar = read('UI/Bar');
    const wire = bar.connections.find((w) => w.toId === 'brWord' && w.toProperty === 'text');
    const from = wire && bar.nodes.find((n) => n.id === wire.fromId);
    expect(from ? [from.type, from.parameters?.name] : null).toEqual(['Variable2', GRAM_NAME_VARIABLE]);
  });

  it('no Text says “gram”', () => {
    expect(words().filter((w) => /: gram$/i.test(w))).toEqual([]);
  });

  it('no Text or Button promises a devotional', () => {
    expect(words().filter((w) => /devotional/i.test(w))).toEqual([]);
  });
});
