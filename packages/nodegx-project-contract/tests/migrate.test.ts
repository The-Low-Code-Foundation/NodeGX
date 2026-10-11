/**
 * P116 ONT-007 — the diff is the migration, before any engine.
 *
 * What this file decides without records: the diff of two worlds, sentence by sentence; the plan
 * the bombshell makes ("a member belongs to one account" → "some members are on two"), in order —
 * the backup first, the place for the new records, the move, the rules, and only then the drop;
 * its mirror, with the checks that stop it and the values it would lose; that a changed id is a
 * noun removed and another added (never a silent rename), whose rows the plan counts as lost;
 * and that a change it cannot migrate is refused in words. The records are
 * `nodegx-backend/tests/ont-007-migration.test.ts`'s, on both engines.
 */
import * as fs from 'fs';
import * as path from 'path';

import { componentReach, diffWorld, nounRenames, permissionReach, validateWorld, verbReach, workflowReach, migrationWords, planMigration, VERBS_FILE, WORLD_FILES, type ComponentGraph, type MigrationPlan, type VerbsFile, type WorkflowGraph, type WorldFiles } from '../world';

const FIXTURES = path.join(__dirname, 'fixtures');
const BEFORE = 'world-bombshell-before';
const AFTER = 'world-bombshell-after';

function readWorld(fixture: string): WorldFiles {
  const read = (f: string) => JSON.parse(fs.readFileSync(path.join(FIXTURES, fixture, f), 'utf8'));
  return { nouns: read(WORLD_FILES.nouns), relations: read(WORLD_FILES.relations), vocabulary: read(WORLD_FILES.vocabulary) };
}
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

function plan(before: WorldFiles, after: WorldFiles): MigrationPlan {
  const out = planMigration(before, after);
  if (!out.ok) throw new Error(out.problems.join('\n'));
  return out.plan;
}
/** A step as one short word, so an order reads at a glance. */
const shape = (p: MigrationPlan): string[] =>
  p.steps.map((s) => ('backup' in s ? 'backup' : 'move' in s ? `move:${Object.keys(s.move)[0]}` : 'rules' in s ? `rules:${s.rules.collection}` : `${s.schema.action}:${s.schema.table}`));

describe('the diff', () => {
  it('two worlds that say the same thing differ in nothing', () => {
    expect(diffWorld(readWorld('world-membership'), readWorld('world-membership'))).toEqual([]);
  });

  it('the bombshell is one relation said again, as another kind', () => {
    const changes = diffWorld(readWorld(BEFORE), readWorld(AFTER));
    expect(changes.map((c) => [c.what, c.about])).toEqual([
      ['relation-reworded', { relation: 'membership' }],
      ['relation-rekinded', { relation: 'membership' }]
    ]);
    // A new kind's answers are new, not changed: the diff does not list five "answered" rows.
    expect(changes[1].says).toBe(
      "'membership' was belongs-to and is is-on now: “Some members are on two companies' accounts: a person is on an account, as its holder or as a member, from the day they join until they leave.”"
    );
  });

  it('a changed answer, word or property is said in the person’s words', () => {
    const before = readWorld('world-membership');
    const after = clone(before);
    after.nouns.nouns[1].name = 'Subscription';
    after.nouns.nouns[0].properties!.push({ name: 'email', kind: 'text' });
    after.relations.relations[0].answers!.whenTargetGoes = 'stays-unlinked';
    expect(diffWorld(before, after).map((c) => c.says)).toEqual([
      'a person now has an email (text)',
      'an Account is called “Subscription” now',
      "'account-company': whenTargetGoes was “blocks”, is “stays-unlinked” now"
    ]);
  });
});

describe('the bombshell — one account becomes several', () => {
  const p = plan(readWorld(BEFORE), readWorld(AFTER));

  it('backs up first, makes the records, moves the links, keeps the rules, and drops the old field last', () => {
    // s11: and says again what a person is — the words on Person change with the answer (§6.9 #5).
    expect(shape(p)).toEqual(['backup', 'createTable:Membership', 'move:linkToRecord', 'setChecks:Membership', 'dropColumn:Person']);
    expect(p.steps[2]).toEqual({
      move: { linkToRecord: { from: 'Person', field: 'account', record: 'Membership', fromField: 'person', toField: 'account' } },
      says: "every person's account becomes their first 'membership' record; its since, until, role left empty, because nobody said what they were"
    });
  });

  it('loses nothing, so nothing waits to be accepted, and refuses nothing', () => {
    // The dropped account is read by the move before it goes: not a loss.
    expect(p.checks).toEqual([]);
    expect(p.refused).toEqual([]);
    expect(p.notKept).toEqual([]);
  });

  it('reaches the people and the new membership records', () => {
    expect(p.reach).toEqual([
      { collection: 'Person', words: 'people', fields: ['account'], how: 'changed' },
      { collection: 'Membership', words: "'membership' records", fields: [], how: 'made' }
    ]);
  });

  it('every schema step is a body the schema route takes', () => {
    // `nodegx-backend/src/server/byob-admin.ts` `mutateSchema`: the actions it answers. The backend spec posts them.
    const ROUTE = ['createTable', 'addColumn', 'renameColumn', 'renameTable', 'describeTable', 'setWhenTargetGoes', 'setSeries', 'setRequired', 'changeColumnType', 'dropColumn', 'deleteTable', 'setIndexes', 'setChecks'];
    for (const s of p.steps) if ('schema' in s) expect(ROUTE).toContain(s.schema.action);
  });
});

