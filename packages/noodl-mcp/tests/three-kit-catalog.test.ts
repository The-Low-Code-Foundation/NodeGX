/**
 * Three in nodes (dev-docs/parked/THREE-IN-NODES.md, R1 "nodes first", 2026-10-19) — the kit in the catalog.
 *
 * The parked page said the three-kit "would not validate through the MCP" and that the picker "does not list these
 * nodes". Neither was measured: a kit under a project's `noodl_modules/` reaches the MCP's catalog through the
 * project overlay (CN-003), the same route garden-3d-kit takes (ig007Garden3d's catalog block). This spec runs that
 * route on the prototype's own fixture with the built kit installed, and grades:
 *
 * - the overlay holds exactly Scene, Mesh and Light, each `inNodePicker: true`, with the ports the kit declares;
 * - Scene accepts children and Mesh / Light do not (the structure lane's rule, read out of the catalog);
 * - the fixture validates through `validateOnDisk` (what `validate_project` runs) with no error, and
 *   no `unknown-node-type` for a three-kit node — the control: the same project with the kit removed DOES say it.
 *
 * @module noodl-mcp/tests/three-kit-catalog.test
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { setCatalogOverlay } from '../src/catalog';
import { clearProjectOverlay, extractProjectOverlay } from '../src/kitOverlay';
import { ProjectStore } from '../src/project/ProjectStore';
import { validateOnDisk } from '../src/validate';
import { buildKitExtractor } from './helpers';

const REPO = path.join(__dirname, '..', '..', '..');
const KIT = path.join(REPO, 'library', 'modules', 'three-kit', 'project', 'noodl_modules', 'three-kit');
const FIXTURE = path.join(REPO, 'dev-docs', 'parked', 'three-in-nodes', 'fixture');

const TYPES = ['three-kit.Group', 'three-kit.Light', 'three-kit.Mesh', 'three-kit.Scene'];

let tempDir: string;
let withKit: string;
let withoutKit: string;

beforeAll(async () => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'three-kit-catalog-'));
  process.env.NODEGX_KIT_EXTRACT = await buildKitExtractor(tempDir);
  withKit = path.join(tempDir, 'with-kit');
  withoutKit = path.join(tempDir, 'without-kit');
  fs.cpSync(FIXTURE, withKit, { recursive: true });
  fs.cpSync(FIXTURE, withoutKit, { recursive: true });
  fs.cpSync(KIT, path.join(withKit, 'noodl_modules', 'three-kit'), { recursive: true });
}, 120_000);

afterAll(() => {
  delete process.env.NODEGX_KIT_EXTRACT;
  fs.rmSync(tempDir, { recursive: true, force: true });
});

afterEach(() => clearProjectOverlay());

const kitDiagnostics = (report: { diagnostics: Array<{ code: string; severity: string; message: string }> }) =>
  report.diagnostics.filter((d) => /three-kit/.test(d.message));

describe('the three-kit in the catalog', () => {
  let overlay: ReturnType<typeof extractProjectOverlay>;
  beforeAll(() => {
    overlay = extractProjectOverlay(withKit);
  }, 60_000);

  it('🔴 the overlay holds Scene, Mesh, Light and 3D Group, each in the node picker', () => {
    expect(overlay.unavailable).toBeUndefined();
    expect(overlay.failures).toEqual([]);
    expect(overlay.nodes.map((n) => n.typeName).sort()).toEqual(TYPES);
    for (const n of overlay.nodes) expect({ type: n.typeName, inNodePicker: n.inNodePicker }).toEqual({ type: n.typeName, inNodePicker: true });
  });

  it('🔴 every port the kit declares is in the catalog entry', () => {
    const byType = Object.fromEntries(overlay.nodes.map((n) => [n.typeName, n]));
    const want: Record<string, { inputs: string[]; outputs: string[] }> = {
      'three-kit.Scene': {
        inputs: ['background', 'floor', 'cameraDistance', 'cameraHeight', 'cameraAngle', 'fieldOfView', 'orbit', 'label', 'width', 'height'],
        outputs: ['onReady', 'onSupported', 'onMeshCount', 'onTappedName', 'onTapped']
      },
      'three-kit.Mesh': {
        inputs: ['shape', 'name', 'colour', 'wireframe', 'x', 'y', 'z', 'width', 'height', 'depth', 'rotationY', 'sitOnFloor', 'spin', 'spinSpeed'],
        outputs: ['onTapped']
      },
      'three-kit.Light': { inputs: ['kind', 'colour', 'ground', 'intensity', 'x', 'y', 'z'], outputs: [] },
      'three-kit.Group': { inputs: ['name', 'x', 'y', 'z', 'rotationY', 'scale', 'spin', 'spinSpeed'], outputs: ['onTapped'] }
    };
    for (const [type, ports] of Object.entries(want)) {
      const ins = byType[type].inputs.map((p) => p.name);
      const outs = byType[type].outputs.map((p) => p.name);
      expect({ type, missing: ports.inputs.filter((p) => !ins.includes(p)) }).toEqual({ type, missing: [] });
      expect({ type, missing: ports.outputs.filter((p) => !outs.includes(p)) }).toEqual({ type, missing: [] });
    }
  });

  it('🔴 a Mesh and a 3D Group are titled on the canvas by their Name', () => {
    const label = Object.fromEntries(overlay.nodes.map((n) => [n.typeName, n.usePortAsLabel ?? null]));
    expect(label).toEqual({ 'three-kit.Group': 'name', 'three-kit.Light': null, 'three-kit.Mesh': 'name', 'three-kit.Scene': null });
  });

  it('🔴 a Scene and a 3D Group take children; a Mesh and a Light do not — and the catalog cannot say "only inside a Scene"', () => {
    // Read 2026-10-19: the runtime registers every React node as 'Visual' (react-component-node.ts), so a Scene holds any
    // visual node and a Mesh may sit under a plain Group, where it draws nothing. The hierarchy rule is category-only;
    // filed as PARKED-THREE-S2-MESHOUTSIDE. This pins the reading so a change to it is seen.
    const rules = Object.fromEntries(overlay.nodes.map((n) => [n.typeName, { asChild: !!n.allowAsChild, holds: n.allowChildrenWithCategory ?? null }]));
    expect(rules).toEqual({
      'three-kit.Group': { asChild: true, holds: ['Visual'] },
      'three-kit.Light': { asChild: true, holds: null },
      'three-kit.Mesh': { asChild: true, holds: null },
      'three-kit.Scene': { asChild: true, holds: ['Visual'] }
    });
  });

  it('🔴 the fixture validates through validate_project with no error and no unknown three-kit type; without the kit it says unknown (control)', () => {
    setCatalogOverlay(overlay.nodes);
    const report = validateOnDisk(new ProjectStore(withKit), { strict: false }).report;
    expect(report.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(kitDiagnostics(report).filter((d) => d.code === 'unknown-node-type')).toEqual([]);

    clearProjectOverlay();
    const control = validateOnDisk(new ProjectStore(withoutKit), { strict: false }).report;
    expect(kitDiagnostics(control).filter((d) => d.code === 'unknown-node-type').length).toBeGreaterThan(0);
  });
});
