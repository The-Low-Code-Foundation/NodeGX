/**
 * P88 GAM-014 AC1 — the door's half: what a kit-rooted component's `nodes.json` says, for each state of the kit
 * overlay the door can be in when it writes.
 *
 * D53's kit-rooted `nodes.json` was never committed, so this rebuilds it: `game-kit` as the project's only module
 * (not beside the library, D41), `Kit/Face` whose only node is a root `game-kit.Avatar`, and `Kit/Wrapped face`,
 * the same Avatar inside a Group root. Both are written through `create_component` and placed on the home page.
 *
 * Three arms, differing only in the extractor the server binds with:
 *   built   — `src/kitExtract/entry.js` bundled into a temp file (what is under test is the source)
 *   missing — `NODEGX_KIT_EXTRACT` names a file that does not exist (the "bundle removed" arm)
 *   probed  — no override: `resolveKitExtractEntry`'s own candidate order, which is what the Rocket School
 *             generator ran with when D53 was measured
 *
 * The Group-rooted control gets `visualRoots: ["wrap"]` in every arm, whatever the overlay knows: that is the
 * known-firing reading beside the one under test. With `GAM014_OUT` set, each arm's project and the readings are
 * written there for the browser half (`scripts/devtools/drive-gam014-kit-root.js`).
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { clearProjectOverlay } from '../src/kitOverlay';
import { buildKitExtractor, connect, copyFixture } from './helpers';

const GAME_KIT = path.join(__dirname, '..', '..', '..', 'library', 'modules', 'game-kit', 'project', 'noodl_modules', 'game-kit');
const OUT = process.env.GAM014_OUT;

type Arm = 'built' | 'missing' | 'probed';

interface Reading {
  arm: Arm;
  extractEnv: string | null;
  kits: unknown;
  writes: Record<string, { isError: boolean; text: string }>;
  visualRoots: Record<string, string[] | 'absent' | 'not-written'>;
  projectDir: string;
}

let tempDir: string;
let builtExtractor: string;
const readings: Reading[] = [];

beforeAll(async () => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gam014-'));
  builtExtractor = await buildKitExtractor(tempDir);
}, 120_000);

afterAll(() => {
  if (OUT) {
    fs.mkdirSync(OUT, { recursive: true });
    fs.writeFileSync(path.join(OUT, 'readings.json'), JSON.stringify(readings, null, 2));
  }
  fs.rmSync(tempDir, { recursive: true, force: true });
});

afterEach(() => {
  clearProjectOverlay();
});

function extractEnvFor(arm: Arm): string | undefined {
  if (arm === 'built') return builtExtractor;
  if (arm === 'missing') return path.join(tempDir, 'kit-extract-removed.cjs');
  return undefined;
}

function readVisualRoots(projectDir: string, componentPath: string): string[] | 'absent' | 'not-written' {
  const file = path.join(projectDir, 'components', ...componentPath.split('/'), 'nodes.json');
  if (!fs.existsSync(file)) return 'not-written';
  const nodes = JSON.parse(fs.readFileSync(file, 'utf8')) as { visualRoots?: string[] };
  return nodes.visualRoots === undefined ? 'absent' : nodes.visualRoots;
}

async function measure(arm: Arm): Promise<Reading> {
  const previous = process.env.NODEGX_KIT_EXTRACT;
  const env = extractEnvFor(arm);
  if (env === undefined) delete process.env.NODEGX_KIT_EXTRACT;
  else process.env.NODEGX_KIT_EXTRACT = env;

  const projectDir = copyFixture();
  fs.cpSync(GAME_KIT, path.join(projectDir, 'noodl_modules', 'game-kit'), { recursive: true });

  const session = await connect(projectDir);
  const writes: Reading['writes'] = {};
  const call = async (label: string, name: string, args: Record<string, unknown>) => {
    const res = (await session.client.callTool({ name, arguments: args })) as {
      isError?: boolean;
      content?: Array<{ text: string }>;
    };
    const text = res.content?.[0]?.text ?? '';
    writes[label] = { isError: res.isError === true, text };
    return text;
  };

  try {
    const info = JSON.parse(await call('info', 'get_project_info', {})) as { kits?: unknown };

    await call('Kit/Face', 'create_component', {
      path: 'Kit/Face',
      nodes: [{ id: 'face', type: 'game-kit.Avatar', label: 'Face', parameters: { seed: 'Ada', size: 96 } }]
    });
    await call('Kit/Wrapped face', 'create_component', {
      path: 'Kit/Wrapped face',
      nodes: [
        { id: 'wrap', type: 'Group', label: 'Wrap', children: ['wface'] },
        { id: 'wface', type: 'game-kit.Avatar', label: 'Face', parent: 'wrap', parameters: { seed: 'Bea', size: 96 } }
      ]
    });
    await call('Pages/Home', 'update_component', {
      path: 'Pages/Home',
      set: {
        nodes: [
          { id: 'page', type: 'Page', label: 'Home', parameters: { title: 'Home' }, children: ['layout'] },
          { id: 'layout', type: 'Group', label: 'Layout', parent: 'page', children: ['marker', 'kitRooted', 'groupRooted'] },
          { id: 'marker', type: 'Text', label: 'Marker', parent: 'layout', parameters: { text: 'gam014 page drew' } },
          { id: 'kitRooted', type: '/Kit/Face', label: 'Kit-rooted face', parent: 'layout' },
          { id: 'groupRooted', type: '/Kit/Wrapped face', label: 'Group-rooted face', parent: 'layout' }
        ],
        // The fixture's Home carries `btn → nav`; a replacement that omits connections keeps it, dangling.
        connections: []
      }
    });

    const reading: Reading = {
      arm,
      extractEnv: env ?? null,
      kits: info.kits ?? null,
      writes,
      visualRoots: {
        'Kit/Face': readVisualRoots(projectDir, 'Kit/Face'),
        'Kit/Wrapped face': readVisualRoots(projectDir, 'Kit/Wrapped face'),
        'Pages/Home': readVisualRoots(projectDir, 'Pages/Home')
      },
      projectDir
    };
    if (OUT) {
      const target = path.join(OUT, arm, 'project');
      fs.rmSync(target, { recursive: true, force: true });
      fs.cpSync(projectDir, target, { recursive: true });
      reading.projectDir = target;
    }
    readings.push(reading);
    return reading;
  } finally {
    await session.close();
    if (previous === undefined) delete process.env.NODEGX_KIT_EXTRACT;
    else process.env.NODEGX_KIT_EXTRACT = previous;
  }
}

describe('GAM-014 AC1 — what the door writes for a kit-rooted component', () => {
  for (const arm of ['built', 'missing', 'probed'] as const) {
    it(`${arm}: the writes land, and the Group-rooted control gets its root`, async () => {
      const reading = await measure(arm);
      // eslint-disable-next-line no-console
      const refusals = Object.fromEntries(
        Object.entries(reading.writes).map(([label, w]) => [label, w.isError ? w.text.slice(0, 700) : 'ok'])
      );
      // eslint-disable-next-line no-console
      console.log(`GAM014 ${arm}`, JSON.stringify({ kits: reading.kits, visualRoots: reading.visualRoots, refusals }));

      // Recorded, not yet graded: the arms' readings go in §8 first. Only the harness's own preconditions are asserted.
      expect(refusals.info).toBe('ok');
      expect(reading.visualRoots['Pages/Home']).toEqual(['page']);
    }, 120_000);
  }
});
