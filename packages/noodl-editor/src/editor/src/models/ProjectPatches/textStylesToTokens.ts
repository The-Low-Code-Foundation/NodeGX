/**
 * P100 UPG-003 — a 0.2.x project's text styles become typography tokens when it opens.
 *
 * Ruled twice: **R3** "convert on load in 0.3.0", and **R8** "typography tokens" rather than Looks,
 * because a Look dresses one node type and 82 worn text styles span several (P99 HLT-020 §2c). A
 * token is global, so "change it once, everything changes" survives across node types.
 *
 * # What a text style did, and therefore what the conversion must reproduce
 *
 * A wearer's `textStyle` port (or `labeltextStyle`, …) names an entry in `metadata.styles.text`.
 * The runtime copies that entry under the element's style and lets every font port that has a value
 * of its own win over it (`Object.assign({}, props.textStyle, style)` in `react-component-node.ts`).
 * So a style is the **lowest** layer for each property, and a font port set explicitly **anywhere**
 * in the stack beats it — including in a layer *below* the one that chose the style.
 *
 * The stack, low to high, for a node in visual state `s` (`react-component-node.ts` `setVariant` /
 * `getParametersForStates`): variant parameters, variant state `s`, node parameters, node state `s`.
 * 🔴 A variant with **no name** is the default for its node type and dresses every node of that type
 * that names no variant (`GraphModel.getVariant` compares `undefined === undefined`). That is where
 * most wearers are: 1,765 variant layers on this machine against HLT-020's 3,447 node wearers, which
 * counted only nodes.
 *
 * So "write the token where the style was" is wrong whenever an explicit value sits lower in the
 * stack. The conversion therefore writes naively and then **simulates every node in every state it
 * has, before and after**, and patches the top layer for that state wherever the two differ. A
 * difference it cannot express as a parameter is reported, never dropped.
 *
 * # What each property becomes
 *
 * - `fontSize`, `lineHeight`, `letterSpacing`, `fontWeight` → a token per style (`--label-medium-size`).
 * - `color` → a token, unless it names one of the project's colour styles, which the runtime still
 *   resolves (`Text.tsx` `resolveColor`), so it is copied as that name and keeps its sharing. A hex
 *   equal to one of the project's own colour tokens references it; the shipped defaults are never
 *   matched, because a preset or theme moves their values and would recolour old text.
 * - `textTransform` → copied onto each wearer, unshared: it has no token kind (R8, stated and accepted).
 * - `fontFamily` → a token. 🔴 98% of text styles on this machine name a font **file** (1,709 of
 *   1,746), and a `var(--…)` never reaches the font port's setter, which is what loads a file
 *   (`FontLoader.loadFont`). So a file's token holds the family name the runtime derives from it
 *   (`fonts/Roboto/Roboto-Medium.ttf` → `'Roboto-Medium'`), and {@link fontFaceStylesheet} writes the
 *   `@font-face` that loads it into a project module — the same road the bundled Inter font takes,
 *   which the viewer, a deploy and the code export all link. **R9**, ruled 2026-09-23: *"Teach tokens
 *   font files first"*, so changing a font is one token too.
 *
 * # What is left alone, and said so
 *
 * - A node whose text style port is **wired**: the style arrives while the app runs, so its layers
 *   are not rewritten, a variant it wears is not rewritten, and no definition is removed from the
 *   project, because a wire can deliver any name.
 * - A wearer whose node type has no port for a property its style sets (the deprecated `Button`,
 *   `Text Input` and `Options` have font family, size and colour only).
 *
 * Every definition nothing still names is removed, so the Text node's picker stops listing styles
 * that no longer do anything. Running this twice is a no-op.
 */ import { DEFAULT_TOKENS, type StyleTokenRecord } from '@nodegx/project-contract/tokens';

type Params = Record<string, unknown>;
type StateParams = Record<string, Params>;

export interface TextStyleNodeLike {
  id?: string;
  type?: string;
  variant?: string;
  parameters?: Params;
  stateParameters?: StateParams;
  children?: TextStyleNodeLike[];
}

export interface TextStyleVariantLike {
  name?: string;
  typename?: string;
  parameters?: Params;
  /** The legacy spelling, which is what `project.json` and the v2 importer's output carry. */
  stateParamaters?: StateParams;
  stateParameters?: StateParams;
}

