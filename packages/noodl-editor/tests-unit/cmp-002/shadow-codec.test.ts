/**
 * P102 CMP-002 — the shadow codec, graded against the values that ship.
 *
 * The rule under every case (README §6.1): `encode(decode(v)) === v`, or `decode` is `null`. A
 * value the codec claims is written back byte-identical; a value it cannot read exactly opens as
 * text. RC-6a's kept-literal path is the first spec here because the product's own Playful Look
 * depends on it.
 */

import {
  decodeShadow,
  describeShadow,
  encodeShadow,
  px,
  SHADOW_PRESETS,
  shadowCodec,
  roundTripOutcome
} from '@nodegx/project-contract/token-codecs';
import { DEFAULT_TOKENS } from '@nodegx/project-contract/tokens';

const DEFAULT_SHADOWS = DEFAULT_TOKENS.filter((t) => t.category === 'shadow');

describe('CMP-002 — the shadow codec', () => {
  it('reads all 7 default shadows and writes each back byte-identical (AC1)', () => {
    expect(DEFAULT_SHADOWS).toHaveLength(7);
    for (const token of DEFAULT_SHADOWS) {
      const model = decodeShadow(token.value);
      expect(model).not.toBeNull();
      expect(encodeShadow(model!)).toBe(token.value);
      expect(roundTripOutcome('shadow', token.value)).toBe('visual');
    }
  });

  it('the first seven presets are exactly the seven defaults, so a default opens with its tile lit (AC2)', () => {
    const defaults = DEFAULT_SHADOWS.map((t) => t.value);
    expect(
      SHADOW_PRESETS.slice(0, 7)
        .map((p) => p.value)
        .sort()
    ).toEqual([...defaults].sort());
    for (const preset of SHADOW_PRESETS) {
      expect(encodeShadow(decodeShadow(preset.value)!)).toBe(preset.value);
    }
  });

  describe('🔴 RC-6a — the four Playful shadows come through as visual with a kept literal (AC4)', () => {
    const PLAYFUL = [
      '0 1px 3px rgb(139 92 246 / 0.1)',
      '0 4px 12px rgb(139 92 246 / 0.15)',
      '0 10px 20px rgb(139 92 246 / 0.15)',
      '0 20px 30px rgb(139 92 246 / 0.12)'
    ];

    it.each(PLAYFUL)('%s decodes with a Custom chip and re-encodes byte-identical', (value) => {
      const model = decodeShadow(value);
      expect(model).not.toBeNull();
      expect(model!.layers).toHaveLength(1);
      expect(model!.layers[0].colour).toEqual({ kind: 'literal', css: value.slice(value.indexOf('rgb')) });
      expect(encodeShadow(model!)).toBe(value);
      expect(roundTripOutcome('shadow', value)).toBe('visual-kept-literal');
    });

    it('sliding Softness on a Playful shadow changes only the blur; the purple is untouched', () => {
      const model = decodeShadow('0 4px 12px rgb(139 92 246 / 0.15)')!;
      const softer = { layers: [{ ...model.layers[0], blur: px(20) }] };
      expect(encodeShadow(softer)).toBe('0 4px 20px rgb(139 92 246 / 0.15)');
    });

    it('a hand-written `0 2px 4px rgba(0,0,0,.1)` does the same', () => {
      const value = '0 2px 4px rgba(0,0,0,.1)';
      const model = decodeShadow(value);
      expect(model!.layers[0].colour).toEqual({ kind: 'literal', css: 'rgba(0,0,0,.1)' });
      expect(encodeShadow(model!)).toBe(value);
    });

    it('a #hex colour and a named colour are kept the same way', () => {
      for (const value of [
        '0 2px 4px #7c3aed',
        '0 2px 4px 0 rebeccapurple',
        'inset 0 1px 0 rgba(255, 255, 255, 0.4)'
      ]) {
        expect(encodeShadow(decodeShadow(value)!)).toBe(value);
      }
    });
  });

  describe('what the controls can pick (RC-2)', () => {
    it('black and white at a strength, in the space-separated spelling the defaults use', () => {
      expect(decodeShadow('0 1px 2px 0 rgb(0 0 0 / 0.05)')!.layers[0].colour).toEqual({ kind: 'black', alpha: 0.05 });
      expect(decodeShadow('0 1px 2px 0 rgb(255 255 255 / 0.4)')!.layers[0].colour).toEqual({
        kind: 'white',
        alpha: 0.4
      });
    });

    it('a project colour', () => {
      expect(decodeShadow('0 0 24px 0 var(--primary)')!.layers[0].colour).toEqual({ kind: 'token', name: '--primary' });
    });

    it('🔴 black spelled a way the Strength slider would re-serialise is kept as a literal, not re-picked', () => {
      // `String(0.10)` is `0.1`, so a slider writing this back would change the text.
      const model = decodeShadow('0 1px 2px rgb(0 0 0 / 0.10)');
      expect(model!.layers[0].colour).toEqual({ kind: 'literal', css: 'rgb(0 0 0 / 0.10)' });
      expect(encodeShadow(model!)).toBe('0 1px 2px rgb(0 0 0 / 0.10)');
    });
  });

  describe('spelling is kept, never normalised (README §6.2)', () => {
    it('`0` stays `0` and `0px` stays `0px`', () => {
      expect(encodeShadow(decodeShadow('0px 2px 4px 0px rgb(0 0 0 / 0.1)')!)).toBe('0px 2px 4px 0px rgb(0 0 0 / 0.1)');
      expect(encodeShadow(decodeShadow('0 2px 4px 0 rgb(0 0 0 / 0.1)')!)).toBe('0 2px 4px 0 rgb(0 0 0 / 0.1)');
    });

    it('🔴 a mutant encoder that wrote `0px` for `0` would be caught here', () => {
      const model = decodeShadow('0 2px 4px 0 rgb(0 0 0 / 0.1)')!;
      const mutant = { layers: model.layers.map((l) => ({ ...l, x: { n: 0, css: '0px' } })) };
      expect(encodeShadow(mutant)).not.toBe('0 2px 4px 0 rgb(0 0 0 / 0.1)');
    });

    it('a value whose spacing the writer would change opens as text rather than being tidied', () => {
      expect(decodeShadow('0 2px  4px rgb(0 0 0 / 0.1)')).toBeNull();
      expect(decodeShadow('0 2px 4px rgb(0 0 0 / 0.1),0 1px 2px rgb(0 0 0 / 0.1)')).toBeNull();
      expect(decodeShadow(' 0 2px 4px rgb(0 0 0 / 0.1)')).toBeNull();
    });
  });

  describe('shape the codec refuses → text mode (CMP-002 §3, AC5)', () => {
    it.each([
      ['em lengths', '0 0.5em 1em rgb(0 0 0 / 0.1)'],
      ['rem lengths', '0 0.5rem 1rem #000'],
      ['a colour before the lengths', 'rgb(0 0 0 / 0.1) 0 2px 4px'],
      ['more than four lengths', '0 1px 2px 3px 4px rgb(0 0 0 / 0.1)'],
      ['two colours', '0 1px 2px red blue'],
      ['a layer with no colour', '0 1px 2px'],
      ['inset at the end', '0 1px 2px rgb(0 0 0 / 0.1) inset'],
      ['unbalanced parentheses', '0 1px 2px rgb(0 0 0 / 0.1'],
      ['an unknown keyword', 'unset'],
      ['an empty layer', '0 1px 2px #000, ']
    ])('%s', (_name, value) => {
      expect(decodeShadow(value)).toBeNull();
      expect(roundTripOutcome('shadow', value)).toBe('text');
    });
  });

  describe('the words', () => {
    it('names a default by its preset', () => {
      expect(describeShadow(decodeShadow('none')!)).toBe('No shadow');
      expect(describeShadow(decodeShadow(SHADOW_PRESETS[2].value)!)).toBe('Shadow · soft · 2 layers');
      expect(describeShadow(decodeShadow(SHADOW_PRESETS[1].value)!)).toBe('Shadow · subtle');
      expect(describeShadow(decodeShadow(SHADOW_PRESETS[6].value)!)).toBe('Shadow · inside the box');
    });

    it('describes a layer that matches no preset in words', () => {
      expect(describeShadow(decodeShadow('0 4px 12px rgb(139 92 246 / 0.15)')!)).toBe(
        'Shadow · falls 4px down · soft · custom colour'
      );
      expect(describeShadow(decodeShadow('0 0 24px 0 var(--primary)')!)).toBe('Shadow · glow');
      expect(describeShadow(decodeShadow('0 0 20px 0 var(--primary)')!)).toBe(
        'Shadow · all the way round · very soft · Primary'
      );
    });
  });

  it('is the codec the category table hands out', () => {
    expect(shadowCodec.presets).toBe(SHADOW_PRESETS);
  });
});
