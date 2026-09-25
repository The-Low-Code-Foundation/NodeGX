/**
 * Roles — BMG-005. A role is a named group of people and a list of what it
 * unlocks, not a string other pages refer to.
 *
 * The list says who is in each role (a count and the first three names) and
 * where it is used; `#/roles/<name>` opens the role's drawer: its members with a
 * ✕ each, *Add people* by search or by email (several at once), *What <role>
 * can do* read from the stored permissions (`roleUses.ts`, shared with
 * BMG-006), and a danger zone whose warning counts the rules that stop matching.
 *
 * Memberships post a userId the picker chose; nothing here composes a
 * `role:<name>` string. 🔴 AC6: no id is ever rendered.
 */
import { useEffect, useState } from 'preact/hooks';

import { api, encode, useSession } from '../api';
import { DangerAction, DangerZone, Drawer, EmptyState, Picker } from '../composers';
import { ago, when } from '../format';
import { navigate } from '../router';
import { RoleConfig, RoleUse, roleUses, ruleCount, useCounts, useHref, useSentence } from '../roleUses';
import { Btn, Chip, Dialog, Field, Gap, Hint, Notice, Page, Row, Spacer, Table, WriteBtn, confirmSimple, fail, openModal, toast } from '../ui';
import { personName } from './users';
import type { ViewProps } from './index';

interface Role {
  name: string;
  description?: string;
  createdAt?: string;
  users?: string[];
  /** The first three members as a person reads them (server-side, BMG-005). */
  names?: string[];
}

interface Member {
  objectId: string;
  username: string | null;
  email: string | null;
  createdAt?: unknown;
  disabled?: boolean;
}

/** The server's rule, in words (`roles/RoleStore.ts` ROLE_NAME_PATTERN). */
const NAME_PATTERN = /^[a-zA-Z0-9_-]+$/;
const DESCRIPTION_MAX = 280;
const EMAIL = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;

/** Why a new role name cannot be used, in words, or null when it can. */
export function roleNameProblem(name: string, taken: string[]): string | null {
  const n = name.trim();
  if (!n) return null;
  const bad = Array.from(new Set(n.replace(/[a-zA-Z0-9_-]/g, '').split('')));
  if (bad.length) {
    const shown = bad.map((c) => (c === ' ' ? 'a space' : '“' + c + '”')).join(', ');
    return 'A role name cannot contain ' + shown + '. Use letters, digits, - and _.';
  }
  if (!NAME_PATTERN.test(n)) return 'Use letters, digits, - and _.';
  const same = taken.find((t) => t.toLowerCase() === n.toLowerCase());
  if (same) return 'There is already a role called ' + same + '.';
  return null;
}

/** "Ann, Bob and 3 more" — who is in a role, from the names the list carries. */
export function membersSentence(count: number, names: string[]): string {
  if (!count) return 'No one yet';
  const shown = names.slice(0, 3);
  const rest = count - shown.length;
  if (!shown.length) return count === 1 ? '1 person' : count + ' people';
  if (rest <= 0) return shown.length === 1 ? shown[0] : shown.slice(0, -1).join(', ') + ' and ' + shown[shown.length - 1];
  return shown.join(', ') + ' and ' + rest + ' more';
}

/** "2 collections · 1 function" — where the stored rules name a role. */
export function usedInSentence(uses: RoleUse[]): string {
  if (!uses.length) return 'Nothing yet';
  const c = useCounts(uses);
  const parts: string[] = [];
  if (c.defaults) parts.push('every collection by default');
  if (c.collections) parts.push(c.collections + (c.collections === 1 ? ' collection' : ' collections'));
  if (c.functions) parts.push(c.functions + (c.functions === 1 ? ' function' : ' functions'));
  if (c.other) parts.push(c.other + (c.other === 1 ? ' other rule' : ' other rules'));
  return parts.join(' · ');
}

