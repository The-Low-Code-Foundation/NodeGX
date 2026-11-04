new Promise((done) => {
  const by = {}; let n = 0;
  const key = (m) => { const t = m.target; const el = t.nodeType === 1 ? t : t.parentElement; const cls = el ? String(el.className || '').split(' ')[0].slice(0, 50) : '?'; return `${m.type}:${el?.tagName}.${cls}${m.attributeName ? '@' + m.attributeName : ''}`; };
  const ob = new MutationObserver((ms) => { for (const m of ms) { n++; const k = key(m); by[k] = (by[k] || 0) + 1; } });
  ob.observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true });
  setTimeout(() => { ob.disconnect(); const top = Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 8); const portal = document.querySelector('.dialog-layer-portal-target'); done({ total: n, top, portalKids: portal?.children.length ?? null }); }, 2000);
})
