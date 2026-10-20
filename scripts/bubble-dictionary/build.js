#!/usr/bin/env node
/**
 * The Bubble → NodeGX dictionary page (`docs-site/docs/bubble-dictionary.md`), generated.
 *
 * Two halves. The EXAMPLES are not written by hand: `sample.bubble.json` (a real Bubble page cut down to six elements
 * and two workflows) is converted by the P123 converter, and each Bubble element is shown beside the nodes the
 * converter made from it — they share an id, `cmMfz` → `el_cmMfz`. The RULES are `rules.js`, written by hand.
 *
 * 🔴 The converter is read from git `HEAD`, not the working tree. It lives in a task folder another session may be
 * editing, and a page generated from somebody's unfinished converter would be committed under this one's name.
 * So a converter change shows here once it is committed: `--check` then reports the page stale.
 *
 * Every node type the page names is resolved against the node catalog and linked to its page in the node reference;
 * one the catalog does not have fails the build.
 *
 *   node scripts/bubble-dictionary/build.js           write the page
 *   node scripts/bubble-dictionary/build.js --check   fail if the committed page is stale
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const { slugify, escapeAngles } = require('../generate-node-docs');
const { sections } = require('./rules');

const ROOT = path.join(__dirname, '..', '..');
const OUT = path.join(ROOT, 'docs-site/docs/bubble-dictionary.md');
const SAMPLE = path.join(__dirname, 'sample.bubble.json');
const CONVERTER = 'dev-docs/tasks/phase-123-open-bubble/import/bubble2nodegx.mjs';
const CATALOG = path.join(ROOT, 'packages/noodl-types/src/node-catalog-enriched.json');

/**
 * The examples, in page order: the Bubble element's id in the sample, the NodeGX node ids the converter makes from
 * it, and what to notice. A note says only what the JSON beside it shows.
 */
const EXAMPLES = [
  {
    title: 'Page',
    bubble: 'bTIWz',
    nodes: ['page_bTIWz', 'root_bTIWz'],
    note: 'One Bubble page becomes two nodes. The Page holds the title and the URL (the `index` page gets `""`). The Group under it lays the page out: the page\'s `container_layout`, minimum height and background colour.'
  },
  {
    title: 'Group',
    bubble: 'cmMsV',
    nodes: ['el_cmMsV'],
    note: 'A row. `container_layout: "row"` becomes `flexDirection: "row"`, `fit_height` becomes `sizeMode: "contentHeight"`, and the margins carry over in px. Its two children are the next two examples.'
  },
  {
    title: 'Material icon (plugin element)',
    bubble: 'cmMsY',
    nodes: ['el_cmMsY', 'icon_cmMsY'],
    note: 'A Group sized like the Bubble element, holding the icon itself. The icon names Material Icons\' `check` glyph, and the project links the Material Icons font for it.'
  },
  {
    title: 'Text',
    bubble: 'cmMsb',
    nodes: ['el_cmMsb'],
    note: 'The text comes out of its `TextExpression`. `font_face: "Inter:::regular"` becomes `fontFamily` and `fontWeight`, and the project links Inter from Google Fonts.'
  },
  {
    title: 'Fonts and icon fonts',
    settings: 'headCode',
    note: 'NodeGX does not load a web font by itself, and Bubble does. So the project\'s head code gets one Google Fonts link carrying every family and weight the page uses, and Material Icons when an icon needs it. This is the project setting made for this sample.'
  },
  {
    title: 'Button',
    bubble: 'cmMfz',
    nodes: ['el_cmMfz'],
    note: 'The *This element is hovered* condition becomes the button\'s `hover` state. Bubble\'s 200 ms fade on that change is the element\'s own `transitions`, which are not carried yet.'
  },
  {
    title: 'Image',
    bubble: 'cmMfn',
    nodes: ['el_cmMfn'],
    variant: 'Image_simple_image_',
    note: 'The protocol-relative `src` gains `https:`. The fixed width (50) and the 10:11 aspect ratio give the height (55). The element wears the style it wore in Bubble, as a variant.'
  },
  {
    title: 'Link',
    bubble: 'cmMwK',
    nodes: ['el_cmMwK'],
    note: 'A Text with the link\'s words and its hover colour. This Link goes to a URL, which is not wired yet; a Link to a page also gets a Router Navigate on its click.'
  },
  {
    title: 'Shape',
    bubble: 'cmMpD',
    nodes: ['el_cmMpD'],
    note: 'A Group with the shape\'s colour, size and rounded corners.'
  },
  {
    title: 'Floating group',
    bubble: 'cmMwz',
    nodes: ['el_cmMwz'],
    note: 'A Group with the same shadow and corners, unmounted (`mounted: false`) because it starts hidden. It does not float yet: Bubble pins a Floating Group to the window, and this Group scrolls with the page. Its children are left out of this sample.'
  }
];

