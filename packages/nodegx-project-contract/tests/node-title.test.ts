/**
 * P107 R24 (s90): a card's title from its own port, one rule for the editor and the agent.
 */
import { portTitle } from '../node-title';

const variable = { usePortAsLabel: 'name' };
const text = { usePortAsLabel: 'text', portLabelTruncationMode: 'length' };
const socket = { usePortAsLabel: 'url', portLabelTruncationMode: 'filename' };

describe('portTitle', () => {
  it('is the port value for a type that titles its card from a port', () => {
    expect(portTitle({ name: 'screenWidth' }, variable)).toBe('screenWidth');
  });

  it('is nothing for a type that titles no card from a port (control)', () => {
    expect(portTitle({ name: 'screenWidth' }, {})).toBeUndefined();
  });

  it('is nothing when the port is unset, empty, or holds an object', () => {
    expect(portTitle({}, variable)).toBeUndefined();
    expect(portTitle(undefined, variable)).toBeUndefined();
    expect(portTitle({ name: '' }, variable)).toBeUndefined();
    expect(portTitle({ name: { some: 'object' } }, variable)).toBeUndefined();
  });

  it('shows an expression by its text, never its fallback', () => {
    expect(portTitle({ name: { mode: 'expression', expression: 'Variables.w', fallback: 3 } }, variable)).toBe('Variables.w');
    expect(portTitle({ name: { mode: 'expression', expression: '', fallback: 3 } }, variable)).toBeUndefined();
  });

  it('cuts a long text at 36 characters and a path to its file name, as the type asks', () => {
    expect(portTitle({ text: 'x'.repeat(36) }, text)).toBe('x'.repeat(36));
    expect(portTitle({ text: 'x'.repeat(37) }, text)).toBe('x'.repeat(33) + '...');
    expect(portTitle({ url: 'wss://host/a/socket' }, socket)).toBe('socket');
  });

  it('writes a number as text', () => {
    expect(portTitle({ name: 7 }, variable)).toBe('7');
  });
});
