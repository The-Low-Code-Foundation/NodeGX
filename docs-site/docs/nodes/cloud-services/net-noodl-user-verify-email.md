---
title: "Verify Email"
---
:::warning Deprecated
This node is deprecated and kept only so existing projects keep working. It is not offered in the node picker for new use.
:::

Deprecated: confirms a user's email address using an emailed token. Superseded by cloud-function-based flows.

Verify Email submits `username` and `token` (string values, the token coming from the verification email) to the backend when `verify` (Do, signal) is triggered; `success`/`failure` (signals) and `error` (string value) report the outcome. It is marked deprecated in the runtime — the source directs new work to cloud functions, where a component called via CloudFunction2 verifies the token and marks the address confirmed server-side.

## When to use it

Do not use in new graphs — implement email verification in a cloud function called via CloudFunction2 instead.

## At a glance

| | |
|---|---|
| Category | Cloud Services |
| Type name | `net.noodl.user.VerifyEmail` |
| Available in | browser |
| SSR compatibility | safe |
| Provided by | `noodl-viewer-react` |
| Behaviour spec | not written yet |

## Inputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `token` | String | — | Verification token taken from the link in the email |
| `username` | String | — | Username the verification link was issued for |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `verify` | Signal | — | Confirms the address using the token from the verification email |

## Outputs

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `success` | Signal | — | Fires once the address has been confirmed |

### Failure outputs

| Name | Type | Default | Description |
|---|---|---|---|
| `error` | String | — | Why the last attempt failed; empty until one does |
| `failure` | Signal | — | Fires when the token was rejected or the request could not be made, after the reason has been reported on the error channel |

## Code export

Does not export to React yet. A project that uses it exports with this node named in the export report.

Why: deliberately out of scope — the type is deprecated in the catalog, so nobody building today is offered one. A project that still holds one exports it as a named deferral, which is the right answer for a node its own editor has retired.

[How export works](../../how-export-works.md) shows what an export writes, with a worked example.


:::info Generated
This page is generated from `node-catalog-enriched.json`, the node's spec in `packages/nodegx-node-spec` and the export ledger. Do not edit it by hand — run `npm run docs:nodes` to regenerate, and fix the source instead.
:::
