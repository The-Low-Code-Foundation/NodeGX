import fs from 'fs';
import path from 'path';

import {
  convertTextStylesToTokens,
  describeTextStyleConversion,
  TEXT_STYLE_WEARERS,
  TextStyleNodeLike,
  TextStyleProjectLike
} from '../../src/editor/src/models/ProjectPatches/textStylesToTokens';
import { upgradeOnLoad } from '../../src/editor/src/models/ProjectPatches/upgradeOnLoad';
import { stripComments } from '../support/renderElements';

/**
 * P100 UPG-003 — text styles become typography tokens on load (R3 + R8).
 *
 * The criteria P99 HLT-020 §4 fixed before the shape was ruled: the control is a style worn
 * across node types, and the arm is not "it looks the same" but **change the style once after
 * conversion and read every wearer**; a double-wearer is in the set; state wearers are graded.
 *
 * `render` below is this file's own reading of the runtime's precedence (variant, variant state,
 * node, node state; an explicit font port beats a text style from any layer), written separately
 * from the module's simulation so the two can disagree.
 */

type Params = Record<string, unknown>;

const STYLE = (size: string, extra: Params = {}): Params => ({
  fontFamily: 'fonts/Inter/Inter-Medium.ttf',
  fontSize: { value: size, unit: 'px' },
  lineHeight: { value: '120', unit: '%' },
  letterSpacing: '0.5px',
  textTransform: 'uppercase',
  color: '#123456',
  ...extra
});

function nodesOf(p: TextStyleProjectLike): TextStyleNodeLike[] {
  const out: TextStyleNodeLike[] = [];
  const walk = (n: TextStyleNodeLike) => {
    out.push(n);
    (n.children ?? []).forEach(walk);
  };
  for (const c of p.components ?? []) (c.graph?.roots ?? []).forEach(walk);
  return out;
}

function node(p: TextStyleProjectLike, id: string): TextStyleNodeLike {
  const n = nodesOf(p).find((x) => x.id === id);
  if (!n) throw new Error(`no node ${id}`);
  return n;
}

const own = (o: Params | undefined, k: string) => !!o && Object.prototype.hasOwnProperty.call(o, k) && o[k] !== undefined;

function css(v: unknown): string | null {
  if (v === undefined || v === null || v === '') return null;
  if (typeof v === 'object') {
    const o = v as { value?: unknown; unit?: unknown };
    return o.value === undefined || o.value === '' ? null : String(o.value) + String(o.unit ?? '');
  }
  return String(v);
}

/** What the runtime draws for `prop` through `port` on node `id` in `state`. */
function render(p: TextStyleProjectLike, id: string, port: string, prop: string, state = 'neutral'): string | null {
  const n = node(p, id);
  const tokens = new Map<string, string>(
    (p.metadata?.designTokens?.customTokens ?? []).map((t: { name: string; value: string }) => [t.name, t.value])
  );
  const defs: Record<string, Params> = p.metadata?.styles?.text ?? {};
  const v = (p.variants ?? []).find((x) => x.typename === n.type && x.name === n.variant);
  const vs = (v && (v.stateParamaters ?? v.stateParameters)) || {};
  const stack =
    state === 'neutral'
      ? [v?.parameters, n.parameters]
      : [v?.parameters, vs[state], n.parameters, n.stateParameters?.[state]];
  const child = port.slice(0, -'textStyle'.length) + prop;
  for (let i = stack.length - 1; i >= 0; i--) {
    if (own(stack[i], child)) {
      const x = stack[i]![child];
      if (x === '') return null;
      const m = typeof x === 'string' ? /^var\((--[^)]+)\)$/.exec(x) : null;
      return m ? tokens.get(m[1]) ?? `UNDEFINED ${m[1]}` : css(x);
    }
  }
  for (let i = stack.length - 1; i >= 0; i--) {
    if (own(stack[i], port)) {
      const v = css((defs[stack[i]![port] as string] ?? {})[prop]);
      // the browser drops `letter-spacing: Auto` as invalid, so a style holding it sets nothing
      return v !== null && prop !== 'fontFamily' && prop !== 'color' && prop !== 'textTransform' && /^auto$/i.test(v)
        ? null
        : v;
    }
  }
  return null;
}

