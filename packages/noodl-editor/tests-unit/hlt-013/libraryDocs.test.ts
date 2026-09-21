/**
 * P99 HLT-013 — the node picker's "Read docs" button, graded against the site that serves it.
 *
 * 🔴 **What was wrong, measured 2026-09-21:** all 78 library cards drew a "Read docs" button and
 * all 78 opened GitHub's 404 page. `ModuleCard` joined the entry's docs path onto the *content*
 * origin (`…/nodegx-content/static`), where no prose was ever published under `/static`. Of the 78
 * entries, 70 have prose somewhere — 38 authored in this repo's `library/`, 32 only in the content
 * repo — and 8 have none anywhere.
 *
 * The fix has three halves and each gets a describe here:
 *   1. the prose is published by this repo's docs site (`docs:library`), so the page exists;
 *   2. the editor draws the button only for an entry with a page (`hasLibraryDocsPage`);
 *   3. the node reference that site already carries stops rendering `<tag>` text as markup —
 *      which is what had stopped the site building at all, and so blocked (1).
 *
 * ⚠️ `docs:library:check` grades that the committed tree is what the generator writes. It cannot
 * grade that the *generator* is right, which is what these are for. The network half — every
 * button the editor draws answers 200 on the deployed site — is `docs:verify-origin`'s
 * `library-docs` origin; this file needs no network.
 */

import * as fs from 'fs';
import * as path from 'path';

import { hasLibraryDocsPage, LIBRARY_DOCS_PAGES } from '@noodl-models/libraryDocsPages';

const REPO = path.resolve(__dirname, '../../../..');
const LIBRARY_OUT = path.join(REPO, 'docs-site/docs/library');
const NODES_OUT = path.join(REPO, 'docs-site/docs/nodes');

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(full));
    else if (e.name.endsWith('.md')) out.push(full);
  }
  return out;
}

