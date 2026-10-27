/**
 * NPMAUDIT-EXAMPLEINVALID — an example the server teaches is one it will build.
 *
 * The stranger audit (2026-10-23) wrote every example back through `create_component` and was refused 44 times, while
 * `catalog:examples` (the editor's validator) said 113/113 clean. The beta sweep's eighth session sorted them. The
 * example's own defects, fixed: String Format's `result` and an `input` it never has; Log level `warning` (the option is
 * `warn`) in five; Checkbox `labelSpacing: "8px"`; a Script node written against an API that does not exist
 * (`script.inputs = …` on the `script` function) and another with no code at all; String Mapper's `input`/`output` for
 * `inputString`/`mappedString`; Aggregate Records' `taskCount`, which is not a port (`agg-<name>`) and a count it cannot
 * compute; an Object's `title` for `prop-title`; Set Object Properties' `stored` (P107-S86-STOREDWIRE's rename); eight
 * cloud functions named `/Cloud Functions/…`, which the write door builds as browser components (the rest use
 * `/#__cloud__/Cloud Functions/…`); 58 component ports typed `{ name: "*" }`, which the tool's argument schema refuses
 * outright; a For Each whose row is a component from the community project it was taken from.
 *
 * So every example is written here, on a fresh copy of the fixture, the components another one places or names first.
 * What stays refused is the write's context, not the example, and each is named with its reason below: a new example
 * the door refuses fails this file.
 */
import * as fs from 'fs';

import { call, connect, copyFixture } from './helpers';
import { allExamples } from '../src/catalog';

interface ExampleComponent {
  name: string;
  nodes: Array<{ type?: string; parameters?: Record<string, unknown> }>;
  connections?: unknown[];
}

interface WriteResult {
  isError: boolean;
  data: { error?: { message?: string; details?: { readable?: string[] } } };
}

/** Refused for the fixture or the project the example assumes — not for anything the example teaches wrong. */
const CONTEXT: Record<string, string> = {
  'app-catch-every-error-in-one-place': 'writes /App, which the fixture already has (update_component)',
  'nav-url-product-page': 'writes /App, which the fixture already has (update_component)',
  'ui-landing-page': 'writes /Pages/Home, which the fixture already has (update_component)',
  'cloud-create-record-with-upload': "a record's property ports need the example's collection in the project",
  'cloud-edit-record': "a record's property ports need the example's collection in the project",
  'cloud-record-crud': "a record's property ports need the example's collection in the project",
  'user-signup-and-profile': "Set User Properties' ports need the backend's account columns",
  'community-better-markdown-comp': 'a module node type (Markdown) the fixture does not install',
  'community-simple-audio-recorde': 'a module node type (module.inlineHtml) the fixture does not install',
  'community-web-rtc-video-record': 'a module node type (module.inlineHtml) the fixture does not install',
  'media-record-audio-and-upload': 'a module node type (nodegx.mediarecorder) the fixture does not install',
  'media-record-video-from-a-live-preview': 'a module node type (Web Camera) the fixture does not install'
};

/** Examples whose components lean on another example's, written first (and so not each other's context). */
const PRELUDE: Record<string, string> = {
  'community-tiptap-text-editor': 'community-tiptap-text-editor-r'
};

/** Where the order a component's references give is not enough: the stack naming /Confirm draws /Cart's Back Actions. */
const ORDER: Record<string, string[]> = {
  'nav-page-stack-push-pop': ['/Confirm', '/Checkout', '/Cart']
};

const examples = allExamples() as unknown as Array<{ id: string; components: ExampleComponent[] }>;
const byId = new Map(examples.map((e) => [e.id, e]));

/** A component another one places (as a node type) or names (a template, a page) is written before it. */
function writeOrder(id: string, components: ExampleComponent[]): ExampleComponent[] {
  if (ORDER[id]) return ORDER[id].map((name) => components.find((c) => c.name === name)!);
  const names = new Set(components.map((c) => c.name));
  const uses = (c: ExampleComponent) =>
    c.nodes.flatMap((n) => [n.type, ...Object.values(n.parameters ?? {})]).filter((v): v is string => typeof v === 'string' && names.has(v) && v !== c.name);
  const done: ExampleComponent[] = [];
  const visit = (c: ExampleComponent, path: string[]) => {
    if (done.includes(c) || path.includes(c.name)) return;
    for (const name of uses(c)) visit(components.find((o) => o.name === name)!, [...path, c.name]);
    done.push(c);
  };
  components.forEach((c) => visit(c, []));
  return done;
}

async function refusals(id: string): Promise<string[]> {
  const dir = copyFixture();
  const session = await connect(dir);
  const refused: string[] = [];
  try {
    const ids = PRELUDE[id] ? [PRELUDE[id], id] : [id];
    for (const each of ids) {
      for (const component of writeOrder(each, byId.get(each)!.components)) {
        const res = (await call(session, 'create_component', {
          path: component.name.replace(/^\//, ''),
          nodes: component.nodes,
          connections: component.connections ?? []
        })) as unknown as WriteResult;
        if (res.isError) refused.push(`${component.name}: ${(res.data.error?.details?.readable ?? [res.data.error?.message ?? JSON.stringify(res.data).slice(0, 400)]).join(' | ')}`);
      }
    }
  } finally {
    await session.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
  return refused;
}

describe('NPMAUDIT-EXAMPLEINVALID — every example the server teaches, the write door builds', () => {
  it('reads the whole library', () => {
    expect(examples.length).toBeGreaterThan(100);
    for (const id of [...Object.keys(CONTEXT), ...Object.keys(PRELUDE), ...Object.values(PRELUDE), ...Object.keys(ORDER)]) {
      expect(byId.has(id)).toBe(true);
    }
  });

  it.each(examples.map((e) => e.id).filter((id) => !CONTEXT[id]))('%s', async (id) => {
    expect(await refusals(id)).toEqual([]);
  });

  // P127-BKO006-CRUDIDSOURCE: the context excuses the ports the project lacks, not a value a port never offers. The
  // book club's agent copied cloud-record-crud's `idSource: "value"`, which this file let through as context.
  it.each(Object.keys(CONTEXT))('%s is refused for its context only, never for a value its ports do not offer', async (id) => {
    const lines = (await refusals(id)).flatMap((r) => r.split(' | '));
    expect(lines.filter((l) => l.includes('[invalid-parameter-value]'))).toEqual([]);
  });
});
