/**
 * P121 R13 (Richard, 2026-10-15) — the marketplace's name is its own, named at set-up, never written into a page.
 *
 * The world has one `Marketplace` row (TWO-001's spec gates the schema and the policy; the backend's sellers spec
 * grades `setUpMarketplace` naming it). What this grades is the pages' half:
 *
 * 1. **`NAME_LOAD`**, the script every bar runs: it reads the row and hands the name to the app-wide variable, only
 *    when it differs (a page doesn't redraw for nothing), and says nothing when the read fails.
 * 2. **The set-up form sends the name** (`SET_UP_GATHER`).
 * 3. **No page of the generated template says a name of its own**: no Text, Button or Page title reads "The
 *    marketplace"; the staff bar (`/UI/Brand`), the shop's bar (`/Shop/Top`) and the shop's browser tab (Home's
 *    title) all take the variable.
 */
import * as fs from 'fs';
import * as path from 'path';

import { NAME_GATHER, NAME_LOAD, NAME_PAGE_LOAD, NAME_VARIABLE, SET_UP_GATHER } from './two003Pages';
import { run, type Row } from './two003Run';
import { TEMPLATE_DIR } from './two003Template';

type Scripts = { NAME_LOAD: string; SET_UP_GATHER: string; NAME_PAGE_LOAD: string; NAME_GATHER: string };
const SHIPPED: Scripts = { NAME_LOAD, SET_UP_GATHER, NAME_PAGE_LOAD, NAME_GATHER };

const CHECKS: Record<string, (s: Scripts) => Promise<void>> = {
  'the name read is handed on, once: the same name again sets nothing': async (s) => {
    const tables = { Marketplace: [{ objectId: 'm1', name: 'Market Square' }] };
    const first = await run(s.NAME_LOAD, { current: '' }, { tables });
    if (first.out.name !== 'Market Square' || !first.fired.includes('set')) throw new Error(`first read: ${JSON.stringify(first)}`);
    const again = await run(s.NAME_LOAD, { current: 'Market Square' }, { tables });
    if (again.fired.length) throw new Error(`the same name set again: ${JSON.stringify(again.fired)}`);
    const renamed = await run(s.NAME_LOAD, { current: 'Old name' }, { tables });
    if (renamed.out.name !== 'Market Square' || !renamed.fired.includes('set')) throw new Error(`a rename not shown: ${JSON.stringify(renamed)}`);
  },
  'before set-up there is no name, and nothing is made up': async (s) => {
    const none = await run(s.NAME_LOAD, { current: '' }, { tables: { Marketplace: [] } });
    if (none.fired.length || none.out.name !== undefined) throw new Error(`a name with no row: ${JSON.stringify(none)}`);
  },
  'a read that fails leaves the name as it was': async (s) => {
    // The read itself refused (the fixture throws when the table is asked for).
    const refusing = {
      get Marketplace(): Row[] {
        throw new Error('refused');
      }
    };
    const failed = await run(s.NAME_LOAD, { current: 'Market Square' }, { tables: refusing as unknown as Record<string, Row[]> }).catch((e) => ({ threw: e }) as unknown as Row);
    if ((failed as Row).threw) throw new Error(`the read's failure escaped: ${(failed as Row).threw}`);
    if ((failed as Row).fired.length) throw new Error(`a failed read changed the name: ${JSON.stringify(failed)}`);
  },
  'the set-up form sends the marketplace’s name': async (s) => {
    const r = await run(s.SET_UP_GATHER, { token: 't', marketplace: 'Market Square', name: 'Ama', email: 'a@example.com', password: 'longenough' });
    if (r.out.setup?.marketplace !== 'Market Square') throw new Error(`the name not sent: ${JSON.stringify(r.out.setup)}`);
  },
  'the rename page is the admin’s: a seller’s staff and a stranger are told so': async (s) => {
    const as = (me: Row | null) => ({ cloud: (name: string) => (name === 'whoAmI' ? { me } : null) });
    const admin = await run(s.NAME_PAGE_LOAD, {}, as({ role: 'admin' }));
    if (admin.out.ok !== true || admin.out.refused !== false) throw new Error(`the admin was turned away: ${JSON.stringify(admin.out)}`);
    for (const me of [{ role: 'seller', seller: { id: 's1' } }, null]) {
      const other = await run(s.NAME_PAGE_LOAD, {}, as(me));
      if (other.out.ok !== false || other.out.refused !== true || !/admin’s/.test(String(other.out.problem))) throw new Error(`${JSON.stringify(me)} let in: ${JSON.stringify(other.out)}`);
    }
  },
  'the rename sends the name typed, trimmed; untouched, the one on screen; cleared, nothing': async (s) => {
    const typed = await run(s.NAME_GATHER, { typed: '  Market Square  ', current: 'Old name' });
    if (typed.out.marketplace?.name !== 'Market Square' || typed.out.name !== 'Market Square' || !typed.fired.includes('go')) throw new Error(`typed: ${JSON.stringify(typed)}`);
    const untouched = await run(s.NAME_GATHER, { current: 'Old name' });
    if (untouched.out.marketplace?.name !== 'Old name') throw new Error(`untouched: ${JSON.stringify(untouched.out)}`);
    // Cleared: an empty name goes to the function, which refuses it in words; the page never invents one.
    const cleared = await run(s.NAME_GATHER, { typed: '', current: 'Old name' });
    if (cleared.out.marketplace?.name !== '') throw new Error(`cleared: ${JSON.stringify(cleared.out)}`);
  }
};

