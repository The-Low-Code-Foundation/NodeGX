# EXP-022 S1 — evidence

The account is in [EXP-022 §9](../../EXP-022-THE-SAME-GRAPH-IN-SWIFT.md#9-sessions). This folder holds what it rests on.

| path | what it is |
|---|---|
| `read-runtime-vs-swift.png` | story-engine's first page, 390 pt wide: the running app (`nodegx render`, left) beside the Swift app in the iPhone 17 simulator (right) |
| `runtime/` | `nodegx render templates/story-engine --viewports 390x844 --scale 1`, both routed pages |
| `swift/read-iphone17.png` | the simulator screenshot alone (downscaled to 603 px wide) |
| `story-swift/` | the package `emitSwiftApp` printed for story-engine, as written (15 files) |
| `jsc-spike/` | the backend route: the React export's Noodl client run unchanged in Node and in a Swift `JSContext` against the Noodl Desk's fake backend |

## Re-running

**The Swift app** (heavy: check `pgrep -fl 'vitest|jest|xcodebuild'` and the lab's `series-*.log` first):

```sh
# print the package (the test does the same in memory; NODEGX_SWIFT_BUILD=1 adds a swift build)
cd packages/nodegx-export && NODEGX_SWIFT_BUILD=1 nice -n 19 npx jest --runInBand tests/the-same-graph-in-swift.test.ts
# build for the simulator, from a printed package
cd <package> && nice -n 19 xcodebuild -project StoryEngine.xcodeproj -scheme StoryEngine \
  -destination 'generic/platform=iOS Simulator' -derivedDataPath <dd> build
xcrun simctl boot <iPhone 17 udid> && xcrun simctl install <udid> <dd>/Build/Products/Debug-iphonesimulator/StoryEngine.app
xcrun simctl launch <udid> io.nodegx.export.storyengine
# screenshot until two frames are the same (the first ones catch the launch animation), then:
xcrun simctl shutdown all
```

**The JSC spike** (light):

```sh
cd jsc-spike
node serve-fake.cjs &                      # the desk's fake backend on 127.0.0.1:18591
(cd swift && swift build)
curl -s 127.0.0.1:18591/__reset; node node-host.cjs > out-node.json;  curl -s 127.0.0.1:18591/__log > log-node.json
curl -s 127.0.0.1:18591/__reset; swift/.build/debug/JSCSpike "$PWD" > out-swift.json; curl -s 127.0.0.1:18591/__log > log-swift.json
cmp out-node.json out-swift.json && cmp log-node.json log-swift.json   # (the committed logs are pretty-printed)
kill $(lsof -ti tcp:18591 -sTCP:LISTEN)
```

`client.js` is the React export's `src/lib/noodl.ts` + `src/api/client.ts` for todo-list with
`metadata.cloudservices = { endpoint: 'http://127.0.0.1:18591', appId: 'noodl-desk' }`, bundled with
`esbuild --bundle --format=iife --target=es2020 --define:import.meta.env.VITE_NODEGX_ENDPOINT=undefined
--define:import.meta.env.VITE_NODEGX_APP_ID=undefined` from a three-line entry that sets `globalThis.NodegxClient = { noodl, client }`.
