// swift-tools-version:5.9
// @nodegx:generated (EXP-022)
import PackageDescription

let package = Package(
  name: "HookDeskKit",
  platforms: [.iOS(.v17), .macOS(.v14)],
  products: [.library(name: "HookDeskKit", targets: ["HookDeskKit"])],
  targets: [
    .target(name: "HookDeskKit", resources: [.copy("Scripts")]),
    .testTarget(name: "HookDeskKitTests", dependencies: ["HookDeskKit"])
  ]
)
