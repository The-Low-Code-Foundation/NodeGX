import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

import { Catalog, loadCatalog } from '../src/catalog';
import { emitApp } from '../src/emit/emitApp';
import { parseProject } from '../src/parse/parseProject';
import { typecheckEmittedApp } from './helpers/typecheckApp';
import { ExportIR, ComponentIR, ConnectionIR, NodeIR, ParamValue } from '../src/ir/types';
import { withoutAnnouncement } from './helpers/fieldMount';

/**
 * EXP-011 §43 — `Record` (`DbModel2`), the second of the nine Cloud Services and the most used of
 * the eight that were left (22 corpus nodes, every one `idSource: explicit`).
 * A read by Id through the class's collection module: `fetch<Type>ById(id)` beside the query and
 * the record verbs, the row typed by the class's interface (the schema snapshot first, then the
 * columns the graph reads as `unknown`). Connected, it goes through the client's `fetchOne()` —
 * the runtime's own `GET /classes/<class>/<id>` (`ParseWireAdapter.fetch`). Unconnected, the stub
 * throws, because a record that does not exist is a Failure in the interpreter too.
 * Two forms, decided by the `Fetch` port: wired, a handler action (the Cloud Function's
 * try/catch, with the runtime's own `Missing Id.` thrown for an empty Id — `scheduleFetch`);
 * unwired, a bind: a `useEffect` keyed on the Id that makes the row the client's copy of that
 * record (`setModelID`, `Model.get(id)`), with no request (P18-S113-IDBINDREAD — §43 first read
 * `controlSignal: 'fetch'` as a read on every Id change; it governs whether the Id rebinds).
 * §A the module, §B the component, §C every refusal by its sentence, §D the §40 class rows for
 * this node, §E the fixture `tests/fixtures/page-desk` — both forms on one page, a backend and a
 * schema declared — exported whole and typechecked.
 */

const FIXTURE = path.join(__dirname, 'fixtures', 'cheer');
const PAGE_DESK = path.join(__dirname, 'fixtures', 'page-desk');
const catalog: Catalog = loadCatalog();
const baseIr = parseProject(FIXTURE, catalog);

const literal = (value: string | number | boolean): ParamValue => ({ kind: 'literal', value });

const connect = (
  component: ComponentIR,
  from: string,
  fromProperty: string,
  to: string,
  toProperty: string,
  kind: ConnectionIR['kind'] = 'value'
) => {
  component.connections.push({
    key: `${from}:${fromProperty}->${to}:${toProperty}`,
    fromId: from,
    fromProperty,
    toId: to,
    toProperty,
    kind
  });
};

const addNode = (component: ComponentIR, node: Partial<NodeIR> & { id: string; type: string }): NodeIR => {
  const full: NodeIR = {
    catalogRef: node.type,
    parameters: [],
    declaredPorts: [],
    portKnowledge: 'complete',
    ...node
  } as NodeIR;
  component.nodes.push(full);
  return full;
};

type App = ReturnType<typeof emitApp>;
const notesFile = (app: App) => app.files[Object.keys(app.files).find((k) => k.endsWith('Notes.tsx'))!];
const pagesFile = (app: App) => app.files['src/api/pages.ts'];
const deferralFor = (app: App, nodeId: string): string =>
  app.notes.find((n) => n.includes(`node ${nodeId}`) && n.includes('deferred')) ?? app.notes.join('\n');