export interface TextStyleComponentLike {
  name?: string;
  graph?: {
    roots?: TextStyleNodeLike[];
    connections?: { toId?: string; toProperty?: string }[];
  };
}

export interface TextStyleProjectLike {
  components?: TextStyleComponentLike[];
  variants?: TextStyleVariantLike[];
  metadata?: Record<string, any>;
}

/** The text style properties, each named as the child port that carries it. */
const STYLE_PROPS = ['fontFamily', 'fontSize', 'fontWeight', 'color', 'letterSpacing', 'lineHeight', 'textTransform'];
const DEPRECATED_PROPS = ['fontFamily', 'fontSize', 'color'];

/**
 * Every node type that wears a text style, its text style ports, and which properties it has a port
 * for. Read from `noodl-viewer-react`'s `addTextStyleInputs` / `addLabelInputs` callers and the three
 * deprecated controls that declare `textStyle` themselves; `tests-unit/upg-003` fails when a node
 * definition with a text style port is not in this table.
 */
export const TEXT_STYLE_WEARERS: Record<string, { ports: string[]; props: string[] }> = {
  Text: { ports: ['textStyle'], props: STYLE_PROPS },
  Label: { ports: ['textStyle'], props: STYLE_PROPS },
  'net.noodl.controls.button': { ports: ['textStyle'], props: STYLE_PROPS },
  'net.noodl.controls.textinput': { ports: ['textStyle', 'labeltextStyle'], props: STYLE_PROPS },
  'net.noodl.controls.options': { ports: ['textStyle', 'labeltextStyle'], props: STYLE_PROPS },
  'net.noodl.controls.checkbox': { ports: ['labeltextStyle'], props: STYLE_PROPS },
  'net.noodl.controls.radiobutton': { ports: ['labeltextStyle'], props: STYLE_PROPS },
  Button: { ports: ['textStyle'], props: DEPRECATED_PROPS },
  'Text Input': { ports: ['textStyle'], props: DEPRECATED_PROPS },
  Options: { ports: ['textStyle'], props: DEPRECATED_PROPS }
};

const TOKEN_KIND: Record<string, { suffix: string; category: StyleTokenRecord['category'] }> = {
  fontSize: { suffix: 'size', category: 'typography-size' },
  lineHeight: { suffix: 'leading', category: 'typography-leading' },
  letterSpacing: { suffix: 'tracking', category: 'typography-tracking' },
  fontWeight: { suffix: 'weight', category: 'typography-weight' },
  fontFamily: { suffix: 'family', category: 'typography-family' },
  color: { suffix: 'color', category: 'color-palette' }
};

/** What one property of one style becomes on a wearer's port. */
type Carried = { portValue: string; css: string };

export interface ConvertedTextStyle {
  name: string;
  /** Token names this style's properties now live in. */
  tokens: string[];
  /** Properties copied onto each wearer instead, because no token can carry them. */
  copied: string[];
}

export interface NotCarried {
  component: string;
  nodeId: string;
  state: string;
  port: string;
  reason: string;
}

export interface TextStyleConversionReport {
  /** Whether anything in the project was written. False means the project was left exactly as read. */
  changed: boolean;
  converted: ConvertedTextStyle[];
  tokensMinted: StyleTokenRecord[];
  /** Node and variant layers whose text style port was replaced by font ports. */
  layersRewritten: number;
  /** Parameters written by the simulation to keep a node rendering as it did. */
  corrections: number;
  kept: { name: string; reason: string }[];
  notCarried: NotCarried[];
  /** Font files a family token now names, for {@link fontFaceStylesheet}. */
  fontFaces: FontFace[];
}

export interface FontFace {
  /** The family name the runtime derives from the file, and the token's value. */
  family: string;
  /** The file as the text style named it, project-relative. */
  file: string;
}

/** Where the upgrade's `@font-face` rules live: a project module, linked like the bundled Inter. */
export const FONT_MODULE_DIR = 'noodl_modules/text-style-fonts';

// ─── Values ──────────────────────────────────────────────────────────────────

/** The CSS string the runtime makes of a stored style value (`styles.ts` `setStyles`). */
function cssOf(value: unknown): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'object') {
    const v = value as { value?: unknown; unit?: unknown };
    if (v.value === undefined || v.value === null || v.value === '') return undefined;
    return String(v.value) + (v.unit === undefined || v.unit === null ? '' : String(v.unit));
  }
  return String(value);
}

