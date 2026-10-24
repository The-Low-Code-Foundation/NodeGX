/**
 * P112-OWN026-GUIDANCECUT — the kit's guidance, for a reader that sees only the start and the end of a long result.
 *
 * t1-nodegx-2 (2026-10-22): FIX-01's lesson went into `get_project_info`'s `backendDoctrine`, and DeepSeek never saw
 * it. The result was 51,834 characters; Cline keeps about 8,000 of any tool result (the start and the end, cut in
 * the middle: `CLINE_MESSAGE_BUILDER_MAX_TOOL_RESULT_CHARS`, OWN-020), and the lesson sat at character 40,311.
 * Measured on the fixture with a 4,000 + 4,000 cut: `authoringTraps` survives to trap 7, and `authoringDoctrine`,
 * `interfaceDoctrine`, `designDoctrine` and nine-tenths of `backendDoctrine` are lost.
 *
 * So the answer leads with {@link readFirst}: the rules that cost a rebuild when missed, one line each, and the
 * index of what follows, inside the first ~4,000 characters. Every field after it is unchanged, for a reader that
 * sees all of it. And each section is one call alone (`get_project_info({ section })`), in parts small enough to
 * arrive whole (`"design/2"`), so what the middle cut took is fetchable by name.
 */
import { callHint } from './clientProfile';

/** A section's longest part, in characters: under half of Cline's 8,000, so a part arrives whole beside its envelope. */
export const SECTION_PART_CHARS = 6000;

/** The guidance sections `get_project_info` carries, by the name `section` takes, in the order the answer holds them. */
export const SECTION_FIELDS = {
  traps: 'authoringTraps',
  authoring: 'authoringDoctrine',
  interface: 'interfaceDoctrine',
  design: 'designDoctrine',
  backend: 'backendDoctrine'
} as const;
export type SectionName = keyof typeof SECTION_FIELDS;

const SECTION_ABOUT: Record<SectionName, string> = {
  traps: 'the silent failures, numbered',
  authoring: 'what becomes a component',
  interface: "what goes on a component's interface",
  design: 'the look, the screens, layout, type, colour, responsive',
  backend: 'users, shared values, cloud functions, auth, what a deployed graph does differently'
};

/**
 * Split at headings (`## `, `### `), then at blank lines, so no part is longer than `max`. Lossless: the parts joined
 * with nothing between them are the text. A part never starts mid-paragraph unless one paragraph alone is over `max`.
 */
export function splitSection(text: string, max = SECTION_PART_CHARS): string[] {
  if (text.length <= max) return [text];
  const pieces: string[] = [];
  for (const block of text.split(/(?=\n#{2,3} )/)) {
    if (block.length <= max) pieces.push(block);
    else {
      for (const para of block.split(/(?=\n\n)/)) {
        for (let i = 0; i < para.length; i += max) pieces.push(para.slice(i, i + max));
      }
    }
  }
  const parts: string[] = [];
  let current = '';
  for (const piece of pieces) {
    if (current && current.length + piece.length > max) {
      parts.push(current);
      current = piece;
    } else current += piece;
  }
  if (current) parts.push(current);
  return parts;
}

/** `"design"`, `"design/2"` → the name and the 1-based part; `undefined` for a name that is not a section. */
export function parseSection(section: string): { name: SectionName; part: number } | undefined {
  const m = /^\s*([a-z]+)\s*(?:\/\s*(\d+))?\s*$/i.exec(section);
  if (!m) return undefined;
  const name = m[1].toLowerCase();
  if (!(name in SECTION_FIELDS)) return undefined;
  return { name: name as SectionName, part: m[2] ? Number(m[2]) : 1 };
}

/**
 * The rules that cost a rebuild when missed. One line each, generic: every one is a failure this project has
 * measured in a stranger's build, and every one is said in full in the section named after it.
 */
const MUST_KNOW = [
  'Order: the look (get_style_vocabulary), then the screen list, then create_plan with one operation per component. [design]',
  "A component's inputs are a `Component Inputs` node whose ports are plugged \"output\"; an instance parameter no input declares is dropped without a word. [traps 1–2, interface]",
  'Rows are data: a `Static Data` JSON array, or a Query Records, feeding a `For Each`. Never hand-copied cards. [traps 3]',
  'Colour and spacing are tokens ("var(--space-4)"), never hex or px. After a visual write, look: render_report, then drive_page both ways (a setting off as well as on, a limit at its edge, a confirmation by its cancel). [traps 6–7]',
  'Nodes before code; once a calculation needs code, all of it goes in ONE Function node. [traps 8–9]',
  'The backend keeps users apart (`creatorOwns`): never fetch every row and filter in a Function node; narrow a Query Records on the server with `visualFilter` (example `cloud-query-own-rows`). [backend]',
  "Whose a record is: `owner`, which the backend writes from the creator's session and no page can set. A field the page fills from the User id (an ownerId, a familyId) is the caller's word; to let someone see your records, a cloud function checks `owner` (example `cloud-share-my-records-with-someone`); to let several people change them, a role named from the owner's id, joined only from an invitation's `owner` (example `cloud-members-can-edit-my-records`). [backend]",
  'A value several devices change (a count, score, balance, progress) is changed on the server by the amount: Update Record with `addTo` naming the field and the change (1, -1) wired into it, no script (example `cloud-shared-counter`). Never read it into the page and write it back whole. [backend]',
  "A press that saves is taken once by the runtime: a Button's Click or a Text Input's On Enter is ignored while a save it started waits. Controls wired to the same node share that, so wire a Button and its field's Enter into the SAME node, never two. [backend]",
  "A page can be opened by its own URL (a reload, a shared link): check it that way in drive_page, not only by arriving from another page — whatever the page holds in memory is gone then. [backend]"
];

/**
 * The block `get_project_info` leads with. `total` is the length of the whole answer, said so a reader whose
 * client cuts long results knows that it did.
 */
export function readFirst(sizes: Partial<Record<SectionName, number>>, total: number): {
  note: string;
  mustKnow: string[];
  sections: Record<string, string>;
} {
  const sections: Record<string, string> = {};
  for (const name of Object.keys(SECTION_FIELDS) as SectionName[]) {
    const size = sizes[name];
    if (size === undefined) continue;
    const parts = Math.ceil(size / SECTION_PART_CHARS);
    sections[name] = `${SECTION_ABOUT[name]} (${size.toLocaleString('en-US')} chars${parts > 1 ? `, ${parts} parts` : ''})`;
  }
  return {
    note:
      `This answer is ${total.toLocaleString('en-US')} characters, and some clients keep only the start and the end of a long ` +
      'result. What costs a rebuild when missed is here; every section after it is also one call: ' +
      `${callHint('get_project_info', '{ section: "backend" }')} (a long one comes in parts: "design/2").`,
    mustKnow: MUST_KNOW,
    sections
  };
}

/** The last field of the answer, so the end a cut keeps also says where the middle went. */
export function sectionsTail(): string {
  return `Each guidance section alone: ${callHint('get_project_info', '{ section: "<name>" }')} — ${Object.keys(SECTION_FIELDS).join(', ')}.`;
}
