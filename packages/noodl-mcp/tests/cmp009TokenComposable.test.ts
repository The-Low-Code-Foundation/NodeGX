/**
 * P102 CMP-009 — `validate_project` warns on a custom token the composer cannot open, through the
 * server, and stays silent on a fresh project and on each shipped Look (AC2).
 */
import { call, connect, copyFixture, reveal } from './helpers';

type Report = { diagnostics: Array<{ code: string; message: string; suggestion?: string }> };

async function diagnosticsOf(projectDir: string, setup?: (s: Awaited<ReturnType<typeof connect>>) => Promise<void>) {
  const session = await connect(projectDir, true);
  try {
    await reveal(session, 'theme');
    if (setup) await setup(session);
    const { data } = await call<Report>(session, 'validate_project', {});
    return data.diagnostics.filter((d) => d.code === 'token-not-composable');
  } finally {
    await session.close();
  }
}

describe('CMP-009 — validate_project and token-not-composable', () => {
  it('reports the em shadow by name, value and reason, with a suggested spelling', async () => {
    const out = await diagnosticsOf(copyFixture(), async (s) => {
      await call(s, 'set_project_tokens', { tokens: [{ name: '--shadow-md', value: '0 0.5em 1em #000' }] });
    });
    expect(out).toHaveLength(1);
    expect(out[0].message).toContain('--shadow-md');
    expect(out[0].message).toContain('0 0.5em 1em #000');
    expect(out[0].message).toContain('lengths must be px');
    expect(out[0].suggestion).toBe('--shadow-md: 0 8px 16px #000');
  });

  it('reports none on a fresh project', async () => {
    expect(await diagnosticsOf(copyFixture())).toEqual([]);
  });

  it.each(['minimal', 'playful', 'enterprise', 'soft'])('reports none after set_style_preset(%s)', async (preset) => {
    const out = await diagnosticsOf(copyFixture(), async (s) => {
      await call(s, 'set_style_preset', { preset_id: preset });
    });
    expect(out).toEqual([]);
  });
});
