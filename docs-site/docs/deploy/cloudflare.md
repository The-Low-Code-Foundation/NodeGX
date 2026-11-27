---
title: Cloudflare, step by step
sidebar_position: 1
---

`npx @nodegx/backend deploy cloudflare` puts a NodeGX app on your own Cloudflare account. The app's pages, its
backend and its cloud functions all go on one Cloudflare Worker, at `https://<app name>.<your subdomain>.workers.dev`.
A free Cloudflare account is enough.

The command prints a numbered step at a time. Each step's line ends with a link to its section below. When a step
stops, the command prints that link again under the reason.

You need Node.js 20 or newer. Run every command in a terminal: Terminal on a Mac, Command Prompt or PowerShell on
Windows.

## Sign in to Cloudflare {#sign-in}

```sh
npx @nodegx/backend sign-in cloudflare
```

A Cloudflare page opens in your browser. Sign in, or make a free account, and click **Allow**. The sign-in stays on
this computer. To see which account it's signed in to:

```sh
npx @nodegx/backend whoami cloudflare
```

Then deploy, giving the app's folder:

```sh
npx @nodegx/backend deploy cloudflare ./my-app --no-bucket
```

`--no-bucket` leaves out file storage. Leave it off when people upload files in your app. The deploy then makes a
Cloudflare R2 bucket for the files, and R2 has to be switched on in your Cloudflare dashboard first.

## 1. Cloud functions {#cloud-functions}

The deploy bundles the app's cloud functions. It stops here when a function can't be bundled. It also stops when a
code node in a function can't run on Cloudflare. The reason names the function and the node. Change that node in the editor and run
the deploy again.

## 2. The site {#the-site}

The deploy builds the app's pages with NodeGX's production engine. It stops when the project has an error, such as
a broken node, and names the page and the node. Fix it in the editor, save, and deploy again. It also stops when the
site would be blank. Check that the app has a home page and that it opens in the editor's preview.

## 3. The Worker {#the-worker}

The deploy puts the site, the backend and the functions' code in one folder for Cloudflare. It prints how many files
and megabytes that is. This step rarely stops.

## 4. Nothing private in what is uploaded {#nothing-private}

Before anything is uploaded, the deploy reads every file for two kinds of private value. One is the backend's admin
credential. The other is any value in your app's `.env` file. If either is in a file, the deploy stops and names the
file. Take the value out of that file, then deploy again. The `.env` file itself is never uploaded.

## 5. Up to Cloudflare {#upload}

The deploy uploads everything to your account and prints the app's address. On a first deploy without
`--no-bucket` it also makes the R2 bucket.

- **"The bucket … could not be made"**: R2 is not switched on for your account. Switch it on in the Cloudflare
  dashboard, or deploy with `--no-bucket`.
- **"wrangler could not be started"**: the deploy runs Cloudflare's own command, wrangler, and could not start it.
  On Windows, install wrangler once and point the deploy at it:

  ```bat
  npm install -g wrangler@4
  set NODEGX_WRANGLER=%APPDATA%\npm\node_modules\wrangler\bin\wrangler.js
  ```

Nothing on the backend has changed when this step stops, so it's safe to run the deploy again.

## 6. The project onto the backend {#the-project-onto-the-backend}

The deploy gives the running backend the app's collections, rules, roles, schedules and cloud functions. Running it
again after a change adds what is new. It never deletes a record, an account or a file.

- **"refused this machine's admin credential"**: the backend was deployed from another computer, which holds its
  credential. Deploy from that computer, or deploy with `--new-admin-credential`. The old credential then stops
  working.

## Secrets {#secrets}

A secret is a value a cloud function reads with a **Secret** node, such as an API key or a token. Secrets don't
travel with a deploy. The ones you set on your computer, on the backend's Secrets page or in the app's `.env` file,
stay on your computer. The backend on Cloudflare starts with none.

So after its last step the deploy lists the secrets the functions read, and says which ones the backend on Cloudflare
doesn't have. To set one:

1. Open the backend's dashboard, at your app's address followed by `/_admin` (see [the dashboard](#the-dashboard)).
2. Go to **Settings → Secrets**.
3. Add the secret with exactly the name the Secret node uses, paste its value, and save.

The function reads it from the next run. A redeploy keeps it.

Secrets aren't set in Cloudflare's own dashboard. The **Variables and Secrets** page of a Worker there holds the
Worker's own settings, and a Secret node doesn't read them.

The deploy can only list the names typed into a Secret node. A name wired in from another node is known only when the
function runs. When that secret is missing, the Secret node's **Failure** fires and its **Error** names it.

## The dashboard {#the-dashboard}

Every NodeGX backend has its own dashboard. Its address is your app's address followed by `/_admin`, with an
underscore:

```
https://<app name>.<your subdomain>.workers.dev/_admin
```

`/admin` without the underscore is the backend's API, for programs.

The dashboard shows the backend's collections and records, its users and roles, and its schedules and runs. Its
settings are there too, the secrets among them.

The first time, sign in with the backend's **admin credential**. It's in the deployment folder, in the file
`deployment.json`, as the value of `adminToken`:

- on a Mac or Linux: `~/.nodegx/cloudflare/<app name>/deployment.json`
- on Windows: `C:\Users\<you>\.nodegx\cloudflare\<app name>\deployment.json`
- or in the folder you gave with `--out`

Open the file in a text editor and copy the value between the quotes. It was never uploaded, and anyone who has it
can change everything on the backend, so keep it to yourself.

On a backend with no admin account yet, the dashboard then asks you to make one, with an email and a password. After
that you sign in with those.
