/**
 * P123-S2-VARIANTLOST (dev-docs/bugs/): a node wearing a variant from `nodegx.styles.json` is exported with its
 * variant's name. `exportNode` used to read the variant through the node library's registered modules, and a project
 * that is not `ProjectModel.instance` (this CLI, the in-page preview, the headless render) is never one — so every
 * node exported `variant: undefined` and no Look was ever drawn outside the official editor.
 */
import * as fs from 'fs';
import * as path from 'path';

import { assertPrerequisites, get, scratchCopy, startPreview, type RunningPreview } from './helpers';

beforeAll(() => assertPrerequisites());

const MARKER = 'window.projectData = ';
/** The part of the exported `window.projectData` this spec reads. */
interface ProjectData {
  variants: Array<{ typename: string; name: string }>;
  componentIndex: Record<string, unknown>;
}
const parseProjectData = (indexJs: string): ProjectData => JSON.parse(indexJs.slice(indexJs.indexOf(MARKER) + MARKER.length).replace(/;\s*$/, ''));

describe('P123-S2-VARIANTLOST', () => {
  let dir: string;
  let preview: RunningPreview;

  beforeAll(async () => {
    dir = scratchCopy('hello-world');
    fs.writeFileSync(
      path.join(dir, 'nodegx.styles.json'),
      JSON.stringify({ version: 2, variants: [{ name: 'Big', typename: 'Text', parameters: { fontSize: { value: 40, unit: 'px' } }, stateParameters: {}, stateTransitions: {}, defaultStateTransitions: {} }] }, null, 2)
    );
    const nodesPath = path.join(dir, 'components/__page__/Home/nodes.json');
    const nodes = JSON.parse(fs.readFileSync(nodesPath, 'utf8'));
    nodes.nodes.find((n: { id: string }) => n.id === 'greeting').variant = 'Big';
    fs.writeFileSync(nodesPath, JSON.stringify(nodes, null, 2));
    preview = await startPreview(dir, ['--no-watch']);
  });
  afterAll(async () => {
    await preview?.stop();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('a node wearing a variant from nodegx.styles.json is exported with its name', async () => {
    const data = parseProjectData((await get(preview.port, '/index.js')).body);
    // the project's variants always exported; the node's own name is what was lost
    expect(data.variants.map((v) => [v.typename, v.name])).toEqual([['Text', 'Big']]);
    const [bundleId] = Object.keys(data.componentIndex);
    const components = JSON.parse((await get(preview.port, `/noodl_bundles/${bundleId}.json`)).body);
    const home = components.find((c: { name: string }) => c.name === '/#__page__/Home');
    const greeting = home.nodes[0].children[0];
    expect(greeting.id).toBe('greeting');
    expect(greeting.variant).toBe('Big');
  });
});
