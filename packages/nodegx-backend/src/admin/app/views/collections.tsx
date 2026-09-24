/**
 * Collections — browse and edit records. A grid whose cells edit in place, a
 * typed form per record in a drawer that the URL opens
 * (`#/collections/Pet/<id>`; `#/collections/Pet/new` for a new one), the
 * text search, and the JSON filter one click away (BMG-002 replaces it).
 */
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';

import { api, encode, openLive, closeLive, useSession } from '../api';
import { Drawer, EmptyState } from '../composers';
import { FieldControl, Raw, parseRaw, rawFrom } from '../fields';
import { Column, JSON_TYPES, cellText, csvCell, displayValue, guessType, isSystemField, plain, shortId, toWire } from '../format';
import { navigate, replaceRoute } from '../router';
import { Btn, Chip, Dialog, Disclosure, Field, Gap, Hint, Notice, Row, Spacer, WriteBtn, confirmSimple, fail, openModal, toast } from '../ui';
import type { ViewProps } from './index';

const PAGE = 50;

interface Table {
  name: string;
  columns?: Column[];
}

type Rec = Record<string, any>;

export function CollectionsView({ params }: ViewProps) {
  const { features, readonly } = useSession();
  const [schema, setSchema] = useState<Record<string, Table> | null>(null);
  const [search, setSearch] = useState('');
  const [where, setWhere] = useState('');
  const [liveOn, setLiveOn] = useState(false);
  const [skip, setSkip] = useState(0);
  const [selected, setSelected] = useState<Record<string, true>>({});
  const [data, setData] = useState<{ rows: Rec[]; total: number } | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const tables = schema ? Object.keys(schema) : [];
  const collection = params[0] && tables.indexOf(params[0]) !== -1 ? params[0] : '';
  const opened = params[1] || '';
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    api<{ tables?: Table[] }>('GET', '/admin/schema')
      .then((d) => {
        const map: Record<string, Table> = {};
        (d.tables || []).forEach((t) => (map[t.name] = t));
        setSchema(map);
      })
      .catch(fail);
    return () => closeLive();
  }, []);

  // No collection in the address bar: the first one, without a history entry.
  useEffect(() => {
    if (!schema) return;
    const names = Object.keys(schema);
    if (!names.length) return;
    if (!params[0] || names.indexOf(params[0]) === -1) replaceRoute('collections', names[0]);
  }, [schema, params[0]]);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setDebounced(search), 250);
  }, [search]);

  const columns = useMemo(() => columnsFor(schema, collection, data ? data.rows : []), [schema, collection, data]);

  function whereClause(): unknown {
    const clauses: unknown[] = [];
    const q = debounced.trim();
    if (q && schema) {
      const any: unknown[] = [{ objectId: { contains: q } }];
      ((schema[collection] || {}).columns || []).forEach((c) => {
        if (c.type === 'String' && !(collection === '_User' && c.name === 'password')) any.push({ [c.name]: { contains: q } });
      });
      clauses.push({ $or: any });
    }
    const raw = where.trim();
    if (raw) clauses.push(JSON.parse(raw));
    if (!clauses.length) return null;
    return clauses.length === 1 ? clauses[0] : { $and: clauses };
  }

  function load() {
    if (!collection) return;
    const query = ['limit=' + PAGE, 'count=1', 'skip=' + skip, 'sort=' + encode('["-createdAt"]')];
    let w: unknown;
    try {
      w = whereClause();
    } catch (e) {
      setProblem('The advanced filter is not valid JSON: ' + (e as Error).message);
      return;
    }
    setProblem(null);
    if (w) query.push('where=' + encode(JSON.stringify(w)));
    api<{ results?: Rec[]; count?: number }>('GET', '/api/' + encode(collection) + '?' + query.join('&'))
      .then((d) => {
        const rows = d.results || [];
        setData({ rows, total: d.count !== undefined ? d.count : rows.length });
        setSelected((sel) => {
          const next: Record<string, true> = {};
          rows.forEach((r) => {
            if (sel[r.objectId]) next[r.objectId] = true;
          });
          return next;
        });
      })
      .catch((e) => setProblem((e as Error).message));
  }

  useEffect(() => {
    load();
  }, [collection, debounced, where, skip]);

  useEffect(() => {
    setSkip(0);
    setSelected({});
  }, [collection]);

  useEffect(() => {
    if (liveOn && collection) openLive(collection, load);
    else closeLive();
  }, [liveOn, collection]);

  if (schema && !tables.length) {
    return (
      <Page>
        <EmptyState icon="▦" action={{ label: 'Create one in Schema', onClick: () => navigate('schema'), write: false }}>
          This backend has no collections yet.
        </EmptyState>
      </Page>
    );
  }

  const ids = Object.keys(selected);
  const rows = data ? data.rows : [];
  const total = data ? data.total : 0;

  function deleteMany() {
    confirmSimple('Delete ' + ids.length + ' record(s)', 'They are removed from ' + collection + ' permanently.', () => {
      ids
        .reduce((chain, id) => chain.then(() => api('DELETE', '/api/' + encode(collection) + '/' + encode(id))), Promise.resolve() as Promise<unknown>)
        .then(() => toast(ids.length + ' record(s) deleted.', 'ok'))
        .catch(fail)
        .then(() => {
          setSelected({});
          load();
        });
    });
  }

  function exportCsv() {
    if (!rows.length) return toast('Nothing to export on this page.', 'bad');
    const lines = [columns.map((c) => csvCell(c.name)).join(',')];
    rows.forEach((r) => lines.push(columns.map((c) => csvCell(r[c.name])).join(',')));
    const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = collection + '.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <Page>
      <Row>
        <Field label="Collection">
          <select value={collection} aria-label="Collection" onChange={(e) => navigate('collections', (e.currentTarget as HTMLSelectElement).value)}>
            {tables.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Search">
          <input type="search" placeholder="Search text fields…" style="min-width:220px" value={search} onInput={(e) => { setSearch((e.currentTarget as HTMLInputElement).value); setSkip(0); }} />
        </Field>
        <Btn onClick={load}>Refresh</Btn>
        {features.realtime ? (
          <label class="check">
            <input type="checkbox" checked={liveOn} onChange={(e) => setLiveOn((e.currentTarget as HTMLInputElement).checked)} /> Live
          </label>
        ) : null}
        <Spacer />
        {ids.length ? (
          <WriteBtn tiny kind="danger" onClick={deleteMany}>
            Delete {ids.length} selected
          </WriteBtn>
        ) : null}
        <Btn onClick={exportCsv}>Export CSV</Btn>
        <WriteBtn kind="primary" onClick={() => navigate('collections', collection, 'new')}>
          New record
        </WriteBtn>
      </Row>
      <Disclosure label="Advanced filter (JSON)">
        <Row>
          <WhereInput value={where} onApply={(v) => { setWhere(v); setSkip(0); }} />
          <Hint>Enter applies. Combined with the search above.</Hint>
        </Row>
      </Disclosure>
      <Gap />
      {problem ? <Notice kind="bad">{problem}</Notice> : null}
      {data ? (
        <>
          <Row>
            <Chip kind="accent">
              {collection} · {total} record(s)
            </Chip>
            {rows.length ? <Hint>Showing {skip + 1}–{skip + rows.length}</Hint> : null}
            <Spacer />
            <Btn tiny disabled={!(skip > 0)} onClick={() => setSkip(Math.max(0, skip - PAGE))}>
              Prev
            </Btn>
            <Btn tiny disabled={skip + rows.length >= total} onClick={() => setSkip(skip + PAGE)}>
              Next
            </Btn>
          </Row>
          <Gap h={8} />
          {!rows.length ? (
            <div class="scroller">
              {debounced || where ? (
                <EmptyState>No records match.</EmptyState>
              ) : (
                <EmptyState icon="＋" action={{ label: 'Add the first one', onClick: () => navigate('collections', collection, 'new') }}>
                  No records yet.
                </EmptyState>
              )}
            </div>
          ) : (
            <Grid
              collection={collection}
              rows={rows}
              columns={columns}
              selected={selected}
              setSelected={setSelected}
              readonly={readonly}
              onEdit={(r) => navigate('collections', collection, r.objectId)}
              onDeleted={load}
              onChanged={(r) => setData((d) => (d ? { ...d, rows: d.rows.map((x) => (x.objectId === r.objectId ? r : x)) } : d))}
            />
          )}
        </>
      ) : null}
      {opened && schema && collection ? (
        <RecordDrawer
          key={opened}
          collection={collection}
          table={schema[collection]}
          id={opened === 'new' ? null : opened}
          onClose={() => navigate('collections', collection)}
          onSaved={() => {
            navigate('collections', collection);
            load();
          }}
        />
      ) : null}
    </Page>
  );
}

