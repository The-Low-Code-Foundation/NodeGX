// CHR-009 §19.2 (s24) — AC2's fills and radii ATTRIBUTED: every visible element of .sidebar-property-editor grouped by computed
// background / top-left radius, colours matched back to their --theme-color-* names. Select a node first.
//   NOODL_REMOTE_DEBUG_PORT=9333 node scripts/devtools/cdp.js eval "$(cat paints.js)"
(() => {
  const panel = document.querySelector('.sidebar-property-editor');
  const pr = panel.getBoundingClientRect(); const vh = window.innerHeight;
  const visible = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.bottom > Math.max(pr.top, 0) && r.top < vh; };
  const probe = document.createElement('div'); document.body.appendChild(probe);
  const root = getComputedStyle(document.documentElement);
  const names = [...new Set([...document.styleSheets].flatMap(s => { try { return [...s.cssRules] } catch { return [] } }).flatMap(r => r.style ? [...r.style].filter(p => p.startsWith('--theme-color-')) : []))];
  const tokenOf = {}; for (const n of names) { probe.style.backgroundColor = `var(${n})`; const c = getComputedStyle(probe).backgroundColor; (tokenOf[c] = tokenOf[c] || []).push(n.replace('--theme-color-', '')); }
  const radiusTok = {}; for (const n of ['--radius-sm','--radius-default','--radius-md','--radius-lg','--radius-full']) radiusTok[root.getPropertyValue(n).trim()] = n;
  probe.remove();
  const kind = (el) => { const c = String(el.className || '').split(/\s+/).filter(Boolean).map(x => x.replace(/-module__/, '.').replace(/--[A-Za-z0-9_-]{5}$/, '')).slice(0, 2).join(' '); return `${el.tagName.toLowerCase()}${c ? ' ' + c : ''}`; };
  const fills = {}, radii = {};
  for (const el of [...panel.querySelectorAll('*')].filter(visible)) {
    const cs = getComputedStyle(el);
    const bg = cs.backgroundColor;
    if (bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') { const k = `${bg} = ${(tokenOf[bg] || ['?']).slice(0, 3).join('|')}`; fills[k] = fills[k] || {}; fills[k][kind(el)] = (fills[k][kind(el)] || 0) + 1; }
    const rad = cs.borderTopLeftRadius;
    if (rad !== '0px') { const k = `${rad} ${radiusTok[rad] || ''}`; radii[k] = radii[k] || {}; radii[k][kind(el)] = (radii[k][kind(el)] || 0) + 1; }
  }
  return JSON.stringify({ theme: document.documentElement.dataset.theme, fills, radii }, null, 1);
})()
