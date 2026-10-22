// @nodegx:generated (EXP-022) — Row/Item, printed from the same plan as the React export.
import SwiftUI

struct ItemView: View {
  // Row
  var id: Any? = nil
  var name: Any? = nil
  var onPick: () -> Void = {}
  var onIdChanged: (Any?) -> Void = { _ in }

  var body: some View {
    stage1
  }

  @ViewBuilder var content: some View {
    VStack(alignment: .leading, spacing: 0) {
      Text(verbatim: JS.show(name))
        .collapsedWhenEmpty(JS.show(name))
        .node(0, "riText", text: JS.show(name))
        .frame(maxWidth: .infinity, alignment: .leading)
      Button(action: riPickPressed) {
        Text(verbatim: JS.show(name))
      }
      .buttonStyle(.plain)
      .node(1, "riPick", label: JS.show(name), press: riPickPressed)
        .frame(maxWidth: .infinity, alignment: .leading)
    }
  }

  var stage1: some View {
    content
      .onChange(of: Same(id), initial: true) { _, value in onIdChanged(value.value) }
  }

  func riPickPressed() {
    onPick()
  }
}
