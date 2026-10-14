/**
 * P112-OWN019-PRESETFONTS — `@nodegx/mcp` from npm shipped no preset typefaces. `set_style_preset` finds them beside
 * the server (`dist/preset-fonts`) or in a checkout; an npm install had neither, so Sonnet's Launch yardstick (OWN-019
 * s4) applied "soft", got `--font-sans` set to a face that never loaded and `fonts.failed`, and its page painted in
 * the system font. The end-to-end proof is the packed tarball (tgz28: `set_style_preset` from it adds the font folder);
 * this pins the two halves a later edit could drop.
 *
 * Control: on HEAD before the fix, the first test fails (no `dist/preset-fonts` in `files`, no copy in `prepack`).
 */
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { resolvePresetFontRoot } from '../src/presetFontFiles';

const PKG = path.join(__dirname, '..');

describe('P112-OWN019-PRESETFONTS — the preset typefaces ship in the npm package', () => {
  it('lists dist/preset-fonts in the package and makes it at prepack, removes it at postpack', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(PKG, 'package.json'), 'utf8'));
    expect(pkg.files).toContain('dist/preset-fonts');
    expect(pkg.scripts.prepack).toContain('node build-preset-fonts-copy.mjs');
    expect(pkg.scripts.postpack).toContain('node build-preset-fonts-copy.mjs --remove');
    const script = fs.readFileSync(path.join(PKG, 'build-preset-fonts-copy.mjs'), 'utf8');
    expect(script).toContain("path.join(HERE, 'dist', 'preset-fonts')");
  });

  it('copies from a folder the server recognises as a font root', () => {
    const source = path.resolve(PKG, '..', 'noodl-editor', 'src', 'assets', 'preset-fonts');
    expect(fs.existsSync(path.join(source, 'nunito', 'styles.css'))).toBe(true);
  });

  it('finds preset-fonts beside the server before any checkout (where the copy lands in an npm install)', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'presetfonts-'));
    try {
      fs.mkdirSync(path.join(dir, 'preset-fonts', 'nunito'), { recursive: true });
      fs.writeFileSync(path.join(dir, 'preset-fonts', 'nunito', 'styles.css'), '');
      expect(resolvePresetFontRoot(dir)).toEqual({ ok: true, root: path.join(dir, 'preset-fonts') });
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
