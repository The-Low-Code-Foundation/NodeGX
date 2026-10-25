/**
 * P26-SKELSHIP — the engine half. A deploy put create_project's placeholder in front of every visitor: lingo.nodegx.io
 * read "Lingo — nothing built yet. Review the plan in docs/ and start when you are ready.", a sentence addressed to the
 * agent about to build the app, and the person could not tell whether the deploy had worked. `deploy_to_vm` refuses it
 * (`untouchedSkeletonPages` in noodl-mcp's deployToVm.ts); this engine, which Studio's Publish, `nodegx deploy` and
 * ship-to-vm.sh run, publishes it as before and says so in `warnings` (refusing here is Richard's call, as it was for
 * DEPLOYLOOPBACK).
 *
 * The reading is noodl-mcp createProject.ts `isUntouchedSkeletonPage`, on the model: exactly two nodes, one `Page`, one
 * `Text` whose text ends with the marker. Deliberately exact, for the reason given there. The two packages do not import
 * each other, so the marker is a copy, held equal to the writer's by tests/p26-skelship-engine.test.ts.
 */
import type { ProjectModel } from '@noodl-models/projectmodel';

/** noodl-mcp createProject.ts `SKELETON_PLACEHOLDER_MARKER`: the end of the sentence the skeleton page carries. */
export const SKELETON_PLACEHOLDER_MARKER = ' — nothing built yet. Review the plan in docs/ and start when you are ready.';

/**
 * The pages (components with a `Page` node) when every one is still the untouched placeholder, by component name;
 * empty when any page has been built, or there are none.
 */
export function untouchedSkeletonPages(project: ProjectModel): string[] {
  const pages: string[] = [];
  for (const component of project.getComponents()) {
    const nodes: { typename: string; parameters: Record<string, unknown> }[] = [];
    component.graph.forEachNode((node) => {
      nodes.push({ typename: node.typename, parameters: node.parameters ?? {} });
      // 🔴 `forEachNode` stops at a truthy return; this callback returns nothing on purpose.
    });
    if (!nodes.some((n) => n.typename === 'Page')) continue;
    if (!isUntouchedSkeletonPage(nodes)) return [];
    pages.push(component.name.replace(/^\/(#__page__\/)?/, ''));
  }
  return pages;
}

function isUntouchedSkeletonPage(nodes: readonly { typename: string; parameters: Record<string, unknown> }[]): boolean {
  if (nodes.length !== 2) return false;
  const page = nodes.find((n) => n.typename === 'Page');
  const text = nodes.find((n) => n.typename === 'Text');
  if (!page || !text) return false;
  const value = text.parameters['text'];
  return typeof value === 'string' && value.endsWith(SKELETON_PLACEHOLDER_MARKER);
}

/** The sentence `warnings` carries, or undefined when something is built. */
export function skeletonWarning(pages: readonly string[]): string | undefined {
  if (!pages.length) return undefined;
  const named = pages.length === 1 ? `${pages[0]} is` : `${pages.join(', ')} are`;
  return (
    `Nothing is built in this project yet: ${named} still the placeholder create_project wrote, whose sentence is ` +
    'addressed to the agent, and it is what every visitor will see. It was published as it is; build the app, then ' +
    'deploy again.'
  );
}