/** The fixture's components, read the way the census reads a template's: `component.json`, `nodes.json`, `connections.json`. */
function readComponents(fixture: string): ComponentGraph[] {
  const dir = path.join(FIXTURES, fixture, 'components');
  return fs
    .readdirSync(dir)
    .sort()
    .map((name) => {
      const read = (f: string) => JSON.parse(fs.readFileSync(path.join(dir, name, f), 'utf8'));
      return { path: read('component.json').path, nodes: read('nodes.json').nodes, connections: read('connections.json').connections };
    });
}

describe('the bombshell reaches the screens that name what it changes', () => {
  it('the members page lists people and adds one with their account; the accounts page is not reached', () => {
    const p = plan(readWorld(BEFORE), readWorld(AFTER));
    expect(componentReach(p, readComponents(BEFORE))).toEqual([
      { component: '/#__cloud__/enrol', node: 'Make the member', collection: 'Person', fields: ['account'] },
      { component: '/Pages/Members', node: 'Every member', collection: 'Person', fields: [] },
      { component: '/Pages/Members', node: 'Add a member', collection: 'Person', fields: ['account'] },
      // s9: a Record node's `prop-<field>` ports are OUTPUTS — the page that SHOWS a member's account is reached too
      { component: '/Pages/Members', node: 'The member', collection: 'Person', fields: ['account'] }
    ]);
  });

  it('s9 — the control: without the read side, the node that only shows the account is reached by name alone', () => {
    const p = plan(readWorld(BEFORE), readWorld(AFTER));
    const components = readComponents(BEFORE).map((c) => ({ ...c, connections: c.connections?.map(({ toId, toProperty }) => ({ toId, toProperty })) }));
    expect(componentReach(p, components).find((r) => r.node === 'The member')).toEqual({ component: '/Pages/Members', node: 'The member', collection: 'Person', fields: [] });
  });

  it('and the workflow whose step calls the cloud function that writes a person’s account — not the step that calls another', () => {
    const p = plan(readWorld(BEFORE), readWorld(AFTER));
    const dir = path.join(FIXTURES, BEFORE, 'workflow-defs');
    const workflows: WorkflowGraph[] = fs.readdirSync(dir).map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
    expect(workflowReach(componentReach(p, readComponents(BEFORE)), workflows)).toEqual([
      { workflow: 'When a company joins, enrol its first member', step: 'Enrol the member', calls: 'enrol', collection: 'Person', fields: ['account'] }
    ]);
  });

  it('s10 — and the verb whose step makes a person: AC1’s verb, read off the step’s own binding, not the step on the account', () => {
    const before = readWorld(BEFORE);
    const after = readWorld(AFTER);
    const verbs = readVerbs(BEFORE);
    // The verbs bind to the world before, and still do after: the bombshell renames nothing they name.
    expect(validateWorld({ ...before, verbs }).problems).toEqual([]);
    expect(validateWorld({ ...after, verbs }).problems).toEqual([]);
    expect(verbReach(plan(before, after), verbs, before, after)).toEqual([
      { verb: 'A company joins', verbId: 'join', step: 'add its first member on its account', stepId: 'first-member', calls: 'join-first-member', collection: 'Person', fields: ['account'], how: 'changed' }
    ]);
  });

  it('s10 — the control: were accounts reached, the update is, by the field it names', () => {
    const before = readWorld(BEFORE);
    const p = { reach: [{ collection: 'Account', words: 'accounts', fields: ['name', 'tier'], how: 'changed' as const }], before: plan(before, readWorld(AFTER)).before };
    expect(verbReach(p, readVerbs(BEFORE), before, before)).toEqual([
      { verb: 'A company joins', verbId: 'join', step: 'put the company\'s name on the account', stepId: 'name-account', calls: 'join-name-account', collection: 'Account', fields: ['name'], how: 'changed' }
    ]);
  });

  it('and would see the accounts page if accounts were reached (the control)', () => {
    const rows = componentReach({ reach: [{ collection: 'Account', words: 'accounts', fields: [], how: 'changed' }] }, readComponents(BEFORE));
    expect(rows.map((r) => r.component)).toEqual(['/Pages/Accounts']);
  });
});

