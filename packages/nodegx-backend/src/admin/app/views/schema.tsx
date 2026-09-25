/**
 * Schema — the collections and their fields. New collection as name + rows of
 * choices; rename in place; change type in place with a conversion warning;
 * indexes as rows of selects. `#/schema/<name>` scrolls to that card.
 */
import { useEffect, useRef, useState } from 'preact/hooks';

import { api, useSession } from '../api';
import { EmptyState, ListEditor } from '../composers';
import { COLUMN_TYPES, Column, NAME_RULE, isServerOwned, isSystemField, validName } from '../format';
import { navigate } from '../router';
import { Btn, Chip, Dialog, Gap, Hi, Hint, Notice, Page, Row, Spacer, Sub, Table, WriteBtn, confirmDestructive, fail, openModal, toast } from '../ui';
import type { ViewProps } from './index';

interface Index {
  name?: string;
  fields: string[];
  unique?: boolean;
  order?: 'asc' | 'desc';
  declared?: boolean;
  built?: boolean;
}

export interface TableDef {
  name: string;
  columns?: Column[];
  indexes?: Index[];
}

export function SchemaView({ params }: ViewProps) {
  const { readonly, whoami } = useSession();
  const accountColumns = whoami ? whoami.accountColumns : undefined;
  const [tables, setTables] = useState<TableDef[] | null>(null);
  const names = tables ? tables.map((t) => t.name) : [];
  const wanted = params[0] || '';

  function load() {
    api<{ tables?: TableDef[] }>('GET', '/admin/schema')
      .then((d) => setTables(d.tables || []))
      .catch(fail);
  }
  useEffect(load, []);

  useEffect(() => {
    if (!tables || !wanted) return;
    const card = document.getElementById('schema-' + wanted);
    if (card) card.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, [tables, wanted]);

  function createTable() {
    openModal((close) => <NewCollectionDialog names={names} close={close} onCreated={load} />);
  }

  return (
    <Page title="Schema" subtitle="Your collections and their fields. Click a field name to rename it, or its type to change it.">
      <Row>
        <WriteBtn kind="primary" onClick={createTable}>
          New collection
        </WriteBtn>
        <Btn onClick={load}>Refresh</Btn>
      </Row>
      <Gap />
      {tables && !tables.length ? (
        <EmptyState icon="▦" action={{ label: 'Create the first one', onClick: createTable }}>
          No collections yet. A collection is a table of records — Products, Orders, Members.
        </EmptyState>
      ) : null}
      {(tables || []).map((t) => (
        <TableCard key={t.name} t={t} names={names} readonly={readonly} accountColumns={accountColumns} hit={t.name === wanted} reload={load} />
      ))}
    </Page>
  );
}

function declaredCount(t: TableDef): number {
  return (t.indexes || []).filter((i) => i.declared !== false).length;
}

function TypeBadge({ col }: { col: Column }) {
  const pointy = col.type === 'Pointer' || col.type === 'Relation';
  return <span class="chip type">{col.type + (pointy && col.targetClass ? ' → ' + col.targetClass : '')}</span>;
}

function TableCard({
  t,
  names,
  readonly,
  accountColumns,
  hit,
  reload
}: {
  t: TableDef;
  names: string[];
  readonly: boolean;
  accountColumns: Record<string, string> | undefined;
  hit: boolean;
  reload: () => void;
}) {
  const system = t.name.charAt(0) === '_';
  const columns = t.columns || [];
  const own = columns.filter((c) => !isSystemField(c.name));
  const system3: Column[] = [
    { name: 'objectId', type: 'String', note: 'unique id, set by the backend' },
    { name: 'createdAt', type: 'Date', note: 'set by the backend' },
    { name: 'updatedAt', type: 'Date', note: 'set by the backend' }
  ];
  const rows: Column[] = system3.concat(own);
  const indexes = t.indexes || [];

  function addColumn() {
    openModal((close) => <AddFieldDialog t={t} names={names} close={close} onAdded={reload} />);
  }
  function editIndexes() {
    openModal((close) => <IndexesDialog t={t} close={close} onApplied={reload} />);
  }
  function deleteTable() {
    confirmDestructive(
      'Delete collection ' + t.name,
      'Every record in "' + t.name + '" is destroyed along with the collection. Permissions and triggers that reference it are NOT removed and will start failing.',
      t.name,
      () => {
        api<{ deleted?: boolean }>('POST', '/admin/schema', { action: 'deleteTable', table: t.name })
          .then((result) => {
            if (result && result.deleted === false) toast('The backend reported that "' + t.name + '" was not deleted.', 'bad');
            else toast('Collection "' + t.name + '" deleted.', 'ok');
            reload();
          })
          .catch(fail);
      }
    );
  }

  return (
    <div class={'card' + (hit ? ' hit' : '')} id={'schema-' + t.name}>
      <Row>
        <Hi>{tableLabel(t.name)}</Hi>
        {system ? <Chip kind="warn">{t.name === '_User' ? 'accounts' : 'system'}</Chip> : null}
        <Chip>{columns.length} field(s)</Chip>
        <Chip>{declaredCount(t)} index(es)</Chip>
        <Spacer />
        <Btn tiny onClick={() => (t.name === '_User' ? navigate('users') : navigate('collections', t.name))}>
          {t.name === '_User' ? 'Open people' : 'Open records'}
        </Btn>
        <WriteBtn tiny onClick={addColumn}>
          Add field
        </WriteBtn>
        <WriteBtn tiny onClick={editIndexes}>
          Indexes
        </WriteBtn>
        {system ? null : (
          <WriteBtn tiny kind="danger" onClick={deleteTable}>
            Delete collection
          </WriteBtn>
        )}
      </Row>
      <Gap h={8} />
      <Table
        columns={['Field', 'Type', 'Required', 'Default']}
        rows={rows}
        renderRow={(c) => {
          const owned = !!c.note || isServerOwned(t.name, c.name, accountColumns);
          const locked = owned || readonly;
          return (
            <tr key={c.name} class={owned ? 'sys' : undefined}>
              <td>{locked ? c.name : <RenameTrigger t={t} c={c} reload={reload} />}</td>
              <td>{locked || c.type === 'Relation' ? <TypeBadge col={c} /> : <TypeTrigger t={t} c={c} reload={reload} />}</td>
              <td>{c.required ? '✓' : ''}</td>
              <td class="shy">{c.note || (c.defaultValue !== undefined && c.defaultValue !== null ? String(c.defaultValue) : '')}</td>
            </tr>
          );
        }}
      />
      {!own.length ? (
        <Row style="margin-top:8px">
          <Hint>No fields of your own yet.</Hint>
          <WriteBtn tiny kind="primary" onClick={addColumn}>
            + Add a field
          </WriteBtn>
        </Row>
      ) : null}
      {indexes.length ? (
        <>
          <Gap h={8} />
          <Table
            columns={['Index', 'Fields', 'Unique', 'Order', 'State']}
            rows={indexes}
            renderRow={(i, n) => (
              <tr key={i.name || n}>
                <td>{i.name}</td>
                <td>{(i.fields || []).join(', ')}</td>
                <td>{i.unique ? 'yes' : ''}</td>
                <td>{i.order === 'desc' ? 'newest / largest first' : 'ascending'}</td>
                <td>{i.declared === false ? <Chip kind="warn">not declared</Chip> : i.built ? <Chip kind="ok">built</Chip> : <Chip kind="bad">missing</Chip>}</td>
              </tr>
            )}
          />
        </>
      ) : null}
    </div>
  );
}

/** The field name, as a button that turns into its own rename box. */
function RenameTrigger({ t, c, reload }: { t: TableDef; c: Column; reload: () => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(c.name);
  const done = useRef(false);
  function finish(commit: boolean) {
    if (done.current) return;
    done.current = true;
    setEditing(false);
    const next = value.trim();
    if (!commit || next === c.name) return;
    const taken = (t.columns || []).map((x) => x.name).filter((n) => n !== c.name);
    const problem = validName(next, taken, 'The field');
    if (problem) {
      toast(problem, 'bad');
      return;
    }
    api('POST', '/admin/schema', { action: 'renameColumn', table: t.name, oldName: c.name, newName: next })
      .then(() => toast('Renamed ' + c.name + ' to ' + next + '. Update any app logic that uses the old name.', 'ok'))
      .catch(fail)
      .then(reload);
  }
  if (!editing) {
    return (
      <button
        type="button"
        class="inline-edit"
        title={'Rename ' + c.name}
        onClick={() => {
          setValue(c.name);
          done.current = false;
          setEditing(true);
        }}
      >
        {c.name}
      </button>
    );
  }
  return (
    <input
      type="text"
      value={value}
      style="width:160px"
      aria-label={'New name for ' + c.name}
      autoFocus
      onInput={(e) => setValue((e.currentTarget as HTMLInputElement).value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          finish(true);
        } else if (e.key === 'Escape') {
          e.preventDefault();
          finish(false);
        }
      }}
      onBlur={() => finish(true)}
    />
  );
}

/** The type badge, as a dropdown. Changing it converts what is stored, so it asks first. */
function TypeTrigger({ t, c, reload }: { t: TableDef; c: Column; reload: () => void }) {
  return (
    <select
      class="inline-type"
      title={'Change the type of ' + c.name}
      aria-label={'Type of ' + c.name}
      value={c.type}
      onChange={(e) => {
        const select = e.currentTarget as HTMLSelectElement;
        const next = select.value;
        select.value = c.type;
        openModal((close) => (
          <Dialog
            title={'Change ' + c.name + ' to ' + next + '?'}
            autoFocus={false}
            actions={
              <>
                <Btn onClick={close}>Cancel</Btn>
                <Btn
                  kind="primary"
                  onClick={() => {
                    close();
                    api<{ convertedValues?: number }>('POST', '/admin/schema', { action: 'changeColumnType', table: t.name, column: c.name, type: next })
                      .then((r) => {
                        const n = (r && r.convertedValues) || 0;
                        toast(c.name + ' is now ' + next + (n ? ' — ' + n + ' stored value(s) converted.' : '.'), 'ok');
                      })
                      .catch(fail)
                      .then(reload);
                  }}
                >
                  Change type
                </Btn>
              </>
            }
          >
            <p>
              Values already stored in {tableLabel(t.name)}.{c.name} are converted from {c.type} to {next}.
            </p>
            <Notice kind="warn">A conversion can lose information: text that is not a number becomes 0, and a list or object turned into text stays text.</Notice>
          </Dialog>
        ));
      }}
    >
      {COLUMN_TYPES.filter((type) => !(type === 'Relation' || (type === 'Pointer' && c.type !== 'Pointer'))).map((type) => (
        <option key={type} value={type}>
          {type + (type === 'Pointer' && c.targetClass ? ' → ' + c.targetClass : '')}
        </option>
      ))}
    </select>
  );
}

// ------------------------------------------------------- field lines --

export interface FieldLine {
  name: string;
  type: string;
  target: string;
  required: boolean;
  dflt: string;
}

export function blankLine(): FieldLine {
  return { name: '', type: 'String', target: '', required: false, dflt: '' };
}

/** A line to a column, or a thrown sentence. */
export function readLine(line: FieldLine, taken: string[]): Column {
  const n = line.name.trim();
  const problem = validName(n, taken, 'Each field');
  if (problem) throw new Error(problem);
  const column: Column = { name: n, type: line.type };
  if (line.type === 'Pointer' || line.type === 'Relation') {
    if (!line.target) throw new Error(n + ': choose the collection it points at.');
    column.targetClass = line.target;
  }
  if (line.required) column.required = true;
  const d = line.dflt.trim();
  if (d && ['String', 'Number', 'Boolean'].indexOf(line.type) !== -1) {
    if (line.type === 'Number') {
      if (isNaN(Number(d))) throw new Error(n + ': the default must be a number.');
      column.defaultValue = Number(d);
    } else if (line.type === 'Boolean') {
      if (d !== 'true' && d !== 'false') throw new Error(n + ': the default must be true or false.');
      column.defaultValue = d === 'true';
    } else column.defaultValue = d;
  }
  return column;
}

/** One editable line: name, type, what a Pointer points at, required, and a default. */
export function FieldLineRow({ line, update, names, autoFocus }: { line: FieldLine; update: (next: FieldLine) => void; names: string[]; autoFocus?: boolean }) {
  const pointy = line.type === 'Pointer' || line.type === 'Relation';
  const hasDefault = ['String', 'Number', 'Boolean'].indexOf(line.type) !== -1;
  return (
    <>
      <input type="text" placeholder="fieldName" aria-label="Field name" value={line.name} autoFocus={autoFocus} onInput={(e) => update({ ...line, name: (e.currentTarget as HTMLInputElement).value })} />
      <select aria-label="Type" value={line.type} onChange={(e) => update({ ...line, type: (e.currentTarget as HTMLSelectElement).value })}>
        {COLUMN_TYPES.map((x) => (
          <option key={x} value={x}>
            {x}
          </option>
        ))}
      </select>
      {pointy ? (
        <select aria-label="Points at" value={line.target} onChange={(e) => update({ ...line, target: (e.currentTarget as HTMLSelectElement).value })}>
          <option value="">→ choose a collection</option>
          {names.map((n) => (
            <option key={n} value={n}>
              → {tableLabel(n)}
            </option>
          ))}
        </select>
      ) : null}
      <label class="check">
        <input type="checkbox" checked={line.required} onChange={(e) => update({ ...line, required: (e.currentTarget as HTMLInputElement).checked })} /> Required
      </label>
      {hasDefault ? (
        line.type === 'Boolean' ? (
          <select aria-label="Default" value={line.dflt} onChange={(e) => update({ ...line, dflt: (e.currentTarget as HTMLSelectElement).value })}>
            <option value="">no default</option>
            <option value="true">default: yes</option>
            <option value="false">default: no</option>
          </select>
        ) : (
          <input
            type={line.type === 'Number' ? 'number' : 'text'}
            step="any"
            placeholder="default (optional)"
            aria-label="Default"
            value={line.dflt}
            onInput={(e) => update({ ...line, dflt: (e.currentTarget as HTMLInputElement).value })}
          />
        )
      ) : null}
    </>
  );
}

function NewCollectionDialog({ names, close, onCreated }: { names: string[]; close: () => void; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [lines, setLines] = useState<FieldLine[]>([blankLine()]);
  const [error, setError] = useState<string | null>(null);
  function create() {
    const tableName = name.trim();
    const columns: Column[] = [];
    try {
      if (!tableName) throw new Error('The collection needs a name.');
      if (!NAME_RULE.test(tableName)) throw new Error('A collection name starts with a letter, then letters, digits or _ only.');
      if (names.indexOf(tableName) !== -1) throw new Error('There is already a collection called ' + tableName + '.');
      lines.forEach((line) => {
        if (!line.name.trim()) return;
        columns.push(readLine(line, columns.map((c) => c.name)));
      });
    } catch (e) {
      setError((e as Error).message);
      return;
    }
    api('POST', '/admin/schema', { action: 'createTable', table: tableName, columns })
      .then(() => {
        close();
        toast('Collection ' + tableName + ' created.', 'ok');
        onCreated();
      })
      .catch((e) => setError((e as Error).message));
  }
  return (
    <Dialog
      title="New collection"
      wide
      actions={
        <>
          <Btn onClick={close}>Cancel</Btn>
          <Btn kind="primary" onClick={create}>
            Create collection
          </Btn>
        </>
      }
    >
      <div onInput={() => setError(null)}>
        <div class="field">
          <b>Name</b>
          <input type="text" placeholder="e.g. Products, Orders, Members" style="width:100%" aria-label="Collection name" value={name} onInput={(e) => setName((e.currentTarget as HTMLInputElement).value)} />
        </div>
        <Gap />
        <div class="field-head">
          <b>Fields</b>
          <Hint>More can be added later. objectId, createdAt and updatedAt come for free.</Hint>
        </div>
        <Gap h={8} />
        <ListEditor<FieldLine>
          rows={lines}
          onChange={setLines}
          blank={blankLine}
          addLabel="+ Add field"
          removeTitle="Remove this field"
          renderRow={(line, update, i) => <FieldLineRow line={line} update={update} names={names} autoFocus={i > 0 && i === lines.length - 1} />}
        />
        {error ? <Notice kind="bad" style="margin-top:12px">{error}</Notice> : null}
      </div>
    </Dialog>
  );
}

/** What a person calls a table: the accounts table is "Users"; `_User` is only the wire's name for it. */
export function tableLabel(name: string): string {
  return name === '_User' ? 'Users' : name;
}

export function AddFieldDialog({ t, names, close, onAdded }: { t: TableDef; names: string[]; close: () => void; onAdded: () => void }) {
  const [line, setLine] = useState<FieldLine>(blankLine());
  const [error, setError] = useState<string | null>(null);
  function add() {
    let column: Column;
    try {
      column = readLine(line, (t.columns || []).map((c) => c.name));
    } catch (e) {
      setError((e as Error).message);
      return;
    }
    api('POST', '/admin/schema', { action: 'addColumn', table: t.name, column })
      .then(() => {
        close();
        toast(column.name + ' added to ' + tableLabel(t.name) + '.', 'ok');
        onAdded();
      })
      .catch((e) => setError((e as Error).message));
  }
  return (
    <Dialog
      title={'Add a field to ' + tableLabel(t.name)}
      wide
      actions={
        <>
          <Btn onClick={close}>Cancel</Btn>
          <Btn kind="primary" onClick={add}>
            Add field
          </Btn>
        </>
      }
    >
      <div class="field-line" onInput={() => setError(null)}>
        <FieldLineRow line={line} update={setLine} names={names} />
      </div>
      {error ? <Notice kind="bad" style="margin-top:12px">{error}</Notice> : null}
    </Dialog>
  );
}

interface IndexRow {
  first: string;
  second: string;
  third: string;
  unique: boolean;
  order: 'asc' | 'desc';
}

/** FED-002 — the declaration, edited as rows. The whole list is sent, so removing a row drops its index. */
function IndexesDialog({ t, close, onApplied }: { t: TableDef; close: () => void; onApplied: () => void }) {
  const fields = (t.columns || []).map((c) => c.name).filter((n) => n !== 'createdAt' && n !== 'updatedAt');
  if (fields.indexOf('objectId') === -1) fields.unshift('objectId');
  const [rows, setRows] = useState<IndexRow[]>(
    (t.indexes || [])
      .filter((i) => i.declared !== false)
      .map((i) => ({ first: i.fields[0] || fields[0], second: i.fields[1] || '', third: i.fields[2] || '', unique: !!i.unique, order: i.order === 'desc' ? 'desc' : 'asc' }))
  );
  const [error, setError] = useState<string | null>(null);
  function apply() {
    let indexes: Index[];
    try {
      indexes = rows.map((r) => {
        const picked = [r.first, r.second, r.third].filter(Boolean);
        if (picked.length !== picked.filter((v, i) => picked.indexOf(v) === i).length) throw new Error('An index lists each field once.');
        const out: Index = { fields: picked };
        if (r.unique) out.unique = true;
        if (r.order === 'desc') out.order = 'desc';
        return out;
      });
    } catch (e) {
      setError((e as Error).message);
      return;
    }
    api<{ indexesCreated?: unknown[]; indexesDropped?: unknown[] }>('POST', '/admin/schema', { action: 'setIndexes', table: t.name, indexes })
      .then((result) => {
        close();
        const created = (result && result.indexesCreated) || [];
        const dropped = (result && result.indexesDropped) || [];
        toast('Indexes applied: ' + created.length + ' created, ' + dropped.length + ' dropped.', 'ok');
        onApplied();
      })
      .catch((e) => setError((e as Error).message));
  }
  const FieldSelect = ({ value, optional, onChange, label }: { value: string; optional?: string; onChange: (v: string) => void; label: string }) => (
    <select aria-label={label} value={value} onChange={(e) => onChange((e.currentTarget as HTMLSelectElement).value)}>
      {optional ? <option value="">{optional}</option> : null}
      {fields.map((f) => (
        <option key={f} value={f}>
          {f}
        </option>
      ))}
    </select>
  );
  return (
    <Dialog
      title={'Indexes on ' + tableLabel(t.name)}
      wide
      autoFocus={false}
      actions={
        <>
          <Btn onClick={close}>Cancel</Btn>
          <Btn kind="primary" onClick={apply}>
            Apply
          </Btn>
        </>
      }
    >
      <Sub>
        An index makes lookups on its fields fast. Unique also refuses a second record with the same values. createdAt and updatedAt are always
        indexed. Removing a row drops that index.
      </Sub>
      <ListEditor<IndexRow>
        rows={rows}
        onChange={(r) => {
          setRows(r);
          setError(null);
        }}
        blank={() => ({ first: fields[0], second: '', third: '', unique: false, order: 'asc' })}
        addLabel="+ Add index"
        removeTitle="Drop this index"
        renderRow={(r, update) => (
          <>
            <FieldSelect label="First field" value={r.first} onChange={(v) => update({ ...r, first: v })} />
            <FieldSelect label="Then" value={r.second} optional="then… (optional)" onChange={(v) => update({ ...r, second: v })} />
            <FieldSelect label="Then" value={r.third} optional="then… (optional)" onChange={(v) => update({ ...r, third: v })} />
            <label class="check">
              <input type="checkbox" checked={r.unique} onChange={(e) => update({ ...r, unique: (e.currentTarget as HTMLInputElement).checked })} /> Unique
            </label>
            <select aria-label="Order" value={r.order} onChange={(e) => update({ ...r, order: (e.currentTarget as HTMLSelectElement).value as 'asc' | 'desc' })}>
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </>
        )}
      />
      {error ? <Notice kind="bad" style="margin-top:12px">{error}</Notice> : null}
    </Dialog>
  );
}
