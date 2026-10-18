/**
 * The drawer (draw.ts) over the full spec table (`./nodes`): what the browser entry exports. A page that wants the
 * drawer without every node's full spec bundles `./draw-only` instead.
 */
import { createDrawer, type DrawInput, type Drawing } from './draw';
import { specs } from './nodes';

const drawer = createDrawer(specs);

/** A component's screen from the descriptions: boxes in viewport px, and what the drawing needed (draw.ts header). */
export const draw = (input: DrawInput): Drawing => drawer.draw(input);
/** A node type draws a box when its spec gives any input a layout role. */
export const isVisualType = (type: string): boolean => drawer.isVisualType(type);
