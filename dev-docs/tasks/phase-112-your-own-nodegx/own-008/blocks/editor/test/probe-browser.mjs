// Compares the settings the editor offers with the running app's own node library (the preview's
// `nodeLibrary`), as a second source beside @nodegx/node-spec. Run: node test/probe-browser.mjs
import path from 'node:path';
import { startEditor, editor } from './browser-harness.mjs';
import { KINDS } from '../public/words.js';

const run = await startEditor(path.resolve(editor, '../todo-list'), 'probe');
try {
  await run.page.waitForFunction(() => window.bigBlocks?.state.preview?.nodeLibrary, { timeout: 60000 });
  const wanted = Object.fromEntries(Object.entries(KINDS).filter(([, k]) => k.settings.length).map(([t, k]) => [t, k.settings.map((s) => s.param)]));
  wanted['net.noodl.controls.button'].push('onClick');
  const found = await run.page.evaluate((wanted) => {
    const lib = window.bigBlocks.state.preview.nodeLibrary;
    const out = {};
    for (const [type, names] of Object.entries(wanted)) {
      const t = (lib.nodetypes || []).find((n) => n.name === type);
      const ports = t ? (t.ports || []).map((p) => p.name) : null;
      out[type] = ports ? names.map((n) => `${n}:${ports.includes(n) ? 'yes' : 'NO'}`) : ['type not in the library'];
    }
    return out;
  }, wanted);
  console.log(JSON.stringify(found, null, 1));
} finally {
  await run.stop();
}