/**
 * What a style's `prop` actually puts on the element. The old editor's default styles store
 * `letterSpacing: 'Auto'`, and the runtime hands that string to the browser, which drops it as
 * invalid: the style sets nothing there. A token holding `Auto` would draw the same and mean nothing.
 */
const NUMERIC_PROPS = ['fontSize', 'fontWeight', 'letterSpacing', 'lineHeight'];
function styleValue(def: Params | undefined, prop: string): string | undefined {
  const css = cssOf((def || {})[prop]);
  if (css !== undefined && NUMERIC_PROPS.includes(prop) && /^auto$/i.test(css.trim())) return undefined;
  return css;
}

function slugOf(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'text-style';
}

function own(params: Params | undefined, key: string): boolean {
  return !!params && Object.prototype.hasOwnProperty.call(params, key) && params[key] !== undefined;
}

function variantStates(v: TextStyleVariantLike | undefined): StateParams | undefined {
  if (!v) return undefined;
  return v.stateParamaters ?? v.stateParameters;
}

/** The family name the runtime gives a font file (`styles.ts`, `fontloader.ts`): its base name. */
export function familyOfFontFile(file: string): string {
  return (
    file
      .replace(/\.[^/.]+$/, '')
      .split('/')
      .pop() ?? file
  );
}

function isFontFile(family: string): boolean {
  // The runtime's own test (`styles.ts`, `node-shared-port-definitions.ts` fontFamily setter).
  return family.split('.').length > 1;
}

// ─── The conversion ──────────────────────────────────────────────────────────

