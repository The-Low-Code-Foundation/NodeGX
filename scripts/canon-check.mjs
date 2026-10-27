#!/usr/bin/env node
/**
 * P128 S3 (CPY-004) — every place that explains NodeGX quotes `docs/CANON.md`, and this fails when a quote drifts.
 *
 * A quoting place puts `<!-- canon: <heading> -->` above its quote. The quoted block is the lines after the marker
 * up to the next blank line, and it must be a run of that canon section, word for word. Line wrapping, Markdown
 * emphasis, backticks, HTML tags and curly quotes are not words, so they are compared away; every word is not.
 *
 * `PLACES` is the register: each place and the headings it must carry. A place that loses a marker fails as surely as
 * one whose quote drifted. A line that is made of canon phrases rather than one run of a section (the editor's welcome,
 * in JSX, where a marker comment would not survive) registers the phrases instead: each must be a run of its section
 * and must still be in the file. Two kinds of place:
 *   - a file on disk (the READMEs; nodegx.io's pages are passed as arguments, below);
 *   - a renderer (the seeded `CLAUDE.md` / `AGENTS.md`): the TypeScript that writes it is bundled with esbuild and run,
 *     so the check reads the text a new project gets, not the source that builds it. That text comes from the pinned
 *     copy (`packages/noodl-editor/src/editor/src/models/canon.ts`, written by `packages/noodl-mcp/scripts/pin-canon.mjs`),
 *     so the pin is checked too: every pinned section must equal the canon's.
 *
 *   node scripts/canon-check.mjs                       # the register
 *   node scripts/canon-check.mjs <file.html|.md> ...   # the register, and these files' markers (nodegx.io: CPY-001)
 *   node scripts/canon-check.mjs --canon=<copy.md>     # read a changed copy of the canon: prove the check fails
 *
 * A canon change is made in `docs/CANON.md` first; then `node packages/noodl-mcp/scripts/pin-canon.mjs`, then each
 * place this names.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const canonArg = args.find((a) => a.startsWith('--canon='));
const CANON_PATH = canonArg ? path.resolve(canonArg.slice('--canon='.length)) : path.join(repo, 'docs/CANON.md');
const PIN = 'packages/noodl-editor/src/editor/src/models/canon.ts';
const SEED = 'packages/noodl-editor/src/editor/src/models/template/agentConfig.ts';

const FOR = 'What NodeGX is for';
const RULES = 'For the agent (the rules, not copy)';
const WIRING = 'The wiring underneath';
const WHICH = 'Which AI coder';
const WAYS = 'Three ways to touch your app';

/** The register: place → the canon headings it quotes. */
const PLACES = [
  { place: 'README.md', headings: [FOR] },
  { place: 'packages/noodl-mcp/README.md', headings: [FOR] },
  { place: 'packages/create-nodegx/README.md', headings: [FOR] },
  {
    place: 'packages/noodl-core-ui/src/preview/launcher/Launcher/components/ConnectAgentCard/ConnectAgentCard.tsx',
    headings: [],
    phrases: [
      [FOR, 'an open-source editor for pages, elements, workflows and data'],
      [WAYS, 'changes you make yourself'],
      [WHICH, 'Studio in a browser window beside the chat']
    ]
  },
  { place: `${SEED} → CLAUDE.md`, render: 'renderClaudeMd', headings: [RULES, WIRING] },
  { place: `${SEED} → AGENTS.md`, render: 'renderAgentsMd', headings: [RULES, WIRING] }
];

/** `## heading` → its body, trimmed. The same reading as pin-canon.mjs. */
function canonSections(text) {
  const out = {};
  for (const block of text.split(/^## /m).slice(1)) {
    const nl = block.indexOf('\n');
    out[block.slice(0, nl).trim()] = block.slice(nl + 1).trim();
  }
  return out;
}

const ENTITIES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  rsquo: "'",
  lsquo: "'",
  rdquo: '"',
  ldquo: '"',
  mdash: '—',
  ndash: '–',
  hellip: '…'
};

