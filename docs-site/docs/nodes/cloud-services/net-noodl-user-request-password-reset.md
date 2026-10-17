---
title: "Request Password Reset"
---
:::warning Deprecated
This node is deprecated and kept only so existing projects keep working. It is not offered in the node picker for new use.
:::

Deprecated: asks the backend to email a password-reset link to the given address. Superseded by cloud-function-based flows.

Request Password Reset sends the `email` (string value) to the backend when `send` (Do, signal) is triggered, causing a reset email to be sent; `success`/`failure` (signals) and `error` (string value) report the outcome. It is marked deprecated in the runtime — the source directs new work to cloud functions, where a component built with `noodl.cloud.request`/`noodl.cloud.response` and called via CloudFunction2 implements the reset flow with server-side control over the email and token handling.

## When to use it

Do not use in new graphs — implement password reset in a cloud function called via CloudFunction2 instead.

## At a glance

| | |
|---|---|
| Category | Cloud Services |
| Type name | `net.noodl.user.RequestPasswordReset` |
| Available in | browser |
| SSR compatibility | safe |
| Provided by | `noodl-viewer-react` |
| Behaviour spec | not written yet |

## Inputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `email` | String | — | Address to send the reset link to |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `send` | Signal | — | Asks the backend to email a password-reset link to Email |

## Outputs

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `success` | Signal | — | Fires once the request has been accepted, which does not mean an account exists for that address |

### Failure outputs

| Name | Type | Default | Description |
|---|---|---|---|
| `error` | String | — | Why the last request failed; empty until one does |
| `failure` | Signal | — | Fires when the request could not be made, after the reason has been reported on the error channel |

## Code export

Does not export to React yet. A project that uses it exports with this node named in the export report.

Why: deliberately out of scope — the type is deprecated in the catalog, so nobody building today is offered one. A project that still holds one exports it as a named deferral, which is the right answer for a node its own editor has retired.


:::info Generated
This page is generated from `node-catalog-enriched.json`, the node's spec in `packages/nodegx-node-spec` and the export ledger. Do not edit it by hand — run `npm run docs:nodes` to regenerate, and fix the source instead.
:::