function project(parts: {
  text?: Record<string, Params>;
  colors?: Record<string, string>;
  tokens?: { name: string; value: string; category: string }[];
  nodes?: TextStyleNodeLike[];
  variants?: TextStyleProjectLike['variants'];
  connections?: { fromId: string; fromProperty: string; toId: string; toProperty: string }[];
}): TextStyleProjectLike {
  return {
    components: [{ name: '/App', graph: { roots: parts.nodes ?? [], connections: parts.connections ?? [] } }],
    variants: parts.variants ?? [],
    metadata: {
      styles: { text: parts.text ?? {}, colors: parts.colors ?? {} },
      ...(parts.tokens
        ? { designTokens: { version: 1, customTokens: parts.tokens.map((t) => ({ ...t, isCustom: true })) } }
        : {})
    }
  };
}

const PROPS = ['fontFamily', 'fontSize', 'color', 'letterSpacing', 'lineHeight', 'textTransform'];

function snapshot(p: TextStyleProjectLike, wearers: [string, string][], states = ['neutral']) {
  const out: Record<string, string | null> = {};
  for (const [id, port] of wearers)
    for (const s of states) for (const prop of PROPS) out[`${id}/${port}/${prop}/${s}`] = render(p, id, port, prop, s);
  return out;
}

function setToken(p: TextStyleProjectLike, name: string, value: string) {
  const t = p.metadata!.designTokens.customTokens.find((x: { name: string }) => x.name === name);
  if (!t) throw new Error(`no token ${name}`);
  t.value = value;
}

describe('P100 UPG-003 — a style worn across node types stays one style', () => {
  // Landing page test V2's shape: one "Label Medium" on a Text, a Text Input, an Options and a
  // Checkbox label (HLT-020 §2c) — and the Options also wears a second style on its label.
  const build = () =>
    project({
      text: { 'Label Medium': STYLE('14'), 'Body Big': STYLE('18', { textTransform: 'none' }) },
      nodes: [
        { id: 't', type: 'Text', parameters: { textStyle: 'Label Medium' } },
        { id: 'i', type: 'net.noodl.controls.textinput', parameters: { textStyle: 'Label Medium' } },
        {
          id: 'o',
          type: 'net.noodl.controls.options',
          parameters: { textStyle: 'Label Medium', labeltextStyle: 'Body Big' }
        },
        { id: 'c', type: 'net.noodl.controls.checkbox', parameters: { labeltextStyle: 'Label Medium' } }
      ]
    });
  const wearers: [string, string][] = [
    ['t', 'textStyle'],
    ['i', 'textStyle'],
    ['o', 'textStyle'],
    ['o', 'labeltextStyle'],
    ['c', 'labeltextStyle']
  ];

  it('draws every wearer exactly as it did', () => {
    const p = build();
    const before = snapshot(p, wearers);
    const report = convertTextStylesToTokens(p);

    expect(report.changed).toBe(true);
    expect(report.notCarried).toEqual([]);
    expect(snapshot(p, wearers)).toEqual(before);
    // control: the snapshot is not empty — it read real values through the style
    expect(before['t/textStyle/fontSize/neutral']).toBe('14px');
    expect(before['o/labeltextStyle/fontSize/neutral']).toBe('18px');
  });

  it('changing the style once, after conversion, moves every wearer of it and no other', () => {
    const p = build();
    convertTextStylesToTokens(p);
    setToken(p, '--label-medium-size', '15px');

    for (const [id, port] of wearers.filter(([id, port]) => !(id === 'o' && port === 'labeltextStyle'))) {
      expect(render(p, id, port, 'fontSize')).toBe('15px');
    }
    // the double-wearer's other style did not move with it
    expect(render(p, 'o', 'labeltextStyle', 'fontSize')).toBe('18px');
  });

  it('no wearer names a text style any more, and the definitions are gone', () => {
    const p = build();
    convertTextStylesToTokens(p);
    for (const n of nodesOf(p)) {
      expect(Object.keys(n.parameters ?? {}).filter((k) => /textStyle$/.test(k))).toEqual([]);
    }
    expect(p.metadata!.styles.text).toBeUndefined();
    // control: the colour styles beside them were left where they were
    expect(p.metadata!.styles.colors).toEqual({});
  });
});

