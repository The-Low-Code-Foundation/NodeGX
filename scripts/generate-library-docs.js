/**
 * HLT-013 — the library reference, assembled from the two places its prose lives.
 *
 * `docs-site/docs/library/` is entirely generated output: this script deletes and
 * rewrites it from scratch every run rather than diffing in place, so an entry
 * that is renamed or dropped cannot leave an orphaned page behind — the same rule
 * and the same reason as `generate-node-docs.js` beside it.
 *
 * ## Two sources, and which one wins
 *
 *  1. **`library/<type>/<slug>/README.md`** — prose authored in this repo, beside
 *     the `library.json` and the `project/` it describes. 38 entries, 22,466
 *     words, NodeGX-era.
 *  2. **`docs-site/imported-prose/<type>/<slug>/**`** — prose imported from the
 *     content repo by `docs:library:import`, screenshots stripped. 32 entries.
 *
 * (1) wins on collision and the import never fetches an entry that has it, so the
 * two sets are disjoint by construction. The rule is stated anyway: a NodeGX-era
 * README describes the component we ship; the Noodl-era page describes the one we
 * forked.
 *
 * ## 🔴 The links are the part that can ship dead, so they are resolved here
 *
 * `docusaurus.config.js` sets `onBrokenLinks: 'throw'`, so an unresolvable link
 * fails the site build. That is the right setting and it is why link rewriting
 * cannot live in the importer: the old site had sections this one does not
 * (`/javascript/**`), and pages this one never generated (`/docs/getting-started/
 * fundamentals` is named by the tutorials index and exists nowhere). Measured
 * 2026-09-21 across the imported prose: 84 `/library/` links, 70 `/nodes/`, 29
 * `/docs/`, 34 relative, 1 `/javascript/`.
 *
 * A link whose target does not exist is **unlinked, not dropped** — the words
 * stay and stop being a promise. Dropping the sentence loses content; leaving the
 * link ships the exact defect this row exists to close, one level down.
 *
 * ## What the editor gets out of it
 *
 * `libraryDocsPages.ts`, the list of entries that actually have a page. 🔴 The
 * editor cannot ask the index: `scripts/library/build.js:193` writes
 * `docs: meta.docsPath || \`/library/${type}/${slug}/\`` for **every** entry
 * whether a page exists there or not, which is how 78 cards came to draw a
 * button to a 404. The index is also *published*, so even a fixed `build.js`
 * leaves every shipped editor reading the old rows until someone republishes.
 * The editor therefore ships the list rather than trusting the payload.
 *
 *   node scripts/generate-library-docs.js           # regenerate
 *   node scripts/generate-library-docs.js --check   # fail if the committed output is stale
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const LIBRARY_DIR = path.join(ROOT, 'library');
const IMPORTED_DIR = path.join(ROOT, 'docs-site/imported-prose');
const DOCS_ROOT = path.join(ROOT, 'docs-site/docs');
const OUT_DIR = path.join(DOCS_ROOT, 'library');
const MANIFEST_PATH = path.join(ROOT, 'packages/noodl-editor/src/editor/src/models/libraryDocsPages.ts');

const TYPES = ['modules', 'prefabs'];
const TYPE_LABEL = { modules: 'Modules', prefabs: 'Prefabs' };

// ---------------------------------------------------------------------------
// Gathering
// ---------------------------------------------------------------------------

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function listDirs(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
}

function walk(dir, base = dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(full, base));
    else if (e.name.endsWith('.md')) out.push(path.relative(base, full));
  }
  return out;
}

/**
 * Every entry that will get a page, with the files that make it.
 *
 * `label` comes from `library.json` where this repo builds the entry, because
 * that is the string the card in the node picker shows — a page titled something
 * else is a page the person cannot tell they arrived at. Imported entries this
 * repo no longer builds have no `library.json`, so their own frontmatter title
 * stands.
 */
