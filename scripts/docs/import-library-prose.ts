#!/usr/bin/env ts-node
/**
 * HLT-013 — import the library prose the editor's "Read docs" button points at.
 *
 * ## Why this exists
 *
 * Every card in the node picker's library shows a **Read docs** button, and all
 * 78 of them 404. Measured 2026-09-21: `ModuleCard` joins the index entry's
 * `docs` path (`/library/modules/chartjs/`) onto **`getContentEndpoint()`** —
 * which carries the `/static` suffix the legacy Pages build needs for the
 * payloads. The prose sits one level *above* `/static`, as unrendered Docusaurus
 * source, so the join misses and the browser gets GitHub's 404 page.
 *
 * ALPHA-006 §5 ruled the prose stays out of this monorepo: *"the prefab
 * `library/` prose (179 files, ~60k words) does not come into this monorepo …
 * Dragging it in brings the 413 MB back through the side door."* 🔴 **That
 * objection was about the repo around the prose, not the prose.** Measured on
 * the same tree: the content repo is 528 MB — 378 MB of screenshots and 147 MB
 * of install zips — and **all of its markdown is 1.8 MB**. The library prose
 * alone is **0.6 MB**, less than half the size of `docs-site/docs` as it already
 * stands. Richard ruled it in on that number, 2026-09-21, with the screenshots
 * stripped: they show the pre-refresh editor and ALPHA-006 §4 had already
 * judged that whole population wrong.
 *
 * ## What it imports, and what it deliberately does not
 *
 * Only prose an index entry actually points at — `library/<type>/<slug>/**`.
 * The 16 `library/examples/**` walkthroughs and the four `overview.mdx` pages
 * are **skipped**: the examples are step-by-step walkthroughs whose every step
 * is a screenshot of an editor we no longer ship (ALPHA-006 §4's *"the concepts
 * survive; every step and screenshot does not"*), and the overviews are built
 * out of `<ModuleListing>` / `<PrefabListing>` blocks that render the old site's
 * own registry.
 *
 * Entries whose prose is already **in this repo** at `library/<type>/<slug>/README.md`
 * are skipped too, and that is most of them: 38 of 78 entries are NodeGX-era,
 * written here, 22,466 words, no stale screenshots. This script only fetches the
 * 32 entries whose prose exists **only** upstream.
 *
 * ## Where it writes, and why not into `library/`
 *
 * `docs-site/imported-prose/<type>/<slug>/**`, committed.
 *
 * ⚠️ **Not** into `library/<type>/<slug>/`, which would be the natural slot — 24
 * of the 32 have an entry directory sitting right there with an empty README
 * shaped hole in it. Eight do not (`chartjs`, `validation`, `i18next`,
 * `webcamera`, `mailgun`, `sendgrid`, `shake-detector`, `toggle` — Noodl-era
 * entries still in the published index but no longer built here), and
 * `scripts/library/build.js` raises on a `library/<type>/<slug>/` directory with
 * no `library.json` in it. Splitting the 32 across two homes by whether their
 * *zip* is built here would key the prose's location on something that has
 * nothing to do with prose. One import, one directory.
 *
 * ## The split with `generate-library-docs.js`
 *
 * This script does **fetch and strip**. It does not resolve links, because a
 * link can only be graded against the assembled tree and that tree is the
 * generator's output — `docs-site/docs/library/**`, written from both sources
 * and deleted and rewritten whole on every run. `onBrokenLinks: 'throw'` means
 * an unresolved link fails the site build rather than shipping dead, which is
 * the whole failure this row exists to end, so the resolution belongs where the
 * answer is knowable.
 *
 * Pinned to a commit rather than `main`: an import whose output depends on when
 * it ran cannot be checked by re-running it.
 *
 * Usage:
 *   npm run docs:library:import           # refresh docs-site/imported-prose/
 *   npm run docs:library:import -- --dry  # report what would change, write nothing
 *
 * Exit codes: 0 = imported, 1 = a fetch or a transform failed.
 */
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.join(__dirname, '..', '..');
const OUT_DIR = path.join(ROOT, 'docs-site/imported-prose');
const LIBRARY_DIR = path.join(ROOT, 'library');

/**
 * The content repo, at a fixed commit.
 *
 * `cf873c1e` is LIB-007's first publish from CI (2026-09-11) and the tree every
 * measurement in this row was taken against. Bumping it is a deliberate act with
 * a re-run and a diff behind it, never a silent follow of `main`.
 */