/** The words, and nothing that only dresses them. */
function words(s) {
  return s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(#\d+|[a-z]+);/gi, (m, e) =>
      e[0] === '#' ? String.fromCodePoint(Number(e.slice(1))) : ENTITIES[e.toLowerCase()] ?? m
    )
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[*`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Every `<!-- canon: h -->` quote in `text`: the heading and the block under it. */
function quotes(text) {
  return [...text.matchAll(/<!-- canon: (.+?) -->[ \t]*\r?\n([\s\S]*?)(?=\r?\n[ \t]*\r?\n|$)/g)].map((m) => ({
    heading: m[1].trim(),
    block: m[2]
  }));
}

/** Where `quote` stops being the canon: the first words of it that are not a run of `section`. */
function driftAt(quote, section) {
  const w = quote.split(' ');
  let n = 0;
  while (n < w.length && section.includes(w.slice(0, n + 1).join(' '))) n++;
  return w.slice(Math.max(0, n - 3), n + 4).join(' ');
}

const canon = canonSections(fs.readFileSync(CANON_PATH, 'utf8'));
const failures = [];
const passed = [];

function checkText(place, text, required) {
  const found = quotes(text);
  for (const h of required) {
    if (!found.some((q) => q.heading === h))
      failures.push(`${place}: no quote of "${h}" (the marker <!-- canon: ${h} --> is gone)`);
  }
  for (const { heading, block } of found) {
    if (!(heading in canon)) {
      failures.push(`${place}: quotes "${heading}", and docs/CANON.md has no such section`);
      continue;
    }
    const q = words(block);
    if (!q) failures.push(`${place}: the "${heading}" marker has nothing under it`);
    else if (!words(canon[heading]).includes(q))
      failures.push(`${place}: "${heading}" has drifted from the canon at: …${driftAt(q, words(canon[heading]))}…`);
    else passed.push(`${place}: ${heading}`);
  }
}

/** Bundle a TypeScript module with esbuild and import it. */
async function load(rel) {
  const esbuild = await import('esbuild');
  const out = await esbuild.build({
    entryPoints: [path.join(repo, rel)],
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'node',
    logLevel: 'silent'
  });
  return import(`data:text/javascript;base64,${Buffer.from(out.outputFiles[0].text).toString('base64')}`);
}

// The pin: what the agent's `surfaces` section and the seed quote at run time.
const { CANON: pinned } = await load(PIN);
for (const [h, body] of Object.entries(pinned)) {
  if (!(h in canon)) failures.push(`${PIN}: pins "${h}", and docs/CANON.md has no such section`);
  else if (body !== canon[h])
    failures.push(
      `${PIN}: "${h}" differs from docs/CANON.md at: …${driftAt(
        words(body),
        words(canon[h])
      )}… (run node packages/noodl-mcp/scripts/pin-canon.mjs)`
    );
  else passed.push(`${PIN}: ${h}`);
}

const seed = await load(SEED);
const seedOptions = {
  projectName: 'Canon check',
  serverName: 'nodegx-canon-check',
  hasDocs: true,
  registration: { type: 'stdio', command: 'node', args: ['/x/noodl-mcp.cjs'], env: {} }
};
for (const { place, render, headings, phrases = [] } of PLACES) {
  const text = render ? seed[render](seedOptions) : fs.readFileSync(path.join(repo, place), 'utf8');
  checkText(place, text, headings);
  for (const [heading, phrase] of phrases) {
    if (!(heading in canon) || !words(canon[heading]).includes(phrase))
      failures.push(`${place}: the phrase "${phrase}" is no longer in the canon's "${heading}"`);
    else if (!words(text).includes(phrase))
      failures.push(`${place}: the phrase "${phrase}" (canon "${heading}") is gone from the file`);
    else passed.push(`${place}: ${heading}, "${phrase}"`);
  }
}

for (const arg of args.filter((a) => a !== canonArg)) {
  const file = path.resolve(arg);
  checkText(path.relative(process.cwd(), file) || file, fs.readFileSync(file, 'utf8'), []);
}

for (const p of passed) console.log(`  ok  ${p}`);
if (failures.length) {
  for (const f of failures) console.error(`FAIL  ${f}`);
  console.error(
    `\ncanon-check: ${failures.length} quoting place(s) no longer say what docs/CANON.md says. Change the canon first, then the place.`
  );
  process.exit(1);
}
console.log(`\ncanon-check: ${passed.length} quotes, every one word for word from docs/CANON.md.`);
