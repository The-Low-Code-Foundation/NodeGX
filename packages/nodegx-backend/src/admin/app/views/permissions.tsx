/**
 * Permissions — BMG-006. Who may list, open, create, change and delete each
 * collection, by ticking boxes under *Everyone*, *Signed in*, *No one* and the
 * roles; templates to start from; the defaults, sign-up and files on the
 * front page; every function's rule and budget on its own page; and *Try as*
 * on every page, which asks the backend's own dry run.
 *
 *   #/permissions              the defaults, sign-up, files, the collection list
 *   #/permissions/<collection> that collection's matrix
 *   #/permissions/functions    every function: who can call, runs as, limit, time, duplicates
 *
 * 🔴 AC7: no text input on these pages accepts a rule. A rule is only ever a
 * box that was ticked, turned into the stored shape by `ruleVocabulary`.
 * `_` tables are never drawn (AC6): the backend locks them and the validator
 * refuses them.
 */
import { useEffect, useState } from 'preact/hooks';

import { api, encode, useSession } from '../api';
import { EmptyState, Picker } from '../composers';
import { PointerItem, searchRecords } from '../fields';
import { navigate } from '../router';
import {
  CLP_OPS,
  CheckAnswer,
  ClpOp,
  CollectionEntry,
  Column,
  FILE_ROWS,
  FileOp,
  FunctionDraft,
  FunctionEntry,
  FunctionRow,
  IDEMPOTENCY_OPTIONS,
  Matrix,
  OP_ROWS,
  RateLimit,
  RuleSelection,
  RuleValue,
  SignupChoice,
  TEMPLATES,
  TemplateId,
  allInherit,
  audienceWords,
  cellState,
  draftFrom,
  draftProblem,
  entryFromDraft,
  entrySummary,
  functionChips,
  matrixFrom,
  matrixRules,
  roleColumnEmpty,
  rolesNamed,
  rulesFrom,
  ruleWords,
  signupChoice,
  templateEntry,
  toggleCell,
  verdictRule,
  verdictSentence,
  visibleCollections
} from '../permissionsModel';
import { Btn, Card, Chip, Field, Gap, Hi, Hint, Notice, Page, Row, Spacer, Switch, Table, WriteBtn, confirmSimple, fail, toast } from '../ui';
import { personName } from './users';
import type { ViewProps } from './index';

// ------------------------------------------------------------------ shapes --

interface Config {
  version?: number;
  devOpen?: boolean;
  defaults?: { permissions?: Partial<Record<string, RuleValue>>; creatorOwns?: boolean };
  collections?: Record<string, CollectionEntry | undefined>;
  functions?: Record<string, FunctionEntry | undefined>;
  files?: Partial<Record<FileOp, RuleValue>>;
  signup?: RuleValue;
}

interface Loaded {
  config: Config;
  etag: string;
  enforced: boolean;
  roles: string[];
  tables: string[];
}

interface Member {
  objectId: string;
  username: string | null;
  email: string | null;
  disabled?: boolean;
}

const FILE_OPS: FileOp[] = ['upload', 'read', 'delete'];

async function loadAll(): Promise<Loaded> {
  const [perms, roles, schema] = await Promise.all([
    api<{ config?: Config; etag?: string; enforced?: boolean }>('GET', '/admin/permissions'),
    api<{ roles?: Array<{ name: string }> }>('GET', '/admin/roles').catch(() => ({ roles: [] })),
    api<{ tables?: Array<{ name: string }> }>('GET', '/admin/schema').catch(() => ({ tables: [] }))
  ]);
  return {
    config: perms.config || {},
    etag: perms.etag || '',
    enforced: perms.enforced !== false,
    roles: (roles.roles || []).map((r) => r.name),
    tables: (schema.tables || []).map((t) => t.name)
  };
}

/** The whole-config write, refused by the server when the config moved under the page (AC4). */
function saveWhole(config: Config, etag: string): Promise<{ config: Config; etag: string }> {
  return api<{ config: Config; etag: string }>('PUT', '/admin/permissions', config, etag ? { 'If-Match': etag } : undefined);
}

function useLoaded(): [Loaded | null, () => void, (next: Loaded) => void] {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const reload = () => {
    loadAll().then(setLoaded).catch(fail);
  };
  useEffect(reload, []);
  return [loaded, reload, setLoaded];
}

// -------------------------------------------------------------------- view --

export function PermissionsView({ params }: ViewProps) {
  const which = params[0] || '';
  if (which === 'functions') return <FunctionsPage />;
  if (which) return <CollectionPage key={which} name={which} />;
  return <DefaultsPage />;
}

function EnforcementNotice({ enforced }: { enforced: boolean }) {
  return enforced ? (
    <Notice>Enforcement is on. Every rule below is applied to every request.</Notice>
  ) : (
    <Notice kind="warn">
      Dev-open is on: this backend enforces nothing right now, and everyone can do everything. The rules below say what will happen once it is off. It
      is only ever on for a backend bound to this machine.
    </Notice>
  );
}

