/**
 * P112 OWN-001 — where a v2 project's files are: one interface, two backends.
 *
 * The store (`./store`) reads and writes through `ProjectFiles` and never names a file system, so
 * the same rules run on a folder on disk (`@nodegx/project-contract/format-node`) and on a map of
 * path → text held in memory (`memoryFiles`: a page, a test, a zip a person dropped in). Paths are
 * project-relative and forward-slashed: `components/Pages/Home/nodes.json`.
 *
 * Nothing here imports `fs`, `path` or Node's `crypto`: this module is the in-memory path a page
 * bundles (AC2 measures it).
 */
import { hash53 } from '../hash';

export interface ProjectFiles {
  /** The file's text, or `null` when it does not exist. */
  read(path: string): string | null;
  /**
   * A token that changes whenever the file does; `null` when it does not exist. On disk it is the
   * file's modification time and size (what the MCP's `ProjectStore` snapshots); in memory it is
   * the content hash. The store compares stamps, so either backend refuses the same writes.
   */
  stamp(path: string): string | null;
  /** Replaces the whole file, creating it and its folders when absent. On disk: a temp file and an atomic rename. */
  write(path: string, content: string): void;
  /** Removes the file when present. */
  remove(path: string): void;
}

/** A project held in memory. `entries()` returns every file as it stands, for a download or a test. */
export interface MemoryProjectFiles extends ProjectFiles {
  entries(): Record<string, string>;
}

export function memoryFiles(initial: Record<string, string> = {}): MemoryProjectFiles {
  const files = new Map<string, string>(Object.entries(initial));
  return {
    read: (path) => (files.has(path) ? (files.get(path) as string) : null),
    stamp: (path) => (files.has(path) ? hash53(files.get(path) as string) : null),
    write: (path, content) => {
      files.set(path, content);
    },
    remove: (path) => {
      files.delete(path);
    },
    entries: () => Object.fromEntries(files)
  };
}