const UPSTREAM_REPO = 'The-Low-Code-Foundation/nodegx-content';
const UPSTREAM_SHA = 'cf873c1e3e410abd20c498cd574f0bfb9ea257dc';
const RAW = `https://raw.githubusercontent.com/${UPSTREAM_REPO}/${UPSTREAM_SHA}/`;
const TREE_API = `https://api.github.com/repos/${UPSTREAM_REPO}/git/trees/${UPSTREAM_SHA}?recursive=1`;

const TYPES = ['modules', 'prefabs'] as const;

type Doc = { repoPath: string; text: string };

// ---------------------------------------------------------------------------
// The strips
// ---------------------------------------------------------------------------

/**
 * Components the old site rendered, and the imports that reach them.
 *
 * `ImportButton` (20 files) and `CopyToClipboardButton` (6) are the "copy this
 * JSON" affordances — they copy a graph you are meant to be *looking at* in the
 * screenshot beside them, so they go with the screenshots rather than despite
 * them. `ReactPlayer` (3) embeds video of the pre-refresh editor. `useBaseUrl`
 * (10) exists in these files only to resolve an image URL.
 */
const DEAD_COMPONENTS = ['ImportButton', 'CopyToClipboardButton', 'ReactPlayer', 'ModuleListing', 'PrefabListing', 'ProjectListing'];

/** Removes an `import … from '…'` line for any of the components above, and `useBaseUrl`. */
function stripImports(text: string): string {
  return text.replace(/^import\s+.*?from\s+['"][^'"]+['"];?\s*$/gm, (line) => {
    const named = DEAD_COMPONENTS.some((c) => new RegExp(`\\b${c}\\b`).test(line));
    return named || /useBaseUrl/.test(line) ? '' : line;
  });
}

/** Removes `<Comp … />`, and `<Comp …>…</Comp>` including whatever it wrapped. */
function stripComponents(text: string): string {
  let out = text;
  for (const c of DEAD_COMPONENTS) {
    out = out.replace(new RegExp(`<${c}\\b[^>]*/>`, 'g'), '');
    out = out.replace(new RegExp(`<${c}\\b[\\s\\S]*?</${c}>`, 'g'), '');
  }
  return out;
}

/**
 * Removes every image, in both syntaxes.
 *
 * ⚠️ A markdown image inside a link — `[![GitHub](shields.io/…)](https://…)` —
 * is a *badge*, and removing only the image leaves an empty link that renders as
 * nothing a person can see or click. The whole construct goes.
 */
function stripImages(text: string): string {
  return text
    .replace(/\[!\[[^\]]*\]\([^)]*\)\]\([^)]*\)/g, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/<img\b[^>]*\/?>/g, '');
}

/**
 * Unwraps the old site's layout divs, keeping what they wrapped.
 *
 * `ndl-image-with-background` wraps an image and is left holding nothing once
 * `stripImages` has run; `ndl-table-35-65` wraps a real table and must not take
 * it with it. Both are `className`-bearing JSX that would need MDX to parse, and
 * neither has a stylesheet on the new site.
 */
function unwrapNdlDivs(text: string): string {
  return text.replace(/<div class(?:Name)?="ndl-[^"]*">([\s\S]*?)<\/div>/g, (_m, inner) => inner);
}

/**
 * Removes embedded video.
 *
 * One `<iframe>` survives `stripComponents` because it is hand-written HTML
 * rather than `<ReactPlayer>`: a YouTube embed in `modules/markdown`. It shows
 * the pre-refresh editor like the rest of the 315 MP4s ALPHA-006 §4 judged, and
 * an iframe is also the one construct here that would load third-party script
 * into a docs page nobody asked to be tracked on.
 */
function stripIframes(text: string): string {
  return text.replace(/<iframe\b[\s\S]*?(?:\/>|<\/iframe>)/g, '');
}

/**
 * Turns the old site's port chips into this site's port style.
 *
 * `<span className="ndl-data">Index Axis</span>` (519 of them) and
 * `ndl-signal` (70) are how the old stylesheet drew a port name. There is no
 * such stylesheet here, so they would render as unstyled prose — and
 * `generate-node-docs.js`, which writes the 177 node pages these sit beside,
 * already spells a port as inline code. The data/signal distinction is not lost
 * with the class: every one of these sits in a table whose own column header
 * says which kind it is.
 */
