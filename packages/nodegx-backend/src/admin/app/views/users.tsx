/**
 * Users — BMG-004. People, not ids: a list you can search and filter, the
 * person's own fields as columns, and a drawer the URL opens
 * (`#/users/<id>`; `#/users/new` to create one, `#/users/invite` to invite one
 * by email) with their details, roles, how they sign in, their sessions, the
 * *Disable sign-in* switch (R3) and the danger zone.
 *
 * Everything writes through `/admin/users` (server/admin-users.ts), which hashes
 * a password, revokes sessions when it should and audits the change. The BYOB
 * `/api/_User` door refuses a password now; nothing here uses it.
 *
 * 🔴 AC8: no id is ever a label on this page. It appears only behind *Copy id*.
 */
import { useEffect, useRef, useState } from 'preact/hooks';

import { api, encode, useSession } from '../api';
import { Chips, DangerAction, DangerZone, Drawer, EmptyState } from '../composers';
import { FieldControl, Raw, parseRaw, rawFrom } from '../fields';
import { Column, ago, displayValue, when } from '../format';
import { navigate } from '../router';
import { Btn, Check, Chip, Field, Gap, Hint, Notice, Page, Row, Spacer, Table, WriteBtn, confirmSimple, copyText, fail, openModal, toast } from '../ui';
import { AddFieldDialog } from './schema';
import type { ViewProps } from './index';

/** One person, as `GET /admin/users` answers. Custom fields ride along by name. */
export interface Person {
  objectId: string;
  username: string | null;
  email: string | null;
  emailVerified: boolean;
  disabled: boolean;
  createdAt?: unknown;
  roles: string[];
  sessions: number;
  lastSessionAt: string | null;
  hasPassword: boolean;
  [field: string]: unknown;
}

interface Identity {
  objectId: string;
  provider: string;
  displayName: string;
  email: string | null;
  lastLoginAt?: string;
}

type Status = '' | 'disabled' | 'unverified';

const PAGE = 50;

export function personName(p: { username?: unknown; email?: unknown }): string {
  if (typeof p.username === 'string' && p.username) return p.username;
  if (typeof p.email === 'string' && p.email) return p.email;
  return 'Someone with no name';
}

