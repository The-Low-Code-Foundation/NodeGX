new Promise((done) => {
  const WANT = (window.__want || 'EditorTopbar').split(',');
  const nameOf = (f) => { const t = f?.type; if (!t || typeof t === 'string') return null; return t.displayName || t.name || (t.render && (t.render.displayName || t.render.name)) || (t.type && (t.type.displayName || t.type.name)) || null; };
  const roots = [];
  for (const el of document.querySelectorAll('*')) for (const k of Object.keys(el)) if (k.startsWith('__reactContainer$')) roots.push(el[k]);
  const find = (name) => { let hit = null; const walk = (f, d) => { for (let c = f; c && !hit; c = c.sibling) { if (nameOf(c) === name) { hit = c; return; } if (c.child && d < 500) walk(c.child, d + 1); } }; for (const r of roots) { if (hit) break; const cur = r.current ?? r; walk(cur, 0); } return hit; };
  const hooks = (f) => { const out = []; for (let h = f?.memoizedState; h && out.length < 60; h = h.next) out.push(h.memoizedState); return out; };
  const short = (v) => { try { const s = typeof v === 'function' ? 'fn ' + v.name : JSON.stringify(v, (k, x) => (x && typeof x === 'object' && x.current !== undefined && Object.keys(x).length === 1 ? '{ref}' : x)); return String(s).slice(0, 140); } catch { return Object.prototype.toString.call(v); } };
  const res = {};
  const a = Object.fromEntries(WANT.map((n) => { const f = find(n); const live = f && (f.alternate && f.alternate.memoizedProps && f.alternate.actualStartTime > f.actualStartTime ? f.alternate : f); return [n, { f, props: live?.memoizedProps, hooks: hooks(live), parent: nameOf(f?.return) || f?.return?.type }]; }));
  setTimeout(() => {
    for (const n of WANT) {
      const f = a[n].f; if (!f) { res[n] = 'not found'; continue; }
      const cand = [f, f.alternate].filter(Boolean); const live = cand.sort((x, y) => (y.actualStartTime ?? 0) - (x.actualStartTime ?? 0))[0];
      const hb = hooks(live), ha = a[n].hooks; const changed = [];
      hb.forEach((v, i) => { if (v !== ha[i] && !(v && typeof v === 'object' && 'destroy' in v && 'create' in v)) changed.push([i, short(ha[i]), short(v)]); });
      const pk = Object.keys(live.memoizedProps || {}).filter((k) => (live.memoizedProps || {})[k] !== (a[n].props || {})[k]);
      res[n] = { rendered: live.memoizedProps !== a[n].props || changed.length > 0, propsChanged: pk, hooksChanged: changed.slice(0, 12), nHooks: hb.length };
    }
    done(res);
  }, 120);
})
