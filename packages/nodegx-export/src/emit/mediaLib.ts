/**
 * `src/lib/media.ts` — a media URL port as the browser must be handed it, emitted into the app
 * (EXP-014 §14.5, the `<img src>` residual).
 *
 * A transcription of two runtime functions, kept as two functions so each can be cited:
 *
 * - `absoluteUrl` is `noodl-runtime/src/utils.ts` `getAbsoluteUrl`: a LOCAL path takes the base
 *   URL in front; a root-absolute path, a `scheme://` URL and a `data:` URI pass through, and so
 *   does an empty string. The runtime's base is `Noodl.baseUrl || '/'`; the exported app is served
 *   from its root, so the base is `/` here. `String(value)` first, as there — a Cloud File is an
 *   object with a custom `toString()`, and the cast is what makes one usable as a source.
 * - `mediaSrc` is `noodl-viewer-react/src/nodes/visual/media-source.ts` `resolveMediaSource`, the
 *   gate the Image and Video nodes put in FRONT of `getAbsoluteUrl`: `null`, `undefined` and `''`
 *   answer `undefined`, which React renders as no attribute at all. `src=""` resolves to the
 *   document and refetches the page; `/undefined` requests a file called undefined — both are
 *   measured in that file's own table, and clearing the attribute is the only spelling that
 *   produces no request.
 *
 * 🔴 **Why this module exists at all.** The emitted app routes with a `BrowserRouter`, so the
 * DOCUMENT sits at the route's depth and a relative `src` resolves against it. The parameter holds
 * a project-relative path (`noodl_modules/starter-imagery/portrait.svg`) and the asset travels
 * through the `copies` channel to `public/<same path>`, served from the site root. On a one-segment
 * route (`/business`) the relative form resolves to `/noodl_modules/…` and works; on `/gallery/team`
 * it resolves to `/gallery/noodl_modules/…` and 404s. The viewer never sees this because its Image
 * node runs every source through `getAbsoluteUrl` at the port; the export printed the parameter
 * verbatim, and every route the shipped templates emit is one segment deep, which is why three
 * drives read zero broken images. `cssUrl` in `style.ts` closes the same gap for a CSS `url()`,
 * for a different reason (a stylesheet resolves against ITSELF).
 *
 * ⚠️ **Recorded divergence: `srcset` is resolved candidate by candidate here, and the viewer sets
 * it verbatim** (`image.ts`, an `inputProps` entry with `propPath: 'dom'` and no setter). Under the
 * viewer's default hash routing the document is always `/`, so verbatim works there; under path
 * routing the viewer carries the same latent 404 in `srcset` that this closes for `src`. The
 * export's router is a path router with no hash mode, so verbatim here would be a picture that
 * breaks one route-depth away — the residual this module was written to close. The viewer-side
 * gap is registered in EXP-014, owner NONE, not reproduced.
 *
 * ⚠️ The icon node is the one caller that takes `absoluteUrl` DIRECTLY: the runtime's
 * `iconImageSource` setter (`node-shared-port-definitions.ts`) calls `getAbsoluteUrl` with no
 * empty gate in front, so an empty icon source stays `src=""` there and stays `src=""` here. That is
 * the runtime's own unrepaired edge (NDA-012 fixed Image and Video only) — transcribed, not fixed.
 */

/** Where the module lands in the exported app. */
export const MEDIA_LIB_PATH = 'src/lib/media.ts';

/** The helpers the module exports; a wired attribute names the one it prints through. */
export type MediaHelper = 'mediaSrc' | 'mediaSrcSet';

/**
 * The DOM attributes that carry a media URL, and the helper each resolves through. Keyed by the
 * ATTRIBUTE because that is the DOM's meaning, the same key `ATTR_SINK` in `component.ts` uses —
 * `src` on an `<img>` and on a `<video>` are the same channel.
 */
export const MEDIA_ATTRS: Record<string, { helper: MediaHelper; resolve: (value: unknown) => string | undefined }> = {
  src: { helper: 'mediaSrc', resolve: (value) => mediaSrc(value) },
  poster: { helper: 'mediaSrc', resolve: (value) => mediaSrc(value) },
  srcSet: { helper: 'mediaSrcSet', resolve: (value) => mediaSrcSet(value) }
};

/** `getAbsoluteUrl`, with the base the exported app is served from. */
export function absoluteUrl(value: unknown): string {
  const url = String(value);
  if (!url || url[0] === '/' || url.includes('://') || url.startsWith('data:')) return url;
  return '/' + url;
}

