/**
 * EXP-022 S2. The JavaScriptCore host: the app's Functions run in one `JSContext`, their bodies verbatim, through the
 * EXP-019 wrapper contract (`Inputs`, `Outputs`, `this`), and their runs go through the web export's own runner
 * (`functionRunJs.ts`), so a run publishes and pulses as it does in the React app.
 *
 * The package carries the JavaScript as resources a person can read and edit: `Scripts/nodegx-host.js` (what a
 * `JSContext` lacks, and the runner) and `Scripts/functions/<component>/<Function>.js` (one file per Function, as the web
 * export writes one per Function under `src/functions/`). `Scripts.swift` is constant; `Functions.swift` lists the files.
 *
 * @module emit/swift/scripts
 */

import type { ComponentPlan, JsFunctionPlan } from '../../analyze/plan';
import { FUNCTION_RUN_JS } from './functionRunJs';

/** A Function's name in the host's registry, and its file under `Scripts/functions/`: `Logic/Tally/Work`. */
export function functionId(plan: ComponentPlan, def: JsFunctionPlan): string {
  return `${plan.path}/${def.fnName}`;
}

/** Whether a body keeps state on `this` (an EXP-019 host trait): it then runs bound to its node's `self`, as React's does. */
export function keepsThis(def: JsFunctionPlan): boolean {
  return def.host?.some((t) => t.startsWith('keeps state on')) === true;
}

/**
 * The `Noodl` a body reads, as the React wrapper binds it (`jsWrapperLines`): the client's `noodl` (the backend members),
 * with each Variable the body names over the app's own Variable (EXP-020).
 */
function noodlLine(def: JsFunctionPlan): string[] {
  if (def.noodl === undefined) return [];
  const backend = def.noodl.members.some((m) => m !== 'Variables');
  return [`  var Noodl = __nodegx.noodl(${JSON.stringify(def.noodl.variables)}, ${backend});`];
}

/** One Function's file: the wrapper the React export writes, in plain JavaScript, registered by its id. */
export function functionFileJs(plan: ComponentPlan, def: JsFunctionPlan): string {
  const self = keepsThis(def);
  const awaits = def.awaits === true;
  // EXP-019 slice 1b. A body that awaits runs in an async function, and the run hands back its promise (`settled`).
  const open = self ? `    ${awaits ? 'await ' : ''}(${awaits ? 'async ' : ''}function () {` : `    ${awaits ? 'await ' : ''}(${awaits ? 'async ' : ''}() => {`;
  return [
    `// @nodegx:generated (EXP-022) — the Function node "${def.fnName}" (node ${def.nodeId}) of ${plan.path}.`,
    '// The body is preserved verbatim; it runs in the app\'s JavaScriptCore context, as it runs in the web export.',
    ...(self ? ["// It keeps state on `this` across runs: the body runs bound to the node's own `self`."] : []),
    ...(awaits ? ['// It awaits: the run returns at its first `await`, and Success and Done wait for it to finish.'] : []),
    `__nodegx.define(${JSON.stringify(functionId(plan, def))}, ${awaits ? 'async ' : ''}function (Inputs, Outputs, self, Component) {`,
    ...noodlLine(def),
    '  try {',
    open,
    ...def.body.split('\n'),
    self ? '    }).call(self);' : '    })();',
    '  } catch (e) {',
    `    console.error(${JSON.stringify(`Function node ${def.fnName} threw:`)}, e);`,
    '  }',
    '  return Outputs;',
    '});',
    ''
  ].join('\n');
}

