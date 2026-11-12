// Copies gala-rules/src into the NodeGX project's script files, unchanged except for the module lines:
// NodeGX script files are CommonJS-style (`exports`, `use('rules/data')`), gala-rules is ES modules.
// Run it again whenever gala-rules changes:  node tools/sync-rules.mjs
// Then check the copy plays the same game as the original:  node tools/check-rules.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'gala-rules/src'), out = join(root, 'app/scripts/rules');
mkdirSync(out, { recursive: true });

for (const name of ['data', 'plan', 'engine', 'tunes']) {
  let code = readFileSync(join(src, `${name}.js`), 'utf8');
  const names = [];
  code = code.replace(/^import\s*\{([^}]*)\}\s*from\s*'\.\/(\w+)\.js';/gm, (_, list, file) => `const {${list}} = use('rules/${file}');`);
  code = code.replace(/^export (const|let|function) (\w+)/gm, (_, kind, id) => { names.push(id); return `${kind} ${id}`; });
  if (/^\s*(import|export)\b/m.test(code)) throw new Error(`${name}.js: a module line this copier does not know`);
  const head = `// GENERATED from gala-rules/src/${name}.js by tools/sync-rules.mjs — do not edit here, edit gala-rules and run it again.\n`;
  writeFileSync(join(out, `${name}.js`), `${head}${code}\nObject.assign(exports, { ${names.join(', ')} });\n`);
  console.log(`scripts/rules/${name}.js: ${names.length} exports`);
}
