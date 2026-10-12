/**
 * P112 OWN-015 — P112-S14-CFPORTS: a cloud function wired the way the agent's checker accepted sends nothing.
 *
 * The stranger round's `Speak` function and its caller were wired with bare names: `call_speak.text`,
 * `call_speak.audioDataUrl` on the browser's CloudFunction2, `req.text` and `res.audioDataUrl` inside the function. The
 * runtime only ever mints `in-`/`out-` on the caller (`cloudfunction2.ts` `registerInputIfNeeded` /
 * `registerOutputIfNeeded`) and `pm-` on the Request and Response (`request.ts` / `response.ts`), so none of the five
 * wires existed and the function returned `{}` in 10 ms. Two holes let them through:
 *
 * 1. a bare name on the CloudFunction2 was refused, but the agent then declared it in the instance's own `ports` and
 *    the rule's "the node declares it" step accepted it before ISL-042's "the runtime can never mint it" step ran;
 * 2. the Request and Response were never checked: their ports are runtime-minted, so a bare name was skipped.
 *
 * Every arm is graded through `validate_component`; each wrong wire sits beside its right twin in the same component.
 */
import * as fs from 'fs';
import * as path from 'path';

import type { ValidateComponentResponse } from '../src/tools/responses';
import { call, connect, copyFixture, TestSession } from './helpers';

jest.setTimeout(60000);

function writeJson(file: string, value: unknown): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2));
}

const wire = (fromId: string, fromProperty: string, toId: string, toProperty: string) => ({ fromId, fromProperty, toId, toProperty });

interface Found {
  key: string;
  message: string;
  suggestion?: string;
}

