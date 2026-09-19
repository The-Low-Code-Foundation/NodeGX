/**
 * FED-005 §3.2 — the tools one API key sees, computed per request.
 *
 * ## The shape, and why it is this one
 *
 * 🔴 **The surface is DERIVED from the same functions that enforce it, never
 * declared beside them.** Every collection tool exists because
 * {@link checkClp} said yes for this principal and this operation; every
 * function tool exists because {@link checkFunctionCall} did. So a key cannot
 * be OFFERED a tool the gate would then refuse, and — the half that matters —
 * a key cannot be offered a tool the gate would *allow but nobody intended*.
 * That is what "safe by construction rather than by a check" means here: there
 * is no list of exclusions to keep in step with the model, because there is no
 * list.
 *
 * It is also why FED-005 fixed the system-collection hole in `checkClp`
 * (register R9) rather than filtering `_`-prefixed names in this file. A filter
 * here would have made THIS surface safe and left `/classes/_Session` open to
 * the same key — one door shut, the other still swinging.
 *
 * ⚠️ **And measured, the system names never arrive here anyway.** A backend
 * with rows in `_User`, `_Session`, `_ApiKey` and `_Audit` answers
 * `GET /admin/schema` with just `["Task"]` — the schema manager's
 * `listTables()` does not report system tables. So there are two independent
 * reasons no `_Session_find` tool exists, which is a good place to be, but only
 * the gate is a security property: the listing is a convenience that could
 * reasonably change. The spec that pins this therefore calls
 * `buildToolSurface` directly with the system names in the list, because the
 * live-backend version of it passed with the hole deliberately reopened.
 *
 * ## What is deliberately absent
 *
 * - **No `_delete` tool, for any collection, ever** (FED-005 §3.2 / AC3). Not
 *   "unless the rule allows it": never. Delete stays HTTP-only and
 *   per-collection-rule, so a collection with `delete: nobody` — which is all
 *   three of the todo app's — behaves identically over MCP, and a collection
 *   with `delete: authenticated` does too. An MCP client is a thing that reads
 *   and adds; the destructive verb is not on the surface it is handed.
 * - **No resources, no prompts.** Tools only in this task.
 * - **No schema mutation, no admin anything.** The master key is refused at the
 *   door (§3.1), so none of it is reachable to begin with.
 *
 * ## Naming
 *
 * `<Collection>_find` / `_get` / `_create` / `_update`, and a function's own
 * name for a function. A cloud function may live in a folder, so its name can
 * carry a `/` (DEF-045), which an MCP tool name may not — those become `__`.
 * Uniqueness is enforced by the builder rather than assumed: a collision drops
 * the later tool and says so in `instructions`, because two tools with one name
 * is a client calling whichever the server happens to iterate to.
 *
 * @module nodegx-backend/server/mcp/toolSurface
 */

import type { Principal, SecurityConfig } from '../../security/model';
import { checkClp, checkFunctionCall } from '../../security/model';

/** A JSON Schema object, as a tool's `inputSchema`. */
export interface JsonSchemaObject {
  type: 'object';
  properties: Record<string, unknown>;
  required?: string[];
  additionalProperties?: boolean;
}

/** What a tool DOES, resolved once so dispatch is a lookup and never a re-parse of the name. */
export type ToolTarget =
  | { kind: 'collection'; collection: string; op: 'find' | 'get' | 'create' | 'update' }
  | { kind: 'function'; functionName: string };

export interface McpTool {
  name: string;
  description: string;
  inputSchema: JsonSchemaObject;
  target: ToolTarget;
}

/** One column as the schema manager reports it. Only these two fields are read here. */
export interface SchemaColumn {
  name: string;
  type?: string;
  targetClass?: string;
}

/** One deployed endpoint, as far as the surface needs to know about it. */
export interface FunctionOnSurface {
  name: string;
  allowNoAuth: boolean;
  /**
   * CWF-014's request contract, read off the Request node's parameters by
   * `requestParamSpecs`. Empty for a function that declares nothing, which is
   * every function written before that task — see {@link functionInputSchema}.
   */
  params: { name: string; type: string; required: boolean; default?: unknown }[];
}

export interface SurfaceInputs {
  config: SecurityConfig;
  principal: Principal;
  /** Every table this backend has, system ones included — `checkClp` refuses those. */
  collections: string[];
  /** Columns per collection, for the generated schemas. Absent = no column detail. */
  columnsOf: (collection: string) => SchemaColumn[];
  functions: FunctionOnSurface[];
}

export interface ToolSurface {
  tools: McpTool[];
  /**
   * The `instructions` string an MCP client shows its model. It says what this
   * backend is, and — when the list is empty or something was dropped — WHY,
   * because "no tools" with no explanation is indistinguishable from a broken
   * server.
   */
  instructions: string;
}

/** MCP tool names: letters, digits, underscore, hyphen. */
const TOOL_NAME_OK = /^[A-Za-z0-9_-]{1,120}$/;

