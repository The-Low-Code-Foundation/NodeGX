/**
 * P128-S3-SIZEMSG — a refused size names the token form, and points at the token the refused value already holds.
 *
 * Richard's AC8 run (2026-10-27, Claude Desktop, "Make the number bigger" on the Tap Counter): the agent wrote
 * `fontSize: "calc(var(--display-lg) * 1.8)"`, was told the port "expects a number or { "value", "unit" } object" and
 * offered `{"value":16,"unit":"px"}`, tried `{ value: 20, unit: "vw" }` (refused: px only), and found the token form on
 * its third write. The check accepts three forms; the refusal named two.
 */
import { loadDefaultCatalog } from '../../src/editor/src/validation/catalog';
import { checkParameterValues } from '../../src/editor/src/validation/parameterValues';

const catalog = loadDefaultCatalog();

function refusal(value: unknown) {
  const out = checkParameterValues([{ id: 'n', type: 'Text', parameters: { fontSize: value } }], catalog, {
    component: '/Test'
  }).filter((d) => d.severity === 'error');
  expect(out).toHaveLength(1);
  return out[0];
}

describe('P128-S3-SIZEMSG — a refused size names all three forms', () => {
  it('the agent\'s calc: names the token form, and suggests the token it already wrote, not 16px', () => {
    const d = refusal('calc(var(--display-lg) * 1.8)');
    expect(d.message).toContain('a number, a { "value", "unit" } object or a var(--token) reference');
    expect(d.message).toContain('use var(--display-lg)');
    expect(d.suggestion).toBe('"var(--display-lg)"');
  });

  it('a value with no token in it: the three forms named, the stock object suggested as before', () => {
    const d = refusal(true);
    expect(d.message).toContain('or a var(--token) reference');
    expect(d.message).not.toContain('token alone');
    expect(d.suggestion).toBe('{"value":16,"unit":"px"}');
  });

  it('controls: the token alone, a number and the object form are accepted', () => {
    for (const ok of ['var(--display-lg)', 24, { value: 24, unit: 'px' }]) {
      const out = checkParameterValues([{ id: 'n', type: 'Text', parameters: { fontSize: ok } }], catalog, {
        component: '/Test'
      }).filter((x) => x.severity === 'error');
      expect({ ok, errors: out.length }).toEqual({ ok, errors: 0 });
    }
  });
});
