/**
 * DEF-009 (P76 F3) — a public write door with no rate limit, and nothing says so.
 *
 * The mechanism is not missing from the platform: `nodegx-backend` has one
 * per-function token-bucket limiter (`ops/rate-limit.ts`), settable per function
 * as `functions.<name>.rateLimit = { ratePerMinute, burst }` — in the project's
 * `nodegx.security.json` (seeded into a fresh backend) or live via
 * `PUT /admin/permissions/functions/<name>`. What was missing is any surface
 * that tells the AUTHOR the limit exists to set: the boot-time warnings fire on
 * service-wide configuration, never on this endpoint being unlimited, and the
 * shipped site-builder's `submitContactForm` is `call: "public"` with no
 * `rateLimit` — the evidence row the defect was filed from. The members-area
 * template is the counterexample: `claimAssociation` ships `5/min, burst 5`.
 *
 * Where it bites: the site owner who installs a template and gives out the URL.
 * A bot finds the contact form and writes rows until the disk is full — and the
 * one person who could have set a limit was never told there was one to set.
 *
 * ## The predicate
 *
 * Fires when ALL of:
 *  - the component is a cloud function (`/#__cloud__/` name) whose Request node
 *    ticks `allowNoAuth` — the graph's own public posture
 *    (`functionDeclarations.ts`: posture defaults from the graph),
 *  - the configured `call` posture does not override it shut (an entry of
 *    `authenticated`/`role:*`/`nobody` means the HTTP gate refuses anonymous
 *    calls before the graph runs — `security/model.ts::effectiveFunctionRule`),
 *  - the graph contains a record-writing node (see {@link RECORD_WRITE_NODE_TYPES},
 *    each entry re-checked against the catalog so a renamed node type ages out
 *    loudly rather than silently — the `COMMIT_PORTS` idiom), or a script that
 *    calls a writing `Records` member ({@link RECORD_WRITE_SCRIPT_MEMBERS}),
 *  - and no `rateLimit` with `ratePerMinute > 0` is configured for the function.
 *
 * Negative arms are the acceptance: the same function WITH a `rateLimit`, and a
 * public READ-ONLY function, both produce nothing — a warning that fires on
 * every cloud function would be switched off within a week (DEF-009 AC3).
 *
 * ## What it deliberately does not do
 *
 *  - **`security` omitted (undefined) means "do not check"** — the convention
 *    `urlPaths`/`backend`/`interfaces` follow. A caller that cannot read the
 *    project root cannot tell a limited door from an unlimited one, and firing
 *    on members-area's `claimAssociation` — which IS limited — is the false
 *    positive that kills the rule. A caller that CAN read the root and finds no
 *    policy file passes `null`, which reads as "no function has an entry".
 *  - Warning severity, never blocking: the limit may legitimately be configured
 *    later, or live only on the running backend.
 *  - P124-S1-WRITESHELPER: a write inside a helper this function PLACES (a node
 *    whose type is another `/#__cloud__/` component) is the function's write,
 *    when the caller hands over the project's `views` — measured on the
 *    training product, four functions writing a thread row through
 *    `/#__cloud__/shared/Thread`. The backend's default follows the same
 *    instances. Without `views` the door sees one component, as before. A
 *    helper reached only through `Run Tasks`' template is followed by neither.
 *
 * ## What changed under it, 2026-08-30 (DEF-009 AC4)
 *
 * 🔴 **This warning used to end by saying the class bucket was "the only bound",
 * and that sentence is now false.** Richard ruled that a public, record-writing
 * cloud function with no `rateLimit` gets a real default — **60/min, burst 30,
 * per caller** (`nodegx-backend/security/model.ts`'s
 * `PUBLIC_WRITE_DEFAULT_RATE_LIMIT`), the `auth` rung of the ladder the product
 * already has. So the endpoint this fires on is no longer unmetered, and the
 * warning's job narrowed: it tells the author their door is public, writes rows,
 * and is running on a number **nobody chose for it** — which is the right
 * warning for a contact form and an urgent one for a provider webhook.
 *
 * ⚠️ **The default's list of record-writing types is a second copy of
 * {@link RECORD_WRITE_NODE_TYPES}**, in a package this one cannot import. They
 * are held equal by `nodegx-backend/tests/def009-public-write-default.test.ts`,
 * which reads this file. If you edit the list here, that spec is what tells you
 * the other half did not follow.
 *
 * @module noodl-editor/validation/publicWriteDoor
 */

