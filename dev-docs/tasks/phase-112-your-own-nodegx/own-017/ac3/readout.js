(() => {
  const r = window.__wreq;
  const P = r('./src/editor/src/models/projectmodel.ts').ProjectModel.instance;
  const W = r('./src/editor/src/models/warningsmodel.ts').WarningsModel.instance;
  const rows = [];
  for (const [comp, refs] of Object.entries(W.warnings || {}))
    for (const [ref, keys] of Object.entries(refs || {}))
      for (const [key, w] of Object.entries(keys || {}))
        rows.push([comp, key, (w.warning && (w.warning.message || w.warning.type || JSON.stringify(w.warning))) + ''].join(' :: ').slice(0, 300));
  return { dir: P && P._retainedProjectDirectory, name: P && P.name, components: P && P.getComponents().length, warnings: rows.length, rows };
})()
