/**
 * EXP-022. The constant Swift the printed views lean on: JavaScript's truthiness and text conversion (a graph's values
 * are JavaScript values, so a `mounted` or a Text reads them by JavaScript's rules), a For Each row's field, and the
 * wrapping row a `flex-wrap: wrap` group is.
 *
 * S2 adds what the plan's logic prints into: a `Ref` (React's `useRef`, kept in `@State`), the `Pulse` a parent hands a
 * placed component's signal input, `Same` (a graph value as an effect's key, by JavaScript's equality), a `Memo` for a
 * render run, `tickedArrival`, and the seam a test reads the app through (`Probe`, `.node(…)`, and on macOS `Drive`).
 *
 * @module emit/swift/support
 */

export const SUPPORT_SWIFT = `// @nodegx:generated (EXP-022) — the rules the graph's values follow, in Swift.
import SwiftUI
import JavaScriptCore

/// The graph's values are JavaScript values: these read them by JavaScript's rules. \`nil\` is \`undefined\`, \`NSNull\`
/// is \`null\`, numbers are \`Double\`, a list is \`[Any]\`, a record is \`[String: Any]\`, and anything else JavaScript made
/// (a \`Date\`, a function) stays the \`JSValue\` it is.
public enum JS {
  /// JavaScript's truthiness: what a \`mounted\` or a Condition reads. nil, null, false, 0, NaN and "" are false.
  public static func truthy(_ value: Any?) -> Bool {
    guard let value else { return false }
    switch value {
    case is NSNull: return false
    case let b as Bool: return b
    case let d as Double: return d != 0 && !d.isNaN
    case let i as Int: return i != 0
    case let s as String: return !s.isEmpty
    case let v as JSValue: return v.toBool()
    case Optional<Any>.none: return false
    default: return true
    }
  }

  /// A value as a Text draws it (\`{value ?? ''}\`): JavaScript's String(value), but nothing for undefined and null.
  public static func show(_ value: Any?) -> String {
    guard let value else { return "" }
    switch value {
    case is NSNull: return ""
    case Optional<Any>.none: return ""
    default: return string(value)
    }
  }

  /// JavaScript's String(value).
  public static func string(_ value: Any?) -> String {
    guard let value else { return "undefined" }
    switch value {
    case is NSNull: return "null"
    case let s as String: return s
    case let b as Bool: return b ? "true" : "false"
    case let d as Double: return number(text: d)
    case let i as Int: return String(i)
    case Optional<Any>.none: return "undefined"
    default: return Scripts.shared.string(value)
    }
  }

  /// A number as JavaScript prints it: no ".0" on a whole number.
  static func number(text d: Double) -> String {
    if d == 0 { return "0" }
    if d.isNaN { return "NaN" }
    if d.isInfinite { return d > 0 ? "Infinity" : "-Infinity" }
    if d == d.rounded() && abs(d) < 1e21 { return String(format: "%.0f", d) }
    return Scripts.shared.string(d)
  }

  /// JavaScript's Number(value), NaN where it reads none.
  public static func number(_ value: Any?) -> Double {
    guard let value else { return .nan }
    switch value {
    case is NSNull: return 0
    case let d as Double: return d
    case let i as Int: return Double(i)
    case let b as Bool: return b ? 1 : 0
    case let s as String:
      let t = s.trimmingCharacters(in: .whitespacesAndNewlines)
      return t.isEmpty ? 0 : (Double(t) ?? .nan)
    default: return Scripts.shared.number(value)
    }
  }

  /// JavaScript's \`value ?? fallback\`: the fallback for undefined and null.
  public static func nullish(_ value: Any?, _ fallback: Any?) -> Any? {
    guard let value, !(value is NSNull) else { return fallback }
    return value
  }

  /// What a Set writes into a text field: the start text for undefined, nothing for null, else JavaScript's String(value).
  public static func fieldText(_ value: Any?, start: String) -> String {
    guard let value else { return start }
    return value is NSNull ? "" : string(value)
  }

  /// An Expression's \`asNumber\` fold: \`typeof x === 'number' ? x : Number(x) || 0\`.
  public static func numberFold(_ value: Any?) -> Double {
    if let d = value as? Double { return d }
    let n = number(value)
    return n.isNaN || n == 0 ? 0 : n
  }

  /// A For Each's items: an array, or no rows.
  public static func rows(_ value: Any?) -> [Any] {
    if let list = value as? [Any] { return list }
    if let v = value as? JSValue, v.isArray, let list = Scripts.shared.swift(v) as? [Any] { return list }
    return []
  }

  /// A record's field, as a template input reads it (a value that is not an object has no fields).
  public static func field(_ record: Any?, _ name: String) -> Any? {
    if let r = record as? [String: Any] { return r[name] }
    if let v = record as? JSValue, v.isObject { return Scripts.shared.swift(v.forProperty(name)) }
    return nil
  }

  /// Equality as an effect's dependency reads it: primitives by value (NaN is NaN), lists and records by what they hold,
  /// anything JavaScript made by identity (\`===\`).
  public static func same(_ a: Any?, _ b: Any?) -> Bool {
    switch (a, b) {
    case (nil, nil): return true
    case (nil, _), (_, nil): return false
    case let (x as [Any?], y as [Any?]): return x.count == y.count && zip(x, y).allSatisfy { same($0, $1) }
    default: break
    }
    switch (a!, b!) {
    case (is NSNull, is NSNull): return true
    case let (x as Bool, y as Bool): return x == y
    case let (x as Double, y as Double): return x == y || (x.isNaN && y.isNaN)
    case let (x as Int, y as Int): return x == y
    case let (x as String, y as String): return x == y
    case let (x as [Any], y as [Any]): return x.count == y.count && zip(x, y).allSatisfy { same($0, $1) }
    case let (x as [String: Any], y as [String: Any]):
      return x.count == y.count && x.allSatisfy { k, v in y[k] != nil && same(v, y[k]) }
    case let (x as JSValue, y as JSValue): return x.isEqual(to: y)
    default: return false
    }
  }

  /// \`tickedArrival\` (the web export's \`functionRun.ts\`): one of the ticked inputs holds a value that is not undefined
  /// (never delivered) and not the one that input already holds. Records each one that arrived.
  /// EXP-022 S3. A node that was asked to act and could not (the web export's \`raiseAppError\`): said in the log.
  public static func raise(_ message: String, node: String, in component: String) {
    print("[nodegx] \\(component) \\(node): \\(message)")
  }

  public static func tickedArrival(_ held: Ref<[Any?]>, _ values: [Any?]) -> Bool {
    var arrived = false
    for (i, value) in values.enumerated() {
      guard let value else { continue }
      while held.current.count <= i { held.current.append(nil) }
      if same(value, held.current[i]) { continue }
      held.current[i] = value
      arrived = true
    }
    return arrived
  }
}

/// React's \`useRef\`: a box a view keeps across renders (in \`@State\`), which no write re-renders.
public final class Ref<Value> {
  public var current: Value
  public init(_ current: Value) { self.current = current }
}

/// A signal sent into a placed component: how many times the parent has sent it, and (a box the parent keeps, so it
/// outlives the child) how many the child has acted on. The child runs the signal's chain when \`sent\` passes \`taken\`.
public struct Pulse: Equatable {
  public var sent: Double
  public let taken: Ref<Double>
  public init(sent: Double, taken: Ref<Double>) {
    self.sent = sent
    self.taken = taken
  }
  public static func == (a: Pulse, b: Pulse) -> Bool { a.sent == b.sent && a.taken === b.taken }
}

/// Graph values as an effect's key (\`.onChange(of:)\`), compared by JavaScript's equality (\`JS.same\`).
public struct Same: Equatable {
  public let values: [Any?]
  public init(_ values: Any?...) { self.values = values }
  public var value: Any? { values.first ?? nil }
  public static func == (a: Same, b: Same) -> Bool { JS.same(a.values, b.values) }
}

/// React's \`useMemo\`: a render run's outputs, computed again only when its inputs change.
public final class Memo {
  private var key: Same?
  private var value: Any?
  public init() {}
  public func value(_ key: Same, _ make: () -> Any?) -> Any? {
    if let k = self.key, k == key { return value }
    self.key = key
    value = make()
    return value
  }
}

extension View {
  /// An empty text as an empty CSS block: no height, but still a child its stack spaces.
  func collapsedWhenEmpty(_ text: String) -> some View {
    frame(height: text.isEmpty ? 0 : nil).clipped()
  }
}

/// A logic component draws nothing: an empty, zero-sized view that holds its state and runs its effects.
struct Logic<Content: View>: View {
  @ViewBuilder var content: Content
  var body: some View {
    Color.clear.frame(width: 0, height: 0).background { content }
  }
}

// MARK: - The seam a test reads the app through (EXP-022 S2)

/// What the app draws, as a test reads it: each Text and Button reports what it shows, by the graph node it came from and
/// where it sits in the page (\`path\`, compared in order), and a Button its press. Nothing installs one in the app, so
/// \`Probe.current\` is nil and every report is a no-op.
public final class Probe {
  public static var current: Probe?
  public struct Entry {
    public var path: [Int]
    public var node: String
    public var role: String
    public var text: String
    public var press: (() -> Void)?
  }
  public private(set) var entries: [UUID: Entry] = [:]
  /// Moves on every change a report makes, so a driver can wait for the page to settle.
  public private(set) var version = 0
  public init() {}

  func report(_ key: UUID, _ entry: Entry) {
    let old = entries[key]
    entries[key] = entry
    if old?.text != entry.text || old?.path != entry.path { version += 1 }
  }
  func remove(_ key: UUID) {
    if entries.removeValue(forKey: key) != nil { version += 1 }
  }
  /// The drawn entries, in page order.
  public func ordered(_ role: String? = nil) -> [Entry] {
    entries.values.filter { role == nil || $0.role == role }.sorted { $0.path.lexicographicallyPrecedes($1.path) }
  }
}

private struct NodePathKey: EnvironmentKey {
  static let defaultValue: [Int] = []
}

extension EnvironmentValues {
  /// Where a view sits in the page: the ordinal of each placement and row above it.
  var nodePath: [Int] {
    get { self[NodePathKey.self] }
    set { self[NodePathKey.self] = newValue }
  }
}

private struct NodeReport: ViewModifier {
  let ordinal: Int
  let node: String
  let role: String
  let text: String
  let press: (() -> Void)?
  @Environment(\\.nodePath) private var path
  @State private var key = UUID()
  func body(content: Content) -> some View {
    let _ = Probe.current?.report(key, Probe.Entry(path: path + [ordinal], node: node, role: role, text: text, press: press))
    return content.onDisappear { Probe.current?.remove(key) }
  }
}

private struct NodePlacement: ViewModifier {
  let steps: [Int]
  @Environment(\\.nodePath) private var path
  func body(content: Content) -> some View {
    content.environment(\\.nodePath, path + steps)
  }
}

extension View {
  /// The graph node a Text came from, and what it shows.
  func node(_ ordinal: Int, _ id: String, text: String) -> some View {
    modifier(NodeReport(ordinal: ordinal, node: id, role: "text", text: text, press: nil))
  }
  /// The graph node a Button came from, its label and its press.
  func node(_ ordinal: Int, _ id: String, label: String, press: @escaping () -> Void) -> some View {
    modifier(NodeReport(ordinal: ordinal, node: id, role: "button", text: label, press: press))
  }
  /// A placed component, or one row of a For Each: what it draws sits here in the page.
  func node(_ ordinal: Int, row: Int? = nil) -> some View {
    modifier(NodePlacement(steps: row.map { [ordinal, $0] } ?? [ordinal]))
  }
}

#if os(macOS)
import AppKit

/// Draws a view in an off-screen window and drives it as the arms drive the web app: read every Text, press a Button by
/// its label, and let the page settle between (its effects, the timers it set, the renders they ask for).
@MainActor
public final class Drive {
  public let probe = Probe()
  private let window: NSWindow

  public init<V: View>(_ view: V) {
    Probe.current = probe
    _ = NSApplication.shared
    let host = NSHostingView(rootView: view)
    window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 390, height: 844), styleMask: [.borderless], backing: .buffered, defer: false)
    window.contentView = host
    window.setFrameOrigin(NSPoint(x: -20000, y: -20000))
    window.orderFrontRegardless()
    settle()
  }

  /// Runs the main loop until nothing the page reports has changed for a while and no request is waiting for its answer.
  public func settle(quiet: TimeInterval = 0.08, limit: TimeInterval = 10) {
    let end = Date().addingTimeInterval(limit)
    var last = -1
    var still = Date()
    while Date() < end {
      window.contentView?.layoutSubtreeIfNeeded()
      RunLoop.main.run(until: Date().addingTimeInterval(0.01))
      if probe.version != last || Scripts.inFlight > 0 {
        last = probe.version
        still = Date()
      } else if Date().timeIntervalSince(still) >= quiet {
        return
      }
    }
  }

  /// Every Text's text, in page order.
  public func read() -> [String] {
    probe.ordered("text").map { $0.text.trimmingCharacters(in: .whitespacesAndNewlines) }
  }

  /// Presses the first Button whose label is \`label\`, then lets the page settle. False when there is none.
  @discardableResult
  public func press(_ label: String) -> Bool {
    guard let button = probe.ordered("button").first(where: { $0.text.trimmingCharacters(in: .whitespacesAndNewlines) == label }) else { return false }
    button.press?()
    settle()
    return true
  }

  public func close() {
    window.orderOut(nil)
    Probe.current = nil
  }
}
#endif

/// \`flex-wrap: wrap\`: children left to right, onto the next line when the row is full.
struct WrapStack: Layout {
  var spacing: CGFloat = 0
  var lineSpacing: CGFloat = 0

  func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
    let lines = arrange(width: proposal.width ?? .infinity, subviews: subviews)
    let width = lines.map(\\.width).max() ?? 0
    let height = lines.map(\\.height).reduce(0, +) + lineSpacing * CGFloat(max(lines.count - 1, 0))
    return CGSize(width: proposal.width ?? width, height: height)
  }

  func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
    var y = bounds.minY
    for line in arrange(width: bounds.width, subviews: subviews) {
      var x = bounds.minX
      for index in line.indices {
        let size = subviews[index].sizeThatFits(.unspecified)
        subviews[index].place(at: CGPoint(x: x, y: y + (line.height - size.height) / 2), proposal: ProposedViewSize(size))
        x += size.width + spacing
      }
      y += line.height + lineSpacing
    }
  }

  private func arrange(width: CGFloat, subviews: Subviews) -> [(indices: [Int], width: CGFloat, height: CGFloat)] {
    var lines: [(indices: [Int], width: CGFloat, height: CGFloat)] = []
    var current: (indices: [Int], width: CGFloat, height: CGFloat) = ([], 0, 0)
    for index in subviews.indices {
      let size = subviews[index].sizeThatFits(.unspecified)
      let next = current.indices.isEmpty ? size.width : current.width + spacing + size.width
      if next > width && !current.indices.isEmpty {
        lines.append(current)
        current = ([index], size.width, size.height)
      } else {
        current = (current.indices + [index], next, max(current.height, size.height))
      }
    }
    if !current.indices.isEmpty { lines.append(current) }
    return lines
  }
}
`;