describe('the mirror — several accounts become one', () => {
  const p = plan(readWorld(AFTER), readWorld(BEFORE));

  it('s10 — a verb’s step on the membership itself is reached as removed, and is on nothing after', () => {
    const verbs: VerbsFile = {
      verbs: [
        {
          id: 'add-seat',
          name: 'Add a seat',
          sentence: 'Put a person on an account.',
          runs: 'server',
          steps: [{ id: 'seat', says: 'put the person on the account', does: 'make', on: 'membership' }]
        }
      ]
    };
    expect(validateWorld({ ...readWorld(AFTER), verbs }).problems).toEqual([]);
    expect(verbReach(p, verbs, readWorld(AFTER), readWorld(BEFORE))).toEqual([
      { verb: 'Add a seat', verbId: 'add-seat', step: 'put the person on the account', stepId: 'seat', calls: 'add-seat-seat', collection: 'Membership', fields: [], how: 'removed', rebind: { from: 'membership', to: null } }
    ]);
  });

  it('adds the link, fills it from the records, makes it required, then lets the records go', () => {
    expect(shape(p)).toEqual(['backup', 'addColumn:Person', 'move:recordToLink', 'setRequired:Person', 'deleteTable:Membership']);
  });

  it('stops on a person on two accounts or on none, and counts the details it would lose', () => {
    expect(p.checks.map((c) => ('refuse' in c ? `refuse:${c.refuse}` : `loses:${c.loses}:${'field' in c ? c.field : c.collection}`))).toEqual([
      'refuse:more-than-one',
      'refuse:none',
      'loses:values:since',
      'loses:values:until',
      'loses:values:role'
    ]);
  });

  it('adds the link optional and makes it required once the move has filled it — every rule kept (P116-ONT-007-required)', () => {
    // Before `setRequired` the link stayed optional and `person/account-is-required` was named in `notKept`,
    // measured to fail on both engines. The dry run's `none` check stops a person the move would leave without one.
    const add = p.steps[1];
    expect('schema' in add && add.schema.action === 'addColumn' && 'required' in add.schema.column).toBe(false);
    const made = p.steps[3];
    expect('schema' in made && made.schema).toEqual({ action: 'setRequired', table: 'Person', columns: { account: true } });
    expect(made.says).toBe('every person must have an account from now on');
    expect(p.notKept).toEqual([]);
  });
});

describe('what the plan will not do', () => {
  it('a changed id is a noun removed and another added — its rows are counted as lost, never renamed', () => {
    const before = readWorld(BEFORE);
    const after = clone(before);
    after.nouns.nouns[1].id = 'subscription';
    after.relations.relations[0].to = 'subscription';
    const p = plan(before, after);
    expect(diffWorld(before, after).filter((c) => c.what.startsWith('noun')).map((c) => c.what)).toEqual(['noun-added', 'noun-removed']);
    // The link's field is named after what it points at, so it is a new field too: the old one's
    // values and the old collection's rows are counted as lost, and the new required link over
    // people already there stops it. Nothing is carried across by a guess.
    expect(p.checks).toEqual([
      { refuse: 'rows', collection: 'Person', says: 'every person must have a subscription, and the ones already there have none' },
      { loses: 'values', collection: 'Person', field: 'account', says: 'the account of each person' },
      { loses: 'rows', collection: 'Account', says: 'every account' }
    ]);
    expect(p.refused).toEqual([]);
  });

  it('a change of kind it has no move for is refused in words', () => {
    const before = readWorld(BEFORE);
    const after = clone(before);
    after.relations.relations[0] = { id: 'membership', from: 'person', to: 'account', kind: 'together', sentence: 'People and accounts go together.', answers: { needsDetails: false, twice: false } };
    expect(plan(before, after).refused).toEqual(["'membership' changing from belongs-to to together is not migrated yet: only a link becoming a record of its own, and back, is."]);
  });

  it('a field whose type or target changes in place is refused in the tiles’ words', () => {
    const before = readWorld(BEFORE);
    const after = clone(before);
    after.nouns.nouns[1].properties![0] = { name: 'name', kind: 'number' };
    expect(plan(before, after).refused).toEqual(["an account's name changing from a text to a number in place is not migrated yet."]);
  });

  it('a field whose only change is whether it is required is a step, not a refusal (P116-ONT-007-required)', () => {
    const before = readWorld(BEFORE);
    const after = clone(before);
    after.relations.relations[0].answers!.required = false;
    const p = plan(before, after);
    expect(shape(p)).toEqual(['backup', 'setRequired:Person']);
    expect((p.steps[1] as { schema: unknown }).schema).toEqual({ action: 'setRequired', table: 'Person', columns: { account: false } });
    expect(p.steps[1].says).toBe('a person may be without an account from now on');
    expect({ checks: p.checks, refused: p.refused, notKept: p.notKept }).toEqual({ checks: [], refused: [], notKept: [] });
    expect(p.reach).toEqual([{ collection: 'Person', words: 'people', fields: ['account'], how: 'changed' }]);

    // And back: made required over records, the dry run counts the ones with none before anything moves.
    const back = plan(after, before);
    expect(shape(back)).toEqual(['backup', 'setRequired:Person']);
    expect((back.steps[1] as { schema: unknown }).schema).toEqual({ action: 'setRequired', table: 'Person', columns: { account: true } });
    expect(back.checks).toEqual([{ refuse: 'empty', collection: 'Person', field: 'account', says: 'every person must have an account now, and some have none' }]);
    expect(back.refused).toEqual([]);
  });

  it('a link made optional before it may stay without one, and required only after it no longer does', () => {
    const before = readWorld(BEFORE); // required, blocks
    const after = clone(before);
    after.relations.relations[0].answers = { ...after.relations.relations[0].answers!, required: false, whenTargetGoes: 'stays-unlinked' };
    expect(shape(plan(before, after))).toEqual(['backup', 'setRequired:Person', 'setWhenTargetGoes:Person']);
    expect(shape(plan(after, before))).toEqual(['backup', 'setWhenTargetGoes:Person', 'setRequired:Person']);
  });

  it('a world that does not project is refused with the projection’s words, side named', () => {
    const before = readWorld(BEFORE);
    const after = clone(before);
    after.relations.relations[0].kind = 'no-such-kind';
    const out = planMigration(before, after);
    expect(out.ok).toBe(false);
    expect(!out.ok && out.problems[0]).toMatch(/^the world after: /);
  });
});

