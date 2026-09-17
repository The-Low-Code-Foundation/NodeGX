/**
 * P88 GAM-023 + GAM-024 — `nodegx deploy` publishes every wire, and names the ones that cannot work.
 *
 * ## What s18 measured at HEAD `67e1c7639`
 *
 * The shipped engine's validation gate already REFUSES a wire into a port a built-in's declaration
 * lacks, and a wire to a missing node (4 of 10 sabotage kinds). The other 6 deployed with `ok: true`,
 * the broken wire in the bundle and nothing said: a component's missing input or output, `Set Variable`,
 * `Function`, a `For Each` item port, a kit port. The health filter that could see them never ran.
 *
 * R20 (Richard, 2026-09-16): publish all, warn. So the graded consequence is **the broken wire is named
 * and still published, and a working wire is never named**.
 *
 * ## The arms, each beside a known-firing half
 *
 *   - **story-engine, clean.** 0 broken. Its three `For Each` item wires (D52) are the phantoms a
 *     port pass without `editorImportComplete` reports, so `For Each` must be among the families that
 *     minted ports. That is the witness that the event was sent.
 *   - **story-engine, two sabotaged wires** into a component input and out of a `For Each` item port
 *     that do not exist. Exactly those two named, both still in the bundle. This is the arm that makes
 *     the clean zero readable.
 *   - **members-area, clean.** 0 broken. Its `RouterNavigate` `pm-` and `CloudFunction2` `in-`/`out-`
 *     wires exist only after the editor's NodeTypeAdapters run; without them 25 read broken.
 *   - **pixel-game, clean.** Its 4 keyboard wires touch a kit node the deploy never loads: unchecked,
 *     not broken.
 *
 * Reverted arms were run as source mutants against a rebuilt bundle (GAM-023 §8 s18).
 *
 * ⚠️ **This grades `dist/nodegx-deploy.cjs`, a build artefact.** The editor model cannot be imported
 * outside a bundle, so the spec refuses a bundle older than the files the fix lives in.
 */
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const PKG_ROOT = path.resolve(__dirname, '..');
const REPO = path.resolve(PKG_ROOT, '../..');
const ENGINE_BUNDLE = path.join(PKG_ROOT, 'dist/nodegx-deploy.cjs');
const VIEWER_ENGINE = path.resolve(PKG_ROOT, '../noodl-editor/src/external/deploy/noodl.deploy.js');
const FIX_SOURCES = [path.join(PKG_ROOT, 'src/wireHealth.ts'), path.join(PKG_ROOT, 'src/deploy.ts')];

interface NamedWire {
  component: string;
  from: string;
  to: string;
  reason: string;
}
interface Report {
  ok?: boolean;
  stage?: string;
  message?: string;
  warnings?: string[];
  wires?: {
    checked: number;
    broken: NamedWire[];
    unchecked: NamedWire[];
    uncheckedTypes: string[];
    adapters: string[];
    ports: { types: string[] };
  };
}

let work: string;
const runs: Record<string, { report: Report; outDir: string }> = {};

const name = (w: NamedWire) => `${w.component}: ${w.from} → ${w.to}`;

/** Every file the deploy wrote, as one string: the wire is in `index-*.js` or a `noodl_bundles` file. */
function deployedText(outDir: string): string {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (/\.(js|json)$/.test(entry.name) && !entry.name.startsWith('noodl.deploy')) files.push(p);
    }
  };
  walk(outDir);
  return files.map((f) => fs.readFileSync(f, 'utf8')).join('\n');
}

function deploy(arm: string, template: string, edit?: (projectDir: string) => void): void {
  const projectDir = path.join(work, arm, 'project');
  fs.cpSync(path.join(REPO, 'templates', template), projectDir, { recursive: true });
  edit?.(projectDir);
  const outDir = path.join(work, arm, 'deploy');
  // `--allow-development-engine`: a working checkout's viewer runtime is the dev build, and this spec
  // reads wires, not the engine. The folder is a temp dir and is never uploaded.
  const run = spawnSync(process.execPath, [ENGINE_BUNDLE, projectDir, outDir, '--allow-development-engine'], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024
  });
  const lastLine = run.stdout.trim().split('\n').pop() ?? '';
  runs[arm] = { report: JSON.parse(lastLine), outDir };
}

const SABOTAGE = [
  { fromId: 'rdFind', fromProperty: 'out-title', toId: 'rdPassage', toProperty: 'gam023NoSuchInput' },
  { fromId: 'rdChoices', fromProperty: 'itemOutput-gam023NoSuch', toId: 'rdPassage', toProperty: 'title' }
];