describe('P100 UPG-003 — what each property becomes', () => {
  it('sizes, leading, tracking and a new colour become tokens; font files and case are copied', () => {
    const p = project({
      text: { 'Label Medium': STYLE('14') },
      nodes: [{ id: 't', type: 'Text', parameters: { textStyle: 'Label Medium' } }]
    });
    convertTextStylesToTokens(p);
    expect(node(p, 't').parameters).toEqual({
      fontSize: 'var(--label-medium-size)',
      lineHeight: 'var(--label-medium-leading)',
      letterSpacing: 'var(--label-medium-tracking)',
      color: 'var(--label-medium-color)',
      fontFamily: 'fonts/Inter/Inter-Medium.ttf',
      textTransform: 'uppercase'
    });
    const tokens = p.metadata!.designTokens.customTokens;
    expect(tokens.map((t: { name: string; category: string }) => [t.name, t.category])).toEqual([
      ['--label-medium-size', 'typography-size'],
      ['--label-medium-color', 'color-palette'],
      ['--label-medium-tracking', 'typography-tracking'],
      ['--label-medium-leading', 'typography-leading']
    ]);
  });

  it("the old defaults' `letterSpacing: 'Auto'` sets nothing, so it becomes no token", () => {
    const p = project({
      text: { 'Label Medium': STYLE('14', { letterSpacing: 'Auto' }) },
      nodes: [{ id: 't', type: 'Text', parameters: { textStyle: 'Label Medium' } }]
    });
    const before = snapshot(p, [['t', 'textStyle']]);
    convertTextStylesToTokens(p);
    expect(node(p, 't').parameters!.letterSpacing).toBeUndefined();
    expect(p.metadata!.designTokens.customTokens.map((t: { name: string }) => t.name)).not.toContain(
      '--label-medium-tracking'
    );
    expect(snapshot(p, [['t', 'textStyle']])).toEqual(before);
    // control: the size beside it in the same style still became a token
    expect(node(p, 't').parameters!.fontSize).toBe('var(--label-medium-size)');
  });

  it('a family NAME becomes a token; a font FILE never does, because only the port loads the file', () => {
    const p = project({
      text: { Named: { fontFamily: 'Georgia' }, Filed: { fontFamily: 'fonts/Roboto/Roboto-Bold.ttf' } },
      nodes: [
        { id: 'a', type: 'Text', parameters: { textStyle: 'Named' } },
        { id: 'b', type: 'Text', parameters: { textStyle: 'Filed' } }
      ]
    });
    convertTextStylesToTokens(p);
    expect(node(p, 'a').parameters!.fontFamily).toBe('var(--named-family)');
    expect(node(p, 'b').parameters!.fontFamily).toBe('fonts/Roboto/Roboto-Bold.ttf');
  });

  it("a colour naming one of the project's colour styles is copied as that name, so it keeps resolving", () => {
    const p = project({
      text: { Brand: { color: 'LearnBook yellow' } },
      colors: { 'LearnBook yellow': '#ffcc00' },
      nodes: [{ id: 't', type: 'Text', parameters: { textStyle: 'Brand' } }]
    });
    const report = convertTextStylesToTokens(p);
    expect(node(p, 't').parameters!.color).toBe('LearnBook yellow');
    expect(report.tokensMinted).toEqual([]);
  });

  it("a hex equal to one of the project's own colour tokens references it; a shipped default is never matched", () => {
    const p = project({
      text: { Own: { color: '#abcdef' }, Default: { color: '#2563eb' } },
      tokens: [{ name: '--brand-ink', value: '#abcdef', category: 'color-palette' }],
      nodes: [
        { id: 'a', type: 'Text', parameters: { textStyle: 'Own' } },
        { id: 'b', type: 'Text', parameters: { textStyle: 'Default' } }
      ]
    });
    convertTextStylesToTokens(p);
    expect(node(p, 'a').parameters!.color).toBe('var(--brand-ink)');
    // `#2563eb` is `--primary`'s shipped value; a preset or theme moves it, so it is not borrowed
    expect(node(p, 'b').parameters!.color).toBe('var(--default-color)');
  });

  it('a name already taken by a different token gets a suffix instead of changing that token', () => {
    const p = project({
      text: { 'Label Medium': { fontSize: { value: '14', unit: 'px' } } },
      tokens: [{ name: '--label-medium-size', value: '99px', category: 'typography-size' }],
      nodes: [{ id: 't', type: 'Text', parameters: { textStyle: 'Label Medium' } }]
    });
    convertTextStylesToTokens(p);
    expect(node(p, 't').parameters!.fontSize).toBe('var(--label-medium-size-2)');
    expect(render(p, 't', 'textStyle', 'fontSize')).toBe('14px');
    // control: the token that was there is untouched
    expect(render(p, 't', 'textStyle', 'fontSize')).not.toBe('99px');
  });
});