import type { CatalogIndex } from './CatalogIndex';
import { DiagnosticCode, type Diagnostic } from './diagnostics';
import type { ParameterizedNode } from './parameterValues';

/** The cloud component name prefix, as `componentRuntimeOf` reads it. */
const CLOUD_PREFIX = '/#__cloud__/';

/** The Request node's stored type name. */
export const CLOUD_REQUEST_TYPE = 'noodl.cloud.request';

/**
 * The node types that create or mutate records. Narrower than DEF-004's
 * `COMMIT_PORTS` (which includes `response.send` — an answer, not a row) and
 * wider than `RECORD_WRITE_TYPES` in `cloudDynamicPorts.ts` (which serves port
 * derivation, not risk): a public door that can delete rows or rewrite
 * relations unmetered is the same standing invitation as one that inserts them.
 */
export const RECORD_WRITE_NODE_TYPES: readonly string[] = [
  'NewDbModelProperties',
  'SetDbModelProperties',
  'DeleteDbModelProperties',
  'AddDbModelRelation',
  'RemoveDbModelRelation'
];

/**
 * P124-S1-WRITESRECORDSJS — the `Noodl.Records` members a script writes with. A function that writes from a JavaScript
 * node is as public a writer as one with a record node, and the backend's default now counts it too. A second copy of
 * `RECORD_WRITE_SCRIPT_MEMBERS` in `nodegx-backend/src/workflow/functionDeclarations.ts`, held equal by the same spec
 * as the node list. Read by its text: a call in a comment counts (the safe direction), one through an alias does not.
 */
export const RECORD_WRITE_SCRIPT_MEMBERS: readonly string[] = ['create', 'save', 'delete', 'increment', 'addRelation', 'removeRelation'];

const SCRIPT_WRITE_CALL = new RegExp(`\\bRecords\\s*\\.\\s*(${RECORD_WRITE_SCRIPT_MEMBERS.join('|')})\\s*\\(`);

/** The first `Records.<write>(` call a node's script makes (`Records.save`), or undefined. */
function scriptRecordWrite(node: GraphNodeLike): string | undefined {
  const script = node.parameters?.['functionScript'];
  const m = typeof script === 'string' ? SCRIPT_WRITE_CALL.exec(script) : null;
  return m ? `Records.${m[1]}` : undefined;
}

/** One function's entry in `nodegx.security.json`'s `functions` block. */
export interface FunctionSecurityEntry {
  call?: string;
  rateLimit?: { ratePerMinute?: number; burst?: number } | null;
}

/** The `functions` block of a project's security policy. */
export type FunctionSecurityPolicy = Readonly<Record<string, FunctionSecurityEntry>>;

export interface CheckPublicWriteDoorOptions {
  /** Legacy name of the component being submitted. */
  component: string;
  /**
   * The project's per-function security policy (`functions` in
   * `nodegx.security.json`). **`undefined` means "do not check"; `null` means
   * "the project has no policy file"** — see the module docblock for why the
   * two must stay distinct.
   */
  security?: FunctionSecurityPolicy | null;
  /** The catalog, used only to age the write-node list loudly. */
  catalog?: CatalogIndex;
  /** P124-S1-WRITESHELPER: every component's nodes, so a placed cloud helper can be followed. Omitted: one component. */
  views?: readonly { name: string; nodes: readonly GraphNodeLike[] }[];
}

/** What the door reads of a node: the views the authoring door hands over carry no ids. */
type GraphNodeLike = { type: string; parameters?: Readonly<Record<string, unknown>> | null };

/**
 * The first write in `nodes`, following each placed cloud helper once (`seen`), or undefined. `via` names the helper
 * the write is in, when it is not in `nodes` itself.
 */
