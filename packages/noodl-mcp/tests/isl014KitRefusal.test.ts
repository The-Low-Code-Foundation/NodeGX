/**
 * ISL-014 (P78 D83) — a missing kit reader is named as one.
 *
 * The door learns a project's kit node types by running a bundled reader (`dist/kit-extract.cjs`,
 * a gitignored build output). Without it, every write that places a kit node was refused with the
 * editor rule's generic sentence — *"Unknown node type … If this is a module-provided node, ensure
 * the module is installed"* — while the module **was** installed. The server knew the reader was
 * missing (`get_project_info` → `kits.unavailable`) and said so in another tool's answer, not in
 * the refusal the author was looking at. TPL-011 met it on CI, and every garden worktree lane met
 * it until `make-worktree.sh` started linking the primary's `dist/`.
 *
 * A second, quieter form: when the reader runs but a kit throws at import, its node types are
 * unknown for the same reason the author cannot see, and the refusal said the same wrong thing.
 *
 * A third: the rule drops the module sentence altogether when it finds a near-miss, so a kit type
 * whose name is one edit from a built-in was pointed at the built-in instead.
 *
 * 🔴 Never reproduce by deleting the shared `dist/`: worktrees link it. `NODEGX_KIT_EXTRACT` at a
 * path that does not exist is the "reader missing" arm; `buildKitExtractor` is the control.
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { clearProjectOverlay } from '../src/kitOverlay';
import { buildKitExtractor, call, connect, type TestSession } from './helpers';
import type { ProjectInfoResponse } from '../src/tools/responses';

const FIXTURES = path.join(__dirname, 'fixtures');
const KIT_APP = path.join(FIXTURES, 'kit-app');
const THROWING_KIT = path.join(FIXTURES, 'kit-hazards', 'noodl_modules', 'throwing-kit');

const MODULE_SENTENCE = 'ensure the module is installed';

let tempDir: string;
let builtExtractor: string;
let missingExtractor: string;

beforeAll(async () => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'isl014-'));
  builtExtractor = await buildKitExtractor(tempDir);
  missingExtractor = path.join(tempDir, 'kit-extract-not-built.cjs');
}, 120_000);

afterAll(() => {
  delete process.env.NODEGX_KIT_EXTRACT;
  fs.rmSync(tempDir, { recursive: true, force: true });
});

afterEach(() => {
  clearProjectOverlay();
});

interface RefusalDetails {
  readable?: string[];
  newErrors?: Array<{ code: string; message: string; suggestion?: string; location: { nodeType?: string } }>;
}

/** `errorResult`'s wire shape: `{ error: { code, message, details } }`. */
interface Refusal {
  error?: { code: string; message: string; details?: RefusalDetails };
}

function detailsOf(res: { data: Refusal }): RefusalDetails {
  return res.data.error?.details ?? {};
}

/** A fresh copy of kit-app, optionally with extra module folders, bound with the given reader. */
async function bind(reader: string, extraModules: Array<{ name: string; from?: string }> = []): Promise<TestSession> {
  const dir = fs.mkdtempSync(path.join(tempDir, 'project-'));
  fs.cpSync(KIT_APP, dir, { recursive: true });
  for (const m of extraModules) {
    const target = path.join(dir, 'noodl_modules', m.name);
    if (m.from) fs.cpSync(m.from, target, { recursive: true });
    else {
      fs.mkdirSync(target, { recursive: true });
      fs.writeFileSync(path.join(target, 'manifest.json'), JSON.stringify({ name: m.name, main: 'index.js' }));
      fs.writeFileSync(path.join(target, 'index.js'), '// a kit whose reader never ran\n');
    }
  }
  process.env.NODEGX_KIT_EXTRACT = reader;
  return connect(dir);
}

async function placeType(session: TestSession, type: string, compPath = 'Kit/Probe') {
  return call<Refusal>(session, 'create_component', {
    path: compPath,
    nodes: [{ id: 'probe', type, label: 'Probe', parameters: {} }]
  });
}

function unknownTypeError(res: { data: Refusal }) {
  const found = (detailsOf(res).newErrors ?? []).find((d) => d.code === 'unknown-node-type');
  if (!found) throw new Error(`no unknown-node-type refusal in ${JSON.stringify(res.data).slice(0, 600)}`);
  return found;
}

