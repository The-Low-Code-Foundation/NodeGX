/**
 * `@nodegx/canvas-look` — the NodeGX canvas look as data, for an editor that is not the NodeGX editor.
 * Phase 112, OWN-005. Everything in `look` is generated from the editor (see look.ts's header); these
 * helpers only look things up, so there is no second copy of a rule here.
 *
 * An editor in a page has no `--theme-color-*` CSS custom properties unless it sets them; this package
 * carries the RESOLVED values for both themes, so nothing here needs CSS.
 */
import { look } from './look';

export { look };

export type Theme = 'dark' | 'light';
export type CategoryName = keyof typeof look.colors.dark.nodeSchemes;
export type NodeScheme = { base: string; baseHighlighted: string; header: string; headerHighlighted: string; outline: string; outlineHighlighted: string; text: string };
export type CategoryColors = { accent: string; chipFill: string };
export type WireColors = { normal: string; highlighted: string; pulsing: string };

/** The DOM/card colour scheme for a node category; an unknown name is `default`, as in the editor. */
export function nodeScheme(category: string | undefined, theme: Theme = 'dark'): NodeScheme {
  const schemes: Record<string, NodeScheme> = look.colors[theme].nodeSchemes;
  return (category && schemes[category]) || schemes.default;
}

/** The chip accent and soft fill for a category; an unknown name is `default`. */
export function categoryColors(category: string | undefined, theme: Theme = 'dark'): CategoryColors {
  const c: Record<string, CategoryColors> = look.colors[theme].categories;
  return (category && c[category]) || c.default;
}

/** Wire colours for a port type name: `signal`, the error wire type, or anything else (data). */
export function wireColors(portType: string | undefined, theme: Theme = 'dark'): WireColors {
  const w: { data: WireColors; signal: WireColors; error: WireColors } = look.wires[theme];
  if (portType === 'signal') return w.signal;
  if (portType === look.wireTypeError) return w.error;
  return w.data;
}
