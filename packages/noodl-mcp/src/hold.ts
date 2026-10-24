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
  /** P125 CCN-002 — hours since `at` (whole hours), so a hold left on since yesterday is said, not silently honoured. */
  ageHours?: number;
}

/** P125 CCN-002 — a hold older than this is reported as old: still honoured (only the person removes it), but said. */
export const OLD_HOLD_HOURS = 24;

function withAge(hold: Hold): Hold {
  const at = hold.at ? Date.parse(hold.at) : NaN;
  return Number.isFinite(at) ? { ...hold, ageHours: Math.max(0, Math.floor((Date.now() - at) / 3_600_000)) } : hold;
}

/** The sentence for a hold left on a long time, or '' for a fresh one. */
export function oldHoldWords(hold: Hold): string {
  if (hold.ageHours === undefined || hold.ageHours < OLD_HOLD_HOURS) return '';
  const days = Math.floor(hold.ageHours / 24);
  return (
    `This hold has been on for ${days === 1 ? 'a day' : `${days} days`}: it may be one they forgot. Ask whether ` +
    'they still mean it; do not remove it yourself. '
  );
}

/** What the hold file says, or `{ held: false }`. An unreadable file is a hold: somebody put it there. */
export function readHold(projectDir: string): Hold {
  const file = path.join(projectDir, HOLD_FILE);
  if (!fs.existsSync(file)) return { held: false };
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as Omit<Hold, 'held' | 'file'>;
    return withAge({ held: true, ...parsed, file });
  } catch {
    return withAge({ held: true, at: fs.statSync(file).mtime.toISOString(), file });
  }
}

/** The refusal, worded for the model that just tried to write. */
export function holdError(hold: Hold): ToolError {
  const since = hold.at ? ` since ${hold.at}` : '';
  const note = hold.note ? ` They wrote: "${hold.note}".` : '';
  return new ToolError(
    'held',
    `The person pressed HOLD in Studio${since}: STOP. Nothing runs against this project — no read, no render, ` +
      `no write — until they release it.${note} Do not call another tool. ${oldHoldWords(hold)}Tell them, in a ` +
      'sentence or two, what you were doing and what you were about to do next, and ask what they saw. When they ' +
      'release the hold, call what_changed_since: it lists what they changed in Studio meanwhile. Re-read anything ' +
      'you were about to change before you change it. If their NEXT message asks you to change the app, that ' +
      'message is the release: call release_hold with their words, then what_changed_since. Never in this turn: ' +
      `release_hold refuses within ${RELEASE_AFTER_REFUSAL_MS / 1000} seconds of a call the hold refused. ` +
      `(The hold is the file ${hold.file ?? HOLD_FILE}.)`,
    { hold }
  );
}

/**
 * The tools a hold does not stop: the ones that let the agent see the hold, and nothing that touches the project.
 *
 * s6 (2026-10-23, Richard's AC5 run): a hold on writes only let the agent "keep beavering away until it tried to
 * write something, then fail". HOLD means stop; so every tool is held, and these four are the exceptions —
 * `open_studio` (which reports the hold and keeps Studio on screen), `session_status` (which will report it), and
 * the two doors (`find_tools`, `call_tool`), whose targets are held on their own. A fifth since P125-PUPPY2:
 * `release_hold`, which a hold could otherwise never let through, and which guards itself (`mayRelease`).
 */
export const HOLD_EXEMPT: ReadonlySet<string> = new Set([
  'open_studio',
  'session_status',
  'find_tools',
  'call_tool',
  'release_hold'
]);

/**
 * P125-PUPPY2 (Richard, 2026-10-24): "if the user hits hold, then asks for something like a colour change, the hold
 * should probably be auto-lifted by the model". The person's next message asking for a change IS the release; what
 * must never happen is the agent lifting a hold in the turn the hold stopped. The server cannot see turns, but it
 * sees the refusals: a model still in that turn calls tools, and every call is refused. So a release is refused
 * while the last refusal is this recent — a model that keeps calling keeps the window open.
 */
export const RELEASE_AFTER_REFUSAL_MS = 30_000;
const lastRefusal = new Map<string, number>();

/** When the hold last refused a call in this project (ms), for `release_hold`'s same-turn guard. */
export function lastHoldRefusal(projectDir: string): number | undefined {
  return lastRefusal.get(projectDir);
}

export type ReleaseOutcome =
  | { released: true; hold: Hold }
  | { released: false; reason: 'not-held' }
  | { released: false; reason: 'same-turn'; secondsAgo: number };

/** Whether the agent may lift this project's hold now (it does not lift it: the caller asks Studio, or removes the file). */
export function mayRelease(projectDir: string, now = Date.now()): ReleaseOutcome {
  const hold = readHold(projectDir);
  if (!hold.held) return { released: false, reason: 'not-held' };
  const refused = lastRefusal.get(projectDir);
  if (refused !== undefined && now - refused < RELEASE_AFTER_REFUSAL_MS) {
    return { released: false, reason: 'same-turn', secondsAgo: Math.round((now - refused) / 1000) };
  }
  return { released: true, hold };
}

/**
 * The recorder with the hold in front of every handler registered through it.
 *
 * `registerTool(name, config, handler)` is the one shape every registration in this server uses (the recorder
 * forwards that and nothing else, `disclosure.ts`), so wrapping the last argument covers them all. The check runs
 * per call, against the binding as it is then: a server that binds a project later is held by that project's file.
 */
export function holdGate(rec: McpServer, binding: ProjectBinding, exempt: ReadonlySet<string> = HOLD_EXEMPT): McpServer {
  const proxy = Object.create(rec) as McpServer;
  proxy.registerTool = ((name: string, ...rest: unknown[]) => {
    const handler = rest[rest.length - 1];
    if (typeof handler === 'function' && !exempt.has(name)) {
      rest[rest.length - 1] = async (...args: unknown[]) => {
        const dir = binding.projectDir;
        if (dir !== undefined) {
          const hold = readHold(dir);
          if (hold.held) {
            lastRefusal.set(dir, Date.now());
            return errorResult(holdError(hold));
          }
        }
        return (handler as (...a: unknown[]) => unknown)(...args);
      };
    }
    return (rec.registerTool as (...a: unknown[]) => RegisteredTool)(name, ...rest);
  }) as McpServer['registerTool'];
  return proxy;
}