describe('P100 UPG-003 — the stack: variants, states, and what sits beneath', () => {
  it('a default variant (no name) is converted, and a node on it still draws what it drew', () => {
    const p = project({
      text: { 'Body Medium': STYLE('16') },
      variants: [{ typename: 'Text', parameters: { textStyle: 'Body Medium' } }],
      nodes: [{ id: 't', type: 'Text', parameters: {} }]
    });
    const before = snapshot(p, [['t', 'textStyle']]);
    convertTextStylesToTokens(p);
    expect(p.variants![0].parameters!.textStyle).toBeUndefined();
    expect(p.variants![0].parameters!.fontSize).toBe('var(--body-medium-size)');
    expect(snapshot(p, [['t', 'textStyle']])).toEqual(before);
  });

  it('"None" over a variant that wears a style still draws nothing from it', () => {
    const p = project({
      text: { 'Body Medium': STYLE('16') },
      variants: [{ typename: 'Text', parameters: { textStyle: 'Body Medium' } }],
      nodes: [{ id: 't', type: 'Text', parameters: { textStyle: 'None' } }]
    });
    const before = snapshot(p, [['t', 'textStyle']]);
    expect(before['t/textStyle/fontSize/neutral']).toBeNull();
    const report = convertTextStylesToTokens(p);
    expect(snapshot(p, [['t', 'textStyle']])).toEqual(before);
    expect(report.corrections).toBeGreaterThan(0);
  });

  it('an explicit size in the variant still beats the style the node picks', () => {
    const p = project({
      text: { Big: STYLE('40') },
      variants: [{ typename: 'Text', parameters: { fontSize: { value: 20, unit: 'px' } } }],
      nodes: [{ id: 't', type: 'Text', parameters: { textStyle: 'Big' } }]
    });
    convertTextStylesToTokens(p);
    expect(render(p, 't', 'textStyle', 'fontSize')).toBe('20px');
    expect(render(p, 't', 'textStyle', 'lineHeight')).toBe('120%');
  });

  it('state wearers are graded: a hover style on the node and a pressed style on its variant', () => {
    const p = project({
      text: { Rest: STYLE('14'), Hover: STYLE('16'), Pressed: STYLE('12') },
      variants: [
        {
          typename: 'net.noodl.controls.button',
          name: 'Primary',
          parameters: { textStyle: 'Rest' },
          stateParamaters: { pressed: { textStyle: 'Pressed' } }
        }
      ],
      nodes: [
        {
          id: 'b',
          type: 'net.noodl.controls.button',
          variant: 'Primary',
          parameters: { fontSize: { value: 30, unit: 'px' } },
          stateParameters: { hover: { textStyle: 'Hover' } }
        }
      ]
    });
    const states = ['neutral', 'hover', 'pressed'];
    const before = snapshot(p, [['b', 'textStyle']], states);
    // control: the states really differ, so an equal snapshot is not three copies of one reading
    expect(before['b/textStyle/lineHeight/neutral']).toBe('120%');
    expect(before['b/textStyle/fontSize/hover']).toBe('30px');
    const report = convertTextStylesToTokens(p);
    expect(report.notCarried).toEqual([]);
    expect(snapshot(p, [['b', 'textStyle']], states)).toEqual(before);
    // and it is converted, not merely left drawing the same: no layer names a style, none is kept
    expect(node(p, 'b').stateParameters!.hover.textStyle).toBeUndefined();
    expect(p.variants![0].stateParamaters!.pressed.textStyle).toBeUndefined();
    expect(report.kept).toEqual([]);
    expect(p.metadata!.styles.text).toBeUndefined();
  });
});

