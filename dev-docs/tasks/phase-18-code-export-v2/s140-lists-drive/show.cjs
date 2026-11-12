// Prints readings.json step by step: the page's lines, its fields, and the store's sets.
const r = require('./readings.json');
for (const arm of Object.keys(r).filter((k) => k === 'runtime' || k.startsWith('export-'))) {
  const a = r[arm];
  console.log('=== ' + arm, a.stoppedAt || '');
  for (const s of ['L0', 'L1', 'L2', 'L3', 'L4open', 'L4typed', 'L4', 'L5ask', 'L5', 'L6']) {
    const x = a[s];
    if (!x) continue;
    const st = x.store && x.store.app;
    console.log(s, 'pressed=' + x.pressed, '| lines:', JSON.stringify(x.lines.slice(4, 18)));
    if (x.fields.length) console.log('   fields:', JSON.stringify(x.fields.map((f) => [f.tag, f.value])));
    console.log('   store:', st ? JSON.stringify(st.sets.map((s) => [s.id, s.name, s.items.length, s.items.map((i) => i.q + '=' + i.a).join(' | ')])) : x.store, st ? 'profiles=' + st.profiles.length + ' active=' + st.activeId : '');
  }
  console.log('console:', JSON.stringify(a.console || []).slice(0, 1500));
}
