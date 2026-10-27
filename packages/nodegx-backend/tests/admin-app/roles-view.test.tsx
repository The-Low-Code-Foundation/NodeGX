/**
 * BMG-005 — the Roles page's words: a new name refused in a sentence before it
 * is sent, who is in a role, and where a role is used.
 */
import { click, mount, settle, unmount } from './dom';

import { RolesView, membersSentence, missingRolesSentence, roleNameProblem, usedInSentence } from '../../src/admin/app/views/roles';
import { namedRoles, roleUses } from '../../src/admin/app/roleUses';
import { session } from '../../src/admin/app/api';

describe('Roles page words (BMG-005)', () => {
  it('a new role name is checked as it is typed, in words, against the server’s own rule', () => {
    expect(roleNameProblem('', [])).toBeNull();
    expect(roleNameProblem('editors', [])).toBeNull();
    expect(roleNameProblem('night-shift_2', [])).toBeNull();
    expect(roleNameProblem('night shift', [])).toBe('A role name cannot contain a space. Use letters, digits, - and _.');
    expect(roleNameProblem('role:admin', [])).toBe('A role name cannot contain “:”. Use letters, digits, - and _.');
    expect(roleNameProblem('a,b c', [])).toBe('A role name cannot contain “,”, a space. Use letters, digits, - and _.');
    expect(roleNameProblem('Editors', ['editors'])).toBe('There is already a role called editors.');
  });

  it('says who is in a role from the first three names', () => {
    expect(membersSentence(0, [])).toBe('No one yet');
    expect(membersSentence(1, ['ann'])).toBe('ann');
    expect(membersSentence(2, ['ann', 'bob'])).toBe('ann and bob');
    expect(membersSentence(3, ['ann', 'bob', 'cat'])).toBe('ann, bob and cat');
    expect(membersSentence(5, ['ann', 'bob', 'cat'])).toBe('ann, bob, cat and 2 more');
    expect(membersSentence(2, [])).toBe('2 people');
  });

  it('says where a role is used, the defaults as their own words', () => {
    expect(usedInSentence([])).toBe('Nothing yet');
    const config = {
      defaults: { permissions: { update: 'role:editors' } },
      collections: { Pet: { permissions: { create: 'role:editors' } }, Order: { permissions: { find: ['role:editors'] } } },
      functions: { sendInvoice: { call: 'role:editors' } },
      files: { upload: 'role:editors' }
    };
    expect(usedInSentence(roleUses(config, 'editors'))).toBe('every collection by default · 2 collections · 1 function · 1 other rule');
    expect(usedInSentence(roleUses({ collections: { Pet: { permissions: { get: 'role:vets' } } } }, 'vets'))).toBe('1 collection');
  });
});

/**
 * P127-BKO006-ROLESNOTINFILES — a server started from the project's files carries the rules that name `role:staff`
 * but not the role (who belongs to a group is data). The Roles page said "No roles yet" and nothing about staff.
 */
describe('a role the permissions name and this backend lacks (P127-BKO006-ROLESNOTINFILES)', () => {
  const config = {
    defaults: { permissions: { find: 'authenticated', delete: 'nobody' } },
    collections: { Job: { permissions: { update: ['role:staff', 'creator'] } } },
    functions: { closeJob: { call: 'role:staff' }, weekly: { call: 'role:managers' } },
    files: { upload: 'authenticated' },
    signup: 'public'
  };

  it('every role the stored rules name, once each, sorted; the other rule words are not roles', () => {
    expect(namedRoles(config)).toEqual(['managers', 'staff']);
    expect(namedRoles({ signup: 'public', defaults: { permissions: { find: 'role:' } } })).toEqual([]);
    expect(namedRoles(null)).toEqual([]);
  });

  it('says it in words, one role and several', () => {
    expect(missingRolesSentence(['staff'])).toBe(
      'A permission names the role staff, and this backend does not have it yet. No one can be put in it until it is made.'
    );
    expect(missingRolesSentence(['managers', 'staff'])).toBe(
      'Permissions name the roles managers and staff, and this backend does not have them yet. No one can be put in them until they are made.'
    );
  });

  async function page(roles: Array<{ name: string }>) {
    const calls: string[] = [];
    const realFetch = globalThis.fetch;
    globalThis.fetch = (async (url: string, init?: RequestInit) => {
      calls.push((init && init.method) + ' ' + url + (init && init.body ? ' ' + init.body : ''));
      const body: unknown =
        url === '/admin/roles' && (!init || !init.method || init.method === 'GET')
          ? { roles }
          : url === '/admin/roles'
            ? { objectId: 'r1', name: 'staff' }
            : url === '/admin/permissions'
              ? { config }
              : undefined;
      return { status: body ? (init && init.method === 'POST' ? 201 : 200) : 404, json: async () => body || { error: 'no such route' } } as Response;
    }) as typeof fetch;
    session.set({ credential: { kind: 'token', value: 't' }, readonly: false });
    const root = mount(<RolesView params={[]} />);
    for (let i = 0; i < 20 && !root.querySelector('table, .empty-state, #roles-missing'); i++) await settle(20);
    await settle(20);
    return { root, calls, done: () => (unmount(root), (globalThis.fetch = realFetch)) };
  }

  it('a backend with none of them: the page names both, and Make staff makes it', async () => {
    const { root, calls, done } = await page([]);
    expect(root.querySelector('#roles-missing')!.textContent).toBe(missingRolesSentence(['managers', 'staff']));
    click(root.querySelector('[data-make-role="staff"]')!);
    await settle(20);
    expect(calls).toContain('POST /admin/roles {"name":"staff"}');
    done();
  });

  it('(control) a backend that has both: the roles are listed and the page says nothing is missing', async () => {
    const { root, done } = await page([{ name: 'managers' }, { name: 'staff' }]);
    for (let i = 0; i < 20 && !root.querySelector('table'); i++) await settle(20);
    expect(root.textContent).toContain('staff');
    expect(root.querySelector('table')).not.toBeNull();
    expect(root.querySelector('#roles-missing')).toBeNull();
    done();
  });
});
