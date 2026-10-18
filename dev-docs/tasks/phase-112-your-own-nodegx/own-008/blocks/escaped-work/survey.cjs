const fs = require('fs'), path = require('path');
const root = path.join(process.argv[2], 'components');
const types = {}, params = {};
let childPos = 0, children = 0;
function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name === 'nodes.json') {
      const j = JSON.parse(fs.readFileSync(p));
      for (const n of j.nodes) {
        types[n.type] = (types[n.type] || 0) + 1;
        if (n.parent) { children++; if (n.x !== undefined) childPos++; }
        for (const k of Object.keys(n.parameters || {})) ((params[n.type] = params[n.type] || {})[k] = 1);
      }
    }
  }
}
walk(root);
console.log(Object.entries(types).sort((a, b) => b[1] - a[1]));
console.log('children', children, 'withpos', childPos);
for (const t of ['Text', 'net.noodl.controls.button', 'Group', 'Image', 'Component Inputs', 'Component Outputs']) console.log(t, Object.keys(params[t] || {}).join(','));
