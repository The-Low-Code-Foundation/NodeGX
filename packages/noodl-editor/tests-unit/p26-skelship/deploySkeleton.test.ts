/**
 * P26-SKELSHIP — a project nobody has built, read by every deploy route (ruled 2026-10-26: never refuse, warn loudly,
 * let the person go ahead). `deploy-skeleton.ts` is the editor's reading, used by the Deploy to folder tab before the
 * folder is chosen and by `@nodegx/preview`'s engine after it publishes.
 *
 * The project here is the reading's own shape (`getComponents`, `graph.forEachNode`), filled as create_project fills a
 * new project: one page, a `Page` and a `Text`. Each absence is beside a known-firing arm on the same fixture.
 *
 * ⚠️ What this cannot see: the tab's confirm on screen. `deployOrAsk` is graded with the route's two callbacks; the tab
 * passes `pickFolderAndDeploy` and a `DialogLayerModel.showConfirm` whose `onConfirm` is the deploy, checked by reading
 * its source below. Not driven in Electron.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

import {
  deployOrAsk,
  isUntouchedSkeletonPage,
  LEGACY_SKELETON_PLACEHOLDER_MARKERS,
  SKELETON_PLACEHOLDER_MARKER,
  skeletonQuestion,
  skeletonWarning,
  untouchedSkeletonPages
} from '../../src/editor/src/utils/compilation/build/deploy-skeleton';

type Node = { typename: string; parameters: Record<string, unknown> };

function project(pages: Record<string, Node[]>, others: Record<string, Node[]> = {}) {
  const components = Object.entries({ ...pages, ...others }).map(([name, nodes]) => ({
    name,
    graph: {
      forEachNode(fn: (node: Node) => unknown) {
        for (const node of nodes) if (fn(node)) return;
      }
    }
  }));
  return { getComponents: () => components };
}

const placeholder = (text = `Lingo${SKELETON_PLACEHOLDER_MARKER}`): Node[] => [
  { typename: 'Page', parameters: { title: 'Home' } },
  { typename: 'Text', parameters: { text } }
];

describe('P26-SKELSHIP — the editor reads an unbuilt project', () => {
  it('an untouched project names its page; one word changed, or one node added, and it is built (known-firing pair)', () => {
    expect(untouchedSkeletonPages(project({ '/#__page__/Home': placeholder() }))).toEqual(['Home']);
    expect(untouchedSkeletonPages(project({ '/#__page__/Home': placeholder('Welcome to Lingo') }))).toEqual([]);
    expect(
      untouchedSkeletonPages(
        project({ '/#__page__/Home': [...placeholder(), { typename: 'Group', parameters: {} }] })
      )
    ).toEqual([]);
  });

  it('a second, built page makes the project built; a component with no Page is not a page', () => {
    const built: Node[] = [
      { typename: 'Page', parameters: {} },
      { typename: 'Text', parameters: { text: 'Lessons' } },
      { typename: 'Group', parameters: {} }
    ];
    expect(untouchedSkeletonPages(project({ '/#__page__/Home': placeholder(), '/#__page__/Lessons': built }))).toEqual([]);
    expect(untouchedSkeletonPages(project({ '/#__page__/Home': placeholder() }, { '/Card': [{ typename: 'Group', parameters: {} }] }))).toEqual(['Home']);
  });

  it('a project made with the earlier sentence, to the agent, is still the placeholder', () => {
    expect(LEGACY_SKELETON_PLACEHOLDER_MARKERS.length).toBeGreaterThan(0);
    for (const legacy of LEGACY_SKELETON_PLACEHOLDER_MARKERS) {
      expect(isUntouchedSkeletonPage(placeholder(`Lingo${legacy}`))).toBe(true);
    }
  });

  it('the placeholder speaks to a visitor', () => {
    expect(`Lingo${SKELETON_PLACEHOLDER_MARKER}`).toBe('Lingo — this app is being built.');
  });

  it('the question asks before, the warning tells after, and both are silent when something is built', () => {
    expect(skeletonQuestion(['Home'])).toMatch(/^Nothing is built in this app yet: Home is still the placeholder page/);
    expect(skeletonQuestion(['Home'])).toMatch(/Deploy it anyway/);
    expect(skeletonWarning(['Home'])).toMatch(/It was deployed anyway/);
    expect(skeletonQuestion([])).toBeUndefined();
    expect(skeletonWarning([])).toBeUndefined();
  });
});

describe('P26-SKELSHIP — a deploy route asks, then goes ahead if told to', () => {
  it('a built project deploys without a question', () => {
    const deploy = jest.fn();
    const ask = jest.fn();
    expect(deployOrAsk(project({ '/#__page__/Home': placeholder('Welcome') }), { deploy, ask })).toBe(false);
    expect(deploy).toHaveBeenCalledTimes(1);
    expect(ask).not.toHaveBeenCalled();
  });

  it('an unbuilt one is asked about, deploys nothing until the answer, and deploys on "Deploy anyway"', () => {
    const deploy = jest.fn();
    let goAhead: (() => void) | undefined;
    const ask = jest.fn((question: string, deployAnyway: () => void) => {
      goAhead = deployAnyway;
    });
    expect(deployOrAsk(project({ '/#__page__/Home': placeholder() }), { deploy, ask })).toBe(true);
    expect(ask).toHaveBeenCalledWith(skeletonQuestion(['Home']), expect.any(Function));
    expect(deploy).not.toHaveBeenCalled();
    goAhead?.();
    expect(deploy).toHaveBeenCalledTimes(1);
  });

  it('the Deploy to folder tab routes its button through it, and its confirm deploys (read from the source)', () => {
    const tab = readFileSync(
      join(__dirname, '../../src/editor/src/views/DeployPopup/tabs/DeployToFolderTab/DeployToFolderTab.tsx'),
      'utf8'
    );
    const handler = /function onPickFolderClicked\(\) \{([\s\S]*?)\n  \}\n/.exec(tab)?.[1] ?? '';
    expect(handler).toMatch(/deployOrAsk\(ProjectModel\.instance, \{\s*deploy: pickFolderAndDeploy,/);
    expect(handler).toMatch(/showConfirm\(\{[\s\S]*onConfirm: deployAnyway/);
    expect(tab.match(/onClick=\{onPickFolderClicked\}/g)).toHaveLength(1);
  });
});
