// @nodegx:generated (EXP-022) — Story/Paster, printed from the same plan as the React export.
import SwiftUI

struct PasterView: View {
  // Paste a story
  var value: String = ""
  var problem: String = ""
  var onPlay: () -> Void = {}
  var onBack: () -> Void = {}
  var onTextChanged: (Any?) -> Void = { _ in }
  @State var theStoryAsText: String = ""

  var body: some View {
    VStack(alignment: .leading, spacing: Theme.space4) {
      TextField("Paste a list of passages here…", text: $theStoryAsText, axis: .vertical)
        .lineLimit(nil)
        .textFieldStyle(.plain)
        .font(.system(size: 13))
        .foregroundStyle(Theme.foreground)
        .padding(Theme.space4)
        .frame(height: 360, alignment: .topLeading)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Theme.surface, in: RoundedRectangle(cornerRadius: Theme.radiusMd))
        .overlay(RoundedRectangle(cornerRadius: Theme.radiusMd).strokeBorder(Theme.borderControl, lineWidth: Theme.border1))
      if JS.truthy(problem) {
        Text(verbatim: JS.show(problem))
          .font(.system(size: Theme.textSm))
          .foregroundStyle(Theme.destructive)
          .lineSpacing((Theme.leadingSnug - 1.2) * Theme.textSm)
          .collapsedWhenEmpty(JS.show(problem))
          .frame(maxWidth: .infinity, alignment: .leading)
      }
      WrapStack(spacing: Theme.space3, lineSpacing: Theme.space3) {
        Button {
          onPlay()
        } label: {
          Text(verbatim: "Read this story")
            .font(.system(size: Theme.textSm, weight: Theme.fontSemibold))
            .foregroundStyle(Theme.primaryForeground)
            .padding(.horizontal, Theme.space6)
            .padding(.vertical, Theme.space3)
            .background(Theme.primary, in: RoundedRectangle(cornerRadius: 999))
        }
        .buttonStyle(.plain)
        Button {
          onBack()
        } label: {
          Text(verbatim: "Back to reading")
            .font(.system(size: Theme.textSm, weight: Theme.fontSemibold))
            .foregroundStyle(Theme.foreground)
            .padding(.horizontal, Theme.space6)
            .padding(.vertical, Theme.space3)
            .overlay(RoundedRectangle(cornerRadius: 999).strokeBorder(Theme.borderControl, lineWidth: Theme.border1))
        }
        .buttonStyle(.plain)
      }
    }
      .frame(maxWidth: .infinity, alignment: .leading)
  }
}
