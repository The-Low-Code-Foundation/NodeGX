/**
 * `src/lib/noodl.ts` — the Noodl API a Function's script reads, as the running app hands it the `Noodl` parameter (EXP-020).
 *
 * Emitted only where a printed Function wrapper reads a member that talks to the backend; the shape of {@link
 * ./functionRunLib.ts}: constant text (but for the project's own schema table), transcribed from the files the running
 * app's members are, and shipped where something calls into it.
 *
 * - `noodl-runtime/src/api/records.js` `query` — `convertFilterOp` over the filter, then the store's query, the rows
 *   `plain` (`CloudStore._plainFromJSON`). Every front-end template body asks for plain rows (session 134's census), and
 *   the planner refuses one that does not (`jsNoodlUseOf`), so only that half is here.
 * - `nodegx-backend-contract/src/translators/{walk,translate,parse,lowering}.ts` — `toParseWhere`, the filter as the wire
 *   takes it. The capability gate is the `nodegx` table's, which refuses no operator; `relatedTo` without a class fails
 *   as the runtime's does when the record is not in its store (this app keeps no record store to look it up in).
 * - `noodl-runtime/src/api/backends/ParseWireAdapter.ts` `query` — the POST-tunnelled GET's body, and its failure:
 *   `Error(<the backend's words> || 'Failed to query.')`.
 * - `noodl-viewer-react/src/api/cloudfunctions.ts` `run` — the result, or a rejection with the backend's error body
 *   itself (scripts read `e.error`), or the runtime's own sentence where there is no body.
 * - `noodl-viewer-react/src/api/users.ts` `Current` — one shared object, its fields copied from the session on each read.
 * - `noodl-viewer-react/src/api/files.ts` `sign` with `ParseWireAdapter.signFileUrl` — `{ url, kind: 'signed', … }`.
 *
 * Where the project declares no backend the module is the same but for its wire, which fails as the running app's does
 * with none, before anything is sent (the exporter's rule for every backend node: a stub that answers the interpreter's
 * own failure, EXP-011 §41): a query rejects `Error(NO_BACKEND_CONFIGURED)` (`ParseWireAdapter._makeRequest` with no
 * address), a link `{ error: NO_BACKEND_CONFIGURED }`, a Cloud Function the viewer's own string, and nobody is signed in.
 *
 * @module emit/noodlLib
 */

import type { CollectionIR } from '../ir/types';

/** Where the module lands in the exported app. */
export const NOODL_LIB_PATH = 'src/lib/noodl.ts';

/** The project's columns the filter reads: a Date column's text goes as a date, a pointer goes with its class. */
function schemaTable(collections: CollectionIR[]): string {
  const entries = collections
    .map((c) => {
      const columns = c.columns.filter((col) => col.type === 'Date' || col.targetClass !== undefined);
      if (columns.length === 0) return null;
      const cells = columns.map(
        (col) => `${JSON.stringify(col.name)}: { type: ${JSON.stringify(col.type)}${col.targetClass !== undefined ? `, targetClass: ${JSON.stringify(col.targetClass)}` : ''} }`
      );
      return `  ${JSON.stringify(c.name)}: { ${cells.join(', ')} }`;
    })
    .filter((e): e is string => e !== null);
  return entries.length === 0 ? '{}' : `{\n${entries.join(',\n')}\n}`;
}

/** `ParseWireAdapter.NO_BACKEND_CONFIGURED`, the words a request in a project with no backend fails with. */
const NO_BACKEND_CONFIGURED = 'This project has no backend configured. Add one in the Backend panel.';

/** The wire half: the client's request and session where the project has a backend, the running app's failure where not. */
function wireSource(connected: boolean): string {
  if (connected) return "import { ENDPOINT, noodlRequest, readSession } from '../api/client';";
  return `/** This project declares no backend: every request fails as the running app's does without one, before it is sent. */
const NO_BACKEND = ${JSON.stringify(NO_BACKEND_CONFIGURED)};

async function noodlRequest(_path: string, _method: string, _body?: unknown): Promise<{ status: number; json: unknown; text: string }> {
  return { status: 0, json: { error: NO_BACKEND }, text: '' };
}

/** Nobody is signed in to a project with no backend. */
function readSession(): Record<string, unknown> | undefined {
  return undefined;
}`;
}

