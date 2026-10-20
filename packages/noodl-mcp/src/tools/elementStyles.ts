/**
 * P112-OWN020-OFFSYSTEM — element styles: one look per node type, for every node of that type at once.
 *
 * Richard on OpenTune's Browse page (2026-10-19): "a weird mix of elegant, smaller fonts and elements, and some chunky
 * weird ones like the 'Sort By' choice circles … we need to make styles more 'global' … all labels are this font and
 * this size". Measured: the model put every Text, Button and chip on tokens and placed three Radio Buttons with no
 * style at all, so they drew the runtime's own defaults (a 32 px circle, a 2 px black ring, a black dot). Mistral did
 * the same in SP1. An agent styles what it is thinking about; a control placed in passing keeps the runtime's look.
 *
 * The layer for this already exists in the runtime: a variant with NO name matches every node of its type that names
 * no variant (`graphmodel.ts` `getVariant`: `v.name === node.variant`, both undefined), below the node's own
 * parameters in precedence. The format persists it in `nodegx.styles.json` and the preview and the editor's importer
 * load it. What was missing was the writing side, which is this module:
 * - `set_element_style` (deferred `theme` group): an agent sets the look of a node type once; `starter: true` writes
 *   the on-system look below for that type.
 * - `readElementStyles`: what `get_style_vocabulary` reports, so an agent sees the layer before it styles a node.
 * - `addStarterElementStyles`: every control's starter at once. NOT called by `create_project` or `set_style_preset`
 *   (2026-10-20, Richard on the measured plan, OWN-020 §12 "option 4"): every template is built through
 *   `create_project`, so stamping new projects restyled ~700 controls in 13 shipped templates, and the starters change
 *   size as well as look. Parked as `own-020/option4-stamp.patch` until "adopt, keeping what's there" exists.
 *
 * The starters are token references only, so they follow whatever preset or tokens the project sets.
 *
 * Why not change the runtime's own defaults instead: the shipped default tokens are injected into every project's
 * page, so pointing a control's hard-coded default at a token would restyle the controls of every existing app on
 * upgrade. A new project gets the look from its own styles file; an existing one gets it when its author asks.
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getNodeTypeDetail, listNodeTypes } from '../catalog';
import { ToolError } from '../errors';
import type { ProjectBinding } from '../project/ProjectBinding';
import type { ProjectStore } from '../project/ProjectStore';
import { guarded, jsonResult } from './util';
import type { StylesV2File } from '../editor-deps';

export const STYLES_SCHEMA = 'https://opennoodl.dev/schemas/styles-v2.json';

/** Visual states a control's element style may set (the runtime's state names). */
export const ELEMENT_STATES = ['hover', 'pressed', 'focused', 'disabled'] as const;

export interface ElementStyle {
  parameters: Record<string, unknown>;
  stateParameters?: Record<string, Record<string, unknown>>;
}

/**
 * The on-system look of every control a person places, as token references. Filled from the runtime census
 * (OWN-020, 2026-10-19): each key is a node type, each parameter a port that type has (a test checks every one
 * against the catalog, so a renamed port fails the suite rather than writing a dead parameter).
 */
const LABEL: Record<string, unknown> = {
  labelfontSize: 'var(--text-sm)',
  labelfontWeight: 'var(--font-normal)',
  labelcolor: 'var(--foreground)',
  labelSpacing: 'var(--space-2)'
};
const FIELD_BORDER: Record<string, unknown> = {
  borderStyle: 'solid',
  borderWidth: 'var(--border-1)',
  borderColor: 'var(--border-control)'
};
/**
 * No width on a Text Input or Dropdown, no flex, no margins — but NOT look only: padding (Button, Text Input,
 * Dropdown) and width/height (Checkbox, Radio Button) change a control's size, so writing these over controls that
 * already exist can move things (2026-10-20: the D28 layout drive's contentSize buttons stopped overlapping once
 * they wore the Button starter). Button, Checkbox and Text Input match the editor's own ElementConfigs (what its
 * picker stamps on a new node); Radio Button, Dropdown and Slider had none.
 */
