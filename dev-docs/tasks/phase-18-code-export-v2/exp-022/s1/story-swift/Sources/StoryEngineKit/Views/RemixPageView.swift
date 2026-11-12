// @nodegx:generated (EXP-022) — Pages/Remix, printed from the same plan as the React export.
import SwiftUI

struct RemixPageView: View {
  @EnvironmentObject var router: AppRouter
  // Remix
  @State var json: String? = nil

  var body: some View {
    ScrollView {
      VStack(alignment: .center, spacing: 0) {
        VStack(alignment: .leading, spacing: Theme.space8) {
          VStack(alignment: .leading, spacing: Theme.space2) {
            Text(verbatim: "Remix")
              .font(.system(size: Theme.textXs, weight: Theme.fontSemibold))
              .foregroundStyle(Theme.primary)
              .tracking(Theme.trackingWidest * Theme.textXs)
              .textCase(.uppercase)
              .lineLimit(1)
              .fixedSize(horizontal: true, vertical: false)
            Text(verbatim: "Your story goes in this box")
              .font(.system(size: Theme.text3xl, weight: Theme.fontSemibold))
              .foregroundStyle(Theme.foreground)
              .tracking(Theme.trackingTight * Theme.text3xl)
              .lineSpacing((Theme.leadingTight - 1.2) * Theme.text3xl)
              .frame(maxWidth: .infinity, alignment: .leading)
            Text(verbatim: "The box already holds the story that is playing, so you can read it, change a line, or select it all and replace it with your own. Press Read this story and it plays straight away — no editor, no rebuild, nothing to install.")
              .font(.system(size: Theme.textLg))
              .foregroundStyle(Theme.mutedForeground)
              .lineSpacing((Theme.leadingRelaxed - 1.2) * Theme.textLg)
              .frame(maxWidth: 680, alignment: .leading)
          }
            .frame(maxWidth: .infinity, alignment: .leading)
          PasterView(value: JS.show(json), onBack: { router.go(.read) })
          VStack(alignment: .leading, spacing: Theme.space3) {
            Text(verbatim: "Four words, and there is no fifth")
              .font(.system(size: Theme.textXs, weight: Theme.fontSemibold))
              .foregroundStyle(Theme.mutedForeground)
              .tracking(Theme.trackingWidest * Theme.textXs)
              .textCase(.uppercase)
            Text(verbatim: "goto — where a choice takes the reader.\ngives — hands them something, and it shows up in What you carry.\nrequires — the choice is invisible until they are carrying that thing. Not greyed out: absent.\nno choices at all — that passage is an ending.")
              .font(.system(size: Theme.textBase))
              .foregroundStyle(Theme.foreground)
              .lineSpacing((1.8 - 1.2) * Theme.textBase)
              .frame(maxWidth: .infinity, alignment: .leading)
            Text(verbatim: "[\n  {\n    \"id\": \"hall\",\n    \"title\": \"The hallway\",\n    \"text\": \"Two doors. One of them is warm to the touch.\",\n    \"choices\": [\n      { \"label\": \"Open the warm door\", \"goto\": \"kitchen\", \"gives\": \"a brass key\" },\n      { \"label\": \"Unlock the far door\", \"goto\": \"out\", \"requires\": \"a brass key\" }\n    ]\n  },\n  { \"id\": \"kitchen\", \"title\": \"The kitchen\", \"text\": \"A key on the hook.\", \"choices\": [\n      { \"label\": \"Go back\", \"goto\": \"hall\" } ] },\n  { \"id\": \"out\", \"title\": \"Outside\", \"text\": \"You are out. No choices: that is an ending.\" }\n]")
              .font(.system(size: Theme.textSm, design: Theme.fontMono))
              .foregroundStyle(Theme.mutedForeground)
              .lineSpacing((1.6 - 1.2) * Theme.textSm)
              .frame(maxWidth: .infinity, alignment: .leading)
          }
            .padding(Theme.space5)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Theme.surface, in: RoundedRectangle(cornerRadius: Theme.radiusLg))
            .overlay(RoundedRectangle(cornerRadius: Theme.radiusLg).strokeBorder(Theme.border, lineWidth: Theme.border1))
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
