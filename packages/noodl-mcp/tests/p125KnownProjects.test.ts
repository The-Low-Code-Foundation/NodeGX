/**
 * P125-CCN008-LOSTPROJECT — a project made or opened in one conversation is found by `list_projects` in the next.
 *
 * Richard's Muddy Paws run (2026-10-25): the project a chat made the day before was not in `list_projects`, which read
 * only the desktop editor's recent list and the server's folder; he pasted its path. Every bind is now remembered in a
 * file of the server's own (`project/knownProjects.ts`).
 *
 * @module noodl-mcp/tests/p125KnownProjects
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { knownProjects, rememberProject } from '../src/project/knownProjects';
import { ProjectBinding } from '../src/project/ProjectBinding';
import { scanProjects } from '../src/tools/listProjects';
import { copyFixture } from './helpers';

describe('P125-CCN008-LOSTPROJECT — the projects this server made or opened', () => {
  const saved = process.env.NODEGX_KNOWN_PROJECTS;
  let home: string;
  const made: string[] = [];
  beforeEach(() => {
    home = fs.mkdtempSync(path.join(os.tmpdir(), 'known-projects-'));
    process.env.NODEGX_KNOWN_PROJECTS = path.join(home, 'known-projects.json');
  });
  afterEach(() => {
    if (saved === undefined) delete process.env.NODEGX_KNOWN_PROJECTS;
    else process.env.NODEGX_KNOWN_PROJECTS = saved;
    for (const d of [home, ...made.splice(0)]) fs.rmSync(d, { recursive: true, force: true });
  });

  it('🔴 a project bound by open_project or create_project is listed later, with no editor list and from another folder', () => {
    const dir = copyFixture();
    made.push(dir);
    const empty = fs.mkdtempSync(path.join(os.tmpdir(), 'no-projects-'));
    made.push(empty);
    // the control: before the bind, nothing knows it
    expect(scanProjects([], empty).projects.map((p) => p.directory)).not.toContain(path.resolve(dir));
    new ProjectBinding().bind(dir);
    const rows = scanProjects([], empty).projects;
    expect(rows.map((p) => p.directory)).toContain(path.resolve(dir));
    expect(rows.find((p) => p.directory === path.resolve(dir))).toMatchObject({ format: 'v2', name: expect.any(String) });
  });

  it('a server started on a project remembers it too; the newest opening is first and a folder that went is left out', () => {
    const a = copyFixture();
    const b = copyFixture();
    made.push(a, b);
    rememberProject(a, new Date('2026-10-24T10:00:00Z'));
    new ProjectBinding(b);
    expect(knownProjects().map((p) => p.directory)).toEqual([path.resolve(b), path.resolve(a)]);
    fs.rmSync(b, { recursive: true, force: true });
    expect(knownProjects().map((p) => p.directory)).toEqual([path.resolve(a)]);
  });

  it('a test run never reads or writes the person\'s own list (no file named, inside jest)', () => {
    delete process.env.NODEGX_KNOWN_PROJECTS;
    const dir = copyFixture();
    made.push(dir);
    const file = path.join(os.homedir(), '.noodl', 'known-projects.json');
    const before = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
    rememberProject(dir);
    expect(fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null).toBe(before);
    expect(knownProjects()).toEqual([]);
  });
});
