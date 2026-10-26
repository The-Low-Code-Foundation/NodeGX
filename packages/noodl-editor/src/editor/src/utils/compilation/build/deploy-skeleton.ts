/**
 * P26-SKELSHIP — a project nobody has built yet, read before and after a deploy.
 *
 * `create_project` (noodl-mcp createProject.ts) writes one page, Home, holding a single Text: the app's name and a
 * placeholder sentence. lingo.nodegx.io went out like that and its visitors read "Lingo — nothing built yet. Review the
 * plan in docs/ and start when you are ready.", a sentence addressed to the agent about to build the app. Richard ruled
 * 2026-10-26: never refuse ("in case someone wants to deploy just to health check or test"), warn loudly everywhere,
 * and let the person go ahead. So the placeholder now speaks to a visitor, and every deploy route asks this module.
 *
 * Read by the editor's Deploy to folder tab (before the folder is chosen) and by `@nodegx/preview`'s deploy engine
 * (after it publishes, in `warnings`), which builds on the editor's sources. noodl-mcp writes the sentence and cannot be
 * imported from here, so the markers are copies held equal to the writer's by
 * `packages/noodl-preview/tests/p26-skelship-engine.test.ts`.
 *
 * Deliberately exact, as the writer's `isUntouchedSkeletonPage` is: two nodes, one `Page`, one `Text` ending with a
 * marker. A page someone has touched, even only to delete the placeholder, is a built page.
 */

/** The end of the sentence a new project's Home page carries: `<name> — this app is being built.` */
export const SKELETON_PLACEHOLDER_MARKER = ' — this app is being built.';

/** The sentence projects made before 2026-10-26 carry, addressed to the agent. They are still recognised. */
export const LEGACY_SKELETON_PLACEHOLDER_MARKERS: readonly string[] = [
  ' — nothing built yet. Review the plan in docs/ and start when you are ready.'
];

/** As much of a node as the reading needs. */
export interface SkeletonNodeReading {
  typename: string;
  parameters: Record<string, unknown>;
}

/** As much of a project as the reading needs: `ProjectModel` fits it. */
export interface SkeletonProjectLike {
  getComponents(): readonly {
    name: string;
    graph: { forEachNode(fn: (node: { typename: string; parameters?: Record<string, unknown> }) => unknown): unknown };
  }[];
}

/** Whether one page's nodes are exactly the placeholder `create_project` wrote. */
export function isUntouchedSkeletonPage(nodes: readonly SkeletonNodeReading[]): boolean {
  if (nodes.length !== 2) return false;
  const page = nodes.find((n) => n.typename === 'Page');
  const text = nodes.find((n) => n.typename === 'Text');
  if (!page || !text) return false;
  const value = text.parameters['text'];
  return (
    typeof value === 'string' &&
    [SKELETON_PLACEHOLDER_MARKER, ...LEGACY_SKELETON_PLACEHOLDER_MARKERS].some((marker) => value.endsWith(marker))
  );
}

/**
 * The pages (components with a `Page` node) when every one is still the untouched placeholder, by component name
 * without its leading `/`; empty when any page has been built, or there are none.
 */
export function untouchedSkeletonPages(project: SkeletonProjectLike): string[] {
  const pages: string[] = [];
  for (const component of project.getComponents()) {
    const nodes: SkeletonNodeReading[] = [];
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

const pageList = (pages: readonly string[]) => (pages.length === 1 ? `${pages[0]} is` : `${pages.join(', ')} are`);

/** Before a deploy: what a confirm says, or undefined when something is built. */
export function skeletonQuestion(pages: readonly string[]): string | undefined {
  if (!pages.length) return undefined;
  return (
    `Nothing is built in this app yet: ${pageList(pages)} still the placeholder page a new project starts with, so ` +
    'that is all a visitor would see. Deploy it anyway (to check the server works, say), or build the app first.'
  );
}

/** After a deploy: the sentence `warnings` carries, or undefined when something is built. */
export function skeletonWarning(pages: readonly string[]): string | undefined {
  if (!pages.length) return undefined;
  return (
    `Nothing is built in this app yet: ${pageList(pages)} still the placeholder page a new project starts with, and ` +
    'it is all a visitor will see. It was deployed anyway; build the app, then deploy again.'
  );
}

/** One thing a deploy route asks before it writes anything, and the button that goes ahead. */
export interface DeployQuestion {
  title: string;
  text: string;
  confirmText: string;
}

/**
 * P112-OWN023-DEPLOYLOOPBACK (ruled 2026-10-26: "when the DB is local, then you push to a VM, you push the DB too", and a
 * warning when they don't): a route that writes the front end only, for an app whose backend runs on this computer.
 * Undefined when the endpoint is anywhere else.
 */
export function localBackendQuestion(endpoint: string | undefined): DeployQuestion | undefined {
  if (!endpoint || !/^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(:\d+)?(\/|$)/i.test(endpoint)) return undefined;
  return {
    title: 'This app’s backend runs on this computer',
    text:
      `The deployed app will look for its backend at ${endpoint}, which is each visitor’s own computer, so its ` +
      'records, sign-in and functions will work for no one else. This folder holds the front end only. To put the ' +
      'backend where others can reach it too, publish to a server from NodeGX Studio, ask your agent to deploy_to_vm, ' +
      'or run nodegx-deploy with --full-stack. Deploy the front end only?',
    confirmText: 'Deploy the front end only'
  };
}

/**
 * A deploy route's decision (ruled 2026-10-26: "a loud warning everywhere but the option to push ahead anyway"): with
 * nothing to ask it deploys at once; otherwise each question is asked in turn (an unbuilt app first, then `more`), and
 * it deploys only once the person has gone ahead on every one. Answers whether it asked.
 */
export function deployOrAsk(
  project: SkeletonProjectLike,
  route: { deploy: () => void; ask: (question: DeployQuestion, goAhead: () => void) => void },
  more: readonly (DeployQuestion | undefined)[] = []
): boolean {
  const unbuilt = skeletonQuestion(untouchedSkeletonPages(project));
  const questions = [
    ...(unbuilt ? [{ title: 'Nothing is built in this app yet', text: unbuilt, confirmText: 'Deploy anyway' }] : []),
    ...more.filter((q): q is DeployQuestion => q !== undefined)
  ];
  const next = (i: number): void => (i < questions.length ? route.ask(questions[i], () => next(i + 1)) : route.deploy());
  next(0);
  return questions.length > 0;
}
