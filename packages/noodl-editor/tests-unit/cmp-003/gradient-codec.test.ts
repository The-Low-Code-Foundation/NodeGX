/**
 * P102 CMP-003 — the gradient codec, graded against the values that ship and the values an
 * agent writes (`linear-gradient(to right, #ff0000, #0000ff)` — RC-6b and RC-6c).
 */

import {
  decodeGradient,
  describeGradient,
  directionArrow,
  encodeGradient,
  GRADIENT_PRESETS,
  roundTripOutcome,
  type GradientDirection,
  type GradientModel
} from '@nodegx/project-contract/token-codecs';
import { DEFAULT_TOKENS } from '@nodegx/project-contract/tokens';

const DEFAULT_GRADIENTS = DEFAULT_TOKENS.filter((t) => t.category === 'gradient');

function linearDirection(model: GradientModel): GradientDirection | null {
  if (model.kind !== 'linear') throw new Error('expected a linear gradient');
  return model.direction;
}

describe('CMP-003 — the gradient codec', () => {
  it('reads all 5 default gradients and writes each back byte-identical, brand’s 115% stop included (AC1)', () => {
    expect(DEFAULT_GRADIENTS).toHaveLength(5);
    for (const token of DEFAULT_GRADIENTS) {
      const model = decodeGradient(token.value);
      expect(model).not.toBeNull();
      expect(encodeGradient(model!)).toBe(token.value);
      expect(roundTripOutcome('gradient', token.value)).toBe('visual');
    }
    const brand = decodeGradient(DEFAULT_GRADIENTS.find((t) => t.name === '--gradient-brand')!.value)!;
    expect(brand.stops[2].position).toBe(115);
  });

  it('the first five presets are exactly the five defaults; every preset round-trips', () => {
    const defaults = DEFAULT_GRADIENTS.map((t) => t.value).sort();
    expect(
      GRADIENT_PRESETS.slice(0, 5)
        .map((p) => p.value)
        .sort()
    ).toEqual(defaults);
    for (const preset of GRADIENT_PRESETS) {
      expect(encodeGradient(decodeGradient(preset.value)!)).toBe(preset.value);
    }
  });

  describe('🔴 the agent’s gradient (AC5, RC-6b, RC-6c)', () => {
    const AGENT = 'linear-gradient(to right, #ff0000, #0000ff)';

    it('decodes as visual: keyword direction, two Custom chips, no positions, and re-encodes byte-identical', () => {
      const model = decodeGradient(AGENT);
      expect(model).not.toBeNull();
      expect(model!.kind).toBe('linear');
      if (model!.kind !== 'linear') return;
      expect(model!.direction).toEqual({ kind: 'keyword', sides: ['right'] });
      expect(directionArrow(model!.direction)).toBe('right');
      expect(model!.stops).toEqual([
        { colour: { kind: 'literal', css: '#ff0000' } },
        { colour: { kind: 'literal', css: '#0000ff' } }
      ]);
      expect(encodeGradient(model!)).toBe(AGENT);
      expect(roundTripOutcome('gradient', AGENT)).toBe('visual-kept-literal');
    });

    it('pressing the *Towards the bottom* arrow keeps the keyword spelling and the missing positions', () => {
      const model = decodeGradient(AGENT)!;
      if (model.kind !== 'linear') throw new Error('linear');
      const direction: GradientDirection = { kind: 'keyword', sides: ['bottom'] };
      const pressed: GradientModel = { ...model, direction };
      expect(encodeGradient(pressed)).toBe('linear-gradient(to bottom, #ff0000, #0000ff)');
    });

    it('a corner keyword lights the same arrow as its angle', () => {
      const corner = decodeGradient('linear-gradient(to bottom right, #aaa, #bbb)');
      expect(corner).not.toBeNull();
      expect(directionArrow(linearDirection(corner!))).toBe('bottom right');
      const angle = decodeGradient('linear-gradient(135deg, #aaa, #bbb)');
      expect(directionArrow(linearDirection(angle!))).toBe('bottom right');
      expect(encodeGradient(corner!)).toBe('linear-gradient(to bottom right, #aaa, #bbb)');
    });

    it('`linear-gradient(#aaa, #bbb)` with no direction re-encodes with no direction (AC6)', () => {
      const model = decodeGradient('linear-gradient(#aaa, #bbb)');
      expect(model).not.toBeNull();
      expect(linearDirection(model!)).toBeNull();
      expect(encodeGradient(model!)).toBe('linear-gradient(#aaa, #bbb)');
    });

    it('a stop with no position followed by one with a position is kept as written', () => {
      const value = 'linear-gradient(90deg, var(--primary), transparent 80%)';
      expect(encodeGradient(decodeGradient(value)!)).toBe(value);
    });
  });

  describe('shape the codec refuses → text mode (AC4)', () => {
    it.each([
      ['conic', 'conic-gradient(from 0deg, red, blue)'],
      ['repeating', 'repeating-linear-gradient(45deg, red 0 10px, blue 10px 20px)'],
      ['a radial with a shape keyword', 'radial-gradient(circle at center, red, blue)'],
      ['a radial with a named size', 'radial-gradient(closest-side, red, blue)'],
      ['a colour-hint stop', 'linear-gradient(red, 30%, blue)'],
      ['a stop with two positions', 'linear-gradient(red 0% 10%, blue)'],
      ['a var() as a position', 'linear-gradient(red var(--x), blue)'],
      ['one stop', 'linear-gradient(red)'],
      ['no space after a comma', 'linear-gradient(90deg,red,blue)'],
      ['a plain colour', '#ff0000'],
      ['a direction with two vertical sides', 'linear-gradient(to top bottom, red, blue)']
    ])('%s', (_name, value) => {
      expect(decodeGradient(value)).toBeNull();
      expect(roundTripOutcome('gradient', value)).toBe('text');
    });
  });

  describe('the words (AC3)', () => {
    it('spotlight, moved to the top, says so', () => {
      const spotlight = decodeGradient(GRADIENT_PRESETS[2].value)!;
      expect(describeGradient(spotlight)).toBe('Radial · Primary → Foreground · glows from the top left');
      if (spotlight.kind !== 'radial') throw new Error('radial');
      const top = { ...spotlight, shape: { ...spotlight.shape!, x: 50, y: 0 } };
      expect(describeGradient(top)).toBe('Radial · Primary → Foreground · glows from the top');
      expect(encodeGradient(top)).toBe('radial-gradient(90% 120% at 50% 0%, var(--primary) 0%, var(--foreground) 70%)');
    });

    it('a linear with custom colours counts them', () => {
      expect(describeGradient(decodeGradient('linear-gradient(to right, #ff0000, #0000ff)')!)).toBe(
        'Linear · 2 colours · fades towards the right'
      );
      expect(describeGradient(decodeGradient(GRADIENT_PRESETS[0].value)!)).toBe(
        'Linear · Primary → Primary hover → Foreground · fades towards the bottom right'
      );
      expect(describeGradient(decodeGradient(GRADIENT_PRESETS[4].value)!)).toBe('Linear · 15% dark → 78% dark');
    });
  });
});
