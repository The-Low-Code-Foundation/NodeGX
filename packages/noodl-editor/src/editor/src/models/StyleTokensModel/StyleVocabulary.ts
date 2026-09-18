/**
 * AIX-006: the Style Vocabulary — the style analogue of the node catalog.
 *
 * A serializable description of the on-system styling an agent may emit:
 *   - design tokens, by category (the semantic names, NOT the resolved values —
 *     the agent references a token by name, and names are stable across
 *     projects; only the values a project overrides change);
 *   - the legal variants/sizes per element type, plus the token-referenced
 *     styles each variant/size resolves to (so the agent can copy a coherent
 *     combo rather than invent one);
 *   - the built-in presets, so a project can start on a coherent scheme.
 *
 * VERIFIED STORAGE FORMAT (spec step 1): a token-valued parameter is stored as
 * the literal CSS string `var(--token-name)` — see SuggestionActionHandler
 * (`node.setParameter(prop, 'var(--primary)')`) and every ElementConfig variant
 * (`backgroundColor: 'var(--primary)'`). The runtime resolves it against the
 * `:root { --token: … }` block that ProjectTokenCss stamps into preview and
 * deployed builds. So the agent must emit `var(--token-name)` — not the token
 * name bare, and not the resolved hex.
 *
 * 🔴 **P94 STY-002 replaced the sentence that used to stand here, because it was
 * false of the concept that survives.** It read: *"the `_variant`/`_size` markers
 * store the bare name, but variants are stamped into concrete params at author
 * time (the viewer does not expand them)"* — and that is a statement about two
 * different things that shared one word:
 *
 *   - a **Look** (`VariantModel`, stored in `nodegx.styles.json` → `variants[]`,
 *     referenced by the node's top-level `variant` field) IS expanded by the
 *     viewer, on every node, every render: `mergeDeep(variant.parameters)` then
 *     `mergeDeep(model.parameters)` (`react-component-node.ts:1811-1838`). It is
 *     a live reference, and the exporter now carries it too (STY-004);
 *   - the old `_variant`/`_size` **preset markers** were the stamped ones, and
 *     they are what P94 removes. Nothing reads them at runtime — measured: they
 *     appear nowhere in `noodl-viewer-react/src` or `noodl-runtime/src`.
 *
 * So the vocabulary hands over concrete token-referenced params for a *shipped
 * Look you copy in*, which is still the reliable emission for an agent — not
 * because a Look is a stamp, but because the `variant` input port is
 * `allowConnectionsOnly` (`react-component-node.ts:1993-2008`) and **no MCP tool
 * writes a node's Look yet** (its own phase, README §4.1).
 *
 * PURE by construction — no ProjectModel, no editor Model, no Electron. It reads
 * project overrides through the same `MetaDataSource` seam ProjectTokenCss uses,
 * so it works in the renderer (ProjectModel.instance), in the headless
 * measurement harness (the serialized project's metadata), and inside the
 * esbuild-bundled MCP server. When no source is given it describes the shipped
 * defaults, which is correct for the token *names* the agent emits.
 *
 * @module models/StyleTokensModel/StyleVocabulary
 */

import { ElementConfigRegistry } from '../ElementConfigs/ElementConfigRegistry';
import { shippedLooksFor, stripPresetMarkers } from '../Looks/looks';
import { buildEffectiveTokens, MetaDataSource, readStoredTokens } from './ProjectTokenCss';
import { formatCompositionValue, STYLE_COMPOSITIONS, VocabComposition } from './StyleCompositions';
import {
  StyleTokenRecord,
  TokenCategory,
  TOKEN_CATEGORIES,
  TokenCategoryGroup,
  TOKEN_CATEGORY_GROUPS
} from './TokenCategories';

/** One token as the agent needs to see it — a name to reference, plus a hint. */
export interface VocabToken {
  /** CSS custom property name, e.g. "--primary". Emit as `var(--primary)`. */
  name: string;
  category: TokenCategory;
  /** Present only for tokens a project has overridden away from the default. */
  isCustom?: boolean;
  description?: string;
}

/** Tokens of one category. */
export interface VocabTokenCategory {
  category: TokenCategory;
  label: string;
  group: TokenCategoryGroup;
  tokens: VocabToken[];
}

