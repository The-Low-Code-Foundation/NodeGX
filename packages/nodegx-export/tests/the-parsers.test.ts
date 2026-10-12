import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

import { Catalog, loadCatalog } from '../src/catalog';
import { emitApp } from '../src/emit/emitApp';
import { PARSE_LIB_PATH, PARSE_OUTPUTS, parseLibSource } from '../src/emit/parseLib';
import { UTIL_LIB_PATH } from '../src/emit/utilLib';
import { parseProject } from '../src/parse/parseProject';
import { typecheckEmittedApp } from './helpers/typecheckApp';
import { ComponentIR, ConnectionIR, ExportIR, NodeIR, ParamValue } from '../src/ir/types';

/**
 * EXP-011 §75 (session 100) — the four parsers: `Parse CSV`, `To CSV`, `Parse XML`, `Parse Feed`.
 *
 * Three halves, `string-math-utilities.test.ts`'s shape.
 *
 * §A is the **differential**: the emitted `src/lib/parse.ts` is transpiled and loaded — with a real
 * `require`, so `fast-xml-parser` is the one the interpreter has — and driven against the runtime's own
 * `csv.ts`, `xml.ts` and `feed.ts`, loaded from `noodl-runtime/src`, over a grid built out of the cases where
 * a transcription goes wrong: an unterminated quote, an empty quoted cell, a BOM, CRLF, a trailing newline, a
 * short row, a non-comma delimiter, a cleared delimiter; a hostile DOCTYPE, an over-size document, an empty
 * prefix, a typed Atom title; every feed fixture the runtime grades itself on. 🔴 It is what found the NUL
 * byte in `feed.ts`'s identity ladder — a reading of the source would have transcribed a space.
 *
 * §B is the translation: graphs in, emitted code out, every deferral asserted **by its named reason**,
 * the repeater row (a CSV's rows into a For Each) and the dependency the manifest earns.
 *
 * §C is `tests/fixtures/sheet-desk`, a project a person could have built, exported and typechecked whole —
 * including the `fast-xml-parser` import resolving against the real package's declarations.
 */

const FIXTURE = path.join(__dirname, 'fixtures', 'cheer');
const SHEET_DESK = path.join(__dirname, 'fixtures', 'sheet-desk');
const RUNTIME_SRC = path.join(__dirname, '..', '..', 'noodl-runtime', 'src');
const RUNTIME_TEST = path.join(__dirname, '..', '..', 'noodl-runtime', 'test');

const catalog: Catalog = loadCatalog();
const baseIr = parseProject(FIXTURE, catalog);

// ---- §A the emitted module, against the interpreter it has to agree with --------------------

type AnyFn = (...args: unknown[]) => unknown;

/**
 * A module, transpiled and loaded with a REAL `require`. The emitted module imports `fast-xml-parser`,
 * and the whole point of taking the dependency is that the exported app and the interpreter read one
 * parser — so the test resolves the same package the runtime resolves.
 */
const loadModule = (source: string, requireImpl: (id: string) => unknown = require): Record<string, AnyFn> => {
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
  }).outputText;
  const module = { exports: {} as Record<string, AnyFn> };
  // eslint-disable-next-line no-new-func
  new Function('exports', 'module', 'require', js)(module.exports, module, requireImpl);
  return module.exports;
};

const read = (file: string): string => fs.readFileSync(file, 'utf8');

const runtimeCsv = loadModule(read(path.join(RUNTIME_SRC, 'csv.ts')));
const runtimeXml = loadModule(read(path.join(RUNTIME_SRC, 'xml.ts')));
const runtimeFeed = loadModule(read(path.join(RUNTIME_SRC, 'feed.ts')), (id) => (id === './xml' ? runtimeXml : require(id)));
const lib = loadModule(parseLibSource());

/** What `Parse CSV`'s three outputs hold after `_parse`, derived from the runtime module the node calls. */
const runtimeParseCsv = (text: unknown, hasHeader: boolean, delimiter: string | undefined) => {
  const result = runtimeCsv.parseCSV(text, delimiter || ',') as { rows: string[][]; error?: { message: string } };
  if (result.error) return { items: undefined, count: 0, error: result.error.message };
  if (hasHeader) {
    const records = runtimeCsv.rowsToRecords(result.rows) as unknown[];
    return { items: records, count: records.length, error: undefined };
  }
  return { items: result.rows, count: result.rows.length, error: undefined };
};

