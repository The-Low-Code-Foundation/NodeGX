import * as path from 'path';
import * as ts from 'typescript';

import { Catalog, loadCatalog } from '../src/catalog';
import { emitApp } from '../src/emit/emitApp';
import { MEDIA_ATTRS, MEDIA_LIB_PATH, absoluteUrl, mediaLibSource, mediaSrc, mediaSrcSet } from '../src/emit/mediaLib';
import { parseProject } from '../src/parse/parseProject';
import { typecheckEmittedApp } from './helpers/typecheckApp';

/**
 * EXP-014 §14.5 — the picture path.
 *
 * `contentAttrs` printed a media URL parameter verbatim: `src="noodl_modules/starter-imagery/portrait.svg"`.
 * The emitted app routes with a `BrowserRouter`, so the DOCUMENT sits at the route's depth and a relative
 * `src` resolves against it — right on `/business`, a 404 under `/gallery/noodl_modules/…` on `/gallery/team`.
 * Every route the shipped templates emit is one segment deep, which is why three drives read zero broken
 * images and why this sat as a residual. The viewer never sees it: its Image and Video ports run every
 * source through the runtime's `getAbsoluteUrl` behind `resolveMediaSource`, and the icon's image source
 * through `getAbsoluteUrl` alone. Those two functions are now transcribed into `src/emit/mediaLib.ts`,
 * applied at emit time to a literal and at run time (`src/lib/media.ts`) to a wire.
 *
 * The fixture is `tests/fixtures/picture-desk`: a Team page at `gallery/team` — TWO segments, the depth no
 * other fixture has — carrying a local picture, a CDN picture, a root-absolute one, a `data:` URI, the field an
 * author emptied, a `srcset`, a Video with a poster, a picture-sourced icon, and a For Each over Static Data
 * whose rows wire a picture into a card. The module folder ships four real SVGs so the drive can fetch them.
 *
 * 🔴 **The reverted arm is a reading, not a memory**: §F pins what the verbatim spelling resolves to in the
 * browser's own URL algorithm (Node's `URL` is the same WHATWG algorithm), beside what the emitted spelling
 * resolves to. That is the defect and the fix on one line each, with no browser in the loop; the drive in
 * EXP-014's record is the same pair with one.
 */

const FIXTURE = path.join(__dirname, 'fixtures', 'picture-desk');
const catalog: Catalog = loadCatalog();
const app = emitApp(parseProject(FIXTURE, catalog), catalog);
const ground = emitApp(parseProject(path.join(__dirname, 'fixtures', 'ground-desk'), catalog), catalog);

const TEAM = 'src/pages/Team.tsx';
const CARD = 'src/components/MemberCard.tsx';
const team = () => app.files[TEAM];
const card = () => app.files[CARD];

/** The one JSX element whose `alt` is the given text, as a single line. */
const imgWithAlt = (alt: string): string => {
  const match = new RegExp(`<img[^>]*alt="${alt}"[^>]*/>`, 's').exec(team());
  expect(match).not.toBeNull();
  return match![0].replace(/\s+/g, ' ');
};

// ---------------------------------------------------------------------------------------------------
describe('§A a literal src — resolved at emit time, the viewer’s port rule', () => {
  test('A1 a project-relative picture is printed root-absolute', () => {
    expect(imgWithAlt('A portrait')).toBe('<img src="/noodl_modules/starter-imagery/portrait.svg" alt="A portrait" />');
  });

  test('A2 an http(s) URL passes through untouched', () => {
    expect(imgWithAlt('Remote')).toContain('src="https://cdn.example.com/x.jpg"');
  });

  test('A3 a path that already starts at the root is not doubled', () => {
    expect(imgWithAlt('Rooted')).toContain('src="/already/root.png"');
    expect(team()).not.toContain('//already');
  });

  test('A4 a data: URI passes through untouched', () => {
    expect(imgWithAlt('Inline')).toContain('src="data:image/gif;base64,R0lGODlhAQABAAAAACw="');
  });

  test('A5 the field an author emptied prints NO src — `src=""` would refetch the document', () => {
    expect(imgWithAlt('Nothing yet')).toBe('<img alt="Nothing yet" />');
    expect(team()).not.toContain('src=""');
  });

  test('A6 nothing was dropped and nothing was reported: the four ports are translated, not noted', () => {
    // The whole list, not a filter — a filter on `src` matched the router shell's own file path once.
    expect(app.notes).toEqual(['App: router shell — emitted as src/App.tsx by the scaffold']);
  });
});

