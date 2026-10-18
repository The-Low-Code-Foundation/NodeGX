// Every setting the "Change it" panel offers must be an input port the kit's node spec declares,
// with a matching kind of value. A wrong name would pass the suite and do nothing in the app.

import { typePorts } from '../src/ports.mjs';
import { KINDS, PALETTE } from '../public/words.js';

const fits = { words: ['string', 'image'], size: ['number'], colour: ['color'], choice: ['enum'] };
let bad = 0;
for (const [type, kind] of Object.entries(KINDS)) {
  if (!kind.settings.length) continue;
  const ports = typePorts(type);
  if (!ports) {
    console.log(`${type}: the kit has no spec for it`);
    bad++;
    continue;
  }
  for (const s of kind.settings) {
    const p = ports.inputs.find((x) => x.name === s.param);
    if (!p) {
      console.log(`${type}: "${s.param}" is not one of its inputs`);
      bad++;
    } else if (!fits[s.kind].includes(p.type)) {
      console.log(`${type}: "${s.param}" is a ${p.type}, offered as ${s.kind}`);
      bad++;
    }
  }
}
for (const p of PALETTE) {
  const ports = typePorts(p.type);
  for (const name of Object.keys(p.starts)) {
    if (!ports?.inputs.some((x) => x.name === name)) {
      console.log(`palette ${p.word}: starts with "${name}", which is not an input of ${p.type}`);
      bad++;
    }
  }
}
const button = typePorts('net.noodl.controls.button');
if (!button.outputs.some((p) => p.name === 'onClick' && p.type === 'signal')) {
  console.log('a button has no onClick signal, so "When it is pressed" would join nothing');
  bad++;
}
console.log(bad ? `${bad} word(s) point at nothing` : `all ${Object.values(KINDS).reduce((n, k) => n + k.settings.length, 0)} settings and ${PALETTE.length} palette blocks name real ports`);
process.exit(bad ? 1 : 0);
