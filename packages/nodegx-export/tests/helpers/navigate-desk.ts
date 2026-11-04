/**
 * "Navigate Desk" (P134 session 11): pages that take parameters, the shape marketplace, members-area and the others
 * navigate in (`/member/{memberId}`, `/products/{sellerId}`), built in a temporary folder. `html-navigate-with-parameters.test.ts`
 * drives the HTML export through it.
 *
 * - **Home** (the start page, `home`): "Member 42" navigates to Member with `memberId` typed in as 42. "Member Ann" with
 *   `memberId` wired from the Variable `who` ('Ann B/C', a space and a slash to encode) and `tab` typed in as 'notes',
 *   which Member's path does not name, so it is the query. "Member nobody" with `memberId` wired from the Variable
 *   `nobody`, which nothing sets. "Member in a tab" is "Member 42" with Open In New Tab ticked. "Path to 7" is a
 *   Navigate To Path to `/member/{memberId}`, the value wired from the Variable `seven` (HiveClip's project card).
 * - **Member** (`member/{memberId}`): a Page Inputs reading `memberId` (path) and `tab` (query) into two Texts, and
 *   "Home" navigating back.
 */

import { placeAll, writeDeskProject, type Desk, type RawNode, type RawWire } from './root-desk';

const button = (id: string, label: string, parent: string): RawNode => ({ id, type: 'net.noodl.controls.button', label, parent, parameters: { label } });

export const navigateDesk = (): Desk => {
  const home: RawNode[] = [
    { id: 'page', type: 'Page', label: 'Home', parameters: { title: 'Home', urlPath: 'home' }, children: ['shell'] },
    { id: 'shell', type: 'Group', label: 'Shell', parent: 'page', children: ['homeText', 'to42', 'toAnn', 'toNobody', 'toTab', 'toPath'], parameters: {} },
    { id: 'homeText', type: 'Text', label: 'Home text', parent: 'shell', parameters: { text: 'the home page' } },
    button('to42', 'Member 42', 'shell'),
    button('toAnn', 'Member Ann', 'shell'),
    button('toNobody', 'Member nobody', 'shell'),
    button('toTab', 'Member in a tab', 'shell'),
    button('toPath', 'Path to 7', 'shell'),
    { id: 'go42', type: 'RouterNavigate', label: 'To member 42', parameters: { target: '/Pages/Member', 'pm-memberId': '42' } },
    { id: 'goAnn', type: 'RouterNavigate', label: 'To Ann', parameters: { target: '/Pages/Member', 'pm-tab': 'notes' } },
    { id: 'goNobody', type: 'RouterNavigate', label: 'To nobody', parameters: { target: '/Pages/Member' } },
    { id: 'goTab', type: 'RouterNavigate', label: 'To member 42 in a tab', parameters: { target: '/Pages/Member', 'pm-memberId': '42', openInNewTab: true } },
    { id: 'goPath', type: 'PageStackNavigateToPath', label: 'To member 7 by path', parameters: { path: '/member/{memberId}' } },
    { id: 'sevenVar', type: 'Variable2', label: 'Seven', parameters: { name: 'seven', value: '7' } },
    { id: 'whoVar', type: 'Variable2', label: 'Who', parameters: { name: 'who', value: 'Ann B/C' } },
    { id: 'nobodyVar', type: 'Variable2', label: 'Nobody', parameters: { name: 'nobody' } }
  ];
  const homeWires: RawWire[] = [
    { fromId: 'to42', fromProperty: 'onClick', toId: 'go42', toProperty: 'navigate' },
    { fromId: 'toAnn', fromProperty: 'onClick', toId: 'goAnn', toProperty: 'navigate' },
    { fromId: 'toNobody', fromProperty: 'onClick', toId: 'goNobody', toProperty: 'navigate' },
    { fromId: 'toTab', fromProperty: 'onClick', toId: 'goTab', toProperty: 'navigate' },
    { fromId: 'toPath', fromProperty: 'onClick', toId: 'goPath', toProperty: 'navigate' },
    { fromId: 'sevenVar', fromProperty: 'value', toId: 'goPath', toProperty: 'p-memberId' },
    { fromId: 'whoVar', fromProperty: 'value', toId: 'goAnn', toProperty: 'pm-memberId' },
    { fromId: 'nobodyVar', fromProperty: 'value', toId: 'goNobody', toProperty: 'pm-memberId' }
  ];
  const member: RawNode[] = [
    { id: 'mPage', type: 'Page', label: 'Member', parameters: { title: 'Member', urlPath: 'member/{memberId}' }, children: ['mShell'] },
    { id: 'mShell', type: 'Group', label: 'Shell', parent: 'mPage', children: ['mId', 'mTab', 'mHome'], parameters: {} },
    { id: 'mId', type: 'Text', label: 'Member id', parent: 'mShell', parameters: {} },
    { id: 'mTab', type: 'Text', label: 'Member tab', parent: 'mShell', parameters: {} },
    button('mHome', 'Home', 'mShell'),
    { id: 'mUrl', type: 'PageInputs', label: 'The address', parameters: { pathParams: 'memberId', queryParams: 'tab' } },
    { id: 'mGoHome', type: 'RouterNavigate', label: 'To home', parameters: { target: '/Pages/Home' } }
  ];
  const memberWires: RawWire[] = [
    { fromId: 'mUrl', fromProperty: 'pm-memberId', toId: 'mId', toProperty: 'text' },
    { fromId: 'mUrl', fromProperty: 'pm-tab', toId: 'mTab', toProperty: 'text' },
    { fromId: 'mHome', fromProperty: 'onClick', toId: 'mGoHome', toProperty: 'navigate' }
  ];
  return { components: { 'Pages/Home': { nodes: placeAll(home), connections: homeWires }, 'Pages/Member': { nodes: placeAll(member), connections: memberWires } } };
};

/** Written as a v2 project whose router lists both pages, Home first. */
export const writeNavigateDesk = (dir?: string): string => {
  const at = writeDeskProject(navigateDesk(), { name: 'Navigate Desk', idBase: 'b8d20e00-0000-4000-8000-0000000012', prefix: 'navigate-desk-' }, dir);
  // `writeDeskProject`'s router lists Home only: Member is listed too, as an app with two pages lists both.
  const fs = require('fs') as typeof import('fs');
  const path = require('path') as typeof import('path');
  const app = path.join(at, 'components', 'App', 'nodes.json');
  const graph = JSON.parse(fs.readFileSync(app, 'utf-8'));
  graph.nodes[0].parameters.pages.routes = ['/Pages/Home', '/Pages/Member'];
  fs.writeFileSync(app, JSON.stringify(graph, null, 2));
  return at;
};