/**
 * A declared parameter type → JSON Schema.
 *
 * `date` is a string with `format: 'date-time'` rather than a type of its own,
 * because JSON has no date and `requestContract.coerce` accepts an ISO string
 * or an epoch number for one. `*` is an undeclared parameter and gets no `type`
 * key at all — a schema that says nothing, which is the honest description of a
 * parameter the function has not described.
 */
function paramSchema(type: string): Record<string, unknown> {
  switch (type) {
    case 'string':
      return { type: 'string' };
    case 'number':
      return { type: 'number' };
    case 'boolean':
      return { type: 'boolean' };
    case 'object':
      return { type: 'object' };
    case 'array':
      return { type: 'array' };
    case 'date':
      return { type: 'string', format: 'date-time' };
    default:
      return {};
  }
}

/** A stored column type → JSON Schema, for the generated collection schemas. */
function columnSchema(column: SchemaColumn): Record<string, unknown> {
  switch (column.type) {
    case 'String':
      return { type: 'string' };
    case 'Number':
      return { type: 'number' };
    case 'Boolean':
      return { type: 'boolean' };
    case 'Date':
      return { type: 'string', format: 'date-time' };
    case 'Array':
      return { type: 'array' };
    case 'Object':
      return { type: 'object' };
    case 'Pointer':
      return {
        type: 'string',
        description: `objectId of a row in ${column.targetClass || 'another collection'}`
      };
    default:
      return {};
  }
}

/**
 * Columns a client must not be invited to write.
 *
 * `objectId`, `createdAt` and `updatedAt` are the store's; `ACL` and `owner`
 * are the security model's and are stamped by `stampCreate` from the principal
 * — offering them as writable fields would be inviting a caller to nominate a
 * different owner for a row it is creating.
 */
const NOT_WRITABLE = new Set(['objectId', 'createdAt', 'updatedAt', 'ACL', 'owner']);

function writableSchema(columns: SchemaColumn[]): Record<string, unknown> {
  const properties: Record<string, unknown> = {};
  for (const column of columns) {
    if (!column || typeof column.name !== 'string') continue;
    if (NOT_WRITABLE.has(column.name)) continue;
    properties[column.name] = columnSchema(column);
  }
  return properties;
}

/**
 * The input schema for a function tool.
 *
 * ⚠️ **A function that declares no contract gets an open schema**, not an empty
 * one: `params` is absent on every function written before CWF-014 and on every
 * shipped prefab, and a schema saying `{}` with `additionalProperties: false`
 * would tell a client the function takes nothing — which is a lie about the
 * commonest case. `additionalProperties: true` is the truthful description of
 * "this function reads its body and has not said what it expects".
 */
export function functionInputSchema(fn: FunctionOnSurface): JsonSchemaObject {
  if (fn.params.length === 0) {
    return { type: 'object', properties: {}, additionalProperties: true };
  }
  const properties: Record<string, unknown> = {};
  const required: string[] = [];
  for (const param of fn.params) {
    properties[param.name] = paramSchema(param.type);
    // A declared default beats `required` — the same precedence
    // `applyRequestContract` enforces, restated nowhere: read from the same
    // fields it reads.
    if (param.required && param.default === undefined) required.push(param.name);
  }
  const schema: JsonSchemaObject = { type: 'object', properties, additionalProperties: true };
  if (required.length > 0) schema.required = required;
  return schema;
}

/** The four collection tools, for a collection the principal may reach. */
function collectionTools(collection: string, columns: SchemaColumn[], may: (op: 'find' | 'get' | 'create' | 'update') => boolean): McpTool[] {
  const tools: McpTool[] = [];
  const fields = columns.map((c) => c && c.name).filter((n): n is string => typeof n === 'string');
  const fieldList = fields.length > 0 ? ` Fields: ${fields.join(', ')}.` : '';

  if (may('find')) {
    tools.push({
      name: `${collection}_find`,
      description: `Find rows in the "${collection}" collection of this NodeGX backend.${fieldList}`,
      inputSchema: {
        type: 'object',
        properties: {
          where: {
            type: 'object',
            description:
              'Query constraints, MongoDB/Parse style: {"status": "open"} or {"createdAt": {"$gt": "2026-01-01"}}. Omit for all rows you can see.'
          },
          order: { type: 'string', description: 'Field to sort by; prefix with "-" to reverse.' },
          limit: { type: 'number', description: 'Maximum rows to return (default 100).' },
          skip: { type: 'number', description: 'Rows to skip, for paging.' }
        },
        additionalProperties: false
      },
      target: { kind: 'collection', collection, op: 'find' }
    });
  }
  if (may('get')) {
    tools.push({
      name: `${collection}_get`,
      description: `Read one row of "${collection}" by its objectId.`,
      inputSchema: {
        type: 'object',
        properties: { objectId: { type: 'string', description: 'The row\'s objectId.' } },
        required: ['objectId'],
        additionalProperties: false
      },
      target: { kind: 'collection', collection, op: 'get' }
    });
  }
  if (may('create')) {
    tools.push({
      name: `${collection}_create`,
      description: `Add a row to "${collection}".${fieldList}`,
      inputSchema: { type: 'object', properties: writableSchema(columns), additionalProperties: true },
      target: { kind: 'collection', collection, op: 'create' }
    });
  }
  if (may('update')) {
    tools.push({
      name: `${collection}_update`,
      description: `Change fields on one row of "${collection}". Only the fields you send are written.`,
      inputSchema: {
        type: 'object',
        properties: {
          objectId: { type: 'string', description: 'The row to change.' },
          ...writableSchema(columns)
        },
        required: ['objectId'],
        additionalProperties: true
      },
      target: { kind: 'collection', collection, op: 'update' }
    });
  }
  // 🔴 No `_delete`. See the module docblock — this is not an omission.
  return tools;
}

