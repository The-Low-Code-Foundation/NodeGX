/**
 * P109-S12 — an argument a tool does not have is refused by name, in that call.
 *
 * Every tool's arguments are a zod object, and zod's default is to STRIP a key it does not know. So an agent that
 * wrote `visualRoots` (the spelling the `set_visual_roots` plan op uses) to `create_component` (whose key is
 * `visual_roots`) had the argument dropped before the handler ran: the write succeeded, with no roots, and nothing
 * said so (ISL-015's stranger round, 2026-10-03).
 *
 * The check sits at the one place every call passes before its handler: the SDK's `validateToolInput`, overridden on
 * this server's instance. That sees the arguments as sent, for all tools at once, and leaves the advertised schemas
 * exactly as they were (no `additionalProperties` change, no tool-list tokens). A tool whose top-level object is
 * `.passthrough()` or has a catchall takes extra keys by design and is left alone.
 *
 * Refused, not reported: nothing is written, so the caller sends the call again with the right name instead of
 * finding out later that half of a successful write is missing.
 *
 * @module noodl-mcp/tools/unknownArguments
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { ToolErrorPayload } from './responses';

/** The keys a zod v3 object declares, or `undefined` when it takes keys it does not declare (or is not an object). */
function declaredKeys(schema: unknown): string[] | undefined {
  const def = (schema as { _def?: { typeName?: string; unknownKeys?: string; catchall?: { _def?: { typeName?: string } } } })?._def;
  if (!def || def.typeName !== 'ZodObject') return undefined;
  if (def.unknownKeys !== 'strip' && def.unknownKeys !== 'strict') return undefined;
  if (def.catchall && def.catchall._def?.typeName !== 'ZodNever') return undefined;
  return Object.keys((schema as { shape: Record<string, unknown> }).shape);
}

const fold = (key: string) => key.toLowerCase().replace(/[_\-\s]/g, '');

function distance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cur = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
  }
  return row[b.length];
}

/** The declared key a misspelt one most likely meant: the same letters in another case or separator, else one or two edits away. */
/**
 * P112-OWN018-READWASTE — words a model uses for an argument the tool spells differently, which no edit distance
 * finds. Measured: Mistral Large 4 passed `create_project` a `description` in 2 of 2 rounds; the refusal offered
 * nothing, so it had to re-read the argument list. Only an entry whose target the tool declares is offered.
 */
const ARGUMENT_SYNONYMS: Record<string, readonly string[]> = {
  description: ['summary', 'intent', 'request'],
  desc: ['summary', 'intent'],
  title: ['name'],
  folder: ['directory', 'path'],
  dir: ['directory', 'path']
};

export function closestArgument(key: string, declared: readonly string[]): string | undefined {
  const same = declared.find((d) => fold(d) === fold(key));
  if (same) return same;
  const synonym = (ARGUMENT_SYNONYMS[fold(key)] ?? []).find((s) => declared.includes(s));
  if (synonym) return synonym;
  let best: string | undefined;
  let bestDistance = 3;
  for (const d of declared) {
    const n = distance(fold(key), fold(d));
    if (n < bestDistance) {
      best = d;
      bestDistance = n;
    }
  }
  return best;
}

/** The keys `args` carries that the schema does not declare — `[]` when it declares them all, or takes any key. */
export function unknownArgumentKeys(schema: unknown, args: unknown): string[] {
  const declared = declaredKeys(schema);
  if (!declared || !args || typeof args !== 'object' || Array.isArray(args)) return [];
  return Object.keys(args).filter((key) => !declared.includes(key));
}

/** The refusal, in the door's own error shape (`{ error: { code, message, details } }`). */
export function unknownArgumentsRefusal(tool: string, schema: unknown, unknown: readonly string[]): ToolErrorPayload {
  const declared = declaredKeys(schema) ?? [];
  const named = unknown.map((key) => {
    const meant = closestArgument(key, declared);
    return meant ? `"${key}" (did you mean "${meant}"?)` : `"${key}"`;
  });
  return {
    error: {
      code: 'invalid-argument',
      message:
        `${tool} has no argument ${named.join(', ')}. Nothing was done: an argument a tool does not have would be ` +
        `dropped without a word. Its arguments are: ${declared.join(', ')}.`,
      details: {
        unknownArguments: [...unknown],
        didYouMean: Object.fromEntries(unknown.map((key) => [key, closestArgument(key, declared) ?? null]))
      }
    }
  };
}

type ValidatingServer = { validateToolInput(tool: { inputSchema?: unknown }, args: unknown, toolName: string): Promise<unknown> };

/**
 * Install the check on one server. The SDK calls `this.validateToolInput` for every `tools/call` inside the try that
 * turns a throw into an error result (`isError: true`, the message as its text), so the refusal arrives as one.
 * `tests/unknownArguments.test.ts` pins that assumption through a real client.
 */
export function refuseUnknownArguments(server: McpServer): void {
  const s = server as unknown as ValidatingServer;
  const original = s.validateToolInput.bind(server);
  s.validateToolInput = async (tool, args, toolName) => {
    const unknown = unknownArgumentKeys(tool.inputSchema, args);
    if (unknown.length > 0) throw new Error(JSON.stringify(unknownArgumentsRefusal(toolName, tool.inputSchema, unknown), null, 2));
    return original(tool, args, toolName);
  };
}
