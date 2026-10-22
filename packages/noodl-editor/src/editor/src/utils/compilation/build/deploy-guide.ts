/**
 * `DEPLOY.md` — how to run what a deploy wrote, written into the folder by every deploy.
 *
 * Named DEPLOY.md, not README.md, on purpose: the project's own README.md is copied into the deploy
 * (DEP-008 keeps it), and a generated README would overwrite it without a word. The SSR layout used
 * to ship a fixed README.md that did exactly that.
 *
 * 🔴 **The backend address comes from the export, not from the editor's settings.** It is the
 * `cloudservices.endpoint` actually baked into this deploy — the one the app will call — so the
 * file cannot describe a backend the app does not use.
 *
 * ⚠️ No date in the text: people commit deploy folders, and a timestamp would make every redeploy
 * a diff of this file (def-028 also asserts two deploys of one project are byte-identical).
 */

export const DEPLOY_GUIDE_FILE = 'DEPLOY.md';

export type DeployGuideInput = {
  projectName?: string;
  /** `'deploy'` (client-side) or `'ssr'` (the server + pre-render layout). */
  runtimeType: string;
  /** The `cloudservices.endpoint` baked into the export, if any. */
  backendEndpoint?: string;
  /** The base URL the HTML was written with. `/` or empty means the site root. */
  baseUrl?: string;
};

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '[::1]', '::1']);

function isLocalEndpoint(endpoint: string): boolean {
  try {
    return LOCAL_HOSTS.has(new URL(endpoint).hostname);
  } catch {
    return false;
  }
}

function backendSection(endpoint: string | undefined): string {
  if (!endpoint) {
    return `## Backend

No backend address is built into this deploy. That is fine if the app does not use records, users
or cloud functions. If it does, set the backend in NodeGX (Backend Services) and deploy again.
`;
  }

  if (isLocalEndpoint(endpoint)) {
    return `## Backend

This app reads its data from a backend on **this computer**: \`${endpoint}\`

- It works only while that backend is running on that port. The NodeGX editor runs it while the
  project is open.
- If the backend starts on a different port later, deploy again from NodeGX so the app points at
  the new one.
- Nobody else can reach a backend on your computer. To put the app online, the backend has to be
  online too.

The backend address is built into the app when you deploy, so there is no flag to change it here.
`;
  }

  return `## Backend

This app reads its data from \`${endpoint}\`. That backend has to be running and reachable from
wherever the app is opened.

The address is built into the app when you deploy. To point the app at another backend, change it
in NodeGX (Backend Services) and deploy again.
`;
}

function baseUrlNote(baseUrl: string | undefined): string {
  if (!baseUrl || baseUrl === '/') return '';
  return `
> **Base URL: \`${baseUrl}\`.** The pages load their files from that address, so the app expects to
> be hosted there. Served from anywhere else, including on this computer, it will look for its
> files at \`${baseUrl}\`. Clear the Base URL in Project Settings → Deploy to run it locally.
`;
}

const PORTS = `With no port given, it takes the first free port from 3000 up. With \`--port\` (or \`PORT\`)
it takes exactly that port, and if that port is taken it stops and says so rather than picking
another, because a host that sets \`PORT\` sends its traffic to exactly that port.`;

function clientSideGuide(input: DeployGuideInput): string {
  return `## What this is

A static website: \`index.html\`, the app's JavaScript, and its pages in \`noodl_bundles/\`. There
is nothing to install or build.
${baseUrlNote(input.baseUrl)}
## Run it on this computer

You need [Node.js](https://nodejs.org). In this folder, run:

\`\`\`sh
node serve.js              # first free port from 3000 up
node serve.js --port 8080  # or choose one
\`\`\`

Then open the address it prints.

${PORTS}

Opening \`index.html\` straight from your file browser does not work: the app loads its pages over
HTTP.

## Put it online

Upload the whole folder to any static host: Netlify, Cloudflare Pages, GitHub Pages, or your own
nginx or Apache server.

The app uses real page addresses (\`/about\`, not \`/#/about\`). Set the host to answer
\`index.html\` for paths that are not files, or reloading any page but the first one returns "not
found". On Netlify that is a \`_redirects\` file holding \`/* /index.html 200\`. Most hosts call it
"single-page app" or "SPA fallback".

\`serve.js\` and this file are only for you. A host serves them as plain files, which does no
harm, and you can leave them out.
`;
}

function serverGuide(input: DeployGuideInput): string {
  return `## What this is

This folder runs two ways: as a Node server that renders each page before sending it (SSR), or as
a build that pre-renders every page to static HTML (SSG).

- \`index.js\`, \`server-core.js\`, \`render-gate.js\`, \`runtime-globals.js\` and \`inject-seo.js\`
  are the server and its render pipeline.
- \`ssg.js\` and \`ssg-paths.js\` are the pre-render build.
- \`noodl.deploy.js\` is the app's runtime, with your project inside it.
- \`public/\` is the complete client-side app. The server sends it to the browser, and a pre-render
  copies it.
- \`noodl_bundles/\` holds your pages. It is in this folder (the server reads it from here) **and**
  in \`public/\` (the browser loads it from there). Keep both.
${baseUrlNote(input.baseUrl)}
## Run it as a server (SSR)

You need [Node.js](https://nodejs.org). In this folder, run:

\`\`\`sh
npm install
npm run build                # bundles the server into server.js
npm start                    # first free port from 3000 up
npm start -- --port 8080     # or choose one
\`\`\`

Then open the address it prints. ${PORTS}

Every page is rendered on the server, with its SEO title and meta tags and its data, then picked up
by the browser.

\`NOODL_SSR_PAGE_READY_TIMEOUT\` sets how long, in milliseconds, a page using the Page node's
*Page Ready* signal may take before the server sends what it has. The default is \`10000\`.

## Pre-render to static files (SSG)

\`\`\`sh
npm install
npm run build:ssg            # bundles the pre-render into ssg-build.js
npm run ssg                  # writes every page to ./dist
\`\`\`

\`dist/\` is a fully static site and can go on any static host. Each page is written as
\`page/index.html\`, so no rewrite rules are needed. Data the pages fetch is fixed at build time:
build again to refresh it. Pages with a \`{param}\` in their address cannot be listed in advance.
They are reported, skipped, and drawn in the browser on hosts with SPA fallback.

## Notes

- Nodes that only make sense in a browser (Screen Resolution, Open File Picker and similar) do not
  run on the server. They start in the browser once the page loads, and the server log lists them.
- The server renders with the React version in \`package.json\`.
`;
}

export function renderDeployGuide(input: DeployGuideInput): string {
  const name = input.projectName?.trim() || 'this app';
  const ssr = input.runtimeType === 'ssr';
  const mode = ssr ? 'server-side rendering / static pre-rendering' : 'client-side rendering';

  return `# Deploying ${name}

This folder is a deploy of **${name}** from NodeGX (Deploy → Self Hosting, ${mode}).

NodeGX writes this file and everything beside it on every deploy, so changes made here are
overwritten. To change the app, change the project in NodeGX and deploy again.

${ssr ? serverGuide(input) : clientSideGuide(input)}
${backendSection(input.backendEndpoint)}`;
}
