// @nodegx:generated (EXP-022) — Pages/Read, printed from the same plan as the React export.
import SwiftUI

struct ReadPageView: View {
  @EnvironmentObject var router: AppRouter
  // Read
  @State var source: String? = nil
  @State var whatThePageHasToSayInWords: String = "reading"

  /// What the page has to say, in words — a state machine whose values move between states (states.ts); starts in "reading".
  static let WHAT_THE_PAGE_HAS_TO_SAY_IN_WORDS_STATES: [String: [String: String]] = [
    "reading": ["note": "", "panel": "reading"],
    "ending": ["note": "That is an ending. Start again and the other roads are still there.", "panel": "ending"],
    "lost": ["note": "", "panel": "lost"],
    "stuck": ["note": "Every choice here needs something you are not carrying, so there is no way on. That is usually a \"requires\" that nothing \"gives\".", "panel": "stuck"]
  ]

  var body: some View {
    ScrollView {
      VStack(alignment: .center, spacing: 0) {
        VStack(alignment: .leading, spacing: Theme.space8) {
          VStack(alignment: .leading, spacing: Theme.space1) {
            Text(verbatim: "An interactive story")
              .font(.system(size: Theme.textXs, weight: Theme.fontSemibold))
              .foregroundStyle(Theme.primary)
              .tracking(Theme.trackingWidest * Theme.textXs)
              .textCase(.uppercase)
              .lineLimit(1)
              .fixedSize(horizontal: true, vertical: false)
            Text(verbatim: JS.show(source))
              .font(.system(size: Theme.textSm))
              .foregroundStyle(Theme.mutedForeground)
              .lineLimit(1)
              .fixedSize(horizontal: true, vertical: false)
              .collapsedWhenEmpty(JS.show(source))
          }
            .frame(maxWidth: .infinity, alignment: .leading)
          PassageView()
          VStack(alignment: .leading, spacing: Theme.space2) {
            // For Each rdChoices: not drawn in this slice (see the preflight).
          }
            .frame(maxWidth: .infinity, alignment: .leading)
          if JS.truthy(Self.WHAT_THE_PAGE_HAS_TO_SAY_IN_WORDS_STATES[whatThePageHasToSayInWords]?["note"]) {
            Text(verbatim: JS.show(Self.WHAT_THE_PAGE_HAS_TO_SAY_IN_WORDS_STATES[whatThePageHasToSayInWords]?["note"]))
              .font(.system(size: Theme.textLg))
              .foregroundStyle(Theme.mutedForeground)
              .lineSpacing((Theme.leadingRelaxed - 1.2) * Theme.textLg)
              .collapsedWhenEmpty(JS.show(Self.WHAT_THE_PAGE_HAS_TO_SAY_IN_WORDS_STATES[whatThePageHasToSayInWords]?["note"]))
              .frame(maxWidth: 560, alignment: .leading)
          }
          Text(verbatim: "")
            .font(.system(size: Theme.textBase))
            .foregroundStyle(Theme.destructive)
            .collapsedWhenEmpty("")
            .frame(maxWidth: .infinity, alignment: .leading)
          SidebarView()
          WrapStack(spacing: Theme.space3, lineSpacing: Theme.space3) {
            Button {
              // Nothing is wired to this press.
            } label: {
              Text(verbatim: "Start again")
                .font(.system(size: Theme.textSm, weight: Theme.fontSemibold))
                .foregroundStyle(Theme.foreground)
                .padding(.horizontal, Theme.space6)
                .padding(.vertical, Theme.space3)
                .overlay(RoundedRectangle(cornerRadius: 999).strokeBorder(Theme.borderControl, lineWidth: Theme.border1))
            }
            .buttonStyle(.plain)
            Button {
              router.go(.remix)
            } label: {
              Text(verbatim: "Write your own story")
                .font(.system(size: Theme.textSm, weight: Theme.fontSemibold))
                .foregroundStyle(Theme.foreground)
                .padding(.horizontal, Theme.space6)
                .padding(.vertical, Theme.space3)
                .overlay(RoundedRectangle(cornerRadius: 999).strokeBorder(Theme.borderControl, lineWidth: Theme.border1))
            }
            .buttonStyle(.plain)
          }
          Text(verbatim: "Every passage in this story is one list in the Story/Source component. Open it, and what you write is what people read.")
            .font(.system(size: Theme.textSm))
            .foregroundStyle(Theme.mutedForeground)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
          .padding(.horizontal, Theme.space6)
          .frame(maxWidth: 760, alignment: .leading)
      }
        .padding(.vertical, Theme.space16)
        .frame(maxWidth: .infinity, alignment: .center)
        .background(Theme.background)
      .frame(maxWidth: .infinity)
    }
    .background(Theme.background.ignoresSafeArea())
  }
}
