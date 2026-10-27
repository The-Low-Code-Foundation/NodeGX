/**
 * P112-OWN023-KEYNEEDSAGENT — the project's `.env`, a door for a cloud function's secret.
 *
 * `set_function_secret` (noodl-mcp) asks the person to paste a key into `<project>/.env` and save. Before this
 * file the backend never read that file: the key reached a function only when the agent called the tool a second
 * time and copied it into `secrets.json`, so a person who pasted their key and restarted the preview still had a
 * feature that said "not provisioned", and a key changed in `.env` later was shadowed by the old copy. The two
 * code-built apps in OWN-023 read their env file on restart; this backend reads it whenever a function asks.
 *
 * ## What it is
 *
 * The file the backend was started beside (`--project-dir`), read on every lookup: saving it is enough, with
 * nothing to restart and nothing to call. Only a FILLED line answers; the empty `NAME=` that `set_function_secret`
 * writes is a line waiting for the person, not an empty credential.
 *
 * ## What it is not
 *
 * A new exposure. A Secret node can name only a secret, the names follow `FUNCTION_SECRET_NAME_PATTERN`, and the
 * values never leave this process (the scrubber reads them to redact a `Log` node, nothing reads them back).
 * The file stays on the person's computer: a deploy ignores it (`ignore.ts`), and `deploy_to_vm` sends its values
 * as environment variables over ssh, never the file.
 *
 * `findEnvValue` is the one parser: noodl-mcp's `envSecret.ts` reads the same file with it.
 *
 * @module nodegx-backend/config/projectEnvFile
 */

import * as fs from 'fs';
import * as path from 'path';

import { FUNCTION_SECRET_NAME_PATTERN } from './SecretsStore';

export const PROJECT_ENV_FILE = '.env';

const LINE = /^(?:export\s+)?([A-Za-z0-9_.-]+)\s*=(.*)$/;

/** The value of one `NAME=value` line, the way a person writes it: optional `export `, optional quotes, spaces trimmed. */
function lineValue(raw: string): string {
  let value = raw.trim();
  if (value.length >= 2 && (value[0] === '"' || value[0] === "'") && value[value.length - 1] === value[0]) {
    value = value.slice(1, -1);
  }
  return value;
}

/** `NAME=value` from `.env` text. `undefined` when there is no line; `''` when the line is there and empty. */
export function findEnvValue(text: string, name: string): string | undefined {
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const m = LINE.exec(line);
    if (!m || m[1] !== name) continue;
    return lineValue(m[2]);
  }
  return undefined;
}

function readText(projectDir: string | null | undefined): string | null {
  if (!projectDir) return null;
  try {
    return fs.readFileSync(path.join(projectDir, PROJECT_ENV_FILE), 'utf8');
  } catch {
    return null;
  }
}

/** The filled value of `name` in the project's `.env`, or `undefined` (no project, no file, no line, an empty line). */
export function projectEnvSecret(projectDir: string | null | undefined, name: string): string | undefined {
  const text = readText(projectDir);
  if (text === null) return undefined;
  const value = findEnvValue(text, name);
  return value ? value : undefined;
}

/** The names a Secret node could ask for that the project's `.env` fills, first line of each name only. */
export function projectEnvSecretNames(projectDir: string | null | undefined): string[] {
  const text = readText(projectDir);
  if (text === null) return [];
  const seen = new Set<string>();
  const filled: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const m = LINE.exec(line);
    if (!m || seen.has(m[1])) continue;
    seen.add(m[1]);
    if (FUNCTION_SECRET_NAME_PATTERN.test(m[1]) && lineValue(m[2])) filled.push(m[1]);
  }
  return filled.sort();
}
