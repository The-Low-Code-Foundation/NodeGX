/**
 * P116 ONT-007 s11 — the executor where production imports it (`src/migration.ts`, README §9 R9),
 * graded without an engine: the page loop under a cap, a plan from a body, the rules after a rename.
 * The engines grade the rest (`nodegx-backend/tests/ont-007-migration`, `ont-007-route`).
 */
import type { IStorageSchema } from '../src/storage';
import {
  dryRunMigration,
  migrationPlanProblems,
  rulesAfterMigration,
  runMigration,
  type MigrationContext,
  type MigrationPlanData
} from '../src/migration';
import * as conformance from '../conformance';

type Row = Record<string, unknown>;

/** An in-memory data plane that hands back at most `cap` rows a page, as the backend's facade does under `queries.maxLimit`. */
function capped(tables: Record<string, Row[]>, cap: number): MigrationContext & { writes: Row[] } {
  const writes: Row[] = [];
  const schema = {
    getTableSchema: (name: string) => (name === 'Membership' ? { name, columns: [{ name: 'account', type: 'Pointer', targetClass: 'Account' }] } : { name, columns: [] })
  } as unknown as IStorageSchema;
  return {
    schema,
    writes,
    create: async (collection, data) => (writes.push({ collection, ...data }), { objectId: `m${writes.length}` }),
    save: async () => ({}),
    query: async (collection, options) => {
      const all = [...(tables[collection] || [])].sort((a, b) => String(a.objectId).localeCompare(String(b.objectId)));
      const skip = options?.skip ?? 0;
      return { results: all.slice(skip, skip + Math.min(options?.limit ?? cap, cap)) };
    },
    count: async (collection) => (tables[collection] || []).length,
    fetch: async () => ({})
  };
}

const people = (n: number): Row[] => Array.from({ length: n }, (_, i) => ({ objectId: `p${String(i).padStart(3, '0')}`, account: `a${i % 2}` }));
const BOMBSHELL: MigrationPlanData = {
  steps: [
    { backup: true, says: 'Take a backup' },
    { move: { linkToRecord: { from: 'Person', field: 'account', record: 'Membership', fromField: 'person', toField: 'account' } }, says: "Every person's account becomes their first membership" }
  ],
  checks: [{ loses: 'values', collection: 'Person', field: 'account', says: 'the account each person is on' }],
  refused: []
};

describe('the executor reads every row, whatever a page is capped at', () => {
  it('a dry run counts all 7 people when a page holds 2 (the old loop stopped at the first short page: 2)', async () => {
    const dry = await dryRunMigration(capped({ Person: people(7) }, 2), BOMBSHELL);
    expect(dry.moves).toEqual([{ says: "Every person's account becomes their first membership", rows: 7 }]);
    expect(dry.losses).toEqual([{ says: 'the account each person is on', count: 7 }]);
  });

  it('a run writes a membership for each of them', async () => {
    const ctx = capped({ Person: people(7) }, 2);
    const run = await runMigration(ctx, BOMBSHELL, { backup: async () => 'b', acceptLosses: true });
    expect(run.ran).toBe(true);
    expect(ctx.writes).toHaveLength(7);
  });

  it('an empty collection is one read, and no rows', async () => {
    expect((await dryRunMigration(capped({}, 2), BOMBSHELL)).moves[0].rows).toBe(0);
  });

  it('the conformance entry hands out this same executor, not a copy', () => {
    expect(conformance.runMigration).toBe(runMigration);
    expect(conformance.dryRunMigration).toBe(dryRunMigration);
  });
});

describe('a plan from a request body', () => {
  it('the planner-shaped plan has no problems', () => {
    expect(migrationPlanProblems(BOMBSHELL)).toEqual([]);
  });

  it.each([
    ['not an object', 'drop everything', 'the plan is { steps, checks, refused }'],
    ['an unknown schema action', { ...BOMBSHELL, steps: [{ schema: { action: 'truncate', table: 'Person' }, says: 'Empty it' }] }, 'step 1: no schema action "truncate"'],
    ['a step that is two things', { ...BOMBSHELL, steps: [{ backup: true, schema: { action: 'deleteTable', table: 'Person' }, says: 'x' }] }, 'step 1 is one of a backup, a schema change, a move or the rules on old values'],
    ['a step with no words', { ...BOMBSHELL, steps: [{ backup: true }] }, 'step 1 does not say what it does'],
    ['an unknown move', { ...BOMBSHELL, steps: [{ move: { teleport: {} }, says: 'x' }] }, 'step 1: a move is one of linkToRecord, recordToLink, fieldAcross'],
    ['an unknown check', { ...BOMBSHELL, checks: [{ refuse: 'mood', says: 'x' }] }, 'check 1: no check "mood"'],
    ['refused not words', { ...BOMBSHELL, refused: [3] }, 'the plan\'s "refused" is a list of sentences'],
    // P116 ONT-011 step 4: a world writes one field rule, "nobody" — a plan that opens a field wider is not the world's.
    [
      'a field rule a world never writes',
      { ...BOMBSHELL, steps: [{ rules: { collection: 'Person', onlyWhile: null, fields: { email: { read: 'public' } } }, says: 'x' }] },
      'step 1: the field rules are { <field>: { "read": "nobody" } }, or null for none'
    ],
    [
      'an earlier field rule in another shape',
      { ...BOMBSHELL, steps: [{ rules: { collection: 'Person', onlyWhile: null, fields: null, wasFields: ['email'] }, says: 'x' }] },
      'step 1: the earlier field rules are { <field>: { "read": "nobody" } }, or null for none'
    ]
  ])('%s is refused in words', (_, plan, says) => {
    expect(migrationPlanProblems(plan)).toContain(says);
  });

  it('an unknown schema action the validator was not asked about fails its step — never counted as done', async () => {
    const plan = { steps: [{ backup: true, says: 'b' }, { schema: { action: 'truncate', table: 'Person' }, says: 'Empty it' }], checks: [], refused: [] } as unknown as MigrationPlanData;
    const run = await runMigration(capped({}, 2), plan, { backup: async () => 'b' });
    expect(run).toMatchObject({ ran: 'partly', steps: 1, failed: { step: 1, message: 'no schema action "truncate"' } });
  });
});

