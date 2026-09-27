/**
 * P99 HLT-022 (a) — `Noodl.Records.query/fetch(…, { plain: true })` returns the row as saved.
 *
 * The default read makes every nested object a Model with a generated id, and a Model's `id` is
 * read-only — so a lesson's sections came back with every `id` replaced, and a facts map grew an
 * `id` per read. The option is for a cloud function, which wants the row; the default is pinned
 * here too, because every app binding depends on it.
 */
jest.mock('../../noodl-runtime', () => ({
  instance: { getMetaData: () => undefined }
}));

import CloudStore = require('../../src/api/cloudstore');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const createRecordsAPI = require('../../src/api/records');

/* eslint-disable @typescript-eslint/no-explicit-any */
type Any = any;

const DUE = '2026-09-23T09:00:00.000Z';
/** A row as the backend puts it on the Parse wire (AdapterFacade.toWire). */
const wireRow = () => ({
  objectId: 'lesson1',
  createdAt: '2026-09-23T08:00:00.000Z',
  updatedAt: '2026-09-23T08:00:00.000Z',
  ACL: { '*': { read: true } },
  title: 'Lesson one',
  sections: [{ id: 's1', text: 'Intro' }, { id: 's2', text: 'Body', tags: ['a'] }],
  facts: { likes: 'tea', level: 3, nested: { id: 'keep-me' } },
  note: '[1,2]',
  due: { __type: 'Date', iso: DUE },
  owner: { __type: 'Pointer', className: '_User', objectId: 'u1' },
  trainer: { __type: 'Object', className: '_User', objectId: 'u2', name: 'Sam', due: { __type: 'Date', iso: DUE } },
  learners: { __type: 'Relation', className: '_User' }
});

/** What the author saved, and what `plain` must hand back. */
const expectedPlain = {
  objectId: 'lesson1',
  createdAt: '2026-09-23T08:00:00.000Z',
  updatedAt: '2026-09-23T08:00:00.000Z',
  title: 'Lesson one',
  sections: [{ id: 's1', text: 'Intro' }, { id: 's2', text: 'Body', tags: ['a'] }],
  facts: { likes: 'tea', level: 3, nested: { id: 'keep-me' } },
  note: '[1,2]',
  due: DUE,
  owner: 'u1',
  trainer: { objectId: 'u2', name: 'Sam', due: DUE }
};

let spies: jest.SpyInstance[] = [];
beforeEach(() => {
  spies = [
    jest.spyOn(CloudStore.prototype as Any, 'query').mockImplementation(function (this: Any, o: Any) {
      o.success([wireRow()]);
    }),
    jest.spyOn(CloudStore.prototype as Any, 'fetch').mockImplementation(function (this: Any, o: Any) {
      o.success(wireRow());
    })
  ];
});
afterEach(() => spies.forEach((s) => s.mockRestore()));

describe('HLT-022 — { plain: true }', () => {
  test('query returns the rows as saved: nested ids kept, objectId on the row, envelopes unwrapped', async () => {
    const Records = createRecordsAPI();
    const rows = await Records.query('Lesson', {}, { plain: true });
    expect(rows).toEqual([expectedPlain]);
    expect(typeof rows[0].getId).toBe('undefined');
  });

  test('fetch returns the row as saved', async () => {
    const Records = createRecordsAPI();
    expect(await Records.fetch('lesson1', { className: 'Lesson', plain: true })).toEqual(expectedPlain);
  });

  test('two reads hand back two independent rows — no shared Model, no id grown on the map', async () => {
    const Records = createRecordsAPI();
    const a = await Records.fetch('lesson1', { className: 'Lesson', plain: true });
    const b = await Records.fetch('lesson1', { className: 'Lesson', plain: true });
    expect(b.facts).toEqual({ likes: 'tea', level: 3, nested: { id: 'keep-me' } });
    a.facts.likes = 'coffee';
    expect(b.facts.likes).toBe('tea');
  });
});

describe('HLT-022 — the default read is unchanged (AC3)', () => {
  test('query without the option still hands back Models, nested objects as Models with generated ids', async () => {
    const Records = createRecordsAPI();
    const rows = await Records.query('Lesson', {});
    expect(typeof rows[0].getId).toBe('function');
    expect(rows[0].getId()).toBe('lesson1');
    const sections = rows[0].get('sections');
    expect(typeof sections[0].getId).toBe('function');
    // This IS the defect for a function, and it is the Model contract for an app: pinned so the
    // default cannot drift by accident in either direction.
    expect(sections[0].getId()).not.toBe('s1');
  });

  test('fetch without the option still hands back a Model', async () => {
    const Records = createRecordsAPI();
    const m = await Records.fetch('lesson1', { className: 'Lesson' });
    expect(m.getId()).toBe('lesson1');
    expect(typeof m.get('facts').getId).toBe('function');
  });
});
