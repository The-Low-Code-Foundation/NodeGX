// @nodegx:generated (EXP-022) — Pages/Home, printed from the same plan as the React export.
import SwiftUI

struct HomePageView: View {
  // Home
  @State var relayedId: Any? = nil
  @State var countDonesOut: Any? = nil
  @State var bumpOut: Any? = nil
  @State var tallyAGoPulses: Double = 0.0
  @State var tallyBGoPulses: Double = 0.0
  @State var echoTakePulses: Double = 0.0
  @State var pickerGoPulses: Double = 0.0
  @State var y: Any? = nil
  @State var text: Any? = nil
  @State var total: Any? = nil
  @State var total2: Any? = nil
  @State var echoTakeDelivered: Double = 0.0
  @State var echo: Any? = nil
  @State var rows: Any? = nil
  @State var rows2: Any? = nil
  @State var picked: Any? = nil
  @State var tallyAGoTaken = Ref(0.0)
  @State var tallyBGoTaken = Ref(0.0)
  @State var echoTakeTaken = Ref(0.0)
  @State var pickerGoTaken = Ref(0.0)
  @State var countDonesNode = FunctionNode(signals: [])
  @State var bumpNode = FunctionNode(signals: [])

  var body: some View {
    stage1
  }

  @ViewBuilder var logic0: some View {
    // Double (/Logic/Double): a logic component, placed where the graph places it.
    DoubleLogic(x: JS.field(bumpOut, "n"), onYChanged: { y = $0 })
    // Label (/Logic/Label): a logic component, placed where the graph places it.
    LabelLogic(y: y, onTextChanged: { text = $0 })
    // Tally A (/Logic/Tally): a logic component, placed where the graph places it.
    TallyLogic(step: 1.0, go: Pulse(sent: tallyAGoPulses, taken: tallyAGoTaken), onDone: {
      let countDonesRun = countDonesNode.run("Pages/Home/Count_dones", [:])
      countDonesOut = countDonesRun.outputs
      echoTakePulses += 1
    }, onTotalChanged: { total = $0 })
    // Tally B (/Logic/Tally): a logic component, placed where the graph places it.
    TallyLogic(step: 10.0, go: Pulse(sent: tallyBGoPulses, taken: tallyBGoTaken), onDone: {
      let countDonesRun = countDonesNode.run("Pages/Home/Count_dones", [:])
      countDonesOut = countDonesRun.outputs
    }, onTotalChanged: { total2 = $0 })
    // Echo (/Logic/Echo): a logic component, placed where the graph places it.
    EchoLogic(said: total, take: Pulse(sent: echoTakeDelivered, taken: echoTakeTaken), onEchoChanged: { echo = $0 })
    // Stamp (/Logic/Stamp): a logic component, placed where the graph places it.
    StampLogic(x: JS.field(bumpOut, "n"), onRowsChanged: { rows = $0 })
  }

  @ViewBuilder var logic1: some View {
    // Shelf (/Logic/Shelf): a logic component, placed where the graph places it.
    ShelfLogic(n: JS.field(bumpOut, "n"), onRowsChanged: { rows2 = $0 })
    // Picker (/Logic/Picker): a logic component, placed where the graph places it.
    PickerLogic(which: relayedId, go: Pulse(sent: pickerGoPulses, taken: pickerGoTaken), onPickedChanged: { picked = $0 })
  }

  @ViewBuilder var content: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 0) {
        Button(action: moreBtnPressed) {
          Text(verbatim: "More")
        }
        .buttonStyle(.plain)
        .node(0, "moreBtn", label: "More", press: moreBtnPressed)
          .frame(maxWidth: .infinity, alignment: .leading)
        Text(verbatim: JS.show(y))
          .collapsedWhenEmpty(JS.show(y))
          .node(1, "yText", text: JS.show(y))
          .frame(maxWidth: .infinity, alignment: .leading)
        Text(verbatim: JS.show(text))
          .collapsedWhenEmpty(JS.show(text))
          .node(2, "labelText", text: JS.show(text))
          .frame(maxWidth: .infinity, alignment: .leading)
        Button(action: goABtnPressed) {
          Text(verbatim: "Go A")
        }
        .buttonStyle(.plain)
        .node(3, "goABtn", label: "Go A", press: goABtnPressed)
          .frame(maxWidth: .infinity, alignment: .leading)
        Button(action: goBBtnPressed) {
          Text(verbatim: "Go B")
        }
        .buttonStyle(.plain)
        .node(4, "goBBtn", label: "Go B", press: goBBtnPressed)
          .frame(maxWidth: .infinity, alignment: .leading)
        Text(verbatim: JS.show(total))
          .collapsedWhenEmpty(JS.show(total))
          .node(5, "totalAText", text: JS.show(total))
          .frame(maxWidth: .infinity, alignment: .leading)
        Text(verbatim: JS.show(total2))
          .collapsedWhenEmpty(JS.show(total2))
          .node(6, "totalBText", text: JS.show(total2))
          .frame(maxWidth: .infinity, alignment: .leading)
        Text(verbatim: JS.show(JS.field(countDonesOut, "k")))
          .collapsedWhenEmpty(JS.show(JS.field(countDonesOut, "k")))
          .node(7, "donesText", text: JS.show(JS.field(countDonesOut, "k")))
          .frame(maxWidth: .infinity, alignment: .leading)
        Text(verbatim: JS.show(echo))
          .collapsedWhenEmpty(JS.show(echo))
          .node(8, "echoText", text: JS.show(echo))
          .frame(maxWidth: .infinity, alignment: .leading)
        Text(verbatim: JS.show(rows))
          .collapsedWhenEmpty(JS.show(rows))
          .node(9, "rowsText", text: JS.show(rows))
          .frame(maxWidth: .infinity, alignment: .leading)
        ForEach(Array(JS.rows(rows2).enumerated()), id: \.offset) { index, row in
          ItemView(id: JS.field(row, "id"), name: JS.field(row, "name"), onPick: {
            relayedId = JS.field(row, "id")
            pickerGoPulses += 1
          })
            .node(10, row: index)
        }
        Text(verbatim: JS.show(picked))
          .collapsedWhenEmpty(JS.show(picked))
          .node(11, "pickedText", text: JS.show(picked))
          .frame(maxWidth: .infinity, alignment: .leading)
      }
      .frame(maxWidth: .infinity)
    }
  }

  var stage1: some View {
    content
      .onChange(of: echoTakePulses) { _, sent in echoTakeDelivered = sent }
      .background { Logic { logic0; logic1 } }
  }

  func moreBtnPressed() {
    let bumpRun = bumpNode.run("Pages/Home/Bump", [:])
    bumpOut = bumpRun.outputs
  }
  func goABtnPressed() {
    tallyAGoPulses += 1
  }
  func goBBtnPressed() {
    tallyBGoPulses += 1
  }
}
