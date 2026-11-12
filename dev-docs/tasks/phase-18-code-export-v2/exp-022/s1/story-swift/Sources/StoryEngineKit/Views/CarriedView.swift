// @nodegx:generated (EXP-022) — Story/Carried, printed from the same plan as the React export.
import SwiftUI

struct CarriedView: View {
  // One thing you carry
  var thing: String = ""

  var body: some View {
    HStack(alignment: .center, spacing: 0) {
      Text(verbatim: JS.show(thing))
        .font(.system(size: Theme.textSm, weight: Theme.fontMedium))
        .foregroundStyle(Theme.accentForeground)
        .lineLimit(1)
        .fixedSize(horizontal: true, vertical: false)
        .collapsedWhenEmpty(JS.show(thing))
    }
      .padding(.horizontal, Theme.space3)
      .padding(.vertical, Theme.space1)
      .background(Theme.accent, in: RoundedRectangle(cornerRadius: 999))
      .overlay(RoundedRectangle(cornerRadius: 999).strokeBorder(Theme.accentForeground, lineWidth: Theme.border1))
  }
}