export function UsersView({ params }: ViewProps) {
  const { features } = useSession();
  const [data, setData] = useState<{ users: Person[]; total: number; columns: Column[] } | null>(null);
  const [roleNames, setRoleNames] = useState<string[]>([]);
  const [collections, setCollections] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [status, setStatus] = useState<Status>('');
  const [skip, setSkip] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const opened = params[0] || '';

  function load() {
    const q = new URLSearchParams({ limit: String(PAGE), skip: String(skip) });
    if (debounced.trim()) q.set('q', debounced.trim());
    if (status) q.set('status', status);
    api<{ users: Person[]; total: number; columns: Column[] }>('GET', '/admin/users?' + q.toString())
      .then(setData)
      .catch(fail);
  }
  function loadRoles() {
    if (!features.roles) return;
    api<{ roles?: Array<{ name: string }> }>('GET', '/admin/roles')
      .then((d) => setRoleNames((d.roles || []).map((r) => r.name)))
      .catch(() => setRoleNames([]));
  }

  useEffect(() => {
    loadRoles();
    api<{ tables?: Array<{ name: string }> }>('GET', '/admin/schema')
      .then((d) => setCollections((d.tables || []).map((t) => t.name)))
      .catch(() => setCollections([]));
  }, []);
  useEffect(load, [debounced, status, skip]);
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setSkip(0);
      setDebounced(search);
    }, 250);
  }, [search]);

  const columns = data ? data.columns : [];

  function addField() {
    openModal((close) => (
      <AddFieldDialog
        t={{ name: '_User', columns: (data ? data.columns : []).concat([{ name: 'username', type: 'String' }, { name: 'email', type: 'String' }]) }}
        names={collections}
        close={close}
        onAdded={load}
      />
    ));
  }

  const filtered = !!(debounced.trim() || status);
  const creating = opened === 'new' || opened === 'invite';

  return (
    <Page title="Users" subtitle="The people who can sign in to this backend.">
      <Row>
        <WriteBtn kind="primary" onClick={() => navigate('users', 'new')}>
          Add user
        </WriteBtn>
        {features.email ? <WriteBtn onClick={() => navigate('users', 'invite')}>Invite by email</WriteBtn> : null}
        <WriteBtn onClick={addField}>Add a field</WriteBtn>
        <Spacer />
        <input
          type="search"
          class="users-search"
          aria-label="Search people"
          placeholder="Search by name or email…"
          value={search}
          onInput={(e) => setSearch((e.currentTarget as HTMLInputElement).value)}
        />
        <select
          aria-label="Show"
          value={status}
          onChange={(e) => {
            setSkip(0);
            setStatus((e.currentTarget as HTMLSelectElement).value as Status);
          }}
        >
          <option value="">Everyone</option>
          <option value="disabled">Disabled</option>
          <option value="unverified">Email not verified</option>
        </select>
      </Row>
      <Gap />
      {data ? (
        <Table
          columns={['Person', 'Verified', 'Roles', 'Signed in', 'Joined'].concat(columns.map((c) => c.name))}
          rows={data.users}
          empty={
            filtered ? (
              <EmptyState icon="🔍">Nobody matches.</EmptyState>
            ) : (
              <EmptyState icon="👤" action={{ label: 'Add the first person', onClick: () => navigate('users', 'new') }}>
                No users yet. Add someone, or let people sign up from your app.
              </EmptyState>
            )
          }
          renderRow={(p) => (
            <tr key={p.objectId} class={'clickable' + (p.objectId === opened ? ' hit' : '') + (p.disabled ? ' revoked' : '')} onClick={() => navigate('users', p.objectId)}>
              <td>
                <div class="person">
                  <span class="avatar" aria-hidden="true">
                    {personName(p).charAt(0).toUpperCase()}
                  </span>
                  <span class="person-text">
                    <b>{personName(p)}</b>
                    {p.disabled ? (
                      <>
                        {' '}
                        <Chip kind="bad">disabled</Chip>
                      </>
                    ) : null}
                    {p.email && p.email !== p.username ? <span class="hint">{p.email}</span> : null}
                  </span>
                </div>
              </td>
              <td>{p.emailVerified ? <Chip kind="ok">verified</Chip> : p.email ? <Chip>not yet</Chip> : <span class="hint">no email</span>}</td>
              <td>
                {p.roles.map((r) => (
                  <Chip key={r} kind="accent">
                    {r}
                  </Chip>
                ))}
              </td>
              <td title={p.lastSessionAt ? 'Newest sign-in still active: ' + when(p.lastSessionAt) : undefined}>
                {p.sessions ? ago(p.lastSessionAt) + (p.sessions > 1 ? ' · ' + p.sessions + ' devices' : '') : <span class="hint">not signed in</span>}
              </td>
              <td title={when(p.createdAt)}>{ago(p.createdAt)}</td>
              {columns.map((c) => (
                <td key={c.name}>{displayValue(p[c.name], c.type)}</td>
              ))}
            </tr>
          )}
        />
      ) : null}
      {data && data.total > PAGE ? (
        <Row style="margin-top:8px">
          <Hint>
            {skip + 1}–{Math.min(skip + PAGE, data.total)} of {data.total}
          </Hint>
          <Btn tiny disabled={skip === 0} onClick={() => setSkip(Math.max(0, skip - PAGE))}>
            Previous
          </Btn>
          <Btn tiny disabled={skip + PAGE >= data.total} onClick={() => setSkip(skip + PAGE)}>
            Next
          </Btn>
        </Row>
      ) : null}
      {creating ? (
        <NewPersonDrawer
          key={opened}
          invite={opened === 'invite'}
          columns={columns}
          roleNames={roleNames}
          onClose={() => navigate('users')}
          onCreated={(id) => {
            load();
            navigate('users', id);
          }}
        />
      ) : opened ? (
        <PersonDrawer key={opened} id={opened} columns={columns} roleNames={roleNames} onChanged={load} onClose={() => navigate('users')} />
      ) : null}
    </Page>
  );
}

// ------------------------------------------------------------- helpers --

/** A password a person can read out: four groups of four, no look-alike characters. */
export function generatePassword(random: (n: number) => number = (n) => Math.floor(Math.random() * n)): string {
  const alphabet = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const groups: string[] = [];
  for (let g = 0; g < 4; g++) {
    let group = '';
    for (let i = 0; i < 4; i++) group += alphabet.charAt(random(alphabet.length));
    groups.push(group);
  }
  return groups.join('-');
}

function cryptoRandom(n: number): number {
  const c = typeof crypto !== 'undefined' ? crypto : null;
  if (c && c.getRandomValues) {
    const buf = new Uint32Array(1);
    c.getRandomValues(buf);
    return buf[0] % n;
  }
  return Math.floor(Math.random() * n);
}

