/**
 * P102 CMP-009 — `token-not-composable`, the validator's half of "the agent writes what the
 * composer reads".
 */
import { codecForCategory, refusalReason, roundTripOutcome } from '@nodegx/project-contract/token-codecs';
import { DEFAULT_TOKENS } from '@nodegx/project-contract/tokens';

import {
  EnterprisePreset,
  MinimalPreset,
  PlayfulPreset,
  SoftPreset
} from '../../src/editor/src/models/StylePresets/presets';
import { COMPOSABLE_SPELLINGS } from '../../src/editor/src/models/StyleTokensModel/StyleVocabulary';
import { DiagnosticCode } from '../../src/editor/src/validation/diagnostics';
import { checkTokenComposable, composerCodecs } from '../../src/editor/src/validation/tokenComposable';

const category = (name: string) => DEFAULT_TOKENS.find((t) => t.name === name)?.category;

function custom(name: string, value: string) {
  return { name, value, category: category(name), isCustom: true };
}

describe('CMP-009 — token-not-composable', () => {
  it('🔴 reads its codecs from the ONE module the editor and the census import (AC4)', () => {
    expect(composerCodecs.codecForCategory).toBe(codecForCategory);
    expect(composerCodecs.roundTripOutcome).toBe(roundTripOutcome);
    expect(composerCodecs.refusalReason).toBe(refusalReason);
  });

  it('names the token, the value and the reason for an em shadow, and nothing else (AC2)', () => {
    const out = checkTokenComposable({
      tokens: [...DEFAULT_TOKENS, custom('--shadow-md', '0 0.5em 1em #000')],
      component: '/App'
    });
    expect(out).toHaveLength(1);
    expect(out[0].code).toBe(DiagnosticCode.TokenNotComposable);
    expect(out[0].severity).toBe('warning');
    expect(out[0].message).toContain('--shadow-md');
    expect(out[0].message).toContain('0 0.5em 1em #000');
    expect(out[0].message).toContain('lengths must be px');
    expect(out[0].suggestion).toBe('--shadow-md: 0 8px 16px #000');
    expect(out[0].location.component).toBe('/App');
  });

  it('reports none on the defaults and on each of the four Looks (AC2, CMP-006 corpus 2 at text = 0)', () => {
    expect(checkTokenComposable({ tokens: DEFAULT_TOKENS, component: '/App' })).toEqual([]);
    for (const look of [PlayfulPreset, MinimalPreset, EnterprisePreset, SoftPreset]) {
      const tokens = [...DEFAULT_TOKENS, ...Object.entries(look.tokens).map(([name, value]) => custom(name, value))];
      expect(checkTokenComposable({ tokens, component: '/App' })).toEqual([]);
    }
  });

  it('judges only the five composer types, and only custom tokens', () => {
    const out = checkTokenComposable({
      tokens: [
        custom('--radius-md', 'not a radius'),
        { name: '--shadow-md', value: '0 0.5em 1em #000', category: 'shadow', isCustom: false }
      ],
      component: '/App'
    });
    expect(out).toEqual([]);
  });

  it('suggests a spelling one edit away for each type it knows one for', () => {
    const cases: [string, string, string][] = [
      ['--gradient-brand', 'linear-gradient(90deg,#fff,#000)', '--gradient-brand: linear-gradient(90deg, #fff, #000)'],
      ['--ease-out', 'cubic-bezier(0,0,0.2,1)', '--ease-out: cubic-bezier(0, 0, 0.2, 1)'],
      ['--duration-300', '0.3s', '--duration-300: 300ms'],
      ['--font-sans', 'Inter,sans-serif', '--font-sans: Inter, sans-serif']
    ];
    for (const [name, value, suggestion] of cases) {
      const out = checkTokenComposable({ tokens: [custom(name, value)], component: '/App' });
      expect(out).toHaveLength(1);
      expect(out[0].suggestion).toBe(suggestion);
    }
  });

  it('the grammar the vocabulary teaches decodes under the codecs it describes', () => {
    // The line is prose for a model; what can be graded is that its examples are the codecs' shapes.
    expect(COMPOSABLE_SPELLINGS).toContain('COMPOSABLE SPELLINGS');
    for (const [cat, value] of [
      ['shadow', '0 4px 6px -1px rgb(0 0 0 / 0.1)'],
      ['gradient', 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)'],
      ['gradient', 'radial-gradient(90% 120% at 20% 0%, var(--primary) 0%, transparent 70%)'],
      ['animation-easing', 'cubic-bezier(0.4, 0, 0.2, 1)'],
      ['animation-duration', '150ms'],
      ['typography-family', 'Inter, sans-serif']
    ]) {
      expect(roundTripOutcome(cat, value)).toBe('visual');
    }
  });
});
