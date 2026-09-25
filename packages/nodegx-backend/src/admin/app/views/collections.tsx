/**
 * Collections — find records by saying it in rows, sort by clicking a column,
 * choose the columns, save that as a view the team shares, and edit any field
 * in a control made for its type (BMG-002).
 *
 * The filter row's model is `filters.ts`, the typed editors are `fields.tsx`,
 * "who can see this record" is `acl.ts` + `composers/AclCard.tsx`. A row click
 * opens the record in a drawer the URL names (`#/collections/Pet/<id>`,
 * `…/new`); a double-click edits one cell in place.
 */
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';

import { api, encode, openLive, closeLive, useSession } from '../api';
import { AclCard, Drawer, EmptyState, FilterRows } from '../composers';
import { FieldControl, Raw, RelationEditor, parseRaw, pointerItem, rawFrom } from '../fields';
import { Cond, FilterField, Group, blankCond, condWhere, describe, filterKind, fromWhere, toWhere } from '../filters';
import { Column, csvCell, displayValue, guessType, isSystemField, parseCsv, plain, shortId, toWire } from '../format';
import { navigate, replaceRoute } from '../router';
import { Btn, Dialog, Disclosure, Field, Gap, Hint, Notice, Row, Spacer, WriteBtn, confirmSimple, fail, openModal, toast } from '../ui';
import type { ViewProps } from './index';

const PAGE_SIZES = [25, 50, 100, 250];
const EMPTY: Group = { kind: 'group', conj: 'and', items: [] };
/** Values a person edits in a dialog rather than in the cell. */
const DIALOG_TYPES = ['Object', 'Array', 'ACL', 'File', 'GeoPoint'];
const SORTABLE = ['String', 'Number', 'Boolean', 'Date', 'Pointer'];

interface Table {
  name: string;
  columns?: Column[];
}

interface SavedView {
  name: string;
  filter: Group | null;
  sort: string[];
  columns: string[];
  savedAt: string;
}

type Rec = Record<string, any>;

function store(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function keep(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* private mode: the page still works, it just forgets */
  }
}

/** The fields a filter row can name: the schema's, plus the three the backend keeps. */
export function filterFields(table: Table | undefined): FilterField[] {
  const out: FilterField[] = [{ name: 'objectId', kind: 'text' }];
  ((table && table.columns) || []).forEach((c) => {
    if (isSystemField(c.name) || c.name === 'ACL') return;
    const kind = filterKind(c.type);
    if (kind) out.push({ name: c.name, kind, targetClass: c.targetClass });
  });
  return out.concat([
    { name: 'createdAt', kind: 'date' },
    { name: 'updatedAt', kind: 'date' }
  ]);
}

/** Only the conditions that are complete; the rest wait until they have a value. */
export function applicable(group: Group, fields: FilterField[]): { group: Group; waiting: number } {
  let waiting = 0;
  const items: Array<Cond | Group> = [];
  group.items.forEach((item) => {
    if (item.kind === 'group') {
      const sub = applicable(item, fields);
      waiting += sub.waiting;
      if (sub.group.items.length) items.push(sub.group);
      return;
    }
    try {
      condWhere(item, fields);
      items.push(item);
    } catch {
      waiting++;
    }
  });
  return { group: { ...group, items }, waiting };
}

function linkConds(group: Group): Cond[] {
  return group.items.reduce<Cond[]>((all, i) => all.concat(i.kind === 'group' ? linkConds(i) : i.op === 'is' ? [i] : []), []);
}

/** Click: sort by it; again: flip; a third time: stop. ⇧ adds it to the sort instead of replacing. */
export function nextSort(sort: string[], field: string, add: boolean): string[] {
  const at = sort.findIndex((s) => s === field || s === '-' + field);
  const current = at === -1 ? null : sort[at];
  const next = current === null ? field : current === field ? '-' + field : null;
  if (!add) return next ? [next] : [];
  if (at === -1) return sort.concat([field]);
  return next ? sort.map((s, i) => (i === at ? next : s)) : sort.filter((_, i) => i !== at);
}

