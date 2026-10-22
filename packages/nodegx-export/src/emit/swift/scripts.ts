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

/** One Function's file: the wrapper the React export writes, in plain JavaScript, registered by its id. */
export function functionFileJs(plan: ComponentPlan, def: JsFunctionPlan): string {
  const self = keepsThis(def);
  return [
    `// @nodegx:generated (EXP-022) — the Function node "${def.fnName}" (node ${def.nodeId}) of ${plan.path}.`,
    '// The body is preserved verbatim; it runs in the app\'s JavaScriptCore context, as it runs in the web export.',
    ...(self ? ["// It keeps state on `this` across runs: the body runs bound to the node's own `self`."] : []),
    `__nodegx.define(${JSON.stringify(functionId(plan, def))}, function (Inputs, Outputs, self, Component) {`,
    '  try {',
    self ? '    (function () {' : '    (() => {',
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
// The page's global object is \`window\` in a browser; a body that reads \`window.localStorage\` reads the one below.
var window = globalThis;
// Kept on the device (UserDefaults), as a browser keeps it for the site: "remember this on this device" survives a relaunch.
var localStorage = {
  getItem: function (k) { var v = __storage('get', String(k), ''); return v === undefined ? null : v; },
  setItem: function (k, v) { __storage('set', String(k), String(v)); },
  removeItem: function (k) { __storage('remove', String(k), ''); },
  clear: function () { __storage('clear', '', ''); }
};

// The web export's src/lib/functionRun.ts, compiled to JavaScript.
${FUNCTION_RUN_JS}
var __nodegx = {
  fns: {},
  define: function (id, fn) { this.fns[id] = fn; },
  node: function (signals) { return functionNode(signals); },
  // A run against the node's recording Outputs: its values kept across runs, its pulses in the order it sent them.
  run: function (id, inputs, node) {
    var fn = this.fns[id];
    if (!fn) throw new Error('No Function ' + id);
    var run = runFunction(fn, inputs, node);
    return { outputs: Object.assign({}, run.outputs), pulses: run.pulses };
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
    context.setObject(log, forKeyedSubscript: "__log" as NSString)
    context.setObject(later, forKeyedSubscript: "__later" as NSString)
    context.setObject(storage, forKeyedSubscript: "__storage" as NSString)
    Scripts.load(context, "nodegx-host")
    for file in Scripts.functionFiles { Scripts.load(context, "functions/" + file) }
    host = context.objectForKeyedSubscript("__nodegx")
  }

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

  /// A run's record (\`{ outputs, pulses }\`) as Swift.
  func runOf(_ result: JSValue) -> FunctionRun {
    let outputs = (swift(result.forProperty("outputs")) as? [String: Any]) ?? [:]
    let pulses = (result.forProperty("pulses").toArray() ?? []).indices.map { i -> FunctionPulse in
      let pulse = result.forProperty("pulses").atIndex(i)!
      return FunctionPulse(signal: pulse.forProperty("signal").toString(), values: (swift(pulse.forProperty("values")) as? [String: Any]) ?? [:])
    }
    return FunctionRun(outputs: outputs, pulses: pulses)
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

  /// What each output last sent down its wire (undefined is never sent).
  public var delivered: [String: Any] {
    (Scripts.shared.swift(node.forProperty("delivered")) as? [String: Any]) ?? [:]
  }
}

/// A run's outputs (the node's values after it) and the signals it sent, in order, with the values each one's chain reads.
public struct FunctionRun {
  public let outputs: [String: Any]
  public let pulses: [FunctionPulse]
}

public struct FunctionPulse {
  public let signal: String
  public let values: [String: Any]
}
`;