describe('the plan as a person reads it', () => {
  it('says what changed, what it reaches, each step, and what stops it', () => {
    const words = migrationWords(plan(readWorld(AFTER), readWorld(BEFORE)));
    expect(words).toContain('Reaches people (Person): changed — account.');
    expect(words).toContain("3. Every person's one 'membership' record becomes their account.");
    expect(words).toContain('Stops if: a person on more than one account cannot keep just one without losing the others.');
    expect(words).toContain("Would lose: the role of each 'membership' record.");
  });
});

describe('the extends mistakes only a diff can read (ONT-005 §6.6)', () => {
  const EXT = 'world-extends-before';
  /** The same world with `updated` moved to the user, or (`keep`) copied there while the profile keeps it. */
  function sortUsersByUpdated(keep: boolean): WorldFiles {
    const w = readWorld(EXT);
    w.nouns.nouns[0].properties!.push({ name: 'updated', kind: 'date', sentence: 'When the profile was last changed.' });
    if (!keep) w.nouns.nouns[1].properties = w.nouns.nouns[1].properties!.filter((p) => p.name !== 'updated');
    w.relations.relations[0].answers!.filterBy = 'when the profile was last updated';
    return w;
  }

  it('filter-field-split-off: the field moved onto the user takes every profile’s value with it — not a loss', () => {
    const p = plan(readWorld(EXT), sortUsersByUpdated(false));
    expect(shape(p)).toEqual(['backup', 'addColumn:User', 'move:fieldAcross', 'dropColumn:Profile']);
    expect(p.steps[2]).toEqual({ move: { fieldAcross: { from: 'Profile', link: 'user', field: 'updated', to: 'User' } }, says: "every user takes its profile's updated" });
    expect(p.checks).toEqual([]);
  });

  it('and back: a field moved onto the profile is read from its user', () => {
    const p = plan(sortUsersByUpdated(false), readWorld(EXT));
    expect(p.steps.find((s) => 'move' in s)).toEqual({
      move: { fieldAcross: { from: 'Profile', link: 'user', field: 'updated', to: 'User', back: true } },
      says: "every profile takes its user's updated"
    });
  });

  it('sort-key-copied: the field put on the user while the profile keeps it is refused, with what to do instead', () => {
    expect(plan(readWorld(EXT), sortUsersByUpdated(true)).refused).toEqual([
      "a user would hold a copy of its profile's updated, and nothing keeps the two the same: move it (take it off the profile in the same change), or keep it on the profile and sort users through the link."
    ]);
  });

  it('a field moved between two nouns with no extends link between them is not carried (the control)', () => {
    const before = readWorld(BEFORE);
    const after = clone(before);
    after.nouns.nouns[0].properties!.push({ name: 'name2', kind: 'text' });
    after.nouns.nouns[1].properties = [];
    delete after.nouns.nouns[1].answers!.calledBy; // nothing left to call one by (ONT-011 step 2)
    after.nouns.nouns[0].properties = after.nouns.nouns[0].properties!.filter((p) => p.name !== 'name2');
    after.nouns.nouns[0].properties!.push({ name: 'title', kind: 'text' });
    before.nouns.nouns[1].properties!.push({ name: 'title', kind: 'text' });
    const p = plan(before, after);
    expect(p.steps.filter((s) => 'move' in s)).toEqual([]);
    expect(p.checks).toContainEqual({ loses: 'values', collection: 'Account', field: 'title', says: 'the title of each account' });
  });
});

/** The fixture's `verbs.json`, read beside the three files (s10). */
function readVerbs(fixture: string): VerbsFile {
  return JSON.parse(fs.readFileSync(path.join(FIXTURES, fixture, VERBS_FILE), 'utf8'));
}

/** The world with one noun called something else: a new id, a new word, and the id it `was`. */
function renamed(w: WorldFiles, from: string, to: string, name: string): WorldFiles {
  const out = clone(w);
  Object.assign(out.nouns.nouns.find((n) => n.id === from)!, { id: to, name, was: from });
  for (const r of out.relations.relations) {
    if (r.from === from) r.from = to;
    if (r.to === from) r.to = to;
  }
  return out;
}