function portChipsToCode(text: string): string {
  // ⚠️ Both spellings appear: `className` is the MDX form the bulk of these use,
  // and `class` is raw HTML left in `prefabs/filters` — which React does not
  // honour, so those eight had already lost their styling on the old site too.
  return text.replace(/<span class(?:Name)?="ndl-(?:data|signal)">([\s\S]*?)<\/span>/g, (_m, inner: string) => {
    const label = inner.trim().replace(/\s+/g, ' ');
    return label ? `\`${label}\`` : '';
  });
}

/** The bespoke `##head##` fetch protocol ALPHA-006 §1 retired. Inert here, and noise. */
function stripHeadMarkers(text: string): string {
  return text.replace(/\{\/\*\s*##head##\s*\*\/\}/g, '');
}

/**
 * Resolves the old site's `@include "./shared/_inputs.md"` directive by inlining.
 *
 * It is not MDX and nothing on the new site implements it, so an unresolved one
 * ships as literal text in the middle of a page. Docusaurus ignores an
 * underscore-prefixed file as a page, which is exactly why the partials were
 * written that way — inlining keeps that property without needing the directive.
 */
function inlineIncludes(text: string, repoPath: string, all: Map<string, string>): string {
  return text.replace(/^\s*@include\s+"([^"]+)"\s*$/gm, (_m, rel: string) => {
    const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(repoPath), rel));
    const partial = all.get(resolved);
    if (partial === undefined) {
      throw new Error(`${repoPath}: @include "${rel}" resolves to ${resolved}, which is not in the import set`);
    }
    return stripFrontmatter(partial).trim();
  });
}

function stripFrontmatter(text: string): string {
  return text.startsWith('---') ? text.replace(/^---\n[\s\S]*?\n---\n?/, '') : text;
}