function Page({ children }: { children?: any }) {
  return (
    <div>
      <h1>Collections</h1>
      <p class="sub">Browse and edit records. Click a cell to change it. Live updates arrive over the backend’s own SSE stream.</p>
      {children}
    </div>
  );
}

function WhereInput({ value, onApply }: { value: string; onApply: (v: string) => void }) {
  const [text, setText] = useState(value);
  return (
    <input
      type="text"
      placeholder='{"status":"open"}'
      style="min-width:280px"
      aria-label="Advanced filter (JSON)"
      value={text}
      onInput={(e) => setText((e.currentTarget as HTMLInputElement).value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          onApply(text);
        }
      }}
    />
  );
}

/** Schema columns first, in schema order; the three system fields bracket them. */
function columnsFor(schema: Record<string, Table> | null, collection: string, rows: Rec[]): Column[] {
  const t = (schema && schema[collection]) || { columns: [] };
  const out: Column[] = [{ name: 'objectId', type: 'String' }];
  (t.columns || []).forEach((c) => {
    if (!isSystemField(c.name) && c.name !== 'ACL') out.push(c);
  });
  const known = out.map((c) => c.name).concat(['createdAt', 'updatedAt', 'ACL']);
  rows.forEach((row) => {
    Object.keys(row).forEach((key) => {
      if (known.indexOf(key) === -1) {
        known.push(key);
        out.push({ name: key, type: guessType(row[key]) });
      }
    });
  });
  return out.concat([
    { name: 'createdAt', type: 'Date' },
    { name: 'updatedAt', type: 'Date' },
    { name: 'ACL', type: 'ACL' }
  ]);
}

