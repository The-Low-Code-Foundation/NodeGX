/**
 * P102 CMP-005 (CMP-007 row 1) — the fonts a project ships, loaded into the editor's own window.
 *
 * The font composer may only offer a font a visitor will see. A visitor sees a face only when a
 * module stylesheet declares it (`validation/fontFaces.ts`, the rule `validate_project` grades the
 * composer's output by), so the list is read from exactly those stylesheets — the ones each
 * `noodl_modules/<dir>/manifest.json` lists under `browser.stylesheets`, less icon sets (the starter's
 * Lucide declares a face of glyphs, and listed as a font it would be offered as one).
 *
 * Declaring the family is not enough to *draw* it: the editor never links those stylesheets, so
 * the starter's own Inter measured *preview unavailable*. Each `@font-face` rule is copied into the
 * editor document with its `url()`s turned into data URIs (as `fontItems.ts` does for the property
 * panel), and the composer opens only after `document.fonts.load` has settled for every family.
 */

import { filesystem } from '@noodl/platform';

import { declaredFaces } from '../../../../validation/fontFaces';

/** Families (as declared, unquoted) whose faces are already in the editor document. */
const injected = new Set<string>();

/** Every `@font-face { … }` rule in `css`, comments stripped. */
export function fontFaceRules(css: string): string[] {
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
  return Array.from(withoutComments.matchAll(/@font-face\s*\{[^}]*\}/gi), (m) => m[0]);
}

/** The family one `@font-face` rule declares, unquoted, as written. */
export function ruleFamily(rule: string): string | null {
  const m = /font-family\s*:\s*([^;}]+)/i.exec(rule);
  if (!m) return null;
  const raw = m[1].trim();
  const quoted = /^(['"])(.*)\1$/.exec(raw);
  return (quoted ? quoted[2] : raw).trim() || null;
}

/** Relative `url(…)` references in a rule; absolute and `data:` ones are left alone. */
export function relativeUrls(rule: string): string[] {
  const out: string[] = [];
  for (const m of rule.matchAll(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi)) {
    const url = m[2].trim();
    if (!/^(data:|[a-z][a-z0-9+.-]*:\/\/|\/)/i.test(url)) out.push(url);
  }
  return out;
}

const MIME: Record<string, string> = {
  woff2: 'font/woff2',
  woff: 'font/woff',
  ttf: 'font/ttf',
  otf: 'font/otf'
};

/**
 * Read the project's module stylesheets, put their `@font-face` rules into this document, and wait
 * for each face to load. Resolves with the families declared (as written). Never throws: a folder
 * it cannot read declares nothing, which is what a visitor would get too.
 */
export async function loadProjectFontFaces(projectDir: string | undefined): Promise<string[]> {
  if (!projectDir) return [];
  const families = new Set<string>();
  const modulesDir = filesystem.join(projectDir, 'noodl_modules');
  if (!filesystem.exists(modulesDir)) return [];

  let dirs: string[] = [];
  try {
    dirs = (await filesystem.listDirectory(modulesDir)).map((e) => e.name);
  } catch {
    return [];
  }

  const toLoad: string[] = [];
  for (const dir of dirs) {
    let manifest: { type?: unknown; browser?: { stylesheets?: unknown } } | null;
    try {
      manifest = await filesystem.readJson(filesystem.join(modulesDir, dir, 'manifest.json'));
    } catch {
      continue;
    }
    // An icon set declares an `@font-face` too (the starter's Lucide): glyphs, not a typeface.
    if (manifest?.type === 'iconset') continue;
    const sheets = manifest?.browser?.stylesheets;
    if (!Array.isArray(sheets)) continue;
    for (const sheet of sheets) {
      if (typeof sheet !== 'string') continue;
      const sheetPath = filesystem.join(projectDir, sheet);
      let css: string;
      try {
        css = await filesystem.readFile(sheetPath);
      } catch {
        continue;
      }
      // One reading with the validator: a family the composer lists is one `validate_project` accepts.
      const declared = declaredFaces(css);
      for (const rule of fontFaceRules(css)) {
        const family = ruleFamily(rule);
        if (!family || !declared.has(family.toLowerCase())) continue;
        families.add(family);
        const key = `${family}\u0000${rule}`;
        if (injected.has(key)) continue;
        injected.add(key);
        let text = rule;
        for (const url of relativeUrls(rule)) {
          try {
            const file = filesystem.join(filesystem.dirname(sheetPath), url.split(/[?#]/)[0]);
            const bytes = await filesystem.readBinaryFile(file);
            const ext = (file.split('.').pop() ?? '').toLowerCase();
            text = text.split(url).join(`data:${MIME[ext] ?? 'application/octet-stream'};base64,${bytes.toString('base64')}`);
          } catch {
            // A missing file leaves the url as written; the face fails to load and the row says so.
          }
        }
        const style = document.createElement('style');
        style.setAttribute('data-token-composer-font', family);
        style.textContent = text;
        document.head.appendChild(style);
        toLoad.push(family);
      }
    }
  }

  if (toLoad.length > 0 && document.fonts) {
    await Promise.race([
      Promise.allSettled(Array.from(new Set(toLoad), (f) => document.fonts.load(`32px "${f}"`))),
      new Promise((resolve) => setTimeout(resolve, 1500))
    ]);
  }
  return Array.from(families);
}