function gather() {
  const entries = new Map();

  for (const type of TYPES) {
    for (const slug of listDirs(path.join(LIBRARY_DIR, type))) {
      const readme = path.join(LIBRARY_DIR, type, slug, 'README.md');
      if (!fs.existsSync(readme)) continue;
      const metaPath = path.join(LIBRARY_DIR, type, slug, 'library.json');
      const label = fs.existsSync(metaPath) ? readJson(metaPath).label : undefined;
      entries.set(`${type}/${slug}`, {
        type,
        slug,
        label,
        source: 'authored',
        files: [{ rel: 'index.md', abs: readme }]
      });
    }
  }

  for (const type of TYPES) {
    for (const slug of listDirs(path.join(IMPORTED_DIR, type))) {
      const key = `${type}/${slug}`;
      if (entries.has(key)) continue; // (1) wins
      const dir = path.join(IMPORTED_DIR, type, slug);
      const files = walk(dir).map((rel) => ({
        // A `README.md` is a directory's page at every level, not only the
        // entry's own — `xano/components/setup-xanoclient/README.md` is what
        // seven links in `xano/README.md` address as a directory.
        rel: rel.replace(/(^|\/)README\.md$/, '$1index.md'),
        abs: path.join(dir, rel)
      }));
      if (!files.some((f) => f.rel === 'index.md')) continue; // no entry page, no entry
      const metaPath = path.join(LIBRARY_DIR, type, slug, 'library.json');
      entries.set(key, {
        type,
        slug,
        label: fs.existsSync(metaPath) ? readJson(metaPath).label : undefined,
        source: 'imported',
        files
      });
    }
  }

  return entries;
}

// ---------------------------------------------------------------------------
// Links
// ---------------------------------------------------------------------------

/** Every route the assembled site will serve, as Docusaurus will address it. */
function buildRouteSet(entries) {
  const routes = new Set();

  // The pages this script writes. An `index` is its directory's route, at every
  // depth, so `components/setup-xanoclient/index.md` answers to
  // `/docs/library/prefabs/xano/components/setup-xanoclient`.
  for (const { type, slug, files } of entries.values()) {
    for (const { rel } of files) {
      const noExt = rel.replace(/\.md$/, '').replace(/(^|\/)index$/, '');
      const suffix = noExt.replace(/\/$/, '');
      routes.add(suffix ? `/docs/library/${type}/${slug}/${suffix}` : `/docs/library/${type}/${slug}`);
    }
    routes.add(`/docs/library/${type}/${slug}`);
  }
  routes.add('/docs/library');
  for (const type of TYPES) routes.add(`/docs/library/${type}`);

  // The pages that already exist beside them — `docs/nodes/**` especially, which
  // the imported prose links into 70 times.
  for (const rel of walk(DOCS_ROOT)) {
    const noExt = rel.replace(/\.md$/, '').replace(/\/(index|README)$/, '');
    if (noExt.startsWith('library/')) continue; // this run rewrites those
    routes.add(`/docs/${noExt}`);
  }

  return routes;
}

const LINK_RE = /(?<!!)\[([^\]]*)\]\(([^)\s]+)(\s+"[^"]*")?\)/g;

/**
 * The old site's node URLs, re-addressed to this site's node pages.
 *
 * 🔴 A `/nodes/<category>/<slug>` link cannot be resolved by prefixing `/docs`,
 * because **the category moved**. ALPHA-006 §3 grouped the generated reference
 * by the picker's own `category` rather than the old site's tree, naming this
 * exact disagreement: *"`Button` is `ui-controls` on the site and `Visual` in
 * the catalog"*. So `/nodes/ui-controls/button` is dead and
 * `/docs/nodes/visual/button` is the page — same node, same words, different
 * shelf.
 *
 * The slug is the stable half, so that is what this matches on. An ambiguous
 * slug (two categories, one name) resolves to nothing rather than to a guess:
 * sending a reader to the wrong node's page is worse than not sending them.
 */
function nodeRouteIndex(routes) {
  const bySlug = new Map();
  for (const route of routes) {
    const m = route.match(/^\/docs\/nodes\/[^/]+\/([^/]+)$/);
    if (!m) continue;
    const slug = m[1];
    bySlug.set(slug, bySlug.has(slug) ? null : route);
  }
  return bySlug;
}

/**
 * Rewrites one page's links, unlinking whatever the site will not serve.
 *
 * The old site was rooted at `/`, this one at `/docs`, so a root-relative link
 * needs the prefix before it can even be asked about. Relative links are
 * resolved against the page's own directory in the **assembled** tree, which is
 * why this cannot run before assembly: `../charts/bar` means a different file
 * once `README.md` has become `index.md`.
 */
