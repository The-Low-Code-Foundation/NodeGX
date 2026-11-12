// @nodegx:generated (EXP-022) — Logic/Double, printed from the same plan as the React export.
import SwiftUI

struct DoubleLogic: View {
  // Logic/Double — a logic component: it draws nothing, and every component that places it calls it
  var x: Any? = nil
  var onYChanged: (Any?) -> Void = { _ in }
  @State var workMemo = Memo()

  var body: some View {
    stage1
  }

  /// Work's outputs, run again only when its inputs change.
  var workOut: Any? {
    workMemo.value(Same(x)) { Scripts.shared.call("Logic/Double/Work", ["x": x]) }
  }

  @ViewBuilder var content: some View {
    Logic {}
  }

  var stage1: some View {
    content
      .onChange(of: Same(JS.field(workOut, "y")), initial: true) { _, value in onYChanged(value.value) }
  }
}
