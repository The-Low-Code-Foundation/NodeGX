/**
 * P102 CMP-004 — the easing and duration codecs (AC1, AC3's words).
 */

import {
  decodeDuration,
  decodeEasing,
  describeDuration,
  describeEasing,
  DURATION_PRESETS,
  EASING_PRESETS,
  encodeDuration,
  encodeEasing,
  roundTripOutcome
} from '@nodegx/project-contract/token-codecs';
import { DEFAULT_TOKENS } from '@nodegx/project-contract/tokens';

describe('CMP-004 — easing', () => {
  const defaults = DEFAULT_TOKENS.filter((t) => t.category === 'animation-easing');

  it('reads all 5 default easings and writes each back byte-identical, --ease-bounce outside 0–1 included', () => {
    expect(defaults).toHaveLength(5);
    for (const token of defaults) {
      const model = decodeEasing(token.value);
      expect(model).not.toBeNull();
      expect(encodeEasing(model!)).toBe(token.value);
      expect(roundTripOutcome('animation-easing', token.value)).toBe('visual');
    }
    const bounce = decodeEasing('cubic-bezier(0.68, -0.55, 0.265, 1.55)');
    expect(bounce).toEqual({ kind: 'bezier', points: [0.68, -0.55, 0.265, 1.55] });
  });

  it('the first five presets are exactly the five defaults', () => {
    const values = defaults.map((t) => t.value).sort();
    expect(
      EASING_PRESETS.slice(0, 5)
        .map((p) => p.value)
        .sort()
    ).toEqual(values);
  });

  it.each([
    ['ease', 'ease'],
    ['ease-in-out', 'ease-in-out'],
    ['steps()', 'steps(4, end)'],
    ['no space after the commas', 'cubic-bezier(0.4,0,1,1)'],
    ['three points', 'cubic-bezier(0.4, 0, 1)'],
    ['an x outside 0–1', 'cubic-bezier(1.2, 0, 1, 1)']
  ])('refuses %s to text mode', (_name, value) => {
    expect(decodeEasing(value)).toBeNull();
  });

  it('says the tile name and its words, or *Your own curve*', () => {
    expect(describeEasing(decodeEasing('cubic-bezier(0, 0, 0.2, 1)')!)).toBe(
      'Slows at the end · starts fast, eases into place'
    );
    expect(describeEasing(decodeEasing('linear')!)).toBe('Steady · the same speed all the way');
    expect(describeEasing(decodeEasing('cubic-bezier(0.1, 0.7, 0.9, 0.3)')!)).toBe('Your own curve');
  });
});

describe('CMP-004 — duration', () => {
  const defaults = DEFAULT_TOKENS.filter((t) => t.category === 'animation-duration');

  it('reads all 8 default durations and writes each back byte-identical', () => {
    expect(defaults).toHaveLength(8);
    for (const token of defaults) {
      const model = decodeDuration(token.value);
      expect(model).not.toBeNull();
      expect(encodeDuration(model!)).toBe(token.value);
    }
  });

  it('every chip is one of the defaults', () => {
    const values = defaults.map((t) => t.value);
    for (const preset of DURATION_PRESETS) expect(values).toContain(preset.value);
  });

  it.each([
    ['seconds', '0.3s'],
    ['a bare number', '300'],
    ['a negative', '-1ms'],
    ['a leading dot', '.5ms']
  ])('refuses %s to text mode', (_name, value) => {
    expect(decodeDuration(value)).toBeNull();
  });

  it('reads *Quick · 150 ms* and says what an odd number feels like', () => {
    expect(describeDuration(decodeDuration('150ms')!)).toBe('Quick · 150 ms');
    expect(describeDuration(decodeDuration('325ms')!)).toBe('325 ms · noticeable');
  });
});