describe('P100 UPG-003 — what is left alone, and said so', () => {
  it('a wired text style port is not rewritten, its variant is not rewritten, and no definition is removed', () => {
    const p = project({
      text: { A: STYLE('14'), B: STYLE('18'), Unworn: STYLE('10') },
      variants: [{ typename: 'Text', parameters: { textStyle: 'A' } }],
      nodes: [
        { id: 's', type: 'States', parameters: {} },
        { id: 't', type: 'Text', parameters: { textStyle: 'A' } },
        { id: 'u', type: 'net.noodl.controls.button', parameters: { textStyle: 'B' } }
      ],
      connections: [{ fromId: 's', fromProperty: 'style', toId: 't', toProperty: 'textStyle' }]
    });
    const report = convertTextStylesToTokens(p);
    expect(node(p, 't').parameters).toEqual({ textStyle: 'A' });
    expect(p.variants![0].parameters).toEqual({ textStyle: 'A' });
    expect(Object.keys(p.metadata!.styles.text).sort()).toEqual(['A', 'B', 'Unworn']);
    expect(report.kept.map((k) => k.name).sort()).toEqual(['A', 'B', 'Unworn']);
    // control: an unwired wearer in the same project is still converted
    expect(node(p, 'u').parameters!.fontSize).toBe('var(--b-size)');
  });

  it('a deprecated control with no port for a property its style sets keeps the style', () => {
    const p = project({
      text: { Tall: STYLE('14') },
      nodes: [
        { id: 'old', type: 'Button', parameters: { textStyle: 'Tall' } },
        { id: 'new', type: 'Text', parameters: { textStyle: 'Tall' } }
      ]
    });
    const report = convertTextStylesToTokens(p);
    expect(node(p, 'old').parameters).toEqual({ textStyle: 'Tall' });
    expect(p.metadata!.styles.text.Tall).toBeDefined();
    expect(report.kept.map((k) => k.name)).toEqual(['Tall']);
    // control: the Text beside it that can carry every property was converted
    expect(node(p, 'new').parameters!.textStyle).toBeUndefined();
  });

  it("a component's own input that happens to be called textStyle is not a wearer", () => {
    const p = project({
      text: { A: STYLE('14') },
      nodes: [{ id: 'k', type: '/Components/Card', parameters: { textStyle: 'A' } }]
    });
    convertTextStylesToTokens(p);
    expect(node(p, 'k').parameters).toEqual({ textStyle: 'A' });
  });
});

describe('P100 UPG-003 — once', () => {
  const build = () =>
    project({
      text: { 'Label Medium': STYLE('14'), Unworn: STYLE('10') },
      variants: [{ typename: 'Text', parameters: { textStyle: 'Label Medium' } }],
      nodes: [
        { id: 't', type: 'Text', parameters: { textStyle: 'None' } },
        { id: 'o', type: 'net.noodl.controls.options', parameters: { labeltextStyle: 'Label Medium' } }
      ]
    });

  it('a second run changes nothing', () => {
    const p = build();
    expect(convertTextStylesToTokens(p).changed).toBe(true);
    const once = JSON.stringify(p);
    const again = convertTextStylesToTokens(p);
    expect(again.changed).toBe(false);
    expect(JSON.stringify(p)).toBe(once);
  });

  it('a style that comes back later (a prefab import) reuses its tokens rather than minting copies', () => {
    const p = build();
    convertTextStylesToTokens(p);
    const count = p.metadata!.designTokens.customTokens.length;
    p.metadata!.styles.text = { 'Label Medium': STYLE('14') };
    p.components![0].graph!.roots!.push({
      id: 'new',
      type: 'net.noodl.controls.checkbox',
      parameters: { labeltextStyle: 'Label Medium' }
    });
    convertTextStylesToTokens(p);
    expect(p.metadata!.designTokens.customTokens.length).toBe(count);
    expect(node(p, 'new').parameters!.labelfontSize).toBe('var(--label-medium-size)');
  });

  it('a project with no text styles is not touched and reports nothing', () => {
    const p = project({ nodes: [{ id: 't', type: 'Text', parameters: { fontSize: 12 } }] });
    const read = JSON.stringify(p);
    const report = convertTextStylesToTokens(p);
    expect(report.changed).toBe(false);
    expect(describeTextStyleConversion(report)).toEqual([]);
    expect(upgradeOnLoad(p)).toEqual([]);
    expect(JSON.stringify(p)).toBe(read);
  });

  it('an unworn style still becomes tokens: it is the author\'s type scale', () => {
    const p = build();
    convertTextStylesToTokens(p);
    const names = p.metadata!.designTokens.customTokens.map((t: { name: string }) => t.name);
    expect(names).toContain('--unworn-size');
  });

  it('the report names what happened, in sentences, and the load seam carries it', () => {
    const sections = upgradeOnLoad(build());
    expect(sections).toHaveLength(1);
    expect(sections[0].title).toBe('Text styles are now typography tokens');
    expect(sections[0].lines.join(' ')).toMatch(/2 text styles became typography tokens/);
    expect(sections[0].lines.join(' ')).toMatch(/Font files were copied onto each wearer/);
  });
});

