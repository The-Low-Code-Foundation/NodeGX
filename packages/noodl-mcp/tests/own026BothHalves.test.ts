/**
 * P112 OWN-026 FIX-07 A — the negative half in the verify step, at the seams the model was measured reading.
 *
 * A stranger's build verified by driving the page, and drove only the half it had just made appear: a setting switched
 * on and its new items seen, a delete armed; never the setting off and what it governs, never a cancel. Three checks
 * were lost for three changes running. The plain-code arm wrote tests for the bounds. Graded through the doors:
 *  1. `get_project_info`'s readFirst (what every build is handed) says to drive both ways.
 *  2. `drive_page`'s own description (the last text before its first drive) says the same, briefly.
 *  3. The traps section's "verify by looking" says it in full.
 *  4. Every pass says what a pass proves (`BOTH_HALVES`; the headline itself is graded by isl021DrivePage).
 */
import { BOTH_HALVES } from '../src/tools/renderTools';
import { call, connect, copyFixture, reveal, TestSession } from './helpers';

jest.setTimeout(60000);

describe('FIX-07 A: the other half of a drive, where verifying is taught', () => {
  let session: TestSession;
  beforeAll(async () => {
    session = await connect(copyFixture());
  });
  afterAll(async () => {
    await session.close();
  });

  it('readFirst says to drive both ways', async () => {
    const info = await call<{ readFirst: unknown }>(session, 'get_project_info');
    const text = JSON.stringify(info.data.readFirst);
    expect(text).toContain('drive_page both ways');
    expect(text).toContain('a confirmation by its cancel');
  });

  it("drive_page's description says to prove both halves", async () => {
    await reveal(session, 'explore');
    const { tools } = await session.client.listTools();
    const drive = tools.find((t) => t.name === 'drive_page');
    expect(drive?.description).toContain('Prove both halves');
    expect(drive?.description).toContain('a confirmation by its cancel');
  });

  it('the traps section says it in full', async () => {
    const res = await call<{ text: string }>(session, 'get_project_info', { section: 'traps' });
    expect(JSON.stringify(res.data)).toContain('both ways: a setting switched off as well as on');
  });

  it('a pass names the other half, generically', () => {
    expect(BOTH_HALVES).toMatch(/^A pass proves the path you drove\./);
    for (const half of ['switched off as well as on', 'a limit at its edge', 'by its\ncancel'.replace('\n', ' ')]) expect(BOTH_HALVES).toContain(half);
  });
});