export function RolesView({ params }: ViewProps) {
  const [roles, setRoles] = useState<Role[] | null>(null);
  const [config, setConfig] = useState<RoleConfig | null>(null);
  const opened = params[0] || '';

  function load() {
    api<{ roles?: Role[] }>('GET', '/admin/roles')
      .then((data) => setRoles(data.roles || []))
      .catch(fail);
    api<{ config?: RoleConfig }>('GET', '/admin/permissions')
      .then((data) => setConfig(data.config || {}))
      .catch(() => setConfig({}));
  }
  useEffect(load, []);

  function createRole() {
    openModal((close) => (
      <NewRoleDialog
        taken={(roles || []).map((r) => r.name)}
        close={close}
        onCreated={(name) => {
          load();
          navigate('roles', name);
        }}
      />
    ));
  }

  const role = roles && opened ? roles.find((r) => r.name === opened) || null : null;

  return (
    <Page title="Roles" subtitle="A role is a group of people. Permissions give a role something to do; everyone in it can then do that.">
      <Row>
        <WriteBtn kind="primary" onClick={createRole}>
          New role
        </WriteBtn>
        <Btn onClick={load}>Refresh</Btn>
      </Row>
      <Gap />
      {roles && opened && !role ? <Notice kind="warn">There is no role called {opened}. It may have been deleted.</Notice> : null}
      {roles ? (
        <Table
          columns={['Role', 'Members', 'Used in', 'Created']}
          rows={roles}
          empty={
            <EmptyState icon="👥" action={{ label: 'New role', onClick: createRole }}>
              No roles yet. A role groups people so a permission can name all of them at once.
            </EmptyState>
          }
          renderRow={(r) => {
            const members = (r.users || []).length;
            const names = r.names || [];
            return (
              <tr key={r.name} class={'clickable' + (r.name === opened ? ' hit' : '')} onClick={() => navigate('roles', r.name)}>
                <td>
                  <span class="person-text">
                    <b>{r.name}</b>
                    {r.description ? <span class="hint">{r.description}</span> : null}
                  </span>
                </td>
                <td>
                  <div class="person">
                    {names.length ? (
                      <span class="avatars" aria-hidden="true">
                        {names.map((n) => (
                          <span key={n} class="avatar">
                            {n.charAt(0).toUpperCase()}
                          </span>
                        ))}
                      </span>
                    ) : null}
                    <span class={members ? undefined : 'hint'}>
                      {members ? <b>{members}</b> : null}
                      {members ? ' · ' : null}
                      {membersSentence(members, names)}
                    </span>
                  </div>
                </td>
                <td class={config && !roleUses(config, r.name).length ? 'hint' : undefined}>{config ? usedInSentence(roleUses(config, r.name)) : ''}</td>
                <td title={when(r.createdAt)}>{r.createdAt ? ago(r.createdAt) : ''}</td>
              </tr>
            );
          }}
        />
      ) : null}
      {role ? <RoleDrawer key={role.name} role={role} config={config} onChanged={load} onClose={() => navigate('roles')} /> : null}
    </Page>
  );
}

// ---------------------------------------------------------------- new role --

