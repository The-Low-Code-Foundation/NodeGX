new Promise((done) => {
  const nameOf = (f) => { const t = f.type; if (!t) return null; if (typeof t === 'string') return null; return t.displayName || t.name || (t.render && (t.render.displayName || t.render.name)) || (t.type && (t.type.displayName || t.type.name)) || null; };
  const roots = [];
  for (const el of document.querySelectorAll('*')) for (const k of Object.keys(el)) if (k.startsWith('__reactContainer$') || k === '_reactRootContainer') roots.push(el[k]?.current ?? el[k]?._internalRoot?.current ?? el[k]);
  const snap = () => { const m = new Map(); const walk = (f, path, depth) => { for (let c = f; c; c = c.sibling) { const n = nameOf(c); const p = n ? [...path, n] : path; const id = c.alternate && m.has(c.alternate) ? c.alternate : c; m.set(c, { props: c.memoizedProps, state: c.memoizedState, path: p }); if (c.child && depth < 400) walk(c.child, p, depth + 1); } }; for (const r of roots) if (r) walk(r, [], 0); return m; };
  const a = snap();
  setTimeout(() => {
    const b = snap(); const counts = {};
    // a fiber that re-rendered has a new memoizedProps object; count by the component name at the END of its path
    for (const [f, v] of b) { const prev = a.get(f) ?? (f.alternate && a.get(f.alternate)); if (!prev) continue; if (prev.props !== v.props && typeof f.type !== 'string' && nameOf(f)) { const key = v.path.slice(-4).join(' > '); counts[key] = (counts[key] || 0) + 1; } }
    done({ roots: roots.length, fibers: b.size, rerendered: Object.entries(counts).sort((x, y) => y[1] - x[1]).slice(0, 25) });
  }, 300);
})
