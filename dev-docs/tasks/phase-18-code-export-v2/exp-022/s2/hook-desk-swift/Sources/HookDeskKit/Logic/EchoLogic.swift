// @nodegx:generated (EXP-022) — Logic/Echo, printed from the same plan as the React export.
import SwiftUI

struct EchoLogic: View {
  // Logic/Echo — a logic component: it draws nothing, and every component that places it calls it
  var said: Any? = nil
  var take: Pulse? = nil
  var onEchoChanged: (Any?) -> Void = { _ in }
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
      .onChange(of: Same(JS.field(workOut, "echo")), initial: true) { _, value in onEchoChanged(value.value) }
      // "take", a signal the parent sends in: its chain runs once for each pulse sent, never twice.
      .onChange(of: take?.sent, initial: true) { _, _ in
        guard let take, take.taken.current != take.sent else { return }
        take.taken.current = take.sent
        let workRun = workNode.run("Logic/Echo/Work", ["said": said])
        workOut = workRun.outputs
      }
  }
}
