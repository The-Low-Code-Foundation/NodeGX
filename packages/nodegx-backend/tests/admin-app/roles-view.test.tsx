/**
 * BMG-005 — the Roles page's words: a new name refused in a sentence before it
 * is sent, who is in a role, and where a role is used.
 */
import './dom';

import { membersSentence, roleNameProblem, usedInSentence } from '../../src/admin/app/views/roles';
import { roleUses } from '../../src/admin/app/roleUses';

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
