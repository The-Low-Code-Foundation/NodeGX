/**
 * P127-BKO006-TRIGGERNAME — a trigger names the function the backend serves.
 *
 * The book club's agent named "Weekly Digest"; the backend serves "Cloud Functions/Weekly Digest", and
 * `deploy_cloud_functions` had reported "/#__cloud__/Cloud Functions/Weekly Digest". The trigger was stored as asked and
 * failed at its first fire. `resolveFunctionName` is the rule the trigger tools apply to what the backend serves.
 */
import { resolveFunctionName } from '../src/backend/functionTarget';

const served = ['Cloud Functions/Weekly Digest', 'Cloud Functions/Club Top Five', 'Admin/Tidy', 'Jobs/Tidy'];

describe('P127-BKO006-TRIGGERNAME — resolveFunctionName', () => {
  it('a served name is kept', () => {
    expect(resolveFunctionName('Cloud Functions/Weekly Digest', served)).toEqual({ kind: 'served', name: 'Cloud Functions/Weekly Digest' });
  });

  it('the short name, and the deploy answer’s own spelling, become the served name, said', () => {
    for (const asked of ['Weekly Digest', '/#__cloud__/Cloud Functions/Weekly Digest', '#__cloud__/Cloud Functions/Weekly Digest']) {
      const found = resolveFunctionName(asked, served);
      expect(found).toMatchObject({ kind: 'resolved', name: 'Cloud Functions/Weekly Digest' });
      expect((found as { note: string }).note).toContain(asked);
    }
  });

  it('a name two functions end with is not guessed', () => {
    expect(resolveFunctionName('Tidy', served)).toMatchObject({ kind: 'ambiguous', matches: ['Admin/Tidy', 'Jobs/Tidy'] });
  });

  it('a part of a name is not a match', () => {
    expect(resolveFunctionName('Digest', served).kind).toBe('unknown');
  });

  it('a name nothing serves is kept, with a warning that names what is served', () => {
    const found = resolveFunctionName('Monthly Digest', served);
    expect(found).toMatchObject({ kind: 'unknown', name: 'Monthly Digest' });
    expect((found as { warning: string }).warning).toMatch(/fails every time it fires/);
    expect((found as { warning: string }).warning).toContain('"Cloud Functions/Weekly Digest"');
    expect((resolveFunctionName('Anything', []) as { warning: string }).warning).not.toMatch(/It serves/);
  });
});
