#!/usr/bin/env node
/**
 * THE PUBLIC DEMO, DERIVED FROM THE TEMPLATE (TASK-L180).
 *
 *   node tools/build-demo.mjs            writes templates/digital-bricks-training-demo/
 *   node tools/build-demo.mjs --stdout   lists what it would write, writes nothing
 *
 * The demo is this template with its backend taken out, so it runs on a web page
 * with no server and no account (OpenNoodl TPL-008's ruling R9: "a browser-only
 * demo mode — not a public backend on nexus-1"). It is DERIVED, NEVER WRITTEN
 * TWICE: every file is the template's, byte for byte, except a NAMED LIST of
 * changes below, and tools/check-demo.mjs fails on anything else. Change the
 * template and regenerate, and the demo follows.
 *
 * THE NAMED LIST, and nothing else:
 *   - the four CloudFunction2 nodes (Data/Programme pr_own + pr_about,
 *     Data/Lesson le_call, Data/Roster ro_call) become JavaScriptFunctions AT
 *     THE SAME ID, holding the fixture the function is proven to return (L170)
 *     and answering `rows` exactly as it does — `[]` where the backend refuses
 *     (a learner who is not Sam, a concept with no written lesson). Their
 *     `call` wire becomes `run`. The three "a refusal is nothing" nodes go:
 *     nothing here can fail.
 *   - the programme and the roster pass through demoFresh (tools/lib/
 *     demo-clock.mjs), so the world is always seen from the fixture's own
 *     distance. The lesson carries no dates and is served as stored.
 *   - App loses its sign-in gate; Home loses its User and Log Out nodes, and its
 *     two doors go straight to /Pages/Course and /Pages/People.
 *   - Pages/Sign in and __cloud__/ are not copied; the router loses the Sign in
 *     route; the registry follows.
 *   - Home gains a THIRD door, straight to the one written lesson (the same
 *     page and `?concept=` the dossier dialog's link uses) — three nodes, two
 *     wires, one string.
 *   - four Home strings: the three doors' labels and the note under them.
 *   - the project: its own name and id, no cloudservices, and HASH navigation —
 *     nodegx.io serves template folders with a plain file_server and no
 *     fallback, so a reload of /templates/<x>/course is a 404 (measured on
 *     /templates/planning/week). A hash URL never leaves index.html.
 *   - docs/ is one generated START-HERE. tools/, backend/ and the security file
 *     are not copied: a demo has no backend to set up.
 *
 * noodl_modules is NOT copied (the kits are the template's and are MBs): the
 * publish composes demo + the template's noodl_modules, as TPL-008's recipe does.
 *
 * Written at indent 2 with no trailing newline — this project's on-disk format
 * (sprint 46: indent 1 reindents every line and buries the diff).
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CLOCK_SOURCE } from './lib/demo-clock.mjs';
import { fixture } from './lib/fixtures.mjs';

export const TEMPLATE = join(dirname(fileURLToPath(import.meta.url)), '..');
export const DEMO = join(TEMPLATE, '..', 'digital-bricks-training-demo');

/** Components the demo does not carry, as path prefixes under components/. */
export const DROPPED_COMPONENTS = ['__cloud__/', 'Pages/Sign in/'];
/** Components whose files the demo changes. Every other file is byte-identical. */
export const CHANGED_COMPONENTS = ['App', 'Pages/Home', 'Data/Programme', 'Data/Lesson', 'Data/Roster', 'Data/Strings'];
/** Node ids removed, per component. */
export const REMOVED_NODES = {
  App: ['app_user', 'app_gate', 'app_to_signin', 'app_to_home'],
  'Pages/Home': ['hm_user', 'hm_logout'],
  'Data/Programme': ['pr_refused'],
  'Data/Lesson': ['le_refused'],
  'Data/Roster': ['ro_refused'],
};
/** Node ids whose content changes (same id, same place in the graph). */
export const REWRITTEN_NODES = {
  App: ['app_router'],
  'Pages/Home': ['hm_actions', 'hm_go', 'hm_go_people'],
  'Data/Programme': ['pr_own', 'pr_about'],
  'Data/Lesson': ['le_call'],
  'Data/Roster': ['ro_call'],
  'Data/Strings': ['str_graph'],
};

/** Node ids the demo ADDS, per component: Home's third door. */
export const ADDED_NODES = { 'Pages/Home': ['hm_demo_lesson', 'hm_go_lesson', 't_hm_demo_lesson'] };