function firstWrite(
  nodes: readonly GraphNodeLike[],
  writeTypes: ReadonlySet<string>,
  helpers: ReadonlyMap<string, readonly GraphNodeLike[]>,
  seen: Set<string>,
  via?: string
): { writes: string; via?: string } | undefined {
  const writer = nodes.find((n) => typeof n.type === 'string' && writeTypes.has(n.type));
  if (writer) return { writes: `"${writer.type}"`, via };
  const scripted = nodes.map(scriptRecordWrite).find((call) => call !== undefined);
  if (scripted) return { writes: `a script calls ${scripted}`, via };
  for (const n of nodes) {
    if (typeof n.type !== 'string' || !n.type.startsWith(CLOUD_PREFIX) || seen.has(n.type)) continue;
    seen.add(n.type);
    const helper = helpers.get(n.type);
    const found = helper ? firstWrite(helper, writeTypes, helpers, seen, via ?? n.type) : undefined;
    if (found) return found;
  }
  return undefined;
}

export function checkPublicWriteDoor(
  nodes: readonly ParameterizedNode[],
  options: CheckPublicWriteDoorOptions
): Diagnostic[] {
  const { component, security, catalog, views } = options;
  if (security === undefined) return [];
  if (!component.startsWith(CLOUD_PREFIX)) return [];

  const request = nodes.find((n) => n.type === CLOUD_REQUEST_TYPE);
  if (!request || request.parameters?.['allowNoAuth'] !== true) return [];

  const functionName = component.slice(CLOUD_PREFIX.length);
  const entry = security?.[functionName];
  if (entry?.call !== undefined && entry.call !== 'public') return [];

  const writeTypes = new Set(
    RECORD_WRITE_NODE_TYPES.filter((t) => !catalog || catalog.hasType(t))
  );
  const helpers = new Map((views || []).filter((v) => v.name.startsWith(CLOUD_PREFIX)).map((v) => [v.name, v.nodes] as const));
  const found = firstWrite(nodes, writeTypes, helpers, new Set([component]));
  if (!found) return [];
  const writes = found.via ? `${found.writes}, in "${found.via}"` : found.writes;

  const limit = entry?.rateLimit;
  if (limit && typeof limit.ratePerMinute === 'number' && limit.ratePerMinute > 0) return [];

  // 🔴 Two states reach this line and they are no longer the same state. A door
  // with NOTHING declared runs on the backend's public-write default; a door
  // carrying a deliberate zeroed policy — the limiter's "unlimited" convention —
  // runs on nothing at all. Telling the second author they are bounded at 60/min
  // would be exactly the sentence AC4 had to come back and correct in this file.
  const optedOut = limit !== undefined && limit !== null;
  const budget = optedOut
    ? 'you have declared { "ratePerMinute": 0, "burst": 0 } for it, which is the backend\'s way of saying no ' +
      'limit at all — so anyone holding the URL can write rows as fast as they can send requests. That is a ' +
      'real answer for a webhook a provider retries; it is the wrong one for a form.'
    : 'it is running on the public-write default of 60 requests a minute, burst 30, per caller, which is a ' +
      'number nobody chose for this door. If it is a form a person fills in, that is generous and you can ' +
      'leave it. If it is a webhook a payment or delivery provider calls back, a retry storm will be ' +
      'refused: say so explicitly.';

  return [
    {
      code: DiagnosticCode.PublicWriteDoorUnlimited,
      severity: 'warning',
      message:
        `"${functionName}" accepts unauthenticated calls (its Request node ticks Allow Unauthenticated) and ` +
        `writes records (${writes}), and no working rate limit is set for it — ${budget} ` +
        `Add \`"functions": { "${functionName}": { "rateLimit": { "ratePerMinute": 10, "burst": 10 } } }\` to ` +
        "the project's nodegx.security.json (numbers to taste, or 0/0 for no limit at all), or set it on a " +
        `running backend via PUT /admin/permissions/functions/${functionName}.`,
      location: {
        component,
        nodeId: request.id,
        nodeType: request.type,
        ...(request.label ? { nodeLabel: request.label } : {}),
        port: 'allowNoAuth',
        plug: 'input' as const
      }
    }
  ];
}
