---
name: nodegx-putting-it-online
description: "How to put a NodeGX app online on the person's own free Cloudflare account with one command: its pages, its backend, its data, its rules and its functions, at a workers.dev address that stays the same, with nothing wiped when it is updated. LOAD when the person asks to put an app online, publish it, deploy it, share it with people on other devices, or host it on Cloudflare, and before you build a link the app sends by email (to sign in, confirm an address or set a password)."
---

# Putting a NodeGX app online on Cloudflare

One command puts the whole app on the person's own Cloudflare account. The pages, the backend (records, accounts,
rules, files), the cloud functions and the schedules all go on one Cloudflare Worker. The address is
`https://<app name>.<their subdomain>.workers.dev`. Running the command again after a change keeps that address and
keeps every record and account.

A free Cloudflare account is enough. It needs no card. On the free plan, Cloudflare refuses requests past about
100,000 a day rather than charging for them. Tell the person that before they sign up.

## The steps

1. **Check the app first.** Read it (`npx -y @nodegx/mcp <the app's folder> --graph`, or the `read_graph` tool) and
   check it works in the preview. Then ask the person the security question from the practice round. Where is each
   kind of data stored, and who can read it? An app online is public: anyone with the address can open it.
2. **Sign in, once per computer:**
   ```sh
   npx @nodegx/backend sign-in cloudflare
   ```
   This is Cloudflare's own sign-in for its command line (wrangler's). A Cloudflare page opens in their browser. They
   sign in, or make a free account there, and click Allow. Tell them that before you run it. The command waits until
   they have clicked. If it can't open a browser from your shell, ask them to run it themselves: in Claude Code they
   type `! npx @nodegx/backend sign-in cloudflare` in the chat. `npx @nodegx/backend whoami cloudflare` says
   which account this computer is signed in to.
3. **Put it online:**
   ```sh
   npx @nodegx/backend deploy cloudflare <the app's folder> --no-bucket
   ```
   Leave out `--no-bucket` only when the app lets people upload files. Then the deploy makes a storage bucket for
   them, and the person must first switch on R2 in their Cloudflare dashboard. The deploy prints each step and
   ends with `Online: https://…workers.dev`. If a step refuses, it says why in a sentence; read it to them and fix that
   one thing.
4. **Check it on a phone.** Give them the address. Ask them to open it on their phone, on mobile data rather than
   their Wi-Fi, sign up or sign in, and save one thing. Then ask them to reload the page and check it is still there.
5. **After a change**, check it in the preview, then run the same deploy command again. Same address, nothing wiped.
   To make a different copy (a test one), add `--name <another name>`.

## What to know

- The first run on a computer fetches Cloudflare's command line (wrangler) through npx. It can take a minute or two.
- `--dry-run` builds everything and checks that nothing private would be uploaded, then stops. It needs no sign-in.
- Data is kept on Cloudflare, not on their computer. The preview's local backend and the online one are separate, so
  test accounts made in the preview don't exist online.
- The backend's dashboard is at `<the address>/_admin`. Its admin credential is in
  `~/.nodegx/cloudflare/<name>/deployment.json`, which only they can read. It is never uploaded. Never paste it into the
  chat or a project file, and never print it.
- Keys the app's functions use (in the project's `.env`) are never uploaded either; the deploy refuses if one would be.
- A brand-new Cloudflare account may not have its `workers.dev` subdomain yet. If the deploy says so, ask the person to
  open Workers & Pages in their Cloudflare dashboard once, then run the deploy again.
- Their own domain name is optional and costs money every year. `npx @nodegx/backend domain find <words>` lists the
  names that are free, and what each costs. Buy one only when the person says yes to the exact name and price. Buying needs
  Cloudflare's other command line (`cf`) signed in, because wrangler's sign-in cannot buy names.
- If the nodegx server offers a `cloudflare_sign_in` tool, don't use it for this. Its sign-in can't put a Worker up
  yet. The sign-in in step 2 can.

## A link the app sends by email

Opening a link in an email must do nothing on its own. The link opens a page. A button on that page does the work.
Many work and school mail systems open each link in a new email to scan it, before the person sees the email. A link
that signs someone in, confirms an address or sets a password as it opens is used up by that scan. The person then
sees "this link has expired", however many new links you send. The sign-in and new-password links NodeGX's backend
sends already open a page first. Build any link of your own, in a cloud function or a workflow, the same way.
