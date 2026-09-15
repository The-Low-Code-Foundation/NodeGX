// CHR-001 measurement eval. Run in the editor renderer:
//   NOODL_REMOTE_DEBUG_PORT=9333 node scripts/devtools/cdp.js eval "$(sed 's/__ROOT__/<selector>/' measure.js)"
// Returns JSON for one surface root. "visible" = has a client rect and is not visibility:hidden.
(() => {
  const root = document.querySelector('__ROOT__');
  if (!root) return JSON.stringify({ error: 'no root __ROOT__' });
  const all = [root, ...root.querySelectorAll('*')];
  const visible = all.filter((el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
  });
  const ownText = (el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
  const tally = (els, key) => {
    const m = {};
    for (const el of els) { const k = key(el); if (k != null) m[k] = (m[k] || 0) + 1; }
    return Object.fromEntries(Object.entries(m).sort((a, b) => parseFloat(a[0]) - parseFloat(b[0])));
  };
  const cs = (el) => getComputedStyle(el);
  const fontAll = tally(visible, (el) => cs(el).fontSize);
  const fontText = tally(visible.filter(ownText), (el) => cs(el).fontSize);
  const radii = tally(visible, (el) => { const r = cs(el).borderRadius; return r === '0px' ? null : r; });
  const buttons = visible.filter((el) => el.matches('button,[role="button"],a[class*="utton"]'));
  const btnStyles = tally(buttons, (el) => {
    const s = cs(el);
    return [s.borderRadius, s.fontSize, s.fontWeight, s.backgroundColor, s.borderTopWidth + ' ' + s.borderTopStyle + ' ' + s.borderTopColor].join(' | ');
  });
  const fills = tally(visible, (el) => { const b = cs(el).backgroundColor; return b === 'rgba(0, 0, 0, 0)' ? null : b; });
  // The audit's method (reproduced 146 el / 10 sizes on Templates over `body *`): every element, no visibility filter.
  const auditFont = tally(all, (el) => cs(el).fontSize);
  const auditRadii = tally(all, (el) => { const r = cs(el).borderRadius; return r === '0px' ? null : r; });
  const auditFills = tally(all, (el) => { const b = cs(el).backgroundColor; return b === 'rgba(0, 0, 0, 0)' ? null : b; });
  return JSON.stringify({
    root: '__ROOT__',
    auditMethod: {
      fontSizes: { distinct: Object.keys(auditFont).length, values: auditFont },
      radii: { distinct: Object.keys(auditRadii).length, values: auditRadii },
      fills: { distinct: Object.keys(auditFills).length, values: auditFills }
    },
    viewport: [innerWidth, innerHeight],
    theme: document.documentElement.getAttribute('data-theme'),
    elements: all.length,
    elementsVisible: visible.length,
    inlineStyled: root.querySelectorAll('[style]').length + (root.hasAttribute('style') ? 1 : 0),
    fontSizesAllVisible: { distinct: Object.keys(fontAll).length, values: fontAll },
    fontSizesTextBearing: { distinct: Object.keys(fontText).length, values: fontText },
    radii: { distinct: Object.keys(radii).length, values: radii },
    fills: { distinct: Object.keys(fills).length, values: fills },
    buttons: { count: buttons.length, distinctStyles: Object.keys(btnStyles).length, styles: btnStyles }
  });
})()
