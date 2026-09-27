/**
 * BMG-006 — the Permissions page's model and matrix.
 *
 * AC1 what a tick stores · AC2 the exclusions (*No one* exclusive, *Everyone*
 * implies the rest) · AC3 every template's config, table-driven · the ported
 * vocabulary validated against the backend model (never a twin) · AC6 no `_`
 * table drawn · AC7 no text input on the page takes a rule.
 */
import { mount, unmount, q, qa, change, text, settle } from './dom';

import { validateRuleValue, ruleAllows, Principal } from '../../src/security/model';
import { parseRule, selectionToRule, withNobody, withRole, withSignedIn, withAnyone } from '../../src/admin/app/ruleVocabulary';
import {
  CLP_OPS,
  ClpOp,
  OP_ROWS,
  TEMPLATES,
  TemplateId,
  audienceWords,
  cellState,
  draftFrom,
  entryFromDraft,
  entrySummary,
  functionChips,
  idempotencyChoice,
  idempotencyValue,
  matrixFrom,
  matrixRules,
  rolesNamed,
  rulesFrom,
  templateEntry,
  toggleCell,
  verdictSentence,
  visibleCollections
} from '../../src/admin/app/permissionsModel';
import { useHref } from '../../src/admin/app/roleUses';
import { PermissionsView } from '../../src/admin/app/views/permissions';
import { session } from '../../src/admin/app/api';

const OPS = CLP_OPS as unknown as ClpOp[];

describe('BMG-006 the matrix stores what was ticked (AC1, AC2)', () => {
  it('AC1: Signed in on Change stores "authenticated"; a role beside it stores the pair, as an array', () => {
    let m = matrixFrom({}, OPS);
    m = { ...m, update: toggleCell(m.update, 'signedIn', true) };
    expect(rulesFrom(m, OPS)).toEqual({ update: 'authenticated' });
    m = { ...m, update: toggleCell(m.update, { role: 'editors' }, true) };
    expect(rulesFrom(m, OPS)).toEqual({ update: ['authenticated', 'role:editors'] });
    // Other rows stayed inherited: no key was written for them.
    expect(Object.keys(rulesFrom(m, OPS))).toEqual(['update']);
  });

  it('AC2: No one is exclusive — ticking it empties the row; ticking anything else unticks it', () => {
    let sel = withRole(withSignedIn(withNobody(), true), 'editors', true);
    sel = toggleCell(sel, 'noOne', true);
    expect(cellState(sel, 'noOne').checked).toBe(true);
    expect(cellState(sel, 'signedIn').checked).toBe(false);
    expect(cellState(sel, { role: 'editors' }).checked).toBe(false);
    expect(selectionToRule(sel)).toBe('nobody');
    sel = toggleCell(sel, 'signedIn', true);
    expect(cellState(sel, 'noOne').checked).toBe(false);
    expect(selectionToRule(sel)).toBe('authenticated');
  });

  it('AC2: Everyone implies the rest — the other cells show ticked and greyed, and only "public" is stored', () => {
    const sel = toggleCell(withRole(withNobody(), 'editors', true), 'everyone', true);
    expect(selectionToRule(sel)).toBe('public');
    for (const col of ['signedIn', { role: 'editors' }] as const) {
      expect(cellState(sel, col)).toEqual({ checked: true, implied: true });
    }
    expect(cellState(sel, 'noOne')).toEqual({ checked: false, implied: true });
    // Off again leaves No one, from which the next tick builds up.
    const off = toggleCell(sel, 'everyone', false);
    expect(selectionToRule(off)).toBe('nobody');
    // Ticking a role on a public row narrows it (the vocabulary's rule), so the click does something.
    const narrowed = toggleCell(withAnyone(), { role: 'editors' }, true);
    expect(selectionToRule(narrowed)).toBe('role:editors');
  });

  it('Default is the absence of a rule, per row, and survives a round trip', () => {
    const stored = { create: 'role:editors', update: ['role:editors', 'authenticated'] };
    const m = matrixFrom(stored, OPS);
    expect(cellState(m.find, 'default').checked).toBe(true);
    expect(cellState(m.create, 'default').checked).toBe(false);
    // Written back in the vocabulary's canonical order (signed in, then roles): the same rule, not the same bytes.
    expect(rulesFrom(m, OPS)).toEqual({ create: 'role:editors', update: ['authenticated', 'role:editors'] });
    // Ticking Default on a row that had a rule drops the rule; un-ticking it leaves No one to build from.
    expect(rulesFrom({ ...m, create: toggleCell(m.create, 'default', true) }, OPS)).toEqual({ update: ['authenticated', 'role:editors'] });
    expect(selectionToRule(toggleCell(m.find, 'default', false))).toBe('nobody');
  });

  it('a role column is every role the rules name, once, in first-seen order — a ghost role included', () => {
    const m = matrixFrom({ find: ['role:ghost', 'role:editors'], update: 'role:editors' }, OPS);
    expect(rolesNamed(matrixRules(m, OPS))).toEqual(['ghost', 'editors']);
    expect(validateRuleValue('role:ghost')).toBeNull();
  });

  it('the words: Everyone, Signed in, No one, the roles, Default (with the default in brackets)', () => {
    expect(audienceWords(parseRule('public'))).toBe('Everyone');
    expect(audienceWords(parseRule('authenticated'))).toBe('Signed in');
    expect(audienceWords(parseRule('nobody'))).toBe('No one');
    expect(audienceWords(parseRule(['authenticated', 'role:editors']))).toBe('Signed in, editors');
    expect(audienceWords(parseRule(undefined), parseRule('authenticated'))).toBe('Default (Signed in)');
    expect(entrySummary({ permissions: { create: 'role:editors' }, creatorOwns: true }, {})).toBe('create: editors · records belong to their creator · 4 from the defaults');
    expect(entrySummary(undefined, {})).toBe('The defaults');
  });
});