/** The typed editors for a person's own fields. Values are raw until `readFields`. */
function FieldEditors({ columns, raw, onChange }: { columns: Column[]; raw: Record<string, Raw>; onChange: (name: string, value: Raw) => void }) {
  if (!columns.length) return null;
  return (
    <>
      {columns.map((c) => (
        <div class="field" key={c.name}>
          <span class="field-head">
            <b>{c.name}</b> <span class="chip type">{c.type}</span>
          </span>
          <FieldControl col={c} raw={raw[c.name] !== undefined ? raw[c.name] : rawFrom(c, undefined)} onChange={(v) => onChange(c.name, v)} />
        </div>
      ))}
    </>
  );
}

/** Raw editor state → the `properties` object, only for fields that changed. Throws a sentence. */
function readFields(columns: Column[], raw: Record<string, Raw>, before: Record<string, unknown> | null): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const c of columns) {
    if (raw[c.name] === undefined) continue;
    const value = parseRaw(c, raw[c.name]);
    if (before && JSON.stringify(rawFrom(c, before[c.name])) === JSON.stringify(raw[c.name])) continue;
    out[c.name] = value === undefined ? null : c.type === 'Date' ? { __type: 'Date', iso: value } : value;
  }
  return out;
}

// --------------------------------------------------------- new person --

