import * as path from 'path';
import * as ts from 'typescript';

import { Catalog, loadCatalog } from '../src/catalog';
import { emitApp } from '../src/emit/emitApp';
import { parseProject } from '../src/parse/parseProject';
import { ExportIR, NodeIR } from '../src/ir/types';
import { typecheckEmittedApp } from './helpers/typecheckApp';

/**
 * P18-S111-RECORDLIVE — a Record shows the app's one copy of its record.
 *
 * The runtime binds every Record to the process-wide `Model` for its Id (`Model.get(id)`, keyed by the id alone), and
 * with "Record properties" ticked under Run On Value Change (the default) every change to that Model re-flags the
 * node's `prop-*` outputs (dbmodelnode2.ts `onModelChangedCallback`). Three things write the Model: a read merges its
 * answer into it field by field (`CloudStore._fromJSON`: a Record's fetch, Query Records' rows, Create Record's
 * answer); Set Record Properties writes its values BEFORE the save, the answer's fields after it, and puts back what
 * the record held when the save fails (setdbmodelpropertiesnode.ts, P107-C34). Before this the exported Record's row
 * was component state written only by its own read, so a page kept the old title after a form elsewhere renamed it.
 *
 * §A the client: the held records, shipped only where a live Record is. §B the component: one subscription per live
 * Record whose row it holds, none for an unticked one, and the editor's own settle for a wired Fetch (NDA-017's
 * migration unticks an unstated box there, so that Record is not live in the editor either). §C the emitted client's
 * behaviour against a scripted wire, in the runtime's order. §D `tests/fixtures/record-desk`, exported whole and
 * typechecked.
 */

const RECORD_DESK = path.join(__dirname, 'fixtures', 'record-desk');
const PAGE_DESK = path.join(__dirname, 'fixtures', 'page-desk');
const catalog: Catalog = loadCatalog();

type AnyModule = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const emitWith = (dir: string, edit: (ir: ExportIR) => void = () => undefined) => {
  const ir = parseProject(dir, catalog);
  edit(ir);
  return emitApp(ir, catalog);
};

const nodeOf = (ir: ExportIR, id: string): NodeIR => {
  for (const component of ir.components) {
    const node = component.nodes.find((n) => n.id === id);
    if (node) return node;
  }
  throw new Error(`no node ${id}`);
};

/** Sets a node's literal parameter, replacing what the file (or the parser's settle) put there. */
const setParam = (ir: ExportIR, id: string, name: string, value: string | number | boolean) => {
  const node = nodeOf(ir, id);
  node.parameters = [...node.parameters.filter((p) => p.name !== name), { name, value: { kind: 'literal', value } }];
};

const count = (text: string, needle: string): number => text.split(needle).length - 1;

const PLAIN_UPDATE = `export async function update<T extends { id: string }>(collection: string, id: string, data: Partial<T>): Promise<T> {
  // The wire answers a PUT with the changed fields only (\`updatedAt\`), so the
  // caller's own data is the record the graph continues with.
  const response = await request<Record<string, unknown>>(\`/classes/\${collection}/\${encodeURIComponent(id)}\`, {
    method: 'PUT',
    body: data
  });
  const { objectId: _objectId, ...fields } = response;
  return { ...data, ...fields, id } as unknown as T;
}`;

const SUBSCRIBE_SHOWN =
  '  useEffect(() => (shownPageRow?.id === undefined ? undefined : subscribeRecord<Page>(shownPageRow.id, setShownPageRow)), [shownPageRow?.id]);';

