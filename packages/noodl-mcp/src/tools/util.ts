/**
 * Shared plumbing for tool handlers: JSON results and structured errors.
 *
 * Error responses are part of the API surface (SUB-008: "error responses
 * matter as much as success responses") — every failure carries a machine
 * `code` and, for validation failures, the full diagnostic objects plus
 * human-readable lines, so the agent's next attempt is informed by the error
 * alone.
 */

import { ToolError } from '../errors';
import { ensureProjectOverlayFresh } from '../kitOverlay';
import type { ToolErrorPayload } from './responses';

/**
 * MCP content blocks a tool may return.
 *
 * Image blocks arrived with LAS-005's `render_report`: the report's numbers say
 * five images failed to load, and only the picture says the sixth is a
 * motorcycle. Everything else in this server returns one text block.
 */
export type ToolContent =
  | { type: 'text'; text: string }
  | { type: 'image'; data: string; mimeType: string };

export interface ToolResult {
  [key: string]: unknown;
  content: ToolContent[];
  isError?: boolean;
}

// P112-OWN018-READWASTE — compact, not indented: two-space indentation was 19% of every character an agent read
// (126k of 651k in OWN-018's measured sitting), re-sent on every later turn. Models read compact JSON as well.
export function jsonResult(payload: unknown): ToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(payload) }] };
}

export function errorResult(error: ToolError): ToolResult {
  const payload: ToolErrorPayload = {
    error: { code: error.code, message: error.message, ...(error.data ? { details: error.data } : {}) }
  };
  return {
    isError: true,
    content: [{ type: 'text', text: JSON.stringify(payload) }]
  };
}

/** Wraps a handler so ToolErrors become structured error results. */
export function guarded<A>(fn: (args: A) => ToolResult | Promise<ToolResult>): (args: A) => Promise<ToolResult> {
  return async (args: A) => {
    try {
      // P109 ISL-015 AC5: a kit written to disk since the last call (a file tool, a person's editor) is read first.
      ensureProjectOverlayFresh();
      return await fn(args);
    } catch (err) {
      if (err instanceof ToolError) return errorResult(err);
      return errorResult(new ToolError('io-error', `Unexpected failure: ${(err as Error).message}`));
    }
  };
}
