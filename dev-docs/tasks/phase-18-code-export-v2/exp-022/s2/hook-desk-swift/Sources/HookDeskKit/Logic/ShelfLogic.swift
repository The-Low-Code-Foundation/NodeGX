// @nodegx:generated (EXP-022) — Logic/Shelf, printed from the same plan as the React export.
import SwiftUI

struct ShelfLogic: View {
  // Logic/Shelf — a logic component: it draws nothing, and every component that places it calls it
  var n: Any? = nil
  var onRowsChanged: (Any?) -> Void = { _ in }
  @State var workMemo = Memo()

  var body: some View {
    stage1
  }

  /// Work's outputs, run again only when its inputs change.
  var workOut: Any? {
    workMemo.value(Same(n)) { Scripts.shared.call("Logic/Shelf/Work", ["n": n]) }
  }

  @ViewBuilder var content: some View {
    Logic {}
  }

  var stage1: some View {
    content
      .onChange(of: Same(JS.field(workOut, "rows")), initial: true) { _, value in onRowsChanged(value.value) }
  }
}