function NewPersonDrawer({
  invite,
  columns,
  roleNames,
  onClose,
  onCreated
}: {
  invite: boolean;
  columns: Column[];
  roleNames: string[];
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const { features, whoami } = useSession();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [shown, setShown] = useState(false);
  const [roles, setRoles] = useState<string[]>([]);
  const [raw, setRaw] = useState<Record<string, Raw>>({});
  const [sendVerification, setSendVerification] = useState(false);
  const [magic, setMagic] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const owned = (whoami && whoami.accountColumns) || {};

  useEffect(() => {
    if (!invite) return;
    api<{ magicLink?: { enabled?: boolean } }>('GET', '/auth/providers')
      .then((d) => setMagic(!!(d.magicLink && d.magicLink.enabled)))
      .catch(() => setMagic(null));
  }, [invite]);

  const ready = !busy && username.trim() !== '' && (invite ? email.trim() !== '' && magic !== false : password !== '');

  function submit() {
    let properties: Record<string, unknown>;
    try {
      properties = readFields(columns, raw, null);
    } catch (e) {
      setError((e as Error).message);
      return;
    }
    setBusy(true);
    setError(null);
    const body: Record<string, unknown> = { username: username.trim(), email: email.trim() || undefined, roles, properties };
    if (invite) body.invite = true;
    else {
      body.password = password;
      body.sendVerification = sendVerification;
    }
    api<{ objectId: string; invited?: boolean; inviteError?: string; verificationSent?: boolean; verificationError?: string }>('POST', '/admin/users', body)
      .then((made) => {
        setBusy(false);
        if (invite && !made.invited) toast(personName(body) + ' was added, but the invitation did not go: ' + (made.inviteError || 'the mail failed.'), 'bad');
        else if (invite) toast('Invitation sent to ' + email.trim() + '.', 'ok');
        else if (sendVerification && made.verificationSent === false) toast('Added. The verification email did not go: ' + (made.verificationError || 'the mail failed.'), 'bad');
        else toast(personName(body) + ' added.', 'ok');
        onCreated(made.objectId);
      })
      .catch((e) => {
        setBusy(false);
        setError((e as Error).message);
      });
  }

  return (
    <Drawer
      title={invite ? 'Invite someone by email' : 'Add a user'}
      subtitle={invite ? 'They get a sign-in link and choose how to sign in from then on.' : undefined}
      onClose={onClose}
      footer={
        <>
          <Btn onClick={onClose}>Cancel</Btn>
          <WriteBtn kind="primary" disabled={!ready} onClick={submit}>
            {invite ? 'Send invitation' : 'Add user'}
          </WriteBtn>
        </>
      }
    >
      {invite && magic === false ? (
        <>
          <Notice kind="warn">
            An invitation is a magic sign-in link, and magic links are switched off on this backend.{' '}
            <a href="#/signin" onClick={() => navigate('signin')}>
              Turn them on under Sign-in
            </a>
            , then come back.
          </Notice>
          <Gap />
        </>
      ) : null}
      <div class="form-grid" onInput={() => setError(null)}>
        <Field label="Username">
          <input type="text" autoFocus placeholder="How they sign in — e.g. ann" value={username} onInput={(e) => setUsername((e.currentTarget as HTMLInputElement).value)} />
        </Field>
        <Field label={invite ? 'Email' : 'Email (optional)'}>
          <input type="email" placeholder="ann@example.com" value={email} onInput={(e) => setEmail((e.currentTarget as HTMLInputElement).value)} />
        </Field>
        {invite ? null : (
          <div class="field">
            <span class="field-head" title={owned.password}>
              <b>Password</b>
            </span>
            <Row>
              <input
                type={shown ? 'text' : 'password'}
                aria-label="Password"
                autoComplete="new-password"
                value={password}
                style="flex:1"
                onInput={(e) => setPassword((e.currentTarget as HTMLInputElement).value)}
              />
              <Btn
                tiny
                onClick={() => {
                  setPassword(generatePassword(cryptoRandom));
                  setShown(true);
                }}
              >
                Generate
              </Btn>
              <Btn tiny onClick={() => setShown(!shown)}>
                {shown ? 'Hide' : 'Show'}
              </Btn>
            </Row>
            <Hint>Stored hashed. Give it to them yourself — it is not emailed.</Hint>
          </div>
        )}
        {features.roles ? (
          <div class="field">
            <span class="field-head">
              <b>Roles</b>
            </span>
            <Chips
              items={roles}
              onChange={setRoles}
              suggest={(q) => Promise.resolve(roleNames.filter((r) => r.toLowerCase().indexOf(q.trim().toLowerCase()) !== -1))}
              placeholder={roleNames.length ? 'Add a role…' : 'No roles yet — make them on the Roles page'}
            />
          </div>
        ) : null}
        <FieldEditors columns={columns} raw={raw} onChange={(name, v) => setRaw({ ...raw, [name]: v })} />
        {!invite && features.email ? (
          <Check checked={sendVerification} disabled={!email.trim()} onChange={setSendVerification}>
            Send them an email to verify their address
          </Check>
        ) : null}
      </div>
      {error ? (
        <Notice kind="bad" style="margin-top:12px">
          {error}
        </Notice>
      ) : null}
    </Drawer>
  );
}

// ------------------------------------------------------------- a person --

function PersonDrawer({
  id,
  columns,
  roleNames,
  onChanged,
  onClose
}: {
  id: string;
  columns: Column[];
  roleNames: string[];
  onChanged: () => void;
  onClose: () => void;
}) {
  const { features, whoami } = useSession();
  const owned = (whoami && whoami.accountColumns) || {};
  const [person, setPerson] = useState<Person | null>(null);
  const [missing, setMissing] = useState(false);
  const [identities, setIdentities] = useState<Identity[] | null>(null);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [raw, setRaw] = useState<Record<string, Raw>>({});
  const [newPassword, setNewPassword] = useState('');
  const [shown, setShown] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function take(p: Person) {
    setPerson(p);
    setUsername(p.username || '');
    setEmail(p.email || '');
    const next: Record<string, Raw> = {};
    columns.forEach((c) => (next[c.name] = rawFrom(c, p[c.name])));
    setRaw(next);
  }
  function load() {
    api<{ user: Person }>('GET', '/admin/users/' + encode(id))
      .then((d) => take(d.user))
      .catch((e) => {
        if ((e as { status?: number }).status === 404) setMissing(true);
        else fail(e);
      });
    api<{ identities?: Identity[] }>('GET', '/admin/users/' + encode(id) + '/identities')
      .then((d) => setIdentities(d.identities || []))
      .catch(() => setIdentities([]));
  }
  useEffect(load, [id, columns.map((c) => c.name).join()]);

  /** One PUT; the answer is the person as they now are. */
  function put(body: Record<string, unknown>, done: string) {
    setBusy(true);
    return api<{ user: Person; sessionsRevoked: number }>('PUT', '/admin/users/' + encode(id), body)
      .then((r) => {
        setBusy(false);
        take(r.user);
        onChanged();
        toast(done + (r.sessionsRevoked ? ' Signed out of ' + r.sessionsRevoked + ' session' + (r.sessionsRevoked === 1 ? '' : 's') + '.' : ''), 'ok');
      })
      .catch((e) => {
        setBusy(false);
        setError((e as Error).message);
      });
  }

  if (missing) {
    return (
      <Drawer title="Nobody here" onClose={onClose}>
        <EmptyState icon="👤">This person is not on this backend any more.</EmptyState>
      </Drawer>
    );
  }
  if (!person) {
    return (
      <Drawer title="Loading…" onClose={onClose}>
        <Hint>Loading…</Hint>
      </Drawer>
    );
  }
  const name = personName(person);

  function saveDetails() {
    if (!person) return;
    let properties: Record<string, unknown>;
    try {
      properties = readFields(columns, raw, person);
    } catch (e) {
      setError((e as Error).message);
      return;
    }
    const body: Record<string, unknown> = {};
    if (username.trim() !== (person.username || '')) body.username = username.trim();
    if (email.trim() !== (person.email || '')) body.email = email.trim();
    if (Object.keys(properties).length) body.properties = properties;
    if (!Object.keys(body).length) {
      toast('Nothing has changed.', 'ok');
      return;
    }
    put(body, 'Saved.');
  }

  function setRoles(next: string[]) {
    if (!person) return;
    const added = next.filter((r) => person.roles.indexOf(r) === -1);
    const removed = person.roles.filter((r) => next.indexOf(r) === -1);
    const writes = added
      .map((r) => api('POST', '/admin/roles/' + encode(r) + '/users', { userId: id }))
      .concat(removed.map((r) => api('DELETE', '/admin/roles/' + encode(r) + '/users/' + encode(id))));
    Promise.all(writes)
      .then(() => {
        toast(added.length ? name + ' is now in ' + added.join(', ') + '.' : name + ' is no longer in ' + removed.join(', ') + '.', 'ok');
        load();
        onChanged();
      })
      .catch(fail);
  }

  function setDisabled(on: boolean) {
    if (on) {
      confirmSimple(
        'Disable sign-in for ' + name,
        name + ' is signed out everywhere and cannot sign in again — by password, sign-in link or provider — until you switch this back. Their account, records and roles stay as they are.',
        () => put({ disabled: true }, name + ' can no longer sign in.'),
        'Disable sign-in'
      );
    } else put({ disabled: false }, name + ' can sign in again.');
  }

  function signOutEverywhere() {
    confirmSimple(
      'Sign ' + name + ' out everywhere',
      'Every device ' + name + ' is signed in on is signed out. They can sign straight back in.',
      () =>
        api<{ sessionsRevoked: number }>('DELETE', '/admin/users/' + encode(id) + '/sessions')
          .then((r) => {
            toast('Signed out of ' + r.sessionsRevoked + ' session' + (r.sessionsRevoked === 1 ? '' : 's') + '.', 'ok');
            load();
            onChanged();
          })
          .catch(fail),
      'Sign out everywhere'
    );
  }

  function sendReset() {
    if (!person || !person.email) return;
    // Deliberately honest: this is the PUBLIC reset endpoint, which answers the
    // same whether or not the send succeeded (BAK-002 anti-enumeration).
    api('POST', '/requestPasswordReset', { email: person.email })
      .then(() => toast('A reset link was requested for ' + person.email + '. That endpoint answers the same whether or not the mail went; the Email page shows sends.', 'ok'))
      .catch(fail);
  }

  function deletePerson() {
    api<{ sessionsRevoked: number }>('DELETE', '/admin/users/' + encode(id))
      .then(() => {
        toast(name + ' deleted.', 'ok');
        onChanged();
        onClose();
      })
      .catch(fail);
  }

  return (
    <Drawer
      title={name}
      subtitle={person.email && person.email !== name ? person.email : undefined}
      wide
      onClose={onClose}
      footer={
        <>
          <Btn
            onClick={() =>
              copyText(person.objectId).then((ok) => toast(ok ? 'Id copied.' : 'The browser refused the clipboard.', ok ? 'ok' : 'bad'))
            }
          >
            Copy id
          </Btn>
          <Spacer />
          <Btn onClick={onClose}>Close</Btn>
        </>
      }
    >
      <div onInput={() => setError(null)}>
        {person.disabled ? (
          <>
            <Notice kind="bad">Sign-in is disabled for {name}.</Notice>
            <Gap />
          </>
        ) : null}

        <h3 class="drawer-section">Details</h3>
        <div class="form-grid">
          <Field label="Username">
            <input type="text" title={owned.username} value={username} onInput={(e) => setUsername((e.currentTarget as HTMLInputElement).value)} />
          </Field>
          <Field label="Email">
            <input type="email" title={owned.email} value={email} onInput={(e) => setEmail((e.currentTarget as HTMLInputElement).value)} />
          </Field>
          <FieldEditors columns={columns} raw={raw} onChange={(n, v) => setRaw({ ...raw, [n]: v })} />
        </div>
        <Row style="margin-top:8px">
          <WriteBtn kind="primary" disabled={busy} onClick={saveDetails}>
            Save details
          </WriteBtn>
          <span title={owned.emailVerified}>
            <Check checked={person.emailVerified} disabled={busy || !person.email} onChange={(on) => put({ emailVerified: on }, on ? 'Marked verified.' : 'Marked not verified.')}>
              Email verified
            </Check>
          </span>
        </Row>
        {error ? (
          <Notice kind="bad" style="margin-top:12px">
            {error}
          </Notice>
        ) : null}

        {features.roles ? (
          <>
            <h3 class="drawer-section">Roles</h3>
            <Chips
              id="person-roles"
              items={person.roles}
              onChange={setRoles}
              suggest={(q) => Promise.resolve(roleNames.filter((r) => r.toLowerCase().indexOf(q.trim().toLowerCase()) !== -1))}
              placeholder={roleNames.length ? 'Add a role…' : 'No roles yet — make them on the Roles page'}
            />
          </>
        ) : null}

        <h3 class="drawer-section">Sign-in</h3>
        <p class="sub">
          {person.hasPassword ? 'Signs in with a password' : 'No password'}
          {identities && identities.length ? ' and ' + identities.map((i) => i.displayName).join(', ') : ''}.
        </p>
        {identities && identities.length ? (
          <Table
            columns={['Signs in with', 'Address', 'Last used']}
            rows={identities}
            renderRow={(i) => (
              <tr key={i.objectId}>
                <td>{i.displayName}</td>
                <td>{i.email || ''}</td>
                <td title={when(i.lastLoginAt)}>{ago(i.lastLoginAt)}</td>
              </tr>
            )}
          />
        ) : null}
        <div class="field" style="margin-top:8px">
          <span class="field-head" title={owned.password}>
            <b>Set a new password</b>
          </span>
          <Row>
            <input
              type={shown ? 'text' : 'password'}
              aria-label="New password"
              autoComplete="new-password"
              value={newPassword}
              style="flex:1"
              onInput={(e) => setNewPassword((e.currentTarget as HTMLInputElement).value)}
            />
            <Btn
              tiny
              onClick={() => {
                setNewPassword(generatePassword(cryptoRandom));
                setShown(true);
              }}
            >
              Generate
            </Btn>
            <WriteBtn
              tiny
              kind="primary"
              disabled={busy || !newPassword}
              onClick={() => put({ password: newPassword }, 'Password changed.').then(() => setNewPassword(''))}
            >
              Set password
            </WriteBtn>
          </Row>
          <Hint>Setting one signs them out everywhere. Give it to them yourself — it is not emailed.</Hint>
        </div>
        {features.email && person.email ? (
          <Row style="margin-top:8px">
            <WriteBtn tiny onClick={sendReset}>
              Email them a reset link
            </WriteBtn>
          </Row>
        ) : null}

        <h3 class="drawer-section">Sessions</h3>
        <Row>
          <span>
            {person.sessions
              ? 'Signed in on ' + person.sessions + ' device' + (person.sessions === 1 ? '' : 's') + ' · newest ' + ago(person.lastSessionAt)
              : 'Not signed in anywhere.'}
          </span>
          <Spacer />
          <WriteBtn tiny disabled={!person.sessions} onClick={signOutEverywhere}>
            Sign out everywhere
          </WriteBtn>
        </Row>

        <h3 class="drawer-section">Status</h3>
        <span title={owned.disabled}>
          <Check checked={person.disabled} disabled={busy} onChange={setDisabled}>
            Disable sign-in
          </Check>
        </span>
        <Hint>Keeps the account, its records and roles. Signs them out, and refuses every way back in until switched off.</Hint>

        <Gap h={16} />
        <DangerZone>
          <DangerAction
            label="Delete user"
            why="Removes the account, signs them out everywhere and takes them out of every role. Records they made stay."
            title={'Delete ' + name}
            warning={'This removes ' + name + ' for good. To stop them signing in but keep the account, use Disable sign-in instead.'}
            expected={person.username || name}
            onConfirm={deletePerson}
          />
        </DangerZone>
      </div>
    </Drawer>
  );
}
