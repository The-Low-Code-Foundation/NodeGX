new Promise((done) => {
  let req; window.webpackChunknoodl_editor.push([[Symbol('x')], {}, (r) => { req = r; }]);
  const id = Object.keys(req.m).find((k) => /models\/warningsmodel/.test(k));
  const WM = req(id).WarningsModel.instance;
  window.__WM = WM;
  const stacks = {}; let calls = 0, notifies = 0;
  const wrap = (name) => { const orig = WM[name]; WM[name] = function (...a) { calls++; const s = (new Error().stack || '').split('\n').slice(2, 7).map((l) => l.trim().replace(/webpack-internal:\/\/\/|\(.*\/src\//g, '').slice(0, 110)).join(' | '); const k = name + ' :: ' + s; stacks[k] = (stacks[k] || 0) + 1; return orig.apply(this, a); }; return () => { WM[name] = orig; }; };
  const undo = ['setWarning', 'clearWarningsForRef', 'clearAllWarningsForComponent', 'clearWarningsForRefMatching', 'clearAllWarnings'].map(wrap);
  const g = { id: '__probe' }; WM.on('warningsChanged', () => notifies++, g);
  setTimeout(() => { undo.forEach((u) => u()); WM.off(g); done({ moduleId: id, calls, notifies, top: Object.entries(stacks).sort((a, b) => b[1] - a[1]).slice(0, 6) }); }, 1000);
})
