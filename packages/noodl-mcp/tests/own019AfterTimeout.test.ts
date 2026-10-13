/**
 * 🔴 P112-OWN019-AFTERTIMEOUT — a Condition's notes say a gate on Run On Value Change fires mid-reset, and which value
 * to reset first.
 *
 * Mistral's quiz (OWN-019 s2, round v12) scored the right answer after a timed-out question as wrong: its timeout
 * Condition watched "time is up AND not answered" on value change, and moving on cleared `answered` while the
 * countdown still read 0 — the gate fired again, the next question started answered, its tap was refused. The same app
 * with the countdown reset first grades 12/12 (s3's control pair: 8/12 → 12/12, three wires re-pointed). Not the
 * runtime; nothing in the notes it read named the trap. Read as the agent gets it.
 */
import { call, connect, copyFixture, type TestSession } from './helpers';

let session: TestSession;

beforeAll(async () => {
  session = await connect(copyFixture());
});

afterAll(async () => {
  await session.close();
});

it('get_node_type Condition names the mid-reset fire and the order that avoids it', async () => {
  const res = await call<unknown>(session, 'get_node_type', { type_names: ['Condition'], detail: 'full' });
  const text = JSON.stringify(res.data);
  expect(text).toContain('fires the moment its condition is true, even for one step in the middle of a chain');
  expect(text).toContain('Reset the value that makes it true (the countdown back to 10) before the one that holds it off');
});
