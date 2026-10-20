/**
 * P107 R40 (s105) — the agent server tells an agent what a node's saved settings make its runtime warn about, before the app
 * runs: the validator's `settings-diagnostic` rule, handed `settingsDiagnosticLookup` (the spec's `settings` diagnostics).
 * A warning: the write is taken, and `validate_component` names it in the runtime's own words.
 */
import type { ValidateComponentResponse } from '../src/tools/responses';
import { call, connect, copyFixture, TestSession } from './helpers';

jest.setTimeout(60000);

describe('R40 — a Counter whose Min Value is above its Max Value', () => {
  let session: TestSession;

  beforeAll(async () => {
    session = await connect(copyFixture());
  });

  afterAll(async () => {
    await session?.close();
  });

  it('is written (a warning does not refuse), and validate_component names it', async () => {
    const made = await call(session, 'create_component', {
      path: 'Stock/Wrong',
      nodes: [{ id: 'stock', type: 'Counter', label: 'Stock', parameters: { limitsEnabled: true, limitsMin: 10, limitsMax: 2 } }],
      connections: []
    });
    expect(made.isError).toBe(false);
    const v = await call<ValidateComponentResponse>(session, 'validate_component', { path: 'Stock/Wrong' });
    expect((v.data.diagnostics ?? []).filter((d) => d.code === 'settings-diagnostic').map((d) => `${d.severity}:${d.location?.nodeId}:${d.message}`)).toEqual([
      'warning:stock:"Stock" (Counter): Min Value 10 is above Max Value 2. With Limits Enabled on, the count gets stuck.'
    ]);
  });

  it('settings that agree say nothing (control)', async () => {
    const made = await call(session, 'create_component', {
      path: 'Stock/Right',
      nodes: [{ id: 'stock', type: 'Counter', label: 'Stock', parameters: { limitsEnabled: true, limitsMin: 2, limitsMax: 10 } }],
      connections: []
    });
    expect(made.isError).toBe(false);
    const v = await call<ValidateComponentResponse>(session, 'validate_component', { path: 'Stock/Right' });
    expect((v.data.diagnostics ?? []).filter((d) => d.code === 'settings-diagnostic')).toEqual([]);
  });
});
