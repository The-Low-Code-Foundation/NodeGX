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

import { componentReach, diffWorld, workflowReach, migrationWords, planMigration, WORLD_FILES, type ComponentGraph, type MigrationPlan, type WorkflowGraph, type WorldFiles } from '../world';

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
  p.steps.map((s) => ('backup' in s ? 'backup' : 'move' in s ? `move:${Object.keys(s.move)[0]}` : `${s.schema.action}:${s.schema.table}`));

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
    const ROUTE = ['createTable', 'addColumn', 'renameColumn', 'changeColumnType', 'dropColumn', 'deleteTable', 'setIndexes', 'setChecks'];
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
      { component: '/Pages/Members', node: 'Add a member', collection: 'Person', fields: ['account'] }
    ]);
  });

  it('and the workflow whose step calls the cloud function that writes a person’s account — not the step that calls another', () => {
    const p = plan(readWorld(BEFORE), readWorld(AFTER));
    const dir = path.join(FIXTURES, BEFORE, 'workflow-defs');
    const workflows: WorkflowGraph[] = fs.readdirSync(dir).map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
    expect(workflowReach(componentReach(p, readComponents(BEFORE)), workflows)).toEqual([
      { workflow: 'When a company joins, enrol its first member', step: 'Enrol the member', calls: 'enrol', collection: 'Person', fields: ['account'] }
    ]);
  });

  it('and would see the accounts page if accounts were reached (the control)', () => {
    const rows = componentReach({ reach: [{ collection: 'Account', words: 'accounts', fields: [], how: 'changed' }] }, readComponents(BEFORE));
    expect(rows.map((r) => r.component)).toEqual(['/Pages/Accounts']);
  });
});

describe('the mirror — several accounts become one', () => {
  const p = plan(readWorld(AFTER), readWorld(BEFORE));

  it('adds the link, fills it from the records, then lets the records go', () => {
    expect(shape(p)).toEqual(['backup', 'addColumn:Person', 'move:recordToLink', 'deleteTable:Membership']);
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

  it('says which rule the records will not keep after it, and why', () => {
    // The link is added without `required` (the route cannot make a field required over rows
    // except with one value for all); the claim that says it is measured to fail on the engines.
    const add = p.steps[1];
    expect('schema' in add && add.schema.action === 'addColumn' && 'required' in add.schema.column).toBe(false);
    expect(p.notKept.map((n) => n.claim)).toEqual(['person/account-is-required']);
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

  it('a field that changes in place is refused in the tiles’ words — no route changes whether a field is required', () => {
    const before = readWorld(BEFORE);
    const after = clone(before);
    after.relations.relations[0].answers!.required = false;
    expect(plan(before, after).refused).toEqual(["a person's account changing from a required link to Account to a link to Account in place is not migrated yet."]);
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
    after.nouns.nouns[0].properties = after.nouns.nouns[0].properties!.filter((p) => p.name !== 'name2');
    after.nouns.nouns[0].properties!.push({ name: 'title', kind: 'text' });
    before.nouns.nouns[1].properties!.push({ name: 'title', kind: 'text' });
    const p = plan(before, after);
    expect(p.steps.filter((s) => 'move' in s)).toEqual([]);
    expect(p.checks).toContainEqual({ loses: 'values', collection: 'Account', field: 'title', says: 'the title of each account' });
  });
});