/** \`CloudFunctions.run\`: the call, or the viewer's own refusal where the project declares no backend. */
function runSource(connected: boolean): string {
  if (!connected) {
    return `async function run(_functionName: string, _params?: unknown): Promise<unknown> {
  throw 'No cloud services defined in this project.';
}`;
  }
  return `async function run(functionName: string, params?: unknown): Promise<unknown> {
  const answer = await noodlRequest(\`/functions/\${encodeURIComponent(functionName)}\`, 'POST', params);
  const body = answer.json as { result?: unknown } | undefined;
  if (answer.status === 200 || answer.status === 201) return body ? body.result : undefined;
  throw body !== undefined
    ? body
    : { error: answer.status === 0 ? \`Could not reach the backend at \${ENDPOINT}\` : 'Cloud function call failed with no response body' };
}`;
}

export function noodlLibSource(collections: CollectionIR[], connected = true): string {
  return `/**
 * The Noodl API a Function's script reads — the \`Noodl\` the running app hands each Function — with the members this app's
 * scripts read, each with the running app's own signature and answers:
 *
 * - \`Records.query(collection, filter, options)\` — the rows plain (\`{ plain: true }\`): the fields as stored, the id as
 *   \`objectId\`, a pointer as the id it points to, a date as its ISO text. The filter is the running app's own filter
 *   language (\`{ title: { equalTo: 'x' } }\`, \`{ and: [ … ] }\`), written on the wire as the running app writes it.
 * - \`CloudFunctions.run(name, params)\` — the function's result; a refusal rejects with the backend's error body.
 * - \`Users.Current\` — the signed-in user (\`email\`, \`username\`, \`id\`, \`emailVerified\`, \`Properties\`), or undefined.
 * - \`Files.sign(file)\` — a fresh signed link to a stored file: \`{ url, kind, expiresAt, ttlSeconds }\`.
 */

${wireSource(connected)}

type Json = Record<string, unknown>;

/** The project's columns the filter reads: a Date column's text goes as a date, a pointer goes with its class. */
const SCHEMA: Record<string, Record<string, { type?: string; targetClass?: string }>> = ${schemaTable(collections)};

/** A filter the wire cannot take — the running app's query rejects with this message. */
class FilterTranslationError extends Error {}

const FILTER_OPERATORS = [
  'equalTo', 'notEqualTo', 'lessThan', 'greaterThan', 'lessThanOrEqualTo', 'greaterThanOrEqualTo', 'containedIn',
  'notContainedIn', 'exists', 'matchesRegex', 'contains', 'notContains', 'containsIgnoreCase', 'startsWith',
  'notStartsWith', 'startsWithIgnoreCase', 'endsWith', 'notEndsWith', 'endsWithIgnoreCase', 'between', 'notBetween',
  'isEmpty', 'isNotEmpty', 'textSearch', 'pointsTo', 'relatedTo', 'path', 'idEqualTo', 'idContainedIn', 'nearSphere',
  'withinBox', 'withinPolygon'
];

type FilterNode =
  | { kind: 'empty' }
  | { kind: 'group'; combinator: 'and' | 'or'; children: unknown[] }
  | { kind: 'id'; operator: 'idEqualTo' | 'idContainedIn'; value: unknown }
  | { kind: 'relatedTo'; value: Json }
  | { kind: 'path'; value: unknown }
  | { kind: 'condition'; field: string; operator: string; value: unknown; regexOptions?: string };

function describe(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'an array';
  return typeof value;
}

/** One level of the filter, as the running app reads it. */
function parseFilterNode(filter: unknown): FilterNode {
  if (filter === null || filter === undefined) return { kind: 'empty' };
  if (typeof filter !== 'object' || Array.isArray(filter)) {
    throw new FilterTranslationError(\`A filter must be an object, found \${describe(filter)}\`);
  }
  const record = filter as Json;
  const keys = Object.keys(record);
  if (keys.length === 0) return { kind: 'empty' };
  if (keys.length !== 1) {
    throw new FilterTranslationError(
      \`A filter must have exactly one key, found \${keys.length}: \${keys.join(', ')}. \` + 'Combine conditions with { and: [ … ] } or { or: [ … ] }.'
    );
  }
  const key = keys[0];
  const value = record[key];
  if ((key === 'and' || key === 'or') && Array.isArray(value)) return { kind: 'group', combinator: key, children: value };
  if (key === 'idEqualTo' || key === 'idContainedIn') return { kind: 'id', operator: key, value };
  if (key === 'relatedTo') {
    const related = value as Json | undefined;
    if (!related || typeof related !== 'object') throw new FilterTranslationError('A relatedTo filter must be an object with id and key');
    if (related.id === undefined) throw new FilterTranslationError('Must provide id in relatedTo filter');
    if (related.key === undefined) throw new FilterTranslationError('Must provide key in relatedTo filter');
    return { kind: 'relatedTo', value: related };
  }
  if (key === 'path') return { kind: 'path', value };
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new FilterTranslationError(\`The condition on "\${key}" must be an object like { equalTo: … }, found \${describe(value)}\`);
  }
  const opAndValue = value as Json;
  const operatorKeys = Object.keys(opAndValue).filter((k) => k !== 'options');
  if (operatorKeys.length === 1 && operatorKeys[0] === 'text') {
    const text = opAndValue.text as { search?: unknown } | undefined;
    if (!text || typeof text !== 'object' || text.search === undefined) {
      throw new FilterTranslationError(\`The text filter on "\${key}" needs a search value\`);
    }
    return { kind: 'condition', field: key, operator: 'textSearch', value: text.search };
  }
  if (operatorKeys.length === 0) {
    throw new FilterTranslationError(\`The condition on "\${key}" has no operator. Expected one of: \${FILTER_OPERATORS.join(', ')}.\`);
  }
  if (operatorKeys.length > 1) {
    throw new FilterTranslationError(
      \`The condition on "\${key}" has \${operatorKeys.length} operators (\${operatorKeys.join(', ')}), \` +
        'and only one can be applied. Use "between", or combine two conditions with { and: [ … ] }.'
    );
  }
  const operator = operatorKeys[0];
  if (!FILTER_OPERATORS.includes(operator)) {
    throw new FilterTranslationError(\`"\${operator}" is not a filter operator. Expected one of: \${FILTER_OPERATORS.join(', ')}.\`);
  }
  const node: FilterNode = { kind: 'condition', field: key, operator, value: opAndValue[operator] };
  if (operator === 'matchesRegex' && typeof opAndValue.options === 'string') node.regexOptions = opAndValue.options;
  return node;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$&');
}

function lowerToRegex(operator: string, raw: unknown): { pattern: string; options?: string } | undefined {
  const value = escapeRegExp(String(raw));
  switch (operator) {
    case 'contains':
      return { pattern: value };
    case 'containsIgnoreCase':
      return { pattern: value, options: 'i' };
    case 'notContains':
      return { pattern: \`^(?![\\\\s\\\\S]*\${value})\` };
    case 'startsWith':
      return { pattern: \`^\${value}\` };
    case 'startsWithIgnoreCase':
      return { pattern: \`^\${value}\`, options: 'i' };
    case 'notStartsWith':
      return { pattern: \`^(?!\${value})\` };
    case 'endsWith':
      return { pattern: \`\${value}$\` };
    case 'endsWithIgnoreCase':
      return { pattern: \`\${value}$\`, options: 'i' };
    case 'notEndsWith':
      return { pattern: \`^(?![\\\\s\\\\S]*\${value}$)\` };
    default:
      return undefined;
  }
}

function betweenBounds(raw: unknown): [unknown, unknown] | undefined {
  return Array.isArray(raw) && raw.length === 2 ? [raw[0], raw[1]] : undefined;
}

/** A Date as the wire's date; text on a Date column too. */
function parseValue(raw: unknown, field: string, collection: string): unknown {
  if (raw instanceof Date) return { __type: 'Date', iso: raw.toISOString() };
  if (SCHEMA[collection]?.[field]?.type === 'Date' && raw !== null && raw !== undefined) {
    const asDate = new Date(String(raw));
    if (!Number.isNaN(asDate.getTime())) return { __type: 'Date', iso: asDate.toISOString() };
  }
  return raw;
}

function geoPoint(value: { latitude?: unknown; longitude?: unknown }): Json {
  return { __type: 'GeoPoint', latitude: value.latitude, longitude: value.longitude };
}

/** The operator half of a leaf, as the wire's constraints. */
function conditionValue(node: Extract<FilterNode, { kind: 'condition' }>, collection: string): Json {
  const { field, operator, value } = node;
  const v = (raw: unknown): unknown => parseValue(raw, field, collection);
  switch (operator) {
    case 'equalTo':
      return { $eq: v(value) };
    case 'notEqualTo':
      return { $ne: v(value) };
    case 'lessThan':
      return { $lt: v(value) };
    case 'greaterThan':
      return { $gt: v(value) };
    case 'lessThanOrEqualTo':
      return { $lte: v(value) };
    case 'greaterThanOrEqualTo':
      return { $gte: v(value) };
    case 'containedIn':
      return { $in: Array.isArray(value) ? value.map(v) : [v(value)] };
    case 'notContainedIn':
      return { $nin: Array.isArray(value) ? value.map(v) : [v(value)] };
    case 'exists':
      return value === false ? { $eq: null } : { $ne: null };
    case 'matchesRegex':
      return node.regexOptions === undefined ? { $regex: value } : { $regex: value, $options: node.regexOptions };
    case 'contains':
    case 'notContains':
    case 'containsIgnoreCase':
    case 'startsWith':
    case 'notStartsWith':
    case 'startsWithIgnoreCase':
    case 'endsWith':
    case 'notEndsWith':
    case 'endsWithIgnoreCase': {
      const lowered = lowerToRegex(operator, value)!;
      return lowered.options === undefined ? { $regex: lowered.pattern } : { $regex: lowered.pattern, $options: lowered.options };
    }
    case 'between': {
      const bounds = betweenBounds(value);
      if (!bounds) throw new FilterTranslationError('A "between" filter needs a two-element array [from, to]');
      return { $gte: v(bounds[0]), $lte: v(bounds[1]) };
    }
    case 'notBetween':
      throw new FilterTranslationError('A "not between" filter needs a two-element array [from, to]');
    case 'isEmpty':
      return { $eq: '' };
    case 'isNotEmpty':
      return { $ne: '' };
    case 'textSearch': {
      if (typeof value === 'string') return { $text: { $search: { $term: value, $caseSensitive: false } } };
      const term = value as { term?: unknown; language?: unknown; caseSensitive?: unknown; diacriticSensitive?: unknown };
      return {
        $text: { $search: { $term: term.term, $language: term.language, $caseSensitive: term.caseSensitive, $diacriticSensitive: term.diacriticSensitive } }
      };
    }
    case 'pointsTo': {
      const property = SCHEMA[collection]?.[field];
      if (!property?.targetClass) {
        throw new FilterTranslationError(
          \`Filtering "\${field}" by the record it points to needs the collection schema, \` + 'so that the related collection is known.'
        );
      }
      const targetClass = property.targetClass;
      if (property.type === 'Relation') return { __type: 'Pointer', objectId: value, className: targetClass };
      if (Array.isArray(value)) return { $in: value.map((id) => ({ __type: 'Pointer', objectId: id, className: targetClass })) };
      return { $eq: { __type: 'Pointer', objectId: value, className: targetClass } };
    }
    case 'nearSphere': {
      const point = value as Json & { latitude?: unknown; longitude?: unknown };
      const constraint: Json = { $nearSphere: geoPoint(point) };
      if (point.maxDistanceInMiles !== undefined) constraint.$maxDistanceInMiles = point.maxDistanceInMiles;
      if (point.maxDistanceInKilometers !== undefined) constraint.$maxDistanceInKilometers = point.maxDistanceInKilometers;
      if (point.maxDistanceInRadians !== undefined) constraint.$maxDistanceInRadians = point.maxDistanceInRadians;
      return constraint;
    }
    case 'withinBox':
      if (!Array.isArray(value) || value.length !== 2) {
        throw new FilterTranslationError('A "within box" filter needs two corner points [southwest, northeast]');
      }
      return { $within: { $box: value.map(geoPoint) } };
    case 'withinPolygon':
      if (!Array.isArray(value) || value.length < 3) throw new FilterTranslationError('A "within polygon" filter needs at least three points');
      return { $geoWithin: { $polygon: value.map(geoPoint) } };
    default:
      throw new FilterTranslationError(\`The Parse dialect cannot express "\${operator}"\`);
  }
}

/** \`{ f: { notBetween: [a, b] } }\` as \`{ or: [{ f: { lessThan: a } }, { f: { greaterThan: b } }] }\`, at any depth. */
function expandNotBetween(filter: unknown): unknown {
  if (!filter || typeof filter !== 'object') return filter;
  const record = filter as Json;
  const keys = Object.keys(record);
  if (keys.length !== 1) return filter;
  const key = keys[0];
  const value = record[key];
  if ((key === 'and' || key === 'or') && Array.isArray(value)) return { [key]: value.map(expandNotBetween) };
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const bounds = betweenBounds((value as Json).notBetween);
    if (bounds) return { or: [{ [key]: { lessThan: bounds[0] } }, { [key]: { greaterThan: bounds[1] } }] };
  }
  return filter;
}

/** The filter as the wire's \`where\`. */
function toParseWhere(filter: unknown, collection: string): Json {
  const visit = (current: unknown): Json => {
    const node = parseFilterNode(current);
    switch (node.kind) {
      case 'empty':
        return {};
      case 'group': {
        const children = node.children.map(visit).filter((child) => Object.keys(child).length > 0);
        if (children.length === 0) return {};
        if (children.length === 1) return children[0];
        return { [\`$\${node.combinator}\`]: children };
      }
      case 'id':
        return node.operator === 'idEqualTo' ? { objectId: { $eq: node.value } } : { objectId: { $in: node.value } };
      case 'relatedTo': {
        const { id, key, className } = node.value;
        if (!className) throw new FilterTranslationError('Must preload the Pointer or include className');
        return { $relatedTo: { object: { __type: 'Pointer', objectId: id, className }, key } };
      }
      case 'path':
        throw new FilterTranslationError('A path filter is not in this app (EXP-020)');
      case 'condition':
        return { [node.field]: conditionValue(node, collection) };
    }
  };
  return visit(expandNotBetween(filter));
}

/** A row as a script reads it \`plain\`: the fields as stored, a pointer as its id, a date as its text, an included record plain. */
function plainFromJSON(item: Json): Json {
  const row: Json = {};
  for (const key in item) {
    if (key === 'ACL') continue;
    const value = item[key] as Json | null;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      if (value.__type === 'Relation') continue;
      if (value.__type === 'Date' && typeof value.iso === 'string') {
        row[key] = value.iso;
        continue;
      }
      if (value.__type === 'Pointer' && value.objectId !== undefined) {
        row[key] = value.objectId;
        continue;
      }
      if (value.__type === 'Object' && value.className !== undefined && value.objectId !== undefined) {
        const included: Json = Object.assign({}, value);
        delete included.__type;
        delete included.className;
        row[key] = plainFromJSON(included);
        continue;
      }
    }
    row[key] = value;
  }
  return row;
}

const joined = (value: unknown): unknown => (Array.isArray(value) ? value.join(',') : value);

export interface QueryOptions {
  plain?: boolean;
  limit?: number;
  skip?: number;
  sort?: string[] | string;
  include?: string[] | string;
  select?: string[] | string;
  count?: boolean;
}

async function query(className: string, filter?: unknown, options?: QueryOptions): Promise<unknown> {
  if (typeof className === 'undefined') throw new Error("'className' is undefined");
  let where: Json;
  try {
    where = toParseWhere(filter || {}, className);
  } catch (e) {
    // The running app rejects with the translator's words alone.
    if (e instanceof FilterTranslationError) throw e.message;
    throw e;
  }
  const answer = await noodlRequest(\`/classes/\${className}\`, 'POST', {
    _method: 'GET',
    where,
    limit: options?.limit,
    skip: options?.skip,
    include: joined(options?.include),
    keys: joined(options?.select),
    order: joined(options?.sort),
    count: options?.count
  });
  const body = (answer.json ?? { error: answer.text }) as { results?: Json[]; count?: number; error?: unknown };
  if (answer.status !== 200 && answer.status !== 201) throw Error((body.error as string) || 'Failed to query.');
  const results = (body.results ?? []).map(plainFromJSON);
  return body.count !== undefined ? { results, count: body.count } : results;
}

${runSource(connected)}

/** A stored file as a script holds it: a record's file read plain, an upload's file, or the stored name alone. */
type StoredFileLike = string | { getName?: () => string; name?: unknown };

async function sign(file: StoredFileLike): Promise<{ url?: string; kind: string; expiresAt?: string; ttlSeconds?: number }> {
  const name =
    typeof file === 'string'
      ? file || undefined
      : !file || typeof file !== 'object'
        ? undefined
        : typeof file.getName === 'function'
          ? file.getName()
          : typeof file.name === 'string' && file.name
            ? file.name
            : undefined;
  if (!name) throw { error: 'No file specified' };
  const answer = await noodlRequest(\`/files/\${name}/sign\`, 'GET');
  const body = (answer.json ?? { error: answer.text, status: answer.status }) as Json;
  if (answer.status !== 200 && answer.status !== 201) {
    const refused: Json = Object.assign({}, body);
    if (answer.status > 0) refused.status = answer.status;
    throw refused;
  }
  const signed: { url?: string; kind: string; expiresAt?: string; ttlSeconds?: number } = {
    url: typeof body.url === 'string' && body.url.length > 0 ? body.url : undefined,
    kind: 'signed'
  };
  if (typeof body.expiresAt === 'string' && body.expiresAt.length > 0) signed.expiresAt = body.expiresAt;
  const ttl = body.ttlSeconds;
  if (typeof ttl === 'number' ? Number.isFinite(ttl) : typeof ttl === 'string' && /^\\d+$/.test(ttl)) signed.ttlSeconds = Number(ttl);
  return signed;
}

/** The signed-in user: one object, its fields copied from the session each time it is read, as the running app's. */
const currentUser: { email?: unknown; username?: unknown; id?: string; emailVerified?: unknown; Properties?: Json } = {};

const users = {
  get Current(): typeof currentUser | undefined {
    const session = readSession();
    if (session === undefined) return undefined;
    const fields: Json = { ...session };
    for (const key of ['objectId', 'sessionToken', 'refreshToken', 'expiresAt', 'ACL', 'className', '__type']) delete fields[key];
    currentUser.email = fields.email;
    currentUser.username = fields.username;
    currentUser.id = String(session.objectId);
    currentUser.emailVerified = fields.emailVerified;
    currentUser.Properties = { ...fields, id: String(session.objectId) };
    return currentUser;
  }
};

/** The members this app's scripts read. */
export const noodl = {
  Records: { query },
  CloudFunctions: { run },
  Users: users,
  Files: { sign }
};
`;
}
