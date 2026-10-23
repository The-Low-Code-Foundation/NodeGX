/**
 * P125 CCN-001 — the hold.
 *
 * A person watching the app come together in Studio presses HOLD. From that moment every tool that writes is
 * refused, until they release it. The hold is a file, `.nodegx-hold.json` in the project folder, for three reasons:
 *
 * - **it binds, it does not advise.** OWN-026 measured that advice delivered to a model gets argued away ("the
 *   contention is negligible"); a refusal does not. The gate is in the server, in front of the handler, and the
 *   model cannot route around it.
 * - **it is the same mechanism for every host and every editor.** Studio writes it; so could VS Code (`touch`), a
 *   second person, or the NodeGX editor. The MCP server reads it before every write whether it runs in Claude
 *   Desktop, Claude Code, Cline or Vibe. No host feature is needed.
 * - **it outlives a process.** A Studio that crashed while a hold was on leaves the hold on. A hold nobody can
 *   see is still a hold, and the refusal says where the file is.
 *
 * A dotfile, so Studio's own store and watcher (which skip dotfiles) never read it as part of the app.
 *
 * What is held: every tool registered inside the server's write gate (`server.ts`, the `allowWrites` block), by
 * wrapping the recorder those registrations go through. That is the honest set — "what this server refuses on a
 * read-only start" and "what a person's hold stops" are the same list by construction, and a tool added to the
 * block later is held without anyone remembering to add it here.
 */

import * as fs from 'fs';
import * as path from 'path';

import type { McpServer, RegisteredTool } from '@modelcontextprotocol/sdk/server/mcp.js';

import { ToolError } from './errors';
import type { ProjectBinding } from './project/ProjectBinding';
import { errorResult } from './tools/util';

export const HOLD_FILE = '.nodegx-hold.json';

export interface Hold {
  held: boolean;
  by?: string;
  at?: string;
  note?: string;
  file?: string;
}

/** What the hold file says, or `{ held: false }`. An unreadable file is a hold: somebody put it there. */
export function readHold(projectDir: string): Hold {
  const file = path.join(projectDir, HOLD_FILE);
  if (!fs.existsSync(file)) return { held: false };
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as Omit<Hold, 'held' | 'file'>;
    return { held: true, ...parsed, file };
  } catch {
    return { held: true, at: fs.statSync(file).mtime.toISOString(), file };
  }
}

/** The refusal, worded for the model that just tried to write. */
export function holdError(hold: Hold): ToolError {
  const since = hold.at ? ` since ${hold.at}` : '';
  const note = hold.note ? ` They wrote: "${hold.note}".` : '';
  return new ToolError(
    'held',
    `The person pressed HOLD in Studio${since}: nothing is written to this project until they release it.${note} ` +
      'Stop building. Tell them what you were about to do and ask what they saw; when they release the hold, ' +
      're-read anything you were about to change, because they may have edited it in Studio meanwhile. ' +
      `(The hold is the file ${hold.file ?? HOLD_FILE}; only the person removes it.)`,
    { hold }
  );
}

/**
 * The recorder with the hold in front of every handler registered through it.
 *
 * `registerTool(name, config, handler)` is the one shape every registration in this server uses (the recorder
 * forwards that and nothing else, `disclosure.ts`), so wrapping the last argument covers them all. The check runs
 * per call, against the binding as it is then: a server that binds a project later is held by that project's file.
 */
export function holdGate(rec: McpServer, binding: ProjectBinding): McpServer {
  const proxy = Object.create(rec) as McpServer;
  proxy.registerTool = ((name: string, ...rest: unknown[]) => {
    const handler = rest[rest.length - 1];
    if (typeof handler === 'function') {
      rest[rest.length - 1] = async (...args: unknown[]) => {
        const dir = binding.projectDir;
        if (dir !== undefined) {
          const hold = readHold(dir);
          if (hold.held) return errorResult(holdError(hold));
        }
        return (handler as (...a: unknown[]) => unknown)(...args);
      };
    }
    return (rec.registerTool as (...a: unknown[]) => RegisteredTool)(name, ...rest);
  }) as McpServer['registerTool'];
  return proxy;
}
