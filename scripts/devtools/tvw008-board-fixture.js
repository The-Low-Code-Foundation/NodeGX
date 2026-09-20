#!/usr/bin/env node
/**
 * TVW-008 — the authored fixture AC1 and AC4 both need, written from the schema of a project that
 * is known to load.
 *
 * 🔴 **This exists because the corpus cannot supply it.** §6.4 measured **0 of 5,922** components
 * with a `bench.scenarios[0]`, so AC4's scenario branch is unreachable on real data and its caption
 * arm (`scenario: <name>`) has never been drawn. AC1's sentence — *"someone comparing three
 * versions of a button"* on *"a project with a component placed more than once"* — names a project
 * that does not exist either.
 *
 * 🔴 **The one trap this fixture is shaped around.** A scenario whose value equals what the node
 * already draws grades NOTHING: both arms render the same pixels and the arm passes on dead code
 * ([[a-css-property-whose-default-equals-the-test-value]]). So on `Primary Button`:
 *
 *   - the `label` port is **connected** to the visual root's `text` (a Component Input that reaches
 *     nothing changes nothing, however faithfully the export carries it), and
 *   - the scenario's value (`Continue to checkout`) **differs** from the node's own parameter
 *     (`Button`), so "the scenario rendered" and "the scenario was ignored" are two different
 *     screenshots.
 *
 * The three buttons divide the cases AC3 and AC4 ask for between them:
 *
 *   | component | `bench.frame` | `bench.scenarios` | what it grades |
 *   |---|---|---|---|
 *   | Primary Button | — (768 default) | ✅ one scenario | AC4's scenario arm, AC3's default box |
 *   | Secondary Button | ✅ 320 × 180 | — | AC3's STORED box — §6.4 says this is the rare case |
 *   | Ghost Button | — (768 default) | — | AC4's `no inputs set` caption |
 *
 * The schema is copied field for field from `def007-curated-src/project.json`, a file the editor
 * loads today — including the `ports: [{ plug: 'output' }]` on `Component Inputs`, which is what
 * makes an instance parameter arrive at all.
 *
 *   node scripts/devtools/tvw008-board-fixture.js [--out <dir>]
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const argv = process.argv.slice(2);
const opt = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};

const OUT = opt('out', '/Users/richardosborne/vscode_projects/NodeGX test projects/TVW-008 s26 Board');

/** Deterministic ids: a re-run produces the same file, so a diff means a real change. */
const id = (seed) => {
  const h = crypto.createHash('sha1').update(`tvw008:${seed}`).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
};

const TEXT_STYLE = 'Body Text';

/**
 * One button component: a Group wrapping a Text, with a `label` input wired to the Text.
 *
 * ⚠️ `sizeMode: 'contentHeight'` and no width/height, matching the fixture this was copied from —
 * §5's landmine is about the board's own frame WRAPPER, not about the component inside it, and a
 * component that sized itself would hide the wrapper defect that landmine is watching for.
 */
function button({ name, label, background, textColor, metadata }) {
  const root = id(`${name}:group`);
  const text = id(`${name}:text`);
  const inputs = id(`${name}:inputs`);
  return {
    name,
    id: id(`${name}:component`),
    graph: {
      connections: [{ fromId: inputs, fromProperty: 'label', toId: text, toProperty: 'text' }],
      roots: [
        {
          id: root,
          type: 'Group',
          x: 0,
          y: 0,
          parameters: {
            sizeMode: 'contentHeight',
            backgroundColor: background,
            paddingLeft: { value: 20, unit: 'px' },
            paddingRight: { value: 20, unit: 'px' },
            paddingTop: { value: 14, unit: 'px' },
            paddingBottom: { value: 14, unit: 'px' },
            cornerRadius: { value: 8, unit: 'px' },
            alignX: 'center'
          },
          ports: [],
          dynamicports: [],
          children: [
            {
              id: text,
              type: 'Text',
              x: 0,
              y: 0,
              // 🔴 The value the scenario must DIFFER from. See the header.
              parameters: { text: label, textStyle: TEXT_STYLE, color: textColor },
              ports: [],
              dynamicports: [],
              children: []
            }
          ]
        },
        {
          id: inputs,
          type: 'Component Inputs',
          x: -280,
          y: 0,
          parameters: {},
          // 🔴 `plug: 'output'` is the whole of what makes an instance parameter arrive.
          ports: [{ name: 'label', plug: 'output', type: 'string', index: 0 }],
          dynamicports: [],
          children: []
        }
      ],
      visualRoots: [root]
    },
    metadata: metadata || {}
  };
}

const PRIMARY = '/Buttons/Primary Button';
const SECONDARY = '/Buttons/Secondary Button';
const GHOST = '/Buttons/Ghost Button';
const PAGE = '/#__page__/Button Gallery';

const instance = (type, seed, params) => ({
  id: id(seed),
  type,
  x: 0,
  y: 0,
  parameters: params || {},
  ports: [],
  dynamicports: [],
  children: []
});

const pageRoot = id('page:root');
const pageStack = id('page:stack');
const routerId = id('app:router');

