# Vendored sources of the i18next Translation module

Recovered on 2026-10-03 (P109 ISL-007) from `sourcesContent` in the map of the module as imported (v1.0.4,
`project/noodl_modules/i18next-noodl/index.js.map`, from the OpenNoodl docs zip `i18next-1-0-3.zip`). They are the exact
files that bundle was built from, so `build.mjs` rebuilds the module without installing anything.

| file | was | licence |
|---|---|---|
| `i18next.js` | `i18next/dist/esm/i18next.js` (v19) | MIT, `LICENSE-i18next.txt` beside `index.js` |
| `i18next-browser-languagedetector.js` | `i18next-browser-languagedetector/dist/esm/i18nextBrowserLanguageDetector.js` | MIT, `LICENSE-i18next-browser-languagedetector.txt` beside `index.js` |
| `babel-helpers/*.js` | `@babel/runtime/helpers/esm/*.js` (the ten i18next imports) | MIT |
| `noodl-sdk.js` | `@noodl/noodl-sdk/index.js` | the Noodl SDK, as shipped in every module of that era |

One edit: `babel-helpers/possibleConstructorReturn.js` imported `"../../helpers/esm/typeof"`, a path inside the
`@babel/runtime` package that points back at its own folder; it reads `"./typeof"` here. Nothing else is changed.
Edit `../i18next-module.js`, not these.
