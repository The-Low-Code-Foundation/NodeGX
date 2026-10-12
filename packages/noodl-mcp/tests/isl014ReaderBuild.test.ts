/**
 * ISL-014 AC5 — a checkout builds its own kit reader (P109, Richard's ruling 2026-10-02: "Build it
 * automatically").
 *
 * The reader (`dist/kit-extract.cjs`) is gitignored build output. Before the ruling a checkout without
 * one named the command (`aab96a056`); now the server builds it on the bind that finds it missing, and
 * rebuilds it when it is older than any file it was built from. The input list is the reader's own:
 * `build-kit-extract.mjs` writes esbuild's metafile inputs beside it (~475 files — the runtime's node
 * library, not just `entry.js`, which is why "older than `entry.js`" was too weak a rule).
 *
 * 🔴 Every arm builds into a scratch directory (`ensureCheckoutReader(root, bundle)`), never the
 * shared `dist/`: twelve installed servers run from it and the worktrees used to link it. The
 * staleness arm ages the SCRATCH reader rather than touching `entry.js`, which every server reads.
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { ensureCheckoutReader, kitExtractStaleness } from '../src/kitExtract/extract';

const ROOT = path.resolve(__dirname, '..');

let tempDir: string;
let bundle: string;
let listFile: string;

beforeAll(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'isl014-reader-'));
  bundle = path.join(tempDir, 'dist', 'kit-extract.cjs');
  listFile = path.join(tempDir, 'dist', 'kit-extract.inputs.json');
});

afterAll(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe('ISL-014 AC5 — the checkout builds its own reader', () => {
  test('missing: built on the bind that finds it missing, with the list of what it was built from', () => {
    expect(fs.existsSync(bundle)).toBe(false);
    const result = ensureCheckoutReader(ROOT, bundle);
    expect(result.failed).toBeUndefined();
    expect(result.sentence).toMatch(/^The kit reader was built before reading this project's kits, because it was missing \(\d+ ms\)\.$/);
    expect(fs.statSync(bundle).size).toBeGreaterThan(1_000_000);
    const { inputs } = JSON.parse(fs.readFileSync(listFile, 'utf8')) as { inputs: string[] };
    // The node library is on the list, not just the entry: the rule a reader newer than entry.js
    // could still fail.
    expect(inputs).toContain('src/kitExtract/entry.js');
    expect(inputs.some((p) => p.startsWith('../noodl-runtime/'))).toBe(true);
    expect(inputs.some((p) => p.startsWith('../noodl-viewer-react/'))).toBe(true);
    expect(inputs.length).toBeGreaterThan(400);
    // A plugin namespace is not a file and is not listed.
    expect(inputs.filter((p) => /^[a-z-]+:/.test(p))).toEqual([]);
    // No temporary file is left beside the reader.
    expect(fs.readdirSync(path.dirname(bundle)).sort()).toEqual(['kit-extract.cjs', 'kit-extract.inputs.json']);
  });

  test('the reader it built reads a project: it runs, and answers JSON', () => {
    const { spawnSync } = require('node:child_process');
    const out = spawnSync(process.execPath, [bundle, path.join(__dirname, 'fixtures', 'kit-app')], { encoding: 'utf8' });
    expect(out.status).toBe(0);
    const payload = JSON.parse(out.stdout) as { kits: Array<{ kitModule: string }> };
    expect(payload.kits.map((k) => k.kitModule)).toContain('Demo Kit');
  });

  test('current: the next bind builds nothing and leaves the file alone', () => {
    const before = fs.statSync(bundle).mtimeMs;
    expect(kitExtractStaleness(bundle, ROOT)).toBeNull();
    expect(ensureCheckoutReader(ROOT, bundle)).toEqual({});
    expect(fs.statSync(bundle).mtimeMs).toBe(before);
  });

  test('SABOTAGE — a reader older than one of its inputs is rebuilt, and the sentence names the input', () => {
    // Age the reader to before entry.js was last written: the same as touching entry.js, without
    // touching a file every server reads.
    const entryTime = fs.statSync(path.join(ROOT, 'src', 'kitExtract', 'entry.js')).mtime;
    const past = new Date(entryTime.getTime() - 60_000);
    fs.utimesSync(bundle, past, past);
    expect(kitExtractStaleness(bundle, ROOT)).toMatch(/ changed after it was built$/);
    const result = ensureCheckoutReader(ROOT, bundle);
    expect(result.sentence).toMatch(/because .+ changed after it was built \(\d+ ms\)\.$/);
    expect(fs.statSync(bundle).mtimeMs).toBeGreaterThan(entryTime.getTime());
    expect(kitExtractStaleness(bundle, ROOT)).toBeNull();
  });

  test('a reader with no input list beside it, or one naming a file that is gone, is out of date', () => {
    const saved = fs.readFileSync(listFile, 'utf8');
    try {
      fs.rmSync(listFile);
      expect(kitExtractStaleness(bundle, ROOT)).toBe('it had no kit-extract.inputs.json beside it to say what it was built from');
      fs.writeFileSync(listFile, JSON.stringify({ inputs: ['src/kitExtract/entry.js', 'src/no-such-file.ts'] }));
      expect(kitExtractStaleness(bundle, ROOT)).toBe('src/no-such-file.ts was gone');
    } finally {
      fs.writeFileSync(listFile, saved);
    }
    expect(kitExtractStaleness(bundle, ROOT)).toBeNull();
  });

  test('a build that fails is named with its reason, and nothing is written', () => {
    // A checkout-shaped root whose builder fails: the server reports it rather than throwing.
    const fake = path.join(tempDir, 'fake-checkout');
    fs.mkdirSync(path.join(fake, 'src', 'kitExtract'), { recursive: true });
    fs.writeFileSync(path.join(fake, 'src', 'kitExtract', 'entry.js'), '');
    fs.writeFileSync(path.join(fake, 'build-kit-extract.mjs'), "process.stderr.write('esbuild is not installed here\\n'); process.exit(1);\n");
    const result = ensureCheckoutReader(fake);
    expect(result.sentence).toBeUndefined();
    expect(result.failed).toBe('The kit reader needed building (it was missing) and building it failed: esbuild is not installed here');
    expect(fs.existsSync(path.join(fake, 'dist', 'kit-extract.cjs'))).toBe(false);
  });
});
