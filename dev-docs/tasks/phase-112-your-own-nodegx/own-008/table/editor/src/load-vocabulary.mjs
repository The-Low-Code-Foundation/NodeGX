// The vocabulary the editor starts with: node-spec always, and the runtime's node library when it has
// been read from @nodegx/preview (`npm run vocabulary`, or the page does it on first open).
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Vocabulary } from './vocabulary.mjs';

export const NODE_LIBRARY_FILE = fileURLToPath(new URL('../vocabulary/node-library.json', import.meta.url));

export function loadNodeLibrary() {
  if (!existsSync(NODE_LIBRARY_FILE)) return undefined;
  try {
    return JSON.parse(readFileSync(NODE_LIBRARY_FILE, 'utf8')).nodeLibrary;
  } catch {
    return undefined;
  }
}

export function loadVocabulary() {
  return new Vocabulary({ nodeLibrary: loadNodeLibrary() });
}
