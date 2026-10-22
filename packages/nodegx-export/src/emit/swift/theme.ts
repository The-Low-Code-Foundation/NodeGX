/**
 * EXP-022. `Theme.swift` — the project's design tokens as Swift constants, and the reader that turns a CSS value the
 * shared style layer printed (`var(--space-6)`, `#8a4f16`, `14px`, `0.1em`) into the Swift expression for it.
 *
 * The style layer (`../style.ts` `computeNodeStyle`) is the same one the React printer reads; it speaks CSS because the
 * runtime does. This file is the one place that CSS vocabulary meets SwiftUI's, so a token value the Swift target cannot
 * read is named here once, never guessed.
 *
 * @module emit/swift/theme
 */

import type { TokenIR } from '../../ir/types';

/** A value the Swift side can print: a color, a number of points, a font weight or design, or nothing it can read. */
export type SwiftValue =
  | { kind: 'color'; swift: string }
  | { kind: 'number'; value: number; swift: string; unit: 'px' | 'em' | 'unitless' | 'percent' }
  | { kind: 'weight'; swift: string }
  | { kind: 'design'; swift: string }
  | { kind: 'unreadable'; text: string };

/** `--space-6` → `space6`; `--primary-foreground` → `primaryForeground`. */
export function themeMember(tokenName: string): string {
  const parts = tokenName.replace(/^--/, '').split(/[^a-zA-Z0-9]+/).filter(Boolean);
  const name = parts.map((p, i) => (i === 0 ? p : p[0].toUpperCase() + p.slice(1))).join('');
  return /^[0-9]/.test(name) ? `t${name}` : name;
}

const WEIGHTS: Record<string, string> = {
  '100': '.ultraLight',
  '200': '.thin',
  '300': '.light',
  '400': '.regular',
  normal: '.regular',
  '500': '.medium',
  '600': '.semibold',
  '700': '.bold',
  bold: '.bold',
  '800': '.heavy',
  '900': '.black'
};

function hexColor(text: string): string | null {
  const m = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.exec(text.trim());
  if (!m) return null;
  let hex = m[1];
  if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
  const alpha = hex.length === 8 ? parseInt(hex.slice(6), 16) / 255 : 1;
  const rgb = hex.slice(0, 6);
  return alpha === 1 ? `Color(hex: 0x${rgb})` : `Color(hex: 0x${rgb}, opacity: ${round(alpha)})`;
}

function rgbaColor(text: string): string | null {
  const m = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+%?))?\s*\)$/.exec(text.trim());
  if (!m) return null;
  const a = m[4] === undefined ? 1 : m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
  return `Color(red: ${round(+m[1] / 255)}, green: ${round(+m[2] / 255)}, blue: ${round(+m[3] / 255)}, opacity: ${round(a)})`;
}

function round(n: number): string {
  return String(Math.round(n * 1000) / 1000);
}

