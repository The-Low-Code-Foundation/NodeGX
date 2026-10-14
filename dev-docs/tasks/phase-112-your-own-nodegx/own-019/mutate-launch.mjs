// OWN-019 AC5b: proves grade-launch.mjs on mutants of the Sonnet yardstick's "Driftwood" (l0, s4) — as the CONTROL:
// l0 with Sonnet's own look calls replayed through tgz28's server (set_style_preset "soft", then its
// set_project_tokens), so the preset's DM Sans ships (P112-OWN019-PRESETFONTS) and the control grades 17/17. Each
// mutant is a copy with one behaviour broken in its graph or project; the grader must fail exactly the checks that
// behaviour carries, and pass the rest. Specific to l0's graph (its node ids).
//   node mutate-launch.mjs <control-app-dir> <out-dir>      → <out-dir>/<mutant>/driftwood and expected.json
//   then: for m in <out-dir>/*/; do node grade-launch.mjs $m --tgz <tgz> --no-audit; done, and compare with expected.json
import fs from 'node:fs';
import path from 'node:path';

const [appArg, outArg] = process.argv.slice(2);
const APP = path.resolve(appArg);
const OUT = path.resolve(outArg);
const file = (dir, comp, f) => path.join(dir, 'components', comp, f);
const edit = (p, fn) => {
  const j = JSON.parse(fs.readFileSync(p, 'utf8'));
  fn(j);
  fs.writeFileSync(p, JSON.stringify(j, null, 2) + '\n');
};
const cut = (dir, comp, pred, n = 1) => edit(file(dir, comp, 'connections.json'), (j) => {
  const before = j.connections.length;
  j.connections = j.connections.filter((c) => !pred(c));
  if (before - j.connections.length !== n) throw new Error(`${comp}: cut ${before - j.connections.length}, expected ${n}`);
});
const node = (j, id) => { const x = j.nodes.find((n) => n.id === id); if (!x) throw new Error(`no node ${id}`); return x; };
const script = (dir, comp, id, from, to) => edit(file(dir, comp, 'nodes.json'), (j) => {
  const n = node(j, id);
  const s = n.parameters.functionScript;
  if (!s.includes(from)) throw new Error(`${id}: "${from}" not in its script`);
  n.parameters.functionScript = s.replace(from, to);
});
const WL = 'Components/Sections/Waitlist';

const MUTANTS = {
  // The preset's face is not shipped: the token still names DM Sans, the page paints the system font.
  nofont: { fails: ['font'], apply: (d) => fs.rmSync(path.join(d, 'noodl_modules', 'preset-font-dm-sans'), { recursive: true }) },
  // Every colour the agent chose is dropped: the page wears the template's own colours.
  nopalette: {
    fails: ['palette'],
    apply: (d) => edit(path.join(d, 'nodegx.project.json'), (p) => {
      const t = p.metadata.designTokens;
      const before = t.customTokens.length;
      t.customTokens = t.customTokens.filter((x) => !/^color/.test(x.category || '') && !/^--(gradient|surface-glass|border-glass)/.test(x.name));
      if (t.customTokens.length === before) throw new Error('no colour tokens dropped');
    })
  },
  // "Join the waitlist" does nothing.
  noscroll: { fails: ['scroll'], apply: (d) => cut(d, 'Pages/Home', (c) => c.fromProperty === 'joinClicked' && c.toProperty === 'scrollToMe') },
  // Yearly can't be chosen.
  notoggle: { fails: ['pricing'], apply: (d) => cut(d, 'Components/Sections/Pricing', (c) => c.fromId === 'price_yearlybtn' && c.toProperty === 'on') },
  // Opening a question never closes the others.
  nofaqclose: { fails: ['faq'], apply: (d) => cut(d, 'Components/Sections/Faq', (c) => c.fromProperty === 'requestOpen' && c.toProperty === 'off', 6) },
  // Anything is sent: no check of the name or the email.
  novalidate: { fails: ['refuse'], apply: (d) => script(d, WL, 'wl_submit', 'if (!name || !emailOk) {', 'if (false) {') },
  // No "Sending…": the outcome just appears a second later.
  nosending: { fails: ['sending'], apply: (d) => script(d, WL, 'wl_submit', "Outputs.statusText = 'Sending…';", '') },
  // No wait: "Sending…" and the outcome in the same moment.
  nowait: { fails: ['sending'], apply: (d) => script(d, WL, 'wl_submit', 'setTimeout(resolve, 1000)', 'setTimeout(resolve, 0)') },
  // @fail.test succeeds like any other address.
  nofail: { fails: ['fail'], apply: (d) => script(d, WL, 'wl_submit', "if (email.toLowerCase().endsWith('@fail.test')) {", 'if (false) {') },
  // A failure empties the fields.
  nokeep: {
    fails: ['fail'],
    apply: (d) => {
      script(d, WL, 'wl_submit', "Outputs.statusText = 'Something went wrong — please try again';", "Outputs.statusText = 'Something went wrong — please try again';\n    Outputs.failed();");
      edit(file(d, WL, 'connections.json'), (j) => {
        for (const id of ['wl_name_input', 'wl_email_input']) j.connections.push({ fromId: 'wl_submit', fromProperty: 'out-failed', toId: id, toProperty: 'clear' });
      });
      // A Function's signal output exists only as a saved port (`ports`, as Sonnet's own `out-foundJoined`); without it
      // the page throws "Outputs.failed is not a function" (P107-S83-SENDFORM's family).
      edit(file(d, WL, 'nodes.json'), (j) => { node(j, 'wl_submit').ports.push({ name: 'out-failed', plug: 'output', type: 'signal' }); });
    }
  },
  // Joining is never saved: a reload shows the form again (and so no "Not you?").
  nopersist: { fails: ['reload', 'notyou'], apply: (d) => script(d, WL, 'wl_submit', "localStorage.setItem('driftwood-waitlist',", 'window.__wl = (') },
  // "Not you?" forgets the person but the joined line stays.
  nonotyou: { fails: ['notyou'], apply: (d) => cut(d, WL, (c) => c.fromId === 'wl_clearjoined' && c.toProperty === 'off') }
};

fs.mkdirSync(OUT, { recursive: true });
for (const [name, m] of Object.entries(MUTANTS)) {
  const d = path.join(OUT, name, path.basename(APP));
  fs.rmSync(path.join(OUT, name), { recursive: true, force: true });
  fs.cpSync(APP, d, { recursive: true, filter: (src) => !/[\\/](\.previews|grade|node_modules[\\/]\.cache)([\\/]|$)/.test(src) });
  m.apply(d);
  console.log(name, '→', d);
}
fs.writeFileSync(path.join(OUT, 'expected.json'), JSON.stringify(Object.fromEntries(Object.entries(MUTANTS).map(([k, v]) => [k, v.fails])), null, 2) + '\n');
