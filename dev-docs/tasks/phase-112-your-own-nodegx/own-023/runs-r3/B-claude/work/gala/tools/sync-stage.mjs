// Copies the 3D and music modules of reference/src (world.js, people.js, play.js, music.js) into the app's script
// files as factories. A NodeGX script file has no window, no document and no `import`, so each module becomes
// `exports.create(env)`: the "3D stage" Function hands it three.js, the window and the shared state object `G`.
// The code itself is the reference's, with these mechanical changes only:
//   - import lines → `use('rules/…')` for the rules, `env.mods.<file>` for each other, `env.T` for three.js;
//   - `document.createElement('canvas')` (textures drawn off-screen) → `new OffscreenCanvas(1, 1)`, never on the page;
//   - the renderer makes its own canvas (the Function puts it in the 3D Group) instead of finding #gl;
//   - innerWidth / innerHeight → the 3D Group's size (env.size).
// Run: node tools/sync-stage.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'app/scripts/stage');
mkdirSync(out, { recursive: true });
const RULES = { data: 'rules/data', engine: 'rules/engine', tunes: 'rules/tunes' };

function convert(name) {
  let code = readFileSync(join(root, 'reference/src', `${name}.js`), 'utf8');
  const names = [];
  code = code.replace(/^import \* as T from 'three';/m, 'const T = env.T;');
  code = code.replace(/^import\s*\{([^}]*)\}\s*from\s*'\.\/(\w+)\.js';/gm, (_, list, file) => {
    if (file === 'state.js' || file === 'state') return `const {${list}} = env;`;
    if (RULES[file]) return `const {${list}} = use('${RULES[file]}');`;
    return `const {${list}} = env.mods.${file};`;
  });
  code = code.replace(/^export \{([^}]*)\};?$/gm, (_, list) => { names.push(...list.split(',').map((s) => s.trim()).filter(Boolean)); return ''; });
  code = code.replace(/^export (async function|function|const|let|class) (\w+)/gm, (_, kind, id) => { names.push(id); return `${kind} ${id}`; });
  if (name === 'world') {
    const before = code;
    code = code.replace("const canvas = document.getElementById('gl');\nconst renderer = new T.WebGLRenderer({ canvas, antialias",
      "const renderer = new T.WebGLRenderer({ antialias");
    if (code === before) throw new Error('world.js: the canvas lines moved');
    code = code.replace(/^(renderer\.setPixelRatio)/m, 'const canvas = renderer.domElement;\n$1');
  }
  code = code.replace(/document\.createElement\('canvas'\)/g, 'new OffscreenCanvas(1, 1)');
  code = code.replace(/\binnerWidth\b/g, 'SIZE.w').replace(/\binnerHeight\b/g, 'SIZE.h');
  code = code.replace(/new OfflineAudioContext/g, 'new window.OfflineAudioContext');
  if (/^\s*(import|export)\b/m.test(code) || /document\.getElementById/.test(code)) throw new Error(`${name}.js: a line this copier does not know`);
  const unique = [...new Set(names)];
  return `// GENERATED from reference/src/${name}.js by tools/sync-stage.mjs — do not edit here.
function create(env) {
  const window = env.window, SIZE = env.size, OffscreenCanvas = window.OffscreenCanvas, devicePixelRatio = window.devicePixelRatio;
  const setTimeout = window.setTimeout.bind(window), performance = window.performance;
${code}
  const out = {};
  for (const [k, get] of Object.entries({ ${unique.map((n) => `${n}: () => ${n}`).join(', ')} })) Object.defineProperty(out, k, { get, enumerable: true });
  return out;
}
exports.create = create;
`;
}
for (const name of ['world', 'people', 'play', 'music']) {
  const text = convert(name);
  writeFileSync(join(out, `${name}.js`), text);
  console.log(`scripts/stage/${name}.js`);
}