/** One shipped Look: a coherent set of parameters a node of this type can wear. */
export interface VocabLook {
  /** The library's own id (`primary`, `heading-1`) — what `copy_look` would name. */
  id: string;
  /** What a person sees, and the name the copy takes in the project (`Heading 1`). */
  name: string;
  /**
   * What this Look adds **on top of its element type's `defaults`** — not the whole of it.
   *
   * 🔴 **Factored deliberately, and the number is why.** A complete copy per Look reads better in
   * isolation but repeats the type's defaults 22 times over the library: measured on the wire it
   * cost **prompt 5,023 / full 15,741** against ceilings of 4,400 / 14,400, where the same content
   * factored costs less than it did before this task. An agent must copy the defaults *and* these;
   * both halves are in the same block and the prompt text says so.
   */
  parameters: Record<string, string>;
}

/**
 * The shipped Looks a single element type has.
 *
 * 🔴 **`sizes` are gone (P94 STY-002 AC1/AC5), and the measurement is why.** The four size presets
 * were a second axis on top of variants, and `_size` occurs **0 times** across the seven shipped
 * templates and 0 times across 105 real projects on this machine. A second axis cannot survive the
 * design's rule 1 ("one row decides it") without multiplying the library by four, so a person who
 * wants a larger Primary edits their copy of it.
 */
export interface VocabElement {
  nodeType: string;
  /** What every node of this type gets on creation, and the floor each Look sits on. */
  defaults: Record<string, string>;
  /** The shipped Looks for this type, in the order the config declares them. */
  looks: VocabLook[];
}

/**
 * A Look this project actually holds — the thing nodes in it wear.
 *
 * Read from `nodegx.styles.json` by the caller rather than from a token source, for the same reason
 * `icons` and `imagery` are: what a project holds is a fact about a directory, not about the product.
 */
export interface VocabProjectLook {
  name: string;
  /** The node type it dresses. A Look is identified by name **and** type, everywhere. */
  typename: string;
  parameters: Record<string, unknown>;
  /** Visual states it styles (`hover`, `pressed`, …), when it has any. */
  states?: string[];
}

export interface VocabPreset {
  id: string;
  name: string;
  description: string;
}

export interface StyleVocabulary {
  /** Design tokens, grouped by category, in category-declaration order. */
  categories: VocabTokenCategory[];
  /** Element types with a shipped Look library (Button, Text, …). */
  elements: VocabElement[];
  /**
   * P94 STY-002 AC6 — the Looks this project holds, which nodes in it can wear. Absent (rather
   * than empty) when the caller did not supply them, so "none supplied" and "this project has
   * none" stay different readings.
   */
  projectLooks?: VocabProjectLook[];
  /**
   * DSG-005 — named parameter sets to reuse verbatim, and the recipe that shows
   * each one arranged. Tokens and variants are the paint; this is the only
   * field in here that is an arrangement of them. See {@link STYLE_COMPOSITIONS}.
   */
  compositions: VocabComposition[];
  /** Built-in presets a new project can adopt. */
  presets: VocabPreset[];
}

export type { VocabComposition, VocabCompositionGroup, VocabParamValue } from './StyleCompositions';
export { STYLE_COMPOSITIONS } from './StyleCompositions';

/** Categories whose members are raw scales the agent should rarely reach for. */
const RAW_SCALE_CATEGORIES = new Set<TokenCategory>(['color-palette']);

/**
 * Rewrite an element config's CSS into the parameters a node actually has.
 *
 * The element configs are authored as CSS — they also drive the editor's own
 * variant rendering, so they carry `transform`, `cursor` and shorthand
 * properties. The vocabulary, though, is read by an agent as "copy these
 * parameters onto the node", and a parameter with no matching port is dropped
 * at apply with only a warning, which never blocks. So `boxShadow` and the
 * `padding` shorthand were being taught as settable when the runtime declares
 * neither: it has `boxShadowEnabled` plus five components, and one port per
 * padding side.
 *
 * Only the two shorthands the configs actually use are expanded. Anything else
 * is passed through untouched rather than filtered against a hardcoded port
 * list, which would go stale the moment a port is added.
 */
