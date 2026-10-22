// @nodegx:generated (EXP-022) — Logic/Stamp, printed from the same plan as the React export.
import SwiftUI

struct StampLogic: View {
  // Logic/Stamp — a logic component: it draws nothing, and every component that places it calls it
  var x: Any? = nil
  var onRowsChanged: (Any?) -> Void = { _ in }
  @State var workOut: Any? = nil
  @State var workNode = FunctionNode(signals: [])
  @State var workHeld = Ref<[Any?]>([])
  @State var workRunLoaded = Ref(false)

  var body: some View {
    stage1
  }

  @ViewBuilder var content: some View {
    Logic {}
  }

  var stage1: some View {
    content
      .onChange(of: Same(JS.field(workOut, "rows")), initial: true) { _, value in onRowsChanged(value.value) }
      // Work — runs once at load and again when a ticked input gets a new value; nothing sends its Run (EXP-019 slice 2).
      .onChange(of: Same(x), initial: true) { _, _ in
        let workRunNow = {
          workRunLoaded.current = true
          let workRun = workNode.run("Logic/Stamp/Work", ["x": x])
          workOut = workRun.outputs
        }
        if JS.tickedArrival(workHeld, [x]) {
          workRunNow()
          return
        }
        if workRunLoaded.current { return }
        DispatchQueue.main.async { if !workRunLoaded.current { workRunNow() } }
      }
  }
}
