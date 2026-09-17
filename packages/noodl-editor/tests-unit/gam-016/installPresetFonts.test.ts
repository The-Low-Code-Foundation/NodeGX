/**
 * P88 GAM-016 — the editor's new-project path places the chosen preset's typeface.
 *
 * `installPresetFonts` is what `LocalProjectsModel.newProject` runs beside `installStarterAssets`.
 * `@noodl/platform` is replaced by the same calls over Node's `fs`, with the app path at this package,
 * so the files copied are the real shipped ones into a real temporary folder.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

jest.mock('@noodl/platform', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const nodeFs = require('fs');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const nodePath = require('path');
  return {
    platform: { getAppPath: () => nodePath.join(__dirname, '../..') },
    filesystem: {
      join: (...parts: string[]) => nodePath.join(...parts),
      dirname: (p: string) => nodePath.dirname(p),
      exists: (p: string) => nodeFs.existsSync(p),
      readBinaryFile: async (p: string) => nodeFs.readFileSync(p),
      listDirectory: async (p: string) => nodeFs.readdirSync(p).map((name: string) => ({ name, fullPath: nodePath.join(p, name), isDirectory: false })),
      makeDirectory: async (p: string) => void nodeFs.mkdirSync(p, { recursive: true }),
      copyFile: async (from: string, to: string) => nodeFs.copyFileSync(from, to)
    }
  };
});

import { PRESET_FONT_SOURCE_ROOT, PRESET_FONTS } from '../../src/editor/src/models/StylePresets/presetFonts';
import { peekPendingPresetId, setPendingPresetId, consumePendingPreset } from '../../src/editor/src/models/StylePresets/StylePresetsModel';
import { installPresetFonts } from '../../src/editor/src/models/template/starterAssets';

const APP = path.join(__dirname, '../..');

describe('installPresetFonts', () => {
  let dir: string;
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gam016-editor-'));
  });
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  it('a new Soft project gets DM Sans, byte for byte', async () => {
    const report = await installPresetFonts(dir, 'soft');
    const module = PRESET_FONTS.soft;
    expect(report.failed).toEqual([]);
    expect(report.written.sort()).toEqual(module.files.map((f) => `noodl_modules/${module.dir}/${f}`).sort());
    for (const f of module.files) {
      expect(fs.readFileSync(path.join(dir, 'noodl_modules', module.dir, f)).equals(fs.readFileSync(path.join(APP, PRESET_FONT_SOURCE_ROOT, module.source, f)))).toBe(true);
    }
  });

  it('no preset (a template, or Modern) writes nothing', async () => {
    expect(await installPresetFonts(dir, null)).toEqual({ written: [], skipped: [], failed: [] });
    expect(fs.existsSync(path.join(dir, 'noodl_modules'))).toBe(false);
  });

  it('a template that already ships the file keeps its own', async () => {
    const own = path.join(dir, 'noodl_modules', PRESET_FONTS.playful.dir, 'styles.css');
    fs.mkdirSync(path.dirname(own), { recursive: true });
    fs.writeFileSync(own, '/* the template’s own */');
    const report = await installPresetFonts(dir, 'playful');
    expect(report.skipped).toEqual([`noodl_modules/${PRESET_FONTS.playful.dir}/styles.css`]);
    expect(fs.readFileSync(own, 'utf8')).toBe('/* the template’s own */');
    expect(report.written).toHaveLength(4);
  });
});

describe('the pending preset is peeked, not consumed', () => {
  afterEach(() => setPendingPresetId(null));

  it('with no id passed, the pending preset decides — the call LocalProjectsModel.newProject makes', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gam016-pending-'));
    try {
      setPendingPresetId('enterprise');
      const report = await installPresetFonts(dir);
      expect(report.written).toHaveLength(5);
      expect(fs.existsSync(path.join(dir, 'noodl_modules', PRESET_FONTS.enterprise.dir, 'styles.css'))).toBe(true);
      expect(peekPendingPresetId()).toBe('enterprise');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('peeking leaves the preset for StyleTokensModel to consume', () => {
    setPendingPresetId('playful');
    expect(peekPendingPresetId()).toBe('playful');
    expect(consumePendingPreset()?.id).toBe('playful');
    expect(peekPendingPresetId()).toBeNull();
  });
});
