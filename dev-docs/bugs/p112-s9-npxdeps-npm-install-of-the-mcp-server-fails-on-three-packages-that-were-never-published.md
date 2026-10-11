---
id: P112-S9-NPXDEPS
title: "`npm install @noodl/mcp` fails: it asks npm for three workspace packages that were never published, and the server never loads them"
status: open
severity: blocker
area: mcp / package manifest (`packages/noodl-mcp/package.json` `dependencies`; `package-lock.json` its workspace entry)
kit: mcp
found: P112 OWN-011 s9, 2026-10-11
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-011-ONE-INSTALL.md §7
---

`npm pack` the MCP server and install the tarball in an empty folder outside the checkout:

```
npm error 404 Not Found - GET https://registry.npmjs.org/@nodegx%2fkit-catalog - Not found
npm error 404  '@nodegx/kit-catalog@*' is not in this registry.
```

`@noodl/mcp` lists `@nodegx/kit-catalog`, `@nodegx/kit-scaffold` and `@nodegx/module-inject` under `dependencies`. All
three are `private` workspace packages, so npm can never fetch them, and `dist/noodl-mcp.cjs` does not need them: esbuild
inlined all three (their sources are in the bundle; the bundle's only `require` of a non-built-in package outside the
`@modelcontextprotocol/sdk` and `zod` it declares is a guarded `require.resolve("@nodegx/node-kit-types/package.json")`
with a fallback). Inside the checkout the workspace links them, which is why nothing had noticed.

With the three moved to `devDependencies` (the tarball patched by hand), the same install takes 1 s, 96 packages,
43 MB, and the installed `noodl-mcp --allow-writes` answers `initialize` and lists its six bootstrap tools.
