// @nodegx:generated (EXP-022) — Story/Choice, printed from the same plan as the React export.
import SwiftUI

struct ChoiceView: View {
  // One choice
  var label: String = ""
  var goto: String = ""
  var gives: String = ""
  var onPicked: () -> Void = {}
  var onGotoChanged: (Any?) -> Void = { _ in }
  var onGivesChanged: (Any?) -> Void = { _ in }

  var body: some View {
    HStack(alignment: .top, spacing: Theme.space3) {
      Text(verbatim: "→")
        .font(.system(size: Theme.textBase, weight: Theme.fontSemibold))
        .foregroundStyle(Theme.primary)
        .lineLimit(1)
        .fixedSize(horizontal: true, vertical: false)
      Text(verbatim: JS.show(label))
        .font(.system(size: Theme.textBase))
        .foregroundStyle(Theme.foreground)
        .lineSpacing((1.5 - 1.2) * Theme.textBase)
        .collapsedWhenEmpty(JS.show(label))
        .frame(maxWidth: .infinity, alignment: .leading)
    }
      .padding(.horizontal, Theme.space5)
      .padding(.vertical, Theme.space4)
      .frame(maxWidth: .infinity, alignment: .leading)
      .background(Theme.surface, in: RoundedRectangle(cornerRadius: Theme.radiusMd))
      .overlay(RoundedRectangle(cornerRadius: Theme.radiusMd).strokeBorder(Theme.border, lineWidth: Theme.border1))
      .contentShape(Rectangle())
      .onTapGesture { onPicked() }
  }
}