describe('AC3 — a noun renamed keeps its records', () => {
  const ONE = readWorld(BEFORE);
  const SUBSCRIBED = renamed(ONE, 'account', 'subscription', 'Subscription');
  /** Accounts with a tier from a fixed list: a rule built under the collection's name. */
  const TIERED = clone(ONE);
  TIERED.nouns.nouns[1].properties!.push({ name: 'tier', kind: 'choice', values: ['basic', 'gold'] });

  it('the diff says it is renamed — not one noun removed and another added, and its relation is not re-attached', () => {
    expect(diffWorld(ONE, SUBSCRIBED).map((c) => [c.what, c.detail, c.says])).toEqual([
      ['noun-renamed', 'account', 'accounts are subscriptions now: every one is kept, under its new name'],
      ['noun-reworded', undefined, 'an Account is called “Subscription” now']
    ]);
  });

  it('the plan renames the collection, then the field named after it — nothing to refuse, nothing lost', () => {
    const p = plan(ONE, SUBSCRIBED);
    expect(shape(p)).toEqual(['backup', 'renameTable:Account', 'renameColumn:Person']);
    expect(p.steps[1]).toMatchObject({ schema: { action: 'renameTable', table: 'Account', newName: 'Subscription' } });
    expect(p.steps[2]).toMatchObject({ schema: { action: 'renameColumn', table: 'Person', oldName: 'account', newName: 'subscription' } });
    expect({ checks: p.checks, refused: p.refused, notKept: p.notKept }).toEqual({ checks: [], refused: [], notKept: [] });
  });

  it('the control: the same rename without `was` is still a noun removed and another added, its rows counted as lost', () => {
    const noWas = clone(SUBSCRIBED);
    delete noWas.nouns.nouns[1].was;
    const p = plan(ONE, noWas);
    expect(shape(p)).not.toContain('renameTable:Account');
    expect(p.checks).toContainEqual({ loses: 'rows', collection: 'Account', says: 'every account' });
  });

  it('reaches the renamed collection by its old name: every screen written before still names Account', () => {
    const p = plan(ONE, SUBSCRIBED);
    expect(p.reach).toEqual([
      { collection: 'Person', words: 'people', fields: ['account'], how: 'changed', renamed: { account: 'subscription' } },
      { collection: 'Subscription', words: 'subscriptions', fields: [], how: 'renamed', was: 'Account' }
    ]);
    expect(componentReach(p, readComponents(BEFORE)).map((r) => [r.component, r.collection, r.fields])).toEqual([
      ['/Pages/Accounts', 'Subscription', []],
      ['/#__cloud__/enrol', 'Person', ['account']],
      ['/Pages/Members', 'Person', []],
      ['/Pages/Members', 'Person', ['account']],
      ['/Pages/Members', 'Person', ['account']]
    ]);
    expect(migrationWords(p)).toContain('Reaches subscriptions (Subscription, was Account): renamed.');
  });

  it('s10 — reaches the verb’s step on the renamed noun, and says what it must be on now; until it is, the verbs are refused', () => {
    const verbs = readVerbs(BEFORE);
    expect(verbReach(plan(ONE, SUBSCRIBED), verbs, ONE, SUBSCRIBED)).toEqual([
      { verb: 'A company joins', verbId: 'join', step: 'add its first member on its account', stepId: 'first-member', calls: 'join-first-member', collection: 'Person', fields: ['account'], how: 'changed' },
      { verb: 'A company joins', verbId: 'join', step: 'put the company\'s name on the account', stepId: 'name-account', calls: 'join-name-account', collection: 'Subscription', fields: [], how: 'renamed', rebind: { from: 'account', to: 'subscription' } }
    ]);
    const stale = validateWorld({ ...SUBSCRIBED, verbs });
    expect(stale.ok).toBe(false);
    expect(stale.problems.every((x) => x.file === VERBS_FILE)).toBe(true);
    // Re-said on the new id, they bind again.
    const resaid = clone(verbs);
    resaid.verbs[0].about!.nouns = ['person', 'subscription'];
    resaid.verbs[0].steps[1].on = 'subscription';
    expect(validateWorld({ ...SUBSCRIBED, verbs: resaid }).problems).toEqual([]);
  });

  it('a rename under a rule takes the rule off first and puts it back after — the adapter refuses to rename under it', () => {
    const p = plan(TIERED, renamed(TIERED, 'account', 'subscription', 'Subscription'));
    expect(shape(p)).toEqual(['backup', 'setChecks:Account', 'renameTable:Account', 'renameColumn:Person', 'setChecks:Subscription']);
    expect(p.steps[1]).toMatchObject({ schema: { checks: [] } });
    expect(p.steps[4]).toMatchObject({ schema: { checks: [{ field: 'tier', oneOf: ['basic', 'gold'] }] } });
  });

  it('and leaves a rule the rename does not reach where it is: a list on the role, when only the person field is renamed', () => {
    const MANY = readWorld(AFTER);
    const p = plan(MANY, renamed(MANY, 'person', 'member', 'Member'));
    expect(shape(p)).toEqual(['backup', 'renameTable:Person', 'renameColumn:Membership']);
  });

  it('a rename and the bombshell in one change: renamed first, then the records made under the new names', () => {
    const p = plan(ONE, renamed(readWorld(AFTER), 'account', 'subscription', 'Subscription'));
    expect(shape(p)).toEqual(['backup', 'renameTable:Account', 'renameColumn:Person', 'createTable:Membership', 'move:linkToRecord', 'setChecks:Membership', 'dropColumn:Person']);
    expect(p.steps[4]).toMatchObject({ move: { linkToRecord: { from: 'Person', field: 'subscription', record: 'Membership', toField: 'subscription' } } });
    expect(p.checks).toEqual([]);
  });

  it('a `was` the world before does not have is history: it renames nothing', () => {
    expect(nounRenames(SUBSCRIBED, SUBSCRIBED).size).toBe(0);
    expect(diffWorld(SUBSCRIBED, SUBSCRIBED)).toEqual([]);
  });

  it('the validator keeps `was` honest: an id, not its own, not a noun still there, one noun per old id', () => {
    const at = (w: WorldFiles) => validateWorld(w).problems.filter((x) => x.at.endsWith('.was')).map((x) => x.expected);
    expect(at(SUBSCRIBED)).toEqual([]);
    const own = clone(SUBSCRIBED);
    own.nouns.nouns[1].was = 'subscription';
    expect(at(own)).toEqual(['an id other than its own']);
    const still = clone(SUBSCRIBED);
    still.nouns.nouns[1].was = 'person';
    expect(at(still)).toEqual(['an id no noun has now']);
    const twice = clone(SUBSCRIBED);
    twice.nouns.nouns.push({ id: 'plan', name: 'Plan', sentence: 'A plan is what an account was too.', was: 'account' });
    expect(at(twice)).toEqual(['an id only one noun was']);
  });
});

