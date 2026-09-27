/**
 * API keys — BMG-007. A key is made by TICKING what it may do (two groups of
 * boxes), optionally naming the user it acts as, and copying the secret once.
 * The URL opens the drawer: `#/keys/new` for a new key, `#/keys/<id>` to change
 * what an existing one may do. No field on this page takes a scope string; the
 * mapping between the boxes and the server's vocabulary lives in `../scopes`.
 */
import { useEffect, useState } from 'preact/hooks';

import { api, encode, useSession } from '../api';
import { Drawer, EmptyState, Picker } from '../composers';
import { ago, when } from '../format';
import { navigate } from '../router';
import { ActionCell, Btn, Check, Chip, Field, Gap, Hint, Notice, Page, Row, Table, WriteBtn, confirmDestructive, copyText, fail, toast } from '../ui';
import { ScopeChoice, NOTHING, fromScopes, isEmptyChoice, describeScopes, toScopes } from '../scopes';
import type { ViewProps } from './index';

interface ApiKey {
  objectId: string;
  name: string;
  scopes?: string[];
  revoked?: boolean;
  createdAt?: unknown;
  lastUsedAt?: unknown;
  actsAsUserId?: string | null;
}

interface User {
  objectId: string;
  username?: unknown;
  email?: unknown;
}

interface FunctionRow {
  name: string;
  deployed?: boolean;
}

/** The request header a caller sends the secret in (HttpServer's `/mcp` refusal names the same one). */
const HEADER = 'X-NodeGX-Api-Key';

function userLabel(u: User): string {
  return String(u.username || u.email || u.objectId);
}

export function KeysView({ params }: ViewProps) {
  const { whoami } = useSession();
  const devOpen = !!(whoami && whoami.security && whoami.security.devOpen);
  const [keys, setKeys] = useState<ApiKey[] | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [functions, setFunctions] = useState<string[] | null>(null);
  const opened = params[0] || '';

  function load() {
    api<{ keys?: ApiKey[] }>('GET', '/admin/keys')
      .then((data) => setKeys(data.keys || []))
      .catch(fail);
  }
  useEffect(() => {
    load();
    api<{ results?: User[] }>('GET', '/api/_User?limit=200')
      .then((d) => setUsers(d.results || []))
      .catch(() => setUsers([]));
    api<{ functions?: FunctionRow[] }>('GET', '/admin/permissions/functions')
      .then((d) => setFunctions((d.functions || []).map((f) => f.name)))
      .catch(() => setFunctions([]));
  }, []);

  const byId: Record<string, User> = {};
  users.forEach((u) => (byId[u.objectId] = u));

  function revoke(k: ApiKey) {
    confirmDestructive(
      'Revoke key',
      'Anything using "' + k.name + '" stops working immediately.',
      k.name,
      () => {
        api('DELETE', '/admin/keys/' + encode(k.objectId))
          .then(() => {
            toast('Key revoked.', 'ok');
            load();
          })
          .catch(fail);
      },
      'Revoke'
    );
  }

  const editing = opened && opened !== 'new' && keys ? keys.find((k) => k.objectId === opened) || null : null;

  return (
    <Page title="API keys" subtitle="A key lets a script or another server call this backend. Tick what it may do; the secret is shown once.">
      <Row>
        <WriteBtn kind="primary" onClick={() => navigate('keys', 'new')}>
          New key
        </WriteBtn>
        <Btn onClick={load}>Refresh</Btn>
      </Row>
      <Gap />
      {devOpen ? (
        <>
          <Notice kind="warn">
            This backend is <b>dev-open</b>: while it is, every key may do everything, whatever its boxes say. The boxes take effect when dev-open is switched off — a deployed backend refuses to start with it on.
          </Notice>
          <Gap />
        </>
      ) : null}
      {keys ? (
        <Table
          columns={['Name', 'May do', 'Acts as', 'Last used', 'Created', 'Status', '']}
          rows={keys}
          empty={
            <EmptyState icon="🔑" action={{ label: 'New key', onClick: () => navigate('keys', 'new') }}>
              No API keys yet. A key lets a server or script call this backend.
            </EmptyState>
          }
          renderRow={(k) => (
            <tr key={k.objectId} class={k.revoked ? 'revoked' : ''}>
              <td>{k.name}</td>
              <td>
                {describeScopes(k.scopes).map((s) => (
                  <Chip key={s} kind="accent">
                    {s}
                  </Chip>
                ))}
              </td>
              <td>{k.actsAsUserId ? (byId[k.actsAsUserId] ? userLabel(byId[k.actsAsUserId]) : 'a user that is gone') : <span class="hint">backend</span>}</td>
              <td title={when(k.lastUsedAt)}>{ago(k.lastUsedAt)}</td>
              <td>{when(k.createdAt)}</td>
              <td>{k.revoked ? <Chip kind="bad">revoked</Chip> : <Chip kind="ok">active</Chip>}</td>
              <ActionCell>
                {k.revoked ? null : (
                  <>
                    <WriteBtn tiny onClick={() => navigate('keys', k.objectId)}>
                      Edit
                    </WriteBtn>{' '}
                    <WriteBtn tiny kind="danger" onClick={() => revoke(k)}>
                      Revoke
                    </WriteBtn>
                  </>
                )}
              </ActionCell>
            </tr>
          )}
        />
      ) : null}
      {opened === 'new' || editing ? (
        <KeyDrawer
          key={opened}
          existing={editing}
          users={users}
          functions={functions}
          onClose={() => navigate('keys')}
          onChanged={load}
        />
      ) : null}
    </Page>
  );
}

