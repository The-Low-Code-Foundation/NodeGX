/**
 * P109 ISL-005 — a project's script files on disk: `scripts/**.js`, one file per script.
 *
 * The project holds them as `scripts: { 'engine/world.js': source }` (the runtime's `ScriptSources`,
 * `@noodl/runtime/src/scriptfiles`), which is what every pipe downstream reads — the preview, a deploy,
 * a server render. This store is the disk half: it reads the folder on load and writes back what
 * changed on save, the same way the component and project-level files are kept:
 *
 * - **Only what changed is written,** and each write is atomic (a temp sibling renamed over the file).
 * - **A file that moved on disk is not written over.** The baseline is the text this editor last read
 *   or wrote. If the file on disk is neither that nor what we are about to write, someone else (an
 *   agent, a git checkout, a text editor) wrote it while we held the project: the save refuses that
 *   one file and keeps its baseline, so the next save retries (REL-009a / FLD-009's rule).
 * - **A script removed in the editor is deleted on disk** — unless the file moved, by the same rule.
 * - **No baseline means nothing to clobber**: a project this editor did not load from this folder
 *   writes every script it holds.
 *
 * Paths are kept as the runtime normalises them (relative to `scripts/`, ending `.js`), so a file
 * on disk and the path a Function's `uses` names are spelt the same.
 */
import { normalizeScriptPath, type ScriptSources } from '@noodl/runtime/src/scriptfiles';

import { V2_FILES, type ProjectStructureFilesystem } from './types';

export interface ScriptSaveResult {
  written: string[];
  removed: string[];
  /** Scripts not written (or not deleted) because the file on disk moved off our baseline. */
  refused: string[];
}

/** What a watcher event for one script should do (REL-009b's three answers). */
export type ScriptReloadDecision =
  /** Adopt the disk copy (`text`; `null` = the file was deleted). */
  | { action: 'reload'; text: string | null }
  /** The disk matches our baseline — our own write coming back, or nothing changed. */
  | { action: 'skip-unchanged' }
  /** The person has an unsaved change to this script; adopting the disk would lose it. */
  | { action: 'refuse-dirty' };

export class ScriptFileStore {
  /** path → the text this editor last read from or wrote to disk. */
  private baselines = new Map<string, string>();

  constructor(private readonly fs: ProjectStructureFilesystem) {}

  /** Can this filesystem read the folder at all? A test double without `readFile` skips scripts. */
  get supported(): boolean {
    return typeof this.fs.readFile === 'function' && typeof this.fs.listDirectoryFiles === 'function';
  }

  /** Every `scripts/**.js` under the project, as `{ path: source }`. Seeds the baselines. */
  async readAll(projectDir: string): Promise<ScriptSources> {
    const scripts: ScriptSources = {};
    const root = this.fs.join(projectDir, V2_FILES.scriptsDir);
    if (!this.supported || !this.fs.exists(root)) return scripts;

    const files = await this.fs.listDirectoryFiles!(root);
    for (const file of files) {
      if (file.isDirectory || !file.fullPath.endsWith('.js')) continue;
      const relative = toRelative(root, file.fullPath);
      const path = normalizeScriptPath(relative);
      if (path === undefined) continue;
      scripts[path] = await this.fs.readFile!(file.fullPath);
    }
    this.seed(scripts);
    return scripts;
  }

  /** Records `scripts` as what is on disk. */
  seed(scripts: ScriptSources | undefined): void {
    this.baselines.clear();
    for (const [path, source] of Object.entries(scripts || {})) this.baselines.set(path, source);
  }

  forget(): void {
    this.baselines.clear();
  }

  snapshot(): Map<string, string> {
    return new Map(this.baselines);
  }

  restore(snapshot: Map<string, string>): void {
    this.baselines = new Map(snapshot);
  }

