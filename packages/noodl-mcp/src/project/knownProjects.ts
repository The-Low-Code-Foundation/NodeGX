/**
 * P125-CCN008-LOSTPROJECT — the projects this server made or opened, remembered from one conversation to the next.
 *
 * Richard's Muddy Paws run in Claude Desktop (2026-10-25): the project made in another chat the day before, at
 * `~/vscode_projects/NodeGX test projects/Muddy Paws`, was not found by `list_projects`, and he had to paste its path.
 * `list_projects` read the desktop editor's recent list (written only by the editor) and the server's own folder
 * (Desktop starts the server in no project folder). A project made through `create_project` was recorded nowhere, so
 * a person who builds only in conversations never had a list to come back to.
 *
 * So every project this server binds (`create_project`, `open_project`, a server started on a project) is written
 * here, and `list_projects` reads it beside the editor's list. Its own file, never the editor's: the editor rewrites
 * its store wholesale (`listProjects.ts` header).
 *
 * @module project/knownProjects
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import type { ProjectListRow } from '../tools/responses';

/** A list a person comes back to, not a log: the newest this many. */
const KEEP = 60;

interface KnownRow {
  directory: string;
  name: string;
  lastOpened: string;
}

export function knownProjectsFile(): string {
  return process.env.NODEGX_KNOWN_PROJECTS || path.join(os.homedir(), '.noodl', 'known-projects.json');
}

function real(p: string): string {
  try {
    return fs.realpathSync(p);
  } catch {
    return path.resolve(p);
  }
}

/**
 * Whether a bind is a person's. A test suite binds hundreds of throwaway folders and fixtures; recording those would
 * fill the person's list with projects they never made. So: never from a jest worker or under the temp folder,
 * unless the file was named for this run (`NODEGX_KNOWN_PROJECTS`, which the suite does).
 */
function worthRemembering(dir: string): boolean {
  if (process.env.NODEGX_KNOWN_PROJECTS) return true;
  if (process.env.JEST_WORKER_ID) return false;
  const tmp = real(os.tmpdir());
  const at = real(dir);
  return !(at === tmp || at.startsWith(tmp + path.sep));
}

function read(): KnownRow[] {
  try {
    const parsed = JSON.parse(fs.readFileSync(knownProjectsFile(), 'utf8')) as { projects?: unknown };
    return Array.isArray(parsed.projects)
      ? (parsed.projects as KnownRow[]).filter((r) => r && typeof r.directory === 'string' && typeof r.lastOpened === 'string')
      : [];
  } catch {
    return [];
  }
}

function nameOf(dir: string): string {
  try {
    const project = JSON.parse(fs.readFileSync(path.join(dir, 'nodegx.project.json'), 'utf8')) as { name?: unknown };
    if (typeof project.name === 'string' && project.name.trim()) return project.name;
  } catch {
    /* a registry-only project: the folder names it */
  }
  return path.basename(dir);
}

/** Remember a project this server is now serving. Never throws: a list that could not be written loses nothing else. */
export function rememberProject(dir: string, now: Date = new Date()): void {
  try {
    if (!worthRemembering(dir)) return;
    const directory = path.resolve(dir);
    const rows = read().filter((r) => path.resolve(r.directory) !== directory);
    rows.unshift({ directory, name: nameOf(directory), lastOpened: now.toISOString() });
    const file = knownProjectsFile();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const tmp = `${file}.tmp-${process.pid}-${Math.random().toString(36).slice(2, 8)}`;
    fs.writeFileSync(tmp, JSON.stringify({ projects: rows.slice(0, KEEP) }, null, 2), 'utf8');
    fs.renameSync(tmp, file);
  } catch {
    /* best effort */
  }
}

/** The remembered projects that are still there, newest first. A folder that went is left out, as the editor's list does. */
export function knownProjects(): ProjectListRow[] {
  // A suite reads the person's list no more than it writes it: a test of "nothing here" would see their projects.
  if (!process.env.NODEGX_KNOWN_PROJECTS && process.env.JEST_WORKER_ID) return [];
  const out: ProjectListRow[] = [];
  for (const r of read()) {
    const directory = path.resolve(r.directory);
    if (!fs.existsSync(path.join(directory, 'nodegx.project.json')) && !fs.existsSync(path.join(directory, 'components', '_registry.json'))) continue;
    out.push({ name: nameOf(directory), directory, format: 'v2', lastOpened: r.lastOpened });
  }
  return out;
}