// ------------------------------------------------------------ the drawer --

interface DrawerProps {
  /** null = a new key. */
  existing: ApiKey | null;
  users: User[];
  /** null while the route has not answered. */
  functions: string[] | null;
  onClose: () => void;
  onChanged: () => void;
}

function KeyDrawer({ existing, users, functions, onClose, onChanged }: DrawerProps) {
  const [name, setName] = useState(existing ? existing.name : '');
  const [choice, setChoice] = useState<ScopeChoice>(existing ? fromScopes(existing.scopes) : NOTHING);
  const [actsAs, setActsAs] = useState<User | null>(
    existing && existing.actsAsUserId ? users.find((u) => u.objectId === existing.actsAsUserId) || { objectId: existing.actsAsUserId } : null
  );
  const [asUser, setAsUser] = useState(!!(existing && existing.actsAsUserId));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [secret, setSecret] = useState<string | null>(null);

  const scopes = toScopes(choice);
  const ready = !busy && !isEmptyChoice(choice) && (existing ? true : name.trim() !== '') && (!asUser || !!actsAs);

  function submit() {
    if (isEmptyChoice(choice)) {
      setError('Tick at least one thing the key may do.');
      return;
    }
    if (asUser && !actsAs) {
      setError('Pick the user this key acts as, or switch it back to the backend.');
      return;
    }
    setError(null);
    setBusy(true);
    const actsAsUserId = asUser && actsAs ? actsAs.objectId : null;
    const request = existing
      ? api('PUT', '/admin/keys/' + encode(existing.objectId), { scopes, actsAsUserId })
      : api<{ secret: string }>('POST', '/admin/keys', { name: name.trim(), scopes, actsAsUserId });
    request
      .then((result) => {
        setBusy(false);
        onChanged();
        if (existing) {
          toast('Key updated.', 'ok');
          onClose();
        } else {
          setSecret((result as { secret: string }).secret);
        }
      })
      .catch((e) => {
        setBusy(false);
        setError((e as Error).message);
      });
  }

  // The key may already have been used while its secret was on screen (the
  // example command is right there), so the list is re-read on the way out.
  const done = () => {
    onChanged();
    onClose();
  };

  if (secret !== null) {
    return (
      <Drawer
        title={'Your new key: ' + name.trim()}
        onClose={done}
        footer={
          <Btn kind="primary" onClick={done}>
            Done
          </Btn>
        }
      >
        <SecretCard secret={secret} />
      </Drawer>
    );
  }

  const fetchUsers = (query: string): Promise<User[]> => {
    const needle = query.trim().toLowerCase();
    return Promise.resolve(users.filter((u) => !needle || (userLabel(u) + ' ' + String(u.email || '')).toLowerCase().indexOf(needle) !== -1));
  };

  return (
    <Drawer
      title={existing ? 'What "' + existing.name + '" may do' : 'New key'}
      subtitle={existing ? 'The secret does not change. Anything using this key gets the new permissions on its next request.' : undefined}
      onClose={onClose}
      footer={
        <>
          <Btn onClick={onClose}>Cancel</Btn>
          <WriteBtn kind="primary" disabled={!ready} onClick={submit}>
            {existing ? 'Save' : 'Create'}
          </WriteBtn>
        </>
      }
    >
      <div class="form-grid" onInput={() => setError(null)}>
        {existing ? null : (
          <Field label="Name">
            <input type="text" placeholder="What it is for — e.g. nightly report" value={name} autoFocus onInput={(e) => setName((e.currentTarget as HTMLInputElement).value)} />
          </Field>
        )}
        <div class="field">
          <span class="field-head">
            <b>What it may do</b>
          </span>
          <ScopePicker choice={choice} onChange={setChoice} functions={functions} />
        </div>
        <div class="field">
          <span class="field-head">
            <b>Acts as</b>
          </span>
          <div class="scope-group">
            <label class="check">
              <input type="radio" name="acts-as" checked={!asUser} onChange={() => setAsUser(false)} /> This key is the backend
            </label>
            <label class="check">
              <input type="radio" name="acts-as" checked={asUser} onChange={() => setAsUser(true)} /> This key acts as a user
            </label>
            {asUser ? (
              <div class="scope-indent">
                <Picker<User>
                  fetch={fetchUsers}
                  label={userLabel}
                  detail={(u) => (u.email && u.email !== u.username ? String(u.email) : '')}
                  keyOf={(u) => u.objectId}
                  value={actsAs}
                  onPick={setActsAs}
                  placeholder="Type a username…"
                  emptyText={users.length ? 'No user by that name.' : 'This backend has no users yet.'}
                />
                <Hint>Records the user cannot see, the key cannot see.</Hint>
              </div>
            ) : (
              <Hint>It sees every record its permissions cover.</Hint>
            )}
          </div>
        </div>
      </div>
      {error ? <Notice kind="bad" style="margin-top:12px">{error}</Notice> : null}
    </Drawer>
  );
}