/** Everything outside fenced blocks and inline code spans — the text markdown will interpret. */
function outsideCode(text: string): string {
  return text.split(/(```[\s\S]*?```|`[^`\n]*`)/g).filter((_p, i) => i % 2 === 0).join('');
}

describe('HLT-013 — the button is drawn only where a page exists', () => {
  it('draws it for an entry authored in this repo and one imported from the content repo', () => {
    // Accordion's prose is `library/prefabs/accordion/README.md`; Chart.js's exists only upstream.
    expect(hasLibraryDocsPage('/library/prefabs/accordion/')).toBe(true);
    expect(hasLibraryDocsPage('/library/modules/chartjs/')).toBe(true);
  });

  it('does not draw it for the eight entries whose prose exists nowhere', () => {
    // Measured, not chosen: no README here, none upstream at cf873c1e. A page written for any of
    // these regenerates the manifest and its button returns — this list is expected to shrink.
    const unwritten = [
      'modules/confetti',
      'modules/example-node-kit',
      'modules/lucide-icons',
      'modules/mqtt',
      'modules/nodegx-charts',
      'modules/qr-code',
      'modules/image-cropper',
      'modules/panning-and-zooming'
    ];
    for (const key of unwritten) {
      const written =
        fs.existsSync(path.join(REPO, 'library', key, 'README.md')) ||
        fs.existsSync(path.join(REPO, 'docs-site/imported-prose', key, 'README.md'));
      // If this fires, a page was written: delete the key from this list, it is good news.
      expect({ key, written }).toEqual({ key, written: false });
      expect(hasLibraryDocsPage(`/library/${key}/`)).toBe(false);
    }
  });

  it('refuses anything that is not a library entry path', () => {
    for (const bad of [undefined, '', '/', '/library/', '/library/modules/', '/docs/library/modules/chartjs/', 'chartjs']) {
      expect(hasLibraryDocsPage(bad)).toBe(false);
    }
  });

  it('accepts the path with or without its trailing slash, as the index has written both', () => {
    expect(hasLibraryDocsPage('/library/prefabs/accordion')).toBe(true);
  });
});

describe('HLT-013 — every key the editor trusts is a page the site will build', () => {
  it('has a page file for every manifest key, and a manifest key for every entry page', () => {
    const keys = [...LIBRARY_DOCS_PAGES].sort();
    // A floor, so an empty manifest cannot pass the loop below vacuously.
    expect(keys.length).toBeGreaterThanOrEqual(70);
    for (const key of keys) {
      expect({ key, page: fs.existsSync(path.join(LIBRARY_OUT, key, 'index.md')) }).toEqual({ key, page: true });
    }
    const onDisk = ['modules', 'prefabs']
      .flatMap((type) => fs.readdirSync(path.join(LIBRARY_OUT, type), { withFileTypes: true })
        .filter((d) => d.isDirectory()).map((d) => `${type}/${d.name}`))
      .sort();
    expect(onDisk).toEqual(keys);
  });

  it('never leaves an entry authored in this repo without its page', () => {
    for (const type of ['modules', 'prefabs']) {
      for (const slug of fs.readdirSync(path.join(REPO, 'library', type))) {
        if (!fs.existsSync(path.join(REPO, 'library', type, slug, 'README.md'))) continue;
        expect({ key: `${type}/${slug}`, listed: LIBRARY_DOCS_PAGES.has(`${type}/${slug}`) }).toEqual({
          key: `${type}/${slug}`,
          listed: true
        });
      }
    }
  });
});

describe('HLT-013 — what the import stripped stays stripped', () => {
  const pages = walk(LIBRARY_OUT);

  it('publishes no screenshot, video or copy-the-graph button', () => {
    // Richard's ruling, 2026-09-21: the screenshots show the pre-refresh editor, and the copy
    // buttons copy a graph you were meant to be looking at in them.
    const offenders = pages.filter((p) =>
      /!\[[^\]]*\]\(|<img\b|<iframe\b|<ImportButton|<CopyToClipboardButton|<ReactPlayer/.test(outsideCode(fs.readFileSync(p, 'utf8')))
    );
    expect(offenders.map((p) => path.relative(REPO, p))).toEqual([]);
  });

  it("carries none of the old site's private syntax, which renders as literal text here", () => {
    const offenders = pages.filter((p) =>
      /@include\s+"|##head##|className="ndl-|class="ndl-/.test(outsideCode(fs.readFileSync(p, 'utf8')))
    );
    expect(offenders.map((p) => path.relative(REPO, p))).toEqual([]);
  });
});

describe('HLT-013 — the node reference shows a <tag> as text, not as markup', () => {
  /**
   * 🔴 This is what stopped the docs site building. Parse XML's description says
   * `(so <a href="x"/> is { "@href": "x" })`; CommonMark passed the raw anchor through,
   * Docusaurus's `onBrokenLinks: 'throw'` refused a link to `x`, and **no deploy has built
   * since that description landed on 2026-09-18** — the next merge to `main` would have failed
   * `deploy-docs.yml`. At HEAD before the fix, 13 generated pages carried such text outside code.
   */
  const TAG_OUTSIDE_CODE = /<(?=[a-zA-Z!/])/;

  it('has no generated node page with a raw tag outside code', () => {
    const offenders = walk(NODES_OUT).filter((p) => TAG_OUTSIDE_CODE.test(outsideCode(fs.readFileSync(p, 'utf8'))));
    expect(offenders.map((p) => path.relative(REPO, p))).toEqual([]);
  });

  it('still shows the words the escaping protects — the rule is not satisfied by deleting them', () => {
    const xml = fs.readFileSync(path.join(NODES_OUT, 'data/net-noodl-parse-xml.md'), 'utf8');
    expect(xml).toContain('&lt;item>');
    expect(xml).toContain('&lt;!ENTITY>');
  });

  it('can see the defect — calibration against the broken form', () => {
    // If `outsideCode` or the pattern ever stopped matching, the first spec above would pass on
    // the broken build. This is the broken line, verbatim.
    expect(TAG_OUTSIDE_CODE.test(outsideCode('attributes arrive under keys prefixed with @ (so <a href="x"/> is'))).toBe(true);
    expect(TAG_OUTSIDE_CODE.test(outsideCode('an inline `<a href="x"/>` in code is shown verbatim'))).toBe(false);
  });
});
