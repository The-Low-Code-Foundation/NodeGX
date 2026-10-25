/**
 * P107-S97-USERIDBOOLEAN — the Request node's User Id is text, wherever it is declared.
 *
 * It carries the id of the person the session token resolved to, and was declared `boolean`: the canvas coloured it
 * as a flag, a wire into a Number read the id as NaN, and the cast table let it feed a signal input. Before the type
 * changed, the saved wires were counted (the row): 106 from User Id in 13,839 project files, none into a signal, which
 * is the one target a `string` output may not reach.
 */
import * as fs from 'fs';
import * as path from 'path';

import { TYPECASTS, canConnectPortTypes } from '../../nodegx-project-contract/typecasts';
import { node as requestNode } from '../src/nodes/cloud/request';

const catalogPort = (file: string) => {
  const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, '../../noodl-types/src', file), 'utf8'));
  const nodes: Array<{ typeName: string; outputs?: Array<{ name: string; type: unknown }> }> = catalog.nodes || [];
  const request = nodes.find((t) => t.typeName === 'noodl.cloud.request');
  return request?.outputs?.find((p) => p.name === 'userId');
};

describe('P107-S97-USERIDBOOLEAN — User Id is text', () => {
  it('the node declares it a string', () => {
    expect((requestNode.outputs as Record<string, { type: unknown }>).userId.type).toBe('string');
  });

  it('both catalogs the editor and the agent read say string', () => {
    for (const file of ['node-catalog.json', 'node-catalog-enriched.json']) {
      const port = catalogPort(file);
      expect([file, port && JSON.stringify(port.type)]).toEqual([file, JSON.stringify({ name: 'string' })]);
    }
  });

  it('every kind of input the census found it wired into still takes it; a signal input does not', () => {
    for (const target of ['*', 'string', 'number', 'boolean']) expect([target, canConnectPortTypes(TYPECASTS, 'string', target)]).toEqual([target, true]);
    expect(canConnectPortTypes(TYPECASTS, 'string', 'signal')).toBe(false);
  });
});
