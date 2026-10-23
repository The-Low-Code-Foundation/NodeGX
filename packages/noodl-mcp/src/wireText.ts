/**
 * P112 OWN-026 FIX-04 A — a wire written as one line, the way `read_graph` prints it.
 *
 * ## Why
 *
 * The write doors took a connection as a four-key object only:
 * `{"fromId": "a", "fromProperty": "click", "toId": "b", "toProperty": "run"}`. Measured on t2-nodegx-c03 (a new page,
 * 174 nodes): 486 wires were 61k of the 152k characters DeepSeek wrote as graph operations, about 128 characters a
 * wire, and the same feature as code was 90k characters in all. The graph as text (`graphText.ts`) already prints a
 * wire as `a.click -> b.run`; written that way, with a bare string standing for `add_connection` in `operations`,
 * c03's writes come to 113k (−26%). The same four fields arrive in the handler, so the files written are identical.
 *
 * ## The rule
 *
 * `fromId.port -> toId.port` (or `→`). Each end splits at its FIRST dot: node ids carry no dots (an editor id is a
 * uuid; none of the authored ids in the lab's apps has one), while a few catalog ports do (`scrollToIndex.do` on
 * Group, `snapToPositionX.value` on Drag), so the port is everything after it. Spaces around the arrow are free; a
 * port name with spaces inside (a Component Inputs port) is kept as written. A node whose id has a dot needs the
 * object form.
 */

import { z } from 'zod';

import type { ConnectionV2 } from '@nodegx/project-contract/format';

const ARROW = /\s*(?:->|→)\s*/;

function endpoint(text: string): { id: string; port: string } | undefined {
  const at = text.indexOf('.');
  if (at <= 0 || at === text.length - 1) return undefined;
  const id = text.slice(0, at).trim();
  const port = text.slice(at + 1).trim();
  if (!id || !port || /\s/.test(id)) return undefined;
  return { id, port };
}

/** `"a.click -> b.run"` as a connection, or `undefined` when the text is not one wire. */
export function parseWire(text: string): Pick<ConnectionV2, 'fromId' | 'fromProperty' | 'toId' | 'toProperty'> | undefined {
  const sides = text.trim().split(ARROW);
  if (sides.length !== 2) return undefined;
  const from = endpoint(sides[0]);
  const to = endpoint(sides[1]);
  if (!from || !to) return undefined;
  return { fromId: from.id, fromProperty: from.port, toId: to.id, toProperty: to.port };
}

/** The line `parseWire` reads, for a connection — what `read_graph` prints. */
export function formatWire(c: Pick<ConnectionV2, 'fromId' | 'fromProperty' | 'toId' | 'toProperty'>): string {
  return `${c.fromId}.${c.fromProperty} -> ${c.toId}.${c.toProperty}`;
}

/**
 * A wire line, parsed into the four fields — a refusal in the caller's words when it is not one. Undescribed on
 * purpose: it sits in five places of two resident tools, and the resident surface has a token budget (AWP-006); the
 * two tool descriptions say it once each.
 */
export const wireTextSchema = z
  .string()
  .transform((text, ctx) => {
    const wire = parseWire(text);
    if (!wire) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${JSON.stringify(text)} is not a wire: write "fromId.port -> toId.port" (one arrow, a dot after each node id)`
      });
      return z.NEVER;
    }
    return wire;
  });
