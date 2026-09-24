/**
 * Users — the _User collection, plus the account actions the backend actually
 * implements. Ported as-is from the vanilla page (BMG-001 §3.1); `#/users/<id>`
 * marks that row and scrolls to it once.
 */
import { useEffect, useRef, useState } from 'preact/hooks';

import { api, encode, useSession } from '../api';
import { EmptyState } from '../composers';
import { cellText, when } from '../format';
import { ActionCell, Btn, Chip, Dialog, Gap, Page, Row, Table, WriteBtn, confirmDestructive, fail, openModal, toast } from '../ui';
import type { ViewProps } from './index';

interface User {
  objectId: string;
  username?: unknown;
  email?: unknown;
  emailVerified?: boolean;
  createdAt?: unknown;
}

interface Role {
  name: string;
  users?: string[];
}

export function UsersView({ params }: ViewProps) {
  const { features } = useSession();
  const [users, setUsers] = useState<User[] | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const wanted = params[0] || '';
  const scrolled = useRef(false);

  function load() {
    Promise.all([
      api<{ results?: User[] }>('GET', '/api/_User?limit=200&count=1'),
      features.roles ? api<{ roles?: Role[] }>('GET', '/admin/roles').catch(() => ({ roles: [] as Role[] })) : Promise.resolve({ roles: [] as Role[] })
    ])
      .then(([u, r]) => {
        setUsers(u.results || []);
        setRoles(r.roles || []);
      })
      .catch(fail);
  }
  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!users || !wanted || scrolled.current) return;
    const row = document.getElementById('user-' + wanted);
    if (row) {
      scrolled.current = true;
      row.scrollIntoView({ block: 'center' });
    }
  }, [users, wanted]);

  function createUser() {
    openModal((close) => <NewUserDialog close={close} onCreated={load} />);
  }

  function sendReset(user: User) {
    if (!user.email) return fail(new Error('This user has no email address, so a reset link cannot be sent.'));
    // Deliberately honest: this is the PUBLIC reset endpoint, which is
    // uniform by design (BAK-002 anti-enumeration). It cannot tell us
    // whether the mail actually went out.
    api('POST', '/requestPasswordReset', { email: user.email })
      .then(() => {
        toast(
          'Password-reset requested for ' +
            user.email +
            '.\nThat endpoint answers identically whether or not the send succeeded ' +
            '(anti-enumeration); check the Email section and the service log to confirm delivery.',
          'ok'
        );
      })
      .catch(fail);
  }

  function deleteUser(u: User) {
    confirmDestructive(
      'Delete user',
      'Deleting ' + (u.username || u.objectId) + ' removes the account. Existing sessions are NOT revoked by this action.',
      String(u.objectId),
      () => {
        api('DELETE', '/api/_User/' + encode(u.objectId))
          .then(() => {
            toast('User deleted.', 'ok');
            load();
          })
          .catch(fail);
      }
    );
  }

  return (
    <Page title="Users" subtitle="The _User collection, plus the account actions the backend actually implements.">
      <Row>
        <WriteBtn kind="primary" onClick={createUser}>
          New user
        </WriteBtn>
        <Btn onClick={load}>Refresh</Btn>
      </Row>
      <Gap />
      {users ? (
        <Table
          columns={['objectId', 'username', 'email', 'verified', 'roles', 'created', '']}
          rows={users}
          empty={<EmptyState action={{ label: 'New user', onClick: createUser }}>No users yet.</EmptyState>}
          renderRow={(u) => {
            const memberships = roles.filter((r) => (r.users || []).indexOf(u.objectId) !== -1).map((r) => r.name);
            const hit = u.objectId === wanted;
            return (
              <tr key={u.objectId} id={'user-' + u.objectId} class={hit ? 'hit' : undefined}>
                <td>{u.objectId}</td>
                <td>{cellText(u.username)}</td>
                <td>{cellText(u.email)}</td>
                <td>{u.emailVerified ? <Chip kind="ok">yes</Chip> : <Chip>no</Chip>}</td>
                <td>{memberships.join(', ')}</td>
                <td>{when(u.createdAt)}</td>
                <ActionCell>
                  {features.email ? (
                    <WriteBtn tiny onClick={() => sendReset(u)}>
                      Send reset
                    </WriteBtn>
                  ) : null}
                  <WriteBtn tiny kind="danger" onClick={() => deleteUser(u)}>
                    Delete
                  </WriteBtn>
                </ActionCell>
              </tr>
            );
          }}
        />
      ) : null}
    </Page>
  );
}

function NewUserDialog({ close, onCreated }: { close: () => void; onCreated: () => void }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  function create() {
    api('POST', '/users', { username, email, password })
      .then(() => {
        close();
        toast('User created.', 'ok');
        onCreated();
      })
      .catch(fail);
  }
  return (
    <Dialog
      title="New user"
      actions={
        <>
          <Btn onClick={close}>Cancel</Btn>
          <Btn kind="primary" onClick={create}>
            Create
          </Btn>
        </>
      }
    >
      <div class="grid2">
        <label class="field">
          Username
          <input type="text" placeholder="username" value={username} onInput={(e) => setUsername((e.currentTarget as HTMLInputElement).value)} />
        </label>
        <label class="field">
          Email
          <input type="email" placeholder="email" value={email} onInput={(e) => setEmail((e.currentTarget as HTMLInputElement).value)} />
        </label>
        <label class="field">
          Password
          <input type="password" placeholder="password" value={password} onInput={(e) => setPassword((e.currentTarget as HTMLInputElement).value)} />
        </label>
      </div>
    </Dialog>
  );
}
