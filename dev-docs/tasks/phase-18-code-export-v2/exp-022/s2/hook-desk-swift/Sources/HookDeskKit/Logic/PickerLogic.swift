// @nodegx:generated (EXP-022) — Logic/Picker, printed from the same plan as the React export.
import SwiftUI

struct PickerLogic: View {
  // Logic/Picker — a logic component: it draws nothing, and every component that places it calls it
  var which: Any? = nil
  var go: Pulse? = nil
  var onPickedChanged: (Any?) -> Void = { _ in }
  @State var workOut: Any? = nil
  @State var workNode = FunctionNode(signals: [])

  var body: some View {
    stage1
  }

  @ViewBuilder var content: some View {
    Logic {}
  }

  var stage1: some View {
    content
      .onChange(of: Same(JS.field(workOut, "picked")), initial: true) { _, value in onPickedChanged(value.value) }
      // "go", a signal the parent sends in: its chain runs once for each pulse sent, never twice.
      .onChange(of: go?.sent, initial: true) { _, _ in
        guard let go, go.taken.current != go.sent else { return }
        go.taken.current = go.sent
        let workRun = workNode.run("Logic/Picker/Work", ["which": which])
        workOut = workRun.outputs
      }
  }
}