describe('BMG-006 templates (AC3)', () => {
  const ann: Principal = { kind: 'user', userId: 'u1', roles: [] };
  const editor: Principal = { kind: 'user', userId: 'u2', roles: ['editors'] };
  const anon: Principal = { kind: 'anonymous' };
  const all = (rule: string) => ({ find: rule, get: rule, create: rule, update: rule, delete: rule });

  const TABLE: Array<[TemplateId, string | undefined, ReturnType<typeof templateEntry>]> = [
    ['public-read', undefined, { permissions: { find: 'public', get: 'public', create: 'authenticated', update: 'authenticated', delete: 'authenticated' }, creatorOwns: false }],
    ['signed-in', undefined, { permissions: all('authenticated'), creatorOwns: false }],
    ['owner', undefined, { permissions: all('authenticated'), creatorOwns: true }],
    ['role-only', 'editors', { permissions: all('role:editors'), creatorOwns: false }],
    ['locked', undefined, { permissions: all('nobody'), creatorOwns: false }]
  ];

  it.each(TABLE)('%s fills the documented config', (id, role, expected) => {
    expect(templateEntry(id, role)).toEqual(expected);
    // Everything a template writes, the backend accepts.
    for (const rule of Object.values(expected.permissions!)) expect(validateRuleValue(rule)).toBeNull();
    expect(TEMPLATES.some((t) => t.id === id)).toBe(true);
  });

  it('means what it says, read off the backend’s own ruleAllows', () => {
    const pub = templateEntry('public-read').permissions!;
    expect(ruleAllows(pub.find!, anon)).toBe(true);
    expect(ruleAllows(pub.update!, anon)).toBe(false);
    expect(ruleAllows(pub.update!, ann)).toBe(true);
    // Only the owner: a plain signed-in person passes the collection rule (the row's ACL is what
    // narrows them to their own records); "nobody" on Change would have locked the owner out too.
    const owner = templateEntry('owner');
    expect(owner.creatorOwns).toBe(true);
    expect(ruleAllows(owner.permissions!.update!, ann)).toBe(true);
    expect(ruleAllows('nobody', ann)).toBe(false);
    const role = templateEntry('role-only', 'editors').permissions!;
    expect(ruleAllows(role.find!, ann)).toBe(false);
    expect(ruleAllows(role.find!, editor)).toBe(true);
    const locked = templateEntry('locked').permissions!;
    expect(ruleAllows(locked.find!, editor)).toBe(false);
  });
});

