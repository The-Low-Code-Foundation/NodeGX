/**
 * P102 CMP-005 / CMP-007 row 1 — the font list offers only faces a visitor will see.
 *
 * Two halves. The system fonts the composer offers must be ones `validate_project` needs no file
 * for, or picking one writes a value the validator warns about. And the project's own faces are
 * read from the module stylesheets the viewer links — the starter's real Inter and Lucide folders,
 * copied into a temporary project — and put into the editor document as data URIs, icon sets left
 * out. `@noodl/platform` is Node's `fs`; `document` is a stub that records what was appended.
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
    filesystem: {
      join: (...parts: string[]) => nodePath.join(...parts),
      dirname: (p: string) => nodePath.dirname(p),
      exists: (p: string) => nodeFs.existsSync(p),
      readFile: async (p: string) => nodeFs.readFileSync(p, 'utf8'),
      readJson: async (p: string) => JSON.parse(nodeFs.readFileSync(p, 'utf8')),
      readBinaryFile: async (p: string) => nodeFs.readFileSync(p),
      listDirectory: async (p: string) =>
        nodeFs.readdirSync(p).map((name: string) => ({ name, fullPath: nodePath.join(p, name), isDirectory: true }))
    }
  };
});

import { KNOWN_FONTS } from '@nodegx/project-contract/token-codecs';

import { checkFontFaces } from '../../src/editor/src/validation/fontFaces';
import {
  fontFaceRules,
  loadProjectFontFaces,
  relativeUrls,
  ruleFamily
} from '../../src/editor/src/views/panels/StylesPanel/composer/projectFontFaces';

const STARTER_MODULES = path.join(__dirname, '../../src/assets/starter-project/noodl_modules');

type Appended = { attrs: Record<string, string>; textContent: string };
let appended: Appended[] = [];

beforeAll(() => {
  (global as unknown as { document: unknown }).document = {
    createElement: () => {
      const el: Appended & { setAttribute(k: string, v: string): void } = {
        attrs: {},
        textContent: '',
        setAttribute(k, v) {
          this.attrs[k] = v;
        }
      };
      return el;
    },
    head: { appendChild: (el: Appended) => appended.push(el) }
  };
});
afterAll(() => {
  delete (global as unknown as { document?: unknown }).document;
});

describe('CMP-005 — the fonts the composer offers reach a visitor', () => {
  it('every system font it offers is one validate_project needs no file for', () => {
    const offered = KNOWN_FONTS.filter((f) => f.everywhere);
    expect(offered.length).toBeGreaterThanOrEqual(8);
    for (const f of offered) {
      const diagnostics = checkFontFaces({
        tokens: [{ name: '--font-sans', value: `'${f.name}', sans-serif` }],
        stylesheets: [],
        component: '/App'
      });
      expect({ font: f.name, diagnostics }).toEqual({ font: f.name, diagnostics: [] });
    }
  });

  it('a web font no project ships is not offered (the validator would warn on it)', () => {
    for (const name of ['Manrope', 'Poppins', 'Lora', 'JetBrains Mono']) {
      expect(KNOWN_FONTS.find((f) => f.name === name)?.everywhere).toBeUndefined();
      expect(
        checkFontFaces({ tokens: [{ name: '--font-sans', value: `${name}, sans-serif` }], stylesheets: [], component: '/App' })
      ).toHaveLength(1);
    }
  });
});

describe('CMP-005 — reading a stylesheet', () => {
  const css = `/* @font-face { font-family: 'Ghost'; } */
@font-face { font-family: 'Inter'; src: url('./Inter-Regular.ttf') format('truetype'); }
@font-face { font-family: "Source Sans 3"; src: url(fonts/a.woff2), url("data:font/woff2;base64,AA"), url(https://x/y.woff2); }`;

  it('finds every rule outside comments, with its family unquoted', () => {
    const rules = fontFaceRules(css);
    expect(rules.map(ruleFamily)).toEqual(['Inter', 'Source Sans 3']);
  });

  it('turns only relative urls into files', () => {
    const [inter, source] = fontFaceRules(css);
    expect(relativeUrls(inter)).toEqual(['./Inter-Regular.ttf']);
    expect(relativeUrls(source)).toEqual(['fonts/a.woff2']);
  });
});

describe('CMP-005 — loadProjectFontFaces over the starter modules', () => {
  let dir: string;
  beforeEach(() => {
    appended = [];
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cmp005-fonts-'));
    fs.cpSync(STARTER_MODULES, path.join(dir, 'noodl_modules'), { recursive: true });
  });
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  it('lists Inter, not the Lucide icon font, and draws Inter from its own files', async () => {
    expect(await loadProjectFontFaces(dir)).toEqual(['Inter']);
    expect(appended.length).toBe(4); // the four weights the starter ships
    for (const el of appended) {
      expect(el.attrs['data-token-composer-font']).toBe('Inter');
      expect(el.textContent).toMatch(/src: url\('data:font\/(ttf|woff2);base64,[A-Za-z0-9+/]{1000,}/);
      expect(el.textContent).not.toMatch(/url\('\.\//);
    }
  });

  it('a second open injects nothing more, and still lists Inter', async () => {
    await loadProjectFontFaces(dir);
    const after = appended.length;
    expect(await loadProjectFontFaces(dir)).toEqual(['Inter']);
    expect(appended.length).toBe(after);
  });

  it('a project with no modules offers none of its own', async () => {
    fs.rmSync(path.join(dir, 'noodl_modules'), { recursive: true });
    expect(await loadProjectFontFaces(dir)).toEqual([]);
    expect(await loadProjectFontFaces(undefined)).toEqual([]);
  });
});
