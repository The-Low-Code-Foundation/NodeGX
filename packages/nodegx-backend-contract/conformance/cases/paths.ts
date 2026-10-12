/**
 * Paths — a question that crosses several links, answered in one request.
 *
 * P116 ONT-004. The contract followed one link (`$relatedTo`, a Pointer
 * equality); a membership business's questions are paths of two, four and
 * five links, and every one of them was answered in application code after
 * fetching too much. `$path` (the neutral `path` operator) is the contract's
 * answer, and these cases are what the word *supported* in its capability cell
 * rests on — rows asserted, SQL never (BRG-003 §3.3).
 *
 * ## The fixture
 *
 * A membership business's shape, in synthetic rows (README R6): companies,
 * accounts that belong to one company, people, memberships (a person on an
 * account, as holder or member), employments (a person at a company), sessions
 * tagged through a Links field, attendance, and a tree of topics.
 *
 * The four paths of ONT-000's census, on it:
 *
 * | # | the question                                      | hops |
 * |---|---------------------------------------------------|------|
 * | 1 | accounts whose company is named X                 | 1    |
 * | 2 | accounts with a member named Y                    | 2    |
 * | 3 | the people an account holder may see              | 4    |
 * | 4 | the members on my account's companies             | 5    |
 *
 * Path 3 is the permission rule the business's dashboard enforces in code;
 * ONT-004 AC3 puts it in the backend (`security/model.ts`, a `path` rule
 * atom), and it is the same operator.
 *
 * @module conformance/cases/paths
 */

import { deepEq, eq, pluck } from '../assert';
import { read } from '../context';
import type { ConformanceCase, ConformanceContext, Row } from '../index';

/** The collections of one run, under their fresh names. */
interface World {
  Company: string;
  Account: string;
  Person: string;
  Membership: string;
  Employment: string;
  Session: string;
  Tag: string;
  Attendance: string;
  Topic: string;
  /** objectIds by the fixture's own names. */
  id: Record<string, string>;
}

const pointer = (className: string, objectId: string): Row => ({ __type: 'Pointer', className, objectId });

/**
 * Seed the world. Declared through the schema surface so a Link is a Pointer
 * with a target the path can read — which is what a projected world is
 * (ONT-003) and what a hand-made text id is not.
 */