const WORKFLOW_NODES = ['act_cmMwo', 'ev_cmMvZ', 'ac_1', 'ex_2', 'act_cmMvf'];

function convert() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bubble-dictionary-'));
  try {
    const converter = path.join(tmp, 'bubble2nodegx.mjs');
    fs.writeFileSync(converter, execFileSync('git', ['show', `HEAD:${CONVERTER}`], { cwd: ROOT, maxBuffer: 1 << 26 }));
    const out = path.join(tmp, 'project');
    execFileSync(process.execPath, [converter, SAMPLE, out], { cwd: tmp, stdio: 'pipe' });
    const page = path.join(out, 'components/Pages/index');
    return {
      nodes: JSON.parse(fs.readFileSync(path.join(page, 'nodes.json'), 'utf8')).nodes,
      connections: JSON.parse(fs.readFileSync(path.join(page, 'connections.json'), 'utf8')).connections,
      variants: JSON.parse(fs.readFileSync(path.join(out, 'nodegx.styles.json'), 'utf8')).variants,
      settings: JSON.parse(fs.readFileSync(path.join(out, 'nodegx.project.json'), 'utf8')).settings || {}
    };
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

/** typeName → { name, link } from the catalog, with the node reference's own slugs (generate-node-docs.js). */
function nodeIndex() {
  const catalog = JSON.parse(fs.readFileSync(CATALOG, 'utf8'));
  const index = new Map();
  for (const n of catalog.nodes) {
    index.set(n.typeName, {
      name: n.displayName || n.typeName,
      link: `./nodes/${slugify(n.category || 'uncategorised')}/${slugify(n.typeName)}.md`
    });
  }
  return index;
}

function main() {
  const check = process.argv.includes('--check');
  const sample = JSON.parse(fs.readFileSync(SAMPLE, 'utf8'));
  const page = sample.pages.index;
  const converted = convert();
  const index = nodeIndex();
  const missing = new Set();

  const nodeLink = (typeName) => {
    const hit = index.get(typeName);
    if (!hit) {
      missing.add(typeName);
      return `\`${typeName}\``;
    }
    return `[${hit.name}](${hit.link})`;
  };
  const withLinks = (text) => escapeAngles(text).replace(/\{\{([^}]+)\}\}/g, (_m, t) => nodeLink(t));

  const findBubble = (id) => {
    if (id === page.id) {
      const { elements, workflows, ...rest } = page;
      return { ...rest, elements: '(the elements below)', workflows: '(the workflows below)' };
    }
    const walk = (els) => {
      for (const e of Object.values(els || {})) {
        if (!e || typeof e !== 'object') continue;
        if (e.id === id) return e;
        const hit = walk(e.elements);
        if (hit) return hit;
      }
      return null;
    };
    const el = walk(page.elements);
    if (!el) throw new Error(`bubble-dictionary: no Bubble element ${id} in the sample`);
    if (!el.elements) return el;
    const kids = Object.fromEntries(
      Object.entries(el.elements).map(([k, c]) => [k, `(${c.default_name || c.type}, below)`])
    );
    return { ...el, elements: kids };
  };

  const nodeById = new Map(converted.nodes.map((n) => [n.id, n]));
  const shown = (id) => {
    const n = nodeById.get(id);
    if (!n) throw new Error(`bubble-dictionary: the converter made no node ${id}`);
    const out = {};
    for (const k of ['id', 'type', 'label', 'parent', 'variant', 'parameters', 'stateParameters', 'children']) {
      if (n[k] !== undefined) out[k] = n[k];
    }
    return out;
  };
  const json = (value) => {
    const text = JSON.stringify(value, null, 2);
    if (text.includes('```')) throw new Error('bubble-dictionary: a JSON block contains a triple backtick');
    return '```json\n' + text + '\n```';
  };
  const typesOf = (ids) => [...new Set(ids.map((id) => nodeById.get(id).type))].map(nodeLink).join(', ');

  const out = [];
  out.push('---');
  out.push('title: Bubble to NodeGX dictionary');
  out.push('sidebar_position: 7');
  out.push("description: What each Bubble element, style and workflow looks like in a Bubble export, and what it is in NodeGX.");
  out.push('---');
  out.push('');
  out.push('<!-- Generated by scripts/bubble-dictionary/build.js from sample.bubble.json and rules.js. Do not edit this file. -->');
  out.push('');
  out.push(
    'A Bubble app is stored as JSON: a tree of elements, each with a `type` and its `properties`, and workflows made of actions. ' +
      'A NodeGX app is JSON too: components made of nodes, each with a `type` and its `parameters`, joined by connections. ' +
      'This page puts the two side by side, one Bubble element at a time.'
  );
  out.push('');
  out.push(
    'The examples are real. The Bubble side is cut from the export of a Bubble landing page; the only edits are a placeholder image URL, ' +
      'and a scroll target moved to an element that is kept. The NodeGX side is what the rules below make from it, ' +
      'regenerated with the page whenever the rules change.'
  );
  out.push('');
  out.push(
    'For Bubble\'s operators one by one (`:count`, `:formatted as`, `:filtered`), see [Coming from Bubble](./coming-from-bubble.md). ' +
      'This page covers everything around them: elements, layout, styles, workflows and data.'
  );
  out.push('');
  out.push('## Elements, one example each {#examples}');
  out.push('');
  out.push(
    'Each example shows the element as it appears in the Bubble export, then the NodeGX nodes it becomes. The NodeGX node keeps the Bubble id: ' +
      '`cmMfz` becomes `el_cmMfz`. Canvas positions are left out.'
  );
  out.push('');

  for (const ex of EXAMPLES) {
    out.push(`### ${ex.title}`);
    out.push('');
    out.push(`${withLinks(ex.note)}`);
    out.push('');
    if (ex.settings) {
      const value = converted.settings[ex.settings];
      if (value === undefined) throw new Error(`bubble-dictionary: the converter wrote no settings.${ex.settings}`);
      out.push(`**NodeGX** (\`nodegx.project.json\`)`);
      out.push('');
      out.push(json({ settings: { [ex.settings]: value } }));
      out.push('');
      continue;
    }
    out.push('**Bubble**');
    out.push('');
    out.push(json(findBubble(ex.bubble)));
    out.push('');
    out.push(`**NodeGX**: ${typesOf(ex.nodes)}`);
    out.push('');
    out.push(json(ex.nodes.length === 1 ? shown(ex.nodes[0]) : ex.nodes.map(shown)));
    out.push('');
    if (ex.variant) {
      const v = converted.variants.find((x) => x.name === ex.variant);
      if (!v) throw new Error(`bubble-dictionary: the converter made no variant ${ex.variant}`);
      out.push(`The style \`${ex.variant}\`, as a variant in \`nodegx.styles.json\`:`);
      out.push('');
      out.push(json(v));
      out.push('');
    }
  }

  out.push('## A workflow {#workflow}');
  out.push('');
  out.push(
    'Two Bubble workflows from the same page. Clicking Button B triggers the custom event *Scroll To* with the text `"benefit"`; ' +
      'the event scrolls to Group BZ only when its text is `"benefit"`.'
  );
  out.push('');
  out.push('**Bubble**');
  out.push('');
  out.push(json(Object.values(page.workflows)));
  out.push('');
  out.push(`**NodeGX**: ${typesOf(WORKFLOW_NODES)}`);
  out.push('');
  out.push(json(WORKFLOW_NODES.map(shown)));
  out.push('');
  const wfIds = new Set([...WORKFLOW_NODES, 'el_cmMfz', 'el_cmMsV']);
  const label = (id) => `\`${id}\` (${escapeAngles(nodeById.get(id).label)})`;
  const wires = converted.connections.filter((c) => wfIds.has(c.fromId) && wfIds.has(c.toId));
  out.push('And the connections that make it run, in order:');
  out.push('');
  out.push('| From | Output | To | Input |');
  out.push('|---|---|---|---|');
  for (const c of wires) {
    out.push(`| ${label(c.fromId)} | \`${c.fromProperty}\` | ${label(c.toId)} | \`${c.toProperty}\` |`);
  }
  out.push('');

  out.push('## The rules {#rules}');
  out.push('');
  out.push(
    'Everything the dictionary knows, including what the example page does not use. A row marked *not in the dictionary yet* ' +
      'is a Bubble feature with no NodeGX answer so far. It is listed so you know.'
  );
  out.push('');
  for (const section of sections) {
    out.push(`### ${section.title} {#${section.id}}`);
    out.push('');
    if (section.blurb) {
      out.push(withLinks(section.blurb));
      out.push('');
    }
    out.push('| Bubble | NodeGX | Notes |');
    out.push('|---|---|---|');
    for (const row of section.rows) {
      const cell = (t) => withLinks(t || '').replace(/\|/g, '\\|');
      out.push(`| ${cell(row.bubble)} | ${cell(row.nodegx)} | ${cell(row.how)} |`);
    }
    out.push('');
  }

  if (missing.size) {
    console.error(`bubble-dictionary: node type(s) not in the catalog: ${[...missing].join(', ')}`);
    process.exit(1);
  }

  const content = out.join('\n');
  if (check) {
    const onDisk = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : null;
    if (onDisk !== content) {
      console.error('docs:bubble-dictionary:check — stale. Run `npm run docs:bubble-dictionary` and commit the result.');
      process.exit(1);
    }
    console.log('docs:bubble-dictionary:check — clean.');
    return;
  }
  fs.writeFileSync(OUT, content);
  console.log(`docs:bubble-dictionary — wrote ${path.relative(ROOT, OUT)}: ${EXAMPLES.length} examples, ${sections.reduce((n, s) => n + s.rows.length, 0)} rules.`);
}

main();