export function CollectionsView({ params }: ViewProps) {
  const { features, readonly, whoami } = useSession();
  const backendId = whoami ? whoami.backend.id : '';
  const [schema, setSchema] = useState<Record<string, Table> | null>(null);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [rows, setRows] = useState<Group>(EMPTY);
  const [appliedRows, setAppliedRows] = useState<Group>(EMPTY);
  const [advanced, setAdvanced] = useState<unknown>(null);
  const [sort, setSort] = useState<string[]>([]);
  const [pageSize, setPageSize] = useState(50);
  const [liveOn, setLiveOn] = useState(false);
  const [skip, setSkip] = useState(0);
  const [selected, setSelected] = useState<Record<string, true>>({});
  const [data, setData] = useState<{ rows: Rec[]; total: number } | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [views, setViews] = useState<SavedView[]>([]);
  const [activeView, setActiveView] = useState('');
  const [shown, setShown] = useState<string[] | null>(null);
  const tables = schema ? Object.keys(schema) : [];
  const collection = params[0] && tables.indexOf(params[0]) !== -1 ? params[0] : '';
  const opened = params[1] || '';
  const table = schema && collection ? schema[collection] : undefined;
  const fields = useMemo(() => filterFields(table), [table]);
  const colsKey = 'nodegx.admin.columns.' + backendId + '.' + collection;
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rowsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadSeq = useRef(0);

  useEffect(() => {
    api<{ tables?: Table[] }>('GET', '/admin/schema')
      .then((d) => {
        const map: Record<string, Table> = {};
        // BMG-004: the accounts table is listed for the Schema page; its records
        // are people, and people are edited on the Users page, whose writes hash
        // a password and revoke sessions. Not a grid of raw rows here.
        (d.tables || []).filter((t) => t.name.charAt(0) !== '_').forEach((t) => (map[t.name] = t));
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

  // The filter row re-queries 250 ms after the last change, as the search does.
  useEffect(() => {
    if (rowsTimer.current) clearTimeout(rowsTimer.current);
    rowsTimer.current = setTimeout(() => setAppliedRows(rows), 250);
  }, [rows]);

  // A new collection starts clean, with its remembered columns and its views.
  useEffect(() => {
    setSkip(0);
    setSelected({});
    setRows(EMPTY);
    setAppliedRows(EMPTY);
    setAdvanced(null);
    setSort([]);
    setActiveView('');
    setData(null);
    const kept = store(colsKey);
    setShown(kept ? (JSON.parse(kept) as string[]) : null);
    if (collection) loadViews();
  }, [collection]);

  const { group: applied, waiting } = useMemo(() => applicable(appliedRows, fields), [appliedRows, fields]);
  // The sentence names a linked record by what it says, never by its id.
  const [linkNames, setLinkNames] = useState<Record<string, string>>({});
  useEffect(() => {
    linkConds(applied).forEach((c) => {
      const f = fields.find((x) => x.name === c.field);
      if (!f || f.kind !== 'link' || !f.targetClass || !c.value || linkNames[c.value]) return;
      api<Rec>('GET', '/api/' + encode(f.targetClass) + '/' + encode(c.value))
        .then((r) => setLinkNames((n) => ({ ...n, [c.value!]: pointerItem(r).label })))
        .catch(() => setLinkNames((n) => ({ ...n, [c.value!]: 'a record that no longer exists' })));
    });
  }, [JSON.stringify(applied)]);
  const allColumns = useMemo(() => columnsFor(table, data ? data.rows : []), [table, data]);
  // A link cell says what the record it points at says (one query per link column per page).
  const [labels, setLabels] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!data || !table) return;
    (table.columns || [])
      .filter((c) => c.type === 'Pointer' && c.targetClass)
      .forEach((c) => {
        const ids = Array.from(new Set(data.rows.map((r) => plain(r[c.name])).filter((v): v is string => typeof v === 'string' && !labels[v])));
        if (!ids.length) return;
        api<{ results?: Rec[] }>('GET', '/api/' + encode(c.targetClass!) + '?limit=' + ids.length + '&where=' + encode(JSON.stringify({ objectId: { $in: ids } })))
          .then((d) => {
            const next: Record<string, string> = {};
            (d.results || []).forEach((r) => (next[r.objectId] = pointerItem(r).label));
            setLabels((l) => ({ ...l, ...next }));
          })
          .catch(() => undefined);
      });
  }, [data, table]);
  const visible = useMemo(() => pickColumns(allColumns, shown), [allColumns, shown]);

  function whereClause(): unknown {
    const clauses: unknown[] = [];
    const q = debounced.trim();
    if (q && table) {
      const any: unknown[] = [{ objectId: { contains: q } }];
      (table.columns || []).forEach((c) => {
        if (c.type === 'String') any.push({ [c.name]: { contains: q } });
      });
      clauses.push({ $or: any });
    }
    const w = toWhere(applied, fields);
    if (w) clauses.push(w);
    if (advanced) clauses.push(advanced);
    if (!clauses.length) return null;
    return clauses.length === 1 ? clauses[0] : { $and: clauses };
  }

  function query(limit: number, from: number): string {
    const q = ['limit=' + limit, 'count=1', 'skip=' + from, 'sort=' + encode(JSON.stringify(sort.length ? sort : ['-createdAt']))];
    const w = whereClause();
    if (w) q.push('where=' + encode(JSON.stringify(w)));
    return '/api/' + encode(collection) + '?' + q.join('&');
  }

  function load() {
    if (!collection) return;
    const mine = ++loadSeq.current;
    setProblem(null);
    api<{ results?: Rec[]; count?: number }>('GET', query(pageSize, skip))
      .then((d) => {
        if (mine !== loadSeq.current) return;
        const got = d.results || [];
        setData({ rows: got, total: d.count !== undefined ? d.count : got.length });
        setSelected((sel) => {
          const next: Record<string, true> = {};
          got.forEach((r) => {
            if (sel[r.objectId]) next[r.objectId] = true;
          });
          return next;
        });
      })
      .catch((e) => {
        if (mine === loadSeq.current) setProblem((e as Error).message);
      });
  }

  function loadViews() {
    api<{ views?: SavedView[] }>('GET', '/admin/views/' + encode(collection))
      .then((d) => setViews(d.views || []))
      .catch(() => setViews([]));
  }

  useEffect(() => {
    load();
  }, [collection, debounced, JSON.stringify(applied), JSON.stringify(advanced), JSON.stringify(sort), skip, pageSize]);

  // Live: every change event is one re-query, coalesced by `openLive`'s own debounce.
  const loadRef = useRef(load);
  loadRef.current = load;
  useEffect(() => {
    if (liveOn && collection) openLive(collection, () => loadRef.current());
    else closeLive();
  }, [liveOn, collection]);

  const total = data ? data.total : 0;
  const got = data ? data.rows : [];

  // ← / → turn the page when nothing else wants the keys.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      if (e.altKey || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.closest('input, textarea, select, [contenteditable], [role="combobox"]') || t.isContentEditable)) return;
      if (document.querySelector('.drawer, [role="dialog"]')) return;
      if (e.key === 'ArrowLeft' && skip > 0) setSkip(Math.max(0, skip - pageSize));
      if (e.key === 'ArrowRight' && skip + got.length < total) setSkip(skip + pageSize);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [skip, pageSize, got.length, total]);

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
  const filtered = !!(debounced.trim() || applied.items.length || advanced);

  function changeRows(g: Group) {
    setRows(g);
    setSkip(0);
    setActiveView('');
  }

  function setColumns(names: string[] | null) {
    setShown(names);
    keep(colsKey, names ? JSON.stringify(names) : null);
  }

  function applyView(name: string) {
    setActiveView(name);
    const v = views.find((x) => x.name === name);
    const g = v && v.filter ? v.filter : EMPTY;
    setRows(g);
    setAppliedRows(g);
    setAdvanced(null);
    setSort(v ? v.sort : []);
    if (v && v.columns.length) setColumns(v.columns);
    setSkip(0);
  }

  function saveView() {
    openModal((close) => (
      <SaveViewDialog
        initial={activeView}
        taken={views.map((v) => v.name)}
        close={close}
        save={(name) =>
          api<SavedView>('PUT', '/admin/views/' + encode(collection) + '/' + encode(name), {
            filter: rows.items.length ? rows : null,
            sort,
            columns: visible.map((c) => c.name)
          }).then(() => {
            toast('View “' + name + '” saved.', 'ok');
            setActiveView(name);
            loadViews();
            close();
          })
        }
      />
    ));
  }

  function deleteView() {
    const name = activeView;
    confirmSimple('Delete the view “' + name + '”', 'It is removed for everyone who administers this backend. The records are not touched.', () => {
      api('DELETE', '/admin/views/' + encode(collection) + '/' + encode(name))
        .then(() => {
          toast('View deleted.', 'ok');
          setActiveView('');
          loadViews();
        })
        .catch(fail);
    });
  }

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

  function download(records: Rec[], suffix: string) {
    if (!records.length) return toast('Nothing to export.', 'bad');
    const cols = allColumns;
    const lines = [cols.map((c) => csvCell(c.name)).join(',')];
    records.forEach((r) => lines.push(cols.map((c) => csvCell(plain(r[c.name]))).join(',')));
    const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = collection + suffix + '.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function exportAll() {
    const all: Rec[] = [];
    const step = 500;
    for (let from = 0; from < 200000; from += step) {
      const d = await api<{ results?: Rec[] }>('GET', query(step, from));
      const part = d.results || [];
      all.push(...part);
      if (part.length < step) break;
    }
    download(all, '');
  }

  function openAdvanced(text: string) {
    let parsed: unknown;
    try {
      parsed = text.trim() ? JSON.parse(text) : null;
    } catch (e) {
      return setProblem('The advanced filter is not valid JSON: ' + (e as Error).message);
    }
    setProblem(null);
    if (parsed === null) return setAdvanced(null);
    const asRows = fromWhere(parsed, fields);
    if (asRows && asRows.items.length) {
      // Anything rows can say goes into rows, so it can be read and changed there.
      const merged: Group = rows.items.length ? { kind: 'group', conj: 'and', items: [...rows.items, ...(asRows.conj === 'and' ? asRows.items : [asRows])] } : asRows;
      setRows(merged);
      setAppliedRows(merged);
      setAdvanced(null);
      toast('The filter is now in rows above.', 'ok');
    } else {
      setAdvanced(parsed);
    }
    setSkip(0);
  }

  const sentence = describe(applied, fields, (_, id) => linkNames[id] || '…');
  const q = debounced.trim();

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
        <Field label="View">
          <select aria-label="View" value={activeView} onChange={(e) => applyView((e.currentTarget as HTMLSelectElement).value)}>
            <option value="">All records</option>
            {views.map((v) => (
              <option key={v.name} value={v.name}>
                {v.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Search">
          <input type="search" placeholder="Search text fields…" style="min-width:200px" value={search} onInput={(e) => { setSearch((e.currentTarget as HTMLInputElement).value); setSkip(0); }} />
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
        <WriteBtn kind="primary" onClick={() => navigate('collections', collection, 'new')}>
          New record
        </WriteBtn>
      </Row>
      <Gap h={8} />
      <div class="filter-box">
        {rows.items.length ? (
          <FilterRows group={rows} fields={fields} onChange={changeRows} />
        ) : (
          <button type="button" class="btn tiny" onClick={() => changeRows({ kind: 'group', conj: 'and', items: [blankCond(fields[1] || fields[0])] })}>
            + Filter
          </button>
        )}
        {waiting ? <Hint>{waiting === 1 ? 'One condition has no value yet; it is not applied.' : waiting + ' conditions have no value yet; they are not applied.'}</Hint> : null}
        {advanced ? (
          <Notice kind="accent">
            An advanced filter is applied as well: <code>{JSON.stringify(advanced)}</code>{' '}
            <Btn tiny onClick={() => setAdvanced(null)}>
              Clear it
            </Btn>
          </Notice>
        ) : null}
        <Row>
          <Btn tiny onClick={() => openModal((close) => <ColumnsDialog all={allColumns} shown={visible.map((c) => c.name)} close={close} onApply={setColumns} />)}>
            Columns
          </Btn>
          <WriteBtn tiny onClick={saveView}>
            Save view…
          </WriteBtn>
          {activeView ? (
            <WriteBtn tiny kind="danger" onClick={deleteView}>
              Delete view
            </WriteBtn>
          ) : null}
          <Spacer />
          <Btn tiny onClick={() => download(got, '-page')}>
            Export this page
          </Btn>
          <Btn tiny onClick={() => exportAll().catch(fail)}>
            Export all records
          </Btn>
          <WriteBtn tiny onClick={() => openModal((close) => <ImportDialog collection={collection} table={table} close={close} onDone={load} />)}>
            Import CSV
          </WriteBtn>
        </Row>
        <Disclosure label="Advanced (JSON)">
          <Row>
            <WhereInput onApply={openAdvanced} />
            <Hint>Enter applies. Anything the rows can say moves into the rows.</Hint>
          </Row>
        </Disclosure>
      </div>
      <Gap h={8} />
      {problem ? <Notice kind="bad">{problem}</Notice> : null}
      {data ? (
        <>
          <Row>
            <span class="result-sentence">
              <b>
                {total} {total === 1 ? 'record' : 'records'}
              </b>
              {sentence ? ' where ' + sentence : ''}
              {q ? (sentence ? ', matching “' + q + '”' : ' matching “' + q + '”') : ''}
              {advanced ? ' (and the advanced filter)' : ''}
            </span>
            <Spacer />
            {got.length ? <Hint>Showing {skip + 1}–{skip + got.length}</Hint> : null}
            <select aria-label="Records per page" value={String(pageSize)} onChange={(e) => { setPageSize(Number((e.currentTarget as HTMLSelectElement).value)); setSkip(0); }}>
              {PAGE_SIZES.map((n) => (
                <option key={n} value={String(n)}>
                  {n} a page
                </option>
              ))}
            </select>
            <Btn tiny disabled={!(skip > 0)} onClick={() => setSkip(Math.max(0, skip - pageSize))} title="Previous page (←)">
              Prev
            </Btn>
            <Btn tiny disabled={skip + got.length >= total} onClick={() => setSkip(skip + pageSize)} title="Next page (→)">
              Next
            </Btn>
          </Row>
          <Gap h={8} />
          {!got.length ? (
            <div class="scroller">
              {filtered ? (
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
              rows={got}
              columns={visible}
              sort={sort}
              onSort={(field, add) => {
                setSort(nextSort(sort, field, add));
                setSkip(0);
              }}
              selected={selected}
              setSelected={setSelected}
              readonly={readonly}
              onOpen={(r) => navigate('collections', collection, r.objectId)}
              onDeleted={load}
              onChanged={(r) => setData((d) => (d ? { ...d, rows: d.rows.map((x) => (x.objectId === r.objectId ? r : x)) } : d))}
              labels={labels}
            />
          )}
        </>
      ) : null}
      {opened && schema && collection ? (
        <RecordDrawer
          key={opened}
          collection={collection}
          table={table}
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
      <p class="sub">Find records by saying it in rows, sort by a column, and open a record to change it. Live updates arrive over the backend’s own SSE stream.</p>
      {children}
    </div>
  );
}

function WhereInput({ onApply }: { onApply: (v: string) => void }) {
  const [text, setText] = useState('');
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
          setText('');
        }
      }}
    />
  );
}

/** Schema columns first, in schema order; the three system fields bracket them. */
function columnsFor(t: Table | undefined, rows: Rec[]): Column[] {
  const out: Column[] = [{ name: 'objectId', type: 'String' }];
  ((t && t.columns) || []).forEach((c) => {
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

/** The columns shown: the person's choice (in their order), else everything but the system ones except createdAt. */
export function pickColumns(all: Column[], shown: string[] | null): Column[] {
  if (!shown) return all.filter((c) => c.name !== 'objectId' && c.name !== 'updatedAt' && c.name !== 'ACL');
  const byName: Record<string, Column> = {};
  all.forEach((c) => (byName[c.name] = c));
  const out = shown.filter((n) => byName[n]).map((n) => byName[n]);
  return out.length ? out : all.filter((c) => c.name !== 'objectId');
}

function ColumnsDialog({ all, shown, close, onApply }: { all: Column[]; shown: string[]; close: () => void; onApply: (names: string[] | null) => void }) {
  const [order, setOrder] = useState<string[]>(() => shown.concat(all.map((c) => c.name).filter((n) => shown.indexOf(n) === -1)));
  const [on, setOn] = useState<Record<string, boolean>>(() => {
    const m: Record<string, boolean> = {};
    shown.forEach((n) => (m[n] = true));
    return m;
  });
  const [drag, setDrag] = useState<number | null>(null);
  const move = (from: number, to: number) => {
    if (to < 0 || to >= order.length || from === to) return;
    const next = order.slice();
    const [x] = next.splice(from, 1);
    next.splice(to, 0, x);
    setOrder(next);
  };
  const typeOf = (n: string) => (all.find((c) => c.name === n) || { type: '' }).type;
  return (
    <Dialog
      title="Columns"
      actions={
        <>
          <Btn
            onClick={() => {
              onApply(null);
              close();
            }}
          >
            Reset
          </Btn>
          <Spacer />
          <Btn onClick={close}>Cancel</Btn>
          <Btn
            kind="primary"
            onClick={() => {
              const names = order.filter((n) => on[n]);
              if (!names.length) return toast('Show at least one column.', 'bad');
              onApply(names);
              close();
            }}
          >
            Apply
          </Btn>
        </>
      }
    >
      <p class="sub">Tick the columns to show; drag, or use ↑ ↓, to put them in order. Remembered for this collection in this browser.</p>
      <div class="columns-list">
        {order.map((n, i) => (
          <div
            key={n}
            class={'columns-row' + (drag === i ? ' dragging' : '')}
            draggable
            onDragStart={() => setDrag(i)}
            onDragOver={(e) => {
              e.preventDefault();
              if (drag !== null && drag !== i) {
                move(drag, i);
                setDrag(i);
              }
            }}
            onDragEnd={() => setDrag(null)}
          >
            <span class="drag-handle" aria-hidden="true">
              ⠿
            </span>
            <label class="check">
              <input type="checkbox" checked={!!on[n]} onChange={(e) => setOn({ ...on, [n]: (e.currentTarget as HTMLInputElement).checked })} />
              {n} <span class="th-type">{typeOf(n)}</span>
            </label>
            <Spacer />
            <button type="button" class="btn tiny" aria-label={'Move ' + n + ' up'} disabled={i === 0} onClick={() => move(i, i - 1)}>
              ↑
            </button>
            <button type="button" class="btn tiny" aria-label={'Move ' + n + ' down'} disabled={i === order.length - 1} onClick={() => move(i, i + 1)}>
              ↓
            </button>
          </div>
        ))}
      </div>
    </Dialog>
  );
}

function SaveViewDialog({ initial, taken, close, save }: { initial: string; taken: string[]; close: () => void; save: (name: string) => Promise<void> }) {
  const [name, setName] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const submit = () => {
    const n = name.trim();
    if (!n) return setError('A view needs a name.');
    save(n).catch((e) => setError((e as Error).message));
  };
  return (
    <Dialog
      title="Save view"
      actions={
        <>
          <Btn onClick={close}>Cancel</Btn>
          <Btn kind="primary" onClick={submit}>
            Save
          </Btn>
        </>
      }
    >
      <p class="sub">The filter, the sort and the columns, kept by the backend so everyone who administers it can open them.</p>
      <Field label="Name">
        <input
          type="text"
          value={name}
          onInput={(e) => {
            setName((e.currentTarget as HTMLInputElement).value);
            setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
          }}
        />
      </Field>
      {taken.indexOf(name.trim()) !== -1 ? <Hint>There is a view with this name; saving replaces it.</Hint> : null}
      {error ? <Notice kind="bad">{error}</Notice> : null}
    </Dialog>
  );
}

interface ImportReport {
  total: number;
  created: number;
  updated: number;
  rejected: Array<{ row: number; errors: string[] }>;
  applied: boolean;
  error?: string;
}

/** Import CSV: a file, a preview, a column→field mapping, the server's own dry run, then the import. */
function ImportDialog({ collection, table, close, onDone }: { collection: string; table: Table | undefined; close: () => void; onDone: () => void }) {
  const [csv, setCsv] = useState<string[][] | null>(null);
  const [fileName, setFileName] = useState('');
  const [mapping, setMapping] = useState<string[]>([]);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const picker = useRef<HTMLInputElement>(null);
  const targets = ['objectId'].concat(((table && table.columns) || []).filter((c) => !isSystemField(c.name) && c.name !== 'ACL' && c.type !== 'Relation').map((c) => c.name));
  const typeOf = (n: string) => (((table && table.columns) || []).find((c) => c.name === n) || { type: n === 'objectId' ? 'id' : '' }).type;

  const content = (): string => {
    if (!csv) return '';
    const keepCols = mapping.map((m, i) => (m ? i : -1)).filter((i) => i !== -1);
    const lines = [keepCols.map((i) => csvCell(mapping[i])).join(',')];
    csv.slice(1).forEach((r) => lines.push(keepCols.map((i) => csvCell(r[i] === undefined ? '' : r[i])).join(',')));
    return lines.join('\n');
  };

  const send = (dryRun: boolean) => api<ImportReport>('POST', '/admin/import/' + encode(collection), { format: 'csv', content: content(), dryRun });

  // The server decides what lands; its dry run is the type warning.
  useEffect(() => {
    if (!csv || !mapping.some(Boolean)) return setReport(null);
    const t = setTimeout(() => {
      send(true)
        .then(setReport)
        .catch((e) => setError((e as Error).message));
    }, 250);
    return () => clearTimeout(t);
  }, [csv, mapping.join('|')]);

  const read = (file: File) => {
    setError(null);
    setFileName(file.name);
    const r = new FileReader();
    r.onload = () => {
      const parsed = parseCsv(String(r.result || ''));
      if (parsed.length < 2) return setError('That file has no rows under its header.');
      setCsv(parsed);
      setMapping(parsed[0].map((h) => targets.find((t) => t.toLowerCase() === h.trim().toLowerCase()) || ''));
    };
    r.readAsText(file);
  };

  const importNow = () => {
    setBusy(true);
    send(false)
      .then((rep) => {
        if (!rep.applied) throw new Error(rep.error || 'Nothing was imported.');
        toast(rep.created + ' added, ' + rep.updated + ' updated' + (rep.rejected.length ? ', ' + rep.rejected.length + ' rejected' : '') + '.', 'ok');
        onDone();
        close();
      })
      .catch((e) => setError((e as Error).message))
      .then(() => setBusy(false));
  };

  const header = csv ? csv[0] : [];
  return (
    <Dialog
      title={'Import CSV into ' + collection}
      wide
      actions={
        <>
          <Btn onClick={close}>Cancel</Btn>
          <Btn kind="primary" disabled={busy || !report || report.created + report.updated === 0} onClick={importNow}>
            {report ? 'Import ' + (report.created + report.updated) + ' record(s)' : 'Import'}
          </Btn>
        </>
      }
    >
      <Row>
        <Btn onClick={() => picker.current && picker.current.click()}>{fileName ? 'Choose another file' : 'Choose a CSV file'}</Btn>
        <input ref={picker} type="file" accept=".csv,text/csv" hidden onChange={(e) => { const f = (e.currentTarget as HTMLInputElement).files; if (f && f[0]) read(f[0]); }} />
        {fileName ? <Hint>{fileName} · {csv ? csv.length - 1 : 0} rows</Hint> : <Hint>The first row names the columns.</Hint>}
      </Row>
      {csv ? (
        <>
          <Gap h={8} />
          <div class="scroller">
            <table class="grid import-preview">
              <thead>
                <tr>
                  {header.map((h, i) => (
                    <th key={i}>
                      <div class="hint">{h}</div>
                      <select aria-label={'Field for ' + h} value={mapping[i] || ''} onChange={(e) => setMapping(mapping.map((m, j) => (j === i ? (e.currentTarget as HTMLSelectElement).value : m)))}>
                        <option value="">(skip)</option>
                        {targets.map((t) => (
                          <option key={t} value={t}>
                            {t} {typeOf(t) ? '· ' + typeOf(t) : ''}
                          </option>
                        ))}
                      </select>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {csv.slice(1, 21).map((r, i) => (
                  <tr key={i}>
                    {header.map((_, j) => (
                      <td key={j} class={mapping[j] ? '' : 'shy'}>
                        {r[j]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {csv.length > 21 ? <Hint>The first 20 of {csv.length - 1} rows.</Hint> : null}
          {report ? (
            <Notice kind={report.rejected.length ? 'warn' : ''} style="margin-top:10px">
              {report.created} will be added{report.updated ? ', ' + report.updated + ' updated' : ''}
              {report.rejected.length ? ', ' + report.rejected.length + ' rejected:' : '.'}
              {report.rejected.slice(0, 5).map((r) => (
                <div key={r.row} class="hint">
                  Row {r.row + 2}: {r.errors.join('; ')}
                </div>
              ))}
            </Notice>
          ) : null}
        </>
      ) : null}
      {error ? <Notice kind="bad" style="margin-top:10px">{error}</Notice> : null}
    </Dialog>
  );
}

interface GridProps {
  collection: string;
  rows: Rec[];
  columns: Column[];
  sort: string[];
  onSort: (field: string, add: boolean) => void;
  selected: Record<string, true>;
  setSelected: (fn: (s: Record<string, true>) => Record<string, true>) => void;
  readonly: boolean;
  onOpen: (row: Rec) => void;
  onDeleted: () => void;
  onChanged: (row: Rec) => void;
  /** objectId → what that record says, for link cells. */
  labels: Record<string, string>;
}

function Grid({ collection, rows, columns, sort, onSort, selected, setSelected, readonly, onOpen, onDeleted, onChanged, labels }: GridProps) {
  const allOn = rows.every((r) => selected[r.objectId]);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // One click opens the record; a double-click edits the cell. The open waits
  // out the double-click window so the two never both happen.
  const rowClick = (row: Rec) => {
    if (clickTimer.current) clearTimeout(clickTimer.current);
    clickTimer.current = setTimeout(() => onOpen(row), 230);
  };
  const cancelOpen = () => {
    if (clickTimer.current) clearTimeout(clickTimer.current);
    clickTimer.current = null;
  };
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
            {columns.map((c) => {
              const at = sort.findIndex((s) => s === c.name || s === '-' + c.name);
              const dir = at === -1 ? null : sort[at].charAt(0) === '-' ? 'desc' : 'asc';
              const sortable = SORTABLE.indexOf(c.type) !== -1 || isSystemField(c.name);
              return (
                <th
                  key={c.name}
                  class={sortable ? 'sortable' : ''}
                  aria-sort={dir === 'asc' ? 'ascending' : dir === 'desc' ? 'descending' : undefined}
                  title={sortable ? 'Sort by ' + c.name + ' (⇧ to add to the sort)' : undefined}
                  onClick={sortable ? (e) => onSort(c.name, (e as MouseEvent).shiftKey) : undefined}
                >
                  {c.name} <span class="th-type">{c.type}</span>
                  {dir ? (
                    <span class="sort-mark">
                      {dir === 'asc' ? '▲' : '▼'}
                      {sort.length > 1 ? at + 1 : ''}
                    </span>
                  ) : null}
                </th>
              );
            })}
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.objectId} class="clickable" onClick={() => rowClick(row)}>
              <td class="pick" onClick={(e) => e.stopPropagation()}>
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
                <Cell key={c.name} collection={collection} row={row} col={c} readonly={readonly} onChanged={onChanged} cancelOpen={cancelOpen} labels={labels} />
              ))}
              <td class="actions" onClick={(e) => e.stopPropagation()}>
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

/** One cell. Double-click to edit in place; Enter or leaving it saves, Esc cancels. Booleans flip. */
function Cell({ collection, row, col, readonly, onChanged, cancelOpen, labels }: { collection: string; row: Rec; col: Column; readonly: boolean; onChanged: (row: Rec) => void; cancelOpen: () => void; labels: Record<string, string> }) {
  const [editing, setEditing] = useState(false);
  const [raw, setRaw] = useState<Raw>('');
  const done = useRef(false);
  const editable = !readonly && !isSystemField(col.name) && col.type !== 'Relation';
  const linked = col.type === 'Pointer' ? plain(row[col.name]) : null;
  const text =
    col.name === 'objectId' ? shortId(row.objectId) : typeof linked === 'string' && linked ? '→ ' + (labels[linked] || '…') : displayValue(row[col.name], col.type);
  const title = col.name === 'objectId' ? String(row.objectId) : text;
  const shy = col.type === 'ACL' && (row.ACL === null || row.ACL === undefined);

  function save(value: unknown): Promise<void> {
    const body: Rec = {};
    const wire = value === undefined ? null : toWire(col, value);
    body[col.name] = wire;
    return api<Rec>('PUT', '/api/' + encode(collection) + '/' + encode(row.objectId), body).then((res) => {
      const next = { ...row, [col.name]: wire };
      if (res && res.updatedAt) next.updatedAt = res.updatedAt;
      onChanged(next);
      toast(col.name + ' saved.', 'ok');
    });
  }

  function begin(e: MouseEvent) {
    e.stopPropagation();
    cancelOpen();
    if (editing || !editable) return;
    if (col.type === 'Boolean') {
      save(!(plain(row[col.name]) === true)).catch(fail);
      return;
    }
    if (DIALOG_TYPES.indexOf(col.type) !== -1) {
      openModal((close) => <StructCellDialog collection={collection} col={col} value={row[col.name]} close={close} save={save} />);
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

  if (editing) {
    return (
      <td class="cell-edit" onClick={(e) => e.stopPropagation()}>
        <FieldControl col={col} raw={raw} onChange={(v) => setRaw(v)} autoFocus onCommit={() => finish(true)} onCancel={() => finish(false)} />
      </td>
    );
  }
  return (
    <td class={(editable ? 'editable' : 'locked') + (shy ? ' shy' : '')} title={editable ? title + ' — double-click to edit' : title} onDblClick={begin}>
      {text}
    </td>
  );
}

function StructCellDialog({ collection, col, value, close, save }: { collection: string; col: Column; value: unknown; close: () => void; save: (v: unknown) => Promise<void> }) {
  const [raw, setRaw] = useState<Raw>(rawFrom(col, value));
  return (
    <Dialog
      title={col.type === 'ACL' ? 'Who can see this record' : 'Edit ' + col.name}
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
      {col.type === 'ACL' ? (
        <AclCard state={(raw as { acl: any }).acl} onChange={(acl) => setRaw({ t: 'acl', acl })} collection={collection} />
      ) : (
        <Labelled col={col}>
          <FieldControl col={col} raw={raw} onChange={setRaw} autoFocus />
        </Labelled>
      )}
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

/** Create (id = null) or edit a whole record, one labelled control per column, in the drawer. */
function RecordDrawer({ collection, table, id, onClose, onSaved }: { collection: string; table: Table | undefined; id: string | null; onClose: () => void; onSaved: () => void }) {
  const editing = id !== null;
  const [row, setRow] = useState<Rec | null>(editing ? null : {});
  const [raws, setRaws] = useState<Record<string, Raw>>({});
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  const all = (table && table.columns) || [];
  const cols = all.filter((c) => !isSystemField(c.name) && c.name !== 'ACL' && c.type !== 'Relation');
  const relations = all.filter((c) => c.type === 'Relation');
  const aclCol: Column = { name: 'ACL', type: 'ACL' };

  useEffect(() => {
    if (!editing) {
      const start: Record<string, Raw> = {};
      cols.forEach((c) => (start[c.name] = rawFrom(c, c.defaultValue)));
      start.ACL = rawFrom(aclCol, null);
      setRaws(start);
      return;
    }
    api<Rec>('GET', '/api/' + encode(collection) + '/' + encode(id!))
      .then((r) => {
        setRow(r);
        const start: Record<string, Raw> = {};
        cols.forEach((c) => (start[c.name] = rawFrom(c, r[c.name])));
        start.ACL = rawFrom(aclCol, r.ACL);
        setRaws(start);
      })
      .catch((e) => {
        setMissing(true);
        fail(e);
      });
  }, [collection, id]);

  const rawOf = (c: Column) => (raws[c.name] === undefined ? rawFrom(c, undefined) : raws[c.name]);

  function submit() {
    const data: Rec = {};
    try {
      cols.forEach((c) => {
        const value = parseRaw(c, rawOf(c));
        if (value === undefined || value === '') {
          if (c.required && c.type !== 'Boolean') throw new Error(c.name + ' is required.');
          if (value === '' && c.type === 'String' && editing) data[c.name] = '';
          else if (editing && row && row[c.name] !== null && row[c.name] !== undefined) data[c.name] = null;
          return;
        }
        data[c.name] = toWire(c, value);
      });
      // `null` is public and `{}` is no one — opposites, so the ACL is sent
      // whenever it changed, including back to public.
      const acl = parseRaw(aclCol, rawOf(aclCol));
      const before = editing && row ? (row.ACL === undefined ? null : row.ACL) : null;
      if (JSON.stringify(acl) !== JSON.stringify(before)) data.ACL = acl;
    } catch (e) {
      setError((e as Error).message);
      return;
    }
    const base = '/api/' + encode(collection);
    (editing ? api('PUT', base + '/' + encode(id!), data) : api<Rec>('POST', base, data))
      .then((res) => {
        toast(editing ? 'Record saved.' : 'Record created.', 'ok');
        if (!editing && relations.length && res && res.objectId) {
          // A new record's links are made on the record itself, once it exists.
          navigate('collections', collection, res.objectId);
          return;
        }
        onSaved();
      })
      .catch((e) => setError((e as Error).message));
  }

  const title = editing ? 'Edit ' + collection + ' / ' + shortId(id) : 'New record in ' + collection;
  return (
    <Drawer
      title={title}
      wide
      subtitle={editing ? 'objectId, createdAt and updatedAt are kept by the backend.' : undefined}
      onClose={onClose}
      footer={
        <>
          <Btn onClick={onClose}>Cancel</Btn>
          <WriteBtn kind="primary" disabled={missing || (editing && !row)} onClick={submit}>
            {editing ? 'Save' : 'Create'}
          </WriteBtn>
        </>
      }
    >
      {missing ? (
        <Notice kind="bad">That record is not in {collection} any more.</Notice>
      ) : editing && !row ? (
        <Hint>Loading…</Hint>
      ) : (
        <>
          {!cols.length && !relations.length ? (
            <Notice>
              {collection} has no fields yet.{' '}
              <Btn tiny onClick={() => navigate('schema', collection)}>
                Add fields in Schema
              </Btn>
            </Notice>
          ) : null}
          <div class="form-grid" onInput={() => setError(null)}>
            {cols.map((c, i) => (
              <Labelled key={c.name} col={c}>
                <FieldControl col={c} raw={rawOf(c)} onChange={(v) => setRaws((r) => ({ ...r, [c.name]: v }))} autoFocus={i === 0} />
              </Labelled>
            ))}
            {relations.map((c) => (
              <Labelled key={c.name} col={c}>
                {editing ? <RelationEditor collection={collection} id={id!} col={c} /> : <Hint>Links are made once the record exists — Create opens it.</Hint>}
              </Labelled>
            ))}
          </div>
          <div class="drawer-section">Who can see this record</div>
          <AclCard state={(rawOf(aclCol) as { acl: any }).acl} onChange={(acl) => setRaws((r) => ({ ...r, ACL: { t: 'acl', acl } }))} collection={collection} />
        </>
      )}
      {error ? <Notice kind="bad" style="margin-top:12px">{error}</Notice> : null}
      {editing && row ? (
        <Disclosure label="Raw record">
          <textarea readOnly aria-label="Raw record" value={JSON.stringify(row, null, 2)} style="min-height:200px" />
        </Disclosure>
      ) : null}
    </Drawer>
  );
}