beforeAll(() => {
  if (!fs.existsSync(ENGINE_BUNDLE)) {
    throw new Error(`Missing ${ENGINE_BUNDLE}. Build it: npm --prefix packages/noodl-preview run build`);
  }
  const bundleTime = fs.statSync(ENGINE_BUNDLE).mtimeMs;
  const newer = FIX_SOURCES.filter((f) => fs.statSync(f).mtimeMs > bundleTime);
  if (newer.length > 0) {
    throw new Error(
      `${ENGINE_BUNDLE} is older than ${newer.join(', ')}, so it would grade a stale deploy. ` +
        'Rebuild it: npm --prefix packages/noodl-preview run build'
    );
  }
  if (!fs.existsSync(VIEWER_ENGINE)) {
    throw new Error(`Missing the viewer runtime ${VIEWER_ENGINE}. Build it: npm run build:editor:_viewer`);
  }

  work = fs.mkdtempSync(path.join(os.tmpdir(), 'gam023-deploy-'));
  deploy('story-clean', 'story-engine');
  deploy('story-sabotaged', 'story-engine', (projectDir) => {
    const file = path.join(projectDir, 'components/Pages/Read/connections.json');
    const json = JSON.parse(fs.readFileSync(file, 'utf8'));
    json.connections.push(...SABOTAGE);
    fs.writeFileSync(file, JSON.stringify(json, null, 2));
  });
  deploy('members-clean', 'members-area');
  deploy('pixel-clean', 'pixel-game');
}, 120_000);

afterAll(() => {
  if (work) fs.rmSync(work, { recursive: true, force: true });
});

describe('GAM-023 — nodegx deploy publishes every wire and names the broken ones', () => {
  it('every arm deployed (known-firing)', () => {
    for (const [arm, { report }] of Object.entries(runs)) {
      expect({ arm, ok: report.ok, message: report.message }).toEqual({ arm, ok: true, message: undefined });
    }
  });

  it('🔴 the two sabotaged wires are named, and are still in the published bundle (the person sentence, R20)', () => {
    const { report, outDir } = runs['story-sabotaged'];
    expect({
      broken: report.wires.broken.map(name).sort(),
      unchecked: report.wires.unchecked.length,
      named: SABOTAGE.map((w) =>
        report.warnings.some((line) => line.includes(`${w.fromId}.${w.fromProperty} → ${w.toId}.${w.toProperty}`))
      ),
      published: ['gam023NoSuchInput', 'itemOutput-gam023NoSuch'].map((port) => deployedText(outDir).includes(port))
    }).toEqual({
      broken: [
        '/Pages/Read: rdChoices.itemOutput-gam023NoSuch → rdPassage.title',
        '/Pages/Read: rdFind.out-title → rdPassage.gam023NoSuchInput'
      ],
      unchecked: 0,
      named: [true, true],
      published: [true, true]
    });
  });

  it('🔴 story-engine names nothing, and For Each minted its ports (GAM-024 AC3, D52)', () => {
    const { report, outDir } = runs['story-clean'];
    expect({
      broken: report.wires.broken.map(name),
      forEachMinted: report.wires.ports.types.includes('For Each'),
      itemWirePublished: deployedText(outDir).includes('itemOutput-gives')
    }).toEqual({ broken: [], forEachMinted: true, itemWirePublished: true });
  });

  it('🔴 members-area names nothing: the editor adapters minted pm- and cloud-function ports', () => {
    const { report } = runs['members-clean'];
    expect({ broken: report.wires.broken.map(name), adapters: report.wires.adapters }).toEqual({
      broken: [],
      adapters: expect.arrayContaining(['RouterNavigate', 'PageInputs', 'CloudFunction2'])
    });
  });

  /**
   * 🔴 The pass reports and changes nothing that ships. Run on the exported model, it typed `/Game/Hud`'s
   * inputs as `string` with `default: ""` and merged pixel-game's two bundles into one (s18). This pins
   * the HEAD export's shape, which is **not a claim that `*` is right**: whoever changes the export on
   * purpose changes these two lines with it.
   */
  it('🔴 the wire pass leaves the exported model as it was (component port types, bundle split)', () => {
    const { outDir } = runs['pixel-clean'];
    const bundles = fs.readdirSync(path.join(outDir, 'noodl_bundles')).filter((f) => f.endsWith('.json'));
    const hud = bundles
      .flatMap((f) => JSON.parse(fs.readFileSync(path.join(outDir, 'noodl_bundles', f), 'utf8')))
      .find((c: { name: string }) => c.name === '/Game/Hud');
    expect({ bundles: bundles.length, hudPortTypes: hud.ports.map((p: { type: unknown }) => p.type) }).toEqual({
      bundles: 2,
      hudPortTypes: ['*', '*', '*']
    });
  });

  it('pixel-game: the kit wires are unchecked, not broken, and the deploy says so', () => {
    const { report } = runs['pixel-clean'];
    expect({
      broken: report.wires.broken.map(name),
      unchecked: report.wires.unchecked.map(name).sort(),
      uncheckedTypes: report.wires.uncheckedTypes,
      sentence: report.warnings.some((line) => /^4 wire\(s\) touch a kit node/.test(line))
    }).toEqual({
      broken: [],
      unchecked: [
        '/Pages/Play: plKeyDown.pressed → plMoveDown.go',
        '/Pages/Play: plKeyLeft.pressed → plMoveLeft.go',
        '/Pages/Play: plKeyRight.pressed → plMoveRight.go',
        '/Pages/Play: plKeyUp.pressed → plMoveUp.go'
      ],
      uncheckedTypes: ['keyboard-shortcuts.KeyboardShortcut'],
      sentence: true
    });
  });
});