describe('the permission rules a plan reaches (§3.2)', () => {
  // An account holder sees the accounts they are on: from their login, through the person, along the link.
  const SECURITY = {
    collections: {
      Account: { permissions: { find: ['role:admin', { path: { hops: [{ from: 'Person', by: 'login' }, { follow: 'account', to: 'Account' }], maxDepth: 2 } }] } },
      Person: { permissions: { find: 'authenticated', create: 'role:admin' } },
      Company: { permissions: { find: 'public' } }
    }
  };

  it('the bombshell reaches the people’s own rules, and the account rule whose path follows a person’s account', () => {
    const p = plan(readWorld(BEFORE), readWorld(AFTER));
    expect(permissionReach(p, SECURITY)).toEqual([
      { at: 'collections.Account.permissions.find', collection: 'Person', reads: 'a path through it', fields: ['account'] },
      { at: 'collections.Person', collection: 'Person', reads: 'its rules', fields: [] }
    ]);
  });

  it('a rename says the rules kept under the old name must move — until they do, they protect nothing', () => {
    const p = plan(readWorld(BEFORE), renamed(readWorld(BEFORE), 'account', 'subscription', 'Subscription'));
    expect(permissionReach(p, SECURITY)).toEqual([
      { at: 'collections.Account', collection: 'Subscription', reads: 'its rules', fields: [], mustMove: { from: 'Account', to: 'Subscription' } },
      // s9: the path's hops say `account` and `Account` — names the plan takes away; the row says what they become
      { at: 'collections.Account.permissions.find', collection: 'Person', reads: 'a path through it', fields: ['account'], mustRewrite: { account: 'subscription', Account: 'Subscription' } },
      { at: 'collections.Account.permissions.find', collection: 'Subscription', reads: 'a path through it', fields: [], mustRewrite: { account: 'subscription', Account: 'Subscription' } },
      { at: 'collections.Person', collection: 'Person', reads: 'its rules', fields: [] }
    ]);
  });

  it('s9 — the control: a path rule the bombshell reaches has nothing to rewrite, because nothing is renamed', () => {
    const rows = permissionReach(plan(readWorld(BEFORE), readWorld(AFTER)), SECURITY);
    expect(rows.every((r) => r.mustRewrite === undefined)).toBe(true);
  });

  it('the control: a plan that reaches only companies reaches only the company rules', () => {
    const rows = permissionReach({ reach: [{ collection: 'Company', words: 'companies', fields: [], how: 'changed' }], before: plan(readWorld(BEFORE), readWorld(AFTER)).before }, SECURITY);
    expect(rows).toEqual([{ at: 'collections.Company', collection: 'Company', reads: 'its rules', fields: [] }]);
  });
});