const project = {
  name: 'TVW-008 s26 Board',
  id: id('project'),
  components: [
    {
      name: 'App',
      id: id('App:component'),
      graph: {
        connections: [],
        roots: [
          {
            id: routerId,
            type: 'Router',
            x: 0,
            y: 0,
            parameters: { name: 'Main', pages: { startPage: PAGE, routes: [PAGE] } },
            ports: [],
            dynamicports: [],
            children: []
          }
        ],
        visualRoots: [routerId]
      },
      metadata: {}
    },
    {
      name: PAGE,
      id: id('page:component'),
      graph: {
        connections: [],
        roots: [
          {
            id: pageRoot,
            type: 'Page',
            x: 0,
            y: 0,
            parameters: { title: 'Button Gallery' },
            ports: [],
            dynamicports: [],
            children: [
              {
                id: pageStack,
                type: 'Group',
                x: 0,
                y: 0,
                parameters: { sizeMode: 'contentHeight', alignX: 'center' },
                ports: [],
                dynamicports: [],
                children: [
                  // 🔴 AC1's *"a component placed more than once"* — Primary Button, twice, with
                  // DIFFERENT labels so the two instances are distinguishable on the canvas.
                  instance(PRIMARY, 'page:primary:1', { label: 'Continue' }),
                  instance(PRIMARY, 'page:primary:2', { label: 'Save draft' }),
                  instance(SECONDARY, 'page:secondary', {}),
                  instance(GHOST, 'page:ghost', {})
                ]
              }
            ]
          }
        ],
        visualRoots: [pageRoot]
      },
      metadata: {}
    },
    button({
      name: PRIMARY,
      label: 'Button',
      background: '#2F6BFF',
      textColor: '#FFFFFF',
      metadata: {
        // AC4's subject. `frame` is carried because a scenario claims "renders correctly at this
        // size"; `stretch` is left absent, which reads as the default everywhere.
        'bench.scenarios': {
          scenarios: [
            {
              name: 'Checkout',
              inputs: { label: 'Continue to checkout' },
              frame: { width: 480, height: 200 }
            },
            { name: 'Short', inputs: { label: 'OK' } }
          ]
        }
      }
    }),
    button({
      name: SECONDARY,
      label: 'Button',
      background: '#E8EDF7',
      textColor: '#1F2328',
      // AC3's STORED box — the exception §6.4 says almost nothing in the corpus has.
      metadata: { 'bench.frame': { width: 320, height: 180 } }
    }),
    button({ name: GHOST, label: 'Button', background: '#00000000', textColor: '#2F6BFF' })
  ],
  settings: {},
  rootNodeId: routerId,
  version: '4',
  runtimeVersion: '1',
  metadata: {
    title: 'TVW-008 s26 Board',
    description:
      'Authored fixture for TVW-008 AC1 and AC4: three versions of a button, one of them placed twice, one carrying a bench scenario whose value differs from what the node draws without it.',
    styles: {
      colors: { Ink: '#1F2328', Accent: '#2F6BFF' },
      text: { [TEXT_STYLE]: { fontSize: { value: '16', unit: 'px' }, color: 'Ink' } }
    }
  },
  variants: []
};

fs.mkdirSync(OUT, { recursive: true });
const file = path.join(OUT, 'project.json');
fs.writeFileSync(file, JSON.stringify(project, null, 1));
console.log(`wrote ${file}`);

// ── What the fixture claims, checked against the file just written ────────────────────────────
// An authored fixture that does not hold the property it was authored for is worse than none: the
// drive would read a green arm off a subject that never had the shape.
const back = JSON.parse(fs.readFileSync(file, 'utf8'));
const byName = new Map(back.components.map((c) => [c.name, c]));
const fail = [];
const check = (ok, what) => {
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${what}`);
  if (!ok) fail.push(what);
};

const primary = byName.get(PRIMARY);
const scenario = primary.metadata['bench.scenarios'].scenarios[0];
const primaryText = primary.graph.roots[0].children[0];
const conn = primary.graph.connections[0];

check(back.components.length === 5, `5 components (${back.components.length})`);
check(scenario.inputs.label !== primaryText.parameters.text,
  `the scenario's value differs from what the node draws without it ("${scenario.inputs.label}" vs "${primaryText.parameters.text}")`);
check(conn.fromProperty === 'label' && conn.toId === primaryText.id && conn.toProperty === 'text',
  'the label port is CONNECTED to the visual root subtree, so setting it changes what draws');
check(primary.graph.roots[1].ports.some((p) => p.name === 'label' && p.plug === 'output'),
  "the port is plugged 'output', which is what makes an instance parameter arrive");
check(!primary.metadata['bench.frame'], 'Primary has NO stored frame — AC3 default (768) case');
check(byName.get(SECONDARY).metadata['bench.frame'].width === 320, 'Secondary HAS a stored frame — AC3 stored case');
check(!byName.get(GHOST).metadata['bench.scenarios'], "Ghost has NO scenario — AC4's `no inputs set` case");

const placed = [];
const walk = (ns) => { for (const n of ns || []) { if (n.type === PRIMARY) placed.push(n.id); walk(n.children); } };
walk(byName.get(PAGE).graph.roots);
check(placed.length === 2, `AC1's "placed more than once": Primary Button appears ${placed.length}×`);
check(new Set(back.components.map((c) => c.id)).size === 5, 'every component id is distinct');
check(!/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(fs.readFileSync(file, 'utf8')), 'no control bytes in the file (§9.3)');

console.log(fail.length ? `\nFIXTURE INVALID — ${fail.length} claim(s) failed` : '\nfixture holds every claim it was authored for');
process.exit(fail.length ? 1 : 0);