/** A family stack → the system design that carries its intent (a phone ships no web fonts this slice brings). */
function design(text: string): string | null {
  const t = text.toLowerCase();
  if (/monospace|mono\b|menlo|consolas/.test(t)) return '.monospaced';
  if (/(^|[\s,"'])serif\b/.test(t) && !/sans-serif/.test(t)) return '.serif';
  if (/sans-serif|system-ui|-apple-system|inter|helvetica|arial/.test(t)) return '.default';
  return null;
}

/** Reads one literal (no `var(…)`): what kind of value it is, and how Swift spells it. */
export function readLiteral(text: string): SwiftValue {
  const t = text.trim();
  if (t === 'transparent') return { kind: 'color', swift: 'Color.clear' };
  const color = hexColor(t) ?? rgbaColor(t);
  if (color) return { kind: 'color', swift: color };
  let m = /^(-?[\d.]+)px$/.exec(t);
  if (m) return { kind: 'number', value: +m[1], swift: round(+m[1]), unit: 'px' };
  m = /^(-?[\d.]+)em$/.exec(t);
  if (m) return { kind: 'number', value: +m[1], swift: round(+m[1]), unit: 'em' };
  m = /^(-?[\d.]+)%$/.exec(t);
  if (m) return { kind: 'number', value: +m[1], swift: round(+m[1]), unit: 'percent' };
  if (/^-?[\d.]+$/.test(t)) {
    if (WEIGHTS[t] && /00$/.test(t)) return { kind: 'weight', swift: WEIGHTS[t] };
    return { kind: 'number', value: +t, swift: round(+t), unit: 'unitless' };
  }
  if (WEIGHTS[t]) return { kind: 'weight', swift: WEIGHTS[t] };
  const d = design(t);
  if (d) return { kind: 'design', swift: d };
  return { kind: 'unreadable', text: t };
}

/**
 * The tokens a printed view refers to, collected as the printer reads them, then written once as `Theme.swift`.
 *
 * A token whose value is itself `var(--other)` resolves through the table to its literal (11 of story-engine's 193 do);
 * a cycle or a name the table lacks is unreadable and the reading that asked for it reports it.
 */
export class Theme {
  private readonly byName: Map<string, string>;
  private readonly used = new Map<string, SwiftValue>();

  constructor(tokens: TokenIR[]) {
    this.byName = new Map(tokens.map((t) => [t.name, t.value]));
  }

  /** The literal a token stands for, through any chain of `var(--…)`; undefined where the chain breaks. */
  private literalOf(name: string, seen = new Set<string>()): string | undefined {
    if (seen.has(name)) return undefined;
    seen.add(name);
    const value = this.byName.get(name);
    if (value === undefined) return undefined;
    const m = /^\s*var\((--[\w-]+)\)\s*$/.exec(value);
    return m ? this.literalOf(m[1], seen) : value;
  }

  /**
   * One CSS value as Swift: a bare token becomes `Theme.<member>` (recorded for `Theme.swift`), a literal becomes its
   * Swift spelling. The kind is the literal's, so a caller knows whether it holds a color or a length.
   */
  read(text: string): SwiftValue {
    const m = /^\s*var\((--[\w-]+)\)\s*$/.exec(text);
    if (!m) return readLiteral(text);
    const literal = this.literalOf(m[1]);
    if (literal === undefined) return { kind: 'unreadable', text };
    const value = readLiteral(literal);
    if (value.kind === 'unreadable') return { kind: 'unreadable', text: `${text} (= ${literal})` };
    this.used.set(m[1], value);
    const member = `Theme.${themeMember(m[1])}`;
    return value.kind === 'number' ? { ...value, swift: member } : { ...value, swift: member };
  }

  /** Every token a view read, sorted by name: `Theme.swift`. */
  source(): string {
    const lines: string[] = [];
    for (const name of [...this.used.keys()].sort()) {
      const v = this.used.get(name)!;
      const member = themeMember(name);
      const raw = this.byName.get(name);
      const comment = `  /// \`${name}\`: ${raw}`;
      if (v.kind === 'color') lines.push(comment, `  public static let ${member}: Color = ${v.swift}`);
      else if (v.kind === 'number') lines.push(comment, `  public static let ${member}: CGFloat = ${v.swift}`);
      else if (v.kind === 'weight') lines.push(comment, `  public static let ${member}: Font.Weight = ${v.swift}`);
      else if (v.kind === 'design') lines.push(comment, `  public static let ${member}: Font.Design = ${v.swift}`);
    }
    const colorNames = [...this.used.entries()].filter(([, v]) => v.kind === 'color').map(([n]) => n).sort();
    return [
      '// @nodegx:generated (EXP-022) — the design tokens the views read, from the project\'s token table.',
      'import SwiftUI',
      '',
      'public enum Theme {',
      ...lines,
      '',
      '  /// A color a value names at run time (a States node\'s color values arrive as `var(--token)` text).',
      '  public static func color(_ text: String) -> Color? {',
      '    switch text {',
      ...colorNames.map((n) => `    case "var(${n})": return ${themeMember(n)}`),
      '    default: return nil',
      '    }',
      '  }',
      '}',
      '',
      'extension Color {',
      '  init(hex: UInt32, opacity: Double = 1) {',
      '    self.init(red: Double((hex >> 16) & 0xff) / 255, green: Double((hex >> 8) & 0xff) / 255, blue: Double(hex & 0xff) / 255, opacity: opacity)',
      '  }',
      '}',
      ''
    ].join('\n');
  }
}
