/**
 * P107-S83-SENDFORM — `Outputs.x.send()` names a SIGNAL port.
 *
 * The runtime attaches `.send` to every signal output, so a person may write `Outputs.done()` or
 * `Outputs.done.send()`. The reader knew only the first: `done` became a value port, the runtime prepared no `.send`
 * for it, and every run threw "Cannot read properties of undefined (reading 'send')" and reported Failure. The
 * exporter's own reader already made it a signal, so the running app and the export disagreed.
 */
import { functionScriptPortNames } from '../function-ports';

describe('P107-S83-SENDFORM — the .send() spelling of a signal', () => {
  it('Outputs.ping.send() is a signal, never also a value', () => {
    expect(functionScriptPortNames('Outputs.count = 1;\nOutputs.ping.send()')).toEqual({ inputs: [], signals: ['ping'], outputs: ['count'] });
  });

  it('the bracket form too, either quote, with spaces before the parentheses', () => {
    expect(functionScriptPortNames(`Outputs["all done"].send(); Outputs['next'].send ( );`).signals).toEqual(['all done', 'next']);
  });

  it('control: the plain call is still a signal, a write is still a value, a property read is still a value', () => {
    expect(functionScriptPortNames('Outputs.go(); Outputs.n = 2; const s = Outputs.sender;')).toEqual({ inputs: [], signals: ['go'], outputs: ['n', 'sender'] });
  });

  it('control: .send without a call, or a .send() inside a comment, makes no signal', () => {
    expect(functionScriptPortNames('const f = Outputs.later.send; // Outputs.old.send()').signals).toEqual([]);
  });
});