/** What a `JSContext` lacks that a body may read, the runner, and the registry the function files fill. */
export const HOST_JS = `// @nodegx:generated (EXP-022) — what the app's JavaScript runs on: what a JSContext lacks, and the Function runner.
var console = {
  log: function () { __log('log', Array.prototype.map.call(arguments, String).join(' ')); },
  info: function () { __log('info', Array.prototype.map.call(arguments, String).join(' ')); },
  warn: function () { __log('warn', Array.prototype.map.call(arguments, String).join(' ')); },
  error: function () { __log('error', Array.prototype.map.call(arguments, String).join(' ')); }
};
var __timers = {};
var __nextTimer = 1;
function setTimeout(fn, ms) {
  var id = __nextTimer++;
  var args = Array.prototype.slice.call(arguments, 2);
  __timers[id] = true;
  __later(function () { if (__timers[id]) { delete __timers[id]; fn.apply(null, args); } }, Number(ms) || 0);
  return id;
}
function clearTimeout(id) { delete __timers[id]; }
function setInterval(fn, ms) {
  var id = __nextTimer++;
  var args = Array.prototype.slice.call(arguments, 2);
  __timers[id] = true;
  var every = Math.max(Number(ms) || 0, 1);
  function again() { __later(function () { if (__timers[id]) { fn.apply(null, args); again(); } }, every); }
  again();
  return id;
}
function clearInterval(id) { delete __timers[id]; }
// The page's global object is \`window\` in a browser; a body that reads \`window.localStorage\` reads the one below. A phone
// app has one window and no other tabs, so nothing ever sends it an event.
var window = globalThis;
function addEventListener() {}
function removeEventListener() {}
// Kept on the device (UserDefaults), as a browser keeps it for the site: "remember this on this device" survives a relaunch.
// Read as a browser's is, by method or by key (the web client reads \`localStorage[key]\`).
var localStorage = new Proxy({}, {
  get: function (_target, key) {
    if (key === 'getItem') return function (k) { var v = __storage('get', String(k), ''); return v === undefined || v === null ? null : v; };
    if (key === 'setItem') return function (k, v) { __storage('set', String(k), String(v)); };
    if (key === 'removeItem') return function (k) { __storage('remove', String(k), ''); };
    if (key === 'clear') return function () { __storage('clear', '', ''); };
    if (typeof key !== 'string') return undefined;
    var v = __storage('get', key, '');
    return v === undefined || v === null ? undefined : v;
  },
  set: function (_target, key, value) { __storage('set', String(key), String(value)); return true; },
  deleteProperty: function (_target, key) { __storage('remove', String(key), ''); return true; },
  has: function (_target, key) { var v = __storage('get', String(key), ''); return v !== undefined && v !== null; }
});
// EXP-022 S3. \`fetch\` over URLSession, as the web client reads it: \`status\`, \`ok\`, \`text()\`; no answer rejects, as a
// browser's does.
function fetch(url, init) {
  init = init || {};
  return new Promise(function (resolve, reject) {
    var body = init.body === undefined || init.body === null ? null : init.body;
    __fetch(init.method || 'GET', String(url), init.headers || {}, body, function (status, text) {
      if (status === 0) reject(new TypeError('Failed to fetch'));
      else resolve({
        status: status,
        ok: status >= 200 && status < 300,
        text: function () { return Promise.resolve(text); },
        json: function () { return Promise.resolve(JSON.parse(text)); }
      });
    });
  });
}
// The web client's \`import.meta.env\`: the app's environment (VITE_NODEGX_ENDPOINT, VITE_NODEGX_APP_ID), so a scheme or a
// test points the app at another backend without editing generated code.
var __nodegxEnv = __env();
// The web export's modules (\`Scripts/client/\`), each a function of its own run once, when first required.
var __modules = {};
var __loaded = {};
function __define(name, factory) { __modules[name] = factory; }
function __require(name) {
  if (__loaded[name]) return __loaded[name].exports;
  var factory = __modules[name];
  if (!factory) throw new Error('The app carries no module ' + name);
  var module = { exports: {} };
  __loaded[name] = module;
  // EXP-022 S9. \`module\` too: a package carried as it ships (fast-xml-parser) sets \`module.exports\` whole.
  factory(module.exports, __require, module);
  return module.exports;
}
// React's hooks (the web session hook and the error channel's boundary import them); the Swift app reads the session
// through \`Session\` and keeps its boundaries in \`AppErrors\` instead.
__define('react', function (exports) {
  ['useMemo', 'useSyncExternalStore', 'useState', 'useEffect', 'useRef', 'useCallback', 'useLayoutEffect', 'useReducer'].forEach(function (name) {
    exports[name] = function () { throw new Error("React's " + name + ' does not run in the Swift app'); };
  });
});

// The web export's src/lib/functionRun.ts, compiled to JavaScript.
${FUNCTION_RUN_JS}
var __realNow = Date.now;
var __realRandom = Math.random;
var __nodegx = {
  fns: {},
  define: function (id, fn) { this.fns[id] = fn; },
  node: function (signals) { return functionNode(signals); },
  // A run against the node's recording Outputs: its values kept across runs, its pulses in the order it sent them.
  run: function (id, inputs, node) {
    var fn = this.fns[id];
    if (!fn) throw new Error('No Function ' + id);
    var run = runFunction(fn, inputs, node);
    return { outputs: Object.assign({}, run.outputs), pulses: run.pulses, settled: run.settled };
  },
  // The Noodl a body reads (EXP-020): the client's members, and each Variable it names over the app's own.
  noodl: function (variables, backend) {
    var base = backend ? __require('lib/noodl').noodl : {};
    if (variables.length === 0) return base;
    var vars = {};
    variables.forEach(function (name) {
      Object.defineProperty(vars, name, {
        enumerable: true,
        get: function () { return __variable(name); },
        set: function (value) { __setVariable(name, value); }
      });
    });
    return Object.assign({}, base, { Variables: vars });
  },
  // A call into the web export's api modules by its function's name (\`updateTask\`, \`logIn\`): its outcome, handed to Swift.
  api: function (name, args, done) {
    var fn;
    Object.keys(__modules).forEach(function (m) {
      if (fn === undefined && m.indexOf('api/') === 0 && typeof __require(m)[name] === 'function') fn = __require(m)[name];
    });
    var answer;
    try {
      if (fn === undefined) throw new Error('The app carries no api function ' + name);
      answer = Promise.resolve(fn.apply(null, args));
    } catch (e) {
      answer = Promise.reject(e);
    }
    answer.then(function (value) { done(true, value); }, function (e) { done(false, e instanceof Error ? e.message : String(e)); });
  },
  // A member of a client module (\`api/client\`'s \`readSession\`), for the Swift side to call; nothing where the app has none.
  member: function (module, name) { return __modules[module] ? __require(module)[name] : undefined; },
  // P18-S115-QUERYPARAMS. A query's params at the call: its own where / sort / limit / skip, or, with wired filter values,
  // the translator's document for which of them are set, each value put on the wire as the client's \`filterValue\` does.
  queryParams: function (json, values, wiredClient) {
    var params = JSON.parse(json);
    var wired = params.wired;
    if (wired === undefined) return params;
    delete params.wired;
    var mask = 0;
    wired.params.forEach(function (name, i) { if (values[name] !== undefined) mask |= 1 << i; });
    var where = wired.cases[mask];
    if (where === undefined || where === null) return params;
    var put = wiredClient ? __require('api/client').filterValue : function (v) { return v; };
    params.where = JSON.parse(JSON.stringify(where), function (_key, v) {
      return v !== null && typeof v === 'object' && '@nodegx/wired-value' in v ? put(values[v['@nodegx/wired-value']], v.date) : v;
    });
    return Object.assign({ where: params.where }, params);
  },
  // When a promise settles, either way.
  settle: function (promise, done) {
    Promise.resolve(promise).then(function () { done(true); }, function () { done(false); });
  },
  // A pure run, as the web export calls a render run: a fresh Outputs record, its signals no-ops.
  call: function (id, inputs, signals) {
    var outputs = {};
    signals.forEach(function (s) { outputs[s] = function () {}; });
    return this.fns[id](inputs, outputs, {}, undefined);
  },
  isPlainObject: function (v) {
    var p = Object.getPrototypeOf(v);
    return p === Object.prototype || p === null;
  },
  // EXP-022 S7. A module of the web export (\`stores/app\`), for Swift to hold.
  module: function (name) { return __require(name); },
  // What a test calls between scenarios: every module the web export wrote runs again when next required, over an empty
  // store registry, as a relaunch starts them (React's graph target loads them fresh for each scenario).
  fresh: function () {
    Object.keys(__loaded).forEach(function (name) { if (name !== 'react' && name.indexOf('@nodegx/core') !== 0) delete __loaded[name]; });
    if (__loaded['@nodegx/core']) __require('@nodegx/core').clearStores();
    Date.now = __realNow;
    Math.random = __realRandom;
  },
  // What a test calls to play under a scripted world (the node-spec runner's): the clock stands at \`now\`, and the
  // random numbers are the world's, in order, as the web export's graph target installs them. \`fresh()\` puts both back.
  world: function (now, randoms) {
    var i = 0;
    Date.now = function () { return now; };
    Math.random = function () {
      if (i >= randoms.length) throw new Error('the play drew more random numbers than its world was given');
      return randoms[i++];
    };
  },
  // A Global Store's write: one key, its value as given (undefined too), as the web export's \`app.set({ key: value })\`.
  storeSet: function (store, key, value) { var patch = {}; patch[key] = value; store.set(patch); },
  // A node of \`lib/history\` or \`lib/actions\`, made by its module's factory, as React's hook makes it once per mount.
  stream: function (module, factory, source, second, rerender) {
    return __require(module)[factory](source, second === null ? undefined : second, rerender);
  },
  // React's \`applyInputs\`: each option that arrived with a value other than the last one applied goes through the
  // node's setter. The ports that did, in order.
  applyInputs: function (node, applied, options) {
    var changed = [];
    Object.keys(options).forEach(function (port) {
      var value = options[port];
      if (value === undefined) return;
      if (applied.has(port) && Object.is(applied.get(port), value)) return;
      applied.set(port, value);
      node.setInput(port, value);
      changed.push(port);
    });
    return changed;
  },
  // A node's listeners: each signal calls Swift by its name.
  setListeners: function (node, names, call) {
    var on = {};
    names.forEach(function (name) { on[name] = function () { call(name); }; });
    node.setListeners(on);
  }
};
`;

