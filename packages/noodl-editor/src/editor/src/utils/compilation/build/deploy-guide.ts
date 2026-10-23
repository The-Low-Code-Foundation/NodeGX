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
export const DEPLOY_PACKAGE_FILE = 'package.json';

/** DEP-001 — the backend override the deployed page reads; the runtime's own name for it is in viewer-react `src/deploy-config.ts`. */
export const DEPLOY_CONFIG_FILE = 'nodegx-config.json';

/**
 * A client-side deploy's `package.json`: no dependencies, and `npm start` runs `serve.js`.
 *
 * Nothing needs installing, but a person who meets a folder of JavaScript types `npm install` and
 * `npm start` by reflex. Without this file `npm install` wrote a stray `package-lock.json` and
 * `npm start` failed (Richard, 2026-10-22). The server layout ships its own `package.json`.
 */
export function renderDeployPackageJson(projectName: string | undefined): string {
  const name =
    (projectName ?? '')
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, '-')
      .replace(/^[._-]+|[._-]+$/g, '')
      .slice(0, 200) || 'nodegx-app';
  const pkg = {
    name,
    private: true,
    description: `${projectName?.trim() || 'A NodeGX app'}, deployed from NodeGX. See DEPLOY.md.`,
    scripts: { start: 'node serve.js' }
  };
  return JSON.stringify(pkg, null, 2) + '\n';
}

/**
 * DEP-001 — `nodegx-config.json`, holding exactly the backend address this deploy baked in.
 *
 * Belt and braces: the app still carries the baked value, and the file only overrides it, so a
 * deploy that loses the file behaves as before. It exists so a person can re-point the app by
 * editing one line, and so `serve.js --backend` and the SSR server have a file to start from.
 * With nothing baked it is `{}` — no override, and no empty endpoint that would read as one.
 */
export function renderDeployConfig(metadata: { cloudservices?: Record<string, unknown> } | undefined): string {
  const cloudservices = metadata?.cloudservices;
  const config = cloudservices && cloudservices.endpoint ? { cloudservices } : {};
  return JSON.stringify(config, null, 2) + '\n';
}

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

function changingTheBackend(ssr: boolean): string {
  const run = ssr ? 'npm start --' : 'node serve.js';
  return `### Pointing it at another backend

No rebuild is needed. Either:

- start it with the backend you want:

  \`\`\`sh
  ${run} --backend-port 8577                 # a backend on this computer, at port 8577
  ${run} --backend https://data.example.com  # a backend anywhere
  \`\`\`

  (\`NODEGX_CLOUDSERVICES_ENDPOINT\` does the same for hosts that set environment variables)${
    ssr ? '. The pre-render takes the same flags: `npm run ssg -- --backend-port 8577`.' : ''
  }
- or edit \`nodegx-config.json\` in this folder and reload the page.${
    ssr ? '' : ' That works on any static host too, not only with `serve.js`.'
  }

\`nodegx-config.json\` may set \`cloudservices\` (this backend) and \`backendServices\`, nothing else.
If the file is missing or unreadable, the app uses the address it was deployed with.
`;
}

function backendSection(endpoint: string | undefined, ssr: boolean): string {
  if (!endpoint) {
    return `## Backend

No backend address is built into this deploy. That is fine if the app does not use records, users
or cloud functions. If it does, set the backend in NodeGX (Backend Services) and deploy again, or
point it at one as below.

${changingTheBackend(ssr)}`;
  }

  if (isLocalEndpoint(endpoint)) {
    return `## Backend

This app reads its data from a backend on **this computer**: \`${endpoint}\`

- It works only while that backend is running on that port. The NodeGX editor runs it while the
  project is open.
- If the backend starts on a different port later, point the app at the new port as below.
- Nobody else can reach a backend on your computer. To put the app online, the backend has to be
  online too.

${changingTheBackend(ssr)}`;
  }

  return `## Backend

This app reads its data from \`${endpoint}\`. That backend has to be running and reachable from
wherever the app is opened.

${changingTheBackend(ssr)}`;
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

A static website: \`index.html\`, the app's JavaScript, its pages in \`noodl_bundles/\`, and
\`nodegx-config.json\`, which says which backend it talks to. There is nothing to install or
build.
${baseUrlNote(input.baseUrl)}
## Run it on this computer

You need [Node.js](https://nodejs.org). In this folder, run:

\`\`\`sh
node serve.js              # first free port from 3000 up
node serve.js --port 8080  # or choose one
\`\`\`

\`npm start\` (and \`npm start -- --port 8080\`) does the same. There is nothing to
\`npm install\`, though running it does no harm.

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

\`serve.js\`, \`package.json\` and this file are only for you. A host serves them as plain files,
which does no harm, and you can leave them out. Keep \`nodegx-config.json\`.
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
- \`nodegx-config.json\` says which backend it talks to. The server reads it and hands the same
  address to the browser.
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
${backendSection(input.backendEndpoint, ssr)}`;
}

/**
 * P26 DEP-002 — what a full-stack deploy's project asks of its backend, read off its graph
 * (`backendRequirementFor`'s table) and its cloud functions.
 */
export type BackendUse = {
  /** Record nodes: queries, creates, changes, realtime. */
  records: boolean;
  /** User nodes: sign-up, log-in, the signed-in user. */
  users: boolean;
  /** Upload File, Cloud File, Sign File URL. */
  files: boolean;
  /** The cloud functions this deploy carries, by component name. */
  functions: string[];
};

export type FullStackGuideInput = {
  projectName?: string;
  baseUrl?: string;
  uses: BackendUse;
  /** The project ships its own access rules (`nodegx.security.json`), carried in `backend/`. */
  hasRules: boolean;
};

