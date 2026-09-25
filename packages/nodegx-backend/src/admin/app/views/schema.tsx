/**
 * Schema — the collections and their fields (BMG-003).
 *
 * A field is added by picking what kind of thing it holds — a tile with a name
 * and one line — and then only seeing the choices that kind has (the drawer's
 * second step). A field can be taken away (✕ on its row, behind the typed name
 * and the count of records holding a value). The card lists its rules in words
 * and ends in a danger zone: *Delete collection* and *Empty collection*, both
 * behind the typed name. `#/schema/<name>` scrolls to the card;
 * `#/schema/<name>/new-field` opens the picker.
 *
 * Rename and change-type stay in place; the change-type warning counts the
 * records affected. New collection is still name + rows of choices.
 */
import { useEffect, useRef, useState } from 'preact/hooks';

import { api, encode, useSession } from '../api';
import { Chips, DangerAction, DangerZone, Drawer, EmptyState, ListEditor } from '../composers';
import { Column, isServerOwned, isSystemField, validCollectionName, validName } from '../format';
import {
  FieldDraft,
  KINDS,
  Kind,
  KindId,
  RuleStatus,
  blankDraft,
  defaultRule,
  defaultWords,
  draftProblem,
  kindById,
  kindOf,
  mergeRules,
  recordsWord,
  rulesWithout,
  searchKinds,
  takesDefault,
  takesUnique,
  toColumn,
  toRules
} from '../fieldKinds';
import { navigate } from '../router';
import { Btn, Chip, Dialog, Field, Gap, Hi, Hint, Notice, Page, Row, Spacer, Sub, Switch, Table, WriteBtn, confirmDestructive, fail, openModal, toast } from '../ui';
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
  checks?: RuleStatus[];
}

/** How many records a collection holds; `_User` is counted through its own door. */
async function countRecords(table: string, where?: Record<string, unknown>): Promise<number> {
  if (table === '_User') {
    const d = await api<{ total?: number }>('GET', '/admin/users?limit=1');
    return (d && d.total) || 0;
  }
  const q = '?count=1&limit=0' + (where ? '&where=' + encode(JSON.stringify(where)) : '');
  const d = await api<{ count?: number }>('GET', '/api/' + encode(table) + q);
  return (d && d.count) || 0;
}

export function SchemaView({ params }: ViewProps) {
  const { readonly, whoami } = useSession();
  const accountColumns = whoami ? whoami.accountColumns : undefined;
  const [tables, setTables] = useState<TableDef[] | null>(null);
  const names = tables ? tables.map((t) => t.name) : [];
  const wanted = params[0] || '';
  const adding = params[1] === 'new-field' ? wanted : '';
  const addingTable = adding && tables ? tables.find((t) => t.name === adding) : undefined;

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
    <Page title="Schema" subtitle="Your collections and their fields. Click a field name to rename it, or its kind to change it.">
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
      {addingTable ? <AddFieldDrawer t={addingTable} names={names} onClose={() => navigate('schema', adding)} onAdded={load} /> : null}
    </Page>
  );
}

function declaredCount(t: TableDef): number {
  return (t.indexes || []).filter((i) => i.declared !== false).length;
}

/** The kind in a person's words, with the storage name as a small badge for those who know it. */
function KindBadge({ col, checks }: { col: Column; checks?: RuleStatus[] }) {
  const kind = kindOf(col, checks);
  const pointy = col.type === 'Pointer' || col.type === 'Relation';
  return (
    <span class="kind">
      <span class="kind-icon" aria-hidden="true">
        {kind.icon}
      </span>
      {kind.label}
      {pointy && col.targetClass ? ' → ' + tableLabel(col.targetClass) : ''}
      <span class="chip type">{col.type}</span>
    </span>
  );
}

