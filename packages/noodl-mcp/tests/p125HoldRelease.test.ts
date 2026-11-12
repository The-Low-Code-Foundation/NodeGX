/**
 * P125-PUPPY2 (Richard, 2026-10-24): "if the user hits hold, then asks for something like a colour change, the hold
 * should probably be auto-lifted by the model". `release_hold` lifts it on the person's words, and never in the turn
 * the hold stopped: the server sees that turn as calls the hold refused, so a release within
 * RELEASE_AFTER_REFUSAL_MS of a refusal is refused. "The next turn" is played by moving the clock past that window.
 *
 * Every lift has its control beside it: the same call, in the same session, refused (or a no-op) one step earlier.
 *
 * @module noodl-mcp/tests/p125HoldRelease
 */
import * as fs from 'fs';
import * as path from 'path';

import { HOLD_EXEMPT, HOLD_FILE, RELEASE_AFTER_REFUSAL_MS } from '../src/hold';
import { call, connect, copyFixture, reveal, type TestSession } from './helpers';

type Refusal = { error: { code: string; message: string } };
type Released = { released: boolean; note: string; heldSince?: string };

describe('P125-PUPPY2 — the person’s next message lifts their hold', () => {
  let session: TestSession;
  let dir: string;
  const holdFile = () => path.join(dir, HOLD_FILE);
  const hold = () =>
    fs.writeFileSync(holdFile(), JSON.stringify({ by: 'NodeGX Studio', at: new Date().toISOString(), note: 'wrong colour' }));

  beforeEach(async () => {
    dir = copyFixture();
    session = await connect(dir);
    await reveal(session, 'project');
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await session.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('is exempt from the hold it lifts', () => {
    expect(HOLD_EXEMPT.has('release_hold')).toBe(true);
  });

  it('refuses in the turn the hold stopped, and lifts on the next one', async () => {
    hold();
    // the agent, mid-turn, is refused
    const refused = await call<Refusal>(session, 'list_components');
    expect(refused.data.error.code).toBe('held');
    expect(refused.data.error.message).toContain('release_hold');

    // …and tries to lift it straight away: refused, and the hold stays
    const same = await call<Refusal>(session, 'release_hold', { words: 'make it blue' });
    expect(same.isError).toBe(true);
    expect(same.data.error.code).toBe('held');
    expect(same.data.error.message).toContain('Not lifted');
    expect(fs.existsSync(holdFile())).toBe(true);

    // the person's next message, after the window
    const later = Date.now() + RELEASE_AFTER_REFUSAL_MS + 1000;
    jest.spyOn(Date, 'now').mockReturnValue(later);
    const next = await call<Released>(session, 'release_hold', { words: 'make it blue' });
    expect(next.isError).toBe(false);
    expect(next.data.released).toBe(true);
    expect(next.data.note).toContain('what_changed_since');
    expect(fs.existsSync(holdFile())).toBe(false);

    // and the tools run again
    expect((await call(session, 'list_components')).isError).toBe(false);
  });

  it('a hold pressed while the agent was idle (nothing refused) lifts on the person’s message', async () => {
    hold();
    const res = await call<Released>(session, 'release_hold', { words: 'now make the button green' });
    expect(res.data.released).toBe(true);
    expect(fs.existsSync(holdFile())).toBe(false);
  });

  it('with no hold it lifts nothing and says so', async () => {
    const res = await call<Released>(session, 'release_hold', { words: 'make it blue' });
    expect(res.isError).toBe(false);
    expect(res.data.released).toBe(false);
    expect(res.data.note).toContain('no hold');
  });

  it('asks for the person’s words', async () => {
    hold();
    const res = await call(session, 'release_hold', { words: '' });
    expect(res.isError).toBe(true);
    expect(fs.existsSync(holdFile())).toBe(true);
  });
});