async function seed(ctx: ConformanceContext, acl?: Record<string, Row>): Promise<World> {
  const w: World = {
    Company: ctx.collection('PathCompany'),
    Account: ctx.collection('PathAccount'),
    Person: ctx.collection('PathPerson'),
    Membership: ctx.collection('PathMembership'),
    Employment: ctx.collection('PathEmployment'),
    Session: ctx.collection('PathSession'),
    Tag: ctx.collection('PathTag'),
    Attendance: ctx.collection('PathAttendance'),
    Topic: ctx.collection('PathTopic'),
    id: {}
  };
  ctx.createTable(w.Company, [{ name: 'name', type: 'String' }]);
  ctx.createTable(w.Account, [
    { name: 'name', type: 'String' },
    { name: 'company', type: 'Pointer', targetClass: w.Company }
  ]);
  ctx.createTable(w.Person, [{ name: 'name', type: 'String' }]);
  ctx.createTable(w.Membership, [
    { name: 'person', type: 'Pointer', targetClass: w.Person },
    { name: 'account', type: 'Pointer', targetClass: w.Account },
    { name: 'role', type: 'String' }
  ]);
  ctx.createTable(w.Employment, [
    { name: 'person', type: 'Pointer', targetClass: w.Person },
    { name: 'company', type: 'Pointer', targetClass: w.Company }
  ]);
  ctx.createTable(w.Tag, [{ name: 'label', type: 'String' }]);
  ctx.createTable(w.Session, [
    { name: 'title', type: 'String' },
    { name: 'tags', type: 'Relation', targetClass: w.Tag },
    { name: 'speakers', type: 'Array' }
  ]);
  ctx.createTable(w.Attendance, [
    { name: 'person', type: 'Pointer', targetClass: w.Person },
    { name: 'session', type: 'Pointer', targetClass: w.Session }
  ]);
  ctx.createTable(w.Topic, [
    { name: 'title', type: 'String' },
    { name: 'parent', type: 'Pointer', targetClass: w.Topic }
  ]);

  const make = async (collection: string, name: string, data: Row): Promise<string> => {
    const row = await ctx.create(collection, { ...data, ...(acl?.[name] ? { ACL: acl[name] } : {}) });
    w.id[name] = String(row.objectId);
    return w.id[name];
  };
  const p = (name: string): Row => pointer('', w.id[name]);

  await make(w.Company, 'acme', { name: 'Acme' });
  await make(w.Company, 'globex', { name: 'Globex' });
  await make(w.Account, 'acme-main', { name: 'acme-main', company: p('acme') });
  await make(w.Account, 'acme-second', { name: 'acme-second', company: p('acme') });
  await make(w.Account, 'globex-main', { name: 'globex-main', company: p('globex') });
  for (const name of ['ann', 'bob', 'cy', 'di', 'eve']) await make(w.Person, name, { name });

  // ann holds both Acme accounts; bob is a member on both; eve a member on the
  // first; cy holds Globex's. di is on no account.
  await make(w.Membership, 'm-ann-main', { person: p('ann'), account: p('acme-main'), role: 'holder' });
  await make(w.Membership, 'm-ann-second', { person: p('ann'), account: p('acme-second'), role: 'holder' });
  await make(w.Membership, 'm-bob-main', { person: p('bob'), account: p('acme-main'), role: 'member' });
  await make(w.Membership, 'm-bob-second', { person: p('bob'), account: p('acme-second'), role: 'member' });
  await make(w.Membership, 'm-eve-main', { person: p('eve'), account: p('acme-main'), role: 'member' });
  await make(w.Membership, 'm-cy-globex', { person: p('cy'), account: p('globex-main'), role: 'holder' });
  // Where they work: ann, bob and di at Acme; cy and eve at Globex.
  await make(w.Employment, 'e-ann', { person: p('ann'), company: p('acme') });
  await make(w.Employment, 'e-bob', { person: p('bob'), company: p('acme') });
  await make(w.Employment, 'e-di', { person: p('di'), company: p('acme') });
  await make(w.Employment, 'e-cy', { person: p('cy'), company: p('globex') });
  await make(w.Employment, 'e-eve', { person: p('eve'), company: p('globex') });
  // Sessions, their tags (a Links field) and who is listed to speak (a list).
  await make(w.Tag, 'algebra', { label: 'algebra' });
  await make(w.Tag, 'geometry', { label: 'geometry' });
  await make(w.Session, 's1', { title: 's1', speakers: [w.id.ann, w.id.cy] });
  await make(w.Session, 's2', { title: 's2', speakers: [] });
  await ctx.addRelation(w.Session, w.id.s1, 'tags', w.id.algebra);
  await ctx.addRelation(w.Session, w.id.s2, 'tags', w.id.geometry);
  await make(w.Attendance, 'a-ann-s1', { person: p('ann'), session: p('s1') });
  await make(w.Attendance, 'a-cy-s1', { person: p('cy'), session: p('s1') });
  await make(w.Attendance, 'a-bob-s2', { person: p('bob'), session: p('s2') });
  // A tree: root > a > b > c, and a stray topic that sits under itself.
  await make(w.Topic, 'root', { title: 'root' });
  await make(w.Topic, 'a', { title: 'a', parent: p('root') });
  await make(w.Topic, 'b', { title: 'b', parent: p('a') });
  await make(w.Topic, 'c', { title: 'c', parent: p('b') });
  await make(w.Topic, 'other', { title: 'other' });
  return w;
}

const byName = (name: string): Row => ({ name });

/** The members on an account holder's accounts — ONT-004's permission rule, four hops. */
function holderSees(w: World, holder: string): Row {
  return {
    $path: {
      from: { collection: w.Person, where: byName(holder) },
      hops: [
        { from: w.Membership, by: 'person', where: { role: 'holder' } },
        { follow: 'account' },
        { from: w.Membership, by: 'account' },
        { follow: 'person' }
      ],
      maxDepth: 4
    }
  };
}

