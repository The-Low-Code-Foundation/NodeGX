# @nodegx/backend

Puts a NodeGX app online on your own Cloudflare account. The app's pages, its backend (records, accounts, rules,
files), its cloud functions and its schedules all go on one Cloudflare Worker, at
`https://<app name>.<your subdomain>.workers.dev`. Running it again after a change keeps the same address and keeps
every record, account and file.

A free Cloudflare account is enough. Past the free plan's daily limit, Cloudflare refuses requests rather than
charging you.

## Use

```sh
npx @nodegx/backend sign-in cloudflare
npx @nodegx/backend deploy cloudflare ./my-app --no-bucket
```

The first command opens a Cloudflare page in your browser. You sign in (or make a free account) and click Allow. It
is Cloudflare's own command-line sign-in (wrangler's), kept on this computer.

The second puts the app online and prints its address. It runs four steps:

1. it bundles the app's cloud functions,
2. it builds the site with NodeGX's production engine,
3. it uploads the site and the backend to one Worker,
4. it applies the app's collections, rules and roles to the running backend.

`--no-bucket` leaves out file storage. Leave it off when the app lets people upload files. Then the
deploy makes an R2 bucket for them, and R2 has to be switched on in your Cloudflare dashboard first.

Other options:

| option | what it does |
|---|---|
| `--name <worker>` | the Worker's name, which is the first part of the address (default: the app's name) |
| `--dry-run` | builds everything and checks nothing private would be uploaded, then stops |
| `--local` | runs the same Worker on this computer (Cloudflare's `workerd`), at `http://127.0.0.1:8787` |
| `--domain <name>` | the app answers at a domain on your Cloudflare account too |
| `--new-admin-credential` | replaces the backend's admin credential |

The deployment's folder is `~/.nodegx/cloudflare/<name>/`. Its `deployment.json` holds the address and the
backend's admin credential, readable only by you. The credential is never uploaded; the deploy checks every file
before it uploads anything. The backend's dashboard is at `<address>/_admin`.

`npx @nodegx/backend domain find <words>` finds a name that is free and its price. `domain buy` buys one only when
you repeat its exact price back. Buying needs Cloudflare's own `cf` command signed in, because wrangler's sign-in
cannot buy names.

## What it needs

- Node.js 20 or newer, and npm.
- A Cloudflare account. wrangler (Cloudflare's command line) is fetched by `npx` the first time.

## Licence

GPL-3.0-only (it carries the NodeGX editor's cloud-function bundler). The backend inside the Worker
(`dist/worker/`) is MIT; its licence is beside it.
