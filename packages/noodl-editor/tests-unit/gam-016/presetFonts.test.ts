/**
 * P88 GAM-016 (P78 D69) — the font a preset names is the font the page draws.
 *
 * Measured before the fix, on deployed pages in Chromium: Playful, Enterprise and Soft loaded **no**
 * face (the MCP route and the editor route alike), while `getComputedStyle` reported the named family
 * all the same; a Modern project with the starter's Inter module loaded Inter (the known-firing arm).
 *
 * R16 (Richard, 2026-09-17): (a) the preset brings its font files, (c) a warning names a family token
 * whose face nothing declares. Addendum: switching preset removes the old preset's font folder only
 * when it is exactly as shipped.
 *
 * Three things are graded here, each against the real files rather than a restatement of them:
 * the preset table agrees with every preset's `--font-sans`, the shipped folders are what the table
 * says, and the planner and the check do what the rulings say.
 */
import * as fs from 'fs';
import * as path from 'path';

import { getAllPresets } from '../../src/editor/src/models/StylePresets/StylePresetsModel';
import {
  planPresetFonts,
  PRESET_FONT_SOURCE_ROOT,
  PRESET_FONTS,
  type PresetFontReader
} from '../../src/editor/src/models/StylePresets/presetFonts';
import { STARTER_ASSETS } from '../../src/editor/src/models/template/starterAssetList';
import { checkFontFaces, declaredFaces, firstFamily } from '../../src/editor/src/validation/fontFaces';

const APP = path.join(__dirname, '../..');
const read = (appRelative: string) => fs.readFileSync(path.join(APP, appRelative));
const shippedCss = (source: string) => read(`${PRESET_FONT_SOURCE_ROOT}${source}/styles.css`).toString('utf8');
const INTER_CSS = read(STARTER_ASSETS.find((a) => a.to === 'noodl_modules/inter/styles.css')!.from).toString('utf8');

describe('the preset table agrees with the presets', () => {
  const presets = getAllPresets();

  it('there are presets to grade, and three of them name a face that needs a file (known-firing count)', () => {
    expect(presets.length).toBe(5);
    expect(Object.keys(PRESET_FONTS).sort()).toEqual(['enterprise', 'playful', 'soft']);
  });

  it.each(getAllPresets().map((p) => [p.id, p]))('%s: the table carries exactly the face --font-sans names first', (_id, preset) => {
    const named = preset.tokens['--font-sans'] === undefined ? 'Inter' : firstFamily(preset.tokens['--font-sans']);
    const tokens = [{ name: '--font-sans', value: preset.tokens['--font-sans'] ?? 'Inter, ui-sans-serif, sans-serif' }];
    const needsAFile = checkFontFaces({ tokens, stylesheets: [], component: '/App' }).length > 0;
    const entry = PRESET_FONTS[preset.id];
    if (named === 'Inter') {
      // Modern: the starter assets ship Inter to every new project.
      expect(entry).toBeUndefined();
    } else if (needsAFile) {
      expect(entry?.family).toBe(named);
    } else {
      expect({ preset: preset.id, entry }).toEqual({ preset: preset.id, entry: undefined });
    }
  });
});

