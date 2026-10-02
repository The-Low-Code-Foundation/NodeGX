/**
 * ISL-022 AC1 (the validator half) — what the wrapped-row warning says about Olive's Island, by node, at HEAD.
 *
 * `uncollapsible-multi-column` fires on three of the garden's components, and the garden's own gate pins exactly those
 * (`cg003Template.test.ts`, "D50 (filed)"). ISL-022 §2 derived from the rule's source which node in each one fires,
 * without running it: `brBar` (arm A, a band of five content-sized tracks), `rcColourRow` and `opColourRow` (arm B, a
 * wrapped row with a gap over a For Each of 44 px swatches) — and NOTHING on `brTabs`, the row that actually overflowed
 * the phone (CG-003 §7.2: the page was 506 px wide at 390). This spec runs the door's own `validate_component` over a
 * copy of the shipped template and pins those readings, so AC2's change moves them by name.
 *
 * 🔴 The editor's `validate:project` CLI reports 0 warnings over the same template (1,101 nodes): its rule set does not
 * include the responsive-arrangement rules the door runs. Measured 2026-10-02; this spec is the door's reading.
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { call, connect, type TestSession } from './helpers';

const GARDEN = path.resolve(__dirname, '..', '..', '..', 'templates', 'bot-garden');
const CODE = 'uncollapsible-multi-column';

interface Diagnostic {
  code: string;
  severity: string;
  message: string;
  location?: { nodeId?: string; component?: string };
}

let session: TestSession;
let tempRoot: string;

beforeAll(async () => {
  tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'isl022-'));
  const dir = path.join(tempRoot, 'bot-garden');
  fs.cpSync(GARDEN, dir, { recursive: true });
  session = await connect(dir, false);
}, 120_000);

afterAll(async () => {
  await session?.close();
  fs.rmSync(tempRoot, { recursive: true, force: true });
});

async function warned(component: string): Promise<Array<{ nodeId?: string; arm: string }>> {
  const v = await call<{ diagnostics: Diagnostic[] }>(session, 'validate_component', { path: component });
  return v.data.diagnostics
    .filter((d) => d.code === CODE)
    .map((d) => ({
      nodeId: d.location?.nodeId,
      // Arm A names the tracks it counted; arm B names the Repeater it wraps.
      arm: /arranges \d+ columns/.test(d.message) ? 'A' : /wraps a Repeater/.test(d.message) ? 'B' : '?'
    }));
}

describe('ISL-022 AC1 — the wrapped-row warning on the island, by node, at HEAD', () => {
  test('Garden/Top bar: arm A on brBar (the bar, which wraps on purpose) — and nothing on brTabs, the row that overflowed', async () => {
    const got = await warned('/Garden/Top bar');
    expect(got).toEqual([{ nodeId: 'brBar', arm: 'A' }]);
    expect(got.map((g) => g.nodeId)).not.toContain('brTabs');
  });

  test('Robot/Card: arm B on rcColourRow (a wrapped row of 44 px swatches)', async () => {
    expect(await warned('/Robot/Card')).toEqual([{ nodeId: 'rcColourRow', arm: 'B' }]);
  });

  test('Robot/Options: arm B on opColourRow (the same swatches)', async () => {
    expect(await warned('/Robot/Options')).toEqual([{ nodeId: 'opColourRow', arm: 'B' }]);
  });
});
