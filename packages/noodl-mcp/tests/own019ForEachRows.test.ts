/**
 * P112 OWN-019 s3 — For Each's notes answer the three questions Large 4 kept working out in its thinks.
 *
 * Mined from s2's journals (15 rounds, `reasoning_content`): "at the moment itemOutputSignal-clicked fires, has
 * itemOutput-index arrived?" (8 rounds), "For Each provides itemIndex?" (11), "can a signal carry a value?" (12) —
 * none answered in the notes, so each round reasoned it out again, v6 by grepping the runtime's source in the npx
 * cache. Ground truth: `foreach.tsx` fills every `itemOutput-*` and `itemActionItemId` before `itemOutputSignal-*`;
 * a node takes waiting values before waiting signals (`node.ts`); rows get only `id` and the mapped item fields; plain
 * items are matched by `id` or object identity (`collection.ts`). Read as the agent gets it.
 */
import { call, connect, copyFixture, type TestSession } from './helpers';

let session: TestSession;

beforeAll(async () => {
  session = await connect(copyFixture());
});

afterAll(async () => {
  await session.close();
});

it('get_node_type For Each says the values arrive before the signal, there is no row index, and rows match by id', async () => {
  const res = await call<unknown>(session, 'get_node_type', { type_names: ['For Each'], detail: 'full' });
  const text = JSON.stringify(res.data);
  expect(text).toContain('For Each first fills every `itemOutput-<name>`');
  expect(text).toContain('A signal itself carries no value');
  expect(text).toContain('There is no row-index port');
  expect(text).toContain('Give each item a stable `id`');
});