function toPortParameters(styles: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};

  for (const [key, value] of Object.entries(styles)) {
    if (key === 'padding' || key === 'margin') {
      // `2px 4px` → top/bottom, left/right. CSS's 1–4 value box shorthand.
      const parts = value.trim().split(/\s+/);
      const [top, right, bottom, left] =
        parts.length === 1
          ? [parts[0], parts[0], parts[0], parts[0]]
          : parts.length === 2
            ? [parts[0], parts[1], parts[0], parts[1]]
            : parts.length === 3
              ? [parts[0], parts[1], parts[2], parts[1]]
              : [parts[0], parts[1], parts[2], parts[3]];
      out[`${key}Top`] = top;
      out[`${key}Right`] = right;
      out[`${key}Bottom`] = bottom;
      out[`${key}Left`] = left;
      continue;
    }

    if (key === 'boxShadow') {
      // There is no shorthand port. Turning the shadow on gets the runtime's
      // own subtle default; the components stay available for a node that wants
      // to be specific. Emitting the token here would set a *colour* port to a
      // full shadow value, which is what the authored pages ended up doing.
      out.boxShadowEnabled = 'true';
      continue;
    }

    if (NO_SUCH_PORT.has(key)) continue;

    out[key] = value;
  }

  return out;
}

/**
 * P94 STY-002 — CSS properties an element config stamps that **no node type declares a port for**,
 * so the vocabulary must not teach them.
 *
 * 🔴 **Found by widening `tests-unit/aib-001/styleVocabularyPorts.test.ts` to the type `defaults`,
 * which it had never seen.** Under the old shape the defaults were folded into a node by the
 * editor's stamp and never reached this document, so the gate — whose whole doctrine is *"it is the
 * catalog, not a reviewer, deciding what the vocabulary is allowed to say"* — could not see them.
 * Measured against the catalog and the viewer: `Text` has no `flexGrow`/`flexShrink` input and
 * neither node file mentions either word; `Button` and `Checkbox` have no `cursor` input.
 *
 * ⚠️ **These are dead stamps in the product, not only in this document, and that is a separate
 * defect this task does not fix.** `applyDefaults` writes all three onto every `Text`, `Button` and
 * `Checkbox` created on canvas, and they reach real project files — `members area Richard test`
 * carries both `flexShrink` and `cursor` in `nodes.json`, where the runtime drops them. TextConfig
 * even labels its pair *"BUG FIX: Proper flex participation"*, which is a fix that has never
 * applied. Removing them from the configs changes what a newly created node carries and wants a
 * drive to confirm; filed in STY-002 rather than smuggled in here. What this list does is stop the
 * **teaching** of them, which is the half that costs an authoring model real output.
 */
const NO_SUCH_PORT = new Set(['cursor', 'flexGrow', 'flexShrink']);

/**
 * Build the full style vocabulary. Pass a metadata source (ProjectModel, a
 * serialized project's `{ getMetaData }`, or the MCP project file) to reflect a
 * project's custom token overrides; omit it for the shipped defaults.
 */
export function buildStyleVocabulary(
  source?: MetaDataSource | null,
  /**
   * P94 STY-002 AC6 — the Looks this project holds, read from `nodegx.styles.json` by the caller.
   * Omitted leaves `projectLooks` absent rather than empty: a caller that cannot see the file and a
   * project that has no Looks are two different readings, and reporting them the same way is how
   * "0 text styles in 90 projects" got claimed twice in this phase from a wrong key.
   */
  projectLooks?: readonly VocabProjectLook[]
): StyleVocabulary {
  const tokenMap = buildEffectiveTokens(readStoredTokens(source));

  const byCategory = new Map<TokenCategory, VocabToken[]>();
  for (const record of tokenMap.values()) {
    const list = byCategory.get(record.category) ?? [];
    list.push({
      name: record.name,
      category: record.category,
      ...(record.isCustom ? { isCustom: true } : {}),
      ...(record.description ? { description: record.description } : {})
    });
    byCategory.set(record.category, list);
  }

  const categories: VocabTokenCategory[] = (Object.keys(TOKEN_CATEGORIES) as TokenCategory[])
    .map((category) => ({
      category,
      label: TOKEN_CATEGORIES[category].label,
      group: TOKEN_CATEGORIES[category].group,
      tokens: byCategory.get(category) ?? []
    }))
    .filter((c) => c.tokens.length > 0);

  const elements: VocabElement[] = ElementConfigRegistry.getAll().map((config) => {
    const nodeType = config.nodeType;
    // 🔴 A Look *stored in a project* is self-contained — the config's `defaults` merged with the
    // variant's own properties — because a node wearing one may carry no style parameters at all.
    // That is what `shippedLook` builds and what `copy this Look into the project` must store.
    // **Here the two halves are reported separately**, because repeating the defaults under each of
    // 22 Looks cost 900 prompt tokens of pure duplication on a surface with 290 to spare.
    const defaults = toPortParameters(stripPresetMarkers(config.defaults) as Record<string, string>);
    const looks: VocabLook[] = shippedLooksFor(config).map((look) => {
      const delta: Record<string, string> = {};
      const full = toPortParameters(look.parameters as Record<string, string>);
      for (const [key, value] of Object.entries(full)) {
        if (defaults[key] !== value) delta[key] = value;
      }
      return { id: look.shippedFrom, name: look.name, parameters: delta };
    });
    return { nodeType, defaults, looks };
  });

  const presets = listVocabularyPresets();

  // Static by design: a composition is a set of token NAMES, and names are
  // stable across projects — only the values a project overrides change, and
  // those are already reflected in `categories`. Nothing here reads `source`.
  const compositions = STYLE_COMPOSITIONS;

  return {
    categories,
    elements,
    ...(projectLooks === undefined ? {} : { projectLooks: [...projectLooks] }),
    compositions,
    presets
  };
}

