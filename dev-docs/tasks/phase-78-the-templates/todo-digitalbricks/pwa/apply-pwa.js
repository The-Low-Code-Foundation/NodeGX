#!/usr/bin/env node
/**
 * Turn a `nodegx deploy` build of the todo list into the todo.digitalbricks.io PWA:
 * copies the manifest, icons, reminders script and service worker in, and adds the head tags.
 *
 *   node apply-pwa.js <site-dir>
 *
 * The VAPID public key is NOT written here — it is generated on the server and written to
 * `<site>/pwa/vapid-public-key.txt` there, so a site rsync must exclude that file.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const site = process.argv[2];
if (!site || !fs.existsSync(path.join(site, 'index.html'))) {
  console.error('usage: apply-pwa.js <site-dir with index.html>');
  process.exit(2);
}
const here = __dirname;
const indexFile = path.join(site, 'index.html');
let html = fs.readFileSync(indexFile, 'utf8');
if (html.includes('/pwa/manifest.webmanifest')) {
  console.error('already applied');
  process.exit(1);
}

fs.mkdirSync(path.join(site, 'pwa'), { recursive: true });
for (const f of ['manifest.webmanifest', 'reminders.js', 'icon-180.png', 'icon-192.png', 'icon-512.png', 'badge-96.png']) {
  fs.copyFileSync(path.join(here, 'pwa', f), path.join(site, 'pwa', f));
}
fs.copyFileSync(path.join(here, 'sw.js'), path.join(site, 'sw.js'));

// black-translucent puts an installed app's header under the iPhone status bar.
const translucent = /(name="apple-mobile-web-app-status-bar-style"\s+content=)"black-translucent"/;
if (!translucent.test(html)) throw new Error('index.html has no black-translucent status bar meta to replace — the viewer template moved');
html = html.replace(translucent, '$1"default"');

const tags = [
  '<link rel="manifest" href="/pwa/manifest.webmanifest" />',
  '<link rel="apple-touch-icon" href="/pwa/icon-180.png" />',
  '<link rel="icon" type="image/png" sizes="192x192" href="/pwa/icon-192.png" />',
  '<meta name="apple-mobile-web-app-title" content="Todo" />',
  '<meta name="theme-color" content="#f5f5f3" media="(prefers-color-scheme: light)" />',
  '<meta name="theme-color" content="#161718" media="(prefers-color-scheme: dark)" />',
  '<script src="/pwa/reminders.js" defer></script>'
].join('\n    ');
if ((html.match(/<\/head>/g) || []).length !== 1) throw new Error('index.html does not have exactly one </head>');
html = html.replace('</head>', `    ${tags}\n  </head>`);
fs.writeFileSync(indexFile, html);
console.log('applied PWA to', site);
