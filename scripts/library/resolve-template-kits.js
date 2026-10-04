#!/usr/bin/env node
/**
 * P109 ISL-017 ruling 2 ("copy on install") — put a project's referenced kits back on disk from the library.
 *
 * Usage:
 *   node scripts/library/resolve-template-kits.js <project-dir> [--library <dir>] [--write]
 *
 * Reads `<project-dir>/noodl_modules/kit-provenance.json`. Every `imported` record that carries `entry` (written by
 * the MCP door's `install_prefab` since ISL-017 s14) names the library entry its folder was copied from; the folder
 * is the entry's `project/noodl_modules/<module>`. For each such record this says one of:
 *
 *   resolved     the folder was absent and was copied from the library (only with --write)
 *   missing      the folder is absent and would be copied (without --write)
 *   identical    the folder is present and byte-identical to the library's — a template may drop it
 *   differs      the folder is present and is NOT the library's (the files are named) — it may not be dropped
 *   unresolvable no such entry, no such folder in it, or the entry's version is not the record's
 *
 * Records without `entry` (a kit made in the project, `dbt-lesson` which has no entry by design) are listed as
 * `notReferenced` and never touched. Prints one JSON object; exits 1 when anything is `unresolvable`, or — without
 * --write — `missing`, so a publish step that forgot to resolve stops rather than shipping an empty kit.
 *
 * ⚠️ The library is THIS checkout's `library/` (or `--library`): no network. The editor has no `library/` on disk,
 * which is why the resolve is a publish-time step (ISL-017 §8 s13, the reader census), not an install-time one.
 */
const fs = require('fs');
const path = require('path');

const PROVENANCE = path.join('noodl_modules', 'kit-provenance.json');
const DEFAULT_LIBRARY = path.join(__dirname, '..', '..', 'library');

/** Every file under `dir`, relative to it, sorted. */
function filesUnder(dir) {
  const out = [];
  const walk = (rel) => {
    for (const d of fs.readdirSync(path.join(dir, rel), { withFileTypes: true })) {
      const r = rel ? path.join(rel, d.name) : d.name;
      if (d.isDirectory()) walk(r);
      else out.push(r);
    }
  };
  walk('');
  return out.sort();
}

/** The files two folders do not share byte for byte (absent on either side counts). */
function difference(a, b) {
  const fa = filesUnder(a);
  const fb = filesUnder(b);
  const all = [...new Set([...fa, ...fb])].sort();
  return all.filter((f) => {
    const pa = path.join(a, f);
    const pb = path.join(b, f);
    if (!fs.existsSync(pa) || !fs.existsSync(pb)) return true;
    return !fs.readFileSync(pa).equals(fs.readFileSync(pb));
  });
}

/** `<library>/<type dir>/<entry>` holding a library.json — exactly one, or a reason. */
function findEntry(library, entry) {
  const hits = fs
    .readdirSync(library, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => path.join(library, d.name, entry))
    .filter((dir) => fs.existsSync(path.join(dir, 'library.json')));
  if (hits.length === 1) return { dir: hits[0] };
  return { reason: hits.length === 0 ? `the library has no entry "${entry}"` : `"${entry}" is ${hits.length} entries (${hits.join(', ')})` };
}

function resolveTemplateKits(projectDir, { library, write = false }) {
  const file = path.join(projectDir, PROVENANCE);
  const report = { project: projectDir, library, resolved: [], missing: [], identical: [], differs: [], unresolvable: [], notReferenced: [] };
  if (!fs.existsSync(file)) return report;
  const records = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const r of Array.isArray(records) ? records : []) {
    if (!r || typeof r.module !== 'string') continue;
    if (r.origin !== 'imported' || typeof r.entry !== 'string') {
      report.notReferenced.push(r.module);
      continue;
    }
    const found = findEntry(library, r.entry);
    if (!found.dir) {
      report.unresolvable.push({ module: r.module, entry: r.entry, reason: found.reason });
      continue;
    }
    const version = JSON.parse(fs.readFileSync(path.join(found.dir, 'library.json'), 'utf8')).version;
    if (r.entryVersion !== undefined && version !== r.entryVersion) {
      report.unresolvable.push({ module: r.module, entry: r.entry, reason: `the record says ${r.entryVersion}, the library holds ${version}` });
      continue;
    }
    const source = path.join(found.dir, 'project', 'noodl_modules', r.module);
    if (!fs.existsSync(source)) {
      report.unresolvable.push({ module: r.module, entry: r.entry, reason: `entry "${r.entry}" ships no noodl_modules/${r.module}` });
      continue;
    }
    const target = path.join(projectDir, 'noodl_modules', r.module);
    if (!fs.existsSync(target)) {
      if (write) {
        fs.cpSync(source, target, { recursive: true });
        report.resolved.push(r.module);
      } else {
        report.missing.push(r.module);
      }
      continue;
    }
    const differ = difference(source, target);
    if (differ.length === 0) report.identical.push(r.module);
    else report.differs.push({ module: r.module, files: differ.slice(0, 20), count: differ.length });
  }
  return report;
}

/**
 * For whatever COPIES a template to run it (a drive's `assemble`, a spec's fixture, the desktop app's build): put the
 * referenced kits back in the copy, or throw naming the ones the library cannot supply. ISL-017 s15: a template in
 * this repo commits the record and not the kit, so a copy without this step renders with no kit at all.
 */
function resolveTemplateCopy(projectDir, library = DEFAULT_LIBRARY) {
  const report = resolveTemplateKits(projectDir, { library, write: true });
  if (report.unresolvable.length > 0) {
    throw new Error(`${projectDir}: kits this checkout's library/ cannot supply: ${JSON.stringify(report.unresolvable)}`);
  }
  return report;
}

/**
 * For a generator WRITING a template: drop each referenced kit folder that is byte-identical to the library's, and keep
 * the record. A folder that differs is refused rather than dropped (the template would then name a kit it does not
 * carry), as is a record the library cannot answer. Returns the modules dropped.
 */
function dropReferencedKits(projectDir, library = DEFAULT_LIBRARY) {
  const report = resolveTemplateKits(projectDir, { library });
  const wrong = [...report.unresolvable, ...report.differs, ...report.missing.map((module) => ({ module, reason: 'absent before the drop' }))];
  if (wrong.length > 0) throw new Error(`refusing to drop the kits of ${projectDir}: ${JSON.stringify(wrong)}`);
  for (const module of report.identical) fs.rmSync(path.join(projectDir, 'noodl_modules', module), { recursive: true });
  return report.identical;
}

function main() {
  const argv = process.argv.slice(2);
  const flag = (name) => {
    const i = argv.indexOf(name);
    return i === -1 ? undefined : argv[i + 1];
  };
  const projectDir = argv.find((a, i) => !a.startsWith('--') && argv[i - 1] !== '--library');
  if (!projectDir) {
    process.stderr.write('usage: resolve-template-kits.js <project-dir> [--library <dir>] [--write]\n');
    process.exit(2);
  }
  const library = path.resolve(flag('--library') || DEFAULT_LIBRARY);
  const write = argv.includes('--write');
  const report = resolveTemplateKits(path.resolve(projectDir), { library, write });
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  process.exit(report.unresolvable.length > 0 || (!write && report.missing.length > 0) ? 1 : 0);
}

if (require.main === module) main();

module.exports = { resolveTemplateKits, resolveTemplateCopy, dropReferencedKits };