/** A full-stack folder's `package.json`: `npm start` runs `start.js`, and `start.js` reads the name. */
export function renderFullStackPackageJson(projectName: string | undefined): string {
  const pkg = JSON.parse(renderDeployPackageJson(projectName));
  pkg.scripts = { start: 'node start.js' };
  pkg.engines = { node: '>=22.13' };
  pkg.nodegx = { name: projectName?.trim() || pkg.name, layout: 'full-stack' };
  return JSON.stringify(pkg, null, 2) + '\n';
}

function usesAnything(uses: BackendUse): boolean {
  return uses.records || uses.users || uses.files || uses.functions.length > 0;
}

function rulesSection(input: FullStackGuideInput): string {
  if (input.hasRules) {
    return `## Who can read and change the data

The project's own access rules are in \`backend/nodegx.security.json\`. The backend installs them
the first time the app starts, and keeps its copy in \`data/security.json\` from then on.

A later deploy with different rules does not change that copy. To change the rules of a running
app, edit \`data/security.json\` and restart it, or delete that file and restart it to install the
rules from the latest deploy.
`;
  }
  return `## Who can read and change the data

**Read this before you open the app.** The project has no access rules of its own, so the backend
starts with its defaults:

- A visitor who has not signed in can read nothing and save nothing.
- A signed-in person can add records, and sees and changes only the records they added.
- Anyone can create an account.

So a page that lists records for visitors who are not signed in shows an empty list. That is the
rule working, not the app failing. To let visitors read a list, give its collection a rule in the
project (a \`nodegx.security.json\` file in the project folder) and deploy again. The backend
installs that file the first time a new \`data/\` folder starts.
`;
}

function needsSection(input: FullStackGuideInput): string {
  const { uses } = input;
  if (!usesAnything(uses)) {
    return `## What this app uses

This project uses no records, users, files or cloud functions, so its backend only serves the
pages. The client-side deploy (without \`--full-stack\`) is the same app as a static website, and
any static host can serve it.
`;
  }
  const items: string[] = [];
  if (uses.records) items.push('- **Records.** They are kept in `data/` and need nothing set up.');
  if (uses.users) {
    items.push(
      '- **Users.** Sign-up and log-in work as they are. Emails (address checks, password resets,\n' +
        '  sign-in links) need an email account: set one up on the admin page, under Email.'
    );
  }
  if (uses.files) {
    items.push(
      '- **Files.** Uploads are kept in `data/`. Resized images (`?thumb=`) answer with an error\n' +
        '  until the image library sharp is installed beside the backend (`npm install sharp` in\n' +
        '  `backend/`). Uploads and full-size images work without it.'
    );
  }
  if (uses.functions.length > 0) {
    const names = uses.functions.map((name) => `\`${name}\``).join(', ');
    items.push(
      `- **Cloud functions** (${uses.functions.length}): ${names}. They are in \`backend/workflows/\`, and\n` +
        '  each start installs them, replacing the ones the previous deploy installed. A function that\n' +
        '  reads a secret (an API key, say) gets it from an environment variable called\n' +
        '  `NODEGX_SECRET_<NAME>`, set before you start the app. Secrets are never written into this\n' +
        '  folder.'
    );
  }
  return `## What this app uses

${items.join('\n')}
`;
}

/**
 * `DEPLOY.md` for a full-stack folder: the app, its backend, and `start.js` (P26 DEP-002).
 *
 * 🔴 It leads with the access rules, because a fresh backend refuses every read from a visitor who
 * is not signed in, and the first sight of a full-stack deploy is otherwise an empty page (WF-003).
 */
export function renderFullStackGuide(input: FullStackGuideInput): string {
  const name = input.projectName?.trim() || 'this app';
  return `# Running ${name}

This folder is **${name}** and its own backend, deployed from NodeGX as one program. The backend
keeps the data and serves the app's pages on the same address.

NodeGX writes everything here on every deploy, except \`data/\`. To change the app, change the
project in NodeGX and deploy again.
${baseUrlNote(input.baseUrl)}
${rulesSection(input)}
## Start it

You need [Node.js](https://nodejs.org) 22.13 or later. Nothing needs installing. In this folder,
run:

\`\`\`sh
./start.sh                 # macOS and Linux
start.cmd                  # Windows
node start.js --port 8090  # anywhere, on a port you choose
\`\`\`

\`npm start\` does the same. Then open the address it prints. Ctrl+C stops it.

${PORTS}

On its first start the backend makes an admin credential and prints where to find it, with the
address of the admin page (\`/_admin\`). The admin page shows the data, the users and the cloud
functions, and sets up email.

## Your data

\`data/\` holds the database, uploaded files and the admin credential (\`data/secrets.json\`). It
is made on the first start, and a deploy never writes there, so the data survives a restart and a
new deploy. Never publish \`data/\` or commit it to a repository.

To back it up (the app may be running):

\`\`\`sh
node backend/cli.js backup --data-dir data
\`\`\`

${needsSection(input)}
## Put it online

Copy this folder to a server with Node.js 22.13 or later and start it there, behind a web server
that adds HTTPS (Caddy or nginx) and forwards to the port it prints. Keep the app on that port on
the server's own address (\`127.0.0.1\`), and let the web server be the only way in.

The app asks its backend for the address the browser used, so it works on a domain with no change.
Start it with a process manager (systemd, say) to restart it after a crash or a reboot.

## What is in this folder

- \`app/\` is the app's pages, as a static website.
- \`backend/\` is the backend program (\`cli.js\`), the cloud functions and the access rules.
- \`start.js\` starts the backend with the app beside it. \`start.sh\` and \`start.cmd\` run it.
- \`MANIFEST.json\` lists every file the deploy wrote, with its checksum.
- \`data/\` is yours, as above.
`;
}
