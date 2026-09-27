/**
 * `AclCard` — "Who can see this record" (BMG-002 §3.4). A card, not a field:
 * Everyone, then one row per role and per person, each with read ☐ write ☐.
 * *Everyone* (no ACL) and *No one* (grants nothing) are states the card says
 * in words. The model and its rules are `acl.ts`.
 */
import { useEffect, useState } from 'preact/hooks';

import { AclRow, AclState, EVERYONE, addRow, grantsNobody, isRole, removeRow, restrict, roleName, setRow } from '../acl';
import { api, encode } from '../api';
import { userLabel } from '../format';
import { Picker } from './Picker';

interface Person {
  objectId: string;
  username?: string;
  email?: string;
}

export interface AclCardProps {
  state: AclState;
  onChange: (state: AclState) => void;
  disabled?: boolean;
  /** Where the collection's own rules are, for the link under the card. */
  collection?: string;
}

async function findRoles(q: string): Promise<string[]> {
  const d = await api<{ roles?: Array<{ name: string }> }>('GET', '/admin/roles');
  const needle = q.trim().toLowerCase();
  return (d.roles || []).map((r) => r.name).filter((n) => !needle || n.toLowerCase().includes(needle));
}

async function findPeople(q: string): Promise<Person[]> {
  const d = await api<{ users?: Person[] }>('GET', '/admin/users?limit=20&q=' + encode(q.trim()));
  return d.users || [];
}

export function AclCard({ state, onChange, disabled, collection }: AclCardProps) {
  const [names, setNames] = useState<Record<string, string>>({});
  const people = state.mode === 'rows' ? state.rows.filter((r) => r.key !== EVERYONE && !isRole(r.key)).map((r) => r.key) : [];

  // A person row says who, never an id: look up the ones not yet named.
  useEffect(() => {
    people
      .filter((id) => !names[id])
      .forEach((id) =>
        api<Person>('GET', '/admin/users/' + encode(id))
          .then((u) => setNames((n) => ({ ...n, [id]: userLabel(u) })))
          .catch(() => setNames((n) => ({ ...n, [id]: 'a person who no longer exists' })))
      );
  }, [people.join(',')]);

  const footer = collection ? (
    <a class="acl-more" href={'#/permissions/' + encode(collection)}>
      This collection’s permissions also apply →
    </a>
  ) : null;

  if (state.mode === 'public') {
    return (
      <div class="acl-card">
        <div class="acl-state">
          <b>Everyone</b>
          <span class="hint">This record has no restrictions of its own: whoever the collection’s permissions let in can see and change it.</span>
        </div>
        {disabled ? null : (
          <button type="button" class="btn tiny" onClick={() => onChange(restrict())}>
            Restrict who can see this
          </button>
        )}
        {footer}
      </div>
    );
  }

  const who = (row: AclRow) => (row.key === EVERYONE ? 'Everyone' : isRole(row.key) ? roleName(row.key) : names[row.key] || '…');
  const kind = (row: AclRow) => (row.key === EVERYONE ? '' : isRole(row.key) ? 'role' : 'person');

  return (
    <div class="acl-card">
      {grantsNobody(state) ? (
        <div class="acl-state">
          <b>No one</b>
          <span class="hint">Nothing is granted, so only the admin credential can see or change this record.</span>
        </div>
      ) : null}
      <table class="acl-table">
        <thead>
          <tr>
            <th>Who</th>
            <th>Can see</th>
            <th>Can change</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {state.rows.map((row) => (
            <tr key={row.key} data-acl-key={row.key === EVERYONE ? 'everyone' : kind(row)}>
              <td>
                {who(row)} {kind(row) ? <span class="chip type">{kind(row)}</span> : null}
              </td>
              <td>
                <input type="checkbox" aria-label={who(row) + ' can see'} checked={row.read} disabled={disabled} onChange={(e) => onChange(setRow(state, row.key, { read: (e.currentTarget as HTMLInputElement).checked }))} />
              </td>
              <td>
                <input type="checkbox" aria-label={who(row) + ' can change'} checked={row.write} disabled={disabled} onChange={(e) => onChange(setRow(state, row.key, { write: (e.currentTarget as HTMLInputElement).checked }))} />
              </td>
              <td>
                {row.key === EVERYONE || disabled ? null : (
                  <button type="button" class="chip-x" aria-label={'Remove ' + who(row)} onClick={() => onChange(removeRow(state, row.key))}>
                    ✕
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <span class="hint">“Signed-in users” is not something a record can name: a record grants everyone, a role, or a person.</span>
      {disabled ? null : (
        <div class="acl-add">
          <Picker<string>
            fetch={(q) => findRoles(q).then((r) => r.filter((n) => !state.rows.some((row) => row.key === 'role:' + n)))}
            label={(n) => n}
            keyOf={(n) => n}
            value={null}
            placeholder="Add a role…"
            emptyText="No other role matches."
            onPick={(n) => n && onChange(addRow(state, 'role:' + n))}
          />
          <Picker<Person>
            fetch={(q) => findPeople(q).then((p) => p.filter((u) => !state.rows.some((row) => row.key === u.objectId)))}
            label={(u) => userLabel(u)}
            keyOf={(u) => u.objectId}
            value={null}
            placeholder="Add a person…"
            emptyText="No other person matches."
            onPick={(u) => {
              if (!u) return;
              setNames((n) => ({ ...n, [u.objectId]: userLabel(u) }));
              onChange(addRow(state, u.objectId));
            }}
          />
          <button type="button" class="btn tiny" onClick={() => onChange({ mode: 'public' })}>
            Remove the restrictions
          </button>
        </div>
      )}
      {footer}
    </div>
  );
}
