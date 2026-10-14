/**
 * P112-S14-PERSONKEY — a key the person pastes into their project's `.env`, sent to the backend without passing
 * through the conversation.
 *
 * Richard's ruling (2026-10-12): a person who isn't technical should never paste a terminal command or a key into
 * the chat. The agent asks for the key by name; `set_function_secret` (no `value`) writes `NAME=` into the
 * project's `.env`. The person pastes the key right after the `=` and saves, and the next `set_function_secret`
 * reads it from the file and sends it to the backend. Neither result carries the value, only its length.
 *
 * `.env` never leaves the machine: the deploy ignores it by default (`ignore.ts`, "environment / credential file")
 * and this module adds it to the project's `.gitignore`.
 *
 * @module noodl-mcp/backend/envSecret
 */

import * as fs from 'fs';
import * as path from 'path';

export const ENV_FILE = '.env';

const HEADER =
  '# Keys for this app\'s cloud functions. Paste each key right after its = sign, on the same line, and save.\n' +
  '# This file stays on your computer: a deploy never publishes it, and git ignores it.\n';

export type EnvSecretReading =
  | { state: 'no-file' | 'no-line' | 'empty'; file: string }
  | { state: 'filled'; file: string; value: string };

/** `NAME=value` from `.env` text, the way a person writes it: optional `export `, optional quotes, spaces trimmed. */
export function findEnvValue(text: string, name: string): string | undefined {
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const m = /^(?:export\s+)?([A-Za-z0-9_.-]+)\s*=(.*)$/.exec(line);
    if (!m || m[1] !== name) continue;
    let value = m[2].trim();
    if (value.length >= 2 && (value[0] === '"' || value[0] === "'") && value[value.length - 1] === value[0]) {
      value = value.slice(1, -1);
    }
    return value;
  }
  return undefined;
}

export function readEnvSecret(projectDir: string, name: string): EnvSecretReading {
  const file = path.join(projectDir, ENV_FILE);
  if (!fs.existsSync(file)) return { state: 'no-file', file };
  const value = findEnvValue(fs.readFileSync(file, 'utf8'), name);
  if (value === undefined) return { state: 'no-line', file };
  if (!value) return { state: 'empty', file };
  return { state: 'filled', file, value };
}

/**
 * Make sure `.env` has a `NAME=` line for the person to fill, and that git ignores the file.
 * Never touches a line that is already there, filled or not.
 */
export function ensureEnvPlaceholder(projectDir: string, name: string): { file: string; added: boolean } {
  const file = path.join(projectDir, ENV_FILE);
  const existing = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  let added = false;
  if (findEnvValue(existing, name) === undefined) {
    const base = existing ? (existing.endsWith('\n') ? existing : existing + '\n') : HEADER;
    fs.writeFileSync(file, `${base}${name}=\n`, { mode: 0o600 });
    added = true;
  }
  ensureGitIgnored(projectDir);
  return { file, added };
}

function ensureGitIgnored(projectDir: string): void {
  const gitignore = path.join(projectDir, '.gitignore');
  const text = fs.existsSync(gitignore) ? fs.readFileSync(gitignore, 'utf8') : '';
  if (text.split(/\r?\n/).some((l) => l.trim() === ENV_FILE || l.trim() === `/${ENV_FILE}`)) return;
  fs.writeFileSync(gitignore, `${text}${text && !text.endsWith('\n') ? '\n' : ''}${ENV_FILE}\n`);
}