export const SCRIPTS_SWIFT = `// @nodegx:generated (EXP-022) — the app's JavaScript host: the Functions run here, their bodies verbatim.
import Foundation
import JavaScriptCore

/// One \`JSContext\` for the app. It loads \`Scripts/nodegx-host.js\` and every file under \`Scripts/functions/\`, and runs a
/// Function by its id (\`"Logic/Tally/Work"\`) with the inputs the graph hands it.
public final class Scripts {
  public static let shared = Scripts()
  public let context: JSContext
  private let host: JSValue

  private init() {
    context = JSContext()!
    context.exceptionHandler = { _, exception in
      print("[js] \\(exception?.toString() ?? "an exception")")
    }
    let log: @convention(block) (String, String) -> Void = { level, text in print("[js \\(level)] \\(text)") }
    let later: @convention(block) (JSValue, Double) -> Void = { fn, ms in
      DispatchQueue.main.asyncAfter(deadline: .now() + ms / 1000) { fn.call(withArguments: []) }
    }
    let storage: @convention(block) (String, String, String) -> Any? = { op, key, value in
      let defaults = UserDefaults(suiteName: "io.nodegx.localStorage") ?? .standard
      switch op {
      case "get": return defaults.string(forKey: key)
      case "set": defaults.set(value, forKey: key)
      case "remove": defaults.removeObject(forKey: key)
      default: defaults.removePersistentDomain(forName: "io.nodegx.localStorage")
      }
      return nil
    }
    // EXP-022 S3. The web client's \`fetch\`, over URLSession; its answer arrives on the main queue, as the page's would.
    let fetch: @convention(block) (String, String, JSValue, JSValue, JSValue) -> Void = { method, url, headers, body, done in
      guard let address = URL(string: url) else {
        done.call(withArguments: [0, ""])
        return
      }
      var request = URLRequest(url: address)
      request.httpMethod = method
      for (name, value) in (headers.toDictionary() as? [String: Any]) ?? [:] { request.setValue("\\(value)", forHTTPHeaderField: name) }
      if body.isString { request.httpBody = body.toString().data(using: .utf8) }
      Scripts.inFlight += 1
      URLSession.shared.dataTask(with: request) { data, response, error in
        let status = error == nil ? ((response as? HTTPURLResponse)?.statusCode ?? 0) : 0
        let text = data.flatMap { String(data: $0, encoding: .utf8) } ?? ""
        DispatchQueue.main.async {
          Scripts.inFlight -= 1
          done.call(withArguments: [status, text])
        }
      }.resume()
    }
    let env: @convention(block) () -> [String: String] = {
      ProcessInfo.processInfo.environment.filter { $0.key.hasPrefix("VITE_NODEGX_") }
    }
    let variable: @convention(block) (String) -> Any? = { name in Scripts.variable(name) }
    let setVariable: @convention(block) (String, JSValue) -> Void = { name, value in Scripts.setVariable(name, Scripts.shared.swift(value)) }
    context.setObject(log, forKeyedSubscript: "__log" as NSString)
    context.setObject(later, forKeyedSubscript: "__later" as NSString)
    context.setObject(storage, forKeyedSubscript: "__storage" as NSString)
    context.setObject(fetch, forKeyedSubscript: "__fetch" as NSString)
    context.setObject(env, forKeyedSubscript: "__env" as NSString)
    context.setObject(variable, forKeyedSubscript: "__variable" as NSString)
    context.setObject(setVariable, forKeyedSubscript: "__setVariable" as NSString)
    Scripts.load(context, "nodegx-host")
    for module in Scripts.clientModules { Scripts.load(context, "client/" + module) }
    for file in Scripts.functionFiles { Scripts.load(context, "functions/" + file) }
    host = context.objectForKeyedSubscript("__nodegx")
  }

  /// Requests sent and not answered yet: a driver waits for them as it waits for the page to settle.
  public static var inFlight = 0

  private static func load(_ context: JSContext, _ name: String) {
    let parts = name.split(separator: "/").map(String.init)
    let directory = (["Scripts"] + parts.dropLast()).joined(separator: "/")
    guard let url = Bundle.module.url(forResource: parts.last!, withExtension: "js", subdirectory: directory),
          let source = try? String(contentsOf: url, encoding: .utf8) else {
      print("[js] missing script \\(name).js")
      return
    }
    context.evaluateScript(source, withSourceURL: url)
  }

  /// The Functions the host has loaded, by id.
  public var defined: [String] {
    context.objectForKeyedSubscript("Object").invokeMethod("keys", withArguments: [host.forProperty("fns")!]).toArray() as? [String] ?? []
  }

  /// A pure run (the web export's render run): a fresh Outputs record, read back as a record.
  public func call(_ id: String, _ inputs: [String: Any?], signals: [String] = []) -> [String: Any] {
    let result = host.invokeMethod("call", withArguments: [id, js(inputs), signals])
    return (result.flatMap(swift) as? [String: Any]) ?? [:]
  }

  /// A run against a kept node (\`runFunction\`): what it published, and the pulses it sent.
  func run(_ id: String, _ inputs: [String: Any?], node: JSValue) -> FunctionRun {
    guard let result = host.invokeMethod("run", withArguments: [id, js(inputs), node]) else { return FunctionRun(outputs: [:], pulses: []) }
    return runOf(result)
  }

  /// A run's record (\`{ outputs, pulses, settled }\`) as Swift.
  func runOf(_ result: JSValue) -> FunctionRun {
    let outputs = (swift(result.forProperty("outputs")) as? [String: Any]) ?? [:]
    let pulses = (result.forProperty("pulses").toArray() ?? []).indices.map { i -> FunctionPulse in
      let pulse = result.forProperty("pulses").atIndex(i)!
      return FunctionPulse(signal: pulse.forProperty("signal").toString(), values: (swift(pulse.forProperty("values")) as? [String: Any]) ?? [:])
    }
    let settled = result.forProperty("settled")
    return FunctionRun(outputs: outputs, pulses: pulses, settled: settled?.isObject == true ? settled : nil)
  }

  /// EXP-019 slice 1b. Waits until an awaiting run's body has finished, as the web export's \`await run.settled\` does.
  public func settled(_ run: FunctionRun) async {
    guard let promise = run.settled else { return }
    await withCheckedContinuation { (finished: CheckedContinuation<Void, Never>) in
      let done: @convention(block) (Bool) -> Void = { _ in finished.resume() }
      host.invokeMethod("settle", withArguments: [promise, JSValue(object: done, in: context)!])
    }
  }

  /// EXP-022 S3. A call into the web export's api modules (\`updateTask\`, \`logIn\`), awaited as the React app awaits it:
  /// what it answered, or its failure's message as a \`BackendError\` (\`error instanceof Error ? error.message : String(error)\`).
  public func api(_ name: String, _ args: [Any?]) async throws -> Any? {
    try await answer(send(name, args))
  }

  /// The call made now (its request on its way, as the web app's is at the click), its answer awaited later.
  public func send(_ name: String, _ args: [Any?]) -> PendingCall {
    let call = PendingCall()
    let done: @convention(block) (Bool, JSValue) -> Void = { ok, value in
      call.settle(ok ? .success(Scripts.shared.swift(value)) : .failure(BackendError(message: value.toString())))
    }
    host.invokeMethod("api", withArguments: [name, js(args), JSValue(object: done, in: context)!])
    return call
  }

  public func answer(_ call: PendingCall) async throws -> Any? {
    try await withCheckedThrowingContinuation { (answered: CheckedContinuation<Any?, Error>) in call.then { answered.resume(with: $0) } }
  }

  /// A query's params at the call (\`__nodegx.queryParams\`): the plan's own, with its wired filter values put in.
  public func queryParams(_ json: String, _ values: [String: Any?] = [:], wiredClient: Bool = false) -> JSValue {
    host.invokeMethod("queryParams", withArguments: [json, js(values), wiredClient])
  }

  /// A function of a client module (\`api/client\`'s \`readSession\`), called now.
  public func call(module: String, _ name: String, _ args: [Any?] = []) -> Any? {
    guard let fn = host.invokeMethod("member", withArguments: [module, name]), fn.isObject else { return nil }
    return swift(fn.call(withArguments: args.map { js($0) }))
  }

  /// EXP-022 S7. What a test calls between scenarios: the web export's modules and the Global Stores start again, as a
  /// relaunch starts them.
  public func fresh() {
    host.invokeMethod("fresh", withArguments: [])
    JSStore.held.removeAll()
  }

  /// EXP-022 S7. What a test calls to play under a scripted world: the clock standing at \`now\`, the random numbers given.
  public func world(now: Double, randoms: [Double]) {
    host.invokeMethod("world", withArguments: [now, randoms])
  }

  /// EXP-022 S7. A module of the web export, held as JavaScript (\`stores/app\`).
  public func module(_ name: String) -> JSValue {
    host.invokeMethod("module", withArguments: [name])
  }

  func storeSet(_ store: JSValue, _ key: String, _ value: Any?) {
    host.invokeMethod("storeSet", withArguments: [store, key, js(value)])
  }

  func stream(_ module: String, _ factory: String, _ source: [String: Any], _ second: JSValue?, _ rerender: JSValue) -> JSValue {
    host.invokeMethod("stream", withArguments: [module, factory, js(source), second ?? JSValue(nullIn: context)!, rerender])
  }

  func applyInputs(_ node: JSValue, _ applied: JSValue, _ options: [String: Any?]) -> [String] {
    host.invokeMethod("applyInputs", withArguments: [node, applied, js(options)]).toArray() as? [String] ?? []
  }

  func setListeners(_ node: JSValue, _ names: [String], _ call: JSValue) {
    host.invokeMethod("setListeners", withArguments: [node, names, call])
  }

  func newNode(_ signals: [String]) -> JSValue {
    host.invokeMethod("node", withArguments: [signals])
  }

  /// A Swift value as JavaScript: nil is undefined, NSNull is null.
  public func js(_ value: Any?) -> JSValue {
    guard let value else { return JSValue(undefinedIn: context) }
    switch value {
    case let v as JSValue: return v
    case is NSNull: return JSValue(nullIn: context)
    case let b as Bool: return JSValue(bool: b, in: context)
    case let d as Double: return JSValue(double: d, in: context)
    case let i as Int: return JSValue(double: Double(i), in: context)
    case let s as String: return JSValue(object: s, in: context)
    case let list as [Any?]:
      let array = JSValue(newArrayIn: context)!
      for (i, item) in list.enumerated() { array.setValue(js(item), at: i) }
      return array
    case let list as [Any]:
      let array = JSValue(newArrayIn: context)!
      for (i, item) in list.enumerated() { array.setValue(js(item), at: i) }
      return array
    case let record as [String: Any?]:
      let object = JSValue(newObjectIn: context)!
      for (k, v) in record where v != nil { object.setValue(js(v), forProperty: k) }
      return object
    case let record as [String: Any]:
      let object = JSValue(newObjectIn: context)!
      for (k, v) in record { object.setValue(js(v), forProperty: k) }
      return object
    default: return JSValue(undefinedIn: context)
    }
  }

  /// A JavaScript value as Swift: lists and plain records by value, anything else JavaScript made by reference.
  public func swift(_ value: JSValue) -> Any? {
    if value.isUndefined { return nil }
    if value.isNull { return NSNull() }
    if value.isBoolean { return value.toBool() }
    if value.isNumber { return value.toDouble() }
    if value.isString { return value.toString() }
    if value.isArray {
      let count = Int(value.forProperty("length").toInt32())
      return (0..<count).map { swift(value.atIndex($0)) ?? NSNull() } as [Any]
    }
    if value.isObject, host.invokeMethod("isPlainObject", withArguments: [value]).toBool() {
      var record: [String: Any] = [:]
      for key in context.objectForKeyedSubscript("Object").invokeMethod("keys", withArguments: [value]).toArray() as? [String] ?? [] {
        if let v = swift(value.forProperty(key)) { record[key] = v }
      }
      return record
    }
    return value
  }

  /// JavaScript's String(value).
  public func string(_ value: Any?) -> String {
    context.objectForKeyedSubscript("String").call(withArguments: [js(value)]).toString()
  }

  /// JavaScript's Number(value).
  public func number(_ value: Any?) -> Double {
    context.objectForKeyedSubscript("Number").call(withArguments: [js(value)]).toDouble()
  }
}

/// A Function node's state, kept across runs as the running app's node keeps it: one per placement, in \`@State\`.
public final class FunctionNode {
  private let signals: [String]
  /// What the body writes or sends after a run has returned (a timer, a listener), as the running app's node delivers it.
  public var late: ((FunctionRun) -> Void)?
  private lazy var node: JSValue = {
    let node = Scripts.shared.newNode(signals)
    let late: @convention(block) (JSValue) -> Void = { [weak self] run in
      guard let self, let late = self.late else { return }
      late(Scripts.shared.runOf(run))
    }
    node.setValue(late, forProperty: "late")
    return node
  }()
  public init(signals: [String]) { self.signals = signals }

  /// One run: the body against the node's recording \`Outputs\`.
  public func run(_ id: String, _ inputs: [String: Any?]) -> FunctionRun {
    Scripts.shared.run(id, inputs, node: node)
  }

  /// The node's outputs now: an awaiting body writes them after its run has returned (React reads \`run.outputs\` live).
  public var outputs: [String: Any] {
    (Scripts.shared.swift(node.forProperty("outputs")) as? [String: Any]) ?? [:]
  }

  /// What each output last sent down its wire (undefined is never sent).
  public var delivered: [String: Any] {
    (Scripts.shared.swift(node.forProperty("delivered")) as? [String: Any]) ?? [:]
  }
}

/// A run's outputs (the node's values after it) and the signals it sent, in order, with the values each one's chain reads.
public struct FunctionRun {
  public let outputs: [String: Any]
  public let pulses: [FunctionPulse]
  /// An awaiting body's promise: \`Scripts.shared.settled(run)\` waits for it.
  public var settled: JSValue? = nil
}

/// A backend call on its way: its answer, once it has one, to whoever waits for it.
public final class PendingCall {
  private var result: Result<Any?, Error>?
  private var waiting: [(Result<Any?, Error>) -> Void] = []
  func settle(_ result: Result<Any?, Error>) {
    self.result = result
    waiting.forEach { $0(result) }
    waiting = []
  }
  func then(_ next: @escaping (Result<Any?, Error>) -> Void) {
    if let result { next(result) } else { waiting.append(next) }
  }
}

/// Who is signed in (USER-FAMILY-TARGET §4c): the session the web client stores, read by its own \`readSession\`, and read
/// again whenever the client says it changed (\`subscribeSession\`), as React's \`useSession\` reads it.
public final class Session: ObservableObject {
  public static let shared = Session()
  @Published public private(set) var authenticated = false
  @Published public private(set) var user: [String: Any]? = nil
  private init() {
    refresh()
    let changed: @convention(block) () -> Void = { [weak self] in self?.refresh() }
    _ = Scripts.shared.call(module: "api/client", "subscribeSession", [JSValue(object: changed, in: Scripts.shared.context)])
  }

  private func refresh() {
    guard let stored = Scripts.shared.call(module: "api/client", "readSession") as? [String: Any] else {
      authenticated = false
      user = nil
      return
    }
    authenticated = true
    var read: [String: Any] = [:]
    for (field, key) in [("id", "objectId"), ("username", "username"), ("email", "email")] {
      if let value = stored[key] { read[field] = value }
    }
    user = read
  }

  /// \`session.authenticated\`, or a field of \`session.user\` (undefined when nobody is signed in).
  public func read(_ field: String) -> Any? {
    field == "authenticated" ? authenticated : user?[field]
  }
}

/// What a backend call failed with: the message the React app's catch reads.
public struct BackendError: Error, CustomStringConvertible {
  public let message: String
  public var description: String { message }
}

public struct FunctionPulse {
  public let signal: String
  public let values: [String: Any]
}

/// What JavaScript calls before the Swift object that answers it exists.
private final class Relay {
  var fire: () -> Void = {}
}

/// EXP-022 S7. A Global Store: the web export's own module (\`stores/<name>\`, \`@nodegx/core\`'s \`store()\`) in the
/// JavaScript host. Read by key, written one key at a time; every write tells the views that read it to draw again, as
/// React's \`useStore\` does.
public final class JSStore: ObservableObject {
  /// One per store, made when first read (\`Stores.app\`), forgotten by \`Scripts.shared.fresh()\`.
  static var held: [String: JSStore] = [:]
  public static func named(_ module: String, _ export: String) -> JSStore {
    if let store = held[module] { return store }
    let store = JSStore(module: module, export: export)
    held[module] = store
    return store
  }

  public let value: JSValue
  public init(module: String, export: String) {
    value = Scripts.shared.module(module).forProperty(export)
    let relay = Relay()
    let changed: @convention(block) () -> Void = { relay.fire() }
    value.invokeMethod("subscribe", withArguments: [JSValue(object: changed, in: Scripts.shared.context)!])
    relay.fire = { [weak self] in self?.objectWillChange.send() }
  }

  /// \`app.get().key\`: undefined (nil) when the store has no such key.
  public func get(_ key: String) -> Any? {
    Scripts.shared.swift(value.invokeMethod("peek", withArguments: []).forProperty(key))
  }

  /// \`app.set({ key: value })\`.
  public func set(_ key: String, _ newValue: Any?) {
    Scripts.shared.storeSet(value, key, newValue)
  }
}

/// EXP-022 S7. A node of the web export's own \`lib/history\` or \`lib/actions\` (State History, Undo / Redo, State
/// Snapshot, Optimistic Update, Action Dispatcher, Action Handler): made once per placement, as React's hook makes it, and
/// held in \`@StateObject\`. Its options are applied as they change, its listeners set at every draw, its values read live;
/// when it says it changed, the view draws again.
public final class StreamNode: ObservableObject {
  public let node: JSValue
  private let applied: JSValue
  private var handlers: [String: () -> Void] = [:]
  private var listening: [String] = []
  /// How many options reached the node's setters, and how many of them were its Key: React's \`changes\` and \`keys\`.
  public private(set) var changes = 0
  public private(set) var keyChanges = 0

  public init(module: String, factory: String, source: [String: Any], with second: JSValue? = nil) {
    let relay = Relay()
    let rerender: @convention(block) () -> Void = { relay.fire() }
    node = Scripts.shared.stream(module, factory, source, second, JSValue(object: rerender, in: Scripts.shared.context)!)
    applied = Scripts.shared.context.evaluateScript("new Map()")
    relay.fire = { [weak self] in self?.objectWillChange.send() }
  }

  /// The options as this draw has them (an undefined one runs no setter).
  public func inputs(_ options: [String: Any?]) {
    let changed = Scripts.shared.applyInputs(node, applied, options)
    changes += changed.count
    if changed.contains("key") { keyChanges += 1 }
  }

  /// The chains wired off its signals, as this draw has them.
  public func on(_ listeners: [String: () -> Void]) {
    handlers = listeners
    let names = listeners.keys.sorted()
    if names == listening { return }
    listening = names
    let call: @convention(block) (String) -> Void = { [weak self] name in self?.handlers[name]?() }
    Scripts.shared.setListeners(node, names, JSValue(object: call, in: Scripts.shared.context)!)
  }

  /// A signal input (\`undo\`, \`dispatch\`), with the value its data port carries where it takes one.
  public func act(_ verb: String, _ args: Any?...) {
    _ = node.invokeMethod(verb, withArguments: args.map { Scripts.shared.js($0) })
  }

  /// A value output, live.
  public func read(_ field: String) -> Any? {
    Scripts.shared.swift(node.forProperty(field))
  }

  /// A method of the node's own (\`setupTracking\`, \`dispose\`).
  public func call(_ method: String) {
    _ = node.invokeMethod(method, withArguments: [])
  }

  /// The Action Handler's registration: what it registers under, and whether a setter asked for it again.
  public var registrationKey: String { node.forProperty("registrationKey").toString() }
  public var setupRequested: Bool { node.forProperty("setupRequested").toBool() }
}

/// EXP-022 S9. An On App Error (the web export's \`useAppError\`): it hears every error raised on the app's channel (the
/// web export's own \`lib/errors\`) while its view is on screen. A Filter is a code prefix; empty catches everything. Its
/// values describe the latest error it accepted, and are current before its Error chain runs. Every boundary hears every
/// error: nothing claims one.
public final class AppErrorBoundary: ObservableObject {
  @Published public private(set) var last: [String: Any]? = nil
  private var filter: Any? = nil
  private var onError: () -> Void = {}
  private var unsubscribe: JSValue?

  public init() {
    let heard: @convention(block) (JSValue) -> Void = { [weak self] error in self?.hear(error) }
    unsubscribe = Scripts.shared.module("lib/errors").invokeMethod("subscribeAppErrors", withArguments: [JSValue(object: heard, in: Scripts.shared.context)!])
  }

  deinit { _ = unsubscribe?.call(withArguments: []) }

  /// Its Filter, as this draw has it.
  public func inputs(filter: Any?) { self.filter = filter }

  /// The chain wired off its Error, as this draw has it.
  public func on(_ error: @escaping () -> Void) { onError = error }

  private func hear(_ error: JSValue) {
    // The hook's own coercion: undefined and null clear the Filter, anything else is String(value); empty catches all.
    if let filter, !(filter is NSNull) {
      let prefix = Scripts.shared.string(filter)
      if !prefix.isEmpty && !error.forProperty("code").toString().hasPrefix(prefix) { return }
    }
    last = Scripts.shared.swift(error) as? [String: Any]
    onError()
  }

  /// A value output: Message, Code, Node Id, Component Name, Node Type, or the Error Object (the record itself).
  public func read(_ field: String) -> Any? {
    field == "errorObject" ? last : last?[field]
  }
}

/// EXP-022 S9. The app's error channel, from Swift.
public enum AppErrors {
  /// P18-S106-PARSERAISE. A parser's failed parse, raised as the node raises it: the web export's own \`<parser>Failure\`
  /// for these inputs, and when it failed, \`raiseAppError\` with the node's code, id, type and component.
  public static func raiseParse(_ failure: String, _ args: [Any?], code: String, nodeId: String, nodeType: String, componentName: String) {
    guard let failed = Scripts.shared.module("lib/parse").invokeMethod(failure, withArguments: args.map { Scripts.shared.js($0) }), failed.isObject else { return }
    let error: [String: Any?] = [
      "code": code,
      "message": Scripts.shared.swift(failed.forProperty("message")),
      "nodeId": nodeId,
      "nodeType": nodeType,
      "componentName": componentName,
      "detail": Scripts.shared.swift(failed.forProperty("detail"))
    ]
    _ = Scripts.shared.module("lib/errors").invokeMethod("raiseAppError", withArguments: [Scripts.shared.js(error)])
  }
}
`;
