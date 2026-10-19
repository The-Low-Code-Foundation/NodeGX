/**
 * P111-S2-DBTNOHOME: every shipped template opens on its home.
 *
 * The editor finds the home only from `nodegx.project.json`'s `rootNodeId`
 * (`noodl-editor/src/editor/src/models/projectmodel.ts`). An id that names no node in
 * any of the template's components reads as "No HOME component selected" in the
 * preview, and opening the project in 0.4 drops the dangling id from the file.
 * P121-S19-NOHOME checked two templates against their own App; this checks all
 * of them against every component they hold.
 */
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.join(__dirname, '..', '..', '..');
const TEMPLATES = path.join(ROOT, 'templates');

/** Templates known to ship without a home, each with the row that owns the fix. */
const KNOWN_HOMELESS: Record<string, string> = {
  nightbook: 'P109-S13-NIGHTBOOKHOME'
};

interface NodeJson {
  id?: string;
  children?: NodeJson[];
}
interface NodesFile {
  nodes?: NodeJson[];
}
interface ProjectFile {
  rootNodeId?: string;
}

const read = <T>(p: string): T => JSON.parse(fs.readFileSync(p, 'utf8')) as T;

function nodesFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...nodesFiles(p));
    else if (entry.name === 'nodes.json') out.push(p);
  }
  return out;
}

function nodeIds(templateDir: string): Set<string> {
  const ids = new Set<string>();
  const walk = (nodes: NodeJson[] | undefined): void => {
    for (const n of nodes ?? []) {
      if (typeof n.id === 'string') ids.add(n.id);
      walk(n.children);
    }
  };
  const components = path.join(templateDir, 'components');
  if (fs.existsSync(components)) for (const f of nodesFiles(components)) walk(read<NodesFile>(f).nodes);
  return ids;
}

const templates = fs
  .readdirSync(TEMPLATES, { withFileTypes: true })
  .filter((e) => e.isDirectory() && fs.existsSync(path.join(TEMPLATES, e.name, 'nodegx.project.json')))
  .map((e) => e.name)
  .sort();

describe('every template opens on its home (P111-S2-DBTNOHOME)', () => {
  it('finds the templates (known-firing: a census of none would pass every row)', () => {
    expect(templates.length).toBeGreaterThanOrEqual(15);
  });

  it.each(templates)('%s', (name) => {
    const dir = path.join(TEMPLATES, name);
    const { rootNodeId } = read<ProjectFile>(path.join(dir, 'nodegx.project.json'));
    if (KNOWN_HOMELESS[name]) {
      // When the owning row is fixed, this goes red: take the template off the list.
      expect(rootNodeId).toBeUndefined();
      return;
    }
    expect(rootNodeId).toEqual(expect.any(String));
    expect(nodeIds(dir).has(rootNodeId as string)).toBe(true);
  });
});
