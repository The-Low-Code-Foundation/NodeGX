---
id: P107-C127
title: The node catalog does not know a Component Stack page has a Path — `pagePath-<pageId>` is missing, so the MCP cannot set one
status: scheduled
phase: P109
task: ISL-048
severity: low
area: catalog / node-catalog (scripts/node-catalog/lib/derive-encoding.js seeds the list and text parameters only; navigation-stack.tsx `_updatePorts` :1153-1166 draws `pagePath-<id>` only when `useRoutes === true`)
found: P107 NSP-016 s58, 2026-10-08
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.19; packages/noodl-types/src/node-catalog.json, `Page Stack` → `parameterEncoding.patterns` lists `pageComp-<pageId>`, `startPage` and `<name>`, no `pagePath-<pageId>`
---

**What an author sees.** An AI author working through the MCP builds a Component Stack with Use Routes on. The catalog tells it each
page has a Component (`pageComp-<pageId>`) and nothing about a Path. Every page gets the label's default URL, and a page with
parameters in its path (`/detail/{id}`) cannot be made. The editor shows the Path input once Use Routes is ticked.

The same entry's `dynamicPorts.description` says "Per-page signal outputs and transition parameters", which describes Push Component
To Stack, not the stack.

**Where.** The encoding probe seeds `pages` and `dataAttributes` (`seededBy`). A port gated on a boolean parameter never appears.

**How to reproduce.** Read the `Page Stack` entry of `node-catalog.json`. The spec (`component-stack.ts` `derived.inputs`) draws
`pagePath-<id>` when `useRoutes` is `true`.

**Proposed fix.** Probe the stack with `useRoutes: true` as well (or add the pattern by hand beside the probe), and correct the
description.