async function names(
  ctx: ConformanceContext,
  w: World,
  collection: string,
  where: Row,
  keys?: string[]
): Promise<string[]> {
  const got = await ctx.query(collection, keys ? { where, acl: read(keys) } : { where });
  return pluck(
    got.results,
    collection === w.Session ? 'title' : collection === w.Tag ? 'label' : collection === w.Topic ? 'title' : 'name'
  );
}

export const pathCases: readonly ConformanceCase[] = Object.freeze([
  {
    id: 'paths/one-hop-back-through-a-link',
    area: 'paths',
    pins: 'accounts whose company is named X — the census path account.company.name, read from the company',
    async run(ctx) {
      const w = await seed(ctx);
      const got = await names(ctx, w, w.Account, {
        $path: {
          from: { collection: w.Company, where: byName('Acme') },
          hops: [{ from: w.Account, by: 'company' }],
          maxDepth: 1
        }
      });
      deepEq(got, ['acme-main', 'acme-second'], 'the accounts of the named company');
    }
  },

  {
    id: 'paths/two-hops-through-a-junction-record',
    area: 'paths',
    pins: 'accounts with a member named Y — a record of its own crossed in two hops, one back and one forward',
    async run(ctx) {
      const w = await seed(ctx);
      const got = await names(ctx, w, w.Account, {
        $path: {
          from: { collection: w.Person, where: byName('eve') },
          hops: [{ from: w.Membership, by: 'person' }, { follow: 'account' }],
          maxDepth: 2
        }
      });
      deepEq(got, ['acme-main'], 'the accounts a person is on');
    }
  },

  {
    id: 'paths/four-hops-the-account-holder-rule',
    area: 'paths',
    pins: 'the people an account holder may see: the members on the accounts they hold, and nobody else',
    async run(ctx) {
      const w = await seed(ctx);
      deepEq(
        await names(ctx, w, w.Person, holderSees(w, 'ann')),
        ['ann', 'bob', 'eve'],
        'what the holder of two accounts sees'
      );
      deepEq(await names(ctx, w, w.Person, holderSees(w, 'cy')), ['cy'], 'what the other holder sees');
      deepEq(await names(ctx, w, w.Person, holderSees(w, 'bob')), [], 'a member who holds nothing sees nobody');
      deepEq(await names(ctx, w, w.Person, holderSees(w, 'di')), [], 'a person on no account sees nobody');
    }
  },

  {
    id: 'paths/five-hops-the-members-on-my-accounts-companies',
    area: 'paths',
    pins: "the members on my account's companies — ONT-000's deepest real path, five links, in one request",
    async run(ctx) {
      const w = await seed(ctx);
      const got = await names(ctx, w, w.Person, {
        $path: {
          from: { collection: w.Person, where: byName('ann') },
          hops: [
            { from: w.Membership, by: 'person', where: { role: 'holder' } },
            { follow: 'account' },
            { follow: 'company' },
            { from: w.Employment, by: 'company' },
            { follow: 'person' }
          ],
          maxDepth: 5
        }
      });
      deepEq(got, ['ann', 'bob', 'di'], 'the people employed by the companies of the accounts ann holds');
    }
  },

  {
    id: 'paths/a-row-reached-twice-comes-back-once',
    area: 'paths',
    pins: 'the end rows are a set: bob is a member on both of ann’s accounts and appears once',
    async run(ctx) {
      const w = await seed(ctx);
      const got = await ctx.query(w.Person, { where: holderSees(w, 'ann') });
      eq(got.results.length, 3, 'three distinct people, not one per route');
      eq(got.results.filter((r) => r.name === 'bob').length, 1, 'bob once');
    }
  },

  {
    id: 'paths/a-hop-filter-narrows-that-hop',
    area: 'paths',
    pins: 'the where on a hop applies to that hop’s rows: without "as holder", a member’s accounts count too',
    async run(ctx) {
      const w = await seed(ctx);
      // bob is a member on both Acme accounts; as a HOLDER he reaches nobody,
      // as anyone on an account he reaches everyone on them.
      const asAnyone: Row = JSON.parse(JSON.stringify(holderSees(w, 'bob')));
      delete (asAnyone.$path as { hops: Row[] }).hops[0].where;
      deepEq(await names(ctx, w, w.Person, holderSees(w, 'bob')), [], 'with the hop filter');
      deepEq(await names(ctx, w, w.Person, asAnyone), ['ann', 'bob', 'eve'], 'without it');
    }
  },

  {
    id: 'paths/the-start-filter-picks-the-start-rows',
    area: 'paths',
    pins: 'the start’s where decides where the path begins: no where means every row the caller may read',
    async run(ctx) {
      const w = await seed(ctx);
      const everyone: Row = {
        $path: { from: { collection: w.Company }, hops: [{ from: w.Account, by: 'company' }], maxDepth: 1 }
      };
      deepEq(
        await names(ctx, w, w.Account, everyone),
        ['acme-main', 'acme-second', 'globex-main'],
        'from every company'
      );
    }
  },

  {
    id: 'paths/through-a-links-field-both-ways',
    area: 'paths',
    pins: 'a Links (Relation) field is a hop forwards (the tags of a session) and backwards (the sessions with a tag)',
    async run(ctx) {
      const w = await seed(ctx);
      deepEq(
        await names(ctx, w, w.Session, {
          $path: {
            from: { collection: w.Tag, where: { label: 'algebra' } },
            hops: [{ from: w.Session, by: 'tags' }],
            maxDepth: 1
          }
        }),
        ['s1'],
        'the sessions tagged algebra'
      );
      deepEq(
        await names(ctx, w, w.Tag, {
          $path: { from: { collection: w.Session, where: { title: 's2' } }, hops: [{ follow: 'tags' }], maxDepth: 1 }
        }),
        ['geometry'],
        'the tags of s2'
      );
    }
  },

  {
    id: 'paths/a-list-field-is-followed-forwards-only',
    area: 'paths',
    pins: 'a list of ids kept on the record is a hop forwards; read backwards it is refused in the vocabulary’s words',
    async run(ctx) {
      const w = await seed(ctx);
      deepEq(
        await names(ctx, w, w.Person, {
          $path: {
            from: { collection: w.Session, where: { title: 's1' } },
            hops: [{ follow: 'speakers', to: w.Person }],
            maxDepth: 1
          }
        }),
        ['ann', 'cy'],
        'who is listed to speak at s1'
      );
      const refusal = await ctx.refused(() =>
        ctx.query(w.Session, {
          where: {
            $path: {
              from: { collection: w.Person, where: byName('ann') },
              hops: [{ from: w.Session, by: 'speakers' }],
              maxDepth: 1
            }
          }
        })
      );
      eq(/other way round/.test(refusal), true, `the refusal says why: ${refusal}`);
    }
  },

  {
    id: 'paths/a-repeated-hop-walks-a-tree-to-the-bound',
    area: 'paths',
    pins: 'every topic under this one, as deep as maxDepth allows and no deeper; the start is not among them',
    async run(ctx) {
      const w = await seed(ctx);
      const under = (maxDepth: number): Row => ({
        $path: {
          from: { collection: w.Topic, where: { title: 'root' } },
          hops: [{ from: w.Topic, by: 'parent', repeat: true }],
          maxDepth
        }
      });
      deepEq(await names(ctx, w, w.Topic, under(3)), ['a', 'b', 'c'], 'three deep');
      deepEq(await names(ctx, w, w.Topic, under(2)), ['a', 'b'], 'two deep');
      deepEq(await names(ctx, w, w.Topic, under(1)), ['a'], 'one deep');
      // And upwards: the topics above c, as a repeated follow.
      deepEq(
        await names(ctx, w, w.Topic, {
          $path: {
            from: { collection: w.Topic, where: { title: 'c' } },
            hops: [{ follow: 'parent', repeat: true }],
            maxDepth: 8
          }
        }),
        ['a', 'b', 'root'],
        'everything above c'
      );
    }
  },

  {
    id: 'paths/a-cycle-in-the-data-ends-at-the-bound',
    area: 'paths',
    pins: 'a topic that sits under itself does not run the walk forever; the bound ends it and the rows are a set',
    async run(ctx) {
      const w = await seed(ctx);
      await ctx.save(w.Topic, w.id.other, { parent: pointer(w.Topic, w.id.other) });
      const got = await names(ctx, w, w.Topic, {
        $path: {
          from: { collection: w.Topic, where: { title: 'other' } },
          hops: [{ from: w.Topic, by: 'parent', repeat: true }],
          maxDepth: 8
        }
      });
      deepEq(got, ['other'], 'reached once, through its own link');
    }
  },

  {
    id: 'paths/the-acl-applies-at-every-hop',
    area: 'paths',
    pins: 'a membership row the caller may not read is not walked through — the end rows are not the only rows the ACL guards',
    async run(ctx) {
      // ann's holder row on acme-main is readable by u-ann alone. A caller
      // without that key still sees the second account's members, and only them.
      const w = await seed(ctx, { 'm-ann-main': { 'u-ann': { read: true, write: true } } });
      deepEq(
        await names(ctx, w, w.Person, holderSees(w, 'ann'), ['*', 'u-ann']),
        ['ann', 'bob', 'eve'],
        'with the key'
      );
      deepEq(
        await names(ctx, w, w.Person, holderSees(w, 'ann'), ['*', 'u-someone']),
        ['ann', 'bob'],
        'without it, the hidden hop is not taken'
      );
      deepEq(await names(ctx, w, w.Person, holderSees(w, 'ann'), []), ['ann', 'bob'], 'anonymous: the same');
    }
  },

  {
    id: 'paths/composes-with-the-rest-of-the-query',
    area: 'paths',
    pins: 'a path is one condition among others: AND with a field, a count, and a sort all apply to the end rows',
    async run(ctx) {
      const w = await seed(ctx);
      const where: Row = { $and: [holderSees(w, 'ann'), { name: { $ne: 'ann' } }] };
      const got = await ctx.query(w.Person, { where, sort: '-name', count: true });
      deepEq(
        got.results.map((r) => r.name),
        ['eve', 'bob'],
        'sorted, without ann'
      );
      eq(got.count, 2, 'counted');
      eq(await ctx.count(w.Person, where), 2, 'count() agrees');
    }
  },

  {
    id: 'paths/refused-by-name-before-anything-runs',
    area: 'paths',
    pins: 'no depth bound, too deep, a path ending elsewhere, a text field with no "to", a path inside a path: each a refusal that says which',
    async run(ctx) {
      const w = await seed(ctx);
      const ask = (path: Row, on = w.Account): Promise<string> =>
        ctx.refused(() => ctx.query(on, { where: { $path: path } }));
      const hop: Row = { from: w.Account, by: 'company' };
      const from: Row = { collection: w.Company };
      const says = async (path: Row, pattern: RegExp, what: string, on?: string): Promise<void> => {
        const refusal = await ask(path, on);
        eq(pattern.test(refusal), true, `${what}: ${refusal}`);
      };
      await says({ from, hops: [hop] }, /maxDepth/, 'no bound');
      await says({ from, hops: [hop], maxDepth: 9 }, /1 to 8/, 'over the ceiling');
      await says({ from, hops: [hop, hop], maxDepth: 1 }, /2 hops/, 'more hops than the bound');
      await says({ from, hops: [hop], maxDepth: 1 }, /ends on/, 'ending on the wrong collection', w.Person);
      await says(
        { from: { collection: w.Session, where: { title: 's1' } }, hops: [{ follow: 'speakers' }], maxDepth: 1 },
        /"to"/,
        'a list with no "to"',
        w.Person
      );
      await says(
        {
          from: { collection: w.Company, where: { $path: { from, hops: [hop], maxDepth: 1 } } },
          hops: [hop],
          maxDepth: 1
        },
        /path inside a path/,
        'nested'
      );
      await says(
        { from: { collection: 'NoSuchCollection' }, hops: [hop], maxDepth: 1 },
        /no such collection/,
        'a collection that is not there'
      );
    }
  }
]);