export function convertTextStylesToTokens(
  project: TextStyleProjectLike,
  options: {
    /**
     * Styles to leave as text styles, wearers and all — for an import, the styles that do not land
     * ({@link convertTextStylesForImport}). Treated as a style no port can express, so a wearer keeps
     * naming it: a style missing from the definitions would instead be read as setting nothing.
     */
    leave?: ReadonlySet<string>;
  } = {}
): TextStyleConversionReport {
  const report: TextStyleConversionReport = {
    changed: false,
    converted: [],
    tokensMinted: [],
    layersRewritten: 0,
    corrections: 0,
    kept: [],
    notCarried: [],
    fontFaces: []
  };

  const metadata = project.metadata ?? {};
  const styles = metadata.styles;
  const definitions: Record<string, Params> =
    styles && styles.text && typeof styles.text === 'object' ? styles.text : {};
  if (Object.keys(definitions).length === 0) return report;

  const colourStyles: Record<string, unknown> = (styles && styles.colors) || {};
  const variants = project.variants ?? [];
  const components = project.components ?? [];

  // ── Which wearers are wired ────────────────────────────────────────────────
  const nodes: { node: TextStyleNodeLike; component: string }[] = [];
  const wired = new Set<string>(); // `${nodeId}\u0000${port}`
  for (const c of components) {
    const walk = (n: TextStyleNodeLike) => {
      nodes.push({ node: n, component: c.name ?? '' });
      (n.children ?? []).forEach(walk);
    };
    (c.graph?.roots ?? []).forEach(walk);
    for (const conn of c.graph?.connections ?? []) {
      if (conn.toId && conn.toProperty && /textStyle$/.test(conn.toProperty)) {
        wired.add(conn.toId + '\u0000' + conn.toProperty);
      }
    }
  }

  const variantOf = (n: TextStyleNodeLike) => variants.find((v) => v.typename === n.type && v.name === n.variant);

  // A variant worn by a wired node cannot be rewritten: the wire replaces the style while the app
  // runs, and font ports written into the variant would then win over whatever it delivers.
  const heldVariants = new Set<TextStyleVariantLike>();
  for (const { node } of nodes) {
    const wearer = node.type ? TEXT_STYLE_WEARERS[node.type] : undefined;
    if (!wearer) continue;
    for (const port of wearer.ports) {
      if (wired.has(node.id + '\u0000' + port)) {
        const v = variantOf(node);
        if (v) heldVariants.add(v);
      }
    }
  }

  // ── Tokens ─────────────────────────────────────────────────────────────────
  const stored = metadata.designTokens;
  const customTokens: StyleTokenRecord[] =
    stored && Array.isArray(stored.customTokens) ? stored.customTokens.slice() : [];
  const defaultNames = new Set(DEFAULT_TOKENS.map((t) => t.name));
  const originalCustom = customTokens.slice();

  const tokenFor = (base: string, value: string, category: StyleTokenRecord['category'], styleName: string) => {
    for (let i = 1; ; i++) {
      const name = i === 1 ? base : `${base}-${i}`;
      const existing = customTokens.find((t) => t.name === name);
      if (existing) {
        if (existing.value === value && existing.category === category) return name;
        continue;
      }
      if (defaultNames.has(name)) continue;
      const record: StyleTokenRecord = {
        name,
        value,
        category,
        isCustom: true,
        description: `From the text style "${styleName}"`
      };
      customTokens.push(record);
      report.tokensMinted.push(record);
      return name;
    }
  };

  // What each (style, property) becomes. Built lazily so an unworn style still mints its tokens
  // exactly once, in definition order, and a re-run reuses them.
  const carriedCache = new Map<string, Record<string, Carried>>();
  const carriedFor = (styleName: string): Record<string, Carried> | undefined => {
    if (!Object.prototype.hasOwnProperty.call(definitions, styleName)) return undefined;
    const hit = carriedCache.get(styleName);
    if (hit) return hit;

    const def = definitions[styleName] || {};
    const slug = slugOf(styleName);
    const out: Record<string, Carried> = {};
    const entry: ConvertedTextStyle = { name: styleName, tokens: [], copied: [] };

    for (const prop of STYLE_PROPS) {
      const css = styleValue(def, prop);
      if (css === undefined) continue;

      if (prop === 'textTransform') {
        out[prop] = { portValue: css, css };
        entry.copied.push(prop);
        continue;
      }

      if (prop === 'fontFamily' && isFontFile(css)) {
        const family = familyOfFontFile(css);
        const name = tokenFor(`--${slug}-family`, `'${family}'`, 'typography-family', styleName);
        if (!report.fontFaces.some((f) => f.family === family && f.file === css)) {
          report.fontFaces.push({ family, file: css });
        }
        // `css` stays the file: it is what the style drew, and the simulation compares like with like.
        out[prop] = { portValue: `var(${name})`, css };
        entry.tokens.push(name);
        continue;
      }

      if (prop === 'color') {
        if (Object.prototype.hasOwnProperty.call(colourStyles, css)) {
          out[prop] = { portValue: css, css };
          entry.copied.push(prop);
          continue;
        }
        const match = originalCustom.find(
          (t) => (t.category === 'color-palette' || t.category === 'color-semantic') && t.value === css
        );
        if (match) {
          out[prop] = { portValue: `var(${match.name})`, css };
          entry.tokens.push(match.name);
          continue;
        }
      }

      const kind = TOKEN_KIND[prop];
      const name = tokenFor(`--${slug}-${kind.suffix}`, css, kind.category, styleName);
      out[prop] = { portValue: `var(${name})`, css };
      entry.tokens.push(name);
    }

    carriedCache.set(styleName, out);
    report.converted.push(entry);
    return out;
  };

  /** Whether every property this style sets has a port on `typename`. Mints nothing. */
  const expressibleOn = (styleName: string, typename: string): boolean => {
    if (options.leave?.has(styleName)) return false;
    if (!Object.prototype.hasOwnProperty.call(definitions, styleName)) return true; // sets nothing
    const def = definitions[styleName] || {};
    const props = TEXT_STYLE_WEARERS[typename].props;
    return STYLE_PROPS.every((p) => styleValue(def, p) === undefined || props.includes(p));
  };

  // ── Snapshot for the simulation's "before" ─────────────────────────────────
  type Layers = { parameters?: Params; states?: StateParams };
  const clone = <T>(v: T): T => (v === undefined ? v : JSON.parse(JSON.stringify(v)));
  const beforeVariant = new Map<TextStyleVariantLike, Layers>();
  for (const v of variants) beforeVariant.set(v, { parameters: clone(v.parameters), states: clone(variantStates(v)) });
  const beforeNode = new Map<TextStyleNodeLike, Layers>();
  for (const { node } of nodes) {
    if (node.type && TEXT_STYLE_WEARERS[node.type]) {
      beforeNode.set(node, { parameters: clone(node.parameters), states: clone(node.stateParameters) });
    }
  }

  /** The CSS each parameter this conversion wrote stands for, so "after" can tell ours from the author's. */
  const written = new WeakMap<Params, Map<string, string>>();
  const write = (layer: Params, key: string, carried: Carried) => {
    layer[key] = carried.portValue;
    let m = written.get(layer);
    if (!m) written.set(layer, (m = new Map()));
    m.set(key, carried.css);
  };

  /**
   * Rewrite one layer that names a style on `port`. `lower` are the layers beneath it **as read**:
   * a font port set explicitly there already beats the style, so nothing is written over it.
   */
  const rewriteLayer = (layer: Params, port: string, typename: string, lower: (Params | undefined)[]) => {
    const styleName = layer[port];
    if (typeof styleName !== 'string') return;
    if (!expressibleOn(styleName, typename)) return;

    const prefix = port.slice(0, -'textStyle'.length);
    const carried = carriedFor(styleName) ?? {};
    for (const prop of Object.keys(carried)) {
      const child = prefix + prop;
      if (own(layer, child)) continue;
      if (lower.some((l) => own(l, child))) continue;
      write(layer, child, carried[prop]);
    }
    delete layer[port];
    report.layersRewritten++;
  };

  // ── Variants ───────────────────────────────────────────────────────────────
  for (const v of variants) {
    const wearer = v.typename ? TEXT_STYLE_WEARERS[v.typename] : undefined;
    if (!wearer || heldVariants.has(v)) continue;
    const read = beforeVariant.get(v)!;
    for (const port of wearer.ports) {
      if (own(v.parameters, port)) rewriteLayer(v.parameters!, port, v.typename!, []);
      const states = variantStates(v);
      for (const s of Object.keys(states ?? {})) {
        if (own(states![s], port)) rewriteLayer(states![s], port, v.typename!, [read.parameters]);
      }
    }
  }

  // ── Nodes ──────────────────────────────────────────────────────────────────
  for (const { node } of nodes) {
    const read = beforeNode.get(node);
    if (!read) continue;
    const wearer = TEXT_STYLE_WEARERS[node.type!];
    const v = variantOf(node);
    const vRead = v ? beforeVariant.get(v) : undefined;
    for (const port of wearer.ports) {
      if (wired.has(node.id + '\u0000' + port)) continue;
      if (own(node.parameters, port)) rewriteLayer(node.parameters!, port, node.type!, [vRead?.parameters]);
      for (const s of Object.keys(node.stateParameters ?? {})) {
        const layer = node.stateParameters![s];
        if (own(layer, port)) {
          rewriteLayer(layer, port, node.type!, [vRead?.parameters, vRead?.states?.[s], read.parameters]);
        }
      }
    }
  }

  // ── Which definitions are still named ──────────────────────────────────────
  const stillNamed = new Set<string>();
  const collect = (layer: Params | undefined, ports: string[]) => {
    for (const p of ports) if (own(layer, p) && typeof layer![p] === 'string') stillNamed.add(layer![p] as string);
  };
  for (const v of variants) {
    const wearer = v.typename ? TEXT_STYLE_WEARERS[v.typename] : undefined;
    if (!wearer) continue;
    collect(v.parameters, wearer.ports);
    for (const layer of Object.values(variantStates(v) ?? {})) collect(layer, wearer.ports);
  }
  for (const { node } of nodes) {
    const wearer = node.type ? TEXT_STYLE_WEARERS[node.type] : undefined;
    if (!wearer) continue;
    collect(node.parameters, wearer.ports);
    for (const layer of Object.values(node.stateParameters ?? {})) collect(layer, wearer.ports);
  }
  const anyWired = wired.size > 0;
  const keptDefinitions = new Set<string>(
    Object.keys(definitions).filter((name) => anyWired || stillNamed.has(name) || options.leave?.has(name))
  );

  // ── The simulation: every wearer, every state, before and after ───────────
  /** What a font property renders as: an author's own value, or CSS a style (or its tokens) supplies. */
  type Rendered = { raw: string } | { css: string; from?: string } | null;
  const same = (a: Rendered, b: Rendered) => {
    if (a === null || b === null) return a === b;
    if ('raw' in a) return 'raw' in b && a.raw === b.raw;
    return 'css' in b && a.css === b.css;
  };

  const resolve = (stack: (Params | undefined)[], port: string, prop: string, defs: Set<string> | 'all'): Rendered => {
    const child = port.slice(0, -'textStyle'.length) + prop;
    for (let i = stack.length - 1; i >= 0; i--) {
      const layer = stack[i];
      if (own(layer, child)) {
        // An empty value is a value: it beats the style, and every font port's setter turns it into
        // no declaration at all (removed, or a unit alone, which the browser drops).
        if (layer![child] === '') return null;
        const ours = written.get(layer!)?.get(child);
        return ours !== undefined ? { css: ours } : { raw: JSON.stringify(layer![child]) };
      }
    }
    for (let i = stack.length - 1; i >= 0; i--) {
      const layer = stack[i];
      if (own(layer, port)) {
        const styleName = layer![port];
        if (typeof styleName !== 'string') return null;
        if (defs !== 'all' && !defs.has(styleName)) return null;
        const css = styleValue(definitions[styleName], prop);
        return css === undefined ? null : { css, from: styleName };
      }
    }
    return null;
  };

  const stateStacks = (variant: Layers | undefined, node: Layers) => {
    const names = new Set<string>(['neutral']);
    Object.keys(variant?.states ?? {}).forEach((s) => names.add(s));
    Object.keys(node.states ?? {}).forEach((s) => names.add(s));
    return [...names].map((state) => ({
      state,
      stack:
        state === 'neutral'
          ? [variant?.parameters, node.parameters]
          : [variant?.parameters, variant?.states?.[state], node.parameters, node.states?.[state]]
    }));
  };

  for (const { node, component } of nodes) {
    const read = beforeNode.get(node);
    if (!read) continue;
    const wearer = TEXT_STYLE_WEARERS[node.type!];
    const v = variantOf(node);
    const vRead = v ? beforeVariant.get(v) : undefined;
    const vNow: Layers | undefined = v ? { parameters: v.parameters, states: variantStates(v) } : undefined;

    for (const port of wearer.ports) {
      if (wired.has(node.id + '\u0000' + port)) continue;
      const child = (prop: string) => port.slice(0, -'textStyle'.length) + prop;
      // Neutral first (it is first in the list): a correction in the node's own parameters reaches
      // every state, so each later state is read after it.
      for (const { state, stack } of stateStacks(vRead, read)) {
        for (const prop of wearer.props) {
          const want = resolve(stack, port, prop, 'all');
          const now = stateStacks(vNow, { parameters: node.parameters, states: node.stateParameters }).find(
            (x) => x.state === state
          )!.stack;
          const got = resolve(now, port, prop, keptDefinitions);
          if (same(want, got)) continue;

          let target: Params;
          if (state === 'neutral') {
            target = node.parameters = node.parameters ?? {};
          } else {
            node.stateParameters = node.stateParameters ?? {};
            target = node.stateParameters[state] = node.stateParameters[state] ?? {};
          }
          if (want === null) {
            // The style set nothing here (a "None" over a variant that wears one, most often), and
            // the variant's layer now carries tokens. An empty value is how a port says "nothing".
            target[child(prop)] = '';
          } else if ('raw' in want) {
            target[child(prop)] = JSON.parse(want.raw);
          } else {
            const carried = want.from !== undefined ? carriedFor(want.from)?.[prop] : undefined;
            write(target, child(prop), carried ?? { portValue: want.css, css: want.css });
          }
          report.corrections++;

          const check = stateStacks(vNow, { parameters: node.parameters, states: node.stateParameters }).find(
            (x) => x.state === state
          )!.stack;
          if (!same(want, resolve(check, port, prop, keptDefinitions))) {
            report.notCarried.push({
              component,
              nodeId: node.id ?? '',
              state,
              port: child(prop),
              reason: 'no parameter on the node reproduces what its text style drew'
            });
          }
        }
      }
    }
  }

  // ── Commit ─────────────────────────────────────────────────────────────────
  let removed = 0;
  for (const name of Object.keys(definitions)) {
    if (keptDefinitions.has(name)) {
      report.kept.push({
        name,
        reason: options.leave?.has(name)
          ? 'it was left as a text style on purpose'
          : anyWired
            ? 'a text style port in this project is wired, and a wire can choose any style while the app runs'
            : 'a wearer has no port for a property this style sets'
      });
      continue;
    }
    carriedFor(name); // an unworn style still becomes tokens: it is the author's type scale
    delete definitions[name];
    removed++;
  }
  // A kept style is still a text style; it was not converted, whatever `carriedFor` recorded.
  report.converted = report.converted.filter((c) => !keptDefinitions.has(c.name));

  if (report.tokensMinted.length > 0) {
    metadata.designTokens = {
      ...(stored && typeof stored === 'object' ? stored : {}),
      version: stored?.version ?? 1,
      customTokens
    };
  }
  if (styles && Object.keys(definitions).length === 0) delete styles.text;

  report.changed =
    report.tokensMinted.length > 0 || report.layersRewritten > 0 || report.corrections > 0 || removed > 0;
  project.metadata = metadata;
  return report;
}

