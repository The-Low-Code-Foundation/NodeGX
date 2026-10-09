/**
 * P116 R10 — `targetGoes.ts` on an in-memory store: the plan, read before a row is written.
 *
 * The engines grade it in `nodegx-backend/tests/ont-003-target-goes.test.ts` (both engines, every door). This
 * file grades what a store cannot make cheaply: a row that would block but goes anyway by another link, the
 * order of the writes, the validation's sentences, and the capability cell per backend.
 */
import { BACKEND_TYPES } from '../src/backends';
import type { StorageColumn } from '../src/storage';
import { deleteKeepingLinks, planDelete, StillLinked, whenTargetGoesProblems, WHEN_TARGET_GOES_BY_BACKEND, type DeleteContext } from '../src/targetGoes';

type Row = Record<string, unknown>;

/** `pairs` is a Relation's junction: `'Post.tags': [['p1', 't1']]` is post p1 paired with tag t1. */
function store(tables: Record<string, StorageColumn[]>, rows: Record<string, Row[]>, pairs: Record<string, Array<[string, string]>> = {}) {
  const writes: string[] = [];
  const ctx: DeleteContext = {
    schema: {
      listTables: () => Object.keys(tables),
      getTableSchema: (t) => (tables[t] ? { name: t, columns: tables[t] } : null),
      getRelatedIds: (t, id, k) => (pairs[`${t}.${k}`] || []).filter(([o]) => o === id).map(([, r]) => r),
      getRelationOwners: (t, k, id) => (pairs[`${t}.${k}`] || []).filter(([, r]) => r === id).map(([o]) => o)
    },
    async query(c, { where, limit, skip }) {
      const [[k, v]] = Object.entries(where);
      return { results: (rows[c] || []).filter((r) => r[k] === v).slice(skip, skip + limit) };
    },
    async count(c, where) {
      return (rows[c] || []).filter((r) => r.objectId === where.objectId).length;
    },
    async save(c, id, data) {
      writes.push(`save ${c}/${id} ${JSON.stringify(data)}`);
      Object.assign(rows[c].find((r) => r.objectId === id)!, data);
    },
    async delete(c, id, acl) {
      writes.push(`delete ${c}/${id}${acl ? ' (caller)' : ''}`);
      rows[c] = rows[c].filter((r) => r.objectId !== id);
    },
    async unpair(c, id, k, r) {
      writes.push(`unpair ${c}/${id}.${k} ${r}`);
      pairs[`${c}.${k}`] = pairs[`${c}.${k}`].filter(([o, x]) => !(o === id && x === r));
    }
  };
  return { ctx, writes, pairs };
}
const ptr = (name: string, targetClass: string, whenTargetGoes?: StorageColumn['whenTargetGoes']): StorageColumn => ({ name, type: 'Pointer', targetClass, whenTargetGoes });

describe('planDelete / deleteKeepingLinks', () => {
  const tables = {
    Account: [],
    Person: [ptr('account', 'Account', 'goes-too')],
    // A badge blocks its holder going — unless the badge goes too, with the account.
    Badge: [ptr('holder', 'Person', 'blocks'), ptr('account', 'Account', 'goes-too')],
    Note: [ptr('about', 'Person', 'stays-unlinked')]
  };

  it('a row that would block but goes anyway (another link says goes-too) does not block', async () => {
    const { ctx, writes } = store(tables, {
      Account: [{ objectId: 'a' }],
      Person: [{ objectId: 'p', account: 'a' }],
      Badge: [{ objectId: 'b', holder: 'p', account: 'a' }],
      Note: [{ objectId: 'n', about: 'p' }]
    });
    const plan = await deleteKeepingLinks(ctx, 'Account', 'a', { access: 'write', keys: ['me'] });
    expect(plan!.blocked).toEqual([]);
    // The caller's own record first, then the links emptied, then what goes with it.
    expect(writes).toEqual(['delete Account/a (caller)', 'save Note/n {"about":null}', 'delete Person/p', 'delete Badge/b']);
  });

  it('the same badge on another account blocks, and nothing is written', async () => {
    const { ctx, writes } = store(tables, {
      Account: [{ objectId: 'a' }, { objectId: 'z' }],
      Person: [{ objectId: 'p', account: 'a' }],
      Badge: [{ objectId: 'b', holder: 'p', account: 'z' }],
      Note: []
    });
    const refused = deleteKeepingLinks(ctx, 'Account', 'a');
    await expect(refused).rejects.toBeInstanceOf(StillLinked);
    await expect(deleteKeepingLinks(ctx, 'Account', 'a')).rejects.toMatchObject({
      code: 'STILL_LINKED',
      linked: [{ collection: 'Badge', field: 'holder', target: 'Person', count: 1 }]
    });
    expect(writes).toEqual([]);
  });

  it('a record no rule reaches, and a record that is not there, plan nothing', async () => {
    const { ctx } = store(tables, { Account: [{ objectId: 'a' }], Person: [{ objectId: 'p', account: 'gone' }], Badge: [], Note: [] });
    expect(await planDelete(ctx, 'Note', 'n')).toBeNull();
    expect(await planDelete(ctx, 'Account', 'gone')).toBeNull();
  });
});

