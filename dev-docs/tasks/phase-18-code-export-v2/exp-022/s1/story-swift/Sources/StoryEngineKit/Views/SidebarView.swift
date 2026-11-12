// @nodegx:generated (EXP-022) — Story/Sidebar, printed from the same plan as the React export.
import SwiftUI

struct SidebarView: View {
  // What you carry
  var things: [Any] = []
  var hasThings: Bool = false

  var body: some View {
    VStack(alignment: .leading, spacing: Theme.space3) {
      Text(verbatim: "What you carry")
        .font(.system(size: Theme.textXs, weight: Theme.fontSemibold))
        .foregroundStyle(Theme.mutedForeground)
        .tracking(Theme.trackingWidest * Theme.textXs)
        .textCase(.uppercase)
        .lineLimit(1)
        .fixedSize(horizontal: true, vertical: false)
      if JS.truthy(hasThings) {
        WrapStack(spacing: Theme.space2, lineSpacing: Theme.space2) {
          ForEach(Array(JS.rows(things).enumerated()), id: \.offset) { _, row in
            CarriedView(thing: JS.show(JS.field(row, "thing")))
          }
        }
          .frame(maxWidth: .infinity, alignment: .center)
      }
      Text(verbatim: "Nothing yet. Some choices hand you something, and some only appear once you are carrying it.")
        .font(.system(size: Theme.textSm))
        .foregroundStyle(Theme.mutedForeground)
        .frame(maxWidth: .infinity, alignment: .leading)
    }
      .padding(Theme.space5)
      .frame(maxWidth: .infinity, alignment: .leading)
      .background(Theme.surface, in: RoundedRectangle(cornerRadius: Theme.radiusLg))
      .overlay(RoundedRectangle(cornerRadius: Theme.radiusLg).strokeBorder(Theme.border, lineWidth: Theme.border1))
  }
}