const CSV_TEXTS: unknown[] = [
  'a,b\n1,2',
  'name,note\nann,"blue, then red"',
  'name,note\nann,"line one\nline two"',
  'note\n"she said ""hi"""',
  'a,b\r\n1,2\r\n3,4',
  'a,b\n1,2\n',
  '',
  'a,b',
  '﻿a,b\n1,2',
  'a,b\n1,"unterminated\n5,6',
  'a;b\n1;2',
  'x,y\n1',
  'x,y\n1,2,3',
  'q\n""',
  42
];

const FEEDS_DIR = path.join(RUNTIME_TEST, 'fixtures', 'feeds');
const XML_DIR = path.join(RUNTIME_TEST, 'fixtures', 'xml');
const DOCUMENTS: Record<string, string> = {
  ...Object.fromEntries(fs.readdirSync(XML_DIR).filter((f) => f.endsWith('.xml')).map((f) => [f, read(path.join(XML_DIR, f))])),
  ...Object.fromEntries(fs.readdirSync(FEEDS_DIR).map((f) => [f, read(path.join(FEEDS_DIR, f))])),
  empty: '',
  blank: '   ',
  'not-xml': 'hello there',
  'doctype-subset': '<!DOCTYPE x [<!ELEMENT x ANY>]><x/>',
  'typed-title': '<feed xmlns="http://www.w3.org/2005/Atom"><title type="html">Hi &amp; bye</title><entry><title>one</title><link rel="self" href="https://x/feed"/><link rel="alternate" href="https://x/1"/></entry></feed>',
  big: '<a>' + 'x'.repeat(5000) + '</a>'
};

