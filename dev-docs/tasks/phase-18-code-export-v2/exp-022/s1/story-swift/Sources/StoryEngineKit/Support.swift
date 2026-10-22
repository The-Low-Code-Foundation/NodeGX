// @nodegx:generated (EXP-022) — the rules the graph's values follow, in Swift.
import SwiftUI

/// The graph's values are JavaScript values: these read them by JavaScript's rules.
enum JS {
  /// JavaScript's truthiness: what a `mounted` or a Condition reads. nil, false, 0, NaN and "" are false.
  static func truthy(_ value: Any?) -> Bool {
    guard let value else { return false }
    switch value {
    case let b as Bool: return b
    case let d as Double: return d != 0 && !d.isNaN
    case let i as Int: return i != 0
    case let s as String: return !s.isEmpty
    case Optional<Any>.none: return false
    default: return true
    }
  }

  /// A value as a Text draws it: JavaScript's String(value), but nothing for nil.
  static func show(_ value: Any?) -> String {
    guard let value else { return "" }
    switch value {
    case let s as String: return s
    case let b as Bool: return b ? "true" : "false"
    case let d as Double: return d == d.rounded() && abs(d) < 1e15 ? String(Int(d)) : String(d)
    case let i as Int: return String(i)
    case Optional<Any>.none: return ""
    default: return String(describing: value)
    }
  }

  /// JavaScript's Number(value), NaN where it reads none.
  static func number(_ value: Any?) -> Double {
    guard let value else { return 0 }
    switch value {
    case let d as Double: return d
    case let i as Int: return Double(i)
    case let b as Bool: return b ? 1 : 0
    case let s as String: return s.trimmingCharacters(in: .whitespaces).isEmpty ? 0 : (Double(s) ?? .nan)
    default: return .nan
    }
  }

  /// A For Each's items: an array, or no rows.
  static func rows(_ value: Any?) -> [Any] {
    (value as? [Any]) ?? []
  }

  /// A row's field, as a template input reads it (a row that is not an object has no fields).
  static func field(_ row: Any, _ name: String) -> Any? {
    (row as? [String: Any])?[name] ?? nil
  }
}

extension View {
  /// An empty text as an empty CSS block: no height, but still a child its stack spaces.
  func collapsedWhenEmpty(_ text: String) -> some View {
    frame(height: text.isEmpty ? 0 : nil).clipped()
  }
}

/// `flex-wrap: wrap`: children left to right, onto the next line when the row is full.
struct WrapStack: Layout {
  var spacing: CGFloat = 0
  var lineSpacing: CGFloat = 0

  func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
    let lines = arrange(width: proposal.width ?? .infinity, subviews: subviews)
    let width = lines.map(\.width).max() ?? 0
    let height = lines.map(\.height).reduce(0, +) + lineSpacing * CGFloat(max(lines.count - 1, 0))
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