// -------------------------------------------------------- the scope boxes --

export interface ScopePickerProps {
  choice: ScopeChoice;
  onChange: (choice: ScopeChoice) => void;
  /** The function names the backend serves; null while loading. */
  functions: string[] | null;
  disabled?: boolean;
}

/**
 * Two groups of boxes with a select-all each. Data: read, write. Functions:
 * "any" is the select-all and greys the named list. Names a stored key still
 * carries but the backend no longer serves stay ticked and say so, so that
 * saving the form does not silently drop them.
 */
export function ScopePicker({ choice, onChange, functions, disabled }: ScopePickerProps) {
  const served = functions || [];
  const gone = choice.functions.filter((n) => served.indexOf(n) === -1);
  const names = served.concat(gone);
  const allData = choice.read && choice.write;

  const setFn = (name: string, on: boolean) => {
    const next = choice.functions.filter((n) => n !== name);
    if (on) next.push(name);
    onChange({ ...choice, functions: next });
  };

  return (
    <div class="scope-groups">
      <div class="scope-group">
        <label class="check scope-all">
          <input
            type="checkbox"
            aria-label="All data"
            checked={allData}
            disabled={disabled}
            ref={(el) => {
              if (el) el.indeterminate = !allData && (choice.read || choice.write);
            }}
            onChange={(e) => {
              const on = (e.currentTarget as HTMLInputElement).checked;
              onChange({ ...choice, read: on, write: on });
            }}
          />
          <b>Data</b>
        </label>
        <div class="scope-list">
          <Check checked={choice.read} disabled={disabled} onChange={(on) => onChange({ ...choice, read: on })}>
            Read records
          </Check>
          <Check checked={choice.write} disabled={disabled} onChange={(on) => onChange({ ...choice, write: on })}>
            Write records
          </Check>
        </div>
      </div>
      <div class="scope-group">
        <label class="check scope-all">
          <input
            type="checkbox"
            aria-label="Call any function"
            checked={choice.anyFunction}
            disabled={disabled}
            onChange={(e) => onChange({ ...choice, anyFunction: (e.currentTarget as HTMLInputElement).checked })}
          />
          <b>Functions</b> <span class="hint">call any function</span>
        </label>
        <div class={'scope-list' + (choice.anyFunction ? ' greyed' : '')}>
          {functions === null ? (
            <Hint>Loading functions…</Hint>
          ) : !names.length ? (
            <Hint>No functions yet. Deploy a cloud function and it appears here.</Hint>
          ) : (
            names.map((name) => (
              <Check key={name} checked={choice.anyFunction || choice.functions.indexOf(name) !== -1} disabled={disabled || choice.anyFunction} onChange={(on) => setFn(name, on)}>
                <span class="mono">{name}</span>
                {gone.indexOf(name) !== -1 ? <span class="hint"> (not deployed any more)</span> : null}
              </Check>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// --------------------------------------------------------- the secret card --

export function SecretCard({ secret }: { secret: string }) {
  const [copied, setCopied] = useState(false);
  const [collection, setCollection] = useState<string>('Collection');
  useEffect(() => {
    api<{ tables?: Array<{ name: string }> }>('GET', '/admin/schema')
      .then((d) => {
        const first = (d.tables || []).map((t) => t.name).filter((n) => n.charAt(0) !== '_')[0];
        if (first) setCollection(first);
      })
      .catch(() => undefined);
  }, []);
  const origin = typeof location !== 'undefined' ? location.origin : '';
  const example = 'curl -H "' + HEADER + ': ' + secret + '" ' + origin + '/api/' + collection;

  function copy(text: string) {
    copyText(text).then((ok) => {
      if (ok) {
        setCopied(true);
        toast('Copied to the clipboard.', 'ok');
        setTimeout(() => setCopied(false), 2500);
      } else {
        toast('The browser refused the clipboard. Select the secret and copy it by hand.', 'bad');
      }
    });
  }

  return (
    <div class="secret-card">
      <Notice kind="warn">This is the only time the secret is shown. It is stored hashed and cannot be recovered; if it is lost, revoke this key and make another.</Notice>
      <Gap h={10} />
      <div class="secret-box mono" data-secret>
        {secret}
      </div>
      <Row style="margin-top:8px">
        <Btn kind="primary" onClick={() => copy(secret)}>
          {copied ? 'Copied ✓' : 'Copy secret'}
        </Btn>
        <Hint>Send it in the {HEADER} header, or as a Bearer token.</Hint>
      </Row>
      <Gap />
      <div class="field">
        <span class="field-head">
          <b>Try it</b>
        </span>
        <div class="secret-box mono">{example}</div>
        <Row style="margin-top:6px">
          <Btn tiny onClick={() => copy(example)}>
            Copy the command
          </Btn>
        </Row>
      </div>
    </div>
  );
}
