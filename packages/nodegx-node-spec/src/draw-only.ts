/**
 * `@nodegx/node-spec`'s drawer-only entry (OWN-012 step 2): the drawer (draw.ts), the canvas measurer (draw-canvas.ts)
 * and the small table of what the drawer reads from each visual spec (draw-specs.generated.ts: each input's default,
 * layout role and portability class — generated from `./nodes` by scripts/gen-draw-specs.mjs and held equal to it by
 * tests/draw-specs.test.ts). Nothing here imports a node's full spec, so a page that only draws pays for the layout
 * model and the table, not for every node's runners, scenarios and descriptions (ledger row P107-SIZE).
 * `scripts/draw-size.mjs` measures it.
 */
export { createDrawer, drawSpecTable, traceValue, BODY_SCROLL_NEED, ROOT_NEED, VALUES_NEED } from './draw';
export type { DrawInput, DrawInputDecl, DrawSpec, Drawer, Drawing, DrawnBox, FileComponent, FileNode, MeasureContent } from './draw';
export * from './draw-canvas';
export { DRAW_SPECS } from './draw-specs.generated';

import { createDrawer, type DrawInput, type Drawing } from './draw';
import { DRAW_SPECS } from './draw-specs.generated';

const drawer = createDrawer(DRAW_SPECS);

/** A component's screen from the descriptions, over the generated table (draw.ts header). */
export const draw = (input: DrawInput): Drawing => drawer.draw(input);
/** A node type draws a box when its spec gives any input a layout role. */
export const isVisualType = (type: string): boolean => drawer.isVisualType(type);
