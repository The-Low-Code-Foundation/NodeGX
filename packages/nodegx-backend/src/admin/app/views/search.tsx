/**
 * Search — which collections answer a text search, over which fields
 * (BMG-011 §3.4), over `GET /admin/search` and `PUT/DELETE
 * /admin/search/collections/:name`. A rebuild is one request that answers
 * with its report; the page shows it busy and then says what was indexed.
 */
import { useEffect, useState } from 'preact/hooks';

import { api, encode, useSession } from '../api';
import { Chips, EmptyState } from '../composers';
import { Card, Chip, Gap, Notice, Page, Row, Spacer, Sub, Switch, WriteBtn, fail, toast } from '../ui';
import type { ViewProps } from './index';

interface CollectionSearch {
  enabled: boolean;
  fields: string[];
  tokenizer?: string;
}

interface SearchData {
  config: { collections: Record<string, CollectionSearch> };
  fts5Available: boolean;
}

interface SchemaTable {
  name: string;
  columns: Array<{ name: string; type?: string }>;
}

interface RebuildReport {
  tableName?: string;
  rowsIndexed?: number;
  elapsedMs?: number;
}

/** The String columns a collection could search — the only fields FTS indexes. */
export function textFields(table: SchemaTable): string[] {
  return table.columns.filter((c) => c.type === 'String' && ['objectId', 'ACL'].indexOf(c.name) === -1).map((c) => c.name);
}

export function indexedWords(report: RebuildReport | undefined): string {
  if (!report) return '';
  const n = typeof report.rowsIndexed === 'number' ? report.rowsIndexed : null;
  return n === null ? 'index rebuilt' : n + ' record' + (n === 1 ? '' : 's') + ' indexed';
}

export function SearchView(_props: ViewProps) {
  const [data, setData] = useState<SearchData | null>(null);
  const [tables, setTables] = useState<SchemaTable[] | null>(null);

  function load() {
    api<SearchData>('GET', '/admin/search').then(setData).catch(fail);
    api<{ tables?: SchemaTable[] }>('GET', '/admin/schema')
      .then((d) => setTables((d.tables || []).filter((t) => !t.name.startsWith('_'))))
      .catch(fail);
  }
  useEffect(() => {
    load();
  }, []);

  return (
    <Page title="Search" subtitle="Which collections answer a text search, and over which fields.">
      {data && tables ? (
        <div>
          {!data.fts5Available ? (
            <Notice kind="bad">This backend's database was built without full-text search (SQLite FTS5). Search cannot be turned on here; the settings are kept for a backend that has it.</Notice>
          ) : null}
          <Gap />
          {tables.length ? (
            tables.map((t) => <CollectionCard key={t.name} table={t} config={data.config.collections[t.name]} reload={load} available={data.fts5Available} />)
          ) : (
            <EmptyState>No collections yet. Make one on the Schema page and it appears here.</EmptyState>
          )}
          <Sub style="margin-top:10px">A searchable collection answers a text search from an app and a node (the `search` field of a query). Only text fields can be searched; a field added later is not searched until it is ticked here.</Sub>
        </div>
      ) : null}
    </Page>
  );
}

function CollectionCard({ table, config, reload, available }: { table: SchemaTable; config: CollectionSearch | undefined; reload: () => void; available: boolean }) {
  const { readonly } = useSession();
  const candidates = textFields(table);
  const stored = config || { enabled: false, fields: [] };
  const [enabled, setEnabled] = useState(!!stored.enabled);
  const [fields, setFields] = useState<string[]>(stored.fields.filter((f) => candidates.indexOf(f) !== -1));
  const [busy, setBusy] = useState<'save' | 'rebuild' | null>(null);
  const [report, setReport] = useState<RebuildReport | undefined>(undefined);
  const dirty = enabled !== !!stored.enabled || fields.join(',') !== stored.fields.join(',');
  const problem = enabled && !fields.length ? 'Pick at least one field to search.' : null;

  function save() {
    if (problem) return;
    setBusy('save');
    const done = () => {
      setBusy(null);
      reload();
    };
    if (!enabled) {
      api('DELETE', '/admin/search/collections/' + encode(table.name))
        .then(() => {
          toast(table.name + ' is no longer searchable.', 'ok');
          setReport(undefined);
          done();
        })
        .catch((e) => {
          setBusy(null);
          fail(e);
        });
      return;
    }
    api<{ rebuild?: RebuildReport }>('PUT', '/admin/search/collections/' + encode(table.name), { enabled: true, fields })
      .then((r) => {
        setReport(r.rebuild);
        toast(table.name + ' is searchable — ' + indexedWords(r.rebuild) + '.', 'ok');
        done();
      })
      .catch((e) => {
        setBusy(null);
        fail(e);
      });
  }

  function rebuild() {
    setBusy('rebuild');
    api<{ rebuild?: RebuildReport }>('POST', '/admin/search/collections/' + encode(table.name) + '/rebuild', {})
      .then((r) => {
        setReport(r.rebuild);
        toast(table.name + ': ' + indexedWords(r.rebuild) + '.', 'ok');
        setBusy(null);
        reload();
      })
      .catch((e) => {
        setBusy(null);
        fail(e);
      });
  }

  return (
    <Card style="margin-bottom:10px" id={'search-card-' + table.name}>
      <Row>
        <Switch id={'search-' + table.name} checked={enabled} onChange={setEnabled} disabled={readonly || !available || !!busy}>
          <b>{table.name}</b>
        </Switch>
        {stored.enabled ? <Chip kind="ok">searchable</Chip> : <Chip>not searchable</Chip>}
        {report ? <Chip kind="accent">{indexedWords(report)}</Chip> : null}
        <Spacer />
        {stored.enabled ? (
          <WriteBtn tiny disabled={!!busy || !available} onClick={rebuild}>
            {busy === 'rebuild' ? 'Rebuilding…' : 'Rebuild index'}
          </WriteBtn>
        ) : null}
        <WriteBtn tiny kind="primary" disabled={!dirty || !!problem || !!busy || !available} onClick={save}>
          {busy === 'save' ? 'Saving…' : 'Save'}
        </WriteBtn>
      </Row>
      {enabled ? (
        <div style="margin-top:8px">
          <div class="field-head">
            <b>Fields to search</b>
            {candidates.length ? null : <span class="hint">This collection has no text fields.</span>}
          </div>
          <Chips items={fields} onChange={setFields} suggest={async (q) => candidates.filter((c) => fields.indexOf(c) === -1 && c.toLowerCase().indexOf(q.toLowerCase()) !== -1)} validate={(t) => (candidates.indexOf(t) === -1 ? '"' + t + '" is not a text field of ' + table.name + '.' : null)} placeholder="Pick a field" addLabel="Add field" disabled={readonly || !!busy} />
          {problem ? <div class="hint">{problem}</div> : null}
        </div>
      ) : null}
    </Card>
  );
}
