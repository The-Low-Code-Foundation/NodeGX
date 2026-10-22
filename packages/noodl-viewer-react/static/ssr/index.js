import fs from 'fs';
import http from 'http';
import path from 'path';
import express from 'express';
import fetch from 'node-fetch';
import React from 'react';
import ReactDOMServer from 'react-dom/server';
import NodeCache from "node-cache";
import { XMLHttpRequest } from 'xmlhttprequest';

const myCache = new NodeCache();
async function cacheFetch(args, callback) {
  const cacheKey = typeof args === 'string' ? args : args.key;
  const cached = myCache.get(cacheKey);
  if (cached) return Promise.resolve(cached);

  const result = await callback();
  myCache.set(cacheKey, result);
  return result;
}

// Browser-shaped globals + tracked fetch/XHR (the render gate consults the
// trackers' in-flight counters: while a bundle load or data request — fetch OR
// XMLHttpRequest, the Parse cloud data nodes use the latter — is pending, the
// runtime is not idle and renderToString must wait). Shared with the SSG
// template via runtime-globals.js; the per-path render itself lives in
// server-core.js so server and SSG rendering cannot drift.
//
// 🔴 These do NOT travel automatically, and the sentence that used to sit here
// said they did. `deployToFolder` copies the explicit list in `index.json`; the
// webpack `from: 'static/ssr'` rule only populates the BUILT runtime, one step
// earlier. `kit-modules.js` was added without a manifest entry and every
// deployed folder failed `npm run build` until s27 measured it. A new require
// here needs an `index.json` entry — `tests/ssr-deploy-manifest.test.js` enforces it.
const { installRuntimeGlobals } = require('./runtime-globals');
const { loadKitModules } = require('./kit-modules');
const { renderPage } = require('./server-core');
// The port finder the client-side deploy's own `serve.js` uses. It lives in public/ because the
// SSR layout always writes a full client-side deploy there; esbuild bundles it into server.js.
const { listenOnFreePort } = require('./public/serve.js');

const { trackersIdle } = installRuntimeGlobals({ React, ReactDOMServer, XMLHttpRequest, fetch });

globalThis.projectData = {{#export#}};

// Import the Noodl runtime
require('./noodl.deploy');

// From that file we get some runtime stuff defined on "NoodlSSR"
const { createElement, ssrSetupRuntime } = globalThis.NoodlSSR;

const app = express();

app.use(express.static('public', { index: false }));

function log(...args) {
  // Uncomment to see full request log
  // console.log(...args);
}

let htmlData = '';

// How long a page that announced SSR_PageLoading may take to signal
// SSR_PageReady before we render whatever we have (degraded, not broken).
const PAGE_READY_TIMEOUT = Number(process.env.NOODL_SSR_PAGE_READY_TIMEOUT || 10000);

async function setup() {
  htmlData = await fs.promises.readFile(path.resolve('./public/index.html'), 'utf8');

  // CN-013 — run the project's kits before the first render.
  //
  // 🔴 Without this the server renders every page with its kit nodes MISSING while the browser
  // hydrates with them present: `runtime-globals.js` sets up `__noodl_modules` and nothing ever
  // filled it. The list is read from `htmlData` — the injector's own tags — so the server and the
  // browser cannot disagree about which kits load.
  const kits = loadKitModules({ htmlData, log });
  if (kits.loaded.length) console.log(`SSR: loaded ${kits.loaded.length} kit script(s) for the server render`);
}

async function buildPage(urlPath) {
  const { html } = await renderPage(
    {
      createElement,
      ssrSetupRuntime,
      ReactDOMServer,
      htmlData,
      noodlModules: globalThis.__noodl_modules,
      projectData: globalThis.projectData,
      isIdle: trackersIdle,
      pageReadyTimeout: PAGE_READY_TIMEOUT,
      log
    },
    urlPath
  );
  return html;
}

app.get('*', async (req, res) => {
  const path = req.path;

  try {
    const cacheKey = `cache__${path}`
    const cached = await cacheFetch(cacheKey, () => buildPage(req.path));
    res.send(cached);
  } catch (error) {
    console.error(error);

    // We failed to render SSR, lets just respond with the index.html file,
    // and then the user should be able to render the page client side.
    res.send(htmlData);
  }
});

// `--port N` or PORT: exactly that port, or stop and say so. Neither: the first free port from 3000.
setup()
  .then(() => listenOnFreePort(http.createServer(app)))
  .then((port) => {
    console.log(`Server is listening on port ${port} — open http://localhost:${port}/`);
  })
  .catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
