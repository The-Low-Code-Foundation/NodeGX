# OWN-016 — Ship it: from npm to a folder, then to a VM with the backend beside it

**Opened 2026-10-12** from R18 (see OWN-014's header). This task takes P115 **HST-005** ("a box you own") forward, for
the VM route only. The rest of P115 stays parked (Richard, 2026-10-07: *"after phase 107 and our Swift runtime
experiment phase"*). **Model:** **Opus** for step 1 and the packaging. **Fable** if step 3's server layout (static
site, backend, TLS, restarts) turns out to have no existing design to follow.

**Status: 📋 not started. Needs OWN-015 (the backend from npm) for AC3.**

## 1. The person sentence

> **Someone who built an app with `npm create nodegx` and their agent says "put it online on my server", and it's
> online, backend and secret included, on a machine they own.**

## 2. What was measured (2026-10-12, static reads; nothing driven)

- `nodegx deploy` lives in `@nodegx/export`, which isn't published. Even installed, it finds its engine only in a
  checkout and refuses on a plain npm install **by design** (`packages/nodegx-export/src/cli/deployEngine.ts:10-20`,
  `:60-80`; register row C72).
- **The engine itself already ships:** the `@nodegx/preview@0.1.0` tarball carries `dist/nodegx-deploy.cjs`.
  `NODEGX_DEPLOY_CLI` (`deployEngine.ts:44`) could point at it, but nothing documents that, and nobody has run it from
  an install.
- The MCP has no deploy tool. Its tools include `provision_backend`, `deploy_cloud_functions` and `render_report`,
  but nothing that writes the app's deploy folder.
- The deploy output is a static folder. Hosting it, and running the backend beside it, is the part DEP-005 and DEP-006
  designed and P115 HST-005 was going to lift into the CLI and the MCP.

## 3. The work

1. **Deploy to a folder from npm.** Expose the shipped engine as a published command (`npx @nodegx/preview deploy`, or
   publish `@nodegx/export`; measure which is less code, and record the choice here), plus an MCP tool that writes the
   folder and reports its path and size. The refusal on a bare install goes; R6 still applies.
2. **Read HST-005, DEP-005 and DEP-006 first** and reuse their designs. Write down what they decided before writing
   anything new.
3. **To a VM.** The person has a VM with SSH access. Their agent copies the deploy folder up and serves it, starts
   `@nodegx/backend` there (OWN-015) under a supervisor that survives a reboot, sets the function secret on the server
   (never in the folder it copied), and puts TLS in front. The commands are the agent's, run in the person's terminal.
   What we ship is the shape and the checks, not a hosting service.
4. **The human steps are named**: buying the VM, the DNS record, the SSH key. They're a sign-up and stay human, said
   in plain words (HST-009's rule).

## 4. Acceptance criteria

- **AC1 — the folder from npm.** In an empty folder with `HOME` empty, from packed tarballs (then the registry): the
  made project deploys to a folder that serves the app with no page errors. **Control arm:** a broken project refuses
  with what is wrong.
- **AC2 — online.** The language app (OWN-015's fixture) on a VM Richard owns, at a real `https://` address, loads on
  a phone, and speaks a sentence.
- **AC3 — the key stays on the server.** OWN-015 AC2's search, re-run against the live site's every request and the
  copied folder: zero hits, with the same control arm.
- **AC4 — it survives.** Reboot the VM. The site and the backend come back without anyone logging in.
- **AC5 — the published version**, after asking Richard (R11), with AC1 re-run from the registry.

## 5. Not this task

- Cloudflare Pages, Workers and D1 (HST-003, HST-004, HST-006), and buying the domain (HST-007): P115, parked.
- Choosing a hosting vendor for the person. Step 3 works on any VM with SSH.