  async save(projectDir: string, scripts: ScriptSources | undefined): Promise<ScriptSaveResult> {
    const result: ScriptSaveResult = { written: [], removed: [], refused: [] };
    if (!this.supported) return result;

    const wanted = new Map<string, string>();
    for (const [key, source] of Object.entries(scripts || {})) {
      const path = normalizeScriptPath(key);
      if (path !== undefined && typeof source === 'string') wanted.set(path, source);
    }

    for (const [path, source] of wanted) {
      const baseline = this.baselines.get(path);
      if (baseline === source) continue;
      const file = this.fileFor(projectDir, path);
      if (await this.movedOnDisk(file, baseline, source)) {
        result.refused.push(path);
        continue;
      }
      await this.writeAtomic(file, source);
      this.baselines.set(path, source);
      result.written.push(path);
    }

    for (const [path, baseline] of Array.from(this.baselines)) {
      if (wanted.has(path)) continue;
      const file = this.fileFor(projectDir, path);
      if (this.fs.exists(file)) {
        if (await this.movedOnDisk(file, baseline, undefined)) {
          result.refused.push(path);
          continue;
        }
        await this.fs.removeFile(file);
      }
      this.baselines.delete(path);
      result.removed.push(path);
    }

    return result;
  }

  /**
   * REL-009b for scripts: someone wrote `scripts/<path>` while the editor holds the project. `memory` is
   * the editor's copy now (`undefined` = it has no such script). Reads the disk once.
   */
  async decideReload(projectDir: string, path: string, memory: string | undefined): Promise<ScriptReloadDecision> {
    const file = this.fileFor(projectDir, path);
    let disk: string | null;
    if (!this.fs.exists(file)) disk = null;
    else {
      try {
        disk = await this.fs.readFile!(file);
      } catch {
        return { action: 'skip-unchanged' }; // mid-write: the next event finds it settled
      }
    }
    const baseline = this.baselines.has(path) ? this.baselines.get(path)! : null;
    if (disk === baseline) return { action: 'skip-unchanged' };
    // The editor's copy has moved off what it last read or wrote: an unsaved change. Keep the
    // baseline, so the next save still sees the file moved and refuses to write over it.
    const memoryAsDisk = memory === undefined ? null : memory;
    if (memoryAsDisk !== baseline && memoryAsDisk !== disk) return { action: 'refuse-dirty' };
    return { action: 'reload', text: disk };
  }

  /** Records that the editor now holds exactly what is on disk for `path` (`null`: no file). */
  markBaseline(path: string, text: string | null): void {
    if (text === null) this.baselines.delete(path);
    else this.baselines.set(path, text);
  }

  private fileFor(projectDir: string, path: string): string {
    return this.fs.join(projectDir, V2_FILES.scriptsDir, ...path.split('/'));
  }

  /**
   * Has the file moved off the text we last read or wrote? No baseline → nothing to clobber. Disk
   * already holding what we would write → that is us (a retried save), not a conflict.
   */
  private async movedOnDisk(file: string, baseline: string | undefined, pending: string | undefined): Promise<boolean> {
    if (baseline === undefined) return false;
    // A file gone from disk has nothing in it to lose: a write puts ours back, a delete is done.
    if (!this.fs.exists(file)) return false;
    let onDisk: string;
    try {
      onDisk = await this.fs.readFile!(file);
    } catch {
      return true; // unreadable this instant: an agent's write landing — do not write over it
    }
    return onDisk !== baseline && onDisk !== pending;
  }

  private async writeAtomic(file: string, content: string): Promise<void> {
    const dir = this.fs.dirname(file);
    if (!this.fs.exists(dir)) await this.fs.makeDirectory(dir);
    const tmp = file + '.tmp';
    await this.fs.writeFile(tmp, content);
    await this.fs.renameFile(tmp, file);
  }
}

function toRelative(root: string, fullPath: string): string {
  const r = root.replace(/\\/g, '/').replace(/\/+$/, '');
  const f = fullPath.replace(/\\/g, '/');
  return f.startsWith(r + '/') ? f.substring(r.length + 1) : f;
}