/*
 * THE THIRD DOOR. The template reaches its one written lesson only through the
 * dossier dialog's link (START-HERE, "Only work on this app's one lesson is a
 * link"), which is right for an app and too far for a visitor who came to see
 * what a lesson looks like. So the demo's Home opens it directly — the same
 * page and the same `?concept=` the dialog's link uses, nothing new behind it.
 */
const LESSON_CONCEPT = fixture('lesson')[0].conceptId;

export const HOME_STRINGS = {
  openCourse: 'Look as the learner',
  demoLesson: "Read the learner's first lesson",
  coachView: 'Look as their trainer',
  demoNote:
    'This is a demonstration with made-up people, and it runs entirely in your browser: nothing you do is sent anywhere or saved. ' +
    'Its dates follow today, so whenever you open it, the programme is happening this week.',
};

const json = (v) => JSON.stringify(v, null, 2);
const read = (p) => JSON.parse(readFileSync(p, 'utf8'));

/** A fixture as a JS literal that cannot close the page's inline script (D75). */
function embed(value) {
  return JSON.stringify(value).replace(/<\//g, '<\\/');
}

function responder({ id, label, x, y, input, body, fixtureName }) {
  const header = [
    '/*',
    ' * GENERATED by tools/build-demo.mjs (TASK-L180) — do not edit by hand.',
    ' *',
    ` * Stands where the template's backend function stands, and answers what it`,
    ' * answers — from the fixture that function is proven to return (L170). Nothing',
    ' * leaves this browser.',
    ' */',
  ].join('\n');
  const script = `${header}\n${CLOCK_SOURCE}var FIXTURE = /*FIXTURE-BEGIN*/${embed(fixture(fixtureName))}/*FIXTURE-END*/;\n${body}\n`;
  const ports = [];
  if (input) ports.push({ name: `in-${input}`, displayName: input, plug: 'input', type: '*', group: 'Inputs' });
  ports.push({ name: 'out-rows', displayName: 'rows', plug: 'output', type: '*', group: 'Outputs' });
  return {
    id,
    type: 'JavaScriptFunction',
    label,
    x,
    y,
    parameters: { functionScript: script },
    metadata: { comment: `Demo stand-in for the backend (TASK-L180). The fixture is backend/fixtures/${fixtureName}.json in the template.` },
    ports,
  };
}

const RESPONDERS = {
  pr_own: {
    label: 'course — answered in the browser (demo)',
    fixtureName: 'programme',
    body: "/* The learner's own programme: Sam's, moved to today. */\nOutputs.rows = demoFresh(FIXTURE, Date.now());",
  },
  pr_about: {
    label: 'learnerProgramme — answered in the browser (demo)',
    fixtureName: 'programme',
    input: 'learnerId',
    body:
      "/* A coach reading one learner. The demo holds one programme, Sam's; anybody else\n" +
      ' * gets what the backend gives a learner with none: no rows. */\n' +
      "var id = String(Inputs.learnerId || '');\n" +
      'if (!id) return;\n' +
      'Outputs.rows = id === FIXTURE[0].learnerId ? demoFresh(FIXTURE, Date.now()) : [];',
  },
  le_call: {
    label: 'lesson — answered in the browser (demo)',
    fixtureName: 'lesson',
    input: 'conceptId',
    body:
      '/* One written lesson per step the learner has reached (TASK-L181). A lesson carries\n' +
      ' * no dates, so it is served as stored; any other concept is "not written yet",\n' +
      " * which is the backend's answer too — one lesson, the one asked for, or none. */\n" +
      "var concept = String(Inputs.conceptId || '');\n" +
      'if (!concept) return;\n' +
      'Outputs.rows = FIXTURE.filter(function (l) { return l.conceptId === concept; });',
  },
  ro_call: {
    label: 'roster — answered in the browser (demo)',
    fixtureName: 'roster',
    body: "/* The coach's people, moved to today. */\nOutputs.rows = demoFresh(FIXTURE, Date.now());",
  },
};

function transformNodes(component, doc) {
  const removed = new Set(REMOVED_NODES[component] || []);
  const nodes = [];
  for (const node of doc.nodes) {
    if (removed.has(node.id)) continue;
    if (RESPONDERS[node.id]) {
      if (node.type !== 'CloudFunction2') throw new Error(`build-demo: ${component}/${node.id} is ${node.type}, expected CloudFunction2`);
      nodes.push(responder({ id: node.id, x: node.x, y: node.y, ...RESPONDERS[node.id] }));
      continue;
    }
    if (node.id === 'app_router') {
      const routes = node.parameters.pages.routes;
      if (!routes.includes('/Pages/Sign in')) throw new Error('build-demo: the router no longer lists /Pages/Sign in');
      node.parameters.pages.routes = routes.filter((r) => r !== '/Pages/Sign in');
    }
    if (node.id === 'hm_go' || node.id === 'hm_go_people') {
      if (node.parameters.target !== '/Pages/Sign in') throw new Error(`build-demo: ${node.id} no longer goes to Sign in`);
      node.parameters.target = node.id === 'hm_go' ? '/Pages/Course' : '/Pages/People';
      delete node.parameters['pm-email'];
    }
    if (node.id === 'str_graph') {
      const text = node.parameters.json;
      const data = JSON.parse(text);
      if (json(data) !== text) throw new Error('build-demo: str_graph json is not in indent-2 form; the overlay would reformat it');
      const home = (Array.isArray(data) ? data[0] : data).home;
      for (const [k, v] of Object.entries(HOME_STRINGS)) {
        if (k === 'demoLesson') {
          if (k in home) throw new Error('build-demo: home.demoLesson already exists in the template');
        } else if (typeof home[k] !== 'string') throw new Error(`build-demo: home.${k} is missing from Data/Strings`);
        home[k] = v;
      }
      node.parameters.json = json(data);
    }
    if (node.id === 'hm_actions') {
      const at = node.children.indexOf('hm_coach');
      if (at === -1) throw new Error('build-demo: hm_actions no longer holds hm_coach');
      node.children.splice(at + 1, 0, 'hm_demo_lesson');
    }
    nodes.push(node);
    if (node.id === 'hm_coach') {
      nodes.push({
        id: 'hm_demo_lesson', type: 'net.noodl.controls.button', label: 'A lesson (demo)', x: node.x, y: node.y + 60, parent: 'hm_actions',
        parameters: { ...node.parameters },
        metadata: { comment: 'Demo only (TASK-L180): the one written lesson, one press from the front door.' },
      });
    }
    if (node.id === 'hm_go_people') {
      nodes.push({
        id: 'hm_go_lesson', type: 'RouterNavigate', label: '→ the written lesson (demo)', x: node.x, y: node.y + 60,
        parameters: { router: 'Main', target: '/Pages/Lesson', 'pm-concept': LESSON_CONCEPT },
      });
    }
    if (node.id === 't_hm_coach') {
      nodes.push({ id: 't_hm_demo_lesson', type: 'Translation', label: 'home:demoLesson', x: node.x, y: node.y + 60, parameters: { Key: 'demoLesson', Namespace: 'home' } });
    }
  }
  for (const id of removed) {
    if (!doc.nodes.some((n) => n.id === id)) throw new Error(`build-demo: ${component} has no node ${id} to remove`);
  }
  return { ...doc, nodes };
}

function transformConnections(component, doc, nodeIds) {
  const connections = [];
  for (const c of doc.connections) {
    if (!nodeIds.has(c.fromId) || !nodeIds.has(c.toId)) continue;
    if (RESPONDERS[c.fromId] && c.fromProperty === 'failure') continue;
    if (RESPONDERS[c.toId] && c.toProperty === 'call') {
      connections.push({ ...c, toProperty: 'run' });
      continue;
    }
    connections.push(c);
  }
  if (component === 'Pages/Home') {
    connections.push(
      { fromId: 'hm_demo_lesson', fromProperty: 'onClick', toId: 'hm_go_lesson', toProperty: 'navigate' },
      { fromId: 't_hm_demo_lesson', fromProperty: 'Translation', toId: 'hm_demo_lesson', toProperty: 'label' },
    );
  }
  return { ...doc, connections };
}

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir).sort()) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