describe('the shipped folders are what the table says', () => {
  it.each(Object.entries(PRESET_FONTS))('%s: every listed file exists, and nothing else', (_id, module) => {
    const dir = path.join(APP, PRESET_FONT_SOURCE_ROOT, module.source);
    expect(fs.readdirSync(dir).sort()).toEqual([...module.files].sort());
  });

  it.each(Object.entries(PRESET_FONTS))('%s: the stylesheet declares the family and names both font files', (_id, module) => {
    const css = shippedCss(module.source);
    expect([...declaredFaces(css)]).toEqual([module.family.toLowerCase()]);
    for (const woff of module.files.filter((f) => f.endsWith('.woff2'))) expect(css).toContain(`url('./${woff}')`);
    expect(css).not.toMatch(/https?:\/\//);
  });

  it.each(Object.entries(PRESET_FONTS))('%s: the manifest links the stylesheet at its project path, and the licence travels', (_id, module) => {
    const manifest = JSON.parse(read(`${PRESET_FONT_SOURCE_ROOT}${module.source}/manifest.json`).toString('utf8'));
    expect(manifest.browser.stylesheets).toEqual([`noodl_modules/${module.dir}/styles.css`]);
    expect(read(`${PRESET_FONT_SOURCE_ROOT}${module.source}/OFL.txt`).toString('utf8')).toContain('SIL OPEN FONT LICENSE Version 1.1');
  });
});

/** A project on disk, as the planner reads one: project-relative path → bytes. */
function project(files: Record<string, string | Uint8Array> = {}): PresetFontReader & { files: Map<string, Uint8Array> } {
  const map = new Map<string, Uint8Array>();
  for (const [p, v] of Object.entries(files)) map.set(p, typeof v === 'string' ? Buffer.from(v) : v);
  return {
    files: map,
    project: (p) => map.get(p) ?? null,
    shipped: (p) => {
      try {
        return read(p);
      } catch {
        return null;
      }
    },
    listProject: (dir) => {
      const names = [...map.keys()].filter((p) => p.startsWith(`${dir}/`)).map((p) => p.slice(dir.length + 1).split('/')[0]);
      return names.length ? [...new Set(names)] : null;
    }
  };
}

/** The project a preset leaves: every one of its files, exactly as shipped. */
function installed(presetId: string, overrides: Record<string, string> = {}): Record<string, string | Uint8Array> {
  const module = PRESET_FONTS[presetId];
  const out: Record<string, string | Uint8Array> = {};
  for (const file of module.files) out[`noodl_modules/${module.dir}/${file}`] = read(`${PRESET_FONT_SOURCE_ROOT}${module.source}/${file}`);
  return { ...out, ...overrides };
}

describe('planPresetFonts: a preset brings its face', () => {
  it('a new project on Playful gets all five Nunito files, from the shipped folder', () => {
    const plan = planPresetFonts('playful', project());
    expect(plan.copy).toEqual(
      PRESET_FONTS.playful.files.map((f) => ({ from: `${PRESET_FONT_SOURCE_ROOT}nunito/${f}`, to: `noodl_modules/preset-font-nunito/${f}` }))
    );
    expect({ remove: plan.remove, kept: plan.kept, present: plan.present }).toEqual({ remove: [], kept: [], present: [] });
  });

  it('Modern and Minimal bring nothing', () => {
    for (const id of ['modern', 'minimal']) expect(planPresetFonts(id, project()).copy).toEqual([]);
  });

  it('a file already there is never overwritten, even when it differs', () => {
    const plan = planPresetFonts('playful', project({ 'noodl_modules/preset-font-nunito/styles.css': '/* mine */' }));
    expect(plan.present).toEqual(['noodl_modules/preset-font-nunito/styles.css']);
    expect(plan.copy.map((c) => c.to)).not.toContain('noodl_modules/preset-font-nunito/styles.css');
    expect(plan.copy).toHaveLength(4);
  });
});

describe('planPresetFonts: switching (R16 addendum — remove it if untouched)', () => {
  it('Playful → Soft removes an untouched Nunito folder and adds DM Sans', () => {
    const plan = planPresetFonts('soft', project(installed('playful')));
    expect(plan.remove).toEqual(['noodl_modules/preset-font-nunito']);
    expect(plan.kept).toEqual([]);
    expect(plan.copy.map((c) => c.to)).toEqual(PRESET_FONTS.soft.files.map((f) => `noodl_modules/preset-font-dm-sans/${f}`));
  });

  it('Playful → Modern removes an untouched Nunito folder and adds nothing', () => {
    const plan = planPresetFonts('modern', project(installed('playful')));
    expect({ remove: plan.remove, copy: plan.copy }).toEqual({ remove: ['noodl_modules/preset-font-nunito'], copy: [] });
  });

  it('an edited stylesheet keeps the folder, and says which file', () => {
    const plan = planPresetFonts('soft', project(installed('playful', { 'noodl_modules/preset-font-nunito/styles.css': '/* edited */' })));
    expect(plan.remove).toEqual([]);
    expect(plan.kept).toEqual([{ dir: 'noodl_modules/preset-font-nunito', reason: '"styles.css" has been changed' }]);
  });

  it('a file added to the folder keeps it, and names the file', () => {
    const plan = planPresetFonts('soft', project(installed('playful', { 'noodl_modules/preset-font-nunito/nunito-italic.woff2': 'x' })));
    expect(plan.remove).toEqual([]);
    expect(plan.kept[0].reason).toContain('"nunito-italic.woff2"');
  });

  it('a deleted file is not an edit anyone could lose: the rest, untouched, is removed', () => {
    const files = installed('playful');
    delete files['noodl_modules/preset-font-nunito/OFL.txt'];
    expect(planPresetFonts('soft', project(files)).remove).toEqual(['noodl_modules/preset-font-nunito']);
  });

  it('re-applying the same preset removes nothing and copies nothing', () => {
    const plan = planPresetFonts('playful', project(installed('playful')));
    expect({ copy: plan.copy, remove: plan.remove, kept: plan.kept, present: plan.present.length }).toEqual({ copy: [], remove: [], kept: [], present: 5 });
  });

  it('a folder the preset table does not own is never touched (Rocket School ships its own Nunito)', () => {
    const plan = planPresetFonts('soft', project({ 'noodl_modules/rocket-school-fonts/styles.css': shippedCss('nunito') }));
    expect({ remove: plan.remove, kept: plan.kept }).toEqual({ remove: [], kept: [] });
  });
});

describe('checkFontFaces: a family token naming a face nothing declares (R16 (c))', () => {
  const tokens = (sans: string) => [
    { name: '--font-sans', value: sans },
    { name: '--font-serif', value: "ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif" },
    { name: '--font-mono', value: "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace" },
    { name: '--font-bold', value: '700' }
  ];
  const run = (sans: string, stylesheets: string[] = []) =>
    checkFontFaces({ tokens: tokens(sans), stylesheets, component: '/App' });

  it.each([
    ['Playful', '"Nunito", "Quicksand", ui-sans-serif, sans-serif', 'Nunito'],
    ['Enterprise', '"Source Sans 3", "Source Sans Pro", "Segoe UI", ui-sans-serif, sans-serif', 'Source Sans 3'],
    ['Soft', '"DM Sans", ui-sans-serif, system-ui, sans-serif', 'DM Sans'],
    ['Modern without the Inter module', 'Inter, ui-sans-serif, system-ui, sans-serif', 'Inter']
  ])('fires for %s with no stylesheet, once, naming the face and the token', (_label, sans, family) => {
    const d = run(sans);
    expect(d.map((x) => [x.code, x.severity, x.location.component])).toEqual([['font-face-not-shipped', 'warning', '/App']]);
    expect(d[0].message).toContain(`"${family}"`);
    expect(d[0].message).toContain('`--font-sans`');
  });

  it.each(Object.entries(PRESET_FONTS))('is silent for %s with its shipped stylesheet', (id, module) => {
    const sans = getAllPresets().find((p) => p.id === id)!.tokens['--font-sans'];
    expect(run(sans, [shippedCss(module.source)])).toEqual([]);
  });

  it('is silent for Inter with the starter Inter stylesheet, and for Minimal\'s system stack', () => {
    expect(run('Inter, ui-sans-serif, system-ui, sans-serif', [INTER_CSS])).toEqual([]);
    expect(run('system-ui, -apple-system, sans-serif')).toEqual([]);
  });

  it('a stylesheet for a different face does not count, and a face named only in a comment does not count', () => {
    expect(run('"Nunito", sans-serif', [shippedCss('dm-sans')])).toHaveLength(1);
    expect(run('"Nunito", sans-serif', ["/* @font-face { font-family: 'Nunito'; } */"])).toHaveLength(1);
  });

  it('a var() and a weight token are not families to judge', () => {
    expect(run('var(--brand-font), sans-serif')).toEqual([]);
  });
});
