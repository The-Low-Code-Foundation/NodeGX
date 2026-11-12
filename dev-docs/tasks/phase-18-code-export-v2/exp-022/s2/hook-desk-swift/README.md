# HookDesk — exported to Swift by NodeGX

- **Open `HookDesk.xcodeproj` in Xcode** and press Run, or build without Xcode open:
  `xcodebuild -project HookDesk.xcodeproj -scheme HookDesk -destination 'generic/platform=iOS Simulator' build`.
- **Everything you edit is in `Sources/HookDeskKit/`** — one SwiftUI view per component (`Views/`), one per logic
  component (`Logic/`, views that draw nothing), `Theme.swift` for the design tokens, `Router.swift` for the pages.
- **Your Functions are in `Scripts/functions/`**, one JavaScript file each, verbatim. They run in the app's JavaScriptCore
  context (`Scripts.swift`), through the same runner the web export uses (`Scripts/nodegx-host.js`).
- `swift build` builds it on a Mac with no simulator; `swift test` draws the first page and loads the Functions.
- **`EXPORT-PREFLIGHT.md`** says what did not travel to the phone, by name.