interface GridProps {
  collection: string;
  rows: Rec[];
  columns: Column[];
  selected: Record<string, true>;
  setSelected: (fn: (s: Record<string, true>) => Record<string, true>) => void;
  readonly: boolean;
  onEdit: (row: Rec) => void;
  onDeleted: () => void;
  onChanged: (row: Rec) => void;
}

function Grid({ collection, rows, columns, selected, setSelected, readonly, onEdit, onDeleted, onChanged }: GridProps) {
  const allOn = rows.every((r) => selected[r.objectId]);
  return (
    <div class="scroller">
      <table class="grid">
        <thead>
          <tr>
            <th class="pick">
              <input
                type="checkbox"
                title="Select all on this page"
                checked={allOn}
                onChange={(e) => {
                  const on = (e.currentTarget as HTMLInputElement).checked;
                  setSelected((s) => {
                    const next = { ...s };
                    rows.forEach((r) => {
                      if (on) next[r.objectId] = true;
                      else delete next[r.objectId];
                    });
                    return next;
                  });
                }}
              />
            </th>
            {columns.map((c) => (
              <th key={c.name}>
                {c.name} <span class="th-type">{c.type}</span>
              </th>
            ))}
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.objectId}>
              <td class="pick">
                <input
                  type="checkbox"
                  checked={!!selected[row.objectId]}
                  onChange={(e) => {
                    const on = (e.currentTarget as HTMLInputElement).checked;
                    setSelected((s) => {
                      const next = { ...s };
                      if (on) next[row.objectId] = true;
                      else delete next[row.objectId];
                      return next;
                    });
                  }}
                />
              </td>
              {columns.map((c) => (
                <Cell key={c.name} collection={collection} row={row} col={c} readonly={readonly} onChanged={onChanged} />
              ))}
              <td class="actions">
                <WriteBtn tiny onClick={() => onEdit(row)}>
                  Edit
                </WriteBtn>{' '}
                <WriteBtn
                  tiny
                  kind="danger"
                  onClick={() =>
                    confirmSimple('Delete record', 'This removes ' + collection + '/' + row.objectId + ' permanently.', () => {
                      api('DELETE', '/api/' + encode(collection) + '/' + encode(row.objectId))
                        .then(() => {
                          toast('Record deleted.', 'ok');
                          onDeleted();
                        })
                        .catch(fail);
                    })
                  }
                >
                  Delete
                </WriteBtn>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** One cell. Click to edit in place; Enter or leaving it saves, Esc cancels. Booleans flip. */
function Cell({ collection, row, col, readonly, onChanged }: { collection: string; row: Rec; col: Column; readonly: boolean; onChanged: (row: Rec) => void }) {
  const [editing, setEditing] = useState(false);
  const [raw, setRaw] = useState<Raw>('');
  const done = useRef(false);
  const editable = !readonly && !isSystemField(col.name) && col.type !== 'Relation' && !(collection === '_User' && col.name === 'authData');
  const text = col.name === 'objectId' ? shortId(row.objectId) : displayValue(row[col.name], col.type);
  const title = col.name === 'objectId' || col.type === 'Pointer' ? String(plain(row[col.name]) || '') : text;
  const shy = col.type === 'ACL' && (row.ACL === null || row.ACL === undefined);

  function save(value: unknown): Promise<void> {
    const body: Rec = {};
    body[col.name] = value === undefined ? null : toWire(col, value);
    return api<Rec>('PUT', '/api/' + encode(collection) + '/' + encode(row.objectId), body).then((res) => {
      const next = { ...row, [col.name]: value === undefined ? null : toWire(col, value) };
      if (res && res.updatedAt) next.updatedAt = res.updatedAt;
      onChanged(next);
      toast(col.name + ' saved.', 'ok');
    });
  }

  function begin() {
    if (editing) return;
    if (col.type === 'Boolean') {
      save(!(plain(row[col.name]) === true)).catch(fail);
      return;
    }
    if (JSON_TYPES.indexOf(col.type) !== -1) {
      openModal((close) => <JsonCellDialog col={col} value={row[col.name]} close={close} save={save} />);
      return;
    }
    setRaw(rawFrom(col, row[col.name]));
    done.current = false;
    setEditing(true);
  }

  function finish(commit: boolean, value?: Raw) {
    if (done.current) return;
    done.current = true;
    setEditing(false);
    if (!commit) return;
    let parsed: unknown;
    try {
      parsed = parseRaw(col, value === undefined ? raw : value);
    } catch (e) {
      fail(e);
      return;
    }
    const before = plain(row[col.name]);
    if (parsed === before || (parsed === undefined && (before === null || before === undefined))) return;
    save(parsed).catch(fail);
  }

  if (!editable) {
    return (
      <td class={'locked' + (shy ? ' shy' : '')} title={title}>
        {text}
      </td>
    );
  }
  if (editing) {
    return (
      <td class="cell-edit">
        <FieldControl
          col={col}
          raw={raw}
          onChange={(v) => setRaw(v)}
          autoFocus
          onCommit={() => finish(true)}
          onCancel={() => finish(false)}
        />
      </td>
    );
  }
  return (
    <td class={'editable' + (shy ? ' shy' : '')} title={title} onClick={begin}>
      {text}
    </td>
  );
}

function JsonCellDialog({ col, value, close, save }: { col: Column; value: unknown; close: () => void; save: (v: unknown) => Promise<void> }) {
  const [raw, setRaw] = useState<Raw>(rawFrom(col, value));
  return (
    <Dialog
      title={'Edit ' + col.name}
      actions={
        <>
          <Btn onClick={close}>Cancel</Btn>
          <Btn
            kind="primary"
            onClick={() => {
              let parsed: unknown;
              try {
                parsed = parseRaw(col, raw);
              } catch (e) {
                return fail(e);
              }
              save(parsed).then(close).catch(fail);
            }}
          >
            Save
          </Btn>
        </>
      }
    >
      <Labelled col={col}>
        <FieldControl col={col} raw={raw} onChange={setRaw} autoFocus />
      </Labelled>
    </Dialog>
  );
}

export function Labelled({ col, children }: { col: Column; children?: any }) {
  const pointy = col.type === 'Pointer' || col.type === 'Relation';
  return (
    <div class="field">
      <span class="field-head">
        <b>{col.name}</b>
        {col.required ? <span class="req">required</span> : null}
        <span class="chip type">{col.type + (pointy && col.targetClass ? ' → ' + col.targetClass : '')}</span>
      </span>
      {children}
    </div>
  );
}

/** Create (id = null) or edit a whole record, one labelled field per column, in the drawer. */
function RecordDrawer({ collection, table, id, onClose, onSaved }: { collection: string; table: Table | undefined; id: string | null; onClose: () => void; onSaved: () => void }) {
  const editing = id !== null;
  const [row, setRow] = useState<Rec | null>(editing ? null : {});
  const [raws, setRaws] = useState<Record<string, Raw>>({});
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  let cols = ((table && table.columns) || []).filter(
    (c) => !isSystemField(c.name) && c.name !== 'ACL' && c.type !== 'Relation' && !(collection === '_User' && (c.name === 'authData' || c.name === 'emailVerified'))
  );
  if (editing) cols = cols.concat([{ name: 'ACL', type: 'ACL' }]);

  useEffect(() => {
    if (!editing) {
      const start: Record<string, Raw> = {};
      cols.forEach((c) => (start[c.name] = rawFrom(c, c.defaultValue)));
      setRaws(start);
      return;
    }
    api<Rec>('GET', '/api/' + encode(collection) + '/' + encode(id!))
      .then((r) => {
        setRow(r);
        const start: Record<string, Raw> = {};
        cols.forEach((c) => (start[c.name] = rawFrom(c, r[c.name])));
        setRaws(start);
      })
      .catch((e) => {
        setMissing(true);
        fail(e);
      });
  }, [collection, id]);

  function submit() {
    const data: Rec = {};
    try {
      cols.forEach((c) => {
        const value = parseRaw(c, raws[c.name] === undefined ? rawFrom(c, undefined) : raws[c.name]);
        if (value === undefined || value === '') {
          if (c.required && c.type !== 'Boolean') throw new Error(c.name + ' is required.');
          if (value === '' && c.type === 'String' && editing) data[c.name] = '';
          else if (editing && row && row[c.name] !== null && row[c.name] !== undefined) data[c.name] = null;
          return;
        }
        data[c.name] = toWire(c, value);
      });
    } catch (e) {
      setError((e as Error).message);
      return;
    }
    const base = '/api/' + encode(collection);
    (editing ? api('PUT', base + '/' + encode(id!), data) : api('POST', base, data))
      .then(() => {
        toast(editing ? 'Record saved.' : 'Record created.', 'ok');
        onSaved();
      })
      .catch((e) => setError((e as Error).message));
  }

  const title = editing ? 'Edit ' + collection + ' / ' + shortId(id) : 'New record in ' + collection;
  return (
    <Drawer
      title={title}
      subtitle={editing ? 'objectId, createdAt and updatedAt are kept by the backend.' : undefined}
      onClose={onClose}
      footer={
        <>
          <Btn onClick={onClose}>Cancel</Btn>
          <WriteBtn kind="primary" disabled={!cols.length || missing || (editing && !row)} onClick={submit}>
            {editing ? 'Save' : 'Create'}
          </WriteBtn>
        </>
      }
    >
      {!cols.length ? (
        <Notice>
          {collection} has no fields yet.{' '}
          <Btn tiny onClick={() => navigate('schema', collection)}>
            Add fields in Schema
          </Btn>
        </Notice>
      ) : missing ? (
        <Notice kind="bad">That record is not in {collection} any more.</Notice>
      ) : editing && !row ? (
        <Hint>Loading…</Hint>
      ) : (
        <div class="form-grid" onInput={() => setError(null)}>
          {cols.map((c, i) => (
            <Labelled key={c.name} col={c}>
              <FieldControl col={c} raw={raws[c.name] === undefined ? rawFrom(c, undefined) : raws[c.name]} onChange={(v) => setRaws((r) => ({ ...r, [c.name]: v }))} autoFocus={i === 0} />
            </Labelled>
          ))}
        </div>
      )}
      {error ? <Notice kind="bad" style="margin-top:12px">{error}</Notice> : null}
      {editing && row ? (
        <Disclosure label="Raw record">
          <textarea readOnly value={JSON.stringify(row, null, 2)} style="min-height:200px" />
        </Disclosure>
      ) : null}
    </Drawer>
  );
}

export { cellText };