describe('BMG-006 the ported vocabulary agrees with the backend model', () => {
  it('every selection a click can reach validates, and round-trips', () => {
    const every: Array<string | string[]> = [];
    for (const signedIn of [false, true]) {
      for (const a of [false, true]) {
        for (const b of [false, true]) {
          let sel = withSignedIn(withNobody(), signedIn);
          if (a) sel = withRole(sel, 'admin', true);
          if (b) sel = withRole(sel, 'a,b', true);
          const rule = selectionToRule(sel);
          if (rule !== undefined) every.push(rule);
        }
      }
    }
    every.push(selectionToRule(withAnyone())!);
    for (const rule of every) {
      expect({ rule, error: validateRuleValue(rule) }).toEqual({ rule, error: null });
      expect(parseRule(selectionToRule(parseRule(rule)))).toEqual(parseRule(rule));
    }
    // A role with a comma in its name is one role, end to end.
    expect(parseRule(selectionToRule(withRole(withNobody(), 'a,b', true))).roles).toEqual(['a,b']);
  });
});

describe('BMG-006 functions', () => {
  const row = {
    name: 'sendInvoice',
    deployed: false,
    workflow: null,
    call: ['authenticated', 'role:editors'] as string[],
    source: 'configured' as const,
    configured: ['authenticated', 'role:editors'] as string[],
    allowNoAuth: false,
    runAs: null,
    rateLimit: { ratePerMinute: 30, burst: 10 },
    effectiveRateLimit: { ratePerMinute: 30, burst: 10 },
    rateLimitSource: 'declared' as const,
    timeoutMs: 5000,
    idempotency: { enabled: true, requireKey: true },
    graphRefusesAnonymous: false
  };

  it('a row becomes a draft and back without losing a field, in the shapes the validator accepts', () => {
    const d = draftFrom(row);
    expect(d.timeoutSeconds).toBe('5');
    expect(d.idempotency).toBe('required');
    expect(entryFromDraft(d)).toEqual({
      call: ['authenticated', 'role:editors'],
      rateLimit: { ratePerMinute: 30, burst: 10 },
      timeoutMs: 5000,
      idempotency: { enabled: true, requireKey: true }
    });
    // Everything cleared: no entry at all (the key is deleted), never `{}` with dead fields.
    expect(entryFromDraft({ ...d, call: parseRule(undefined), ownLimit: false, timeoutSeconds: '', idempotency: 'off' })).toBeUndefined();
    for (const choice of ['off', 'key', 'key-body', 'required', 'required-body'] as const) {
      expect(idempotencyChoice(idempotencyValue(choice) || null)).toBe(choice);
    }
  });

  it('drift is a chip with its reason, never hidden', () => {
    const chips = functionChips(row, { ratePerMinute: 60, burst: 30 });
    expect(chips.map((c) => c.label)).toEqual(['not deployed']);
    const open = functionChips({ ...row, deployed: true, call: 'public', source: 'graph', configured: null, allowNoAuth: false, graphRefusesAnonymous: true, rateLimitSource: 'public-write-default', effectiveRateLimit: { ratePerMinute: 60, burst: 30 } }, { ratePerMinute: 60, burst: 30 });
    expect(open.map((c) => c.label)).toEqual(['from the graph', 'fails for signed-out callers', '60/min default']);
    expect(open.every((c) => c.why.length > 20)).toBe(true);
  });

  it('a function use on the Roles page now points at the functions page', () => {
    expect(useHref({ kind: 'function', name: 'sendInvoice', ops: ['call'] })).toBe('#/permissions/functions');
    expect(useHref({ kind: 'collection', name: 'Pet', ops: ['find'] })).toBe('#/permissions/Pet');
  });
});

