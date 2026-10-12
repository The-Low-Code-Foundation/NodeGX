/**
 * What a node's card is titled when its author has typed no label (P107 NSP-021 §3.2, s90).
 *
 * Forty-five node types title their card from one of their own ports (`usePortAsLabel`): a Variable shows its name, an
 * Expression its expression, a Text its text. The editor has always done this (`BasicNodeType.labelForNode`); the agent
 * server never read the field — the catalog did not carry it — and named all of them by type. Measured over 357
 * projects (258 of Richard's, 122,451 nodes): 17,130 nodes in 169 projects whose card says "screenWidth" where the agent
 * read "Variable".
 *
 * R24 (Richard, 2026-10-12, "Card title + type"): the agent names a node by its card title with the type beside it. The
 * rule has one body, here; the editor's `labelForNode` and the agent's `describe.ts` call it.
 *
 * @module project-contract/node-title
 */

/** What the rule reads of a node type: the runtime's node library export, or the catalog (which copies it). */
export interface TitleType {
  /** The port whose value titles the card. */
  usePortAsLabel?: string;
  /** `filename` keeps the part after the last `/`; `length` cuts past 36 characters. */
  portLabelTruncationMode?: string;
}

const MAX_LENGTH = 36;

/**
 * The title a node's own port gives its card, or `undefined` when the type titles no card from a port, or the port holds
 * nothing that reads as text (unset, empty, or an object other than an expression). An expression shows its text — the
 * name the author typed — never its fallback.
 */
export function portTitle(parameters: Readonly<Record<string, unknown>> | undefined, type: TitleType): string | undefined {
  const port = type.usePortAsLabel;
  if (!port || !parameters) return undefined;
  const raw = parameters[port];
  if (!raw) return undefined;
  const value = isExpression(raw) ? raw.expression : raw;
  if (value === null || value === undefined || typeof value === 'object') return undefined;
  let title = String(value);
  if (title.length === 0) return undefined;
  if (type.portLabelTruncationMode === 'filename') title = title.split('/').pop() as string;
  else if (type.portLabelTruncationMode === 'length' && title.length > MAX_LENGTH) title = title.slice(0, MAX_LENGTH - 3) + '...';
  return title;
}

function isExpression(v: unknown): v is { expression: string } {
  return typeof v === 'object' && v !== null && (v as { mode?: unknown }).mode === 'expression' && typeof (v as { expression?: unknown }).expression === 'string';
}
