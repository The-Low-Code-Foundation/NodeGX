/**
 * P109 ISL-005 (+ ISL-020) — the door to a project's script files, `scripts/**.js`.
 *
 * A project keeps shared JavaScript as plain files; a Function lists the ones it uses in its `uses`
 * parameter and reaches each as `Scripts.<file name>`; inside a file another is reached with
 * `use('engine/world')` and what a file offers is what it puts on `exports`. These tools are how an
 * agent reads and changes those files without touching a component:
 *
 * - `list_script_files` — every file, with what it gives (`exports.x`), what it uses (`use()`) and
 *   which Functions use it.
 * - `get_script_file` — one file, whole or a range of lines (a big engine is read in parts).
 * - `write_script_file` — create or replace one file, whole.
 * - `edit_script_file` — ISL-020's shape: find-and-replace with the number of matches the agent
 *   expects, so a one-line fix sends one line and a wrong guess changes nothing.
 * - `delete_script_file`.
 *
 * Every write is checked before it lands: the path must stay inside `scripts/` and end in `.js` (the
 * runtime's own `normalizeScriptPath`), and the text must compile as a script file compiles in the
 * app — refused with the line when it does not. Writes are atomic (temp + rename), as every other
 * write in this server.
 *
 * Deferred (the `project` group): appending costs 0 resident tokens, and `find_tools` reaches every
 * tool here by the word "script" in its name.
 *
 * @module tools/scriptTools
 */

import * as fs from 'fs';
import * as path from 'path';
import * as vm from 'vm';

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { normalizeScriptPath, scriptGives, scriptUses, scriptUsesOf } from '@noodl/runtime/src/scriptfiles';

import { ToolError } from '../errors';
import type { ProjectBinding } from '../project/ProjectBinding';
import type { ProjectStore } from '../project/ProjectStore';
import { guarded, jsonResult } from './util';

/** The folder, relative to the project. */
export const SCRIPTS_DIR = 'scripts';

/** Largest script file these tools read or write in one call (the island's biggest script was 183 KB). */
const MAX_SCRIPT_BYTES = 512_000;

/** Every script file under `scripts/`, as the project names them (`engine/world.js`), sorted. */
export function listScriptPaths(projectDir: string): string[] {
  const root = path.join(projectDir, SCRIPTS_DIR);
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.js')) {
        const p = normalizeScriptPath(path.relative(root, full).split(path.sep).join('/'));
        if (p !== undefined) out.push(p);
      }
    }
  };
  if (fs.existsSync(root)) walk(root);
  return out.sort();
}

/** A script path the caller wrote, resolved inside `scripts/`, or refused. */
function resolveScript(store: ProjectStore, input: string): { rel: string; abs: string } {
  const rel = normalizeScriptPath(input);
  if (rel === undefined) {
    throw new ToolError(
      'invalid-argument',
      `"${input}" is not a script file path. Write it relative to scripts/, e.g. "engine/world.js"; ".." is not allowed.`
    );
  }
  const root = path.resolve(store.projectDir, SCRIPTS_DIR);
  const abs = path.resolve(root, ...rel.split('/'));
  if (!abs.startsWith(root + path.sep)) {
    throw new ToolError('invalid-argument', `"${input}" resolves outside the project's scripts/ folder.`);
  }
  return { rel, abs };
}

/**
 * Does `source` compile as a script file compiles in the app? `undefined` when it does; else the
 * message and the line in the file. Compiled in a `vm.Script` wrapped the way the runtime wraps it
 * (`use, exports, module, Noodl, window, document`), so the line is the file's own: the wrapper adds
 * one line in front, which is taken off.
 */
