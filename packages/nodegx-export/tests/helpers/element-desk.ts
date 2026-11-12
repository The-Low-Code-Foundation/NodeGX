/**
 * "Element Desk" (P134 session 11): one page with each element the HTML printer did not draw before this session, in
 * the shapes the templates and HiveClip use them, built in a temporary folder so the corpus golden does not move.
 * `html-the-elements.test.ts` exports it both ways and reads what each draws.
 *
 * - **Picture**: an Image with a typed-in project path and words (gram's tiles, the starter imagery).
 * - **Chosen picture**: an Image whose Source is wired from the Variable `pic`; "Set picture" sets a project path,
 *   "Clear picture" an empty one (an empty Source takes the address off).
 * - **Film**: a Video with a Source, a Poster, Controls and Muted on, Loop off (HiveClip's preview).
 * - **Glyph**: an icon from a set that is one class per glyph (lucide, the templates' 25 icons); **Home glyph**: one whose
 *   glyph is its text (Material Icons); **Star**: an icon whose source is a picture.
 * - **Grid**: a Columns of two, one column under 600 px (the landing pages' "beside the form").
 */

import { placeAll, writeDeskProject, type Desk, type RawNode } from './root-desk';

export const elementDesk = (): Desk => {
  const shell = ['pic', 'chosen', 'film', 'glyph', 'homeGlyph', 'star', 'grid', 'setBtn', 'clearBtn'];
  const nodes: RawNode[] = [
    { id: 'page', type: 'Page', label: 'Home', parameters: { title: 'Element Desk', urlPath: 'home' }, children: ['shell'] },
    { id: 'shell', type: 'Group', label: 'Shell', parent: 'page', children: shell, parameters: { flexDirection: 'column' } },
    { id: 'pic', type: 'Image', label: 'Picture', parent: 'shell', parameters: { src: 'noodl_modules/starter-imagery/people-cafe.webp', alt: 'People in a cafe' } },
    { id: 'chosen', type: 'Image', label: 'Chosen picture', parent: 'shell', parameters: { alt: 'The chosen picture' } },
    { id: 'film', type: 'Video', label: 'Film', parent: 'shell', parameters: { src: 'films/intro.mp4', poster: 'films/intro.jpg', controls: true, muted: true, loop: false } },
    { id: 'glyph', type: 'net.noodl.visual.icon', label: 'Glyph', parent: 'shell', parameters: { iconIconSource: { class: 'lucide', code: 'icon-sparkles', codeAsClass: true } } },
    { id: 'homeGlyph', type: 'net.noodl.visual.icon', label: 'Home glyph', parent: 'shell', parameters: { iconIconSource: { class: 'material-icons', code: 'home' } } },
    { id: 'star', type: 'net.noodl.visual.icon', label: 'Star', parent: 'shell', parameters: { iconSourceType: 'image', iconImageSource: 'icons/star.svg' } },
    {
      id: 'grid',
      type: 'net.noodl.visual.columns',
      label: 'Grid',
      parent: 'shell',
      children: ['left', 'right'],
      parameters: { layoutString: '1 2', mediumBreakpoint: { value: 600, unit: 'px' }, mediumLayout: '1' }
    },
    { id: 'left', type: 'Text', label: 'Left', parent: 'grid', parameters: { text: 'the left column' } },
    { id: 'right', type: 'Text', label: 'Right', parent: 'grid', parameters: { text: 'the right column' } },
    { id: 'setBtn', type: 'net.noodl.controls.button', label: 'Set picture', parent: 'shell', parameters: { label: 'Set picture' } },
    { id: 'clearBtn', type: 'net.noodl.controls.button', label: 'Clear picture', parent: 'shell', parameters: { label: 'Clear picture' } },
    { id: 'picVar', type: 'Variable2', label: 'Picture address', parameters: { name: 'pic', value: 'https://example.com/a.png' } },
    { id: 'setPic', type: 'Set Variable', label: 'Choose b', parameters: { name: 'pic', value: 'pics/b.png' } },
    { id: 'clearPic', type: 'Set Variable', label: 'Choose none', parameters: { name: 'pic', value: '' } }
  ];
  return {
    components: {
      'Pages/Home': {
        nodes: placeAll(nodes),
        connections: [
          { fromId: 'picVar', fromProperty: 'value', toId: 'chosen', toProperty: 'src' },
          { fromId: 'setBtn', fromProperty: 'onClick', toId: 'setPic', toProperty: 'do' },
          { fromId: 'clearBtn', fromProperty: 'onClick', toId: 'clearPic', toProperty: 'do' }
        ]
      }
    }
  };
};

export const writeElementDesk = (edit?: (d: Desk) => void, dir?: string): { dir: string; desk: Desk } => {
  const desk = elementDesk();
  edit?.(desk);
  return { dir: writeDeskProject(desk, { name: 'Element Desk', idBase: 'b8d20e00-0000-4000-8000-0000000011', prefix: 'element-desk-' }, dir), desk };
};
