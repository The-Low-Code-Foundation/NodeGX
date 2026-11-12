// @nodegx:generated (EXP-022) — Logic/Label, printed from the same plan as the React export.
import SwiftUI

struct LabelLogic: View {
  // Logic/Label — a logic component: it draws nothing, and every component that places it calls it
  var y: Any? = nil
  var onTextChanged: (Any?) -> Void = { _ in }
  @State var workMemo = Memo()

  var body: some View {
    stage1
  }

  /// Work's outputs, run again only when its inputs change.
  var workOut: Any? {
    workMemo.value(Same(y)) { Scripts.shared.call("Logic/Label/Work", ["y": y]) }
  }

  @ViewBuilder var content: some View {
    Logic {}
  }

  var stage1: some View {
    content
      .onChange(of: Same(JS.field(workOut, "text")), initial: true) { _, value in onTextChanged(value.value) }
  }
}