describe('EXP-011 §75 §A — the emitted module against the interpreter', () => {
  it('the module the export ships parses, loads, and exports the four helpers', () => {
    const sf = ts.createSourceFile('parse.ts', parseLibSource(), ts.ScriptTarget.ESNext, true, ts.ScriptKind.TS);
    const diagnostics = (sf as unknown as { parseDiagnostics: ts.Diagnostic[] }).parseDiagnostics ?? [];
    expect(diagnostics.map((d) => ts.flattenDiagnosticMessageText(d.messageText, ' ')).join('\n')).toBe('');
    for (const fn of ['parseCsv', 'toCsv', 'parseXml', 'parseFeed']) expect(typeof lib[fn]).toBe('function');
  });

  it('parseCsv agrees with parsecsv.ts over the grid — records, rows of cells, the unterminated quote, the BOM, a cleared delimiter', () => {
    const disagreements: string[] = [];
    let compared = 0;
    for (const text of CSV_TEXTS) {
      for (const delimiter of [',', ';', undefined, '']) {
        for (const hasHeader of [true, false]) {
          compared += 1;
          const theirs = runtimeParseCsv(text, hasHeader, delimiter);
          const mine = {
            items: lib.parseCsv(text, hasHeader, delimiter, 'items'),
            count: lib.parseCsv(text, hasHeader, delimiter, 'count'),
            error: lib.parseCsv(text, hasHeader, delimiter, 'error')
          };
          if (JSON.stringify(mine) !== JSON.stringify(theirs)) {
            disagreements.push(`${JSON.stringify(text)} d=${JSON.stringify(delimiter)} h=${hasHeader}: ${JSON.stringify(mine)} vs ${JSON.stringify(theirs)}`);
          }
        }
      }
    }
    expect(disagreements).toEqual([]);
    // 15 texts × 4 delimiters × 2 header settings — stated so a grid that silently shrinks is visible.
    expect(compared).toBe(120);
  });

  it('a CSV that never arrived is the abstain — no Items, a Count of 0, no Error (Failure Contract §2)', () => {
    for (const nothing of [undefined, null]) {
      expect(lib.parseCsv(nothing, true, ',', 'items')).toBeUndefined();
      expect(lib.parseCsv(nothing, true, ',', 'count')).toBe(0);
      expect(lib.parseCsv(nothing, true, ',', 'error')).toBeUndefined();
    }
  });

  it('toCsv agrees with tocsv.ts — the union of keys in first-seen order, declared columns, quoting, rows of cells', () => {
    const records = [{ name: 'ann', note: 'blue, then red' }, { name: 'bo', note: 'she said "hi"', extra: 'x\ny' }, { name: 'cy' }];
    let compared = 0;
    for (const columns of ['', 'name', 'name, note', undefined]) {
      for (const delimiter of [',', ';']) {
        for (const includeHeader of [true, false]) {
          compared += 1;
          const declared = (columns || '').split(',').map((c) => c.trim()).filter(Boolean);
          const theirs = runtimeCsv.toCSV(records, {
            columns: declared.length ? declared : runtimeCsv.unionOfKeys(records),
            delimiter,
            includeHeader
          });
          expect(lib.toCsv(records, columns, delimiter, includeHeader, 'text')).toBe(theirs);
          expect(lib.toCsv(records, columns, delimiter, includeHeader, 'count')).toBe(3);
        }
      }
    }
    expect(compared).toBe(16);
    const cells = [['a', 'b'], ['1,1', '2']];
    expect(lib.toCsv(cells, '', ',', true, 'text')).toBe(runtimeCsv.rowsToCSV(cells, { delimiter: ',' }));
    expect(lib.toCsv(undefined, '', ',', true, 'text')).toBe('');
    expect(lib.toCsv(null, '', ',', true, 'count')).toBe(0);
  });

  it('a To CSV round-trips through Parse CSV unchanged — the whole correctness question of writing CSV', () => {
    const records = [{ name: 'ann', note: 'blue, then red' }, { name: 'bo', note: 'she said "hi"\nand left' }];
    const text = lib.toCsv(records, '', ',', true, 'text');
    expect(lib.parseCsv(text, true, ',', 'items')).toEqual(records);
    expect(lib.parseCsv(text, true, ',', 'error')).toBeUndefined();
  });

  it('parseXml agrees with xml.ts over every document and three option sets — the two refusals, the size gate, an empty prefix', () => {
    const disagreements: string[] = [];
    let compared = 0;
    for (const [name, document] of Object.entries(DOCUMENTS)) {
      for (const o of [
        { prefix: '@', always: '', trim: true, max: undefined },
        { prefix: '', always: 'item, entry', trim: false, max: 1000 },
        { prefix: '$', always: 'link', trim: true, max: 0 }
      ]) {
        compared += 1;
        const r = runtimeXml.parseXML(document, {
          attributePrefix: o.prefix,
          alwaysArray: o.always.split(',').map((s) => s.trim()).filter(Boolean),
          trimValues: o.trim,
          maxBytes: o.max
        }) as { value?: unknown; error?: { message: string; code: string } };
        const theirs = r.error
          ? { result: undefined, error: r.error.message, errorCode: r.error.code }
          : { result: r.value, error: undefined, errorCode: undefined };
        const mine = {
          result: lib.parseXml(document, o.prefix, o.always, o.trim, o.max, 'result'),
          error: lib.parseXml(document, o.prefix, o.always, o.trim, o.max, 'error'),
          errorCode: lib.parseXml(document, o.prefix, o.always, o.trim, o.max, 'errorCode')
        };
        if (JSON.stringify(mine) !== JSON.stringify(theirs)) disagreements.push(`${name} ${JSON.stringify(o)}`);
      }
    }
    expect(disagreements).toEqual([]);
    expect(compared).toBe(Object.keys(DOCUMENTS).length * 3);
    expect(compared).toBeGreaterThanOrEqual(45);
    // The setter's rule: a non-string is an empty document, not a throw.
    expect(lib.parseXml(42, '@', '', true, undefined, 'errorCode')).toBe('xml/empty');
    expect(lib.parseXml(undefined, '@', '', true, undefined, 'result')).toBeUndefined();
  });

  it('parseFeed agrees with feed.ts over every fixture the runtime grades itself on — items, meta, kind, source, the id ladder', () => {
    const disagreements: string[] = [];
    let compared = 0;
    for (const [name, document] of Object.entries(DOCUMENTS)) {
      for (const maxBytes of [undefined, 1000, 0]) {
        compared += 1;
        const r = runtimeFeed.parseFeed(document, maxBytes) as {
          items?: unknown[];
          feed?: Record<string, string | null>;
          error?: { message: string; code: string };
        };
        const theirs = r.error
          ? { items: undefined, count: 0, feedTitle: '', feedLink: '', feedDescription: '', feedUpdated: undefined, kind: '', source: '', error: r.error.message, errorCode: r.error.code }
          : {
              items: r.items,
              count: r.items!.length,
              feedTitle: r.feed!.title || '',
              feedLink: r.feed!.link || '',
              feedDescription: r.feed!.description || '',
              feedUpdated: r.feed!.updated || undefined,
              kind: r.feed!.kind,
              source: r.feed!.source,
              error: undefined,
              errorCode: undefined
            };
        const mine: Record<string, unknown> = {};
        for (const output of Object.keys(theirs)) mine[output] = lib.parseFeed(document, maxBytes, output);
        if (JSON.stringify(mine) !== JSON.stringify(theirs)) disagreements.push(`${name} max=${maxBytes}`);
      }
    }
    expect(disagreements).toEqual([]);
    expect(compared).toBe(Object.keys(DOCUMENTS).length * 3);
    // The five real shapes are in the grid by name, so a fixture renamed away is visible.
    for (const f of ['rss2-blog.xml', 'atom-blog.xml', 'youtube-channel.xml', 'reddit-subreddit.xml', 'podcast.xml', 'no-identity.xml', 'rdf-rss1.xml']) {
      expect(DOCUMENTS[f]).toBeDefined();
    }
  });

  /**
   * 🔴 The row the differential paid for. `feed.ts`'s identity ladder reads `hashId(title + ' ' + …)` on
   * any screen, and the byte between those quotes is U+0000. The interpreter hashes with a NUL; a
   * transcription from a reading hashed with a space and minted a different id for every item on the
   * hash rung — the id FED-002's unique index keys on. This pins the runtime byte, so the day it is
   * changed the export's copy is red beside it rather than silently one byte behind.
   */
  it('the identity ladder’s separator is a NUL byte in the runtime source, and the emitted module hashes with the same byte', () => {
    const runtimeSource = read(path.join(RUNTIME_SRC, 'feed.ts'));
    expect(runtimeSource).toContain("hashId(title + '\u0000' + (published || ''))");
    expect(parseLibSource()).toContain("hashId(title + '\\u0000' + (published || ''))");
    const item = (lib.parseFeed(DOCUMENTS['no-identity.xml'], undefined, 'items') as Array<{ id: string; title: string }>)[1];
    expect(item.title).toBe('A post with neither');
    expect(item.id).toBe(runtimeFeed.hashId('A post with neither\u00002026-09-06T12:00:00.000Z'));
    expect(item.id).not.toBe(runtimeFeed.hashId('A post with neither 2026-09-06T12:00:00.000Z'));
  });

  it('the generator’s per-output table names exactly the outputs each helper answers', () => {
    // Every selector the table knows is one the module answers without throwing, and vice versa: the
    // three CSV outputs, the two To CSV, the three XML, the ten Feed — matching the catalog's value ports.
    const valuePorts = (typeName: string) =>
      catalog.nodes
        .find((n) => n.typeName === typeName)!
        .outputs!.filter((p) => (typeof p.type === 'string' ? p.type : p.type?.name) !== 'signal')
        .map((p) => p.name)
        .sort();
    expect(Object.keys(PARSE_OUTPUTS.parseCsv).sort()).toEqual(valuePorts('net.noodl.ParseCSV'));
    expect(Object.keys(PARSE_OUTPUTS.toCsv).sort()).toEqual(valuePorts('net.noodl.ToCSV'));
    expect(Object.keys(PARSE_OUTPUTS.parseXml).sort()).toEqual(valuePorts('net.noodl.ParseXML'));
    expect(Object.keys(PARSE_OUTPUTS.parseFeed).sort()).toEqual(valuePorts('net.noodl.ParseFeed'));
  });
});