describe('OWN-015 CFPORTS — a cloud port without its in-/out-/pm- prefix is refused, on both sides of the call', () => {
  let dir: string;
  let session: TestSession;
  let caller: Found[];
  let fn: Found[];

  const errorsOf = async (component: string): Promise<Found[]> => {
    const v = await call<ValidateComponentResponse>(session, 'validate_component', { path: component });
    expect(v.isError).toBe(false);
    return (v.data.diagnostics ?? [])
      .filter((d) => d.severity === 'error')
      .map((d) => ({
        key: `${d.location?.nodeId}:${d.location?.plug}:${d.location?.port}`,
        message: d.message,
        suggestion: typeof d.suggestion === 'string' ? d.suggestion : undefined
      }));
  };

  beforeAll(async () => {
    dir = copyFixture();
    const components = path.join(dir, 'components');

    // The function, wired right (pm-text, pm-audioDataUrl) and wrong (text, audioDataUrl), as the round wrote it.
    const cloud = path.join(components, '__cloud__', 'Functions', 'Speak');
    writeJson(path.join(cloud, 'component.json'), {
      $schema: 'https://opennoodl.dev/schemas/component-v2.json',
      id: 'c_speak',
      name: 'Functions/Speak',
      path: '/#__cloud__/Functions/Speak',
      type: 'cloud'
    });
    writeJson(path.join(cloud, 'nodes.json'), {
      $schema: 'https://opennoodl.dev/schemas/nodes-v2.json',
      componentId: 'c_speak',
      version: 1,
      nodes: [
        { id: 'req', type: 'noodl.cloud.request', parameters: { params: 'text' } },
        { id: 'res', type: 'noodl.cloud.response', parameters: { params: 'audioDataUrl' } },
        { id: 'said', type: 'String', parameters: { value: '' } },
        { id: 'audio', type: 'String', parameters: { value: 'data:audio/wav;base64,' } }
      ]
    });
    writeJson(path.join(cloud, 'connections.json'), {
      $schema: 'https://opennoodl.dev/schemas/connections-v2.json',
      componentId: 'c_speak',
      version: 1,
      connections: [
        // Right.
        wire('req', 'pm-text', 'said', 'value'),
        wire('audio', 'savedValue', 'res', 'pm-audioDataUrl'),
        wire('req', 'receive', 'res', 'send'),
        // Wrong.
        wire('req', 'text', 'said', 'value'),
        wire('audio', 'savedValue', 'res', 'audioDataUrl')
      ]
    });
    const registry = JSON.parse(fs.readFileSync(path.join(components, '_registry.json'), 'utf8'));
    registry.components['__cloud__/Functions/Speak'] = {
      path: '__cloud__/Functions/Speak',
      type: 'cloud',
      nodeCount: 4,
      connectionCount: 5
    };
    writeJson(path.join(components, '_registry.json'), registry);

    // The caller, on Card. `cfDeclared` carries the instance `ports` the agent added to get past the first refusal.
    const card = path.join(components, 'Card');
    const nodes = JSON.parse(fs.readFileSync(path.join(card, 'nodes.json'), 'utf8'));
    nodes.nodes.push(
      { id: 'cf', type: 'CloudFunction2', label: 'Speak right', parameters: { function: 'Functions/Speak' } },
      {
        id: 'cfDeclared',
        type: 'CloudFunction2',
        label: 'Speak declared',
        parameters: { function: 'Functions/Speak' },
        ports: [
          { name: 'text', plug: 'input', type: 'string' },
          { name: 'audioDataUrl', plug: 'output', type: 'string' }
        ]
      },
      { id: 'cfBare', type: 'CloudFunction2', label: 'Speak bare', parameters: { function: 'Functions/Speak' } },
      { id: 'phrase', type: 'String', parameters: { value: 'Bonjour' } },
      { id: 'sound', type: 'String', parameters: { value: '' } }
    );
    writeJson(path.join(card, 'nodes.json'), nodes);
    writeJson(path.join(card, 'connections.json'), {
      $schema: 'https://opennoodl.dev/schemas/connections-v2.json',
      componentId: 'c_card',
      version: 1,
      connections: [
        // Right.
        wire('phrase', 'savedValue', 'cf', 'in-text'),
        wire('cf', 'out-audioDataUrl', 'sound', 'value'),
        // Wrong, with the instance's own declaration.
        wire('phrase', 'savedValue', 'cfDeclared', 'text'),
        wire('cfDeclared', 'audioDataUrl', 'sound', 'value'),
        // Wrong, bare.
        wire('phrase', 'savedValue', 'cfBare', 'text')
      ]
    });

    session = await connect(dir);
    caller = await errorsOf('Card');
    fn = await errorsOf('/#__cloud__/Functions/Speak');
  });

  afterAll(async () => {
    await session?.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('known-good: in-text, out-audioDataUrl, pm-text and pm-audioDataUrl pass', () => {
    const keys = [...caller, ...fn].map((f) => f.key);
    for (const ok of ['cf:input:in-text', 'cf:output:out-audioDataUrl', 'req:output:pm-text', 'res:input:pm-audioDataUrl']) {
      expect(keys).not.toContain(ok);
    }
  });

  it("the caller's bare names are refused even when the instance declares them, and the fix names the prefixed port", () => {
    const keys = caller.map((f) => f.key).sort();
    expect(keys).toEqual(['cfBare:input:text', 'cfDeclared:input:text', 'cfDeclared:output:audioDataUrl']);
    const said = (key: string) => caller.find((f) => f.key === key)!;
    expect(`${said('cfDeclared:input:text').message} ${said('cfDeclared:input:text').suggestion}`).toContain('in-text');
    expect(`${said('cfBare:input:text').message} ${said('cfBare:input:text').suggestion}`).toContain('in-text');
    expect(`${said('cfDeclared:output:audioDataUrl').message} ${said('cfDeclared:output:audioDataUrl').suggestion}`).toContain(
      'out-audioDataUrl'
    );
  });

  it("the function's Request output and Response input are refused without pm-, and the fix names pm-<name>", () => {
    const keys = fn.map((f) => f.key).sort();
    expect(keys).toEqual(['req:output:text', 'res:input:audioDataUrl']);
    for (const f of fn) expect(`${f.message} ${f.suggestion}`).toContain(`pm-${f.key.split(':')[2]}`);
  });
});