describe('ISL-014 (D83): the refusal names the missing reader', () => {
  test('control: with the reader built, a kit node is accepted and a misspelt built-in gets "did you mean"', async () => {
    const session = await bind(builtExtractor);
    try {
      const info = await call<ProjectInfoResponse>(session, 'get_project_info');
      expect(info.data.kits?.unavailable).toBeUndefined();

      const ok = await placeType(session, 'demo.kit.Badge');
      expect(ok.isError).toBe(false);

      // AC4 — the rule's own wording on the plain path, byte for byte, with the near-miss kept.
      const typo = await placeType(session, 'Buttn', 'Kit/Typo');
      expect(typo.isError).toBe(true);
      const d = unknownTypeError(typo);
      expect(d.message).toBe('Unknown node type "Buttn" — not found in the node catalog.');
      expect(d.suggestion).toBe('Button');
    } finally {
      await session.close();
    }
  });

  test('AC1/AC2 — reader missing: the refusal says the kit types could not be read, and what to do', async () => {
    const session = await bind(missingExtractor);
    try {
      // The server knows. This is where it said so before: another tool's answer.
      const info = await call<ProjectInfoResponse>(session, 'get_project_info');
      expect(info.data.kits?.unavailable).toContain('NODEGX_KIT_EXTRACT');

      const res = await placeType(session, 'demo.kit.Badge');
      expect(res.isError).toBe(true);
      const d = unknownTypeError(res);
      const readable = (detailsOf(res).readable ?? []).join('\n');

      // The true reason, the fix, and the step the overlay's once-per-bind reading makes necessary.
      expect(d.message).toContain('could not be read');
      expect(d.message).toContain('NODEGX_KIT_EXTRACT');
      expect(d.message).toMatch(/npm run build/);
      expect(d.message).toMatch(/re-bind|restart/);
      // The wrong sentence is gone: the module is installed.
      expect(d.message).not.toContain(MODULE_SENTENCE);
      expect(readable).not.toContain(MODULE_SENTENCE);
      expect(readable).toContain('could not be read');
    } finally {
      await session.close();
    }
  });

  test('AC2 — reader missing, a misspelt built-in keeps its near-miss and learns why kits are unknown too', async () => {
    const session = await bind(missingExtractor);
    try {
      const res = await placeType(session, 'Buttn');
      expect(res.isError).toBe(true);
      const d = unknownTypeError(res);
      expect(d.suggestion).toBe('Button');
      expect(d.message).toContain('could not be read');
    } finally {
      await session.close();
    }
  });

  test('AC3 — the near-miss trap: a kit type one edit from a built-in, reader missing, gets the reader sentence', async () => {
    // A module folder named `Texts` makes `Texts` a kit-shaped type (the folder is the kit), and
    // `Texts` is one edit from the built-in `Text`. At HEAD the rule saw the near-miss, dropped the
    // module sentence and said only "did you mean Text" — pointing a kit node at a built-in.
    const session = await bind(missingExtractor, [{ name: 'Texts' }]);
    try {
      const res = await placeType(session, 'Texts');
      expect(res.isError).toBe(true);
      const d = unknownTypeError(res);
      const readable = (detailsOf(res).readable ?? []).join('\n');
      expect(d.message).toContain('could not be read');
      expect(d.suggestion).toBeUndefined();
      expect(readable).not.toContain('did you mean');
    } finally {
      await session.close();
    }
  });

  test('AC1 second arm — the reader ran and a kit threw: the refusal names that kit and its error', async () => {
    const session = await bind(builtExtractor, [{ name: 'throwing-kit', from: THROWING_KIT }]);
    try {
      const info = await call<ProjectInfoResponse>(session, 'get_project_info');
      expect(info.data.kits?.unavailable).toBeUndefined();
      expect(info.data.kits?.failures?.map((f) => f.kitModule)).toEqual(['Throwing Kit']);

      // The healthy kit beside it still loads — a throwing neighbour costs only its own nodes.
      const ok = await placeType(session, 'demo.kit.Badge', 'Kit/Healthy');
      expect(ok.isError).toBe(false);

      const res = await placeType(session, 'throwing.kit.Thing');
      expect(res.isError).toBe(true);
      const d = unknownTypeError(res);
      expect(d.message).toContain('Throwing Kit');
      expect(d.message).toContain('this kit is deliberately broken');
      expect(d.message).not.toContain(MODULE_SENTENCE);
    } finally {
      await session.close();
    }
  });
});