export const ELEMENT_STYLE_STARTERS: Record<string, ElementStyle> = {
  'net.noodl.controls.button': {
    parameters: {
      backgroundColor: 'var(--primary)',
      color: 'var(--primary-foreground)',
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--text-sm)',
      fontWeight: 'var(--font-medium)',
      borderRadius: 'var(--radius-md)',
      paddingTop: 'var(--space-2)',
      paddingBottom: 'var(--space-2)',
      paddingLeft: 'var(--space-4)',
      paddingRight: 'var(--space-4)'
    },
    stateParameters: { hover: { backgroundColor: 'var(--primary-hover)' }, disabled: { opacity: 0.5 } }
  },
  'net.noodl.controls.checkbox': {
    parameters: {
      width: 'var(--space-4)',
      height: 'var(--space-4)',
      backgroundColor: 'var(--background)',
      ...FIELD_BORDER,
      borderRadius: 'var(--radius-sm)',
      ...LABEL
    },
    stateParameters: { hover: { borderColor: 'var(--primary)' }, disabled: { opacity: 0.5 } }
  },
  'net.noodl.controls.radiobutton': {
    parameters: {
      width: 'var(--space-4)',
      height: 'var(--space-4)',
      backgroundColor: 'var(--background)',
      ...FIELD_BORDER,
      borderRadius: 'var(--radius-full)',
      fillColor: 'var(--primary)',
      fillSpacing: 'var(--space-0-5)',
      ...LABEL
    },
    stateParameters: { hover: { borderColor: 'var(--primary)' }, disabled: { opacity: 0.5 } }
  },
  'net.noodl.controls.textinput': {
    parameters: {
      backgroundColor: 'var(--background)',
      color: 'var(--foreground)',
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--text-base)',
      ...FIELD_BORDER,
      borderRadius: 'var(--radius-md)',
      paddingTop: 'var(--space-2)',
      paddingBottom: 'var(--space-2)',
      paddingLeft: 'var(--space-3)',
      paddingRight: 'var(--space-3)',
      ...LABEL
    },
    stateParameters: { hover: { borderColor: 'var(--border-strong)' }, disabled: { opacity: 0.5 } }
  },
  'net.noodl.controls.options': {
    parameters: {
      backgroundColor: 'var(--background)',
      color: 'var(--foreground)',
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--text-base)',
      ...FIELD_BORDER,
      borderRadius: 'var(--radius-md)',
      paddingTop: 'var(--space-2)',
      paddingBottom: 'var(--space-2)',
      paddingLeft: 'var(--space-3)',
      paddingRight: 'var(--space-3)',
      ...LABEL
    },
    stateParameters: { hover: { borderColor: 'var(--border-strong)' }, disabled: { opacity: 0.5 } }
  },
  'net.noodl.controls.range': {
    parameters: {
      thumbColor: 'var(--primary)',
      thumbWidth: 'var(--space-4)',
      thumbHeight: 'var(--space-4)',
      thumbBorderRadius: 'var(--radius-full)',
      trackColor: 'var(--muted)',
      trackActiveColor: 'var(--primary)',
      trackHeight: 'var(--space-1)',
      trackBorderRadius: 'var(--radius-full)'
    }
  }
};

type Variant = NonNullable<StylesV2File['variants']>[number];

const isElementStyle = (v: Variant | undefined): v is Variant =>
  !!v && typeof v.typename === 'string' && (v.name === undefined || v.name === null || v.name === '');

/** The project's element styles, by node type. */
export function readElementStyles(store: ProjectStore): Record<string, ElementStyle> {
  const out: Record<string, ElementStyle> = {};
  for (const v of store.readStyles()?.variants ?? []) {
    if (!isElementStyle(v)) continue;
    const states = (v.stateParameters ?? (v as Record<string, unknown>).stateParamaters) as
      | Record<string, Record<string, unknown>>
      | undefined;
    out[v.typename] = {
      parameters: (v.parameters ?? {}) as Record<string, unknown>,
      ...(states && Object.keys(states).length > 0 ? { stateParameters: states } : {})
    };
  }
  return out;
}

function stylesOrNew(store: ProjectStore): StylesV2File {
  return store.readStyles() ?? { $schema: STYLES_SCHEMA };
}

function upsert(styles: StylesV2File, typename: string, style: ElementStyle | null): void {
  const variants = (styles.variants ?? []).filter((v) => !(isElementStyle(v) && v.typename === typename));
  if (style) {
    variants.push({
      typename,
      parameters: style.parameters,
      ...(style.stateParameters && Object.keys(style.stateParameters).length > 0
        ? { stateParameters: style.stateParameters }
        : {})
    });
  }
  styles.variants = variants;
}