describe('BMG-006 Try as, and what is never drawn (AC5 words, AC6, AC7)', () => {
  it('says the verdict as a sentence, the record answer folded in', () => {
    expect(verdictSentence('ann', 'update', 'Pet', { allowed: true, rule: 'authenticated', reason: '' })).toBe('ann may change Pet.');
    expect(verdictSentence('Someone signed out', 'find', 'Pet', { allowed: false, rule: 'authenticated', reason: '' })).toBe('Someone signed out may not list Pet.');
    expect(verdictSentence('ann', 'update', 'Pet (Rex)', { allowed: true, rule: 'authenticated', reason: '', recordAllowed: false })).toBe(
      'ann may not change Pet (Rex): the collection allows it, but that record’s sharing does not.'
    );
    expect(verdictSentence('ann', 'call', 'sendInvoice', { allowed: false, rule: 'role:editors', reason: '' })).toBe('ann may not call sendInvoice.');
  });

  it('AC6: a `_` table is never a collection the page draws', () => {
    expect(visibleCollections(['Pet', '_User', '_Session', 'Order', '_Role'])).toEqual(['Order', 'Pet']);
  });

  it('AC7 + AC6, rendered: the collection page draws a box per cell and no text input that takes a rule', async () => {
    const calls: string[] = [];
    const config = {
      version: 1,
      devOpen: false,
      defaults: { permissions: { find: 'authenticated', get: 'authenticated', create: 'authenticated', update: 'authenticated', delete: 'nobody' }, creatorOwns: true },
      collections: { Pet: { permissions: { create: 'role:editors', update: ['role:editors', 'authenticated'] } } },
      functions: {},
      files: { upload: 'authenticated', read: 'public', delete: 'nobody' },
      signup: 'public'
    };
    const answers: Record<string, unknown> = {
      '/admin/permissions': { config, etag: '"e1"', enforced: true },
      '/admin/roles': { roles: [{ name: 'editors' }, { name: 'billing' }] },
      '/admin/schema': { tables: [{ name: 'Pet' }, { name: '_User' }, { name: 'Order' }] }
    };
    const realFetch = globalThis.fetch;
    globalThis.fetch = (async (url: string, init?: RequestInit) => {
      calls.push((init && init.method) + ' ' + url);
      const body = answers[url];
      return { status: body ? 200 : 404, json: async () => body || { error: 'no such route in this spec' } } as Response;
    }) as typeof fetch;
    session.set({ credential: { kind: 'token', value: 't' }, readonly: false });
    const root = mount(<PermissionsView params={['Pet']} />);
    for (let i = 0; i < 20 && !root.querySelector('#collection-matrix'); i++) await settle(20);
    const matrix = q(root, '#collection-matrix');
    // Five rows in a person's words, with the storage word as a badge.
    expect(qa(matrix, 'tbody tr').map((tr) => text(tr.querySelector('.perm-op b')))).toEqual(OP_ROWS.map((r) => r.word));
    // Pet's stored rules are drawn: create = editors; update = Signed in + editors; the rest on Default.
    const box = (op: string, col: string) => q<HTMLInputElement>(matrix, `input[data-op="${op}"][data-col="${col}"]`);
    expect(box('create', 'role-editors').checked).toBe(true);
    expect(box('create', 'default').checked).toBe(false);
    expect(box('update', 'signedIn').checked).toBe(true);
    expect(box('update', 'role-editors').checked).toBe(true);
    expect(box('find', 'default').checked).toBe(true);
    // AC7: the only text inputs on the page are the pickers' search boxes — none holds a rule.
    const textInputs = qa<HTMLInputElement>(root, 'input[type="text"], input:not([type])');
    expect(textInputs.every((i) => i.closest('.picker') !== null)).toBe(true);
    expect(qa(root, 'textarea').length).toBe(0);
    // AC6: `_User` is not offered anywhere on the page.
    expect(root.textContent).not.toContain('_User');
    // Ticking Everyone on List greys Signed in and No one; nothing has been written yet.
    change(box('find', 'default'), false);
    change(box('find', 'everyone'), true);
    expect(box('find', 'signedIn').disabled).toBe(true);
    expect(box('find', 'signedIn').checked).toBe(true);
    expect(calls.filter((c) => c.startsWith('PUT') || c.startsWith('DELETE'))).toEqual([]);
    unmount(root);
    globalThis.fetch = realFetch;
  });
});
