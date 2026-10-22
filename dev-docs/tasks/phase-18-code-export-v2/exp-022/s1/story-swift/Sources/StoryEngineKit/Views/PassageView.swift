// @nodegx:generated (EXP-022) — Story/Passage, printed from the same plan as the React export.
import SwiftUI

struct PassageView: View {
  // One passage
  var title: String = ""
  var text: String = ""
  var mode: Any? = nil
  @State var readingAnEndingOrAPassageThatIsNotThere: String = "reading"

  /// Reading, an ending, or a passage that is not there — a state machine whose values move between states (states.ts); starts in "reading".
  static let READING_AN_ENDING_OR_A_PASSAGE_THAT_IS_NOT_THERE_STATES: [String: [String: String]] = [
    "reading": ["rule": "var(--border-strong)", "eyebrow": "You are here", "tone": "var(--muted-foreground)"],
    "ending": ["rule": "var(--primary)", "eyebrow": "An ending", "tone": "var(--primary)"],
    "lost": ["rule": "var(--destructive)", "eyebrow": "A passage that is not there", "tone": "var(--destructive)"],
    "stuck": ["rule": "var(--destructive)", "eyebrow": "No way on from here", "tone": "var(--destructive)"]
  ]

  var body: some View {
    VStack(alignment: .leading, spacing: Theme.space3) {
      Text(verbatim: JS.show(Self.READING_AN_ENDING_OR_A_PASSAGE_THAT_IS_NOT_THERE_STATES[readingAnEndingOrAPassageThatIsNotThere]?["eyebrow"]))
        .font(.system(size: Theme.textXs, weight: Theme.fontSemibold))
        .foregroundStyle(Theme.color(JS.show(Self.READING_AN_ENDING_OR_A_PASSAGE_THAT_IS_NOT_THERE_STATES[readingAnEndingOrAPassageThatIsNotThere]?["tone"])) ?? Color.primary)
        .tracking(Theme.trackingWidest * Theme.textXs)
        .textCase(.uppercase)
        .lineLimit(1)
        .fixedSize(horizontal: true, vertical: false)
        .collapsedWhenEmpty(JS.show(Self.READING_AN_ENDING_OR_A_PASSAGE_THAT_IS_NOT_THERE_STATES[readingAnEndingOrAPassageThatIsNotThere]?["eyebrow"]))
      Text(verbatim: JS.show(title))
        .font(.system(size: 34, weight: Theme.fontBold, design: Theme.fontSerif))
        .foregroundStyle(Theme.foreground)
        .tracking(Theme.trackingTighter * 34)
        .lineSpacing((1.2 - 1.2) * 34)
        .collapsedWhenEmpty(JS.show(title))
        .frame(maxWidth: .infinity, alignment: .leading)
      Text(verbatim: JS.show(text))
        .font(.system(size: 19, design: Theme.fontSerif))
        .foregroundStyle(Theme.foreground)
        .lineSpacing((1.72 - 1.2) * 19)
        .collapsedWhenEmpty(JS.show(text))
        .frame(maxWidth: 680, alignment: .leading)
    }
      .padding(.leading, Theme.space6)
      .frame(maxWidth: .infinity, alignment: .leading)
      .overlay(alignment: .leading) { Rectangle().fill(Theme.borderStrong).frame(width: Theme.border2) }
  }
}