// ---- §B the translation ---------------------------------------------------------------------

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

const emit = (ir: ExportIR) => emitApp(ir, catalog);
const notesOf = (ir: ExportIR) => ir.components.find((c) => c.path === 'Pages/Notes')!;
const notesFile = (app: ReturnType<typeof emitApp>) => app.files[Object.keys(app.files).find((k) => k.endsWith('Notes.tsx'))!];
const reportOf = (app: ReturnType<typeof emitApp>) => app.notes.join('\n');
const manifestOf = (app: ReturnType<typeof emitApp>) => JSON.parse(app.files['package.json']) as { dependencies: Record<string, string> };

/** Every emitted file is parsed — the `}; else` floor. */
const expectParses = (app: ReturnType<typeof emitApp>) => {
  for (const [file, source] of Object.entries(app.files)) {
    if (!file.endsWith('.ts') && !file.endsWith('.tsx')) continue;
    const sf = ts.createSourceFile(file, source, ts.ScriptTarget.ESNext, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const diagnostics = (sf as unknown as { parseDiagnostics: ts.Diagnostic[] }).parseDiagnostics ?? [];
    expect(diagnostics.map((d) => `${file}: ${ts.flattenDiagnosticMessageText(d.messageText, ' ')}`).join('\n')).toBe('');
  }
};

const withParsers = (build: (ir: ExportIR, notes: ComponentIR) => void): { ir: ExportIR; app: ReturnType<typeof emitApp> } => {
  const ir: ExportIR = JSON.parse(JSON.stringify(baseIr));
  const notes = notesOf(ir);
  build(ir, notes);
  return { ir, app: emit(ir) };
};

const CSV = 'name,team\nann,red\nbo,blue';

describe('EXP-011 §75 §B — the translation', () => {
  it('Parse CSV over an authored text renders its Count through the emitted helper, selecting the output by name', () => {
    const { app } = withParsers((_ir, notes) => {
      addNode(notes, {
        id: 'sheet',
        type: 'net.noodl.ParseCSV',
        authoredLabel: 'Sheet',
        parameters: [{ name: 'text', value: literal(CSV) }]
      });
      connect(notes, 'sheet', 'count', 'notesHeading', 'text');
    });
    expectParses(app);
    const page = notesFile(app);
    expect(page).toContain("import { parseCsv } from '../lib/parse';");
    // `true` and `,` are initialize's — the panel the author never opened.
    // A text with a newline prints as a double-quoted literal (`tsLiteral`); `true` and `,` are initialize's.
    expect(page).toContain('parseCsv("name,team\\nann,red\\nbo,blue", true, \',\', \'count\')');
    expect(app.files[PARSE_LIB_PATH]).toContain('export function parseCsv(');
    // A project that parses a CSV ships neither the string utilities nor the XML parser's dependency.
    expect(app.files[UTIL_LIB_PATH]).toBeUndefined();
    expect(manifestOf(app).dependencies['fast-xml-parser']).toBeUndefined();
    expect(reportOf(app)).not.toContain('sheet');
  });

  /** The row the node exists for: its rows into a For Each, one row component per record. */
  it('Parse CSV’s Items feed a For Each — the rows map onto the template’s inputs, guarded by `?? []`', () => {
    const { app } = withParsers((_ir, notes) => {
      notes.connections = notes.connections.filter((c) => c.toId !== 'notesList');
      addNode(notes, { id: 'sheet', type: 'net.noodl.ParseCSV', parameters: [{ name: 'text', value: literal('text,mood\nhi,sunny') }] });
      connect(notes, 'sheet', 'items', 'notesList', 'items');
    });
    expectParses(app);
    const page = notesFile(app);
    expect(page).toContain('((parseCsv("text,mood\\nhi,sunny", true, \',\', \'items\')) ?? []).map((item, index) => (');
    expect(page).toContain('text={item.text}');
    expect(page).toContain('mood={item.mood}');
    expect(page).not.toContain('For Each notesList deferred');
  });

  it('a For Each over Parse Feed’s Items drops a mapped input the feed rows do not carry, by name, and keeps the ones they do', () => {
    const { app } = withParsers((ir, notes) => {
      notes.connections = notes.connections.filter((c) => c.toId !== 'notesList');
      // The row template maps `title` (a feed field) and `mood` (not one).
      const row = ir.components.find((c) => c.path === 'Components/NoteRow')!;
      const inputs = row.nodes.find((n) => n.id === 'rowInputs')!;
      inputs.declaredPorts = inputs.declaredPorts.map((p) => (p.name === 'text' ? { ...p, name: 'title' } : p));
      row.connections = row.connections.map((c) => (c.fromProperty === 'text' ? { ...c, fromProperty: 'title', key: c.key.replace(':text->', ':title->') } : c));
      addNode(notes, { id: 'feed', type: 'net.noodl.ParseFeed', parameters: [{ name: 'text', value: literal(DOCUMENTS['rss2-blog.xml']) }] });
      connect(notes, 'feed', 'items', 'notesList', 'items');
    });
    expectParses(app);
    const page = notesFile(app);
    expect(page).toContain('title={item.title}');
    expect(page).not.toContain('mood={item.mood}');
    expect(reportOf(app)).toContain('maps "mood" from field "mood", which the array it reads does not carry — dropped, reported');
  });

  it('To CSV over a named array renders the text, with the panel’s columns and initialize’s delimiter and header', () => {
    const { app } = withParsers((_ir, notes) => {
      addNode(notes, {
        id: 'sheetOut',
        type: 'net.noodl.ToCSV',
        parameters: [{ name: 'columns', value: literal('text, mood') }]
      });
      connect(notes, 'notesArray', 'items', 'sheetOut', 'items');
      connect(notes, 'sheetOut', 'text', 'notesHeading', 'text');
    });
    expectParses(app);
    const page = notesFile(app);
    expect(page).toContain("import { toCsv } from '../lib/parse';");
    expect(page).toMatch(/toCsv\(\w+, 'text, mood', ',', true, 'text'\)/);
  });

  it('Parse XML earns the interpreter’s own parser as a dependency, at its pin — and Parse CSV alone does not', () => {
    const { app } = withParsers((_ir, notes) => {
      addNode(notes, { id: 'doc', type: 'net.noodl.ParseXML', parameters: [{ name: 'text', value: literal('<a href="x">hi</a>') }] });
      connect(notes, 'doc', 'error', 'notesHeading', 'text');
    });
    expectParses(app);
    const page = notesFile(app);
    expect(page).toContain("import { parseXml } from '../lib/parse';");
    // `@`, `''`, `true`, 5 MB: initialize's, and the catalog's declared defaults agree with them node by node.
    expect(page).toContain("parseXml('<a href=\"x\">hi</a>', '@', '', true, 5242880, 'error')");
    expect(manifestOf(app).dependencies['fast-xml-parser']).toBe('4.5.7');
    expect(app.files[PARSE_LIB_PATH]).toContain("import { XMLParser } from 'fast-xml-parser';");
    // Sorted with the rest, so the manifest is stable across exports.
    expect(Object.keys(manifestOf(app).dependencies)).toEqual([...Object.keys(manifestOf(app).dependencies)].sort());
  });

  it('Parse Feed reads its Feed Title, Count and Kind — three selectors on one call — and every string-typed one prints bare', () => {
    const { app } = withParsers((_ir, notes) => {
      addNode(notes, { id: 'feed', type: 'net.noodl.ParseFeed', parameters: [{ name: 'text', value: literal('<rss/>') }] });
      addNode(notes, { id: 'kindText', type: 'Text', parent: 'notesShell', parameters: [{ name: 'text', value: literal('') }] });
      notes.nodes.find((n) => n.id === 'notesShell')!.children!.push('kindText');
      connect(notes, 'feed', 'feedTitle', 'notesHeading', 'text');
      connect(notes, 'feed', 'kind', 'kindText', 'text');
    });
    expectParses(app);
    const page = notesFile(app);
    expect(page).toContain("parseFeed('<rss/>', 5242880, 'feedTitle')");
    expect(page).toContain("parseFeed('<rss/>', 5242880, 'kind')");
    expect(manifestOf(app).dependencies['fast-xml-parser']).toBe('4.5.7');
  });

  it('a wired text translates, and reports the one divergence where a later arrival can exist', () => {
    const { app } = withParsers((_ir, notes) => {
      addNode(notes, { id: 'sheet', type: 'net.noodl.ParseCSV', parameters: [{ name: 'hasHeader', value: literal(false) }] });
      connect(notes, 'noteDraftVar', 'value', 'sheet', 'text');
      connect(notes, 'sheet', 'count', 'notesHeading', 'text');
    });
    expectParses(app);
    expect(notesFile(app)).toMatch(/parseCsv\(\w+, false, ',', 'count'\)/);
    expect(reportOf(app)).toContain(
      'node sheet (net.noodl.ParseCSV) reads CSV from a wire — when a later arrival cannot be parsed the interpreter keeps the previous Items and Count beside the Error, and the exported call answers no Items and a Count of 0 beside it'
    );
  });

  it('a literal text files no divergence note — a literal parses once and has no previous answer', () => {
    const { app } = withParsers((_ir, notes) => {
      addNode(notes, { id: 'sheet', type: 'net.noodl.ParseCSV', parameters: [{ name: 'text', value: literal(CSV) }] });
      connect(notes, 'sheet', 'count', 'notesHeading', 'text');
    });
    expect(reportOf(app)).not.toContain('reads CSV from a wire');
  });

  describe('what defers, and the reason it gives', () => {
    it('nothing on the text, nothing authored — the node never runs past its abstain', () => {
      const { app } = withParsers((_ir, notes) => {
        addNode(notes, { id: 'sheet', type: 'net.noodl.ParseCSV' });
        connect(notes, 'sheet', 'count', 'notesHeading', 'text');
      });
      expect(reportOf(app)).toContain('nothing is wired into its text input and none is authored, so the node never produces an answer');
      expect(notesFile(app)).not.toContain('parseCsv');
    });

    it('a consumed Changed defers as a recomputation, not as an event', () => {
      const { app } = withParsers((_ir, notes) => {
        addNode(notes, { id: 'sheet', type: 'net.noodl.ParseCSV', parameters: [{ name: 'text', value: literal(CSV) }] });
        connect(notes, 'sheet', 'changed', 'notesHeading', 'text');
      });
      expect(reportOf(app)).toContain('its Changed output is consumed — that pulse announces a recomputation');
    });

    it('a consumed Failure defers naming the Error output as the value to read instead', () => {
      const { app } = withParsers((_ir, notes) => {
        addNode(notes, { id: 'doc', type: 'net.noodl.ParseXML', parameters: [{ name: 'text', value: literal('<a/>') }] });
        connect(notes, 'doc', 'failure', 'notesHeading', 'text');
      });
      expect(reportOf(app)).toContain('its Failure output is consumed — the node re-parses on every arrival, so the failure is a value this slice renders as an absent one (read its Error output)');
    });

    it('two wires into the text defer, because last-writer-wins is not statically ordered', () => {
      const { app } = withParsers((_ir, notes) => {
        addNode(notes, { id: 'sheet', type: 'net.noodl.ParseCSV' });
        connect(notes, 'noteDraftVar', 'value', 'sheet', 'text');
        connect(notes, 'visitorRead', 'value', 'sheet', 'text');
        connect(notes, 'sheet', 'count', 'notesHeading', 'text');
      });
      expect(reportOf(app)).toContain('two wires feed its text input — last-writer-wins is not statically ordered');
    });

    it('a parser nothing reads is reported as dropped, not silently translated', () => {
      const { app } = withParsers((_ir, notes) => {
        addNode(notes, { id: 'sheet', type: 'net.noodl.ParseCSV', parameters: [{ name: 'text', value: literal(CSV) }] });
      });
      expect(reportOf(app)).toContain('node sheet (net.noodl.ParseCSV) deferred: its answer is read by nothing statically translatable');
      expect(app.files[PARSE_LIB_PATH]).toBeUndefined();
    });
  });
});

// ---- §C the fixture, whole -------------------------------------------------------------------

describe('EXP-011 §75 §C — sheet-desk, a project a person could have built, exported and typechecked whole', () => {
  const ir = parseProject(SHEET_DESK, catalog);
  const app = emitApp(ir, catalog);
  const home = app.files[Object.keys(app.files).find((k) => k.endsWith('Home.tsx'))!];

  it('nothing on the Home page is refused, and the four helpers are all called', () => {
    expect(app.notes.filter((n) => n.startsWith('Pages/Home'))).toEqual([]);
    expect(home).not.toContain('TODO(export)');
    expect(home).toContain("import { parseCsv, parseFeed, parseXml, toCsv } from '../lib/parse';");
    expect(app.files[PARSE_LIB_PATH]).toBeDefined();
    expect(manifestOf(app).dependencies['fast-xml-parser']).toBe('4.5.7');
  });

  it('the CSV rows render as one row component each, and the counts are numbers a Text prints', () => {
    expect(home).toContain("'items')) ?? []).map((item, index) => (");
    expect(home).toContain('name={item.name}');
    expect(home).toContain('team={item.team}');
    expect(home).toContain("'count')");
  });

  it('the emitted app typechecks as a real program — the fast-xml-parser import resolves against the real package', () => {
    expect(typecheckEmittedApp(app)).toEqual([]);
  });
});