/**
 * Write the starter look for every control that has no element style yet. Returns what was added and what the
 * project already had (kept as it is). `write: false` reports without writing. No caller yet: kept for option 4's
 * "adopt, keeping what's there" (see the header).
 */
export function addStarterElementStyles(
  store: ProjectStore,
  options: { write?: boolean } = {}
): { added: string[]; kept: string[] } {
  const existing = readElementStyles(store);
  const added: string[] = [];
  const kept: string[] = [];
  const styles = stylesOrNew(store);
  for (const [typename, style] of Object.entries(ELEMENT_STYLE_STARTERS)) {
    if (existing[typename]) {
      kept.push(typename);
      continue;
    }
    upsert(styles, typename, style);
    added.push(typename);
  }
  if (added.length > 0 && options.write !== false) store.writeStyles(styles);
  return { added, kept };
}

/** A friendly name ("Radio Button") or a type name ("net.noodl.controls.radiobutton") → the catalog's type name. */
export function resolveElementType(name: string): string {
  const direct = getNodeTypeDetail(name);
  // 🔴 The deprecated controls are TYPE-named by their display names ("Radio Button", "Checkbox"), so an exact hit
  // can be the legacy type no new node uses. Measured in this module's first test run: "Radio Button" wrote a style
  // for the deprecated type and the live net.noodl.controls.radiobutton kept the runtime's look. A live type wins.
  if (!('error' in direct) && !direct.deprecated) return direct.typeName;
  const wanted = name.trim().toLowerCase();
  const rows = listNodeTypes({ includeHidden: true }).filter(
    (r) => r.displayName.toLowerCase() === wanted || r.typeName.toLowerCase() === wanted
  );
  const live = rows.find((r) => !r.deprecated);
  if (live) return live.typeName;
  if (!('error' in direct)) return direct.replacedBy ?? direct.typeName;
  throw new ToolError('not-found', direct.error, direct.suggestion ? { suggestion: direct.suggestion } : undefined);
}

/** Every parameter name a type accepts; a name it does not have is refused by name, as an unknown argument is. */
function assertPorts(typename: string, names: readonly string[], where: string): void {
  const detail = getNodeTypeDetail(typename);
  if ('error' in detail) throw new ToolError('not-found', detail.error);
  const ports = new Set(detail.inputs.map((p) => p.name));
  const unknown = names.filter((n) => !ports.has(n));
  if (unknown.length === 0) return;
  const lower = new Map([...ports].map((p) => [p.toLowerCase(), p]));
  const suggestions = Object.fromEntries(
    unknown.map((u) => [u, lower.get(u.toLowerCase()) ?? [...ports].find((p) => p.toLowerCase().includes(u.toLowerCase()))])
  );
  throw new ToolError(
    'invalid-argument',
    `${detail.displayName} has no ${unknown.map((u) => `"${u}"`).join(', ')} ${where}. ` +
      'get_node_type lists its ports; an element style sets the same parameters a node does.',
    { unknownParameters: unknown, suggestions }
  );
}

/** How many nodes of this type set a parameter themselves, which wins over the element style. */
function nodesOverriding(store: ProjectStore, typename: string, names: readonly string[]): {
  nodes: number;
  overriding: Array<{ component: string; nodeId: string; parameters: string[] }>;
} {
  let nodes = 0;
  const overriding: Array<{ component: string; nodeId: string; parameters: string[] }> = [];
  for (const row of store.listComponents()) {
    const key = row.path;
    let stored;
    try {
      stored = store.readComponent(key);
    } catch {
      continue;
    }
    for (const n of stored.files.nodes.nodes ?? []) {
      if (n.type !== typename || (n as { variant?: string }).variant) continue;
      nodes += 1;
      const own = names.filter((p) => n.parameters && Object.prototype.hasOwnProperty.call(n.parameters, p));
      if (own.length > 0) overriding.push({ component: key, nodeId: n.id, parameters: own });
    }
  }
  return { nodes, overriding };
}