describe('s9 — rules put on records that already break them are read before anything moves (the reach review)', () => {
  const ONE = readWorld(BEFORE);
  const TIERED = clone(ONE);
  TIERED.nouns.nouns[1].properties!.push({ name: 'tier', kind: 'choice', values: ['basic', 'gold'] });

  it('a list narrowed over a field the accounts hold: refused by the rows outside the new list', () => {
    const narrowed = clone(TIERED);
    narrowed.nouns.nouns[1].properties!.find((p) => p.name === 'tier')!.values = ['basic'];
    const p = plan(TIERED, narrowed);
    expect(shape(p)).toEqual(['backup', 'setChecks:Account']);
    expect(p.checks).toEqual([{ refuse: 'outside-list', collection: 'Account', field: 'tier', values: ['basic'], says: 'an account whose tier is not one of basic cannot keep it' }]);
  });

  it('a list put on a text the accounts already hold: the same refusal', () => {
    const free = clone(ONE);
    free.nouns.nouns[1].properties!.push({ name: 'tier', kind: 'text' });
    const p = plan(free, TIERED);
    expect(shape(p)).toEqual(['backup', 'setChecks:Account']);
    expect(p.checks.map((c) => ('refuse' in c ? c.refuse : c.loses))).toEqual(['outside-list']);
  });

  it('a unique rule said over memberships already there: refused by the rows that share a person', () => {
    const MANY = readWorld(AFTER);
    const one = clone(MANY);
    one.relations.relations[0].answers!.several = false;
    const p = plan(MANY, one);
    expect(shape(p)).toEqual(['backup', 'setIndexes:Membership']);
    expect(p.checks).toEqual([{ refuse: 'duplicates', collection: 'Membership', fields: ['person'], says: "two 'membership' records that share person cannot both keep it" }]);
  });

  it('the controls: a list on a new field, a unique rule on a new field, and a list that only grows are not read', () => {
    // A new field has no rows outside any list; a list that grows refuses nothing; a rule put back as it was (a rename) is not new.
    expect(plan(ONE, TIERED).checks).toEqual([]);
    const wider = clone(TIERED);
    wider.nouns.nouns[1].properties!.find((p) => p.name === 'tier')!.values = ['basic', 'gold', 'platinum'];
    expect(plan(TIERED, wider).checks.map((c) => ('refuse' in c ? c.refuse : c.loses))).toEqual(['outside-list']);
    expect(plan(TIERED, renamed(TIERED, 'account', 'subscription', 'Subscription')).checks).toEqual([]);
  });
});

describe('s11 — a changed answer that changes only the words is a step of its own (§6.9 #5)', () => {
  const ONE = readWorld(BEFORE);
  it('a noun said again in other words: the backup, then the collection described — nothing else, and no reach', () => {
    const after = clone(ONE);
    after.nouns.nouns[0].sentence = 'A person is someone we serve, on the account that pays for them.';
    const p = plan(ONE, after);
    expect(shape(p)).toEqual(['backup', 'describeTable:Person']);
    const step = p.steps[1] as { schema: { action: string; description: string; columns: Record<string, string | null> } };
    expect(step.schema.description).toBe(p.after.collections.find((c) => c.name === 'Person')!.description);
    expect(step.schema.description).toContain('someone we serve');
    expect(step.schema.columns).toEqual({});
    expect(p.reach).toEqual([]);
    expect(p.checks).toEqual([]);
  });

  it('the same world twice says nothing again — the control', () => {
    expect(shape(plan(ONE, clone(ONE)))).toEqual(['backup']);
  });

  it("a field's words said again are carried by name, and the collection's words with them", () => {
    const after = clone(ONE);
    const rel = after.relations.relations[0] as unknown as Record<string, unknown>;
    rel.sentence = 'A member is on one account, the one that pays.';
    const p = plan(ONE, after);
    const described = p.steps.filter((s) => 'schema' in s && s.schema.action === 'describeTable') as Array<{ schema: { table: string; columns: Record<string, string | null> } }>;
    expect(described.length).toBeGreaterThan(0);
    for (const d of described) {
      const now = p.after.collections.find((c) => c.name === d.schema.table)!;
      for (const [field, words] of Object.entries(d.schema.columns)) expect(now.columns.find((c) => c.name === field)!.description ?? null).toBe(words);
    }
    expect(described.some((d) => Object.keys(d.schema.columns).length > 0)).toBe(true);
  });
});

describe('R10 — a changed answer to "when what it points at goes" is a step of its own', () => {
  const ONE = readWorld(BEFORE);
  it('blocks → goes-too: the backup, then the link told — no words step, no check, no reach', () => {
    const after = clone(ONE);
    after.relations.relations[0].answers!.whenTargetGoes = 'goes-too';
    const p = plan(ONE, after);
    expect(shape(p)).toEqual(['backup', 'setWhenTargetGoes:Person']);
    expect((p.steps[1] as { schema: unknown }).schema).toEqual({ action: 'setWhenTargetGoes', table: 'Person', columns: { account: 'goes-too' } });
    expect(p.steps[1].says).toBe("when the Account a person's account points at goes, the person goes too");
    expect(p.checks).toEqual([]);
    expect(p.reach).toEqual([]);
  });

  it('the rule is carried on the column a new collection is made with, so a bombshell needs no step for it', () => {
    const p = plan(readWorld(BEFORE), readWorld(AFTER));
    const made = p.steps.find((s) => 'schema' in s && s.schema.action === 'createTable') as { schema: { columns: Array<{ name: string; whenTargetGoes?: string }> } };
    expect(made.schema.columns.filter((c) => c.whenTargetGoes).map((c) => `${c.name}:${c.whenTargetGoes}`).sort()).toEqual(
      p.after.collections.find((c) => c.name === 'Membership')!.columns.filter((c) => c.whenTargetGoes).map((c) => `${c.name}:${c.whenTargetGoes}`).sort()
    );
    expect(made.schema.columns.some((c) => c.whenTargetGoes)).toBe(true);
  });

  it('the same answer twice says nothing — the control', () => {
    const after = clone(ONE);
    after.relations.relations[0].answers!.whenTargetGoes = 'blocks';
    expect(shape(plan(ONE, after))).toEqual(['backup']);
  });
});

