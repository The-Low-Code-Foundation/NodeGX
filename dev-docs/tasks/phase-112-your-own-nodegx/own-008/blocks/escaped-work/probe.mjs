import { createRequire } from 'module';
const require = createRequire(process.argv[2] + '/package.json');
const ns = require('@nodegx/node-spec');
for (const t of ['Text', 'net.noodl.controls.button', 'Button', 'Group', 'Image', 'Component Inputs', 'Set Variable']) {
  const s = ns.specFor(t);
  if (!s) { console.log(t, 'NO SPEC'); continue; }
  const ins = typeof s.inputs === 'function' ? 'fn' : s.inputs;
  const pick = (o, ks) => Object.fromEntries(ks.filter((k) => o && o[k]).map((k) => [k, o[k]]));
  console.log(t, 'name=', s.name, 'type=', s.type, 'keys', Object.keys(s).join(','));
  console.log('  ', JSON.stringify(pick(ins, ['text', 'fontSize', 'color', 'label', 'backgroundColor', 'flexDirection', 'src', 'onClick'])));
  console.log('  outs', typeof s.outputs === 'function' ? 'fn' : Object.keys(s.outputs).join(','));
}
const all = ns.specs;
console.log(Array.isArray(all) ? all.length : typeof all, Array.isArray(all) ? all.map((s) => s.type || s.name).join(', ') : Object.keys(all || {}).join(', '));
