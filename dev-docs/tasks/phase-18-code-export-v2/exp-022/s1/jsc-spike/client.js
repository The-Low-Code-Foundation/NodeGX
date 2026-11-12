"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };

  // ../../../../private/tmp/claude-501/-Users-richardosborne-vscode-projects-OpenNoodl/2eb2ece1-6132-44d9-8baf-bae8443ed170/scratchpad/todo-react/src/api/client.ts
  var client_exports = {};
  __export(client_exports, {
    ENDPOINT: () => ENDPOINT,
    addRelation: () => addRelation,
    callFunction: () => callFunction,
    create: () => create,
    fetchOne: () => fetchOne,
    filterValue: () => filterValue,
    logInRequest: () => logInRequest,
    logOutRequest: () => logOutRequest,
    noodlRequest: () => noodlRequest,
    query: () => query,
    readSession: () => readSession,
    readSessionRaw: () => readSessionRaw,
    remove: () => remove,
    removeRelation: () => removeRelation,
    requestMagicLinkRequest: () => requestMagicLinkRequest,
    signFileUrlRequest: () => signFileUrlRequest,
    signUpRequest: () => signUpRequest,
    subscribeSession: () => subscribeSession,
    update: () => update,
    updateUserRequest: () => updateUserRequest,
    uploadFileRequest: () => uploadFileRequest
  });
  var ENDPOINT = "http://127.0.0.1:18591";
  var APP_ID = "noodl-desk";
  var SESSION_KEY = `Parse/${APP_ID}/currentUser`;
  function sessionStorageArea() {
    return typeof localStorage === "undefined" ? void 0 : localStorage;
  }
  function readSessionRaw() {
    const raw = sessionStorageArea()?.[SESSION_KEY];
    return typeof raw === "string" ? raw : void 0;
  }
  function readSession() {
    const raw = readSessionRaw();
    if (raw === void 0) return void 0;
    try {
      return JSON.parse(raw);
    } catch {
      return void 0;
    }
  }
  var sessionListeners = /* @__PURE__ */ new Set();
  function notifySessionChanged() {
    for (const listener of [...sessionListeners]) listener();
  }
  function subscribeSession(listener) {
    sessionListeners.add(listener);
    const onStorage = (event) => {
      if (event.key === null || event.key === SESSION_KEY) listener();
    };
    if (typeof window !== "undefined") window.addEventListener("storage", onStorage);
    return () => {
      sessionListeners.delete(listener);
      if (typeof window !== "undefined") window.removeEventListener("storage", onStorage);
    };
  }
  function writeSession(session) {
    const storage = sessionStorageArea();
    if (storage !== void 0) storage[SESSION_KEY] = JSON.stringify(session);
    notifySessionChanged();
  }
  function clearSession() {
    const storage = sessionStorageArea();
    if (storage !== void 0) delete storage[SESSION_KEY];
    notifySessionChanged();
  }
  async function request(path, options = {}) {
    const headers = {
      "X-Parse-Application-Id": APP_ID,
      ...options.file === void 0 ? { "Content-Type": "application/json" } : {},
      ...options.headers ?? {}
    };
    const sessionToken = readSession()?.sessionToken;
    if (sessionToken !== void 0) headers["X-Parse-Session-Token"] = sessionToken;
    let response;
    try {
      response = await fetch(ENDPOINT + path, {
        method: options.method ?? "GET",
        headers,
        body: options.file !== void 0 ? options.file : options.body === void 0 ? void 0 : JSON.stringify(options.body)
      });
    } catch {
      throw new Error(`Could not reach the backend at ${ENDPOINT}`);
    }
    const text = await response.text();
    let json;
    try {
      json = text.length > 0 ? JSON.parse(text) : void 0;
    } catch {
      json = void 0;
    }
    if (!response.ok) {
      throw new Error(typeof json?.error === "string" ? json.error : `Request failed (${response.status})`);
    }
    return json;
  }
  function fromWireValue(value) {
    if (value !== null && typeof value === "object" && value.__type === "Date") {
      const iso = value.iso;
      if (typeof iso === "string") return new Date(iso);
    }
    return value;
  }
  function fromWire(record) {
    const { objectId, ...fields } = record;
    const row = { id: String(objectId) };
    for (const [key, value] of Object.entries(fields)) row[key] = fromWireValue(value);
    return row;
  }
  function filterValue(value, dateColumn = false) {
    if (value instanceof Date) return { __type: "Date", iso: value.toISOString() };
    if (dateColumn && value !== null && value !== void 0) {
      const asDate = new Date(String(value));
      if (!Number.isNaN(asDate.getTime())) return { __type: "Date", iso: asDate.toISOString() };
    }
    return value;
  }
  async function query(collection, params = {}) {
    const response = await request(`/classes/${collection}`, {
      method: "POST",
      body: {
        _method: "GET",
        where: params.where,
        order: params.sort?.join(","),
        limit: params.limit,
        skip: params.skip
      }
    });
    return response.results.map((record) => fromWire(record));
  }
  async function fetchOne(collection, id) {
    const response = await request(`/classes/${collection}/${encodeURIComponent(id)}`);
    return fromWire(response);
  }
  async function create(collection, data) {
    const response = await request(`/classes/${collection}`, {
      method: "POST",
      body: data
    });
    return fromWire({ ...data, ...response });
  }
  async function update(collection, id, data) {
    const response = await request(`/classes/${collection}/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: data
    });
    const { objectId: _objectId, ...fields } = response;
    return { ...data, ...fields, id };
  }
  async function remove(collection, id) {
    await request(`/classes/${collection}/${encodeURIComponent(id)}`, { method: "DELETE" });
  }
  async function addRelation(collection, id, relation, targetId, targetClass) {
    await request(`/classes/${collection}/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: { [relation]: { __op: "AddRelation", objects: [{ __type: "Pointer", objectId: targetId, className: targetClass }] } }
    });
  }
  async function removeRelation(collection, id, relation, targetId, targetClass) {
    await request(`/classes/${collection}/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: { [relation]: { __op: "RemoveRelation", objects: [{ __type: "Pointer", objectId: targetId, className: targetClass }] } }
    });
  }
  async function logInRequest(username, password) {
    const session = await request("/login", {
      method: "POST",
      body: { username, password, _method: "GET" }
    });
    writeSession(session);
    return session;
  }
  async function logOutRequest() {
    await request("/logout", { method: "POST", body: {} });
    clearSession();
  }
  async function signUpRequest(data) {
    const response = await request("/users", { method: "POST", body: data });
    const session = { ...response };
    if (data.username !== void 0) session.username = data.username;
    if (data.email !== void 0) session.email = data.email;
    writeSession(session);
    return session;
  }
  async function updateUserRequest(data) {
    const session = readSession();
    if (session === void 0) throw new Error("Nobody is signed in.");
    const body = {};
    for (const [key, value] of Object.entries(data)) {
      if (value === void 0) continue;
      if ((key === "username" || key === "email") && value === "") continue;
      body[key] = value;
    }
    await request(`/users/${encodeURIComponent(session.objectId)}`, {
      method: "PUT",
      body
    });
    const next = { ...session, ...body };
    writeSession(next);
    return next;
  }
  async function requestMagicLinkRequest(email, redirect) {
    await request("/auth/magic-link", {
      method: "POST",
      body: { email, redirect: redirect || currentUrlWithoutAuthParams() }
    });
  }
  function currentUrlWithoutAuthParams() {
    const url = new URL(window.location.href);
    url.searchParams.delete("nodegx_auth");
    url.searchParams.delete("nodegx_auth_error");
    return url.toString();
  }
  async function uploadFileRequest(file, isPrivate) {
    return request(`/files/${encodeURIComponent(file.name)}`, {
      method: "POST",
      file,
      headers: isPrivate ? { "X-NodeGX-File-Private": "true" } : void 0
    });
  }
  async function signFileUrlRequest(name) {
    return request(`/files/${encodeURIComponent(name)}/sign`);
  }
  async function callFunction(name, params) {
    const headers = {
      "X-Parse-Application-Id": APP_ID,
      "Content-Type": "application/json"
    };
    const sessionToken = readSession()?.sessionToken;
    if (sessionToken !== void 0) headers["X-Parse-Session-Token"] = sessionToken;
    let response;
    try {
      response = await fetch(`${ENDPOINT}/functions/${encodeURIComponent(name)}`, {
        method: "POST",
        headers,
        body: JSON.stringify(params)
      });
    } catch {
      throw new Error(`Could not reach the backend at ${ENDPOINT}`);
    }
    const text = await response.text();
    let json;
    try {
      json = text.length > 0 ? JSON.parse(text) : void 0;
    } catch {
      json = void 0;
    }
    if (response.status !== 200 && response.status !== 201) {
      throw new Error(typeof json?.error === "string" ? json.error : "Failed running cloud function.");
    }
    return json?.result ?? {};
  }
  async function noodlRequest(path, method, body) {
    const headers = { "X-Parse-Application-Id": APP_ID, "Content-Type": "application/json" };
    const sessionToken = readSession()?.sessionToken;
    if (sessionToken !== void 0) headers["X-Parse-Session-Token"] = sessionToken;
    let response;
    try {
      response = await fetch(ENDPOINT + path, { method, headers, body: body === void 0 ? void 0 : JSON.stringify(body) });
    } catch {
      return { status: 0, json: void 0, text: "" };
    }
    const text = await response.text();
    let json;
    try {
      json = text.length > 0 ? JSON.parse(text) : void 0;
    } catch {
      json = void 0;
    }
    return { status: response.status, json, text };
  }

  // ../../../../private/tmp/claude-501/-Users-richardosborne-vscode-projects-OpenNoodl/2eb2ece1-6132-44d9-8baf-bae8443ed170/scratchpad/todo-react/src/lib/noodl.ts
  var SCHEMA = {};
  var FilterTranslationError = class extends Error {
  };
  var FILTER_OPERATORS = [
    "equalTo",
    "notEqualTo",
    "lessThan",
    "greaterThan",
    "lessThanOrEqualTo",
    "greaterThanOrEqualTo",
    "containedIn",
    "notContainedIn",
    "exists",
    "matchesRegex",
    "contains",
    "notContains",
    "containsIgnoreCase",
    "startsWith",
    "notStartsWith",
    "startsWithIgnoreCase",
    "endsWith",
    "notEndsWith",
    "endsWithIgnoreCase",
    "between",
    "notBetween",
    "isEmpty",
    "isNotEmpty",
    "textSearch",
    "pointsTo",
    "relatedTo",
    "path",
    "idEqualTo",
    "idContainedIn",
    "nearSphere",
    "withinBox",
    "withinPolygon"
  ];
  function describe(value) {
    if (value === null) return "null";
    if (Array.isArray(value)) return "an array";
    return typeof value;
  }
  function parseFilterNode(filter) {
    if (filter === null || filter === void 0) return { kind: "empty" };
    if (typeof filter !== "object" || Array.isArray(filter)) {
      throw new FilterTranslationError(`A filter must be an object, found ${describe(filter)}`);
    }
    const record = filter;
    const keys = Object.keys(record);
    if (keys.length === 0) return { kind: "empty" };
    if (keys.length !== 1) {
      throw new FilterTranslationError(
        `A filter must have exactly one key, found ${keys.length}: ${keys.join(", ")}. Combine conditions with { and: [ \u2026 ] } or { or: [ \u2026 ] }.`
      );
    }
    const key = keys[0];
    const value = record[key];
    if ((key === "and" || key === "or") && Array.isArray(value)) return { kind: "group", combinator: key, children: value };
    if (key === "idEqualTo" || key === "idContainedIn") return { kind: "id", operator: key, value };
    if (key === "relatedTo") {
      const related = value;
      if (!related || typeof related !== "object") throw new FilterTranslationError("A relatedTo filter must be an object with id and key");
      if (related.id === void 0) throw new FilterTranslationError("Must provide id in relatedTo filter");
      if (related.key === void 0) throw new FilterTranslationError("Must provide key in relatedTo filter");
      return { kind: "relatedTo", value: related };
    }
    if (key === "path") return { kind: "path", value };
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      throw new FilterTranslationError(`The condition on "${key}" must be an object like { equalTo: \u2026 }, found ${describe(value)}`);
    }
    const opAndValue = value;
    const operatorKeys = Object.keys(opAndValue).filter((k) => k !== "options");
    if (operatorKeys.length === 1 && operatorKeys[0] === "text") {
      const text = opAndValue.text;
      if (!text || typeof text !== "object" || text.search === void 0) {
        throw new FilterTranslationError(`The text filter on "${key}" needs a search value`);
      }
      return { kind: "condition", field: key, operator: "textSearch", value: text.search };
    }
    if (operatorKeys.length === 0) {
      throw new FilterTranslationError(`The condition on "${key}" has no operator. Expected one of: ${FILTER_OPERATORS.join(", ")}.`);
    }
    if (operatorKeys.length > 1) {
      throw new FilterTranslationError(
        `The condition on "${key}" has ${operatorKeys.length} operators (${operatorKeys.join(", ")}), and only one can be applied. Use "between", or combine two conditions with { and: [ \u2026 ] }.`
      );
    }
    const operator = operatorKeys[0];
    if (!FILTER_OPERATORS.includes(operator)) {
      throw new FilterTranslationError(`"${operator}" is not a filter operator. Expected one of: ${FILTER_OPERATORS.join(", ")}.`);
    }
    const node = { kind: "condition", field: key, operator, value: opAndValue[operator] };
    if (operator === "matchesRegex" && typeof opAndValue.options === "string") node.regexOptions = opAndValue.options;
    return node;
  }
  function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  function lowerToRegex(operator, raw) {
    const value = escapeRegExp(String(raw));
    switch (operator) {
      case "contains":
        return { pattern: value };
      case "containsIgnoreCase":
        return { pattern: value, options: "i" };
      case "notContains":
        return { pattern: `^(?![\\s\\S]*${value})` };
      case "startsWith":
        return { pattern: `^${value}` };
      case "startsWithIgnoreCase":
        return { pattern: `^${value}`, options: "i" };
      case "notStartsWith":
        return { pattern: `^(?!${value})` };
      case "endsWith":
        return { pattern: `${value}$` };
      case "endsWithIgnoreCase":
        return { pattern: `${value}$`, options: "i" };
      case "notEndsWith":
        return { pattern: `^(?![\\s\\S]*${value}$)` };
      default:
        return void 0;
    }
  }
  function betweenBounds(raw) {
    return Array.isArray(raw) && raw.length === 2 ? [raw[0], raw[1]] : void 0;
  }
  function parseValue(raw, field, collection) {
    if (raw instanceof Date) return { __type: "Date", iso: raw.toISOString() };
    if (SCHEMA[collection]?.[field]?.type === "Date" && raw !== null && raw !== void 0) {
      const asDate = new Date(String(raw));
      if (!Number.isNaN(asDate.getTime())) return { __type: "Date", iso: asDate.toISOString() };
    }
    return raw;
  }
  function geoPoint(value) {
    return { __type: "GeoPoint", latitude: value.latitude, longitude: value.longitude };
  }
  function conditionValue(node, collection) {
    const { field, operator, value } = node;
    const v = (raw) => parseValue(raw, field, collection);
    switch (operator) {
      case "equalTo":
        return { $eq: v(value) };
      case "notEqualTo":
        return { $ne: v(value) };
      case "lessThan":
        return { $lt: v(value) };
      case "greaterThan":
        return { $gt: v(value) };
      case "lessThanOrEqualTo":
        return { $lte: v(value) };
      case "greaterThanOrEqualTo":
        return { $gte: v(value) };
      case "containedIn":
        return { $in: Array.isArray(value) ? value.map(v) : [v(value)] };
      case "notContainedIn":
        return { $nin: Array.isArray(value) ? value.map(v) : [v(value)] };
      case "exists":
        return value === false ? { $eq: null } : { $ne: null };
      case "matchesRegex":
        return node.regexOptions === void 0 ? { $regex: value } : { $regex: value, $options: node.regexOptions };
      case "contains":
      case "notContains":
      case "containsIgnoreCase":
      case "startsWith":
      case "notStartsWith":
      case "startsWithIgnoreCase":
      case "endsWith":
      case "notEndsWith":
      case "endsWithIgnoreCase": {
        const lowered = lowerToRegex(operator, value);
        return lowered.options === void 0 ? { $regex: lowered.pattern } : { $regex: lowered.pattern, $options: lowered.options };
      }
      case "between": {
        const bounds = betweenBounds(value);
        if (!bounds) throw new FilterTranslationError('A "between" filter needs a two-element array [from, to]');
        return { $gte: v(bounds[0]), $lte: v(bounds[1]) };
      }
      case "notBetween":
        throw new FilterTranslationError('A "not between" filter needs a two-element array [from, to]');
      case "isEmpty":
        return { $eq: "" };
      case "isNotEmpty":
        return { $ne: "" };
      case "textSearch": {
        if (typeof value === "string") return { $text: { $search: { $term: value, $caseSensitive: false } } };
        const term = value;
        return {
          $text: { $search: { $term: term.term, $language: term.language, $caseSensitive: term.caseSensitive, $diacriticSensitive: term.diacriticSensitive } }
        };
      }
      case "pointsTo": {
        const property = SCHEMA[collection]?.[field];
        if (!property?.targetClass) {
          throw new FilterTranslationError(
            `Filtering "${field}" by the record it points to needs the collection schema, so that the related collection is known.`
          );
        }
        const targetClass = property.targetClass;
        if (property.type === "Relation") return { __type: "Pointer", objectId: value, className: targetClass };
        if (Array.isArray(value)) return { $in: value.map((id) => ({ __type: "Pointer", objectId: id, className: targetClass })) };
        return { $eq: { __type: "Pointer", objectId: value, className: targetClass } };
      }
      case "nearSphere": {
        const point = value;
        const constraint = { $nearSphere: geoPoint(point) };
        if (point.maxDistanceInMiles !== void 0) constraint.$maxDistanceInMiles = point.maxDistanceInMiles;
        if (point.maxDistanceInKilometers !== void 0) constraint.$maxDistanceInKilometers = point.maxDistanceInKilometers;
        if (point.maxDistanceInRadians !== void 0) constraint.$maxDistanceInRadians = point.maxDistanceInRadians;
        return constraint;
      }
      case "withinBox":
        if (!Array.isArray(value) || value.length !== 2) {
          throw new FilterTranslationError('A "within box" filter needs two corner points [southwest, northeast]');
        }
        return { $within: { $box: value.map(geoPoint) } };
      case "withinPolygon":
        if (!Array.isArray(value) || value.length < 3) throw new FilterTranslationError('A "within polygon" filter needs at least three points');
        return { $geoWithin: { $polygon: value.map(geoPoint) } };
      default:
        throw new FilterTranslationError(`The Parse dialect cannot express "${operator}"`);
    }
  }
  function expandNotBetween(filter) {
    if (!filter || typeof filter !== "object") return filter;
    const record = filter;
    const keys = Object.keys(record);
    if (keys.length !== 1) return filter;
    const key = keys[0];
    const value = record[key];
    if ((key === "and" || key === "or") && Array.isArray(value)) return { [key]: value.map(expandNotBetween) };
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const bounds = betweenBounds(value.notBetween);
      if (bounds) return { or: [{ [key]: { lessThan: bounds[0] } }, { [key]: { greaterThan: bounds[1] } }] };
    }
    return filter;
  }
  function toParseWhere(filter, collection) {
    const visit = (current) => {
      const node = parseFilterNode(current);
      switch (node.kind) {
        case "empty":
          return {};
        case "group": {
          const children = node.children.map(visit).filter((child) => Object.keys(child).length > 0);
          if (children.length === 0) return {};
          if (children.length === 1) return children[0];
          return { [`$${node.combinator}`]: children };
        }
        case "id":
          return node.operator === "idEqualTo" ? { objectId: { $eq: node.value } } : { objectId: { $in: node.value } };
        case "relatedTo": {
          const { id, key, className } = node.value;
          if (!className) throw new FilterTranslationError("Must preload the Pointer or include className");
          return { $relatedTo: { object: { __type: "Pointer", objectId: id, className }, key } };
        }
        case "path":
          throw new FilterTranslationError("A path filter is not in this app (EXP-020)");
        case "condition":
          return { [node.field]: conditionValue(node, collection) };
      }
    };
    return visit(expandNotBetween(filter));
  }
  function plainFromJSON(item) {
    const row = {};
    for (const key in item) {
      if (key === "ACL") continue;
      const value = item[key];
      if (value && typeof value === "object" && !Array.isArray(value)) {
        if (value.__type === "Relation") continue;
        if (value.__type === "Date" && typeof value.iso === "string") {
          row[key] = value.iso;
          continue;
        }
        if (value.__type === "Pointer" && value.objectId !== void 0) {
          row[key] = value.objectId;
          continue;
        }
        if (value.__type === "Object" && value.className !== void 0 && value.objectId !== void 0) {
          const included = Object.assign({}, value);
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
  var joined = (value) => Array.isArray(value) ? value.join(",") : value;
  async function query2(className, filter, options) {
    if (typeof className === "undefined") throw new Error("'className' is undefined");
    let where;
    try {
      where = toParseWhere(filter || {}, className);
    } catch (e) {
      if (e instanceof FilterTranslationError) throw e.message;
      throw e;
    }
    const answer = await noodlRequest(`/classes/${className}`, "POST", {
      _method: "GET",
      where,
      limit: options?.limit,
      skip: options?.skip,
      include: joined(options?.include),
      keys: joined(options?.select),
      order: joined(options?.sort),
      count: options?.count
    });
    const body = answer.json ?? { error: answer.text };
    if (answer.status !== 200 && answer.status !== 201) throw Error(body.error || "Failed to query.");
    const results = (body.results ?? []).map(plainFromJSON);
    return body.count !== void 0 ? { results, count: body.count } : results;
  }
  async function run(functionName, params) {
    const answer = await noodlRequest(`/functions/${encodeURIComponent(functionName)}`, "POST", params);
    const body = answer.json;
    if (answer.status === 200 || answer.status === 201) return body ? body.result : void 0;
    throw body !== void 0 ? body : { error: answer.status === 0 ? `Could not reach the backend at ${ENDPOINT}` : "Cloud function call failed with no response body" };
  }
  async function sign(file) {
    const name = typeof file === "string" ? file || void 0 : !file || typeof file !== "object" ? void 0 : typeof file.getName === "function" ? file.getName() : typeof file.name === "string" && file.name ? file.name : void 0;
    if (!name) throw { error: "No file specified" };
    const answer = await noodlRequest(`/files/${name}/sign`, "GET");
    const body = answer.json ?? { error: answer.text, status: answer.status };
    if (answer.status !== 200 && answer.status !== 201) {
      const refused = Object.assign({}, body);
      if (answer.status > 0) refused.status = answer.status;
      throw refused;
    }
    const signed = {
      url: typeof body.url === "string" && body.url.length > 0 ? body.url : void 0,
      kind: "signed"
    };
    if (typeof body.expiresAt === "string" && body.expiresAt.length > 0) signed.expiresAt = body.expiresAt;
    const ttl = body.ttlSeconds;
    if (typeof ttl === "number" ? Number.isFinite(ttl) : typeof ttl === "string" && /^\d+$/.test(ttl)) signed.ttlSeconds = Number(ttl);
    return signed;
  }
  var currentUser = {};
  var users = {
    get Current() {
      const session = readSession();
      if (session === void 0) return void 0;
      const fields = { ...session };
      for (const key of ["objectId", "sessionToken", "refreshToken", "expiresAt", "ACL", "className", "__type"]) delete fields[key];
      currentUser.email = fields.email;
      currentUser.username = fields.username;
      currentUser.id = String(session.objectId);
      currentUser.emailVerified = fields.emailVerified;
      currentUser.Properties = { ...fields, id: String(session.objectId) };
      return currentUser;
    }
  };
  var noodl = {
    Records: { query: query2 },
    CloudFunctions: { run },
    Users: users,
    Files: { sign }
  };

  // ../../../../private/tmp/claude-501/-Users-richardosborne-vscode-projects-OpenNoodl/2eb2ece1-6132-44d9-8baf-bae8443ed170/scratchpad/todo-react/src/jsc-entry.ts
  globalThis.NodegxClient = { noodl, client: client_exports };
})();
