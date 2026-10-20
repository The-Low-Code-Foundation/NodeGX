/**
 * P112 OWN-012 step 2 — what prototype/real/drawn.html bundles (build.sh → prototype/real/drawn.js): the package's
 * drawer-only entry (`@nodegx/node-spec` src/draw-only.ts — the drawer, the canvas measurer and the generated table of
 * what the drawer reads from each visual spec, no node's full spec), and the project's default design tokens
 * (`@nodegx/project-contract/tokens`, the one copy the editor and the exporter read) so `var(--space-4)` in a file
 * resolves to the px the real app resolves it to. Nothing here is a copy of either.
 */
export * from '../../../../packages/nodegx-node-spec/src/draw-only';
export { DEFAULT_TOKENS, type StyleTokenRecord } from '../../../../packages/nodegx-project-contract/tokens';
