#!/usr/bin/env node
/**
 * `npx @nodegx/backend …` — put a NodeGX app online on the person's own Cloudflare account.
 *
 *   npx @nodegx/backend sign-in cloudflare                 wrangler's own sign-in: a Cloudflare page opens, click Allow
 *   npx @nodegx/backend whoami cloudflare                  which Cloudflare account this computer is signed in to
 *   npx @nodegx/backend deploy cloudflare <app folder> […]  the pages, the backend, its rules and functions, one Worker
 *   npx @nodegx/backend domain find|check|buy|status|email …   the app's own name (see the domain command's help)
 *
 * Everything that is not the app's own was built when the package was packed (`build.mjs`): the deploy, the Worker,
 * the cloud-function bundler. This file only tells the deploy where those are, and where the two packages it runs
 * are (`@nodegx/export`'s `nodegx deploy`, over `@nodegx/preview`'s engine and production viewer).
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const DIST = path.join(__dirname, '..', 'dist');
const PKG = require(path.join(__dirname, '..', 'package.json'));

const HELP = `@nodegx/backend ${PKG.version} — put a NodeGX app online on your own Cloudflare account.

  npx @nodegx/backend sign-in cloudflare
      Signs this computer in to Cloudflare (wrangler's sign-in): a Cloudflare page opens, you click Allow.
  npx @nodegx/backend whoami cloudflare
      Says which Cloudflare account this computer is signed in to.
  npx @nodegx/backend deploy cloudflare <app folder> [--no-bucket] [--name <worker>] [--dry-run] [--local] …
      Puts the app online: its pages, its backend, its rules and its functions, on one Worker, at
      https://<name>.<your subdomain>.workers.dev. Run it again after a change: same address, nothing wiped.
  npx @nodegx/backend domain find|check|buy|status|email …
      Finds and buys the app's own name on your Cloudflare account, and sets up its email.

Every option of deploy: npx @nodegx/backend deploy cloudflare --help`;

/** A file inside an installed package, found the way Node finds the package (no `exports` map in the way). */
function packageFile(name, rel) {
  for (const dir of require.resolve.paths(name) || []) {
    const file = path.join(dir, name, rel);
    if (fs.existsSync(file)) return file;
  }
  return null;
}

function need(file, what) {
  if (file && fs.existsSync(file)) return file;
  process.stderr.write(`@nodegx/backend: ${what} is missing, so this install is incomplete. Run it again with @latest:\n  npx -y @nodegx/backend@latest …\n`);
  process.exit(2);
}

/** The deploy's settings, unless the person (or a checkout) already set them. */
function deployEnvironment() {
  const set = (k, v) => {
    if (!process.env[k]) process.env[k] = v;
  };
  // The deploy's own folder, as it sees it (where it looks for a wrangler installed beside it).
  set('NODEGX_CLOUDFLARE_SRC', path.join(DIST, 'cloudflare'));
  set('NODEGX_CLOUDFLARE_WORKER', need(path.join(DIST, 'worker', 'worker.mjs'), 'The Worker (dist/worker/worker.mjs)'));
  set('NODEGX_CLOUD_BUNDLE', need(path.join(DIST, 'cloud-bundle.cjs'), 'The cloud-function bundler (dist/cloud-bundle.cjs)'));
  set('NODEGX_CLI', need(packageFile('@nodegx/export', path.join('dist', 'cli.mjs')), "@nodegx/export's nodegx command"));
  set('NODEGX_DEPLOY_CLI', need(packageFile('@nodegx/preview', path.join('dist', 'nodegx-deploy.cjs')), "@nodegx/preview's deploy engine"));
  set('NODEGX_CLOUDFLARE_COMMAND', 'npx @nodegx/backend deploy cloudflare');
}

function provider(word, verb) {
  if (word === 'cloudflare') return;
  process.stderr.write(
    word ? `@nodegx/backend: "${word}" is not a host it can ${verb} yet. Cloudflare is the one: ${verb} cloudflare …\n` : `@nodegx/backend: name the host: ${verb} cloudflare …\n`
  );
  process.exit(2);
}

/** wrangler, as the deploy itself runs it (one installed nearby, else `npx wrangler@4`), with the terminal attached. */
function wrangler(args) {
  deployEnvironment();
  const { wranglerCommand } = require(need(path.join(DIST, 'cloudflare-deploy.cjs'), 'The deploy (dist/cloudflare-deploy.cjs)'));
  const [cmd, ...pre] = wranglerCommand();
  const run = spawnSync(cmd, [...pre, ...args], { stdio: 'inherit', env: { ...process.env, WRANGLER_SEND_METRICS: 'false' } });
  return run.status ?? 1;
}

async function main(argv) {
  const [verb, ...rest] = argv;
  if (!verb || verb === 'help' || verb === '--help' || verb === '-h') {
    process.stdout.write(HELP + '\n');
    return verb ? 0 : 2;
  }
  if (verb === '--version' || verb === '-v') {
    process.stdout.write(PKG.version + '\n');
    return 0;
  }
  if (verb === 'sign-in' || verb === 'login') {
    provider(rest[0], 'sign in to');
    return wrangler(['login']);
  }
  if (verb === 'whoami') {
    provider(rest[0], 'say the account of');
    return wrangler(['whoami']);
  }
  if (verb === 'deploy') {
    provider(rest[0], 'deploy to');
    deployEnvironment();
    const { main: deploy } = require(path.join(DIST, 'cloudflare-deploy.cjs'));
    const args = rest.slice(1);
    if (!args.length || args.includes('--help') || args.includes('-h')) args.length = 0;
    return deploy(args);
  }
  if (verb === 'domain') {
    const { main: domain } = require(need(path.join(DIST, 'cloudflare-domain.cjs'), 'The domain command (dist/cloudflare-domain.cjs)'));
    return domain(rest);
  }
  process.stderr.write(`@nodegx/backend: "${verb}" is not a command.\n\n${HELP}\n`);
  return 2;
}

main(process.argv.slice(2)).then(
  (code) => process.exit(code),
  (e) => {
    process.stderr.write(`${(e && e.stack) || e}\n`);
    process.exit(1);
  }
);