/**
 * Preset descriptions, without importing the StylePresets model's default-token
 * apparatus into pure code paths. Kept in lockstep with StylePresetsModel's
 * built-ins (id/name/description) — the only fields the vocabulary exposes.
 */
export function listVocabularyPresets(): VocabPreset[] {
  return [
    { id: 'modern', name: 'Modern', description: 'The balanced default — clean, neutral, Tailwind-scale.' },
    { id: 'minimal', name: 'Minimal', description: 'Restrained: subtle borders, muted palette, tight radius.' },
    { id: 'playful', name: 'Playful', description: 'Vivid colors, rounded corners, generous spacing.' },
    { id: 'enterprise', name: 'Enterprise', description: 'Dense, conservative, high-contrast for data-heavy UIs.' },
    { id: 'soft', name: 'Soft', description: 'Gentle pastels, large radius, airy spacing.' }
  ];
}

// ── Prompt rendering ────────────────────────────────────────────────────────

export interface RenderVocabularyOptions {
  /**
   * When given, only these element types get their variants/sizes spelled out
   * (the rest are named). Keeps the block inside AIX-002's structural budget —
   * the agent asks the catalog for element ports anyway.
   */
  elementTypes?: string[];
  /** Cap on tokens listed per category before eliding — keeps colour scales from bloating. */
  maxTokensPerCategory?: number;
}

const DEFAULT_MAX_TOKENS_PER_CATEGORY = 40;

/**
 * Render the vocabulary as a compact prompt block: category summaries (token
 * NAMES only — the agent references names, never values), and the legal
 * variants/sizes per element with the token-referenced styles each implies.
 * Deliberately terse — this rides inside AIX-002's existing context budget.
 */