export function TableCard({
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
  const rules = (t.checks || []).filter((c) => c.declared);
  const drift = (t.checks || []).filter((c) => !c.declared);
  const [records, setRecords] = useState<number | null>(null);

  useEffect(() => {
    if (system) return;
    countRecords(t.name)
      .then(setRecords)
      .catch(() => setRecords(null));
  }, [t.name, columns.length]);

  function addColumn() {
    navigate('schema', t.name, 'new-field');
  }
  function editIndexes() {
    openModal((close) => <IndexesDialog t={t} close={close} onApplied={reload} />);
  }
  function deleteTable() {
    api<{ deleted?: boolean }>('POST', '/admin/schema', { action: 'deleteTable', table: t.name })
      .then((result) => {
        if (result && result.deleted === false) toast('The backend reported that "' + t.name + '" was not deleted.', 'bad');
        else toast('Collection "' + t.name + '" deleted.', 'ok');
        reload();
      })
      .catch(fail);
  }
  function emptyTable() {
    emptyCollection(t.name)
      .then((n) => {
        toast(recordsWord(n) + ' deleted from ' + t.name + '.', 'ok');
        setRecords(0);
      })
      .catch(fail);
  }
  function removeRule(rule: RuleStatus) {
    const next = rules.filter((r) => r.name !== rule.name).map((r) => r.rule);
    api('POST', '/admin/schema', { action: 'setChecks', table: t.name, checks: next })
      .then(() => toast('Rule removed: ' + rule.description + '.', 'ok'))
      .catch(fail)
      .then(reload);
  }

  return (
    <div class={'card' + (hit ? ' hit' : '')} id={'schema-' + t.name}>
      <Row>
        <Hi>{tableLabel(t.name)}</Hi>
        {system ? <Chip kind="warn">{t.name === '_User' ? 'accounts' : 'system'}</Chip> : null}
        <Chip>{columns.length} field(s)</Chip>
        <Chip>{declaredCount(t)} index(es)</Chip>
        {records !== null ? <Chip>{recordsWord(records)}</Chip> : null}
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
      </Row>
      <Gap h={8} />
      <Table
        columns={['Field', 'Kind', 'Required', 'Default', '']}
        rows={rows}
        renderRow={(c) => {
          const owned = !!c.note || isServerOwned(t.name, c.name, accountColumns);
          const locked = owned || readonly;
          const ruled = rules.some((r) => (r.rule.field ? r.rule.field === c.name : (r.rule.exactlyOne || r.rule.allOrNone || []).indexOf(c.name) !== -1));
          return (
            <tr key={c.name} class={owned ? 'sys' : undefined}>
              <td>
                {locked ? c.name : <RenameTrigger t={t} c={c} reload={reload} />}
                {c.description ? <div class="shy">{c.description}</div> : null}
              </td>
              <td>{locked || c.type === 'Relation' || ruled ? <KindBadge col={c} checks={t.checks} /> : <TypeTrigger t={t} c={c} reload={reload} />}</td>
              <td>{c.required ? '✓' : ''}</td>
              <td class="shy">{c.note || defaultWords(c)}</td>
              <td class="actions">{locked ? null : <DropTrigger t={t} c={c} reload={reload} />}</td>
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
      {rules.length || drift.length ? (
        <div class="rules">
          <div class="field-head">
            <b>Rules</b>
            <Hint>Every record must satisfy these; the backend refuses a write that breaks one.</Hint>
          </div>
          <ul class="rules-list">
            {rules.map((r) => (
              <li key={r.name} class="rule">
                <span>{r.description}</span>
                {r.built ? null : <Chip kind="bad">not enforced</Chip>}
                {readonly ? null : (
                  <button type="button" class="chip-x" aria-label={'Remove the rule: ' + r.description} title="Remove this rule" onClick={() => removeRule(r)}>
                    ✕
                  </button>
                )}
              </li>
            ))}
            {drift.map((r) => (
              <li key={r.name} class="rule">
                <span>{r.name}</span>
                <Chip kind="warn">not declared</Chip>
              </li>
            ))}
          </ul>
        </div>
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
      {system || readonly ? null : (
        <DangerZone>
          <DangerAction
            label="Empty collection"
            why={'Delete every record in ' + t.name + (records !== null ? ' (' + recordsWord(records) + ')' : '') + '. The fields, rules and indexes stay.'}
            title={'Empty collection ' + t.name}
            warning={(records !== null ? recordsWord(records) + ' in' : 'Every record in') + ' "' + t.name + '" ' + (records === 1 ? 'is' : 'are') + ' destroyed. The collection itself stays, with its fields.'}
            expected={t.name}
            onConfirm={emptyTable}
            verb="Empty"
          />
          <DangerAction
            label="Delete collection"
            why={'Destroy ' + t.name + ' and every record in it. Permissions and triggers that name it are not removed and will start failing.'}
            title={'Delete collection ' + t.name}
            warning={'Every record in "' + t.name + '" is destroyed along with the collection. Permissions and triggers that reference it are NOT removed and will start failing.'}
            expected={t.name}
            onConfirm={deleteTable}
          />
        </DangerZone>
      )}
    </div>
  );
}

/** Delete every record, a page at a time, through the batch route. Answers how many went. */
export async function emptyCollection(table: string): Promise<number> {
  let total = 0;
  for (let round = 0; round < 10000; round++) {
    const page = await api<{ results?: Array<{ objectId: string }> }>('GET', '/api/' + encode(table) + '?limit=200&keys=objectId');
    const ids = ((page && page.results) || []).map((r) => r.objectId).filter(Boolean);
    if (!ids.length) return total;
    await api('POST', '/api/_batch', { operations: ids.map((objectId) => ({ method: 'delete', collection: table, objectId })) });
    total += ids.length;
  }
  return total;
}

/** ✕ on a field row: counts the records holding a value, then asks for the name. */
function DropTrigger({ t, c, reload }: { t: TableDef; c: Column; reload: () => void }) {
  const [busy, setBusy] = useState(false);
  function ask() {
    setBusy(true);
    const count = t.name === '_User' ? Promise.resolve<number | null>(null) : countRecords(t.name, { [c.name]: { $exists: true } }).catch(() => null);
    count.then((n) => {
      setBusy(false);
      const holding = n === null ? 'Records holding a value in it lose it.' : n === 0 ? 'No record holds a value in it.' : recordsWord(n) + ' hold' + (n === 1 ? 's' : '') + ' a value in it, and that value is lost.';
      confirmDestructive(
        'Drop the field ' + c.name,
        holding + ' App logic that reads "' + c.name + '" will break. A rule or an index that reads it must be removed first.',
        c.name,
        () => {
          api<{ dropped?: boolean }>('POST', '/admin/schema', { action: 'dropColumn', table: t.name, column: c.name })
            .then((r) => toast(r && r.dropped === false ? '"' + c.name + '" was already gone.' : 'Dropped ' + c.name + ' from ' + tableLabel(t.name) + '.', 'ok'))
            .catch(fail)
            .then(reload);
        },
        'Drop'
      );
    });
  }
  return (
    <button type="button" class="chip-x" aria-label={'Drop the field ' + c.name} title={'Drop ' + c.name} disabled={busy} onClick={ask}>
      ✕
    </button>
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

/** The kinds a stored column can be changed to (no Choice: that is a rule, added from the drawer; no Links: a junction table). */
const CHANGEABLE: Kind[] = KINDS.filter((k) => k.id !== 'choice' && k.id !== 'links');

/** The kind, as a dropdown. Changing it converts what is stored, so it asks first — with the count of records affected. */
function TypeTrigger({ t, c, reload }: { t: TableDef; c: Column; reload: () => void }) {
  const current = kindOf(c, t.checks);
  return (
    <select
      class="inline-type"
      title={'Change the kind of ' + c.name}
      aria-label={'Kind of ' + c.name}
      value={current.id}
      onChange={(e) => {
        const select = e.currentTarget as HTMLSelectElement;
        const nextKind = kindById(select.value);
        select.value = current.id;
        const next = nextKind.storage;
        if (next === c.type) return;
        countRecords(t.name, { [c.name]: { $exists: true } })
          .catch(() => null)
          .then((n) =>
            openModal((close) => (
              <Dialog
                title={'Change ' + c.name + ' to ' + nextKind.label + '?'}
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
                            const k = (r && r.convertedValues) || 0;
                            toast(c.name + ' is now ' + nextKind.label + (k ? ' — ' + k + ' stored value(s) converted.' : '.'), 'ok');
                          })
                          .catch(fail)
                          .then(reload);
                      }}
                    >
                      Change kind
                    </Btn>
                  </>
                }
              >
                <p>
                  {n === null ? 'Values' : n === 0 ? 'No record holds a value yet; nothing is converted. Values' : recordsWord(n) + ' hold a value in ' + tableLabel(t.name) + '.' + c.name + ', and each one is converted. Values'} stored as{' '}
                  {current.label} ({c.type}) become {nextKind.label} ({next}).
                </p>
                <Notice kind="warn">A conversion can lose information: text that is not a number becomes 0, and a list or object turned into text stays text.</Notice>
              </Dialog>
            ))
          );
      }}
    >
      {CHANGEABLE.filter((k) => !(k.id === 'link' && c.type !== 'Pointer')).map((k) => (
        <option key={k.id} value={k.id}>
          {k.label + ' (' + k.storage + ')' + (k.id === 'link' && c.targetClass ? ' → ' + c.targetClass : '')}
        </option>
      ))}
    </select>
  );
}

// ------------------------------------------------------- field lines --
// New collection: name + rows of choices (BMG-000). The kind select is the
// tiles' names; Choice is added afterwards from the drawer, because it needs
// its values.

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
  // AC5: a required field has no default — every record must say it.
  if (d && !line.required && ['String', 'Number', 'Boolean'].indexOf(line.type) !== -1) {
    if (line.type === 'Number') {
      if (isNaN(Number(d))) throw new Error(n + ': the default must be a number.');
      column.defaultValue = Number(d);
    } else if (line.type === 'Boolean') {
      column.defaultValue = d === 'yes';
    } else column.defaultValue = d;
  }
  return column;
}

const LINE_KINDS: Kind[] = KINDS.filter((k) => k.id !== 'choice');

/** One editable line: name, kind, what a Link points at, required, and a default. */
export function FieldLineRow({ line, update, names, autoFocus }: { line: FieldLine; update: (next: FieldLine) => void; names: string[]; autoFocus?: boolean }) {
  const pointy = line.type === 'Pointer' || line.type === 'Relation';
  const hasDefault = ['String', 'Number', 'Boolean'].indexOf(line.type) !== -1;
  const why = 'A required field has no default: every record must say it.';
  return (
    <>
      <input type="text" placeholder="fieldName" aria-label="Field name" value={line.name} autoFocus={autoFocus} onInput={(e) => update({ ...line, name: (e.currentTarget as HTMLInputElement).value })} />
      <select aria-label="Kind" value={line.type} onChange={(e) => update({ ...line, type: (e.currentTarget as HTMLSelectElement).value })}>
        {LINE_KINDS.map((k) => (
          <option key={k.id} value={k.storage}>
            {k.label + ' (' + k.storage + ')'}
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
          <select aria-label="Default" value={line.required ? '' : line.dflt} disabled={line.required} title={line.required ? why : undefined} onChange={(e) => update({ ...line, dflt: (e.currentTarget as HTMLSelectElement).value })}>
            <option value="">{line.required ? 'no default (required)' : 'no default'}</option>
            <option value="yes">default: Yes</option>
            <option value="no">default: No</option>
          </select>
        ) : (
          <input
            type={line.type === 'Number' ? 'number' : 'text'}
            step="any"
            placeholder={line.required ? 'no default: every record must say it' : 'default (optional)'}
            aria-label="Default"
            title={line.required ? why : undefined}
            disabled={line.required}
            value={line.required ? '' : line.dflt}
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
  const nameProblem = name ? validCollectionName(name.trim(), names) : null;
  function create() {
    const tableName = name.trim();
    const columns: Column[] = [];
    try {
      const problem = validCollectionName(tableName, names);
      if (problem) throw new Error(problem);
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
          {nameProblem ? <div class="chips-problem">{nameProblem}</div> : null}
        </div>
        <Gap />
        <div class="field-head">
          <b>Fields</b>
          <Hint>More can be added later, and a Choice (one of a list) is added from the collection's card. objectId, createdAt and updatedAt come for free.</Hint>
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

// ------------------------------------------------------- the drawer --

/** The Users page's door (BMG-004): the same drawer, opened through the modal host. */
export function AddFieldDialog({ t, names, close, onAdded }: { t: TableDef; names: string[]; close: () => void; onAdded: () => void }) {
  return <AddFieldDrawer t={t} names={names} onClose={close} onAdded={onAdded} />;
}

/** Step 1: the tiles. Controlled: says which kind was picked. */
export function KindPicker({ onPick, autoFocus }: { onPick: (kind: KindId) => void; autoFocus?: boolean }) {
  const [query, setQuery] = useState('');
  const shown = searchKinds(query);
  return (
    <div class="kind-picker">
      <input
        type="text"
        class="kind-search"
        placeholder="What does it hold? e.g. a number, a link, a picture"
        aria-label="Search kinds"
        autoFocus={autoFocus}
        value={query}
        onInput={(e) => setQuery((e.currentTarget as HTMLInputElement).value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && shown.length === 1) {
            e.preventDefault();
            onPick(shown[0].id);
          }
        }}
      />
      <div class="tiles kinds" role="radiogroup" aria-label="Kind of field">
        {shown.map((k) => (
          <label class="tile" key={k.id}>
            <input type="radio" name="kind" value={k.id} aria-label={k.label} onChange={() => onPick(k.id)} />
            <span class="kind-icon" aria-hidden="true">
              {k.icon}
            </span>
            <b>{k.label}</b>
            <span class="sub">{k.line}</span>
            <span class="chip type">{k.storage}</span>
          </label>
        ))}
        {!shown.length ? <Hint>Nothing matches "{query}". Try text, number, date, link, picture.</Hint> : null}
      </div>
    </div>
  );
}

/** Step 2: the options that kind has. Controlled and pure: what it shows is the draft, what it changes is the draft. */
export function FieldOptions({ draft, update, names, taken, records }: { draft: FieldDraft; update: (next: FieldDraft) => void; names: string[]; taken: string[]; records: number }) {
  const kind = kindById(draft.kind);
  const nameProblem = draft.name ? validName(draft.name.trim(), taken, 'The field') : null;
  const dRule = defaultRule(draft, records);
  const set = (patch: Partial<FieldDraft>) => update({ ...draft, ...patch });
  const text = (label: string, key: 'dflt' | 'maxLength' | 'min' | 'max' | 'description', extra: Record<string, unknown> = {}) => (
    <Field label={label}>
      <input type="text" aria-label={label} value={draft[key]} onInput={(e) => set({ [key]: (e.currentTarget as HTMLInputElement).value } as Partial<FieldDraft>)} {...extra} />
    </Field>
  );
  return (
    <div class="field-options">
      <div class="field">
        <b>Name</b>
        <input type="text" placeholder="e.g. price, dueDate, ownerName" aria-label="Field name" autoFocus value={draft.name} onInput={(e) => set({ name: (e.currentTarget as HTMLInputElement).value })} />
        {nameProblem ? <div class="chips-problem">{nameProblem}</div> : <Hint>Letters, digits and _ — this is the name app logic reads it by.</Hint>}
      </div>
      {text('Description (optional)', 'description', { placeholder: 'One line about what goes here' })}

      <div class="when-body" id="kind-options">
        {draft.kind === 'text' ? (
          <>
            <Field label="Default">
              <input type="text" aria-label="Default" value={draft.dflt} disabled={dRule.disabled} placeholder={dRule.disabled ? 'no default' : 'optional'} onInput={(e) => set({ dflt: (e.currentTarget as HTMLInputElement).value })} />
              {dRule.why ? <Hint>{dRule.why}</Hint> : null}
            </Field>
            <div class="field-line">
              {text('Max length', 'maxLength', { type: 'number', min: 1, step: 1, placeholder: 'any', class: 'short' })}
              <Field label="Must look like">
                <select aria-label="Must look like" value={draft.looksLike} onChange={(e) => set({ looksLike: (e.currentTarget as HTMLSelectElement).value as FieldDraft['looksLike'] })}>
                  <option value="">anything</option>
                  <option value="email">an email address</option>
                  <option value="url">a web address</option>
                </select>
              </Field>
            </div>
          </>
        ) : null}
        {draft.kind === 'number' ? (
          <>
            <Field label="Default">
              <input type="number" step="any" aria-label="Default" value={draft.dflt} disabled={dRule.disabled} placeholder={dRule.disabled ? 'no default' : 'optional'} onInput={(e) => set({ dflt: (e.currentTarget as HTMLInputElement).value })} />
              {dRule.why ? <Hint>{dRule.why}</Hint> : null}
            </Field>
            <div class="field-line">
              {text('At least', 'min', { type: 'number', step: 'any', placeholder: 'no minimum', class: 'short' })}
              {text('At most', 'max', { type: 'number', step: 'any', placeholder: 'no maximum', class: 'short' })}
            </div>
            <Switch checked={draft.whole} onChange={(v) => set({ whole: v })} label="Whole numbers only">
              Whole numbers only
            </Switch>
          </>
        ) : null}
        {draft.kind === 'yesno' ? (
          <>
            <Switch checked={draft.boolDefaultSet} disabled={dRule.disabled} onChange={(v) => set({ boolDefaultSet: v })} label="Has a default">
              New records start with a default
            </Switch>
            {draft.boolDefaultSet && !dRule.disabled ? (
              <Switch checked={draft.boolDefault} onChange={(v) => set({ boolDefault: v })} label="Default value">
                Default: {draft.boolDefault ? 'Yes' : 'No'}
              </Switch>
            ) : null}
            {dRule.why ? <Hint>{dRule.why}</Hint> : null}
          </>
        ) : null}
        {draft.kind === 'date' ? <Hint>No options. The backend stamps createdAt and updatedAt on every record for you.</Hint> : null}
        {draft.kind === 'choice' ? (
          <>
            <Field label="The choices">
              <Chips
                id="choice-values"
                items={draft.values}
                onChange={(values) => set({ values, dflt: values.indexOf(draft.dflt) === -1 ? '' : draft.dflt })}
                placeholder="Type a value and press Enter"
                addLabel="Add"
                validate={(v) => (v.length > 200 ? 'A choice is at most 200 characters.' : null)}
              />
            </Field>
            <Field label="Default">
              <select aria-label="Default" value={draft.dflt} disabled={dRule.disabled || !draft.values.length} onChange={(e) => set({ dflt: (e.currentTarget as HTMLSelectElement).value })}>
                <option value="">no default</option>
                {draft.values.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
              {dRule.why ? <Hint>{dRule.why}</Hint> : null}
            </Field>
          </>
        ) : null}
        {draft.kind === 'link' || draft.kind === 'links' ? (
          <Field label="Points at">
            <select aria-label="Points at" value={draft.target} onChange={(e) => set({ target: (e.currentTarget as HTMLSelectElement).value })}>
              <option value="">choose a collection…</option>
              {names.map((n) => (
                <option key={n} value={n}>
                  {tableLabel(n)}
                </option>
              ))}
            </select>
            {draft.target ? (
              <Hint>
                {draft.kind === 'link' ? 'Each record links to one ' + tableLabel(draft.target) + '.' : 'Each record links to many ' + tableLabel(draft.target) + '.'} When the {tableLabel(draft.target)} is deleted, the link stays and points at nothing.
              </Hint>
            ) : null}
          </Field>
        ) : null}
        {draft.kind === 'file' ? <Hint>No options here. What can be uploaded, and how big, is set on the Files page for the whole backend.</Hint> : null}
        {draft.kind === 'location' || draft.kind === 'list' || draft.kind === 'anything' ? <Hint>No options.</Hint> : null}
      </div>

      <div class="drawer-section">Rules</div>
      <div class="when-body">
        <Switch checked={draft.required} onChange={(v) => set({ required: v })} label="Required">
          Required — every record must say it
        </Switch>
        {draft.required && records > 0 && takesDefault(draft.kind) ? <Hint>{recordsWord(records)} already here: give it a default so they have a value.</Hint> : null}
        {draft.required && records > 0 && !takesDefault(draft.kind) ? <Notice kind="warn">A required {kind.label} can only be added while the collection is empty: the {recordsWord(records)} already here would have nothing in it.</Notice> : null}
        {takesUnique(draft.kind) ? (
          <Switch checked={draft.unique} onChange={(v) => set({ unique: v })} label="Must be unique">
            Must be unique — no two records share a value
          </Switch>
        ) : null}
      </div>
    </div>
  );
}

/** The drawer: pick a kind, then its options; Add writes the column, its rules and its index. */
export function AddFieldDrawer({ t, names, onClose, onAdded }: { t: TableDef; names: string[]; onClose: () => void; onAdded: () => void }) {
  const [draft, setDraft] = useState<FieldDraft | null>(null);
  const [records, setRecords] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const taken = (t.columns || []).map((c) => c.name);

  useEffect(() => {
    countRecords(t.name)
      .then(setRecords)
      .catch(() => setRecords(0));
  }, [t.name]);

  function add() {
    if (!draft) return;
    const problem = draftProblem(draft, { taken, collections: names, records });
    if (problem) {
      setError(problem);
      return;
    }
    const column = toColumn(draft);
    const mine = toRules(draft);
    setBusy(true);
    api('POST', '/admin/schema', { action: 'addColumn', table: t.name, column })
      .then(() => (mine.length ? api('POST', '/admin/schema', { action: 'setChecks', table: t.name, checks: mergeRules(t.checks, column.name, mine) }) : null))
      .then(() =>
        draft.unique
          ? api('POST', '/admin/schema', {
              action: 'setIndexes',
              table: t.name,
              indexes: (t.indexes || [])
                .filter((i) => i.declared !== false)
                .map((i): Index => ({ fields: i.fields, unique: i.unique, order: i.order }))
                .concat([{ fields: [column.name], unique: true }])
            })
          : null
      )
      .then(() => {
        toast(column.name + ' added to ' + tableLabel(t.name) + '.', 'ok');
        onAdded();
        onClose();
      })
      .catch((e) => {
        setBusy(false);
        setError((e as Error).message);
        onAdded();
      });
  }

  const kind = draft ? kindById(draft.kind) : null;
  return (
    <Drawer
      title={'Add a field to ' + tableLabel(t.name)}
      subtitle={draft && kind ? kind.label + ' — ' + kind.line : 'What kind of thing does it hold?'}
      onClose={onClose}
      wide
      footer={
        <>
          <Btn onClick={onClose}>Cancel</Btn>
          {draft ? (
            <>
              <Btn onClick={() => setDraft(null)}>Change kind</Btn>
              <WriteBtn kind="primary" disabled={busy} onClick={add}>
                Add field
              </WriteBtn>
            </>
          ) : null}
        </>
      }
    >
      <div onInput={() => setError(null)}>
        {!draft ? (
          <KindPicker autoFocus onPick={(k) => setDraft(blankDraft(k))} />
        ) : (
          <>
            <Row class="kind-chosen">
              <span class="kind-icon" aria-hidden="true">
                {kind!.icon}
              </span>
              <b>{kind!.label}</b>
              <Sub style="margin:0">{kind!.line}</Sub>
              <span class="chip type">{kind!.storage}</span>
            </Row>
            <FieldOptions draft={draft} update={setDraft} names={names} taken={taken} records={records} />
          </>
        )}
        {error ? <Notice kind="bad" style="margin-top:12px">{error}</Notice> : null}
      </div>
    </Drawer>
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