const expectParses = (app: App) => {
  for (const [file, source] of Object.entries(app.files)) {
    if (!file.endsWith('.ts') && !file.endsWith('.tsx')) continue;
    const sf = ts.createSourceFile(file, source, ts.ScriptTarget.ESNext, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const diagnostics = (sf as unknown as { parseDiagnostics: ts.Diagnostic[] }).parseDiagnostics ?? [];
    expect(diagnostics.map((d) => `${file}: ${ts.flattenDiagnosticMessageText(d.messageText, ' ')}`).join('\n')).toBe('');
  }
};

const BACKEND = { instanceId: 'backend_x', endpoint: 'http://localhost:8581', appId: 'backend_x', type: 'nodegx' };
const SCHEMA = [
  {
    name: 'Page',
    columns: [
      { name: 'title', type: 'String' },
      { name: 'published', type: 'Boolean' },
      { name: 'navOrder', type: 'Number' }
    ]
  }
];

/** A graph on the Notes page; `connected` gives the project a backend, `schema` a snapshot of `Page`. */
const withGraph = (build: (notes: ComponentIR) => void, options: { connected?: boolean; schema?: boolean } = {}): App => {
  const ir: ExportIR = JSON.parse(JSON.stringify(baseIr));
  if (options.connected) (ir.project as { cloudservices?: typeof BACKEND }).cloudservices = BACKEND;
  if (options.schema) (ir.project as { collections: unknown }).collections = SCHEMA;
  build(ir.components.find((c) => c.path === 'Pages/Notes')!);
  return emitApp(ir, catalog);
};

/** `Page` by explicit Id, labelled "Page". */
const addRecord = (notes: ComponentIR, extra: Partial<NodeIR> = {}) =>
  addNode(notes, {
    id: 'rec',
    type: 'DbModel2',
    authoredLabel: 'Page',
    parameters: [
      { name: 'collectionName', value: literal('Page') },
      { name: 'idSource', value: literal('explicit') }
    ],
    ...extra
  });
const addBareSetter = (notes: ComponentIR, id: string, variable: string) =>
  addNode(notes, { id, type: 'Set Variable', parameters: [{ name: 'name', value: literal(variable) }] });
/** The wired form: Id from the draft variable, Fetch from the Add button, Done and Failure chains fed by the node. */
const base = (notes: ComponentIR) => {
  addRecord(notes);
  connect(notes, 'noteDraftVar', 'value', 'rec', 'modelId');
  connect(notes, 'addButton', 'onClick', 'rec', 'fetch', 'signal');
  addBareSetter(notes, 'after', 'lastPublished');
  connect(notes, 'rec', 'done', 'after', 'do', 'signal');
  connect(notes, 'rec', 'prop-title', 'after', 'value');
  addBareSetter(notes, 'onFail', 'lastError');
  connect(notes, 'rec', 'failure', 'onFail', 'do', 'signal');
  connect(notes, 'rec', 'error', 'onFail', 'value');
};
/** The bind form (P18-S113-IDBINDREAD): Id from the draft variable, Fetch unwired, the title on the heading. */
const baseEffect = (notes: ComponentIR) => {
  addRecord(notes);
  connect(notes, 'noteDraftVar', 'value', 'rec', 'modelId');
  connect(notes, 'rec', 'prop-title', 'notesHeading', 'text');
};
const BIND =
  "  // Page — bound to the app's copy of the record its Id names, whenever the Id changes; binding reads nothing (dbmodelnode2.ts setModelID).\n" +
  '  useEffect(() => {\n' +
  '    const pageRecordId = draft;\n' +
  "    if (pageRecordId === undefined || pageRecordId === null || pageRecordId === '') return undefined;\n" +
  '    return subscribeRecord<Page>(pageRecordId, setPageRow);\n' +
  '  }, [draft]);';

const HANDLER =
  '          try {\n' +
  '            const pageRecordId = noteDraft.get();\n' +
  "            if (pageRecordId === undefined || pageRecordId === null || pageRecordId === '') throw new Error('Missing Id.');\n" +
  '            const pageRecord = await fetchPageById(pageRecordId);\n' +
  '            lastPublished.set(pageRecord.title);\n' +
  '          } catch (error) {\n' +
  '            const pageMessage = error instanceof Error ? error.message : String(error);\n' +
  '            setPageError(pageMessage);\n' +
  // EXP-011 §54. dbmodelnode2.ts raises record/storage-op-failed (Missing Id. included) before the failure pulse.
  "            raiseAppError({ code: 'record/storage-op-failed', message: pageMessage, nodeId: 'rec', nodeType: 'DbModel2', componentName: '/Pages/Notes' });\n" +
  '            lastError.set(pageMessage);\n' +
  '          }';

describe('EXP-011 §43 §A — the collection module', () => {
  it('connected: the read joins the class module through the client’s fetchOne, the interface from the schema', () => {
    const app = withGraph(base, { connected: true, schema: true });
    const pages = pagesFile(app);
    expect(pages).toContain("import { fetchOne } from './client';");
    expect(pages).toContain('export interface Page {\n  id: string;\n  title?: string;\n  published?: boolean;\n  navOrder?: number;\n}');
    expect(pages).toContain("export async function fetchPageById(id: string): Promise<Page> {\n  return fetchOne<Page>('Page', id);\n}");
    expect(pages).toContain('Source: "Page" (DbModel2 `rec` on /Pages/Notes)');
    expect(app.files['src/api/client.ts']).toContain('export async function fetchOne<T extends { id: string }>(collection: string, id: string): Promise<T> {');
    expect(typecheckEmittedApp(app)).toEqual([]);
  });

  it('stub: the read throws — a record that does not exist is a Failure in the interpreter too', () => {
    const app = withGraph(base, { schema: true });
    const pages = pagesFile(app);
    expect(pages).not.toContain("from './client'");
    expect(pages).toContain("export async function fetchPageById(id: string): Promise<Page> {\n  throw new Error('fetchPageById is not connected to a backend yet');\n}");
    expect(pages).toContain('TODO(export): "Page" (DbModel2 `rec` on /Pages/Notes)');
    expect(app.files['src/api/client.ts']).toBeUndefined();
    expect(typecheckEmittedApp(app)).toEqual([]);
  });

  it('a column the schema does not declare is in the interface as unknown; with no schema at all every read is', () => {
    const app = withGraph((notes) => {
      base(notes);
      connect(notes, 'rec', 'prop-slug', 'notesHeading', 'text');
    }, { connected: true, schema: true });
    expect(pagesFile(app)).toContain('export interface Page {\n  id: string;\n  title?: string;\n  published?: boolean;\n  navOrder?: number;\n  slug?: unknown;\n}');
    const bare = withGraph(base, { connected: true });
    expect(pagesFile(bare)).toContain('export interface Page {\n  id: string;\n  title?: unknown;\n}');
    expect(typecheckEmittedApp(app)).toEqual([]);
  });
});

describe('EXP-011 §43 §B — the component', () => {
  it('Fetch wired: a try/catch in the handler with the runtime’s own Missing Id. thrown for an empty Id, the chains as its arms', () => {
    const app = withGraph(base, { connected: true, schema: true });
    const page = notesFile(app);
    expect(page).toContain('onClick={async () => {');
    // ⚠️ Ten spaces: the handler's own column, read off the emitted file rather than a printout.
    expect(page).toContain(HANDLER);
    // The chain reads the local; nothing outside the chain reads a column, so there is no row.
    expect(page).not.toContain('setPageRow(');
    expect(page).not.toContain('pageRow');
    expect(page).toContain('const [pageError, setPageError] = useState<string | undefined>();');
    expect(page).toContain("import { fetchPageById } from '../api/pages';");
    expect(typecheckEmittedApp(app)).toEqual([]);
  });

  it('a column read in render binds the row, which the read writes, and the type is imported', () => {
    const app = withGraph((notes) => {
      base(notes);
      connect(notes, 'rec', 'prop-title', 'notesHeading', 'text');
    }, { connected: true, schema: true });
    const page = notesFile(app);
    expect(page).toContain('const [pageRow, setPageRow] = useState<Page | undefined>();');
    expect(page).toContain('setPageRow(pageRecord);');
    // A string column folds like every string-typed read — no coercion.
    expect(page).toContain("{pageRow?.title ?? ''}");
    expect(page).toContain("import { fetchPageById, type Page } from '../api/pages';");
    expect(typecheckEmittedApp(app)).toEqual([]);
  });

  it('a boolean or number column in a Text or a string attribute is coerced — the runtime’s String(), §42’s lesson decided by the declared type', () => {
    const app = withGraph((notes) => {
      base(notes);
      connect(notes, 'rec', 'prop-published', 'notesHeading', 'text');
      connect(notes, 'rec', 'prop-navOrder', 'entryInput', 'placeholder');
    }, { connected: true, schema: true });
    const page = notesFile(app);
    expect(page).toContain("{String(pageRow?.published ?? '')}");
    expect(page).toContain("placeholder={String(pageRow?.navOrder ?? '')}");
    expect(page).not.toContain('String(String(');
    expect(typecheckEmittedApp(app)).toEqual([]);
  });

  it('a column the schema does not declare is coerced once in a Text — not twice', () => {
    const app = withGraph((notes) => {
      base(notes);
      connect(notes, 'rec', 'prop-title', 'notesHeading', 'text');
    }, { connected: true });
    const page = notesFile(app);
    expect(page).toContain("{String(pageRow?.title ?? '')}");
    expect(page).not.toContain('String(String(');
    expect(typecheckEmittedApp(app)).toEqual([]);
  });

  it('Id resolves to the feeder — bound the moment it arrives, before any read', () => {
    const app = withGraph((notes) => {
      base(notes);
      connect(notes, 'rec', 'id', 'notesHeading', 'text');
    }, { connected: true, schema: true });
    const page = notesFile(app);
    expect(page).toContain('const draft = useValue(noteDraft);');
    // A string Variable in a Text is the Variable rule's own bare form (React renders undefined as nothing).
    expect(page).toContain('{draft}');
    expect(page).not.toContain('pageRow?.id');
    expect(typecheckEmittedApp(app)).toEqual([]);
  });

  it('an Error read in render binds the row; in the Failure chain it reads the arm’s own message', () => {
    const app = withGraph((notes) => {
      base(notes);
      connect(notes, 'rec', 'error', 'notesHeading', 'text');
    }, { connected: true, schema: true });
    const page = notesFile(app);
    expect(page).toContain('{pageError}');
    expect(page).toContain('lastError.set(pageMessage);');
    expect(typecheckEmittedApp(app)).toEqual([]);
  });

  it('Fetch unwired: the Id binds the row to the app’s copy of the record — no request, no Error, no Done (P18-S113-IDBINDREAD)', () => {
    const app = withGraph(baseEffect, { connected: true, schema: true });
    const page = notesFile(app);
    // `useRef`: the Draft box's mount announcement (P18-S116-FIELDMOUNT), not the bind.
    expect(page).toContain("import { useEffect, useRef, useState } from 'react';");
    expect(page).toContain("import { subscribeRecord } from '../api/client';");
    // The row's type, and no read: the module carries no fetchPageById for a Record that only binds.
    expect(page).toContain("import { type Page } from '../api/pages';");
    expect(page).toContain(BIND);
    expect(page).toContain("{pageRow?.title ?? ''}");
    expect(page).not.toContain('fetchPageById');
    expect(page).not.toContain('raiseAppError');
    expect(page).not.toContain('pageError');
    expect(pagesFile(app)).not.toContain('fetchPageById');
    expect(pagesFile(app)).toContain('export interface Page {');
    // The client holds the records the bind shows, though no read is made here.
    expect(app.files['src/api/client.ts']).toContain('export function subscribeRecord<T extends { id: string }>');
    expect(app.notes.filter((n) => n.startsWith('Pages/Notes'))).toEqual([]);
    expect(typecheckEmittedApp(app)).toEqual([]);
  });

  it('Fetch unwired with Done or Failure wired is refused by name: both fire only after a Fetch', () => {
    for (const port of ['done', 'failure'] as const) {
      const app = withGraph((notes) => {
        baseEffect(notes);
        addBareSetter(notes, 'after', 'lastPublished');
        connect(notes, 'rec', port, 'after', 'do', 'signal');
        connect(notes, 'noteDraftVar', 'value', 'after', 'value');
      }, { connected: true, schema: true });
      expect(deferralFor(app, 'rec')).toContain(
        `its ${port === 'done' ? 'Done' : 'Failure'} output is consumed and its Fetch is unwired — both fire only after a Fetch, and an Id only binds the record it names (dbmodelnode2.ts setModelID)`
      );
      expect(typecheckEmittedApp(app)).toEqual([]);
    }
  });

  it('Fetch unwired with its Error read: the row is declared and never written — only a Fetch reports one', () => {
    const app = withGraph((notes) => {
      addRecord(notes);
      connect(notes, 'noteDraftVar', 'value', 'rec', 'modelId');
      connect(notes, 'rec', 'error', 'notesHeading', 'text');
    }, { connected: true, schema: true });
    const page = notesFile(app);
    expect(page).toContain("its Fetch is unwired and only a Fetch reports one, so it stays empty (dbmodelnode2.ts).");
    expect(page).toContain('const [pageError, setPageError] = useState<string | undefined>();');
    expect(page).not.toContain('setPageError(');
    expect(typecheckEmittedApp(app)).toEqual([]);
  });

  it('Fetch unwired with a column read only in a handler: the row is earned there and bound, so the press reads the copy', () => {
    const app = withGraph((notes) => {
      addRecord(notes);
      connect(notes, 'noteDraftVar', 'value', 'rec', 'modelId');
      addBareSetter(notes, 'after', 'lastPublished');
      connect(notes, 'addButton', 'onClick', 'after', 'do', 'signal');
      connect(notes, 'rec', 'prop-title', 'after', 'value');
    }, { connected: true, schema: true });
    const page = notesFile(app);
    expect(page).toContain('const [pageRow, setPageRow] = useState<Page | undefined>();');
    expect(page).toContain('return subscribeRecord<Page>(pageRecordId, setPageRow);');
    expect(page).toContain('lastPublished.set(pageRow?.title)');
    expect(typecheckEmittedApp(app)).toEqual([]);
  });

  it('Fetch unwired with no row read: the bind changes nothing anyone sees, so nothing is emitted for it', () => {
    const app = withGraph((notes) => {
      addRecord(notes);
      connect(notes, 'noteDraftVar', 'value', 'rec', 'modelId');
    }, { connected: true, schema: true });
    const page = notesFile(app);
    expect(page).not.toContain('subscribeRecord');
    expect(page).not.toContain('pageRow');
    expect(page).not.toContain('fetchPageById');
    expect(typecheckEmittedApp(app)).toEqual([]);
  });

  it('Fetch wired keeps the throw: a Fetch on an empty Id is the runtime’s Failure "Missing Id."', () => {
    const app = withGraph(base, { connected: true, schema: true });
    const page = notesFile(app);
    expect(page).toContain("throw new Error('Missing Id.');");
    expect(withoutAnnouncement(page)).not.toContain(') return;');
  });

  it('Fetch unwired with a literal Id binds once, at mount — the effect has no dependency and no guard', () => {
    const app = withGraph((notes) => {
      addRecord(notes, {
        parameters: [
          { name: 'collectionName', value: literal('Page') },
          { name: 'idSource', value: literal('explicit') },
          { name: 'modelId', value: literal('home') }
        ]
      });
      connect(notes, 'rec', 'prop-title', 'notesHeading', 'text');
    }, { connected: true, schema: true });
    const page = notesFile(app);
    expect(page).toContain(
      '  useEffect(() => {\n' +
        "    const pageRecordId = 'home';\n" +
        '    return subscribeRecord<Page>(pageRecordId, setPageRow);\n' +
        '  }, []);'
    );
    // No guard on a literal: the planner refused an empty one, and a guard on a string literal is a TS2367.
    expect(page).not.toContain("pageRecordId === ''");
    expect(typecheckEmittedApp(app)).toEqual([]);
  });

  it('Fetch unwired with "Record properties" unticked: the copy as it is at the bind, and no later write', () => {
    const app = withGraph((notes) => {
      baseEffect(notes);
      notes.nodes.find((n) => n.id === 'rec')!.parameters.push({ name: 'runOnChange-record', value: literal(false) });
    }, { connected: true, schema: true });
    const page = notesFile(app);
    expect(page).toContain(
      "    if (pageRecordId === undefined || pageRecordId === null || pageRecordId === '') return undefined;\n" +
        '    // "Record properties" is unticked: the copy as it is at the bind, and no later write.\n' +
        '    subscribeRecord<Page>(pageRecordId, setPageRow)();\n' +
        '    return undefined;\n' +
        '  }, [draft]);'
    );
    // The bind still needs the client's copy, whatever the box says.
    expect(app.files['src/api/client.ts']).toContain('export function subscribeRecord<T extends { id: string }>');
    expect(typecheckEmittedApp(app)).toEqual([]);
  });

  it('Fetch unwired with no backend: nothing is held, so no bind — the row stays unset, and no stub that throws', () => {
    const app = withGraph(baseEffect, { schema: true });
    const page = notesFile(app);
    expect(app.files['src/api/client.ts']).toBeUndefined();
    expect(page).not.toContain('subscribeRecord');
    // The import's `useEffect` is the Draft box's announcement (P18-S116-FIELDMOUNT); no effect of the record's own.
    expect(withoutAnnouncement(page)).not.toContain('useEffect(');
    expect(page).toContain("{pageRow?.title ?? ''}");
    expect(pagesFile(app)).not.toContain('fetchPageById');
    expect(typecheckEmittedApp(app)).toEqual([]);
  });

  it('the report names the connected read', () => {
    const app = withGraph(base, { connected: true, schema: true });
    expect(app.notes).toContain(
      "api modules connect to the project's NodeGX backend at http://localhost:8581 (src/api/client.ts; .env.example overrides the endpoint)"
    );
  });
});

describe('EXP-011 §43 §C — refused by name', () => {
  const refusal = (mutate: (notes: ComponentIR) => void, options = { connected: true, schema: true }) => {
    const app = withGraph((notes) => {
      base(notes);
      mutate(notes);
    }, options);
    return deferralFor(app, 'rec');
  };

  it('no class', () => {
    expect(refusal((notes) => {
      notes.nodes.find((n) => n.id === 'rec')!.parameters = [{ name: 'idSource', value: literal('explicit') }];
    })).toContain('no class is named, so the node has no collection to read a record from');
  });

  it('a wired class', () => {
    expect(refusal((notes) => connect(notes, 'noteDraftVar', 'value', 'rec', 'collectionName'))).toContain(
      'its Class is wired — which collection is read is not statically knowable'
    );
  });

  it('a second backend', () => {
    expect(refusal((notes) => {
      notes.nodes.find((n) => n.id === 'rec')!.parameters.push({ name: 'backendId', value: literal('backend_other') });
    })).toContain('it reads from the backend "backend_other" rather than the project\'s active one — a second backend is not in this slice');
  });

  it('a repeater-bound Id', () => {
    expect(refusal((notes) => {
      const rec = notes.nodes.find((n) => n.id === 'rec')!;
      rec.parameters = rec.parameters.map((p) => (p.name === 'idSource' ? { name: 'idSource', value: literal('foreach') } : p));
    })).toContain("its Id Source is the enclosing repeater's row — row identity is not statically knowable in this slice");
  });

  it('two wires into the Id', () => {
    expect(refusal((notes) => connect(notes, 'visitorNameVar', 'value', 'rec', 'modelId'))).toContain(
      'two wires feed its Id — last-writer-wins is not statically ordered'
    );
  });

  it('no Id at all', () => {
    expect(refusal((notes) => {
      notes.connections = notes.connections.filter((c) => !(c.toId === 'rec' && c.toProperty === 'modelId'));
    })).toContain('it names no record, so the runtime binds to nothing and never reads one');
  });

  it('a consumed Fetched — two events on one port', () => {
    expect(refusal((notes) => {
      addBareSetter(notes, 'onFetched', 'lastPublished');
      connect(notes, 'rec', 'fetched', 'onFetched', 'do', 'signal');
      connect(notes, 'noteDraftVar', 'value', 'onFetched', 'value');
    })).toContain('its Fetched output is consumed — that pulse fires when an Id is bound and again after every read, and this slice emits only the read');
  });

  it('a consumed Changed — the record store’s pub/sub', () => {
    expect(refusal((notes) => {
      addBareSetter(notes, 'onChanged', 'lastPublished');
      connect(notes, 'rec', 'changed-title', 'onChanged', 'do', 'signal');
      connect(notes, 'noteDraftVar', 'value', 'onChanged', 'value');
    })).toContain('its changed-title output is consumed — it fires from the in-process record store whenever any node writes this record, which has no static shape');
  });

  it('a consumed Completed — the join', () => {
    expect(refusal((notes) => {
      addBareSetter(notes, 'onDone', 'lastPublished');
      connect(notes, 'rec', 'completed', 'onDone', 'do', 'signal');
      connect(notes, 'noteDraftVar', 'value', 'onDone', 'value');
    })).toContain('its Completed output is consumed — that pulse fires once however the read ended, and this slice emits the two arms rather than their join');
  });

  it('a column read from the Failure chain', () => {
    expect(refusal((notes) => {
      notes.connections = notes.connections.filter((c) => c.key !== 'rec:error->onFail:value');
      connect(notes, 'rec', 'prop-title', 'onFail', 'value');
    })).toContain("its prop-title is read from the Failure chain — that arm runs where no record arrived, and the value the interpreter holds there is the previous read's");
  });
});

describe('EXP-011 §43 §D — the §40 class, for this node', () => {
  it('the chain wires listed before the trigger wire read exactly as listed after', () => {
    const first = withGraph(base, { connected: true, schema: true });
    const last = withGraph((notes) => {
      addRecord(notes);
      addBareSetter(notes, 'after', 'lastPublished');
      connect(notes, 'rec', 'done', 'after', 'do', 'signal');
      connect(notes, 'rec', 'prop-title', 'after', 'value');
      addBareSetter(notes, 'onFail', 'lastError');
      connect(notes, 'rec', 'failure', 'onFail', 'do', 'signal');
      connect(notes, 'rec', 'error', 'onFail', 'value');
      connect(notes, 'noteDraftVar', 'value', 'rec', 'modelId');
      connect(notes, 'addButton', 'onClick', 'rec', 'fetch', 'signal');
    }, { connected: true, schema: true });
    const notesOf = (app: App) => app.notes.filter((n) => n.startsWith('Pages/Notes'));
    expect(notesOf(last)).toEqual(notesOf(first));
    expect(notesOf(last)).toEqual([]);
    expect(notesFile(last)).toBe(notesFile(first));
  });

  it('a Fetch wired from nothing translatable is named, and leaves no module export and no row behind', () => {
    const app = withGraph((notes) => {
      addRecord(notes);
      connect(notes, 'noteDraftVar', 'value', 'rec', 'modelId');
      addBareSetter(notes, 'after', 'lastPublished');
      connect(notes, 'rec', 'done', 'after', 'do', 'signal');
      connect(notes, 'rec', 'prop-title', 'after', 'value');
      connect(notes, 'rec', 'prop-title', 'notesHeading', 'text');
      // A wire INTO fetch keeps the port wired (so the effect form does not apply) from a node
      // that carries no signal this slice can hear. (§59 re-pointed it from `Hash`, whose Done is
      // a chain the exporter owns since, to `Sign In With`, and §79 translated that, the last picker row: it is `Verify Email` now, a retired type no rule will ever claim.)
      addNode(notes, { id: 'pattern', type: 'net.noodl.user.VerifyEmail' });
      connect(notes, 'pattern', 'done', 'rec', 'fetch', 'signal');
    }, { connected: true, schema: true });
    // The attach pass disposes the sink with the trigger's own reason — the class rule, not this
    // node's — so the wire note is the name, and nothing of the read is left behind.
    expect(app.notes).toContain('Pages/Notes: wire pattern:done->rec:fetch dropped: the trigger is not a rendered element event or a receiver');
    expect(app.notes.join('\n')).not.toContain('node rec (DbModel2)');
    expect(pagesFile(app)).toBeUndefined();
    expect(notesFile(app)).not.toContain('pageRow');
    expect(notesFile(app)).not.toContain('pageError');
    expect(typecheckEmittedApp(app)).toEqual([]);
  });
});

describe('EXP-011 §43 §E — the fixture', () => {
  const app = emitApp(parseProject(PAGE_DESK, catalog), catalog);
  const home = app.files['src/pages/Home.tsx'];

  it('exports whole: every node collapsed, only the two backend notes', () => {
    expect(app.notes).toEqual([
      'App: router shell — emitted as src/App.tsx by the scaffold',
      "api modules connect to the project's NodeGX backend at http://localhost:8581 (src/api/client.ts; .env.example overrides the endpoint)"
    ]);
  });

  it('emits the client, the class module and the env example, and typechecks', () => {
    expect(Object.keys(app.files).filter((f) => f.startsWith('src/api/')).sort()).toEqual(['src/api/client.ts', 'src/api/pages.ts']);
    expect(app.files['.env.example']).toContain('VITE_NODEGX_APP_ID=backend_pagedesk');
    expect(pagesFile(app)).toContain("return fetchOne<Page>('Page', id);");
    expectParses(app);
    expect(typecheckEmittedApp(app)).toEqual([]);
  });

  it('the page carries both forms: the Load handler, and the live Record bound to the copy its Id names', () => {
    expect(home).toContain('const [pageRow, setPageRow] = useState<Page | undefined>();');
    expect(home).toContain('const [livePageRow, setLivePageRow] = useState<Page | undefined>();');
    expect(home).toContain('const pageRecordId = pageId.get();');
    expect(home).toContain('const pageRecord = await fetchPageById(pageRecordId);');
    // P18-S113-IDBINDREAD. The live Record reads nothing: its Id binds the row to the client's copy.
    expect(home).not.toContain('livePageRecord = await');
    expect(home).toContain('    return subscribeRecord<Page>(livePageRecordId, setLivePageRow);\n  }, [id]);');
    expect(home).toContain('<p className={styles.text}>{id}</p>');
    expect(home).toContain("{pageRow?.title ?? ''}");
    expect(home).toContain("{String(pageRow?.published ?? '')}");
    expect(home).toContain("{String(pageRow?.navOrder ?? '')}");
    expect(home).toContain("{livePageRow?.title ?? ''}");
    expect(home).toContain('{pageError}');
    // Its Error is shown and never written: only a Fetch reports one.
    expect(home).toContain('{livePageError}');
    expect(home).not.toContain('setLivePageError(');
  });
});