export function renderStyleVocabulary(vocab: StyleVocabulary, options: RenderVocabularyOptions = {}): string {
  const cap = options.maxTokensPerCategory ?? DEFAULT_MAX_TOKENS_PER_CATEGORY;
  const lines: string[] = [];

  lines.push('DESIGN TOKENS — reference these by name as `var(--name)`; never emit a raw hex or px when a token fits.');
  for (const group of TOKEN_CATEGORY_GROUPS) {
    const inGroup = vocab.categories.filter((c) => c.group === group);
    if (inGroup.length === 0) continue;
    for (const cat of inGroup) {
      const names = cat.tokens.map((t) => t.name);
      const isRaw = RAW_SCALE_CATEGORIES.has(cat.category);
      const shown = names.slice(0, isRaw ? 8 : cap);
      const suffix = names.length > shown.length ? `, … (+${names.length - shown.length})` : '';
      const note = isRaw ? ' [raw scale — prefer the semantic colours above]' : '';
      lines.push(`- ${cat.label}: ${shown.join(', ')}${suffix}${note}`);
    }
  }

  if (vocab.compositions.length > 0) {
    lines.push('');
    // Deliberately ahead of the variant catalogue: this is the part an agent
    // acts on. Variants are a lookup; these are the decisions it should not be
    // making one page at a time.
    lines.push(
      'COMPOSITIONS — named parameter sets lifted verbatim from the validated recipes; fix them ONCE and reuse ' +
        'them rather than re-deciding a radius per card. Copy a set onto the node type in brackets exactly as ' +
        'written: a dimension is {"value":N,"unit":"px"}, and a "Npx" string is dropped in silence. [recipe-id] ' +
        'is the same thing assembled — fetch it with get_example.'
    );
    let group = '';
    for (const c of vocab.compositions) {
      if (c.group !== group) {
        group = c.group;
        lines.push(`  ${group}:`);
      }
      lines.push(`- ${c.id} (${c.nodeType}) [${c.recipe}]: ${formatCompositionParams(c)}`);
    }
  }

  // P94 STY-002 AC6. What this project already holds comes BEFORE the shipped library, for the
  // same reason the tokens do: a Look somebody already made is the house style, and an agent that
  // reads the library first invents a second one beside it.
  if (vocab.projectLooks !== undefined && vocab.projectLooks.length > 0) {
    lines.push('');
    lines.push(
      "THIS PROJECT'S LOOKS — named styles nodes here already wear. A Look is identified by its name AND the " +
        'node type it dresses. Match one rather than inventing a parallel style; to give a node this look, copy ' +
        'the parameters listed for it:'
    );
    for (const look of vocab.projectLooks) {
      const states = look.states && look.states.length > 0 ? ` (+ states: ${look.states.join(', ')})` : '';
      lines.push(`- ${look.name} · ${look.typename}${states}: ${formatStyleMap(look.parameters)}`);
    }
  }

  if (vocab.elements.length > 0) {
    lines.push('');
    // The old wording offered two routes — "set the element type via the marker
    // param, or copy the styles it implies" — and the marker route does not
    // work: `variant` is `allowConnectionsOnly`, so a statically authored value
    // is discarded. An agent that took the shorter-looking option wrote
    // `variant: "heading-1"` on every Text, set no font size or colour, and
    // shipped a page that rendered entirely at browser defaults. There is only
    // one route now, and the validator errors on the other.
    //
    // P94 STY-002: the block is the shipped **Look library** now, and the sizes half is gone
    // (`_size`: 0 uses in 105 real projects). The one-route warning stands unchanged and for the
    // unchanged reason — the `variant` port is connection-only, so parameters are still the only
    // way an agent dresses a node.
    lines.push(
      'SHIPPED LOOKS — a library of coherent styles per element type, NOT settable parameters. ' +
        '"variant" is a connection-only port: setting it as a parameter is discarded and is a validation ' +
        'error. To give a node one of these looks, copy BOTH its element type\'s defaults AND the look\'s own ' +
        'parameters onto the node (the look lists only what it changes):'
    );
    const spellOut = options.elementTypes ? new Set(options.elementTypes) : null;
    for (const el of vocab.elements) {
      lines.push(`- ${el.nodeType}: ${el.looks.map((l) => l.name).join(', ') || 'none'}`);
      if (spellOut && !spellOut.has(el.nodeType)) continue;
      if (Object.keys(el.defaults).length > 0) {
        lines.push(`    defaults: ${formatStyleMap(el.defaults)}`);
      }
      for (const look of el.looks) {
        if (Object.keys(look.parameters).length > 0) {
          lines.push(`    · ${look.name}: ${formatStyleMap(look.parameters)}`);
        }
      }
    }
  }

  return lines.join('\n');
}

/**
 * One composition's parameters as `k=v` pairs. The description is NOT rendered
 * here — it is in `detail: "full"` — because the block has a budget and the name
 * plus the recipe id already say what the set is for.
 */
function formatCompositionParams(composition: VocabComposition): string {
  return Object.entries(composition.parameters)
    .map(([k, v]) => `${k}=${formatCompositionValue(v)}`)
    .join(', ');
}

/**
 * `prop=value, prop=value`. Values arrive as `unknown` for a project's own Looks, whose parameters
 * are whatever a person set on a node — a number, a boolean, an object for a colour with an alpha —
 * so they are stringified rather than assumed to be CSS strings.
 */
function formatStyleMap(styles: Record<string, unknown>): string {
  return Object.entries(styles)
    .map(([k, v]) => `${k}=${typeof v === 'string' ? v : JSON.stringify(v)}`)
    .join(', ');
}

/** Every token name the vocabulary knows — for cheap "is this a real token?" checks. */
export function vocabularyTokenNames(vocab: StyleVocabulary): Set<string> {
  const names = new Set<string>();
  for (const cat of vocab.categories) for (const t of cat.tokens) names.add(t.name);
  return names;
}

/** The full record list (defaults + overrides) as a flat array — for lint token-matching. */
export function vocabularyTokenRecords(source?: MetaDataSource | null): StyleTokenRecord[] {
  return Array.from(buildEffectiveTokens(readStoredTokens(source)).values());
}
