/**
 * P88 GAM-016 (P78 D69) — `set_style_preset` brings the preset's typeface, and `validate_project`
 * names a family token whose face nothing ships.
 *
 * Before: the tool wrote `--font-sans: "Nunito", …` and nothing else, and a deployed page loaded no
 * Nunito (Chromium, `document.fonts`, beside a Modern + Inter control that loaded Inter).
 *
 * Graded through the real tools on a copy of the demo-app fixture, over the files they leave on disk.
 * The fixture has no `noodl_modules`, like every project `create_project` makes, so Inter is not
 * shipped here either — which is the Modern arm's finding, not noise.
 */
import * as fs from 'fs';
import * as path from 'path';

import { call, connect, copyFixture, reveal, TestSession } from './helpers';

const SHIPPED = path.join(__dirname, '../../noodl-editor/src/assets/preset-fonts');

interface PresetResult {
  ok: boolean;
  fonts: { added: string[]; removed: string[]; kept: Array<{ dir: string; reason: string }>; failed?: string };
}
interface ValidateResult {
  diagnostics: Array<{ code: string; severity: string; message: string; location: { component: string } }>;
}

describe('GAM-016 set_style_preset and validate_project', () => {
  let session: TestSession;
  let dir: string;

  beforeEach(async () => {
    dir = copyFixture();
    session = await connect(dir, true);
    await reveal(session, 'theme');
  });

  afterEach(async () => {
    await session.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  const fontWarnings = async () =>
    (await call<ValidateResult>(session, 'validate_project', {})).data.diagnostics.filter((d) => d.code === 'font-face-not-shipped');
  const preset = async (id: string) => (await call<PresetResult>(session, 'set_style_preset', { preset_id: id })).data;
  const exists = (p: string) => fs.existsSync(path.join(dir, p));

  it('control: the fixture as it is names Inter and ships no Inter, and validate_project says so once', async () => {
    const warnings = await fontWarnings();
    expect(warnings.map((w) => [w.severity, w.location.component])).toEqual([['warning', '/App']]);
    expect(warnings[0].message).toContain('"Inter"');
  });

  it.each([
    ['playful', 'preset-font-nunito', 'nunito', 'Nunito'],
    ['enterprise', 'preset-font-source-sans-3', 'source-sans-3', 'Source Sans 3'],
    ['soft', 'preset-font-dm-sans', 'dm-sans', 'DM Sans']
  ])('%s: the files land byte-identical, the stylesheet is linked by its manifest, and no warning names the face', async (id, moduleDir, source, family) => {
    const result = await preset(id);
    expect(result.fonts.failed).toBeUndefined();
    expect(result.fonts.added).toHaveLength(5);
    for (const file of fs.readdirSync(path.join(SHIPPED, source))) {
      expect(fs.readFileSync(path.join(dir, 'noodl_modules', moduleDir, file)).equals(fs.readFileSync(path.join(SHIPPED, source, file)))).toBe(true);
    }
    const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'noodl_modules', moduleDir, 'manifest.json'), 'utf8'));
    expect(exists(manifest.browser.stylesheets[0])).toBe(true);
    const warnings = await fontWarnings();
    expect(warnings.filter((w) => w.message.includes(`"${family}"`))).toEqual([]);
  });

  it('the known-firing half of the same run: Playful tokens with the Nunito folder deleted are named', async () => {
    await preset('playful');
    fs.rmSync(path.join(dir, 'noodl_modules/preset-font-nunito'), { recursive: true });
    const warnings = await fontWarnings();
    expect(warnings).toHaveLength(1);
    expect(warnings[0].message).toContain('"Nunito"');
  });

  it('switching Playful → Soft removes the untouched Nunito folder', async () => {
    await preset('playful');
    const result = await preset('soft');
    expect({ removed: result.fonts.removed, kept: result.fonts.kept }).toEqual({ removed: ['noodl_modules/preset-font-nunito'], kept: [] });
    expect([exists('noodl_modules/preset-font-nunito'), exists('noodl_modules/preset-font-dm-sans/styles.css')]).toEqual([false, true]);
  });

  it('switching Playful → Soft keeps a Nunito folder someone edited, and says why', async () => {
    await preset('playful');
    fs.appendFileSync(path.join(dir, 'noodl_modules/preset-font-nunito/styles.css'), '\n/* mine */\n');
    const result = await preset('soft');
    expect(result.fonts.removed).toEqual([]);
    expect(result.fonts.kept).toEqual([{ dir: 'noodl_modules/preset-font-nunito', reason: '"styles.css" has been changed' }]);
    expect(exists('noodl_modules/preset-font-nunito/styles.css')).toBe(true);
  });

  it('switching back to Modern removes the untouched folder and leaves Inter to the starter assets', async () => {
    await preset('soft');
    const result = await preset('modern');
    expect({ removed: result.fonts.removed, added: result.fonts.added }).toEqual({ removed: ['noodl_modules/preset-font-dm-sans'], added: [] });
  });
});