export function registerElementStyleTools(server: McpServer, binding: ProjectBinding): void {
  server.registerTool(
    'set_element_style',
    {
      title: 'Set an element style',
      description:
        'Set the look of every node of one type at once — every Radio Button, Checkbox, Text Input, Dropdown, ' +
        "Slider, Button or Text — so whichever control you place matches the page. starter: true writes the " +
        "on-system look for a control type; parameters are the node's own (get_node_type lists them), as " +
        '"var(--token)" values. A node that sets a parameter itself keeps its own value. Read them with ' +
        'get_style_vocabulary (elementStyles). Set merges into the current style; remove: true clears it.',
      inputSchema: {
        type: z.string().describe('Node type or its display name, e.g. "Radio Button" or "net.noodl.controls.radiobutton"'),
        starter: z.boolean().optional().describe('true = start from the on-system look for this control type (parameters still apply on top)'),
        parameters: z.record(z.unknown()).optional().describe('e.g. { "width": "var(--space-4)", "labelFontSize": "var(--text-sm)" }'),
        states: z
          .record(z.record(z.unknown()))
          .optional()
          .describe(`Per visual state (${ELEMENT_STATES.join(', ')}), the parameters that change`),
        unset: z.array(z.string()).optional().describe('Parameter names to drop from the style'),
        remove: z.boolean().optional().describe('true = delete this element style')
      }
    },
    guarded(
      (args: {
        type: string;
        starter?: boolean;
        parameters?: Record<string, unknown>;
        states?: Record<string, Record<string, unknown>>;
        unset?: string[];
        remove?: boolean;
      }) => {
        const store = binding.require();
        const typename = resolveElementType(args.type);
        const styles = stylesOrNew(store);
        const current = readElementStyles(store)[typename];

        if (args.remove) {
          upsert(styles, typename, null);
          store.writeStyles(styles);
          return jsonResult({ ok: true, type: typename, removed: !!current });
        }
        if (!args.starter && !args.parameters && !args.states && !args.unset) {
          throw new ToolError('invalid-argument', 'Pass starter: true, parameters, states, unset or remove: true.');
        }
        const starter = args.starter ? ELEMENT_STYLE_STARTERS[typename] : undefined;
        if (args.starter && !starter) {
          throw new ToolError(
            'invalid-argument',
            `There is no starter look for ${typename}. Starters exist for: ${Object.keys(ELEMENT_STYLE_STARTERS).join(', ')}. Pass parameters instead.`
          );
        }

        // The starter replaces the current style's values it names; anything else the style has, and the caller's
        // parameters, sit on top.
        const parameters = { ...(current?.parameters ?? {}), ...(starter?.parameters ?? {}), ...(args.parameters ?? {}) };
        for (const u of args.unset ?? []) delete parameters[u];
        const stateParameters: Record<string, Record<string, unknown>> = { ...(current?.stateParameters ?? {}) };
        for (const [state, params] of Object.entries(starter?.stateParameters ?? {})) {
          stateParameters[state] = { ...(stateParameters[state] ?? {}), ...params };
        }
        for (const [state, params] of Object.entries(args.states ?? {})) {
          if (!(ELEMENT_STATES as readonly string[]).includes(state)) {
            throw new ToolError('invalid-argument', `Unknown visual state "${state}". Use one of: ${ELEMENT_STATES.join(', ')}.`);
          }
          stateParameters[state] = { ...(stateParameters[state] ?? {}), ...params };
        }

        assertPorts(typename, Object.keys(parameters), 'parameter');
        for (const [state, params] of Object.entries(stateParameters)) assertPorts(typename, Object.keys(params), `parameter (state "${state}")`);

        upsert(styles, typename, { parameters, stateParameters });
        store.writeStyles(styles);
        const reach = nodesOverriding(store, typename, Object.keys(parameters));
        return jsonResult({
          ok: true,
          type: typename,
          style: { parameters, ...(Object.keys(stateParameters).length ? { states: stateParameters } : {}) },
          nodesOfType: reach.nodes,
          ...(reach.overriding.length
            ? {
                overriding: reach.overriding.slice(0, 20),
                note:
                  `${reach.overriding.length} of ${reach.nodes} set some of these parameters themselves and keep their own ` +
                  'value. Remove them from those nodes (update_node unset_parameters) to let the element style through.'
              }
            : {})
        });
      }
    )
  );
}