describe('P121 R13 — the marketplace’s name, on the pages', () => {
  for (const [name, check] of Object.entries(CHECKS)) it(name, () => check(SHIPPED));

  /** Each breaks one rule; the named check must go red. */
  const MUTANTS: Array<[string, keyof Scripts, string, string, string]> = [
    ['set even when unchanged', 'NAME_LOAD', "if (name === String(Inputs.current || '')) return;", '', 'the name read is handed on, once: the same name again sets nothing'],
    ['a rename never shown', 'NAME_LOAD', "if (name === String(Inputs.current || '')) return;", 'if (Inputs.current) return;', 'the name read is handed on, once: the same name again sets nothing'],
    ['the old words before set-up', 'NAME_LOAD', "rows[0].name ? String(rows[0].name) : ''", "rows[0].name ? String(rows[0].name) : 'The marketplace'", 'before set-up there is no name, and nothing is made up'],
    ['a failed read escapes', 'NAME_LOAD', "try { rows = await Noodl.Records.query('Marketplace', {}, { plain: true, limit: 1 }); } catch (e) { return; }", "rows = await Noodl.Records.query('Marketplace', {}, { plain: true, limit: 1 });", 'a read that fails leaves the name as it was'],
    ['the name left out of the form', 'SET_UP_GATHER', "marketplace: Inputs.marketplace || '', ", '', 'the set-up form sends the marketplace’s name'],
    ['the rename page open to anyone', 'NAME_PAGE_LOAD', 'try { await adminOnly(); }', 'try { }', 'the rename page is the admin’s: a seller’s staff and a stranger are told so'],
    ['the typed name not trimmed', 'NAME_GATHER', 'String(Inputs.typed)).trim()', 'String(Inputs.typed))', 'the rename sends the name typed, trimmed; untouched, the one on screen; cleared, nothing'],
    ['what was typed ignored', 'NAME_GATHER', 'Inputs.typed === undefined ?', 'true ?', 'the rename sends the name typed, trimmed; untouched, the one on screen; cleared, nothing'],
    ['a cleared field sends the old name', 'NAME_GATHER', 'Inputs.typed === undefined ?', '!Inputs.typed ?', 'the rename sends the name typed, trimmed; untouched, the one on screen; cleared, nothing']
  ];

  it.each(MUTANTS)('mutant red: %s', async (_what, script, from, to, check) => {
    expect(SHIPPED[script].includes(from)).toBe(true);
    const mutated = { ...SHIPPED, [script]: SHIPPED[script].split(from).join(to) };
    await expect(CHECKS[check](mutated)).rejects.toThrow();
  });
});

describe('P121 R13 — the generated template says no name of its own', () => {
  interface N {
    id: string;
    type: string;
    label?: string;
    parameters?: Record<string, unknown>;
  }
  interface C {
    fromId: string;
    fromProperty: string;
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

  it('no Text, Button or page title in any component reads “The marketplace”', () => {
    const said: string[] = [];
    for (const rel of all(path.join(TEMPLATE_DIR, 'components'))) {
      for (const n of read(rel).nodes) {
        for (const k of ['text', 'label', 'title']) {
          const v = n.parameters?.[k];
          if (typeof v === 'string' && /^the marketplace$/i.test(v.trim())) said.push(`${rel} ${n.id}.${k}`);
        }
      }
    }
    expect(said).toEqual([]);
  });

  it('the staff bar, the shop’s bar and the shop’s tab take the name from the one variable', () => {
    const fedBy = (rel: string, toId: string, toProperty: string) => {
      const c = read(rel);
      const wire = c.connections.find((w) => w.toId === toId && w.toProperty === toProperty);
      const from = wire && c.nodes.find((n) => n.id === wire.fromId);
      return from ? [from.type, from.parameters?.name] : null;
    };
    expect(fedBy('UI/Brand', 'brName', 'text')).toEqual(['Variable2', NAME_VARIABLE]);
    expect(fedBy('Shop/Top', 'tpBrand', 'label')).toEqual(['Variable2', NAME_VARIABLE]);
    expect(fedBy('Pages/Shop/Home', 'hmPage', 'title')).toEqual(['Variable2', NAME_VARIABLE]);
  });

  it('every staff page’s bar places /UI/Brand', () => {
    const pages = all(path.join(TEMPLATE_DIR, 'components', 'Pages'));
    // `shell`'s bar is a Group labelled "The bar"; the shop's pages place `/Shop/Top` instead (graded above).
    const withBar = pages.filter((rel) => read(rel).nodes.some((n) => n.type === 'Group' && n.label === 'The bar'));
    expect(withBar.length).toBeGreaterThan(10);
    const without = withBar.filter((rel) => !read(rel).nodes.some((n) => n.type === '/UI/Brand'));
    expect(without).toEqual([]);
  });
});
