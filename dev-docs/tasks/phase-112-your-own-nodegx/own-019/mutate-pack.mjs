// OWN-019 AC5: proves grade-pack.mjs on mutants of the Sonnet yardstick's "Pack It" (p0, 12/12 once its children were
// listed once — P112-OWN019-DUPCHILD). Each mutant is a copy of the app with one behaviour broken in its graph; the
// grader must fail exactly the checks that behaviour carries, and pass the rest. Specific to p0's graph (its node ids).
//   node mutate-pack.mjs <app-dir> <out-dir>      → <out-dir>/<mutant>/pack-it and expected.json
//   then: for m in <out-dir>/*/; do node grade-pack.mjs $m --tgz <tgz> --no-audit; done, and compare with expected.json
import fs from 'node:fs';
import path from 'node:path';

const [appArg, outArg] = process.argv.slice(2);
const APP = path.resolve(appArg);
const OUT = path.resolve(outArg);
const file = (dir, comp, f) => path.join(dir, 'components', comp, f);
const edit = (dir, comp, f, fn) => {
  const p = file(dir, comp, f);
  const j = JSON.parse(fs.readFileSync(p, 'utf8'));
  fn(j);
  fs.writeFileSync(p, JSON.stringify(j, null, 2) + '\n');
};
const cut = (dir, comp, pred) => edit(dir, comp, 'connections.json', (j) => {
  const before = j.connections.length;
  j.connections = j.connections.filter((c) => !pred(c));
  if (j.connections.length === before) throw new Error(`nothing cut in ${comp}`);
});
const node = (j, id) => { const n = j.nodes.find((x) => x.id === id); if (!n) throw new Error(`no node ${id}`); return n; };
const script = (dir, comp, id, from, to) => edit(dir, comp, 'nodes.json', (j) => {
  const n = node(j, id);
  const s = n.parameters.functionScript;
  if (!s.includes(from)) throw new Error(`${id}: "${from}" not in its script`);
  n.parameters.functionScript = s.replace(from, to);
});
const expr = (dir, comp, id, expression) => edit(dir, comp, 'nodes.json', (j) => { node(j, id).parameters.expression = expression; });

const MUTANTS = {
  // The empty check is gone: Add puts an empty item in the list (and the counts after it are all off by two).
  noguard: {
    fails: ['refuse', 'count', 'untick', 'delete', 'reload'],
    apply: (d) => script(d, 'Components/AddItemForm', 'try_add_item', "if (trimmed.length === 0) {\n  Outputs.showError = true;\n  return;\n}\n", '')
  },
  // The check still refuses, but nothing tells the person why.
  nonag: { fails: ['refuse'], apply: (d) => cut(d, 'Components/AddItemForm', (c) => c.fromProperty === 'out-showError' && c.toId === 'error_text') },
  // The field keeps the text after Add.
  noclear: { fails: ['add'], apply: (d) => cut(d, 'Components/AddItemForm', (c) => c.fromId === 'insert_item' && c.toId === 'text_input' && c.toProperty === 'clear') },
  // After each Add the bag falls back to Suitcase (the first option).
  nokeepbag: {
    fails: ['keepbag'],
    apply: (d) => {
      edit(d, 'Components/AddItemForm', 'nodes.json', (j) => { j.nodes.push({ id: 'reset_bag', type: 'Set Variable', parameters: { name: 'selectedBag', setWith: 'string', value: 'Suitcase' }, x: 0, y: 0 }); });
      edit(d, 'Components/AddItemForm', 'connections.json', (j) => { j.connections.push({ fromId: 'insert_item', fromProperty: 'done', toId: 'reset_bag', toProperty: 'do' }); });
    }
  },
  // A row never says its bag.
  nobag: { fails: ['bag', 'keepbag', 'reload'], apply: (d) => cut(d, 'Components/ItemRow', (c) => c.fromId === 'row_inputs' && c.fromProperty === 'bag') },
  // Ticking greys the item but never crosses it out.
  nostrike: { fails: ['tick', 'untick', 'reload'], apply: (d) => expr(d, 'Components/ItemRow', 'packed_strike_expr', "''") },
  // Ticking crosses the item out but never greys it.
  nogrey: { fails: ['tick'], apply: (d) => expr(d, 'Components/ItemRow', 'packed_color_expr', "'var(--foreground)'") },
  // The filter buttons change nothing in the list.
  nofilter: {
    fails: ['filter'],
    apply: (d) => script(d, 'Pages/Home', 'derive_list_state', "const filter = Inputs.filter || 'all';", "const filter = 'all';")
  },
  // The chosen filter looks like the others.
  noactive: {
    fails: ['active'],
    apply: (d) => {
      for (const id of ['all_bg_expr', 'unpacked_bg_expr', 'packed_bg_expr']) expr(d, 'Components/FilterBar', id, "'var(--surface)'");
      for (const id of ['all_fg_expr', 'unpacked_fg_expr', 'packed_fg_expr']) expr(d, 'Components/FilterBar', id, "'var(--foreground)'");
    }
  },
  // Delete does nothing.
  nodelete: { fails: ['delete', 'reload'], apply: (d) => cut(d, 'Pages/Home', (c) => c.fromProperty === 'itemOutputSignal-delete') },
  // Nothing is saved: a reload starts empty.
  nopersist: {
    fails: ['reload'],
    apply: (d) => script(d, 'Pages/Home', 'save_state', "localStorage.setItem('packIt.state', JSON.stringify(state));", 'window.__state = JSON.stringify(state);')
  }
};

fs.mkdirSync(OUT, { recursive: true });
for (const [name, m] of Object.entries(MUTANTS)) {
  const d = path.join(OUT, name, path.basename(APP));
  fs.rmSync(path.join(OUT, name), { recursive: true, force: true });
  fs.cpSync(APP, d, { recursive: true, filter: (src) => !/[\\/](\.previews|grade|node_modules)([\\/]|$)/.test(src) });
  m.apply(d);
  console.log(name, '→', d);
}
fs.writeFileSync(path.join(OUT, 'expected.json'), JSON.stringify(Object.fromEntries(Object.entries(MUTANTS).map(([k, v]) => [k, v.fails])), null, 2) + '\n');