/**
 * UPG-003 §6 — the same conversion for the parts an import brings in, so a prefab installed in 0.3
 * arrives wearing typography tokens instead of minting text styles that the next open converts (and
 * backs the whole project up to do it).
 *
 * Tokens travel by NAME (CMP-004 AC4), so the source is converted against the TARGET's custom tokens:
 * one equal in name and value is reused, a name the target uses for another value gets `-2`, and
 * `tokensMinted` is what the target must be given. The source's own tokens are put back afterwards —
 * they never travel. Only the `landing` styles are converted: one the import skips (the target keeps
 * its own of that name) stays a text style on every wearer, so the part still names the target's.
 */
export function convertTextStylesForImport(
  source: TextStyleProjectLike,
  targetCustomTokens: readonly StyleTokenRecord[],
  landing: ReadonlySet<string>
): TextStyleConversionReport {
  const metadata = (source.metadata = source.metadata ?? {});
  const definitions = metadata.styles?.text;
  const leave = new Set(
    Object.keys(definitions && typeof definitions === 'object' ? definitions : {}).filter((n) => !landing.has(n))
  );
  const hadOwn = Object.prototype.hasOwnProperty.call(metadata, 'designTokens');
  const own = metadata.designTokens;
  metadata.designTokens = { version: own?.version ?? 1, customTokens: targetCustomTokens.map((t) => ({ ...t })) };
  try {
    return convertTextStylesToTokens(source, { leave });
  } finally {
    if (hadOwn) metadata.designTokens = own;
    else delete metadata.designTokens;
  }
}