function rewriteLinks(text, routeOf, routes, nodeBySlug, stats) {
  return text.replace(LINK_RE, (whole, label, target, title) => {
    if (/^(https?:|mailto:|#)/.test(target)) return whole;

    const [rawPath, hash = ''] = target.split('#');
    let resolved;
    if (rawPath.startsWith('/')) {
      resolved = `/docs${rawPath}`;
    } else if (rawPath === '') {
      return whole; // a bare `#anchor`, already handled above
    } else {
      resolved = path.posix.normalize(path.posix.join(path.posix.dirname(routeOf), rawPath));
    }
    resolved = resolved.replace(/\.mdx?$/, '').replace(/\/+$/, '');

    if (!routes.has(resolved) && resolved.startsWith('/docs/nodes/')) {
      const moved = nodeBySlug.get(resolved.split('/').pop());
      if (moved) {
        stats.recategorised++;
        resolved = moved;
      }
    }

    if (routes.has(resolved)) {
      stats.kept++;
      return `[${label}](${resolved}${hash ? '#' + hash : ''}${title || ''})`;
    }
    stats.unlinked.push({ from: routeOf, target });
    return label;
  });
}

// ---------------------------------------------------------------------------
// Writing
// ---------------------------------------------------------------------------

function setFrontmatterTitle(text, label) {
  if (!label) return text;
  if (text.startsWith('---')) {
    const m = text.match(/^---\n([\s\S]*?)\n---\n?/);
    if (m) {
      const body = m[1].match(/^title:/m)
        ? m[1].replace(/^title:.*$/m, `title: ${JSON.stringify(label)}`)
        : `title: ${JSON.stringify(label)}\n${m[1]}`;
      return `---\n${body}\n---\n${text.slice(m[0].length)}`;
    }
  }
  // An authored README opens with its own `# Heading`; the frontmatter title
  // replaces it so the page is not titled twice.
  const withoutH1 = text.replace(/^#\s+.+$\n*/m, '');
  return `---\ntitle: ${JSON.stringify(label)}\n---\n\n${withoutH1.trimStart()}`;
}

function build() {
  const entries = gather();
  const routes = buildRouteSet(entries);
  const nodeBySlug = nodeRouteIndex(routes);
  const stats = { kept: 0, recategorised: 0, unlinked: [] };
  const files = new Map();

  files.set(
    'library/_category_.json',
    JSON.stringify({ label: 'Library', position: 4, link: { type: 'doc', id: 'library/index' } }, null, 2) + '\n'
  );
  files.set(
    'library/index.md',
    [
      '---',
      'title: "Library"',
      '---',
      '',
      'Modules and prefabs you can install into a project from the node picker.',
      '',
      `There are ${[...entries.values()].filter((e) => e.type === 'modules').length} modules and ` +
        `${[...entries.values()].filter((e) => e.type === 'prefabs').length} prefabs documented here.`,
      ''
    ].join('\n')
  );

  for (const type of TYPES) {
    files.set(
      `library/${type}/_category_.json`,
      JSON.stringify({ label: TYPE_LABEL[type] }, null, 2) + '\n'
    );
  }

  for (const entry of [...entries.values()].sort((a, b) => `${a.type}/${a.slug}`.localeCompare(`${b.type}/${b.slug}`))) {
    for (const file of entry.files) {
      const rel = `library/${entry.type}/${entry.slug}/${file.rel}`;
      const routeOf =
        file.rel === 'index.md'
          ? `/docs/library/${entry.type}/${entry.slug}/index`
          : `/docs/library/${entry.type}/${entry.slug}/${file.rel.replace(/\.md$/, '')}`;
      let text = fs.readFileSync(file.abs, 'utf8');
      if (file.rel === 'index.md') text = setFrontmatterTitle(text, entry.label);
      text = rewriteLinks(text, routeOf, routes, nodeBySlug, stats);
      files.set(rel, text.endsWith('\n') ? text : text + '\n');
    }
  }

  return { files, entries, stats };
}

function manifest(entries) {
  const keys = [...entries.keys()].sort();
  return [
    '/**',
    ' * HLT-013 — the library entries that have a documentation page. **Generated.**',
    ' *',
    ' * Written by `npm run docs:library` from `docs-site/docs/library/`, and graded',
    ' * by `npm run docs:library:check`. Do not edit by hand.',
    ' *',
    ' * 🔴 This exists because the index entry cannot answer the question.',
    " * `scripts/library/build.js` writes a `docs` path for **every** entry whether a",
    ' * page exists at it or not, and the index is *published* — so a shipped editor',
    ' * reads rows written before any of this, and drew a "Read docs" button to a 404',
    ' * on all 78 of them. The editor asks this list instead.',
    ' *',
    ` * ${keys.length} entries have a page.`,
    ' */',
    'export const LIBRARY_DOCS_PAGES: ReadonlySet<string> = new Set([',
    ...keys.map((k) => `  '${k}',`),
    ']);',
    '',
    '/**',
    ' * Whether `<type>/<slug>` has a page on the docs site.',
    ' *',
    ' * Takes the index entry\'s own `docs` path (`/library/prefabs/accordion/`) so the',
    ' * caller does not re-derive the key from two other fields and get it subtly wrong.',
    ' */',
    'export function hasLibraryDocsPage(docsPath: string | undefined): boolean {',
    '  if (!docsPath) return false;',
    "  const parts = docsPath.split('/').filter(Boolean);",
    "  if (parts[0] !== 'library' || parts.length < 3) return false;",
    '  return LIBRARY_DOCS_PAGES.has(`${parts[1]}/${parts[2]}`);',
    '}',
    ''
  ].join('\n');
}

function main() {
  const check = process.argv.includes('--check');
  const { files, entries, stats } = build();
  const manifestText = manifest(entries);

  if (check) {
    const problems = [];
    const onDisk = new Set(
      fs.existsSync(OUT_DIR)
        ? fs
            .readdirSync(OUT_DIR, { recursive: true, withFileTypes: true })
            .filter((d) => d.isFile())
            .map((d) => path.relative(DOCS_ROOT, path.join(d.parentPath || d.path, d.name)))
        : []
    );
    for (const [rel, text] of files) {
      const abs = path.join(DOCS_ROOT, rel);
      if (!fs.existsSync(abs)) problems.push(`missing: ${rel}`);
      else if (fs.readFileSync(abs, 'utf8') !== text) problems.push(`stale: ${rel}`);
      onDisk.delete(rel);
    }
    for (const orphan of onDisk) problems.push(`orphan: ${orphan}`);
    if (!fs.existsSync(MANIFEST_PATH) || fs.readFileSync(MANIFEST_PATH, 'utf8') !== manifestText) {
      problems.push(`stale: ${path.relative(ROOT, MANIFEST_PATH)}`);
    }

    if (problems.length) {
      for (const p of problems.slice(0, 20)) console.error(`   ${p}`);
      if (problems.length > 20) console.error(`   … and ${problems.length - 20} more`);
      console.error(`docs:library:check — ${problems.length} problem(s). Run \`npm run docs:library\` and commit the result.`);
      process.exit(1);
    }
    console.log(`docs:library:check — clean. ${files.size} generated files across ${entries.size} entries.`);
    return;
  }

  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  for (const [rel, text] of files) {
    const abs = path.join(DOCS_ROOT, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, text, 'utf8');
  }
  fs.writeFileSync(MANIFEST_PATH, manifestText, 'utf8');

  const authored = [...entries.values()].filter((e) => e.source === 'authored').length;
  console.log(`docs:library — ${files.size} files across ${entries.size} entries (${authored} authored here, ${entries.size - authored} imported).`);
  console.log(`  links: ${stats.kept} resolved (${stats.recategorised} node links re-addressed), ${stats.unlinked.length} unlinked.`);
  const byTarget = new Map();
  for (const u of stats.unlinked) byTarget.set(u.target, (byTarget.get(u.target) || 0) + 1);
  for (const [t, n] of [...byTarget].sort((a, b) => b[1] - a[1]).slice(0, 8)) {
    console.log(`    ${String(n).padStart(3)} × ${t}`);
  }
}

if (require.main === module) main();
