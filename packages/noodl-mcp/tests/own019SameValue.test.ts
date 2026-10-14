/**
 * 🔴 P112-OWN019-SAMEVALUE — a Function's notes say an output set to the value it already holds sends nothing.
 *
 * Mistral's "Pack It" (OWN-019 s2, round pk1) set `Outputs.error = "Type an item first"` on every empty Add while a
 * Set Variable cleared the message on typing: the second refusal sent nothing (`simplejavascript.ts` publishes an
 * output only when its value changes, kept on purpose), so the message never came back. The grader caught it; the
 * agent's own drives did not, and nothing in the notes it read named the rule. Read as the agent gets it.
 */
import { call, connect, copyFixture, type TestSession } from './helpers';

let session: TestSession;

beforeAll(async () => {
  session = await connect(copyFixture());
});

afterAll(async () => {
  await session.close();
});

it('get_node_type JavaScriptFunction names the same-value rule and the signal that gets past it', async () => {
  const res = await call<unknown>(session, 'get_node_type', { type_names: ['JavaScriptFunction'], detail: 'full' });
  const text = JSON.stringify(res.data);
  expect(text).toContain('An output is sent only when its value changes');
  expect(text).toContain('send a signal beside the value');
});