describe('§A the client holds one copy of each record, only where a live Record is', () => {
  const live = emitWith(RECORD_DESK).files['src/api/client.ts'];
  const frozen = emitWith(RECORD_DESK, (ir) => setParam(ir, 'shownRec', 'runOnChange-record', false)).files['src/api/client.ts'];

  it('a live Record ships the held records and the subscription', () => {
    expect(count(live, 'const heldRecords = new Map<string, HeldRecord>();')).toBe(1);
    expect(count(live, 'export function subscribeRecord<T extends { id: string }>(id: string, listener: (row: T) => void): () => void {')).toBe(1);
  });

  it('every read merges into it: the fetch, the query rows, the create answer', () => {
    expect(live).toContain('  return holdRecord(fromWire<T>(response));');
    expect(live).toContain('  return response.results.map((record) => holdRecord(fromWire<T>(record)));');
    expect(live).toContain('  return holdRecord(fromWire<T>({ ...data, ...response }));');
  });

  it('the update writes before the save, puts back on failure, and merges the answer after', () => {
    const update = live.slice(live.indexOf('export async function update<'), live.indexOf('export async function remove('));
    const order = ['holdRecord({ ...data, id });', 'await request<', 'holdRecord({ ...before, id });', 'throw error;', 'holdRecord({ ...fields, id });'];
    const at = order.map((line) => update.indexOf(line));
    expect(at.every((i) => i >= 0)).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
    expect(update).not.toBe('');
  });

  it('with every Record unticked the client is the plain one — no held records, the update as it was', () => {
    for (const needle of ['heldRecords', 'holdRecord', 'subscribeRecord']) expect(frozen).not.toContain(needle);
    expect(frozen).toContain(PLAIN_UPDATE);
    expect(frozen).toContain('  return fromWire<T>(response);');
  });
});

describe('§B the component subscribes a live Record’s row, and nothing else', () => {
  const home = emitWith(RECORD_DESK).files['src/pages/Home.tsx'];

  it('the ticked Record follows the client’s copy of the record it last read; the unticked one does not', () => {
    expect(count(home, 'subscribeRecord<')).toBe(1);
    expect(home).toContain(SUBSCRIBE_SHOWN);
    expect(home).not.toContain('subscribeRecord<Page>(frozenPageRow');
    expect(home).toContain("import { subscribeRecord } from '../api/client';");
    // `useRef`: the page's text input announces its Value at mount (P18-S116-FIELDMOUNT).
    expect(home).toMatch(/^import \{ useEffect, useRef, useState \} from 'react';$/m);
  });

  it('unticked everywhere, no subscription and no import', () => {
    const frozen = emitWith(RECORD_DESK, (ir) => setParam(ir, 'shownRec', 'runOnChange-record', false)).files['src/pages/Home.tsx'];
    expect(frozen).not.toContain('subscribeRecord');
  });

  it('a wired Fetch with the box unstated is settled unticked, as the editor settles it (NDA-017); ticked by hand it is live', () => {
    const settled = emitWith(PAGE_DESK).files['src/pages/Home.tsx'];
    expect(settled).not.toContain('subscribeRecord<Page>(pageRow');
    // The live Record's Fetch is unwired: its Id binds the row to the copy it names (P18-S113-IDBINDREAD), one subscription.
    expect(settled).toContain('return subscribeRecord<Page>(livePageRecordId, setLivePageRow);');
    expect(settled).not.toContain('subscribeRecord<Page>(livePageRow.id');
    const ticked = emitWith(PAGE_DESK, (ir) => setParam(ir, 'pageRec', 'runOnChange-record', true)).files['src/pages/Home.tsx'];
    expect(ticked).toContain('  useEffect(() => (pageRow?.id === undefined ? undefined : subscribeRecord<Page>(pageRow.id, setPageRow)), [pageRow?.id]);');
  });

  it('with no backend there is no client and no copy: no subscription, and the app still typechecks', () => {
    const app = emitWith(RECORD_DESK, (ir) => {
      ir.project.cloudservices = undefined;
    });
    expect(app.files['src/api/client.ts']).toBeUndefined();
    expect(app.files['src/pages/Home.tsx']).not.toContain('subscribeRecord');
    expect(typecheckEmittedApp(app)).toEqual([]);
  });

  it('the form that writes the record is unchanged — the client carries the write', () => {
    const rename = emitWith(RECORD_DESK).files['src/components/Rename.tsx'];
    expect(rename).toContain('await updatePage(renamePageRecordId, { title: newTitle });');
    expect(rename).not.toContain('subscribeRecord');
  });
});

// ---- §C the emitted client, evaluated against a scripted wire ------------------------------------------------------

