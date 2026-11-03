# HTX-001 — evidence

The account is in [README §10](../README.md#10-sessions). This folder holds what it rests on.

| path | what it is |
|---|---|
| `read-runtime-vs-html-1280x900.png` | story-engine's Read page: the running app (`nodegx render`, left) beside the HTML export in Chrome over `python3 -m http.server` (right) |
| `read-runtime-vs-html-390x844.png` | the same at phone width |
| `remix-runtime-vs-html-1280x900.png` | the Remix page, `#/remix` |
| `runtime/` | `nodegx render templates/story-engine --viewports 1280x900,390x844 --scale 1` |
| `html/` | the export alone, the same four shots |
| `double-click-firefox-159.png` | the export opened from `file://` in Firefox 159 headless: the CSS loads, no module runs (R4) |
| `story-html/` | the folder `nodegx export --target html` wrote for story-engine, as written (the font files it copies are left out here) |

## Re-running

```sh
cd packages/nodegx-export
nice -n 19 npx jest --runInBand tests/html-the-first-page.test.ts          # the spec (jsdom, no browser)
npx ts-node --transpile-only -O '{"module":"commonjs"}' src/cli/main.ts export --target html ../../templates/story-engine <out>
cd <out> && python3 -m http.server 8734 --bind 127.0.0.1                 # then http://127.0.0.1:8734/#/read
```

🔴 **Phone width in headless Chrome:** `--window-size=390,844` lays the page out at **500** px (measured: `innerWidth`
500) and crops the picture to 390, so the page looks cut off on the right. The 390 shots here are taken through a
390 px `<iframe>` in that window. Chrome from Claude's bash needs the sandbox off.

`lib/core.js` is regenerated from `packages/nodegx-core/src` by `tests/helpers/html-core-js.ts` (the spec fails when it
is stale).