/** `resolveMediaSource`: an empty port clears the attribute; anything else is made absolute. */
export function mediaSrc(value: unknown): string | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  return absoluteUrl(value);
}

/**
 * A `srcset` with every candidate URL resolved and every descriptor kept. The tokeniser is the
 * HTML parser's own: a candidate URL is a run of non-whitespace with trailing commas stripped (a
 * comma INSIDE a `data:` URI survives, as it does in the browser), and its descriptors run to the
 * next comma. A candidate that resolves to nothing is dropped; a list with none left clears.
 */
export function mediaSrcSet(value: unknown): string | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  let rest = String(value);
  const candidates: string[] = [];
  while (rest.length > 0) {
    rest = rest.replace(/^[\s,]+/, '');
    if (rest.length === 0) break;
    let url = /^\S+/.exec(rest)![0];
    rest = rest.slice(url.length);
    let descriptors = '';
    if (url.endsWith(',')) {
      url = url.replace(/,+$/, '');
    } else {
      const run = /^[^,]*/.exec(rest)![0];
      rest = rest.slice(run.length);
      descriptors = run.trim();
      if (rest.startsWith(',')) rest = rest.slice(1);
    }
    const resolved = mediaSrc(url);
    if (resolved === undefined) continue;
    candidates.push(descriptors.length > 0 ? `${resolved} ${descriptors}` : resolved);
  }
  return candidates.length > 0 ? candidates.join(', ') : undefined;
}

/**
 * The module's source — the three functions above, as the app receives them.
 *
 * 🔴 A second copy of the rule, and it is graded against the first: `tests/the-picture-path.test.ts`
 * transpiles this text and runs it beside the package's own functions over one table, so the two
 * cannot drift apart without a row going red. A plain string array rather than a template literal,
 * for `dateLib.ts`'s stated reason.
 */
export function mediaLibSource(): string {
  return [
    '//',
    '// A media URL port as the browser must be handed it, transcribed from the interpreter it has to agree with:',
    '// noodl-runtime/src/utils.ts getAbsoluteUrl and noodl-viewer-react/src/nodes/visual/media-source.ts resolveMediaSource.',
    '//',
    '// This app routes with a BrowserRouter, so the document sits at the route depth and a relative src would',
    '// resolve under the route. A project-relative path is served from the site root, so it is made root-absolute;',
    '// a root-absolute path, a scheme:// URL and a data: URI pass through; an empty value clears the attribute.',
    '//',
    '',
    '/** getAbsoluteUrl: a local path takes the base the app is served from; anything already absolute passes. */',
    'export function absoluteUrl(value: unknown): string {',
    '  const url = String(value);',
    "  if (!url || url[0] === '/' || url.includes('://') || url.startsWith('data:')) return url;",
    "  return '/' + url;",
    '}',
    '',
    '/** resolveMediaSource: an empty port clears the attribute (React omits an undefined attribute); anything else is made absolute. */',
    'export function mediaSrc(value: unknown): string | undefined {',
    "  if (value === null || value === undefined || value === '') return undefined;",
    '  return absoluteUrl(value);',
    '}',
    '',
    '/** A srcset with every candidate URL resolved and every descriptor kept. */',
    'export function mediaSrcSet(value: unknown): string | undefined {',
    "  if (value === null || value === undefined || value === '') return undefined;",
    '  let rest = String(value);',
    '  const candidates: string[] = [];',
    '  while (rest.length > 0) {',
    "    rest = rest.replace(/^[\\s,]+/, '');",
    '    if (rest.length === 0) break;',
    '    let url = /^\\S+/.exec(rest)![0];',
    '    rest = rest.slice(url.length);',
    "    let descriptors = '';",
    "    if (url.endsWith(',')) {",
    "      url = url.replace(/,+$/, '');",
    '    } else {',
    '      const run = /^[^,]*/.exec(rest)![0];',
    '      rest = rest.slice(run.length);',
    '      descriptors = run.trim();',
    "      if (rest.startsWith(',')) rest = rest.slice(1);",
    '    }',
    '    const resolved = mediaSrc(url);',
    '    if (resolved === undefined) continue;',
    '    candidates.push(descriptors.length > 0 ? `${resolved} ${descriptors}` : resolved);',
    '  }',
    "  return candidates.length > 0 ? candidates.join(', ') : undefined;",
    '}',
    ''
  ].join('\n');
}
