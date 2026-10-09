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

function store(tables: Record<string, StorageColumn[]>, rows: Record<string, Row[]>) {
  const writes: string[] = [];
  const ctx: DeleteContext = {
    schema: { listTables: () => Object.keys(tables), getTableSchema: (t) => (tables[t] ? { name: t, columns: tables[t] } : null) },
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
    }
  };
  return { ctx, writes };
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
