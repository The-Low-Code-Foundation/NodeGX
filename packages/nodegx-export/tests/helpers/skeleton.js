/**
 * P134 session 11. What a page draws, as one line per element and per text, in document order: the element's tag, its
 * attributes but `class` and `style` (sorted), the switches set as properties only (a Video's `muted` has no attribute
 * when React sets it), and its classes that are not a component's own. A text is its words, quoted.
 *
 * A component's own class is named by its printer (React's CSS module `Home_x` (esbuild's local-css), the HTML export's `Home-x`), so it
 * is read as a count, `.own=1`; any other class (an icon set's `lucide icon-sparkles`) is read as written. Comments (the
 * HTML export's markers) are not drawn and are not read.
 *
 * Shared by `export-react-arm.js` (`skeleton: true`) and the HTML export's spec, so both arms read a page one way.
 */

const SWITCHES = ['controls', 'autoplay', 'muted', 'loop', 'disabled', 'checked'];

/** A component's own class: React's `<File>_<name>` (esbuild's local-css) or the HTML export's `<Symbol>-<name>`. */
const OWN = /^[A-Z][A-Za-z0-9]*[_-][A-Za-z0-9_-]+$/;

function skeleton(root) {
  const out = [];
  const walk = (n, depth) => {
    const pad = '  '.repeat(depth);
    if (n.nodeType === 3) {
      const t = n.data.replace(/\s+/g, ' ').trim();
      if (t) out.push(pad + JSON.stringify(t));
      return;
    }
    if (n.nodeType !== 1) return;
    const attrs = [...n.attributes]
      .filter((a) => a.name !== 'class' && a.name !== 'style')
      .map((a) => `${a.name}=${JSON.stringify(a.value)}`)
      .sort();
    for (const p of SWITCHES) if (n[p] === true && !n.hasAttribute(p)) attrs.push(`${p}=(property)`);
    const classes = (n.getAttribute('class') || '').split(/\s+/).filter(Boolean);
    const own = classes.filter((c) => OWN.test(c)).length;
    const other = classes.filter((c) => !OWN.test(c));
    const cls = [...(own ? [`.own=${own}`] : []), ...other.map((c) => `.${c}`)];
    out.push(`${pad}<${n.tagName.toLowerCase()}${attrs.length ? ` ${attrs.join(' ')}` : ''}${cls.length ? ` ${cls.join(' ')}` : ''}>`);
    for (const c of n.childNodes) walk(c, depth + 1);
  };
  for (const c of root.childNodes) walk(c, 0);
  return out;
}

module.exports = { skeleton };
