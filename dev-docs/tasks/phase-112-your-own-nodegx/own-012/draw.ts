/**
 * P112 OWN-012 — the drawer moved into the package with the layout model in step 2 (`@nodegx/node-spec`,
 * packages/nodegx-node-spec/src/draw.ts; the canvas measurer beside it in src/draw-canvas.ts). This file re-exports it so
 * the step 1 path keeps working. The page that grades it (prototype/real/drawn.html) bundles entry.ts (build.sh).
 */
export * from '../../../../packages/nodegx-node-spec/src/draw';
export * from '../../../../packages/nodegx-node-spec/src/draw-full';
export * from '../../../../packages/nodegx-node-spec/src/draw-canvas';