describe('s13 — the verbs a plan reaches: an end, by the field it marks', () => {
  const VERBS = 'world-verbs';
  const readVerbsOf = (fixture: string): VerbsFile => JSON.parse(fs.readFileSync(path.join(FIXTURES, fixture, VERBS_FILE), 'utf8'));

  it('a membership that no longer starts and ends reaches the step that ends one, by `until` alone — and the verbs are refused after until it is re-said', () => {
    const before = readWorld(VERBS);
    const after = clone(before);
    after.relations.relations.find((r) => r.id === 'membership')!.answers!.startsEnds = false;
    const verbs = readVerbsOf(VERBS);
    const p = plan(before, after);
    // The plan drops both dates; the end writes one of them.
    expect(p.reach).toEqual([{ collection: 'Membership', words: "'membership' records", fields: ['since', 'until'], how: 'changed' }]);
    expect(verbReach(p, verbs, before, after)).toEqual([
      { verb: 'Archive a person', verbId: 'archive', step: 'their memberships end', stepId: 'memberships-end', calls: 'archive-memberships-end', collection: 'Membership', fields: ['until'], how: 'changed' }
    ]);
    // Still on a membership, so nothing to rebind; but an end needs a date to mark, and there is none after.
    expect(validateWorld({ ...before, verbs }).problems).toEqual([]);
    expect(validateWorld({ ...after, verbs }).problems.map((x) => [x.file, x.at, x.expected])).toEqual([
      [VERBS_FILE, 'verbs[1].steps[1].by', 'the date that marks the end — "membership" does not say it starts and ends']
    ]);
  });

  it('an end said `by` a date the person named is reached by that date, not by the noun’s other fields', () => {
    const before = readWorld(VERBS);
    before.nouns.nouns.find((n) => n.id === 'account')!.properties!.push({ name: 'opened on', kind: 'date' }, { name: 'closed on', kind: 'date' });
    // Both dates change; the end marks one of them.
    const after = clone(before);
    const account = after.nouns.nouns.find((n) => n.id === 'account')!;
    account.properties = account.properties!.map((x) => (x.kind === 'date' ? { ...x, kind: 'text' as const, freeWords: true } : x));
    const verbs: VerbsFile = {
      verbs: [
        {
          id: 'close',
          name: 'Close an account',
          sentence: 'An account closes on a day.',
          runs: 'server',
          steps: [{ id: 'account-closes', says: 'the account closes', does: 'end', on: 'account', by: 'closed on' }]
        }
      ]
    };
    expect(validateWorld({ ...before, verbs }).problems).toEqual([]);
    const p = plan(before, after);
    expect(p.reach.map((r) => [r.collection, r.fields])).toEqual([['Account', ['openedOn', 'closedOn']]]);
    expect(verbReach(p, verbs, before, after)).toEqual([
      { verb: 'Close an account', verbId: 'close', step: 'the account closes', stepId: 'account-closes', calls: 'close-account-closes', collection: 'Account', fields: ['closedOn'], how: 'changed' }
    ]);
  });
});

describe('ONT-011 step 4 — a secret detail rides the rules step, as `fields`, with what the world said before', () => {
  const secretEmail = (w: WorldFiles): WorldFiles => {
    const out = clone(w);
    const person = out.nouns.nouns.find((n) => n.id === 'person')!;
    person.properties = [...(person.properties || []), { name: 'email', kind: 'text', secret: true }];
    person.answers = { ...(person.answers || {}), secret: true };
    return out;
  };
  const before = readWorld('world-membership');
  const withEmail = (w: WorldFiles): WorldFiles => {
    const out = clone(w);
    out.nouns.nouns.find((n) => n.id === 'person')!.properties!.push({ name: 'email', kind: 'text' });
    return out;
  };
  const rulesOn = (p: MigrationPlan, collection: string) =>
    p.steps.flatMap((s) => ('rules' in s && s.rules.collection === collection ? [s] : []));

  it('saying a detail is secret is one rules step: the field read by nobody, nothing before; the onlyWhile unchanged', () => {
    const plain = withEmail(before);
    const p = plan(plain, secretEmail(before));
    const steps = rulesOn(p, 'Person');
    expect(steps).toHaveLength(1);
    const [step] = steps;
    expect(step.rules.fields).toEqual({ email: { read: 'nobody' } });
    expect(step.rules.wasFields).toBeNull();
    expect(step.rules.onlyWhile).toEqual(step.rules.was);
    expect(step.says).toContain("email is read by nobody but the backend's own key");
    expect(shape(p)[shape(p).length - 1]).toBe('rules:Person');
  });

  it('said back: the rule is taken away (null), and the step says what it had', () => {
    const p = plan(secretEmail(before), withEmail(before));
    const [step] = rulesOn(p, 'Person');
    expect(step.rules.fields).toBeNull();
    expect(step.rules.wasFields).toEqual({ email: { read: 'nobody' } });
    expect(step.says).toBe('keep, for people: nobody deletes one; email is read by whoever reads one again');
  });

  it('the control: a world whose secrets do not change writes no fields step', () => {
    expect(rulesOn(plan(secretEmail(before), secretEmail(before)), 'Person')).toEqual([]);
    expect(rulesOn(plan(withEmail(before), withEmail(before)), 'Person')).toEqual([]);
  });
});