// ---------------------------------------------------------------------------------------------------
describe('§B a srcset — every candidate resolved, every descriptor kept', () => {
  test('B1 the local candidate is root-absolute, the CDN one verbatim, both descriptors in place', () => {
    expect(imgWithAlt('Responsive')).toContain(
      'srcSet="/noodl_modules/starter-imagery/tile-1.svg 480w, https://cdn.example.com/big.jpg 1080w"'
    );
  });

  test('B2 the src beside it is resolved too, and the attribute order is unchanged', () => {
    expect(imgWithAlt('Responsive')).toBe(
      '<img src="/noodl_modules/starter-imagery/tile-1.svg" srcSet="/noodl_modules/starter-imagery/tile-1.svg 480w, https://cdn.example.com/big.jpg 1080w" alt="Responsive" />'
    );
  });

  test('B3 mediaSrcSet, shape by shape — the HTML tokeniser, not a split on commas', () => {
    expect(mediaSrcSet('a.png 480w, b.png 1080w')).toBe('/a.png 480w, /b.png 1080w');
    expect(mediaSrcSet('a.png, b.png')).toBe('/a.png, /b.png');
    expect(mediaSrcSet('a.png 2x')).toBe('/a.png 2x');
    expect(mediaSrcSet('  a.png   480w  ,   /b.png 1080w  ')).toBe('/a.png 480w, /b.png 1080w');
    // a comma INSIDE a data: URI is part of the URL, as the browser reads it
    expect(mediaSrcSet('data:image/gif;base64,R0lGOD 1x, a.png 2x')).toBe('data:image/gif;base64,R0lGOD 1x, /a.png 2x');
    expect(mediaSrcSet('https://cdn/x.jpg 1x')).toBe('https://cdn/x.jpg 1x');
    expect(mediaSrcSet('')).toBeUndefined();
    expect(mediaSrcSet('  , ,  ')).toBeUndefined();
    expect(mediaSrcSet(undefined)).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------------------------------
describe('§C a Video, and a picture-sourced icon — the same channel on two more elements', () => {
  test('C1 the video’s src and poster are both root-absolute', () => {
    const video = /<video[^>]*\/>/s.exec(team())![0].replace(/\s+/g, ' ');
    expect(video).toContain('src="/noodl_modules/starter-imagery/clip.mp4"');
    expect(video).toContain('poster="/noodl_modules/starter-imagery/tile-2.svg"');
    expect(video).toContain(' controls');
  });

  test('C2 the icon’s image source is root-absolute — the runtime’s iconImageSource setter is getAbsoluteUrl', () => {
    expect(team()).toContain('<img className={styles.badge} src="/noodl_modules/starter-imagery/tile-3.svg" alt="" />');
  });

  test('C3 the icon takes absoluteUrl, NOT mediaSrc: an empty icon source stays src="" there, so it stays here', () => {
    // The runtime has no empty gate on that setter (NDA-012 fixed Image and Video only) — transcribed, not repaired.
    expect(absoluteUrl('')).toBe('');
    expect(mediaSrc('')).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------------------------------
describe('§D a wired src — resolved at run time, through a helper the app ships', () => {
  test('D1 the card prints the prop through mediaSrc, and imports it', () => {
    expect(card()).toContain('<img src={mediaSrc(picture)} alt="" />');
    expect(card()).toContain("import { mediaSrc } from '../lib/media';");
    expect(card()).not.toContain('<img src={picture}');
  });

  test('D2 src/lib/media.ts is emitted, and it is the module’s declared source', () => {
    expect(app.files[MEDIA_LIB_PATH]).toBeDefined();
    expect(app.files[MEDIA_LIB_PATH]).toContain(mediaLibSource());
    expect(app.files[MEDIA_LIB_PATH]).toContain('export function mediaSrc(');
    expect(app.files[MEDIA_LIB_PATH]).toContain('export function mediaSrcSet(');
  });

  test('D3 a fixture with no wired media URL ships no media module — the dead-module rule', () => {
    expect(ground.files[MEDIA_LIB_PATH]).toBeUndefined();
    expect(Object.values(ground.files).some((text) => text.includes("from '../lib/media'"))).toBe(false);
  });

  test('D4 a literal never earns the import: the Team page resolved everything at emit time', () => {
    expect(team()).not.toContain('lib/media');
    expect(team()).not.toContain('mediaSrc(');
  });

  test('D5 the rows keep their project-relative paths — the data is the author’s, the resolution is the element’s', () => {
    expect(team()).toContain('picture: "noodl_modules/starter-imagery/tile-1.svg"');
  });

  test('D6 the emitted app typechecks', () => {
    expect(typecheckEmittedApp(app)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------------
describe('§E the emitted module agrees with the package’s own functions — the second copy, graded', () => {
  const TABLE: unknown[] = [
    'noodl_modules/starter-imagery/portrait.svg',
    '/already/root.png',
    'https://cdn.example.com/x.jpg',
    '//cdn.example.com/x.jpg',
    'data:image/gif;base64,R0lGOD',
    'blob:http://h/abc',
    '',
    null,
    undefined,
    0,
    { toString: () => 'files/cloud.png' },
    'a.png 480w, b.png 1080w',
    'a.png, https://cdn/b.png 2x',
    'data:image/gif;base64,R0lGOD 1x, a.png 2x',
    '  , ,  '
  ];

  const loadEmitted = (): { absoluteUrl: typeof absoluteUrl; mediaSrc: typeof mediaSrc; mediaSrcSet: typeof mediaSrcSet } => {
    const js = ts.transpileModule(mediaLibSource(), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
    }).outputText;
    const exports: Record<string, unknown> = {};
    new Function('exports', js)(exports);
    return exports as ReturnType<typeof loadEmitted>;
  };

  test('E1 every value on the table answers the same from the emitted text as from the package', () => {
    const emitted = loadEmitted();
    for (const value of TABLE) {
      expect(emitted.absoluteUrl(value)).toBe(absoluteUrl(value));
      expect(emitted.mediaSrc(value)).toBe(mediaSrc(value));
      expect(emitted.mediaSrcSet(value)).toBe(mediaSrcSet(value));
    }
  });

  test('E2 the package’s functions are getAbsoluteUrl and resolveMediaSource, value by value', () => {
    // getAbsoluteUrl (noodl-runtime/src/utils.ts): `(Noodl.baseUrl || '/') + url` for a local path, else verbatim.
    expect(absoluteUrl('noodl_modules/a.svg')).toBe('/noodl_modules/a.svg');
    expect(absoluteUrl('/a.svg')).toBe('/a.svg');
    expect(absoluteUrl('https://h/a.svg')).toBe('https://h/a.svg');
    expect(absoluteUrl('data:x')).toBe('data:x');
    expect(absoluteUrl('')).toBe('');
    // the runtime's own edges, reproduced: a bare `blob:` has no `://` and is prefixed; a number is stringified
    expect(absoluteUrl('blob:http://h/abc')).toBe('blob:http://h/abc');
    expect(absoluteUrl(0)).toBe('/0');
    expect(absoluteUrl({ toString: () => 'files/cloud.png' })).toBe('/files/cloud.png');
    // resolveMediaSource (media-source.ts): the three empties clear; everything else is getAbsoluteUrl
    expect(mediaSrc(null)).toBeUndefined();
    expect(mediaSrc(undefined)).toBeUndefined();
    expect(mediaSrc('')).toBeUndefined();
    expect(mediaSrc('noodl_modules/a.svg')).toBe('/noodl_modules/a.svg');
  });

  test('E3 the attribute table is the DOM’s: src and poster through mediaSrc, srcSet through mediaSrcSet, nothing else', () => {
    expect(Object.keys(MEDIA_ATTRS).sort()).toEqual(['poster', 'src', 'srcSet']);
    expect(MEDIA_ATTRS.src.helper).toBe('mediaSrc');
    expect(MEDIA_ATTRS.poster.helper).toBe('mediaSrc');
    expect(MEDIA_ATTRS.srcSet.helper).toBe('mediaSrcSet');
    expect(MEDIA_ATTRS.alt).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------------------------------
describe('§F the consequence — what each spelling resolves to on a two-segment route, in the browser’s own algorithm', () => {
  const DOCUMENT = 'http://host/gallery/team';

  test('F1 the route is two segments deep — the depth no other fixture has, and the premise of every row here', () => {
    expect(app.files['src/App.tsx']).toContain('<Route path="/gallery/team" element={<TeamPage />} />');
  });

  test('F2 the verbatim spelling (the reverted arm) resolves UNDER the route — the 404', () => {
    expect(new URL('noodl_modules/starter-imagery/portrait.svg', DOCUMENT).pathname).toBe(
      '/gallery/noodl_modules/starter-imagery/portrait.svg'
    );
  });

  test('F3 the emitted spelling resolves at the root, where the copies channel put the file', () => {
    const src = /<img src="([^"]+)" alt="A portrait"/.exec(team())![1];
    expect(new URL(src, DOCUMENT).pathname).toBe('/noodl_modules/starter-imagery/portrait.svg');
    expect(app.copies.map((c) => c.to)).toContain('public/noodl_modules/starter-imagery/portrait.svg');
  });

  test('F4 on a ONE-segment route the two spellings agree — which is why three drives read zero broken images', () => {
    expect(new URL('noodl_modules/x.svg', 'http://host/business').pathname).toBe('/noodl_modules/x.svg');
    expect(new URL('/noodl_modules/x.svg', 'http://host/business').pathname).toBe('/noodl_modules/x.svg');
  });

  test('F5 the emptied field: `src=""` resolves to the document itself, which is the request the omission prevents', () => {
    expect(new URL('', DOCUMENT).href).toBe(DOCUMENT);
  });
});
