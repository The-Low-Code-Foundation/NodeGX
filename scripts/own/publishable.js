#!/usr/bin/env node
/**
 * P112 OWN-011 — can npm install this package outside the checkout? (P112-S9-NPXDEPS)
 *
 *   node scripts/own/publishable.js                     the kit's packages
 *   node scripts/own/publishable.js packages/noodl-mcp  one or more package folders
 *
 * Inside the checkout every workspace package is linked, so a `dependencies` entry naming a PRIVATE workspace package
 * works there and nowhere else: npm asks the registry for it and gets a 404 (`@nodegx/mcp` named three, all inlined in its
 * bundle and never loaded). A package that bundles a workspace package lists it under `devDependencies`. Exit 1 on a
 * problem. Plain Node, no dependencies.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
/** The packages OWN-011's one install publishes (R2: at 0.x). */
const KIT = ['packages/noodl-mcp', 'packages/noodl-preview'];

const workspace = new Map();
for (const dir of fs.readdirSync(path.join(ROOT, 'packages'))) {
  const file = path.join(ROOT, 'packages', dir, 'package.json');
  if (!fs.existsSync(file)) continue;
  const pkg = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (pkg.name) workspace.set(pkg.name, { dir: `packages/${dir}`, private: !!pkg.private });
}

const problems = [];
const dirs = process.argv.slice(2).length ? process.argv.slice(2) : KIT;
for (const dir of dirs) {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, dir, 'package.json'), 'utf8'));
  if (pkg.private) problems.push(`${pkg.name} (${dir}) is private: npm will not publish it`);
  for (const dep of Object.keys(pkg.dependencies || {})) {
    const w = workspace.get(dep);
    if (w && w.private) {
      problems.push(`${pkg.name} depends on ${dep} (${w.dir}), a private workspace package npm cannot fetch — bundle it and list it under devDependencies`);
    }
  }
}
for (const p of problems) console.log(p);
console.log(`${dirs.length} package(s), ${problems.length} problem(s)`);
if (problems.length) process.exit(1);