export function scriptSyntaxError(source: string, rel: string): { message: string; line?: number } | undefined {
  // The verdict is the runtime's own compile (`new Function`), so a text that would close the wrapper
  // early is refused here exactly as it fails there; `vm` is asked only for the line, which
  // `new Function` does not give.
  try {
    new Function('use', 'exports', 'module', 'Noodl', 'window', 'document', source);
    return undefined;
  } catch (e) {
    const err = e as Error;
    let line: number | undefined;
    try {
      new vm.Script('(function (use, exports, module, Noodl, window, document) {\n' + source + '\n})', {
        filename: 'scripts/' + rel
      });
    } catch (located) {
      const stack = (located as Error).stack;
      const match = typeof stack === 'string' ? new RegExp('scripts/' + escapeRegExp(rel) + ':(\\d+)').exec(stack) : null;
      if (match) line = Math.max(1, Number(match[1]) - 1);
    }
    return { message: err.message, ...(line !== undefined ? { line } : {}) };
  }
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Every Function in the project, by component, with the script files its `uses` names. */
export function functionUses(store: ProjectStore): Array<{ component: string; nodeId: string; label?: string; uses: string[] }> {
  const rows: Array<{ component: string; nodeId: string; label?: string; uses: string[] }> = [];
  const registry = store.readRegistry();
  for (const [key, entry] of Object.entries(registry.components ?? {})) {
    const nodesFile = path.join(store.componentDir(entry), 'nodes.json');
    if (!fs.existsSync(nodesFile)) continue;
    let nodes: Array<{ id: string; type: string; label?: string; parameters?: Record<string, unknown> }> = [];
    try {
      nodes = JSON.parse(fs.readFileSync(nodesFile, 'utf8')).nodes ?? [];
    } catch {
      continue;
    }
    for (const node of nodes) {
      if (node.type !== 'JavaScriptFunction') continue;
      const uses = scriptUsesOf(node.parameters?.uses);
      if (uses.length > 0) rows.push({ component: '/' + key, nodeId: node.id, ...(node.label ? { label: node.label } : {}), uses });
    }
  }
  return rows;
}

function readScript(store: ProjectStore, input: string): { rel: string; abs: string; source: string } {
  const { rel, abs } = resolveScript(store, input);
  if (!fs.existsSync(abs)) {
    throw new ToolError('not-found', `No script file scripts/${rel} in this project.`, {
      available: listScriptPaths(store.projectDir)
    });
  }
  const bytes = fs.statSync(abs).size;
  if (bytes > MAX_SCRIPT_BYTES) {
    throw new ToolError('invalid-argument', `scripts/${rel} is ${bytes} bytes, more than these tools handle (${MAX_SCRIPT_BYTES}).`);
  }
  return { rel, abs, source: fs.readFileSync(abs, 'utf8') };
}

/** The one write path: size cap, compile check, mkdir, atomic write. */
function writeScript(store: ProjectStore, input: string, source: string): { path: string; created: boolean; bytes: number; lines: number } {
  const { rel, abs } = resolveScript(store, input);
  const bytes = Buffer.byteLength(source, 'utf8');
  if (bytes > MAX_SCRIPT_BYTES) {
    throw new ToolError('invalid-argument', `The script is ${bytes} bytes, more than these tools handle (${MAX_SCRIPT_BYTES}). Split it into files.`);
  }
  const syntax = scriptSyntaxError(source, rel);
  if (syntax) {
    throw new ToolError(
      'validation-failed',
      `scripts/${rel} does not compile${syntax.line !== undefined ? ' (line ' + syntax.line + ')' : ''}: ${syntax.message}. Nothing was written.`,
      { path: rel, ...syntax }
    );
  }
  const existed = fs.existsSync(abs);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  const tmp = `${abs}.tmp-${process.pid}-${Math.random().toString(36).slice(2, 8)}`;
  fs.writeFileSync(tmp, source, 'utf8');
  fs.renameSync(tmp, abs);
  return { path: rel, created: !existed, bytes, lines: source.split('\n').length };
}

/** Always-registered read tools. */
export function registerScriptReadTools(server: McpServer, binding: ProjectBinding): void {
  server.registerTool(
    'list_script_files',
    {
      title: 'List script files',
      description:
        "The project's script files: shared JavaScript under scripts/, which a Function uses by listing the file in " +
        'its `uses` parameter and calling it as Scripts.<file name> (scripts/engine/world.js is Scripts.world). ' +
        'Each row says what the file gives (exports.x), which files it uses (use("…")) and which Functions use it.',
      inputSchema: {}
    },
    guarded(() => {
      const store = binding.require();
      const users = functionUses(store);
      const files = listScriptPaths(store.projectDir).map((rel) => {
        const abs = path.join(store.projectDir, SCRIPTS_DIR, ...rel.split('/'));
        const source = fs.readFileSync(abs, 'utf8');
        return {
          path: rel,
          name: 'Scripts.' + rel.substring(rel.lastIndexOf('/') + 1).replace(/\.js$/, ''),
          bytes: Buffer.byteLength(source, 'utf8'),
          lines: source.split('\n').length,
          gives: scriptGives(source),
          uses: scriptUses(source),
          usedBy: users
            .filter((u) => u.uses.includes(rel))
            .map((u) => u.component + ' / ' + (u.label ?? u.nodeId))
        };
      });
      return jsonResult({
        files,
        note:
          files.length === 0
            ? 'No script files yet. write_script_file creates one; a Function then lists it in `uses`.'
            : 'Inside a file: use("engine/world") reaches another file and exports.name = … offers a value. A file sees no Noodl, window or document — calls into the app stay in the Function.'
      });
    })
  );

  server.registerTool(
    'get_script_file',
    {
      title: 'Get a script file',
      description:
        'Read one script file under scripts/ (e.g. "engine/world.js"). Give from_line/to_line to read part of a big ' +
        'file; the reply says how many lines it has.',
      inputSchema: {
        path: z.string().describe('Path relative to scripts/, e.g. "engine/world.js"'),
        from_line: z.number().int().min(1).optional().describe('First line to return (1-based)'),
        to_line: z.number().int().min(1).optional().describe('Last line to return, inclusive')
      }
    },
    guarded((args: { path: string; from_line?: number; to_line?: number }) => {
      const { rel, source } = readScript(binding.require(), args.path);
      const lines = source.split('\n');
      const ranged = args.from_line !== undefined || args.to_line !== undefined;
      const from = args.from_line ?? 1;
      const to = Math.min(args.to_line ?? lines.length, lines.length);
      return jsonResult({
        path: rel,
        lines: lines.length,
        bytes: Buffer.byteLength(source, 'utf8'),
        ...(ranged ? { from_line: from, to_line: to, content: lines.slice(from - 1, to).join('\n') } : { content: source })
      });
    })
  );
}

/** Write tools — only when --allow-writes. */
export function registerScriptWriteTools(server: McpServer, binding: ProjectBinding): void {
  server.registerTool(
    'write_script_file',
    {
      title: 'Write a script file',
      description:
        'Create or replace one script file under scripts/ — WHOLE FILE. Refused, with the line, if it does not ' +
        'compile. For a change to part of an existing file use edit_script_file, which sends only the change.',
      inputSchema: {
        path: z.string().describe('Path relative to scripts/, e.g. "engine/world.js"'),
        content: z.string().describe('The complete file')
      }
    },
    guarded((args: { path: string; content: string }) => {
      return jsonResult({ ok: true, ...writeScript(binding.require(), args.path, args.content) });
    })
  );

  server.registerTool(
    'edit_script_file',
    {
      title: 'Edit a script file',
      description:
        'Change part of a script file by find-and-replace. Each edit names the exact text to find and how many times ' +
        'it should appear (default 1); if the count differs, nothing is changed and the reply says what was found. ' +
        'Edits apply in order; the result must compile.',
      inputSchema: {
        path: z.string().describe('Path relative to scripts/, e.g. "engine/world.js"'),
        edits: z
          .array(
            z.object({
              find: z.string().min(1).describe('Exact text to find'),
              replace: z.string().describe('Text to put in its place'),
              count: z.number().int().min(1).optional().describe('How many times `find` appears (default 1); every one is replaced')
            })
          )
          .min(1)
      }
    },
    guarded((args: { path: string; edits: Array<{ find: string; replace: string; count?: number }> }) => {
      const store = binding.require();
      const { rel, source } = readScript(store, args.path);
      let next = source;
      args.edits.forEach((edit, i) => {
        const expected = edit.count ?? 1;
        const found = next.split(edit.find).length - 1;
        if (found !== expected) {
          throw new ToolError(
            'conflict',
            `Edit ${i + 1}: expected ${expected} match${expected === 1 ? '' : 'es'} of the find text in scripts/${rel}, found ${found}. Nothing was changed.`,
            { path: rel, edit: i + 1, expected, found }
          );
        }
        next = next.split(edit.find).join(edit.replace);
      });
      return jsonResult({ ok: true, edits: args.edits.length, ...writeScript(store, rel, next) });
    })
  );

  server.registerTool(
    'delete_script_file',
    {
      title: 'Delete a script file',
      description: 'Delete one script file under scripts/. Refused while a Function still lists it in `uses`, naming them.',
      inputSchema: {
        path: z.string().describe('Path relative to scripts/, e.g. "engine/world.js"')
      }
    },
    guarded((args: { path: string }) => {
      const store = binding.require();
      const { rel, abs } = readScript(store, args.path);
      const users = functionUses(store).filter((u) => u.uses.includes(rel));
      if (users.length > 0) {
        throw new ToolError('conflict', `scripts/${rel} is used by ${users.length} Function${users.length === 1 ? '' : 's'}. Take it out of their Uses first.`, {
          usedBy: users.map((u) => u.component + ' / ' + (u.label ?? u.nodeId))
        });
      }
      fs.unlinkSync(abs);
      return jsonResult({ ok: true, path: rel, deleted: true });
    })
  );
}