// ------------------------------------------------------------------ matrix --

interface MatrixProps<Op extends string> {
  rows: Array<{ op: Op; word: string }>;
  matrix: Matrix<Op>;
  onChange: (next: Matrix<Op>) => void;
  /** The role columns shown, and how to change them. */
  roles: string[];
  onRoles: (roles: string[]) => void;
  /** Every role that exists, for the *+ role* picker. */
  allRoles: string[];
  /** Present on a collection: a *Default* column, with the default's words under each box. */
  defaults?: Matrix<Op>;
  disabled?: boolean;
  id: string;
}

const AUDIENCE: Array<{ col: Column; word: string }> = [
  { col: 'everyone', word: 'Everyone' },
  { col: 'signedIn', word: 'Signed in' },
  { col: 'noOne', word: 'No one' }
];

function columnWord(col: Column): string {
  if (col === 'default') return 'Default';
  const a = AUDIENCE.find((x) => x.col === col);
  return a ? a.word : (col as { role: string }).role;
}

function RuleMatrix<Op extends string>({ rows, matrix, onChange, roles, onRoles, allRoles, defaults, disabled, id }: MatrixProps<Op>) {
  const ops = rows.map((r) => r.op);
  const columns: Column[] = [...(defaults ? (['default'] as Column[]) : []), ...AUDIENCE.map((a) => a.col), ...roles.map((role) => ({ role }))];
  const offer = allRoles.filter((r) => roles.indexOf(r) === -1);

  function cell(op: Op, col: Column) {
    const sel = matrix[op];
    const state = cellState(sel, col);
    const word = rows.find((r) => r.op === op)!.word;
    const key = col === 'default' || col === 'everyone' || col === 'signedIn' || col === 'noOne' ? col : 'role-' + col.role;
    return (
      <td key={key} class={'perm-cell' + (state.implied ? ' implied' : '')}>
        <input
          type="checkbox"
          aria-label={word + ': ' + columnWord(col)}
          data-op={op}
          data-col={key}
          checked={state.checked}
          disabled={disabled || state.implied}
          onChange={(e) => onChange({ ...matrix, [op]: toggleCell(sel, col, (e.target as HTMLInputElement).checked) })}
        />
        {col === 'default' && defaults ? <span class="perm-default-words">{audienceWords(defaults[op])}</span> : null}
      </td>
    );
  }

  return (
    <div class="scroller perm-scroller">
      <table class="perm-matrix" id={id}>
        <thead>
          <tr>
            <th class="perm-op">Who can…</th>
            {columns.map((col) => {
              if (typeof col === 'string') return <th key={col}>{columnWord(col)}</th>;
              const empty = roleColumnEmpty(matrix, ops, col.role);
              return (
                <th key={'role-' + col.role} class="perm-role">
                  <span class="chip accent">
                    {col.role}
                    {disabled ? null : (
                      <button
                        type="button"
                        class="chip-x"
                        aria-label={'Remove the ' + col.role + ' column'}
                        title={empty ? 'Remove this column' : 'Untick ' + col.role + ' in every row first'}
                        disabled={!empty}
                        onClick={() => onRoles(roles.filter((r) => r !== col.role))}
                      >
                        ✕
                      </button>
                    )}
                  </span>
                </th>
              );
            })}
            <th class="perm-add">
              {disabled ? null : (
                <Picker<string>
                  id={id + '-add-role'}
                  fetch={(q) => Promise.resolve(offer.filter((r) => r.toLowerCase().includes(q.trim().toLowerCase())))}
                  label={(r) => r}
                  keyOf={(r) => r}
                  value={null}
                  onPick={(r) => {
                    if (r && roles.indexOf(r) === -1) onRoles(roles.concat([r]));
                  }}
                  placeholder="+ role"
                  emptyText={offer.length ? 'No role matches.' : allRoles.length ? 'Every role is already a column.' : 'No roles yet — make one under Roles.'}
                />
              )}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.op} data-op={r.op}>
              <td class="perm-op">
                <b>{r.word}</b> <span class="hint mono">{r.op}</span>
              </td>
              {columns.map((col) => cell(r.op, col))}
              <td />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** One rule as a row of boxes (a function's *Who can call*, sign-up): the same cells, no table. */
function RuleBoxes({
  sel,
  onChange,
  roles,
  onRoles,
  allRoles,
  inheritWord,
  disabled,
  id
}: {
  sel: RuleSelection;
  onChange: (next: RuleSelection) => void;
  roles: string[];
  onRoles: (roles: string[]) => void;
  allRoles: string[];
  /** The words for the *Default* box, when the rule may be absent. */
  inheritWord?: string;
  disabled?: boolean;
  id: string;
}) {
  const columns: Column[] = [...(inheritWord ? (['default'] as Column[]) : []), ...AUDIENCE.map((a) => a.col), ...roles.map((role) => ({ role }))];
  const offer = allRoles.filter((r) => roles.indexOf(r) === -1);
  return (
    <div class="rule-boxes" id={id}>
      {columns.map((col) => {
        const state = cellState(sel, col);
        const word = col === 'default' ? inheritWord || 'Default' : columnWord(col);
        const key = typeof col === 'string' ? col : 'role-' + col.role;
        return (
          <label key={key} class={'check' + (state.implied ? ' implied' : '')}>
            <input
              type="checkbox"
              data-col={key}
              checked={state.checked}
              disabled={disabled || state.implied}
              onChange={(e) => onChange(toggleCell(sel, col, (e.target as HTMLInputElement).checked))}
            />
            {typeof col === 'string' ? word : <span class="chip accent">{word}</span>}
            {typeof col !== 'string' && !disabled && sel.roles.indexOf(col.role) === -1 ? (
              <button type="button" class="chip-x" aria-label={'Remove ' + col.role} onClick={() => onRoles(roles.filter((r) => r !== col.role))}>
                ✕
              </button>
            ) : null}
          </label>
        );
      })}
      {disabled ? null : (
        <span class="rule-add">
          <Picker<string>
            id={id + '-add-role'}
            fetch={(q) => Promise.resolve(offer.filter((r) => r.toLowerCase().includes(q.trim().toLowerCase())))}
            label={(r) => r}
            keyOf={(r) => r}
            value={null}
            onPick={(r) => {
              if (r && roles.indexOf(r) === -1) onRoles(roles.concat([r]));
            }}
            placeholder="+ role"
            emptyText={offer.length ? 'No role matches.' : 'No other roles.'}
          />
        </span>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ try as --

interface TryAsProps {
  kind: 'collection' | 'function';
  targets: string[];
  initialTarget?: string;
  enforced: boolean;
}

/** The dry run: *Try as [someone] doing [List] on [Pet]* → what `POST /admin/permissions/check` decides. */
function TryAs({ kind, targets, initialTarget, enforced }: TryAsProps) {
  const [who, setWho] = useState<'anonymous' | 'user'>('user');
  const [person, setPerson] = useState<Member | null>(null);
  const [op, setOp] = useState<ClpOp>('find');
  const [target, setTarget] = useState(initialTarget || targets[0] || '');
  const [record, setRecord] = useState<PointerItem | null>(null);
  const [answer, setAnswer] = useState<CheckAnswer | null>(null);
  const [asked, setAsked] = useState<string>('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!target && targets.length) setTarget(initialTarget || targets[0]);
  }, [targets.join('\n')]);

  const onRecord = kind === 'collection' && (op === 'get' || op === 'update' || op === 'delete');
  const ready = target !== '' && (who === 'anonymous' || person !== null);
  const whoWords = who === 'anonymous' ? 'Someone signed out' : person ? personName(person) : 'someone';

  async function findPeople(q: string): Promise<Member[]> {
    const d = await api<{ users?: Member[] }>('GET', '/admin/users?limit=20&q=' + encode(q.trim()));
    return d.users || [];
  }

  async function ask() {
    if (!ready) return;
    setBusy(true);
    try {
      const principal = who === 'anonymous' ? { kind: 'anonymous' } : { kind: 'user', userId: person!.objectId };
      const body: Record<string, unknown> = { principal };
      if (kind === 'function') body.functionName = target;
      else {
        body.collection = target;
        body.op = op;
        if (onRecord && record) body.record = await api('GET', '/api/' + encode(target) + '/' + encode(record.objectId));
      }
      const a = await api<CheckAnswer>('POST', '/admin/permissions/check', body);
      setAnswer(a);
      setAsked(verdictSentence(whoWords, kind === 'function' ? 'call' : op, target + (onRecord && record ? ' (' + record.label + ')' : ''), a));
    } catch (e) {
      fail(e);
    }
    setBusy(false);
  }

  return (
    <Card class="tryas" id="tryas">
      <Row class="tryas-line">
        <Hi>Try it</Hi>
        <span>as</span>
        <select aria-label="Try as" value={who} onChange={(e) => setWho((e.currentTarget as HTMLSelectElement).value as 'anonymous' | 'user')}>
          <option value="user">a person…</option>
          <option value="anonymous">someone signed out</option>
        </select>
        {who === 'user' ? (
          <span class="tryas-person">
            <Picker<Member>
              id="tryas-person"
              fetch={findPeople}
              label={personName}
              detail={(u) => (u.email && u.email !== u.username ? u.email : '')}
              keyOf={(u) => u.objectId}
              value={person}
              onPick={setPerson}
              placeholder="Type a name or an email…"
              emptyText="No one matches."
            />
          </span>
        ) : null}
        <span>doing</span>
        {kind === 'function' ? (
          <b>Call</b>
        ) : (
          <select aria-label="Doing" value={op} onChange={(e) => setOp((e.currentTarget as HTMLSelectElement).value as ClpOp)}>
            {OP_ROWS.map((r) => (
              <option key={r.op} value={r.op}>
                {r.word}
              </option>
            ))}
          </select>
        )}
        <span>on</span>
        <select aria-label="On" value={target} onChange={(e) => setTarget((e.currentTarget as HTMLSelectElement).value)}>
          {targets.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        {onRecord ? (
          <span class="tryas-record">
            <Picker<PointerItem>
              id="tryas-record"
              fetch={(q) => (target ? searchRecords(target, q) : Promise.resolve([]))}
              label={(r) => r.label}
              detail={(r) => r.detail}
              keyOf={(r) => r.objectId}
              value={record}
              onPick={setRecord}
              placeholder="any record, or pick one…"
              emptyText="No record matches."
            />
          </span>
        ) : null}
        <Btn tiny kind="primary" disabled={!ready || busy} onClick={ask}>
          {busy ? 'Asking…' : 'Ask'}
        </Btn>
      </Row>
      {answer ? (
        <div class={'verdict ' + (answer.allowed && answer.recordAllowed !== false ? 'ok' : 'bad')} aria-live="polite">
          <b>{asked}</b>
          <span class="hint">{verdictRule(answer)}</span>
          <span class="hint mono">{answer.reason}</span>
          {!enforced ? <span class="hint">Dev-open is on, so right now this backend would let it through anyway. This is what happens once enforcement is on.</span> : null}
        </div>
      ) : null}
    </Card>
  );
}

// ---------------------------------------------------------------- defaults --

interface DefaultsDraft {
  defaults: Matrix<ClpOp>;
  owns: boolean;
  files: Matrix<FileOp>;
  signup: RuleValue;
}

/** The whole config as the defaults page writes it. */
function configFrom(c: Config, d: DefaultsDraft): Config {
  return {
    ...c,
    defaults: { permissions: rulesFrom(d.defaults, CLP_OPS as unknown as ClpOp[]) as Record<ClpOp, RuleValue>, creatorOwns: d.owns },
    files: rulesFrom(d.files, FILE_OPS) as Record<FileOp, RuleValue>,
    signup: d.signup
  };
}

function DefaultsPage() {
  const { readonly } = useSession();
  const [loaded, reload, setLoaded] = useLoaded();
  const [draft, setDraft] = useState<DefaultsDraft | null>(null);
  const [defaultRoles, setDefaultRoles] = useState<string[]>([]);
  const [fileRoles, setFileRoles] = useState<string[]>([]);
  const [stale, setStale] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  /** The config as the page would write it with nothing changed: what *dirty* compares against. */
  const [baseline, setBaseline] = useState('');

  function fromLoaded(l: Loaded) {
    const c = l.config;
    const defaults = matrixFrom((c.defaults && c.defaults.permissions) || {}, CLP_OPS as unknown as ClpOp[]);
    const files = matrixFrom(c.files || {}, FILE_OPS);
    const fresh = { defaults, owns: !!(c.defaults && c.defaults.creatorOwns), files, signup: c.signup === undefined ? 'nobody' : c.signup };
    setDraft(fresh);
    setBaseline(JSON.stringify(configFrom(c, fresh)));
    setDefaultRoles(rolesNamed(matrixRules(defaults, CLP_OPS as unknown as ClpOp[])));
    setFileRoles(rolesNamed(matrixRules(files, FILE_OPS)));
    setStale(null);
  }
  useEffect(() => {
    if (loaded) fromLoaded(loaded);
  }, [loaded && loaded.etag]);

  if (!loaded || !draft) return <Page title="Permissions" />;
  const c = loaded.config;
  const collections = visibleCollections(loaded.tables);
  const hidden = loaded.tables.filter((t) => t.startsWith('_')).length;

  const nextConfig = (): Config => configFrom(c, draft);
  const dirty = JSON.stringify(nextConfig()) !== baseline;
  const incomplete = (CLP_OPS as unknown as ClpOp[]).some((op) => draft.defaults[op].inherit) || FILE_OPS.some((op) => draft.files[op].inherit);

  function save() {
    if (incomplete) {
      toast('Every row of the defaults and of Files needs an answer.', 'bad');
      return;
    }
    setBusy(true);
    saveWhole(nextConfig(), loaded!.etag)
      .then((r) => {
        toast('Permissions saved.', 'ok');
        setLoaded({ ...loaded!, config: r.config, etag: r.etag });
      })
      .catch((e) => {
        if (e && e.status === 412) setStale(String(e.message));
        else fail(e);
      })
      .then(() => setBusy(false));
  }

  const signup: SignupChoice = signupChoice(draft.signup);

  return (
    <Page title="Permissions" subtitle="Who may list, open, create, change and delete what. Tick boxes; nothing here is typed.">
      <EnforcementNotice enforced={loaded.enforced} />
      <TryAs kind="collection" targets={collections} enforced={loaded.enforced} />
      <Gap />
      {stale ? (
        <Notice kind="bad">
          {stale}{' '}
          <Btn tiny onClick={reload}>
            Reload
          </Btn>
        </Notice>
      ) : null}

      <h2>Any collection without rules of its own</h2>
      <Card id="defaults">
        <RuleMatrix<ClpOp>
          id="defaults-matrix"
          rows={OP_ROWS}
          matrix={draft.defaults}
          onChange={(m) => setDraft({ ...draft, defaults: m })}
          roles={defaultRoles}
          onRoles={setDefaultRoles}
          allRoles={loaded.roles}
          disabled={readonly}
        />
        <Gap h={8} />
        <Switch id="defaults-owns" checked={draft.owns} disabled={readonly} onChange={(owns) => setDraft({ ...draft, owns })}>
          Records belong to their creator
        </Switch>
        <div class="switch-why">When a signed-in user creates a record, only they (and the roles allowed above) can see and change it.</div>
      </Card>

      <h2>Sign-up</h2>
      <Card id="signup">
        <Field label="Who can make an account">
          <select
            aria-label="Who can make an account"
            disabled={readonly}
            value={signup}
            onChange={(e) => {
              const v = (e.currentTarget as HTMLSelectElement).value;
              // The two choices the page offers, or whatever was stored when it was neither.
              setDraft({ ...draft, signup: v === 'public' ? 'public' : v === 'nobody' ? 'nobody' : c.signup || 'nobody' });
            }}
          >
            <option value="public">Anyone can sign up</option>
            <option value="nobody">Nobody — accounts are made here, under Users</option>
            {signup === 'other' ? <option value="other">As stored: {ruleWords(c.signup)}</option> : null}
          </select>
        </Field>
        <Hint>Signing in with a link or a provider makes an account too, when Sign-in allows it.</Hint>
      </Card>

      <h2>Files</h2>
      <Card id="files">
        <RuleMatrix<FileOp>
          id="files-matrix"
          rows={FILE_ROWS}
          matrix={draft.files}
          onChange={(m) => setDraft({ ...draft, files: m })}
          roles={fileRoles}
          onRoles={setFileRoles}
          allRoles={loaded.roles}
          disabled={readonly}
        />
        <Hint>Open means fetching a file by its address. A signed address always opens, whoever asks.</Hint>
      </Card>

      <Row>
        <WriteBtn kind="primary" disabled={!dirty || busy} onClick={save}>
          {busy ? 'Saving…' : 'Save'}
        </WriteBtn>
        <Btn disabled={!dirty} onClick={() => fromLoaded(loaded)}>
          Undo changes
        </Btn>
        <Spacer />
        <Hint>{dirty ? 'Unsaved changes.' : 'Saved.'}</Hint>
      </Row>

      <h2>Collections</h2>
      <Table
        columns={['Collection', 'Rules', '']}
        rows={collections}
        empty={
          <EmptyState action={{ label: 'Create a collection in Schema', onClick: () => navigate('schema'), write: false }}>
            No collections to set permissions on yet.
          </EmptyState>
        }
        renderRow={(name) => {
          const entry = (c.collections || {})[name];
          const own = !!entry && (!!entry.permissions || entry.creatorOwns !== undefined);
          return (
            <tr key={name} class="clickable" data-collection={name} onClick={() => navigate('permissions', name)}>
              <td>
                <b>{name}</b>
              </td>
              <td class={own ? undefined : 'hint'}>{entrySummary(entry, (c.defaults && c.defaults.permissions) || {})}</td>
              <td>{own ? <Chip kind="accent">its own rules</Chip> : <Chip>defaults</Chip>}</td>
            </tr>
          );
        }}
      />
      <Hint>
        {hidden ? 'The backend’s own tables (accounts, roles, sessions, keys, audit) are locked to the admin credential and cannot be given rules. ' : ''}
        <a href="#/permissions/functions">Who can call each function →</a>
      </Hint>
    </Page>
  );
}

// -------------------------------------------------------------- collection --

function CollectionPage({ name }: { name: string }) {
  const { readonly } = useSession();
  const [loaded, , setLoaded] = useLoaded();
  const [matrix, setMatrix] = useState<Matrix<ClpOp> | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [useDefaults, setUseDefaults] = useState(true);
  const [owns, setOwns] = useState(false);
  const [templateRole, setTemplateRole] = useState('');
  const [busy, setBusy] = useState(false);
  const ops = CLP_OPS as unknown as ClpOp[];

  function fromLoaded(l: Loaded) {
    const entry = (l.config.collections || {})[name];
    const own = !!entry && (!!entry.permissions || entry.creatorOwns !== undefined);
    const m = matrixFrom(entry && entry.permissions, ops);
    setMatrix(m);
    setRoles(rolesNamed(matrixRules(m, ops)));
    setUseDefaults(!own);
    setOwns(entry && entry.creatorOwns !== undefined ? !!entry.creatorOwns : !!(l.config.defaults && l.config.defaults.creatorOwns));
  }
  useEffect(() => {
    if (loaded) fromLoaded(loaded);
  }, [loaded && loaded.etag]);

  if (!loaded || !matrix) return <Page title={name} />;
  const c = loaded.config;
  const defaults = matrixFrom((c.defaults && c.defaults.permissions) || {}, ops);
  const known = visibleCollections(loaded.tables);
  const entry = (c.collections || {})[name];
  if (name.startsWith('_')) {
    return (
      <Page title={name}>
        <Notice kind="warn">{name} is one of the backend’s own tables. It is locked to the admin credential and cannot be given rules.</Notice>
        <a href="#/permissions">← Permissions</a>
      </Page>
    );
  }

  const stored: CollectionEntry = useDefaults ? {} : { permissions: rulesFrom(matrix, ops), creatorOwns: owns };
  // The loaded entry, read through the same matrix, so a stored `['role:x','authenticated']` (the
  // same rule in another order) does not read as a change.
  const before: CollectionEntry =
    entry && (entry.permissions || entry.creatorOwns !== undefined)
      ? { permissions: rulesFrom(matrixFrom(entry.permissions, ops), ops), creatorOwns: entry.creatorOwns !== undefined ? !!entry.creatorOwns : !!(c.defaults && c.defaults.creatorOwns) }
      : {};
  const dirty = JSON.stringify(stored) !== JSON.stringify(before);
  const nothingSet = !useDefaults && allInherit(matrix, ops);

  function applyTemplate(id: TemplateId) {
    const t = templateEntry(id, templateRole);
    const m = matrixFrom(t.permissions, ops);
    setUseDefaults(false);
    setMatrix(m);
    setRoles(rolesNamed(matrixRules(m, ops)));
    setOwns(!!t.creatorOwns);
  }

  function save() {
    setBusy(true);
    const done = (message: string) =>
      api<{ config?: Config; etag?: string }>('GET', '/admin/permissions').then((r) => {
        toast(message, 'ok');
        setLoaded({ ...loaded!, config: r.config || {}, etag: r.etag || '' });
      });
    const write = useDefaults
      ? api('DELETE', '/admin/permissions/collections/' + encode(name)).then(() => done(name + ' now uses the defaults.'))
      : api('PUT', '/admin/permissions/collections/' + encode(name), { permissions: rulesFrom(matrix!, ops), creatorOwns: owns }).then(() =>
          done('Permissions saved for ' + name + '.')
        );
    write.catch(fail).then(() => setBusy(false));
  }

  return (
    <Page title={name} subtitle={'Who may list, open, create, change and delete ' + name + ' records.'}>
      <a href="#/permissions">← All collections</a>
      <Gap />
      <EnforcementNotice enforced={loaded.enforced} />
      <TryAs kind="collection" targets={known.indexOf(name) === -1 ? [name].concat(known) : known} initialTarget={name} enforced={loaded.enforced} />
      <Gap />
      {known.indexOf(name) === -1 ? <Notice kind="warn">There is no collection called {name} in the schema. Rules for it apply once one exists.</Notice> : null}

      <Card id="collection-rules">
        <Row>
          <Switch id="use-defaults" checked={useDefaults} disabled={readonly} onChange={setUseDefaults}>
            Use the defaults
          </Switch>
          <Spacer />
          {!useDefaults ? (
            <span class="tpl-line">
              <span class="hint">Start from…</span>
              {TEMPLATES.map((t) => (
                <Btn key={t.id} tiny title={t.sentence} disabled={readonly || (t.needsRole && !templateRole)} onClick={() => applyTemplate(t.id)}>
                  {t.label}
                </Btn>
              ))}
              <select aria-label="Role for the template" disabled={readonly} value={templateRole} onChange={(e) => setTemplateRole((e.currentTarget as HTMLSelectElement).value)}>
                <option value="">role…</option>
                {loaded.roles.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </span>
          ) : null}
        </Row>
        <Gap h={8} />
        {useDefaults ? (
          <>
            <Hint>These are the backend’s defaults. Turn the switch off to give {name} rules of its own.</Hint>
            <RuleMatrix<ClpOp>
              id="collection-matrix"
              rows={OP_ROWS}
              matrix={defaults}
              onChange={() => undefined}
              roles={rolesNamed(matrixRules(defaults, ops))}
              onRoles={() => undefined}
              allRoles={loaded.roles}
              disabled
            />
            <Gap h={8} />
            <Switch checked={!!(c.defaults && c.defaults.creatorOwns)} disabled onChange={() => undefined}>
              Records belong to their creator
            </Switch>
          </>
        ) : (
          <>
            <RuleMatrix<ClpOp>
              id="collection-matrix"
              rows={OP_ROWS}
              matrix={matrix}
              onChange={setMatrix}
              roles={roles}
              onRoles={setRoles}
              allRoles={loaded.roles}
              defaults={defaults}
              disabled={readonly}
            />
            <Gap h={8} />
            <Switch id="collection-owns" checked={owns} disabled={readonly} onChange={setOwns}>
              Records belong to their creator
            </Switch>
            <div class="switch-why">When a signed-in user creates a record, only they (and the roles allowed above) can see and change it.</div>
          </>
        )}
        <Gap h={8} />
        <Row>
          <WriteBtn kind="primary" disabled={!dirty || busy} onClick={save}>
            {busy ? 'Saving…' : 'Save'}
          </WriteBtn>
          <Btn disabled={!dirty} onClick={() => fromLoaded(loaded)}>
            Undo changes
          </Btn>
          <Spacer />
          <Hint>{nothingSet ? 'Every row is on Default: saving stores no rule of its own, only the creator setting.' : dirty ? 'Unsaved changes.' : 'Saved.'}</Hint>
        </Row>
      </Card>
    </Page>
  );
}

// --------------------------------------------------------------- functions --

interface FunctionsAnswer {
  functions: FunctionRow[];
  enforced: boolean;
  classRateLimit: RateLimit | null;
  defaultTimeoutMs: number;
  publicWriteDefaultRateLimit: RateLimit | null;
  idempotency: { available: boolean; ttlHours: number };
}

function FunctionsPage() {
  const { readonly } = useSession();
  const [loaded, reload, setLoaded] = useLoaded();
  const [fns, setFns] = useState<FunctionsAnswer | null>(null);
  const [stale, setStale] = useState<string | null>(null);

  function loadFns() {
    api<FunctionsAnswer>('GET', '/admin/permissions/functions').then(setFns).catch(fail);
  }
  useEffect(loadFns, [loaded && loaded.etag]);

  if (!loaded || !fns) return <Page title="Functions" />;

  function saveEntry(name: string, entry: FunctionEntry | undefined) {
    const functions = { ...(loaded!.config.functions || {}) };
    if (entry) functions[name] = entry;
    else delete functions[name];
    return saveWhole({ ...loaded!.config, functions }, loaded!.etag)
      .then((r) => {
        toast(name + ' saved.', 'ok');
        setStale(null);
        setLoaded({ ...loaded!, config: r.config, etag: r.etag });
      })
      .catch((e) => {
        if (e && e.status === 412) setStale(String(e.message));
        else fail(e);
      });
  }

  const names = fns.functions.map((f) => f.name);
  return (
    <Page title="Functions" subtitle="Who can call each function, what it runs as, its budget, its time limit, and what a repeated delivery does.">
      <a href="#/permissions">← Permissions</a>
      <Gap />
      <EnforcementNotice enforced={loaded.enforced} />
      <TryAs kind="function" targets={names} enforced={loaded.enforced} />
      <Gap />
      {stale ? (
        <Notice kind="bad">
          {stale}{' '}
          <Btn tiny onClick={reload}>
            Reload
          </Btn>
        </Notice>
      ) : null}
      <Hint>
        Every function also shares one budget
        {fns.classRateLimit ? ' (' + fns.classRateLimit.ratePerMinute + ' a minute, burst ' + fns.classRateLimit.burst + ')' : ''}; a limit here can only tighten it. Without a time
        limit of its own a function gets {fns.defaultTimeoutMs / 1000} seconds.
        {fns.idempotency.available
          ? ' A replayed answer is kept for ' + fns.idempotency.ttlHours + ' hours.'
          : ' Duplicate deliveries cannot be replayed on this backend: its store is not available.'}
      </Hint>
      <Gap />
      {fns.functions.length ? (
        fns.functions.map((row) => (
          <FunctionCard
            key={row.name + ':' + JSON.stringify(row)}
            row={row}
            allRoles={loaded.roles}
            publicWriteDefault={fns.publicWriteDefaultRateLimit}
            idempotencyAvailable={fns.idempotency.available}
            readonly={readonly}
            onSave={(entry) => saveEntry(row.name, entry)}
          />
        ))
      ) : (
        <EmptyState icon="ƒ">No functions yet. Deploy a project with a Request node, or a rule appears here once one is written.</EmptyState>
      )}
    </Page>
  );
}

function FunctionCard({
  row,
  allRoles,
  publicWriteDefault,
  idempotencyAvailable,
  readonly,
  onSave
}: {
  row: FunctionRow;
  allRoles: string[];
  publicWriteDefault: RateLimit | null;
  idempotencyAvailable: boolean;
  readonly: boolean;
  onSave: (entry: FunctionEntry | undefined) => Promise<void>;
}) {
  const [draft, setDraft] = useState<FunctionDraft>(() => draftFrom(row));
  const [roles, setRoles] = useState<string[]>(() => rolesNamed([row.configured === null ? undefined : row.configured]));
  const [busy, setBusy] = useState(false);
  const chips = functionChips(row, publicWriteDefault);
  const problem = draftProblem(draft);
  const dirty = JSON.stringify(entryFromDraft(draft) || null) !== JSON.stringify(entryFromDraft(draftFrom(row)) || null);
  const graphWord = 'From the graph (' + (row.allowNoAuth ? 'everyone' : 'signed in') + ')';

  function save() {
    if (problem) {
      toast(problem, 'bad');
      return;
    }
    setBusy(true);
    onSave(entryFromDraft(draft)).then(() => setBusy(false));
  }

  function forget() {
    confirmSimple(
      'Forget the rules for ' + row.name + '?',
      'It goes back to what the graph declares' + (row.deployed ? '' : ', and since nothing is deployed under that name, the row disappears') + '.',
      () => {
        setBusy(true);
        onSave(undefined).then(() => setBusy(false));
      },
      'Forget'
    );
  }

  return (
    <Card class="fn-card" id={'fn-' + row.name}>
      <Row>
        <Hi>{row.name}</Hi>
        {row.workflow ? <span class="hint">{row.workflow}</span> : null}
        {chips.map((chip) => (
          <Chip key={chip.label} kind={chip.kind} title={chip.why}>
            {chip.label}
          </Chip>
        ))}
        <Spacer />
        <span class="hint">Who can call now: {ruleWords(row.call)}</span>
      </Row>
      {chips
        .filter((chip) => chip.kind === 'bad' || chip.kind === 'warn')
        .map((chip) => (
          <Hint key={chip.label}>{chip.why}</Hint>
        ))}
      <Gap h={8} />
      <Field label="Who can call">
        <RuleBoxes
          id={'fn-call-' + row.name}
          sel={draft.call}
          onChange={(call) => setDraft({ ...draft, call })}
          roles={roles}
          onRoles={setRoles}
          allRoles={allRoles}
          inheritWord={graphWord}
          disabled={readonly}
        />
      </Field>
      <div class="fn-fields">
        <Field label="Runs as">
          <select aria-label="Runs as" disabled={readonly} value={draft.runAs} onChange={(e) => setDraft({ ...draft, runAs: (e.currentTarget as HTMLSelectElement).value as '' | 'system' })}>
            <option value="">Not said</option>
            <option value="system">The system</option>
          </select>
        </Field>
        <Field label="Its own limit">
          <span class="field-line">
            <Switch label="Its own limit" checked={draft.ownLimit} disabled={readonly} onChange={(ownLimit) => setDraft({ ...draft, ownLimit })} />
            {draft.ownLimit ? (
              <>
                <input
                  type="number"
                  min={0}
                  aria-label="Calls per minute"
                  disabled={readonly}
                  value={draft.perMinute}
                  onInput={(e) => setDraft({ ...draft, perMinute: Number((e.currentTarget as HTMLInputElement).value) })}
                />
                <span class="hint">a minute, burst</span>
                <input type="number" min={0} aria-label="Burst" disabled={readonly} value={draft.burst} onInput={(e) => setDraft({ ...draft, burst: Number((e.currentTarget as HTMLInputElement).value) })} />
              </>
            ) : (
              <span class="hint">the shared budget only</span>
            )}
          </span>
        </Field>
        <Field label="Time limit (seconds)">
          <input
            type="number"
            min={0}
            step="any"
            aria-label="Time limit in seconds"
            placeholder="the default"
            disabled={readonly}
            value={draft.timeoutSeconds}
            onInput={(e) => setDraft({ ...draft, timeoutSeconds: (e.currentTarget as HTMLInputElement).value })}
          />
        </Field>
        <Field label="Duplicate deliveries">
          <select
            aria-label="Duplicate deliveries"
            disabled={readonly || !idempotencyAvailable}
            value={draft.idempotency}
            onChange={(e) => setDraft({ ...draft, idempotency: (e.currentTarget as HTMLSelectElement).value as FunctionDraft['idempotency'] })}
          >
            {IDEMPOTENCY_OPTIONS.map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </Field>
      </div>
      {problem ? <Notice kind="bad">{problem}</Notice> : null}
      <Row>
        <WriteBtn tiny kind="primary" disabled={!dirty || busy || !!problem} onClick={save}>
          {busy ? 'Saving…' : 'Save'}
        </WriteBtn>
        <Btn tiny disabled={!dirty} onClick={() => setDraft(draftFrom(row))}>
          Undo
        </Btn>
        {row.source === 'configured' || row.runAs || row.rateLimit || row.timeoutMs !== null || row.idempotency ? (
          <WriteBtn tiny disabled={busy} onClick={forget}>
            Forget its rules
          </WriteBtn>
        ) : null}
        <Spacer />
        <Hint>{dirty ? 'Unsaved changes.' : 'Saved.'}</Hint>
      </Row>
    </Card>
  );
}