describe('P100 UPG-003 — the wiring', () => {
  const EDITOR_SRC = path.join(__dirname, '..', '..', 'src', 'editor', 'src');
  const read = (...s: string[]) => stripComments(fs.readFileSync(path.join(EDITOR_SRC, ...s), 'utf8'));

  it('opening a project runs the upgrade after the patches and before the model is built', () => {
    const src = read('models', 'projectmodel.editor.ts');
    const patches = src.indexOf('applyPatches(content)');
    const upgrade = src.indexOf('upgradeOnLoad(content)');
    const build = src.indexOf('ProjectModel.fromJSON(content)');
    expect(patches).toBeGreaterThan(-1); // control
    expect(upgrade).toBeGreaterThan(patches);
    expect(build).toBeGreaterThan(upgrade);
    expect(src).toMatch(/ToastLayer\.showInfo\(message,\s*\{\s*title,\s*duration:\s*Infinity/);
  });

  it('an upgraded project is saved when it opens, so it is upgraded, and says so, once', () => {
    const loader = read('models', 'projectmodel.editor.ts');
    expect(loader).toMatch(/project\._upgradedOnLoad = upgrades\.length > 0/);
    const model = read('models', 'projectmodel.ts');
    const setter = model.slice(model.indexOf('public static set instance'), model.indexOf('DSG-007/F30'));
    expect(setter).toMatch(/instanceHasChanged/); // control: this is the setter
    expect(setter).toMatch(/if \(project\?\._upgradedOnLoad\) \{\s*project\._upgradedOnLoad = false;\s*scheduleProjectSave\(\);/);
  });

  it('the import engine reads a source project without converting it', () => {
    const src = read('utils', 'import-engine', 'analyze.ts');
    expect(src).toMatch(/projectFromDirectory\(sourceDir/); // control
    expect(src).toMatch(/\{\s*upgradeOnLoad:\s*false\s*\}/);
  });

  it('every runtime node with a text style port is in the wearer table', () => {
    const viewer = path.join(__dirname, '..', '..', '..', 'noodl-viewer-react', 'src');
    const found = new Set<string>();
    const walk = (dir: string) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) walk(full);
        else if (/\.(ts|tsx|js)$/.test(e.name) && !/node-shared-port-definitions/.test(e.name)) {
          const src = stripComments(fs.readFileSync(full, 'utf8'));
          if (/add(TextStyle|Label)Inputs\(|type: 'textStyle'/.test(src)) {
            const name = /^\s*name: '([^']+)'/m.exec(src);
            if (name) found.add(name[1]);
          }
        }
      }
    };
    walk(viewer);
    // control: the scan sees the two it must
    expect(found).toContain('Text');
    expect(found).toContain('net.noodl.controls.checkbox');
    expect([...found].filter((n) => !TEXT_STYLE_WEARERS[n]).sort()).toEqual([]);
  });
});