function demoId(templateId) {
  const h = createHash('sha1').update(`${templateId}:demo`).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

const START_HERE = `# Digital Bricks Training — demo

The **Digital Bricks Training** template with its backend taken out, so it runs on a web page with
no server and no account: <https://nodegx.io/templates/digital-bricks-training/>.

🔴 **Generated — do not edit it by hand.** \`node tools/build-demo.mjs\` in the template writes it,
and \`node tools/check-demo.mjs\` fails on any difference the generator did not make. Change the
template and regenerate, and the demo follows (TASK-L180).

## What is different from the template

- **The four backend calls answer in the browser.** \`Data/Programme\`, \`Data/Lesson\` and
  \`Data/Roster\` hold the template's fixtures (\`backend/fixtures/\`) in Function nodes at the same
  ids the Cloud Functions had, and answer the same \`rows\`. Somebody other than Sam has no
  programme, and a concept other than the one written lesson is *not written yet*, exactly as the
  backend says.
- **It is always happening now.** Every date in the programme and the roster moves forward by the
  whole number of days between 22 September 2026 at 12:00 UTC (the fixture's instant) and the
  moment you open it, and the two months named in prose move with them. What is done is still
  done, what is ahead is still ahead, and the pace tracker is drawn against today.
- **There is no sign in.** Home's two doors open the learner's course and the coach's people.
  Nothing writes, nothing is saved, and nothing leaves the browser.
- **Hash URLs** (\`#/course\`), so a reload works on a static host with no fallback.

To run it with a real backend, magic-link sign-in and the coach's gate, start from the
**Digital Bricks Training** template.
`;

/** Everything the demo holds, as relative path → file contents (Buffer or string). */
export function generate() {
  const files = new Map();
  const project = read(join(TEMPLATE, 'nodegx.project.json'));
  project.name = 'Digital Bricks Training demo';
  project.id = demoId(project.id);
  project.settings.navigationPathType = 'hash';
  if (!project.metadata.cloudservices) throw new Error('build-demo: the template has no cloudservices to remove');
  delete project.metadata.cloudservices;
  files.set('nodegx.project.json', json(project));
  files.set('docs/START-HERE.md', START_HERE);

  const componentsDir = join(TEMPLATE, 'components');
  const counts = {};
  for (const file of walk(componentsDir)) {
    const rel = relative(componentsDir, file);
    if (DROPPED_COMPONENTS.some((d) => rel.startsWith(d))) continue;
    if (rel === '_registry.json') continue;
    const component = dirname(rel);
    const base = rel.slice(component.length + 1);
    if (!CHANGED_COMPONENTS.includes(component)) {
      files.set(`components/${rel}`, readFileSync(file));
      continue;
    }
    if (base === 'nodes.json') {
      const nodes = transformNodes(component, read(file));
      const ids = new Set(nodes.nodes.map((n) => n.id));
      const connections = transformConnections(component, read(join(componentsDir, component, 'connections.json')), ids);
      files.set(`components/${component}/nodes.json`, json(nodes));
      files.set(`components/${component}/connections.json`, json(connections));
      counts[component] = { nodeCount: nodes.nodes.length, connectionCount: connections.connections.length };
    } else if (base === 'connections.json') {
      continue; // written with nodes.json, which decides which ids survive
    } else if (base === 'component.json' && component.startsWith('Data/') && component !== 'Data/Strings') {
      const meta = read(file);
      meta.description = `DEMO (TASK-L180): answers in the browser from the template's fixture, not from a backend. ${meta.description}`;
      files.set(`components/${rel}`, json(meta));
    } else {
      files.set(`components/${rel}`, readFileSync(file));
    }
  }

  const registry = read(join(componentsDir, '_registry.json'));
  for (const key of Object.keys(registry.components)) {
    if (DROPPED_COMPONENTS.some((d) => `${key}/`.startsWith(d))) delete registry.components[key];
    else if (counts[key]) Object.assign(registry.components[key], counts[key]);
  }
  const rows = Object.values(registry.components);
  registry.stats = {
    totalComponents: rows.length,
    totalNodes: rows.reduce((s, r) => s + r.nodeCount, 0),
    totalConnections: rows.reduce((s, r) => s + r.connectionCount, 0),
  };
  files.set('components/_registry.json', json(registry));
  return files;
}

function main() {
  const files = generate();
  if (process.argv.includes('--stdout')) {
    for (const k of [...files.keys()].sort()) console.log(k);
    return;
  }
  if (existsSync(DEMO)) rmSync(DEMO, { recursive: true });
  for (const [rel, content] of files) {
    const p = join(DEMO, rel);
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, content);
  }
  console.log(`build-demo: wrote ${files.size} files to ${relative(process.cwd(), DEMO) || DEMO}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
