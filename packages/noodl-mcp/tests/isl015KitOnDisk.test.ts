/**
 * P109 ISL-015 AC5 (s12) — a kit written to disk while the server runs is a kit the server knows.
 *
 * The stranger round: an agent given the docs page did what its first section says ("save it as
 * `noodl_modules/my-kit/index.js` … and it appears in the node picker") with its own file tools, never
 * `create_node_kit` (deferred, and the page names only the editor's menu). The server had extracted the kit
 * set at bind, so `get_node_type` answered "Unknown node type" for the kit it had just written; the agent
 * passed `allow_unknown_types`, the door dropped the kit node from `visualRoots` (it could not tell the
 * type was visual), `set_visual_roots` answered `unchanged`, `validate_project` said 0 errors, and the
 * deployed page drew nothing ("1 component(s) render nothing of their own (/Sketch)").
 *
 * The rule (D3's sanctioned "in-memory, per-server-session cache keyed on module mtime"): the overlay is
 * re-extracted when the kit files on disk are not the ones it was extracted from, checked when a tool asks
 * for the project. Known-firing control: before the kit is written the type IS unknown.
 *
 * @module noodl-mcp/tests/isl015KitOnDisk
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { buildKitExtractor, call, connect, copyFixture, type TestSession } from './helpers';
import { clearProjectOverlay } from '../src/kitOverlay';

interface NodeTypeReply {
  types: Array<{ typeName: string; error?: string; isVisual?: boolean; ports?: string[] }>;
}

/** The docs page's smallest node, under another name, with `extra` more nodes beside it. */
function kitSource(nodes: string[]): string {
  const defs = nodes.map(
    (name) => `{
    name: 'hand-kit.${name}',
    displayNodeName: '${name}',
    noodlNodeAsProp: true,
    getReactComponent: function () {
      return function C(props) {
        var el = React.useRef(null);
        React.useEffect(function () { props.noodlNode && props.noodlNode.setDOMElement(el.current); }, []);
        return React.createElement('div', { ref: el, style: props.style }, props.label);
      };
    },
    inputProps: { label: { type: 'string', displayName: 'Label', group: 'Content', default: 'New' } }
  }`
  );
  return `(function () {\n  Noodl.defineModule({ reactNodes: [${defs.join(', ')}] });\n})();\n`;
}

function writeKit(projectDir: string, nodes: string[]): void {
  const dir = path.join(projectDir, 'noodl_modules', 'hand-kit');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify({ name: 'Hand Kit', main: 'index.js' }, null, 2));
  fs.writeFileSync(path.join(dir, 'index.js'), kitSource(nodes));
}

let extractorDir: string;

beforeAll(async () => {
  extractorDir = fs.mkdtempSync(path.join(os.tmpdir(), 'isl015-extract-'));
  process.env.NODEGX_KIT_EXTRACT = await buildKitExtractor(extractorDir);
}, 120_000);

afterAll(() => {
  delete process.env.NODEGX_KIT_EXTRACT;
  fs.rmSync(extractorDir, { recursive: true, force: true });
});

afterEach(() => clearProjectOverlay());

describe('ISL-015 AC5 — a kit written to disk mid-session', () => {
  let session: TestSession;

  beforeEach(async () => {
    session = await connect(copyFixture());
  });

  afterEach(async () => {
    await session.close();
  });

  it('is known to the running server, visual, and kept as a component root without allow_unknown_types', async () => {
    const before = await call<NodeTypeReply>(session, 'get_node_type', { type_names: ['hand-kit.Badge'] });
    // Known-firing control: the instrument sees an unknown type as unknown.
    expect(before.data.types[0].error).toMatch(/Unknown node type/);

    writeKit(session.projectDir, ['Badge']);

    const after = await call<NodeTypeReply>(session, 'get_node_type', { type_names: ['hand-kit.Badge'] });
    expect(after.data.types[0].error).toBeUndefined();
    expect(after.data.types[0].isVisual).toBe(true);

    const created = await call<Record<string, unknown>>(session, 'create_component', {
      path: 'Badge Card',
      nodes: [{ id: 'badge', type: 'hand-kit.Badge', label: 'Badge', parameters: { label: 'Hello' } }]
    });
    expect(created.isError).toBe(false);
    const nodes = JSON.parse(fs.readFileSync(path.join(session.projectDir, 'components', 'Badge Card', 'nodes.json'), 'utf8'));
    expect(nodes.visualRoots).toEqual(['badge']);
  });

  it('sees a node added to a kit it already loaded', async () => {
    writeKit(session.projectDir, ['Badge']);
    expect((await call<NodeTypeReply>(session, 'get_node_type', { type_names: ['hand-kit.Badge'] })).data.types[0].error).toBeUndefined();
    const second = () => call<NodeTypeReply>(session, 'get_node_type', { type_names: ['hand-kit.Pill'] });
    expect((await second()).data.types[0].error).toMatch(/Unknown node type/);

    writeKit(session.projectDir, ['Badge', 'Pill']);
    expect((await second()).data.types[0].error).toBeUndefined();
  });
});
