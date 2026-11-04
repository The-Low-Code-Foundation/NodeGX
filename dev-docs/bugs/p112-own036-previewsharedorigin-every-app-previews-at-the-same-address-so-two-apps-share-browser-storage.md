---
id: P112-OWN036-PREVIEWSHAREDORIGIN
title: "`@nodegx/preview` serves every app at `http://127.0.0.1:8575`, so two apps previewed in one browser share localStorage: one app reads the other's saved value"
status: open
phase: P112
task: OWN-036
severity: medium
area: packages/noodl-preview/src/cli.ts:63 (default `port: 8575`, `host: '127.0.0.1'`), and every app that keeps state in the browser
found: P112 OWN-036 AC5, 2026-11-04 (Richard, playing two book-club apps one after the other)
evidence: dev-docs/tasks/phase-112-your-own-nodegx/own-036/RESULTS.md ("App 1's two JSON strings")
kit: preview
---

Richard played two book-club apps built from the same brief, each started with `npx @nodegx/preview book-club --open`.
The second one showed its "who are you" chip and every voter's name as a JSON string.

Measured: both apps keep the person on this phone in `localStorage['bookclub.member']`. App 2 writes
`JSON.stringify({name, isOrganiser})`. App 1 writes a bare name and reads it straight into `'Hi, ' + name` and into
each vote's `member`. The preview's default address is the same for every app (port 8575 on 127.0.0.1), so both apps
were one browser origin and shared the key. App 1's own headless drives, in a clean browser, show `Hi, Richard` and
`👍 Richard`.

A stranger meets this the day they build a second app, or rebuild one from scratch: localStorage, IndexedDB, cookies
and any service worker carry over from the last app on that port, and the symptom reads as the new app's bug. A
person can't see why; the agent that built the app can't reproduce it in its own clean browser.

Fix candidates (not chosen): a port derived from the project id (stable per app, different between apps), with
`--port` still winning; or the preview clears nothing but prints, when it starts, which app last used this address.
Re-measure after: two apps writing the same key, previewed one after the other, each reads only its own.