/** The report in sentences a person reads when the project opens. Empty when nothing changed. */
export function describeTextStyleConversion(report: TextStyleConversionReport): string[] {
  if (!report.changed) return [];
  const lines: string[] = [];
  const n = report.converted.length;
  if (n > 0) {
    lines.push(
      `${n} text style${n === 1 ? '' : 's'} became typography tokens (Styles → Type). ` +
        `Everything that wore ${n === 1 ? 'it' : 'them'} now uses the tokens, so changing a token changes every wearer.`
    );
    const copied = new Set(report.converted.flatMap((c) => c.copied));
    if (report.fontFaces.length > 0) {
      lines.push(
        `Their font files are loaded by a stylesheet the upgrade added (${FONT_MODULE_DIR}), so a font is one token too.`
      );
    }
    if (copied.has('textTransform')) {
      lines.push('Letter case was copied onto each wearer: there is no token for it.');
    }
  }
  for (const k of report.kept) lines.push(`"${k.name}" is still a text style: ${k.reason}.`);
  for (const nc of report.notCarried) {
    lines.push(`Could not carry ${nc.port} on a node in "${nc.component}" (${nc.state}): ${nc.reason}.`);
  }
  return lines;
}

/**
 * The upgrade module's stylesheet: one `@font-face` per font file a family token names, merged into
 * what a previous upgrade already wrote (a style a prefab brings back later adds its face, never
 * repeats one). The URL is relative to the stylesheet, which sits two folders below the project.
 */
export function fontFaceStylesheet(existing: string | undefined, faces: FontFace[]): string {
  let css =
    existing ??
    `/*\n * Written by NodeGX 0.3 when this project's text styles became typography tokens (P100 UPG-003).\n` +
      ` * Each rule loads a font file a family token names. Delete a rule only with the token it serves.\n */\n`;
  for (const face of faces) {
    const src = /^(https?:)?\/\//.test(face.file) ? face.file : '../../' + face.file.replace(/^\/+/, '');
    const rule = `@font-face {\n  font-family: '${face.family}';\n  src: url('${src}');\n}\n`;
    if (!css.includes(rule)) css += rule;
  }
  return css;
}

/** The module's manifest: what makes the viewer, a deploy and the code export link the stylesheet. */
export function fontModuleManifest(): string {
  return (
    JSON.stringify(
      {
        name: 'Text style fonts',
        browser: { stylesheets: [`${FONT_MODULE_DIR}/styles.css`] },
        _note:
          'Added by NodeGX 0.3 when text styles became typography tokens: styles.css loads the font files the family tokens name.'
      },
      null,
      2
    ) + '\n'
  );
}