function readFrontmatter(text: string): { title?: string; rest: string } {
  if (!text.startsWith('---')) return { rest: text };
  const m = text.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return { rest: text };
  const title = m[1].match(/^title:\s*(.+)$/m)?.[1]?.trim().replace(/^['"]|['"]$/g, '');
  return { title, rest: text.slice(m[0].length) };
}

/** Collapses the runs of blank lines every strip above leaves behind. */
function tidy(text: string): string {
  return text.replace(/[ \t]+$/gm, '').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

/**
 * One upstream file, as it should sit in this repo.
 *
 * The frontmatter is rewritten rather than carried: `hide_title: true` paired
 * with an `# H1` is the old site's convention and the new one has no rule that
 * needs it, while a `title` that has gone missing leaves Docusaurus naming the
 * page after its filename.
 */
export function transform(doc: Doc, all: Map<string, string>): string {
  const { title, rest } = readFrontmatter(doc.text);
  let body = rest;
  body = inlineIncludes(body, doc.repoPath, all);
  body = stripHeadMarkers(body);
  body = stripImports(body);
  body = stripComponents(body);
  body = stripImages(body);
  body = unwrapNdlDivs(body);
  body = stripIframes(body);
  body = portChipsToCode(body);
  body = tidy(body);

  const heading = body.match(/^#\s+(.+)$/m)?.[1]?.trim();
  const finalTitle = title ?? heading ?? path.basename(doc.repoPath).replace(/\.(mdx?)$/, '');
  // The H1 and the frontmatter title say the same thing twice on a Docusaurus
  // page, and the old site's `hide_title` is what used to hide one of them.
  if (heading && heading === finalTitle) body = body.replace(/^#\s+.+$\n*/m, '');

  return `---\ntitle: ${JSON.stringify(finalTitle)}\n---\n\n${tidy(body)}`;
}

// ---------------------------------------------------------------------------
// The import set
// ---------------------------------------------------------------------------

async function fetchJson(url: string): Promise<{ tree: { path: string; type: string }[] }> {
  const res = await fetch(url, { headers: { 'User-Agent': 'nodegx-import-library-prose' } });
  if (!res.ok) throw new Error(`${url} → ${res.status} ${res.statusText}`);
  return (await res.json()) as { tree: { path: string; type: string }[] };
}

async function fetchText(repoPath: string): Promise<string> {
  const res = await fetch(RAW + repoPath.split('/').map(encodeURIComponent).join('/'));
  if (!res.ok) throw new Error(`${repoPath} → ${res.status} ${res.statusText}`);
  return await res.text();
}

/** Entries whose prose is already authored in this repo — never fetched, never overwritten. */
function authoredHere(): Set<string> {
  const here = new Set<string>();
  for (const type of TYPES) {
    const dir = path.join(LIBRARY_DIR, type);
    if (!fs.existsSync(dir)) continue;
    for (const slug of fs.readdirSync(dir)) {
      if (fs.existsSync(path.join(dir, slug, 'README.md'))) here.add(`${type}/${slug}`);
    }
  }
  return here;
}

/** Every entry this repo builds, README or not — `library:build` publishes exactly these. */
function builtHere(): Set<string> {
  const built = new Set<string>();
  for (const type of TYPES) {
    const dir = path.join(LIBRARY_DIR, type);
    if (!fs.existsSync(dir)) continue;
    for (const slug of fs.readdirSync(dir)) {
      if (fs.existsSync(path.join(dir, slug, 'library.json'))) built.add(`${type}/${slug}`);
    }
  }
  return built;
}

/**
 * Entries in the **published** index that this repo no longer builds.
 *
 * 🔴 The live index is not this repo's output alone. `scripts/library/build.js`
 * tells its operator to *"copy its contents over the docs repo's `library/`
 * path"* — a copy, not a replace — so entries published before LIB-007's first
 * CI publish are still in `library/modules/index.json` today and are still
 * drawn as cards by every shipped editor. Measured against the live index
 * 2026-09-21: these eight have prose upstream, a row in the index, and no
 * directory here.
 *
 * ⚠️ Listed rather than derived, because deriving it needs the live index and an
 * import whose set depends on a network read is one that imports a different
 * thing on a bad day. A ninth legacy entry appearing is a deliberate edit here.
 */
const LEGACY_INDEX_ENTRIES = [
  'modules/chartjs',
  'modules/i18next',
  'modules/shake-detector',
  'modules/validation',
  'modules/webcamera',
  'prefabs/mailgun',
  'prefabs/sendgrid',
  'prefabs/toggle'
];

async function main() {
  const dry = process.argv.includes('--dry');
  const mine = authoredHere();
  // Upstream still carries prose for entries that left the index years ago —
  // importing on "it exists upstream" pulls 17 pages nothing can reach.
  const wantedEntries = new Set([...builtHere(), ...LEGACY_INDEX_ENTRIES]);

  const tree = await fetchJson(TREE_API);
  const markdown = tree.tree
    .filter((e) => e.type === 'blob' && /^library\/(modules|prefabs)\//.test(e.path) && /\.mdx?$/.test(e.path))
    .map((e) => e.path);

  // `library/<type>/<slug>/…` — the slug is the entry the prose documents.
  const wanted = markdown.filter((p) => {
    const [, type, slug] = p.split('/');
    if (!slug) return false;
    const key = `${type}/${slug}`;
    return wantedEntries.has(key) && !mine.has(key);
  });

  const texts = new Map<string, string>();
  await Promise.all(
    wanted.map(async (p) => {
      texts.set(p, await fetchText(p));
    })
  );

  const written: string[] = [];
  const failed: { path: string; err: string }[] = [];
  for (const repoPath of wanted) {
    // A partial is inlined into its caller; it is not a page of its own.
    if (path.basename(repoPath).startsWith('_')) continue;
    let out: string;
    try {
      out = transform({ repoPath, text: texts.get(repoPath)! }, texts);
    } catch (err) {
      failed.push({ path: repoPath, err: (err as Error).message });
      continue;
    }
    // library/modules/chartjs/charts/bar.md → <out>/modules/chartjs/charts/bar.md
    const dest = path.join(OUT_DIR, repoPath.replace(/^library\//, '').replace(/\.mdx$/, '.md'));
    written.push(path.relative(ROOT, dest));
    if (!dry) {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, out, 'utf8');
    }
  }

  if (!dry) {
    fs.writeFileSync(
      path.join(OUT_DIR, 'PROVENANCE.json'),
      JSON.stringify({ repo: UPSTREAM_REPO, sha: UPSTREAM_SHA, importedAt: new Date().toISOString().slice(0, 10), files: written.length }, null, 2) + '\n',
      'utf8'
    );
  }

  const entries = new Set(written.map((p) => p.split(path.sep).slice(2, 4).join('/')));
  console.log(`${dry ? 'would import' : 'imported'} ${written.length} files across ${entries.size} entries`);
  console.log(`  skipped ${mine.size} entries already authored in library/`);
  if (failed.length) {
    console.error(`\n🔴 ${failed.length} file(s) failed to transform:`);
    for (const f of failed) console.error(`   ${f.path}: ${f.err}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