function NewRoleDialog({ taken, close, onCreated }: { taken: string[]; close: () => void; onCreated: (name: string) => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const problem = roleNameProblem(name, taken);
  const ready = !busy && name.trim() !== '' && !problem;

  function create() {
    if (!ready) return;
    setBusy(true);
    api('POST', '/admin/roles', { name: name.trim(), description: description.trim() || undefined })
      .then(() => {
        close();
        toast('Role ' + name.trim() + ' created.', 'ok');
        onCreated(name.trim());
      })
      .catch((e) => {
        setBusy(false);
        fail(e);
      });
  }

  return (
    <Dialog
      title="New role"
      actions={
        <>
          <Btn onClick={close}>Cancel</Btn>
          <Btn kind="primary" disabled={!ready} onClick={create}>
            Create role
          </Btn>
        </>
      }
    >
      <Field label="Name">
        <input
          type="text"
          aria-label="Role name"
          placeholder="editors"
          value={name}
          aria-invalid={problem ? 'true' : undefined}
          onInput={(e) => setName((e.currentTarget as HTMLInputElement).value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') create();
          }}
        />
      </Field>
      {problem ? (
        <Notice kind="bad">{problem}</Notice>
      ) : (
        <Hint>Letters, digits, - and _. Permissions will name it, so pick the word you would say: editors, billing, support.</Hint>
      )}
      <Field label="What it is for (optional)">
        <input
          type="text"
          aria-label="What it is for"
          placeholder="People who can change the catalogue"
          maxLength={DESCRIPTION_MAX}
          value={description}
          onInput={(e) => setDescription((e.currentTarget as HTMLInputElement).value)}
        />
      </Field>
    </Dialog>
  );
}

// ----------------------------------------------------------------- drawer --

function RoleDrawer({ role, config, onChanged, onClose }: { role: Role; config: RoleConfig | null; onChanged: () => void; onClose: () => void }) {
  const { readonly, features } = useSession();
  const [members, setMembers] = useState<Member[] | null>(null);
  const [description, setDescription] = useState(role.description || '');
  const [bulk, setBulk] = useState('');
  const [bulkReport, setBulkReport] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [magic, setMagic] = useState<boolean | null>(null);
  const uses = roleUses(config, role.name);
  const rules = ruleCount(uses);
  const canInvite = !!features.email && magic === true;

  function loadMembers() {
    api<{ users: Member[] }>('GET', '/admin/users?limit=200&role=' + encode(role.name))
      .then((d) => setMembers(d.users || []))
      .catch(fail);
  }
  useEffect(loadMembers, [role.name]);
  useEffect(() => {
    if (!features.email) return;
    api<{ magicLink?: { enabled?: boolean } }>('GET', '/auth/providers')
      .then((d) => setMagic(!!(d.magicLink && d.magicLink.enabled)))
      .catch(() => setMagic(null));
  }, []);

  function changed() {
    loadMembers();
    onChanged();
  }

  const memberIds = (members || []).map((m) => m.objectId);

  async function findPeople(q: string): Promise<Member[]> {
    const d = await api<{ users?: Member[] }>('GET', '/admin/users?limit=20&q=' + encode(q.trim()));
    return (d.users || []).filter((u) => memberIds.indexOf(u.objectId) === -1);
  }

  function add(person: Member | null) {
    if (!person) return;
    api('POST', '/admin/roles/' + encode(role.name) + '/users', { userId: person.objectId })
      .then(() => {
        toast(personName(person) + ' added to ' + role.name + '.', 'ok');
        changed();
      })
      .catch(fail);
  }

  function remove(person: Member) {
    const who = personName(person);
    confirmSimple(
      'Remove ' + who + ' from ' + role.name + '?',
      'Their account stays. They stop being able to do what ' + role.name + ' can do.',
      () => {
        api('DELETE', '/admin/roles/' + encode(role.name) + '/users/' + encode(person.objectId))
          .then(() => {
            toast(who + ' removed from ' + role.name + '.', 'ok');
            changed();
          })
          .catch(fail);
      },
      'Remove'
    );
  }

  function saveDescription() {
    api('PUT', '/admin/roles/' + encode(role.name), { description: description.trim() })
      .then(() => {
        toast('Saved.', 'ok');
        onChanged();
      })
      .catch(fail);
  }

  /** Several addresses at once: members for the people who exist, invitations for the rest. */
  async function addByEmail(text: string) {
    const words = text.split(/[\s,;]+/).map((w) => w.trim()).filter(Boolean);
    if (!words.length) return;
    setBusy(true);
    const added: string[] = [];
    const already: string[] = [];
    const invited: string[] = [];
    const notEmail: string[] = [];
    const failed: string[] = [];
    const seen = new Set<string>();
    for (const word of words) {
      const email = word.toLowerCase();
      if (seen.has(email)) continue;
      seen.add(email);
      if (!EMAIL.test(email)) {
        notEmail.push(word);
        continue;
      }
      try {
        const d = await api<{ users?: Member[] }>('GET', '/admin/users?limit=20&q=' + encode(email));
        const person = (d.users || []).find((u) => (u.email || '').toLowerCase() === email);
        if (person) {
          if (memberIds.indexOf(person.objectId) !== -1) already.push(personName(person));
          else {
            await api('POST', '/admin/roles/' + encode(role.name) + '/users', { userId: person.objectId });
            added.push(personName(person));
          }
        } else if (!canInvite) {
          failed.push(word + ' (no one has that address, and invitations are off)');
        } else {
          const made = await api<{ invited?: boolean; inviteError?: string }>('POST', '/admin/users', { username: email, email, invite: true, roles: [role.name] });
          if (made.invited) invited.push(email);
          else failed.push(word + ' (added, but the invitation did not go: ' + (made.inviteError || 'the mail failed') + ')');
        }
      } catch (e) {
        failed.push(word + ' (' + (e as Error).message + ')');
      }
    }
    setBusy(false);
    const report: string[] = [];
    const head: string[] = [];
    head.push(added.length + ' added');
    if (canInvite || invited.length) head.push(invited.length + ' invited');
    report.push(head.join(', ') + '.');
    if (already.length) report.push('Already in ' + role.name + ': ' + already.join(', ') + '.');
    if (notEmail.length) report.push('Not an email address: ' + notEmail.join(', ') + '.');
    for (const f of failed) report.push('Not added: ' + f + '.');
    setBulkReport(report);
    if (!failed.length && !notEmail.length) setBulk('');
    toast(report[0], failed.length ? 'bad' : 'ok');
    changed();
  }

  const peopleWord = (n: number) => (n === 1 ? '1 person' : n + ' people');
  const deleteWarning =
    (rules
      ? rules + (rules === 1 ? ' rule names ' : ' rules name ') + role.name + ' (' + uses.map(useSentence).join('; ') + ') and will stop matching anyone.'
      : 'No rule names ' + role.name + ', so deleting it changes no permission.') +
    ' ' +
    (members && members.length ? peopleWord(members.length) + ' will no longer be in it; their accounts stay.' : 'No one is in it.');

  return (
    <Drawer title={role.name} subtitle={role.description || 'A role'} onClose={onClose} wide>
      <div class="drawer-section">Members{members ? ' (' + members.length + ')' : ''}</div>
      {members ? (
        <Table
          class="members-table"
          columns={['Person', 'Email', 'Joined', '']}
          rows={members}
          empty={<EmptyState icon="👤">No one is in {role.name} yet.</EmptyState>}
          renderRow={(m) => (
            <tr key={m.objectId} data-member={personName(m)}>
              <td>
                <div class="person">
                  <span class="avatar" aria-hidden="true">
                    {personName(m).charAt(0).toUpperCase()}
                  </span>
                  <b>{personName(m)}</b>
                  {m.disabled ? <Chip kind="bad">disabled</Chip> : null}
                </div>
              </td>
              <td>{m.email || <span class="hint">no email</span>}</td>
              <td title={when(m.createdAt)}>{ago(m.createdAt)}</td>
              <td>
                {readonly ? null : (
                  <button type="button" class="chip-x" aria-label={'Remove ' + personName(m) + ' from ' + role.name} onClick={() => remove(m)}>
                    ✕
                  </button>
                )}
              </td>
            </tr>
          )}
        />
      ) : null}

      {readonly ? null : (
        <>
          <Field label="Add people">
            <Picker<Member>
              id="role-add-person"
              fetch={findPeople}
              label={personName}
              detail={(u) => (u.email && u.email !== u.username ? u.email : '')}
              keyOf={(u) => u.objectId}
              value={null}
              openOnFocus={false}
              onPick={add}
              placeholder="Type a name or an email…"
              emptyText="No one else matches."
              onCreate={canInvite ? addByEmail : undefined}
              createWhen={(q) => EMAIL.test(q.toLowerCase())}
              createLabel={(q) => 'Invite ' + q + ' to ' + role.name + ' by email'}
            />
          </Field>
          <Field label="Add several by email">
            <textarea
              aria-label="Email addresses"
              rows={3}
              placeholder={'ann@example.com, bob@example.com\n(one per line, or separated by commas)'}
              value={bulk}
              onInput={(e) => setBulk((e.currentTarget as HTMLTextAreaElement).value)}
            />
          </Field>
          <Row>
            <WriteBtn tiny disabled={busy || !bulk.trim()} onClick={() => addByEmail(bulk)}>
              {busy ? 'Adding…' : 'Add them'}
            </WriteBtn>
            <Hint>
              {canInvite
                ? 'Someone with an account is added. Anyone else is sent an invitation and joins ' + role.name + ' when the account is made.'
                : features.email
                  ? 'Someone with an account is added. Invitations are off: turn on sign-in links under Sign-in to invite people who have no account.'
                  : 'Someone with an account is added. Email is not set up, so people without an account cannot be invited.'}
            </Hint>
          </Row>
          {bulkReport ? (
            <Notice kind={bulkReport.length > 1 && bulkReport.some((l) => l.indexOf('Not ') === 0) ? 'warn' : ''} style="margin-top:8px">
              <span class="bulk-report">
                {bulkReport.map((line) => (
                  <span key={line}>{line}</span>
                ))}
              </span>
            </Notice>
          ) : null}
        </>
      )}

      <div class="drawer-section">What {role.name} can do</div>
      {config ? (
        uses.length ? (
          <ul class="role-uses">
            {uses.map((u) => (
              <li key={u.kind + ':' + (u.name || '')}>
                <a href={useHref(u)}>{useSentence(u)}</a>
              </li>
            ))}
          </ul>
        ) : (
          <p class="hint">
            Nothing yet — <a href="#/permissions">give {role.name} something in Permissions →</a>
          </p>
        )
      ) : null}
      <Hint>A record can also be shared with {role.name} on its own (Collections → a record → Who can see this); those are not counted here.</Hint>

      <div class="drawer-section">About</div>
      <Field label="What it is for">
        <input
          type="text"
          aria-label="What it is for"
          maxLength={DESCRIPTION_MAX}
          disabled={readonly}
          value={description}
          placeholder="Say who belongs here"
          onInput={(e) => setDescription((e.currentTarget as HTMLInputElement).value)}
        />
      </Field>
      <Row>
        <WriteBtn tiny disabled={description.trim() === (role.description || '')} onClick={saveDescription}>
          Save
        </WriteBtn>
        <Spacer />
        <Hint>Created {when(role.createdAt)}</Hint>
      </Row>

      <DangerZone>
        <DangerAction
          label="Delete role"
          why={deleteWarning}
          title={'Delete ' + role.name}
          warning={deleteWarning}
          expected={role.name}
          onConfirm={() => {
            api('DELETE', '/admin/roles/' + encode(role.name))
              .then(() => {
                toast('Role ' + role.name + ' deleted.', 'ok');
                onChanged();
                navigate('roles');
              })
              .catch(fail);
          }}
        />
      </DangerZone>
    </Drawer>
  );
}