/**
 * The tools this principal may use, and the instructions that go with them.
 *
 * Pure: everything it needs is passed in, so the whole surface is testable
 * without a server, and the specs that assert AC1 "by count and by name" do not
 * have to start one to do it.
 */
export function buildToolSurface(inputs: SurfaceInputs): ToolSurface {
  const { config, principal, collections, columnsOf, functions } = inputs;
  const tools: McpTool[] = [];
  const taken = new Set<string>();
  const skipped: string[] = [];

  const add = (tool: McpTool): void => {
    if (!TOOL_NAME_OK.test(tool.name) || taken.has(tool.name)) {
      skipped.push(tool.name);
      return;
    }
    taken.add(tool.name);
    tools.push(tool);
  };

  for (const collection of [...collections].sort()) {
    const may = (op: 'find' | 'get' | 'create' | 'update'): boolean =>
      checkClp(config, principal, collection, op).allowed;
    // Cheapest question first: a collection this principal cannot touch at all
    // costs one `checkClp` rather than four plus a schema read.
    if (!may('find') && !may('get') && !may('create') && !may('update')) continue;
    let columns: SchemaColumn[] = [];
    try {
      columns = columnsOf(collection) || [];
    } catch {
      // A table listed by the schema manager that it cannot then describe
      // yields a tool with no field detail, not a 500 on the whole listing.
      columns = [];
    }
    for (const tool of collectionTools(collection, columns, may)) add(tool);
  }

  for (const fn of [...functions].sort((a, b) => a.name.localeCompare(b.name))) {
    if (!checkFunctionCall(config, principal, fn.name, fn.allowNoAuth).allowed) continue;
    add({
      // DEF-045: a folder'd function's name carries a slash, which a tool name
      // may not hold.
      name: fn.name.replace(/\//g, '__'),
      description: describeFunction(fn),
      inputSchema: functionInputSchema(fn),
      target: { kind: 'function', functionName: fn.name }
    });
  }

  return { tools, instructions: instructionsFor(tools, skipped) };
}

/**
 * A function's description.
 *
 * 🔴 **FED-005 §3.2 asks for "the component's description" and a deployed
 * bundle does not carry one.** Measured 2026-09-19 at
 * `noodl-editor/.../exporter/util.ts` — `exportComponent` builds
 * `{name, nodes, connections, ports, roots, metadata}` and drops
 * `ComponentModel.description` on the floor, so the sentence an author writes
 * in the editor never reaches a backend. Carrying it would be an EDITOR change,
 * which ruling R4 puts outside this phase (register R10).
 *
 * So the description is built from what the bundle DOES carry — the name and
 * the declared contract — rather than left blank. A model choosing between
 * tools reads this string, and "no description" is the one answer guaranteed to
 * be useless.
 */
function describeFunction(fn: FunctionOnSurface): string {
  const named = fn.params.filter((p) => p.name).map((p) => (p.required && p.default === undefined ? `${p.name} (required)` : p.name));
  const takes = named.length > 0 ? ` Takes: ${named.join(', ')}.` : '';
  return `Run the cloud function "${fn.name}" on this NodeGX backend.${takes}`;
}

function instructionsFor(tools: McpTool[], skipped: string[]): string {
  const lines: string[] = [];
  if (tools.length === 0) {
    lines.push(
      'This NodeGX backend has no tools for the API key you connected with. The key is valid — it simply has no ' +
        'scope covering any collection or function here, or the user it acts as may not reach them. Ask whoever ' +
        'issued the key for one with classes:read / classes:write / functions:<name> scopes.'
    );
  } else {
    lines.push(
      'Tools on this NodeGX backend read and write the collections and call the cloud functions your API key is ' +
        'allowed to reach, and nothing else. The list is computed for your key on every request, so it changes when ' +
        'your permissions change.'
    );
    lines.push(
      'Rows are not deletable through this endpoint by design. To delete one, use the backend\'s HTTP API, where the ' +
        'collection\'s own delete rule applies.'
    );
  }
  if (skipped.length > 0) {
    lines.push(
      `Not listed, because the name could not be used as a tool name or collided with another: ${skipped.join(', ')}.`
    );
  }
  return lines.join('\n\n');
}
