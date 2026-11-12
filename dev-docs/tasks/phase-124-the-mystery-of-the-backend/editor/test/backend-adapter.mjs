// BKO-008 — the map's own adapter for the backend suite (lib/suite.mjs). Each edit is the request the map's page sends
// for the gesture (public/app.js `gesture`): the same body, the stamps the page last saw, through the map's own server
// (createEditor + serve). A refusal (409) is thrown with the map's sentence. It imports the package by its name, so the
// same file grades an installed copy (BKO-008 AC3).
import { createEditor, serve } from '@nodegx/backend-map';

export default function mapAdapter() {
  let server;
  let base;
  const post = async (p, body) => {
    const r = await fetch(base + p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const json = await r.json();
    if (!r.ok) throw new Error(json.error ?? `${p} said ${r.status}`);
    return json;
  };
  const seen = async () => {
    const m = await fetch(base + '/api/map').then((r) => r.json());
    return { etag: m.etag, fileStamp: m.fileStamp, automationsStamp: m.automationsStamp };
  };
  return {
    name: 'the backend map',
    async open({ project, backend, token }) {
      server = await serve(createEditor({ project, backend, token }), 0);
      base = `http://127.0.0.1:${server.address().port}/`;
    },
    async apply(edit) {
      const m = await seen();
      // the page asks "anyone at all" twice before it sends confirmPublic; a script that grants it has said so
      if (edit.kind === 'grant') return void (await post('api/hand/rule', { table: edit.table, who: edit.who, what: edit.what ?? 'both', confirmPublic: edit.who === 'public', etag: m.etag, fileStamp: m.fileStamp }));
      if (edit.kind === 'revoke') return void (await post('api/hand/rule', { table: edit.table, who: edit.who, cut: true, etag: m.etag, fileStamp: m.fileStamp }));
      if (edit.kind === 'add_trigger') return { id: (await post('api/hand/trigger', { fn: edit.fn, table: edit.table, actions: edit.actions, automationsStamp: m.automationsStamp })).trigger.id };
      if (edit.kind === 'schedule') return { id: (await post('api/hand/trigger', { fn: edit.fn, cron: edit.cron, automationsStamp: m.automationsStamp })).trigger.id };
      if (edit.kind === 'remove_trigger') return void (await post('api/hand/trigger-remove', { id: edit.trigger, automationsStamp: m.automationsStamp }));
      if (edit.kind === 'turn_off') return void (await post('api/hand/trigger-enabled', { id: edit.trigger, enabled: false, automationsStamp: m.automationsStamp }));
      throw new Error(`the map has no gesture for “${edit.kind}”`);
    },
    close: () => new Promise((r) => (server ? server.close(r) : r()))
  };
}
