/**
 * Roles — flat roles; permissions reference them as "role:<name>". Ported
 * as-is from the vanilla page (BMG-001 §3.1); `#/roles/<name>` marks that row
 * and scrolls to it once.
 */
import { useEffect, useRef, useState } from 'preact/hooks';

import { api, encode } from '../api';
import { EmptyState } from '../composers';
import { ActionCell, Btn, Dialog, Gap, Page, Row, Table, WriteBtn, confirmDestructive, fail, openModal, toast } from '../ui';
import type { ViewProps } from './index';

interface Role {
  name: string;
  users?: string[];
}

interface User {
  objectId: string;
  username?: unknown;
}

export function RolesView({ params }: ViewProps) {
  const [roles, setRoles] = useState<Role[] | null>(null);
  const wanted = params[0] || '';
  const scrolled = useRef(false);

  function load() {
    api<{ roles?: Role[] }>('GET', '/admin/roles')
      .then((data) => setRoles(data.roles || []))
      .catch(fail);
  }
  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!roles || !wanted || scrolled.current) return;
    const row = document.getElementById('role-' + wanted);
    if (row) {
      scrolled.current = true;
      row.scrollIntoView({ block: 'center' });
    }
  }, [roles, wanted]);

  function createRole() {
    openModal((close) => <NewRoleDialog close={close} onCreated={load} />);
  }

  function addMember(role: Role) {
    openModal((close) => <AddMemberDialog role={role} close={close} onAdded={load} />);
  }

  function deleteRole(r: Role) {
    confirmDestructive('Delete role', 'Rules that name "role:' + r.name + '" will stop matching anyone.', r.name, () => {
      api('DELETE', '/admin/roles/' + encode(r.name))
        .then(() => {
          toast('Role deleted.', 'ok');
          load();
        })
        .catch(fail);
    });
  }

  return (
    <Page title="Roles" subtitle='Flat roles. Permissions reference them as "role:<name>".'>
      <Row>
        <WriteBtn kind="primary" onClick={createRole}>
          New role
        </WriteBtn>
        <Btn onClick={load}>Refresh</Btn>
      </Row>
      <Gap />
      {roles ? (
        <Table
          columns={['Role', 'Members', '']}
          rows={roles}
          empty={
            <EmptyState action={{ label: 'New role', onClick: createRole }}>No roles yet. A role groups users so a permission can name them.</EmptyState>
          }
          renderRow={(r) => (
            <tr key={r.name} id={'role-' + r.name} class={r.name === wanted ? 'hit' : undefined}>
              <td>{r.name}</td>
              <td>{(r.users || []).join(', ')}</td>
              <ActionCell>
                <WriteBtn tiny onClick={() => addMember(r)}>
                  Add member
                </WriteBtn>
                <WriteBtn tiny kind="danger" onClick={() => deleteRole(r)}>
                  Delete
                </WriteBtn>
              </ActionCell>
            </tr>
          )}
        />
      ) : null}
    </Page>
  );
}

function NewRoleDialog({ close, onCreated }: { close: () => void; onCreated: () => void }) {
  const [name, setName] = useState('');
  function create() {
    api('POST', '/admin/roles', { name: name.trim() })
      .then(() => {
        close();
        toast('Role created.', 'ok');
        onCreated();
      })
      .catch(fail);
  }
  return (
    <Dialog
      title="New role"
      actions={
        <>
          <Btn onClick={close}>Cancel</Btn>
          <Btn kind="primary" onClick={create}>
            Create
          </Btn>
        </>
      }
    >
      <input type="text" placeholder="role-name" style="width:100%" value={name} onInput={(e) => setName((e.currentTarget as HTMLInputElement).value)} />
    </Dialog>
  );
}

function AddMemberDialog({ role, close, onAdded }: { role: Role; close: () => void; onAdded: () => void }) {
  const [users, setUsers] = useState<User[]>([]);
  const [userId, setUserId] = useState('');
  useEffect(() => {
    api<{ results?: User[] }>('GET', '/api/_User?limit=200')
      .then((data) => {
        const list = data.results || [];
        setUsers(list);
        // A native select answers with its first option; the state says the same.
        if (list.length) setUserId((current) => current || list[0].objectId);
      })
      .catch(fail);
  }, []);
  function add() {
    api('POST', '/admin/roles/' + encode(role.name) + '/users', { userId })
      .then(() => {
        close();
        toast('Member added.', 'ok');
        onAdded();
      })
      .catch(fail);
  }
  return (
    <Dialog
      title={'Add a member to ' + role.name}
      actions={
        <>
          <Btn onClick={close}>Cancel</Btn>
          <Btn kind="primary" onClick={add}>
            Add
          </Btn>
        </>
      }
    >
      <select style="width:100%" value={userId} onChange={(e) => setUserId((e.currentTarget as HTMLSelectElement).value)}>
        {users.map((u) => (
          <option key={u.objectId} value={u.objectId}>
            {(u.username ? String(u.username) : '(no username)') + ' — ' + u.objectId}
          </option>
        ))}
      </select>
    </Dialog>
  );
}
