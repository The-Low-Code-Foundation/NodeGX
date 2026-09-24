/**
 * P102 CMP-005 — the font-family codec: a lead font and a tail kept exactly (AC1).
 */

import {
  decodeFontFamily,
  describeFontFamily,
  encodeFontFamily,
  fontKind,
  fontLeadName,
  FONT_TAILS,
  withLeadFont
} from '@nodegx/project-contract/token-codecs';
import { DEFAULT_TOKENS } from '@nodegx/project-contract/tokens';

const SANS = "Inter, ui-sans-serif, system-ui, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji'";

describe('CMP-005 — the font-family codec', () => {
  const defaults = DEFAULT_TOKENS.filter((t) => t.category === 'typography-family');

  it('reads the 3 defaults and writes each back byte-identical', () => {
    expect(defaults).toHaveLength(3);
    for (const token of defaults) {
      const model = decodeFontFamily(token.value);
      expect(model).not.toBeNull();
      expect(encodeFontFamily(model!)).toBe(token.value);
    }
  });

  it('the sans default is lead Inter with the tail kept exactly, emoji fonts and quote style included', () => {
    const model = decodeFontFamily(SANS)!;
    expect(model.lead).toBe('Inter');
    expect(model.tail).toEqual(FONT_TAILS.sans);
    expect(fontKind(model)).toBe('sans');
    expect(describeFontFamily(model)).toBe('Inter · sans serif');
  });

  it('a stack that starts with a generic reads as a system font', () => {
    const serif = decodeFontFamily("ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif")!;
    expect(fontLeadName(serif)).toBe('System serif');
    expect(describeFontFamily(serif)).toBe('System serif');
    const mono = decodeFontFamily("ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace")!;
    expect(describeFontFamily(mono)).toBe('System mono');
  });

  it('the Playful Look’s stack round-trips with its double quotes', () => {
    const value = '"Nunito", "Quicksand", ui-sans-serif, sans-serif';
    const model = decodeFontFamily(value)!;
    expect(model.lead).toBe('"Nunito"');
    expect(encodeFontFamily(model)).toBe(value);
    expect(describeFontFamily(model)).toBe('Nunito · sans serif');
  });

  describe('picking a font (AC2)', () => {
    it('the same kind keeps the tail', () => {
      const { model, tailChanged } = withLeadFont(decodeFontFamily(SANS)!, 'Lora', 'sans');
      expect(tailChanged).toBe(false);
      expect(encodeFontFamily(model)).toBe(SANS.replace('Inter', 'Lora'));
    });

    it('a different kind swaps the tail for that kind’s default, and says so', () => {
      const { model, tailChanged } = withLeadFont(decodeFontFamily(SANS)!, 'Lora', 'serif');
      expect(tailChanged).toBe(true);
      expect(encodeFontFamily(model)).toBe(`Lora, ${FONT_TAILS.serif.join(', ')}`);
    });

    it('quotes a name only when it has a space, in the style the tail uses', () => {
      const { model } = withLeadFont(decodeFontFamily(SANS)!, 'DM Sans', 'sans');
      expect(model.lead).toBe("'DM Sans'");
      const playful = decodeFontFamily('"Nunito", "Quicksand", ui-sans-serif, sans-serif')!;
      expect(withLeadFont(playful, 'Space Grotesk', 'sans').model.lead).toBe('"Space Grotesk"');
    });
  });

  it('reads the one-entry family UPG-003 mints from a text style, and keeps its empty tail', () => {
    const model = decodeFontFamily("'Inter'")!;
    expect(model).toEqual({ lead: "'Inter'", tail: [] });
    expect(encodeFontFamily(model)).toBe("'Inter'");
    expect(describeFontFamily(model)).toBe('Inter · sans serif');
    expect(encodeFontFamily(withLeadFont(model, 'Lora', 'sans').model)).toBe('Lora');
    expect(encodeFontFamily(withLeadFont(model, 'Lora', 'serif').model)).toBe(`Lora, ${FONT_TAILS.serif.join(', ')}`);
  });

  it.each([
    ['no space after a comma', 'Inter,sans-serif'],
    ['an empty entry', 'Inter, , sans-serif'],
    ['an unclosed quote', "'Apple Color Emoji, sans-serif"]
  ])('refuses %s to text mode', (_name, value) => {
    expect(decodeFontFamily(value)).toBeNull();
  });
});
