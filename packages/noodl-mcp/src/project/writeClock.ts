/**
 * P109 ISL-019 — the one source of time and component ids for everything the door writes.
 *
 * Before this, every write path minted its own: `crypto.randomUUID()` for a new component's id
 * and `new Date()` for each `created`/`modified`, in `author.ts`, `ProjectStore.ts`,
 * `pageRegistration.ts` and the library install. So the same plan applied twice left two projects
 * that differed in every `component.json`, `_registry.json` and `nodegx.project.json`, and a
 * component an agent rebuilt read in git as a rewritten file. The template generators repaired it
 * afterwards with three test-side pins (`tests/templatePins.ts`).
 *
 * Two rules, ruled 2026-10-02 ("Keep the same id", ISL-019 §5 ruling 2, and ruling 1 taken as
 * the engineering default):
 *
 * - **A component's id is derived, always:** a UUIDv5-shaped SHA-1 of `<namespace>:<legacyName>`.
 *   In an ordinary session the namespace is the project's own `id` (its name when it has none),
 *   so a component deleted and recreated at the same path gets its old id back — the cost the
 *   ruling accepted. The pins' formula exactly, so a reproducible server reproduces the garden.
 * - **Timestamps stay on the wall clock** — a person reads them — unless whoever starts the
 *   server asks for reproducible output (`createServer({ reproducible })`, `--reproducible
 *   <namespace>@<epoch>`): then every stamp is the epoch and the namespace is the one given. The
 *   model never sees the switch; no tool schema carries it (the resident surface has 5 tokens of
 *   headroom, README §8).
 *
 * @module noodl-mcp/project/writeClock
 */
import { createHash } from 'crypto';

export interface ReproducibleOutput {
  /** Replaces the project's own id as the component-id namespace (a generator's `'cg003'`). */
  namespace: string;
  /** Every `created`/`modified`/`lastUpdated` the door writes. An ISO-8601 string. */
  epoch: string;
}

/** A stable UUID-shaped id for a component, derived from its legacy name and a namespace alone. */
export function stableComponentId(namespace: string, legacyName: string): string {
  const h = createHash('sha1').update(`${namespace}:${legacyName}`).digest('hex');
  // UUIDv5 layout: version nibble 5, variant nibble 8.
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

/**
 * Parse `--reproducible <namespace>@<epoch>`. The epoch must round-trip through `Date` to the
 * same ISO string, so a typo is refused at startup rather than written into every file.
 */
export function parseReproducibleFlag(value: string): ReproducibleOutput {
  const at = value.lastIndexOf('@');
  const namespace = at > 0 ? value.slice(0, at) : '';
  const epoch = at > 0 ? value.slice(at + 1) : '';
  const parsed = new Date(epoch);
  if (!namespace || Number.isNaN(parsed.getTime()) || parsed.toISOString() !== epoch) {
    throw new Error(
      `--reproducible expects <namespace>@<epoch>, the epoch as a full ISO-8601 UTC time ` +
        `(e.g. cg003@2026-09-27T00:00:00.000Z); got "${value}".`
    );
  }
  return { namespace, epoch };
}

export class WriteClock {
  constructor(readonly reproducible?: ReproducibleOutput) {}

  /** The stamp for a `created`/`modified` written now. */
  now(): string {
    return this.reproducible?.epoch ?? new Date().toISOString();
  }

  /**
   * The id for the component at `legacyName`. `projectNamespace` is the project's own id or name,
   * used when the server was not started reproducible.
   */
  componentId(projectNamespace: string, legacyName: string): string {
    return stableComponentId(this.reproducible?.namespace ?? projectNamespace, legacyName);
  }
}
