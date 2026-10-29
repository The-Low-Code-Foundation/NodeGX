// OWN-032 — a node tree in words: the outline the builder reads every turn, and the viewer shows after every step.
// One line per node, indented by depth: a short name the model can point at (#3), the kind, the role in quotes, then
// only the params that change what a person sees, said in tokens and plain words. No ids, no units it cannot set.
const KIND = { Group: 'Group', Text: 'Text', Image: 'Image', 'net.noodl.controls.button': 'Button', 'net.noodl.visual.columns': 'Columns', 'net.noodl.controls.textinput': 'Input' };
const tok = (v) => (typeof v === 'string' ? v.replace(/^var\(--(.+)\)$/, '$1') : v && typeof v === 'object' && 'value' in v ? `${v.value}${v.unit || ''}` : String(v));

export function describeParams(p = {}) {
  const out = [];
  if (p.flexDirection) out.push(p.flexDirection === 'row' ? 'side by side' : 'stacked');
  if (p.layoutString) out.push(`columns ${p.layoutString.replace(/ /g, ':')}${p.smallLayout ? `, ${p.smallLayout === '1' ? 'one column' : p.smallLayout} under ${tok(p.smallBreakpoint)}` : ''}`);
  if (p.marginX) out.push(`column gap ${tok(p.marginX)}`);
  for (const [k, w] of [['alignItems', 'align'], ['justifyContent', 'justify'], ['textAlignX', 'text']]) if (p[k]) out.push(`${w} ${p[k].replace('flex-', '')}`);
  if (p.rowGap) out.push(`gap ${tok(p.rowGap)}`);
  if (p.columnGap && !p.rowGap) out.push(`gap ${tok(p.columnGap)}`);
  const sides = ['Top', 'Right', 'Bottom', 'Left'].filter((s) => p[`padding${s}`]);
  if (sides.length) {
    const vals = sides.map((s) => tok(p[`padding${s}`]));
    out.push(sides.length === 4 && new Set(vals).size === 1 ? `padding ${vals[0]}` : `padding ${sides.map((s, i) => `${s.toLowerCase()} ${vals[i]}`).join(' ')}`);
  }
  if (p.width) out.push(`width ${tok(p.width)}`);
  if (p.height) out.push(`height ${tok(p.height)}`);
  if (p.maxWidth) out.push(`max width ${tok(p.maxWidth)}`);
  if (p.fontSize) out.push(`size ${tok(p.fontSize)}`);
  if (p.fontWeight) out.push(tok(p.fontWeight).replace('font-', ''));
  if (p.color) out.push(`colour ${tok(p.color)}`);
  if (p.backgroundColor) out.push(`fill ${tok(p.backgroundColor)}`);
  if (p.backgroundGradient) out.push(`ground ${tok(p.backgroundGradient)}`);
  if (p.backgroundImage) out.push('ground photo');
  if (p.borderRadius) out.push(`corners ${tok(p.borderRadius)}`);
  if (p.objectFit) out.push(`fit ${p.objectFit}`);
  return out;
}

export function outline(nodes, { words = true } = {}) {
  const lines = [];
  const walk = (i, d) => {
    const n = nodes[i], p = n.params || {};
    const w = p.text || p.label;
    const said = words && w ? `: "${w.length > 60 ? `${w.slice(0, 57)}…` : w}"` : '';
    const src = n.type === 'Image' && p.src ? ` (${p.src.split('/').pop()})` : '';
    lines.push(`${'  '.repeat(d)}#${i} ${KIND[n.type] || n.type}${n.role ? ` "${n.role}"` : ''}${src} [${describeParams(p).join(', ')}]${said}`);
    nodes.forEach((m, j) => { if (m.parent === i) walk(j, d + 1); });
  };
  nodes.forEach((n, i) => { if (!(n.parent >= 0)) walk(i, 0); });
  return lines.join('\n');
}