describe('a Links field: its pairs go with either end (bug P116-ONT-003-pairs)', () => {
  const rel = (name: string, targetClass?: string): StorageColumn => ({ name, type: 'Relation', targetClass });
  const tables = {
    Account: [],
    Post: [rel('tags', 'Tag'), ptr('account', 'Account', 'goes-too'), rel('related', 'Post')],
    Tag: [],
    Loose: [rel('things')]
  };
  const world = () =>
    store(
      tables,
      { Account: [{ objectId: 'a' }], Post: [{ objectId: 'p1', account: 'a' }, { objectId: 'p2' }], Tag: [{ objectId: 't1' }, { objectId: 't2' }], Loose: [{ objectId: 'l' }] },
      { 'Post.tags': [['p1', 't1'], ['p2', 't1'], ['p2', 't2']], 'Post.related': [['p1', 'p2'], ['p2', 'p1']], 'Loose.things': [['l', 't1']] }
    );

  it('a tag goes: every post paired with it loses the pair, and nothing else moves', async () => {
    const { ctx, writes, pairs } = world();
    await deleteKeepingLinks(ctx, 'Tag', 't1');
    expect(writes).toEqual(['delete Tag/t1', 'unpair Post/p1.tags t1', 'unpair Post/p2.tags t1']);
    expect(pairs['Post.tags']).toEqual([['p2', 't2']]);
    // The control: a Relation that does not say what it points at cannot be found from the far end.
    expect(pairs['Loose.things']).toEqual([['l', 't1']]);
  });

  it('a post goes: its own pairs, and the pairs naming it, each once', async () => {
    const { ctx, writes, pairs } = world();
    await deleteKeepingLinks(ctx, 'Post', 'p2');
    expect(writes).toEqual(['delete Post/p2', 'unpair Post/p2.tags t1', 'unpair Post/p2.tags t2', 'unpair Post/p2.related p1', 'unpair Post/p1.related p2']);
    expect([pairs['Post.tags'], pairs['Post.related']]).toEqual([[['p1', 't1']], []]);
  });

  it('a record that goes with another (goes-too) takes its pairs too — after every delete', async () => {
    const { ctx, writes, pairs } = world();
    await deleteKeepingLinks(ctx, 'Account', 'a');
    expect(writes).toEqual(['delete Account/a', 'delete Post/p1', 'unpair Post/p1.tags t1', 'unpair Post/p1.related p2', 'unpair Post/p2.related p1']);
    expect([pairs['Post.tags'], pairs['Post.related']]).toEqual([[['p2', 't1'], ['p2', 't2']], []]);
  });

  it('a record that is not there takes no pairs that name its id', async () => {
    const { ctx, writes, pairs } = world();
    pairs['Post.tags'].push(['p1', 'ghost']);
    expect(await planDelete(ctx, 'Tag', 'ghost')).toBeNull();
    await deleteKeepingLinks(ctx, 'Tag', 'ghost');
    expect(writes).toEqual(['delete Tag/ghost']);
    expect(pairs['Post.tags']).toContainEqual(['p1', 'ghost']);
  });
});

describe('whenTargetGoesProblems', () => {
  it('refuses, in words, a rule that could never be kept — and passes one that can', () => {
    expect(whenTargetGoesProblems('T', [ptr('a', 'A', 'blocks'), { name: 'plain', type: 'String' }])).toEqual([]);
    expect(
      whenTargetGoesProblems('T', [
        { name: 's', type: 'String', whenTargetGoes: 'goes-too' },
        { name: 'p', type: 'Pointer', whenTargetGoes: 'blocks' },
        { ...ptr('r', 'A', 'stays-unlinked'), required: true } as StorageColumn,
        { ...ptr('x', 'A'), whenTargetGoes: 'cascade' } as unknown as StorageColumn
      ])
    ).toEqual([
      '"T.s" is a String; only a link to one record (a Pointer) can say what happens when that record goes.',
      '"T.p" does not say which collection it points at, so nothing can say when that record goes.',
      '"T.r" is required, so it cannot stay without one when what it points at goes: say goes-too or blocks, or make it optional.',
      '"T.x" says "cascade" for when what it points at goes; it must be one of goes-too, stays-unlinked, blocks.'
    ]);
  });
});

describe('WHEN_TARGET_GOES_BY_BACKEND', () => {
  it('has one cell per backend, and every cell that takes it away says why', () => {
    expect(Object.keys(WHEN_TARGET_GOES_BY_BACKEND).sort()).toEqual([...BACKEND_TYPES].sort());
    for (const cell of Object.values(WHEN_TARGET_GOES_BY_BACKEND)) if (cell.state !== 'supported') expect(cell.reason.length).toBeGreaterThan(20);
  });
});