interface Call {
  method: string;
  url: string;
  body: unknown;
  answer: (status: number, body: unknown) => void;
}

/** A `fetch` whose every request waits until the row answers it, so a reading can be taken while one is in flight. */
const scriptedWire = () => {
  const calls: Call[] = [];
  const fetch = (url: string, init: { method: string; body?: string }) =>
    new Promise((resolve) => {
      calls.push({
        method: init.method,
        url,
        body: init.body === undefined ? undefined : JSON.parse(init.body),
        answer: (status, body) => resolve({ ok: status >= 200 && status < 300, status, text: async () => JSON.stringify(body) })
      });
    });
  return { calls, fetch };
};

const loadClient = (source: string, fetch: unknown): AnyModule => {
  const plain = source.replace(/import\.meta\.env\.VITE_NODEGX_\w+/g, 'undefined');
  const js = ts.transpileModule(plain, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const module = { exports: {} as AnyModule };
  // eslint-disable-next-line no-new-func
  new Function('require', 'module', 'exports', 'fetch', js)(() => ({}), module, module.exports, fetch);
  return module.exports;
};

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('§C what a live Record sees, through the emitted client, in the runtime’s order', () => {
  const source = emitWith(RECORD_DESK).files['src/api/client.ts'];

  /** A client, a wire, and every row the subscriber for `p1` was handed, as titles. */
  const world = () => {
    const wire = scriptedWire();
    const client = loadClient(source, wire.fetch);
    const seen: Array<Record<string, unknown>> = [];
    return { wire, client, seen, follow: (id = 'p1') => client.subscribeRecord(id, (row: Record<string, unknown>) => seen.push(row)) };
  };

  it('a subscriber to a record nobody has read is handed nothing; the read hands it the row', async () => {
    const { wire, client, seen, follow } = world();
    follow();
    expect(seen).toEqual([]);
    const read = client.fetchOne('Page', 'p1');
    await tick();
    expect(wire.calls[0]).toMatchObject({ method: 'GET', url: 'http://localhost:8581/classes/Page/p1' });
    wire.calls[0].answer(200, { objectId: 'p1', title: 'Home' });
    expect(await read).toEqual({ id: 'p1', title: 'Home' });
    expect(seen).toEqual([{ id: 'p1', title: 'Home' }]);
  });

  it('a subscriber arriving after the read is handed the row at once (the Record binds the Model that is already filled)', async () => {
    const { wire, client, seen, follow } = world();
    const read = client.fetchOne('Page', 'p1');
    await tick();
    wire.calls[0].answer(200, { objectId: 'p1', title: 'Home' });
    const row = await read;
    follow();
    expect(seen).toEqual([{ id: 'p1', title: 'Home' }]);
    // The very object the read returned, so a row set from it and then handed it again does not re-render.
    expect(seen[0]).toBe(row);
  });

  it('an update shows at the press, before the backend answers, then carries the answer’s fields', async () => {
    const { wire, client, seen, follow } = world();
    const read = client.fetchOne('Page', 'p1');
    await tick();
    wire.calls[0].answer(200, { objectId: 'p1', title: 'Home', published: true });
    await read;
    follow();
    const save = client.update('Page', 'p1', { title: 'Welcome' });
    expect(seen.map((r) => r.title)).toEqual(['Home', 'Welcome']);
    await tick();
    expect(wire.calls[1]).toMatchObject({ method: 'PUT', url: 'http://localhost:8581/classes/Page/p1', body: { title: 'Welcome' } });
    wire.calls[1].answer(200, { updatedAt: '2026-10-15T21:00:00.000Z' });
    await save;
    expect(seen[seen.length - 1]).toEqual({ id: 'p1', title: 'Welcome', published: true, updatedAt: '2026-10-15T21:00:00.000Z' });
  });

  it('a refused update puts back what the record held (P107-C34) and still throws to the node’s Failure', async () => {
    const { wire, client, seen, follow } = world();
    const read = client.fetchOne('Page', 'p1');
    await tick();
    wire.calls[0].answer(200, { objectId: 'p1', title: 'Home' });
    await read;
    follow();
    const save = client.update('Page', 'p1', { title: 'Welcome', navOrder: 3 });
    await tick();
    wire.calls[1].answer(400, { code: 101, error: 'Object not found.' });
    await expect(save).rejects.toThrow('Object not found.');
    expect(seen.map((r) => [r.title, r.navOrder])).toEqual([
      ['Home', undefined],
      ['Welcome', 3],
      ['Home', undefined]
    ]);
  });

  it('a query’s rows merge into the copy — a list read elsewhere refreshes the Record', async () => {
    const { wire, client, seen, follow } = world();
    follow();
    const list = client.query('Page', {});
    await tick();
    expect(wire.calls[0]).toMatchObject({ method: 'POST', url: 'http://localhost:8581/classes/Page' });
    wire.calls[0].answer(200, { results: [{ objectId: 'p1', title: 'Home' }, { objectId: 'p2', title: 'About' }] });
    expect((await list).map((r: { title: string }) => r.title)).toEqual(['Home', 'About']);
    expect(seen).toEqual([{ id: 'p1', title: 'Home' }]);
  });

  it('a read merges field by field, as `_fromJSON` does: a field the answer lacks keeps what the record held', async () => {
    const { wire, client, seen, follow } = world();
    follow();
    const first = client.fetchOne('Page', 'p1');
    await tick();
    wire.calls[0].answer(200, { objectId: 'p1', title: 'Home', note: 'kept' });
    await first;
    const second = client.fetchOne('Page', 'p1');
    await tick();
    wire.calls[1].answer(200, { objectId: 'p1', title: 'Home again' });
    expect(await second).toEqual({ id: 'p1', title: 'Home again', note: 'kept' });
    expect(seen[seen.length - 1]).toEqual({ id: 'p1', title: 'Home again', note: 'kept' });
  });

  it('a created record is held, so a Record bound to its new id is handed it', async () => {
    const { wire, client, seen, follow } = world();
    const made = client.create('Page', { title: 'New' });
    await tick();
    wire.calls[0].answer(201, { objectId: 'p9', createdAt: '2026-10-15T21:00:00.000Z' });
    await made;
    follow('p9');
    expect(seen).toEqual([{ id: 'p9', title: 'New', createdAt: '2026-10-15T21:00:00.000Z' }]);
  });

  it('another record’s write is not this one’s, and an unsubscribed listener hears nothing more', async () => {
    const { wire, client, seen, follow } = world();
    const stop = follow();
    const other = client.update('Page', 'p2', { title: 'About' });
    await tick();
    wire.calls[0].answer(200, {});
    await other;
    expect(seen).toEqual([]);
    stop();
    const mine = client.update('Page', 'p1', { title: 'Home' });
    await tick();
    wire.calls[1].answer(200, {});
    await mine;
    expect(seen).toEqual([]);
  });
});

describe('§D tests/fixtures/record-desk, exported whole', () => {
  const app = emitWith(RECORD_DESK);

  it('translates with nothing left over — the two notes are the router shell and the backend, not refusals', () => {
    expect(app.notes).toEqual([
      'App: router shell — emitted as src/App.tsx by the scaffold',
      "api modules connect to the project's NodeGX backend at http://localhost:8581 (src/api/client.ts; .env.example overrides the endpoint)"
    ]);
  });

  it('the form reads its Id once, so the update is narrowed (P18-S113-IDREADTWICE)', () => {
    const rename = app.files['src/components/Rename.tsx'];
    expect(rename).toContain(
      "            const renamePageRecordId = pageId.get();\n            if (!renamePageRecordId) throw new Error('Missing Record Id');\n            await updatePage(renamePageRecordId, { title: newTitle });"
    );
    expect(count(rename, 'pageId.get()')).toBe(1);
  });

  it('typechecks', () => {
    expect(typecheckEmittedApp(app)).toEqual([]);
  });

  it('page-desk typechecks with its live Record too', () => {
    expect(typecheckEmittedApp(emitWith(PAGE_DESK))).toEqual([]);
  });
});
