#!/usr/bin/env node
/**
 * NPMAUDIT-LOCALPATH — nothing in the package names the machine it was built on.
 *
 *   node check-pack-paths.mjs [packageDir]   exit 1 and list every hit (npm's prepack, after the builds;
 *                                            `@nodegx/mcp`'s and `@nodegx/preview`'s; default: the cwd)
 *
 * `@nodegx/mcp` 0.2.5 shipped `/Users/richardosborne/vscode_projects/OpenNoodl-worktrees/…` in
 * `dist/kit-extract.cjs` (an esbuild plugin's namespaced path) and `../../../../OpenNoodl/node_modules/…`
 * in `dist/kit-extract.inputs.json` (a worktree's linked node_modules). Both are fixed at their source;
 * this reads every file `package.json` `files` ships, so the next path to leak is refused before the
 * tarball exists, whatever wrote it.
 */
import fs from 'node:fs';
import path from 'node:path';

// npm runs a package's prepack in that package's folder, so the preview's prepack checks the preview.
const PKG_DIR = path.resolve(process.argv[2] || process.cwd());

/** A home folder on macOS, Linux or Windows, a worktree folder, and a relative path out of the repo. */
const LEAKS = [
  { name: 'a macOS home folder', re: /\/Users\/(?!Shared\/)[A-Za-z0-9._-]+\//g },
  { name: 'a Linux home folder', re: /\/home\/(?!user\/|node\/|ubuntu\/|runner\/)[a-z][a-z0-9_-]*\/(?:vscode_projects|projects|src|code|dev)\//g },
  { name: 'a Windows home folder', re: /[A-Za-z]:\\\\?Users\\\\?[A-Za-z0-9._-]+\\\\?/g },
  { name: 'a worktree folder', re: /OpenNoodl-worktrees/g },
  { name: 'a path out of the repo', re: /(?:\.\.\/){4,}OpenNoodl\//g }
];
const BINARY = /\.(png|jpe?g|gif|webp|ico|woff2?|ttf|otf|eot|wasm|mp3|mp4|zip|gz)$/i;

function shipped(dir) {
  const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
  const out = [];
  const walk = (p) => {
    if (!fs.existsSync(p)) return;
    const st = fs.statSync(p);
    if (st.isDirectory()) for (const e of fs.readdirSync(p)) walk(path.join(p, e));
    else out.push(p);
  };
  for (const entry of pkg.files || []) walk(path.join(dir, entry));
  return out;
}

const hits = [];
const files = shipped(PKG_DIR);
for (const file of files) {
  if (BINARY.test(file)) continue;
  const text = fs.readFileSync(file, 'utf8');
  for (const { name, re } of LEAKS) {
    for (const m of text.matchAll(re)) {
      const line = text.slice(0, m.index).split('\n').length;
      hits.push(`${path.relative(PKG_DIR, file)}:${line}  ${name}: ${m[0]}`);
      if (hits.length > 50) break;
    }
  }
}

if (hits.length) {
  console.error(`check-pack-paths: ${hits.length} machine path(s) in what the package ships:\n  ${hits.join('\n  ')}`);
  process.exit(1);
}
console.log(`check-pack-paths: ${files.length} shipped files, no machine path`);