describe('the permission rules after a rename', () => {
  const RENAME: MigrationPlanData = {
    steps: [
      { backup: true, says: 'b' },
      { schema: { action: 'renameTable', table: 'Account', newName: 'Subscription' }, says: 'Accounts are subscriptions now' },
      { schema: { action: 'renameColumn', table: 'Person', oldName: 'account', newName: 'subscription' }, says: "A person's account is their subscription" }
    ],
    checks: [],
    refused: []
  };
  const targets: Record<string, string> = { 'Person.account': 'Account', 'Person.login': '_User' };
  const targetOf = (c: string, f: string) => targets[`${c}.${f}`];
  const theirAccount = { path: { hops: [{ from: 'Person', by: 'login' }, { follow: 'account' }, { from: 'Person', by: 'account', where: { account: { $exists: true }, name: 'x' } }], maxDepth: 3 } };
  const rules = {
    collections: {
      Account: { permissions: { find: 'nobody' }, creatorOwns: false },
      Person: { permissions: { find: ['admin', theirAccount], get: 'authenticated' } },
      Note: { permissions: { find: 'public' } }
    }
  };

  it("a renamed collection's rules move to its new name, and nothing else moves", () => {
    const after = rulesAfterMigration(RENAME, rules, targetOf);
    expect(after.problems).toEqual([]);
    expect(after.moved).toEqual([{ from: 'Account', to: 'Subscription' }]);
    expect(Object.keys(after.collections).sort()).toEqual(['Note', 'Person', 'Subscription']);
    expect(after.collections.Subscription).toEqual({ permissions: { find: 'nobody' }, creatorOwns: false });
    expect(after.collections.Note).toEqual(rules.collections.Note);
  });

  it("a path rule's hops are re-said: the field followed, the field matched by, a hop's filter — and the rule that is not a path is left", () => {
    const after = rulesAfterMigration(RENAME, rules, targetOf);
    expect((after.collections.Person.permissions as Row).find).toEqual([
      'admin',
      { path: { hops: [{ from: 'Person', by: 'login' }, { follow: 'subscription' }, { from: 'Person', by: 'subscription', where: { subscription: { $exists: true }, name: 'x' } }], maxDepth: 3 } }
    ]);
    expect(after.rewritten).toEqual([{ at: 'collections.Person.permissions.find', names: { account: 'subscription' } }]);
    // The input is untouched: the route assigns only once the steps have run.
    expect(rules.collections.Person.permissions.find[1]).toBe(theirAccount);
    expect(theirAccount.path.hops[1]).toEqual({ follow: 'account' });
  });

  it('a hop that names the renamed collection by `to` is re-said too — and a field is re-said only on the collection it is on', () => {
    // A path starts at the caller (`_User`): its first `follow: 'account'` is a field of the user, which nothing renames.
    const hops = [{ follow: 'account', to: 'Account' }, { from: 'Person', by: 'login' }, { follow: 'account', to: 'Account' }];
    const r = { collections: { Person: { permissions: { find: [{ path: { hops, maxDepth: 3 } }] } } } };
    expect((rulesAfterMigration(RENAME, r, targetOf).collections.Person.permissions as Row).find).toEqual([
      { path: { hops: [{ follow: 'account', to: 'Subscription' }, { from: 'Person', by: 'login' }, { follow: 'subscription', to: 'Subscription' }], maxDepth: 3 } }
    ]);
  });

  it('only the steps that ran: the plan cut after the table rename moves the rules and re-says no field', () => {
    const after = rulesAfterMigration({ steps: RENAME.steps.slice(0, 2) }, rules, targetOf);
    expect(after.moved).toEqual([{ from: 'Account', to: 'Subscription' }]);
    expect(after.rewritten).toEqual([]);
  });

  it('a new name that already has rules of its own is a problem, not an overwrite', () => {
    const after = rulesAfterMigration(RENAME, { collections: { ...rules.collections, Subscription: { permissions: { find: 'public' } } } }, targetOf);
    expect(after.problems).toEqual(['"Account" is renamed "Subscription", and "Subscription" already has rules of its own']);
  });

  it('a renamed field said deeper inside a hop filter is a problem', () => {
    const deep = { collections: { Person: { permissions: { find: [{ path: { hops: [{ follow: 'login', where: { $or: [{ account: 'a1' }] } }], maxDepth: 1 } }] } } } };
    const targets2 = (c: string, f: string) => (c === '_User' && f === 'login' ? 'Person' : undefined);
    expect(rulesAfterMigration(RENAME, deep, targets2).problems).toEqual([
      'the rule at collections.Person.permissions.find narrows a hop by "account" inside a filter; say it again as "subscription"'
    ]);
  });

  it('a plan with no renames carries every rule as it is', () => {
    const after = rulesAfterMigration(BOMBSHELL, rules, targetOf);
    expect(after).toEqual({ collections: rules.collections, moved: [], rewritten: [], problems: [] });
  });
});
