/**
 * P112 OWN-001 — a v2 project folder on disk, as `ProjectFiles`.
 *
 * `@nodegx/project-contract/format-node`. The stamp is the file's modification time and size, the
 * MCP `ProjectStore`'s snapshot; a write is a temp file and an atomic rename, so a reader never
 * sees half a file. Node only: a page uses `memoryFiles` from `@nodegx/project-contract/format`.
 */
import * as fs from 'fs';
import * as path from 'path';

import type { ProjectFiles } from './format/files';

export function diskFiles(projectDir: string): ProjectFiles {
  const root = path.resolve(projectDir);
  const abs = (p: string) => path.join(root, ...p.split('/'));
  return {
    read: (p) => {
      try {
        return fs.readFileSync(abs(p), 'utf8');
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
        throw err;
      }
    },
    stamp: (p) => {
      try {
        const s = fs.statSync(abs(p));
        return `${s.mtimeMs}:${s.size}`;
      } catch {
        return null;
      }
    },
    write: (p, content) => {
      const file = abs(p);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      const tmp = `${file}.tmp-${process.pid}-${Math.random().toString(36).slice(2, 8)}`;
      fs.writeFileSync(tmp, content, 'utf8');
      fs.renameSync(tmp, file);
    },
    remove: (p) => {
      // The MCP removes an emptied component folder too; nested components may live beneath it.
      const file = abs(p);
      if (!fs.existsSync(file)) return;
      fs.unlinkSync(file);
      try {
        const dir = path.dirname(file);
        if (fs.readdirSync(dir).length === 0) fs.rmdirSync(dir);
      } catch {
        /* folder already gone or not empty */
      }
    }
  };
}
