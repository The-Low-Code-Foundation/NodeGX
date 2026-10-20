#!/usr/bin/env node
/**
 * `npx @nodegx/three-kit add [projectDir]` — put three-kit in a NodeGX project.
 *
 * A kit is installed when its folder exists under the project's `noodl_modules/` (GRV-002 §3 fact 1): the editor,
 * the preview, `nodegx deploy` and the MCP's project overlay all read it from there. So installing from npm is a
 * copy into that folder, and nothing else in NodeGX has to learn about `node_modules` (GRV-002 §4.2, picked for
 * that reason: one writer here instead of four readers there).
 *
 * The copy is recorded in `noodl_modules/kit-provenance.json` as the editor's `imported` arm (projectmodules.ts
 * `KitProvenance`), naming the npm package and version, so the Kits panel says where it came from. Records for
 * other kits are kept.
 *
 * Never overwrites a different copy without `--force`: a project's kit folder can carry someone's edits.
 * Exit codes: 0 installed or already current, 1 refused (not a project, or a different copy without --force),
 * 2 usage.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const MODULE = 'three-kit';
const PKG = require('../package.json');
const KIT_DIR = path.join(__dirname, '..', 'project', 'noodl_modules', MODULE);
const PROVENANCE = path.join('noodl_modules', 'kit-provenance.json');
const PROJECT_FILES = ['nodegx.project.json', 'project.json'];

function usage(code) {
  const say = code === 0 ? console.log : console.error;
  say(
    [
      `${PKG.name} ${PKG.version} — three.js as NodeGX nodes (Scene, Mesh, Light, 3D Group)`,
      '',
      'Usage:',
      '  npx @nodegx/three-kit add [projectDir] [--force]',
      '',
      'Copies the kit into <projectDir>/noodl_modules/three-kit/ (projectDir defaults to the',
      'NodeGX project this folder is in). Reopen the project, or open it again through the MCP,',
      'and the nodes are in the picker and the catalog.'
    ].join('\n')
  );
  process.exit(code);
}

/** The nearest folder at or above `from` holding a NodeGX project file. */
function findProject(from) {
  let dir = path.resolve(from);
  for (;;) {
    if (PROJECT_FILES.some((f) => fs.existsSync(path.join(dir, f)))) return dir;
    const up = path.dirname(dir);
    if (up === dir) return null;
    dir = up;
  }
}

function listFiles(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isFile())
    .map((d) => d.name)
    .sort();
}

/** True when `target` holds exactly the files this package ships, byte for byte. */
function sameCopy(target) {
  const ours = listFiles(KIT_DIR);
  let theirs;
  try {
    theirs = listFiles(target);
  } catch {
    return false;
  }
  if (ours.join('\n') !== theirs.join('\n')) return false;
  return ours.every((f) => fs.readFileSync(path.join(KIT_DIR, f)).equals(fs.readFileSync(path.join(target, f))));
}

function recordProvenance(projectDir) {
  const file = path.join(projectDir, PROVENANCE);
  let records = [];
  if (fs.existsSync(file)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (Array.isArray(parsed)) records = parsed;
      else throw new Error('not a list of records');
    } catch (error) {
      // Not ours to repair: the editor reads a bad file as "no records" and says so. Leave it and say so too.
      console.warn(`warning: ${PROVENANCE} could not be read (${error.message}); left as it is, no record written.`);
      return;
    }
  }
  const record = {
    module: MODULE,
    origin: 'imported',
    fromProject: `${PKG.name}@${PKG.version} from npm`,
    importedAt: new Date().toISOString(),
    entry: MODULE,
    entryVersion: PKG.version
  };
  const next = [...records.filter((r) => !r || r.module !== MODULE), record];
  fs.writeFileSync(file, JSON.stringify(next, null, 2), 'utf8');
}

function add(args) {
  const force = args.includes('--force');
  const positional = args.filter((a) => !a.startsWith('--'));
  if (positional.length > 1) usage(2);

  const projectDir = findProject(positional[0] || process.cwd());
  if (!projectDir) {
    console.error(
      `No NodeGX project at or above ${path.resolve(positional[0] || process.cwd())} ` +
        `(looked for ${PROJECT_FILES.join(' or ')}). Run this inside the project, or pass its folder.`
    );
    process.exit(1);
  }
  if (!fs.existsSync(path.join(KIT_DIR, 'manifest.json'))) {
    console.error(`This package has no kit in it (${KIT_DIR} has no manifest.json). Reinstall @nodegx/three-kit.`);
    process.exit(1);
  }

  const target = path.join(projectDir, 'noodl_modules', MODULE);
  const existed = fs.existsSync(target);
  if (existed && sameCopy(target)) {
    console.log(`${MODULE} ${PKG.version} is already in ${projectDir} — nothing to do.`);
    return;
  }
  if (existed && !force) {
    console.error(
      `${path.relative(process.cwd(), target) || target} already holds a different copy of ${MODULE}. ` +
        'It may carry edits. Pass --force to replace it with this version.'
    );
    process.exit(1);
  }

  fs.rmSync(target, { recursive: true, force: true });
  fs.mkdirSync(target, { recursive: true });
  for (const f of listFiles(KIT_DIR)) fs.copyFileSync(path.join(KIT_DIR, f), path.join(target, f));
  recordProvenance(projectDir);

  console.log(
    `${existed ? 'Replaced' : 'Added'} ${MODULE} ${PKG.version} in ${projectDir}/noodl_modules/${MODULE}.\n` +
      'Nodes: Scene (three-kit.Scene), Mesh, Light, 3D Group (three-kit.Group). Put a Scene on a page,\n' +
      'and Meshes, Lights and 3D Groups under it. Reopen the project for the editor and the MCP to list them.'
  );
}

const [command, ...rest] = process.argv.slice(2);
if (command === 'add') add(rest);
else if (command === '--help' || command === '-h' || command === 'help') usage(0);
else usage(2);
