// @nodegx:generated (EXP-022) — Logic/Tally, printed from the same plan as the React export.
import SwiftUI

struct TallyLogic: View {
  // Logic/Tally — a logic component: it draws nothing, and every component that places it calls it
  var step: Any? = nil
  var go: Pulse? = nil
  var onDone: () -> Void = {}
  var onTotalChanged: (Any?) -> Void = { _ in }
  @State var workOut: Any? = nil
  @State var workNode = FunctionNode(signals: ["done"])

  var body: some View {
    stage1
  }

  @ViewBuilder var content: some View {
    Logic {}
  }

  var stage1: some View {
    content
      .onChange(of: Same(JS.field(workOut, "total")), initial: true) { _, value in onTotalChanged(value.value) }
      // "go", a signal the parent sends in: its chain runs once for each pulse sent, never twice.
      .onChange(of: go?.sent, initial: true) { _, _ in
        guard let go, go.taken.current != go.sent else { return }
        go.taken.current = go.sent
        let workRun = workNode.run("Logic/Tally/Work", ["step": step])
        workOut = workRun.outputs
        for workPulse in workRun.pulses {
          if workPulse.signal == "done" {
            onDone()
          }
        }
      }
  }
}
