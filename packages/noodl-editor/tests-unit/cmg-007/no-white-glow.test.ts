/**
 * P103 CMG-007 — a popout casts a shadow, not a glow.
 *
 * Richard, driving P102 in light mode: *"the modal appears with a weird white glow around it …
 * If there's others they should change too."* The glow was `--theme-color-bg-1-transparent`
 * (white at 0.85 in light) drawn as a `box-shadow` / `drop-shadow`. Every such use is now
 * `--shadow-float`. This holds the count at zero across the editor and core-ui source, and keeps
 * the token's real backgrounds (scrims) where they are.
 *
 * AC1/AC2 — what the running editor paints in light mode — is the drive
 * (`scripts/devtools/drive-cmg003-007-colours-and-shadows.js`), not this file.
 */
import * as fs from 'fs';
import * as path from 'path';

const ROOTS = [
  path.join(__dirname, '../../src/editor/src'),
  path.join(__dirname, '../../../noodl-core-ui/src')
];
const EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.scss', '.css']);

function walk(dir: string, out: string[]): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'external') continue;
      walk(full, out);
    } else if (EXT.has(path.extname(entry.name))) {
      out.push(full);
    }
  }
  return out;
}

/** Code with its comments removed, so a docblock that records the old value is not a hit. */
function withoutComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/[^\n]*/g, '$1');
}

const files = ROOTS.flatMap((root) => walk(root, []));
const rel = (f: string) => path.relative(path.join(__dirname, '../../..'), f);

describe('CMG-007 AC3 — no shadow is drawn in --theme-color-bg-1-transparent', () => {
  it('the walk reached the files that used to (the control for the absence below)', () => {
    expect(files.length).toBeGreaterThan(500);
    for (const must of [
      'noodl-editor/src/editor/src/styles/popuplayer.css',
      'noodl-core-ui/src/components/popups/PopupToolbar/PopupToolbar.module.scss',
      'noodl-core-ui/src/components/app/SideNavigation/SideNavigation.module.scss',
      'noodl-editor/src/editor/src/views/panels/VersionControlPanel/components/BranchStatusButton.tsx'
    ]) {
      expect(files.map(rel)).toContain(must);
    }
  });

  it('🔴 zero box-shadow / drop-shadow / boxShadow declarations name the token, in any theme', () => {
    const offenders: string[] = [];
    for (const f of files) {
      const src = withoutComments(fs.readFileSync(f, 'utf8'));
      // A shadow declaration (CSS or inline React) whose value names the token.
      const re = /(box-shadow|boxShadow|drop-shadow)\s*[:(][^;\n]*bg-1-transparent/g;
      if (re.test(src)) offenders.push(rel(f));
    }
    expect(offenders).toEqual([]);
  });

  it('the token is still used as a real background — the scrims were left alone', () => {
    const backgrounds = files.filter((f) =>
      /background(-color)?\s*:\s*var\(--theme-color-bg-1-transparent/.test(withoutComments(fs.readFileSync(f, 'utf8')))
    );
    expect(backgrounds.map(rel)).toEqual(
      expect.arrayContaining([
        'noodl-core-ui/src/components/layout/BaseDialog/BaseDialog.module.scss',
        'noodl-core-ui/src/components/common/ActivityIndicator/ActivityIndicator.module.scss'
      ])
    );
  });

  it('the three popup-layer surfaces wear --shadow-float, and every popout arrow matches the popout ground', () => {
    const css = fs.readFileSync(path.join(ROOTS[0], 'styles/popuplayer.css'), 'utf8');
    const block = (selector: string) => {
      const m = css.match(new RegExp(selector.replace(/[.]/g, '\\.') + '\\s*\\{([^}]*)\\}'));
      return m ? withoutComments(m[1]) : '';
    };
    for (const s of ['.popup-layer-popup', '.popup-layer-popout', '.popup-layer-modal']) {
      expect([s, /box-shadow:\s*var\(--shadow-float\)/.test(block(s))]).toEqual([s, true]);
      expect([s, /filter:\s*drop-shadow/.test(block(s))]).toEqual([s, false]);
    }
    // The popout ground is bg-4; an arrow in bg-5 read as a detached triangle.
    expect(/--theme-color-bg-4/.test(block('.popup-layer-popout'))).toBe(true);
    for (const side of ['top', 'right', 'bottom', 'left']) {
      const arrow = block(`.popup-layer-popout-arrow.${side}`);
      expect([side, /border-(top|right|bottom|left)-color:\s*var\(--theme-color-bg-4\)/.test(arrow)]).toEqual([side, true]);
    }
  });
});
