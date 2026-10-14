/**
 * P112-S15-WAVTWICE — both stranger agents that built the language app wrapped Gemini's finished WAV in a second WAV
 * header, so every phrase ended in half a second of loud static. Nothing in the kit showed how to play the audio a
 * cloud function returns; this example does, and an agent has to be able to find it in the words it searches with.
 *
 * The play script is run here as the page would run it, on the two shapes an API answers with: a finished WAV
 * (today's `gemini-3.8-flash-tts`, `audio/wav`) must play byte for byte as it came, and raw samples (`audio/L16`,
 * older Gemini) must get exactly one 44-byte header.
 */
import { allExamples, getExample, listExamples } from '../src/catalog';

const ID = 'fn-play-audio-a-cloud-function-returns';

type ExampleNode = { id: string; type: string; parameters?: Record<string, unknown> };
const nodesOf = (component: { nodes: unknown[] } | undefined) => (component?.nodes ?? []) as ExampleNode[];

function playScript(): string {
  const example = getExample(ID);
  if (!example) throw new Error(`${ID} is not in the shipped catalog`);
  const page = example.components.find((c) => !c.name.startsWith('/#__cloud__/'));
  const play = nodesOf(page).find((n) => n.id === 'play');
  return String(play?.parameters?.functionScript ?? '');
}

/** Run the page's Function as the runtime does: an async body over Inputs, with `Audio` captured. */
async function play(inputs: { audio?: string; mimeType?: string }): Promise<string[]> {
  const played: string[] = [];
  class FakeAudio {
    constructor(url: string) {
      played.push(url);
    }
    play() {
      return Promise.resolve();
    }
  }
  const AsyncFunction = Object.getPrototypeOf(async () => undefined).constructor;
  await new AsyncFunction('Inputs', 'Outputs', 'Audio', playScript())(inputs, {}, FakeAudio);
  return played;
}

function wavFile(samples: number): Buffer {
  const data = Buffer.alloc(samples * 2, 7);
  const head = Buffer.alloc(44);
  head.write('RIFF', 0);
  head.writeUInt32LE(36 + data.length, 4);
  head.write('WAVE', 8);
  head.write('fmt ', 12);
  head.writeUInt32LE(16, 16);
  head.writeUInt16LE(1, 20);
  head.writeUInt16LE(1, 22);
  head.writeUInt32LE(24000, 24);
  head.writeUInt32LE(48000, 28);
  head.writeUInt16LE(2, 32);
  head.writeUInt16LE(16, 34);
  head.write('data', 36);
  head.writeUInt32LE(data.length, 40);
  // A provenance chunk after the samples, as Gemini's current model sends: wrapped again, it plays as static.
  return Buffer.concat([head, data, Buffer.from('C2PA'), Buffer.alloc(12, 9)]);
}

describe('P112-S15-WAVTWICE — the example that plays a cloud function’s audio as it came', () => {
  it.each(['text to speech', 'tts', 'play audio from a cloud function', 'speak a phrase', 'gemini audio'])(
    'is found by "%s"',
    (query) => {
      const ids = listExamples({ query }).map((r) => r.id);
      expect(ids).toContain(ID);
      expect(ids.indexOf(ID)).toBeLessThan(3);
    }
  );

  it('plays a finished WAV byte for byte, with no second header', async () => {
    const file = wavFile(240);
    const [url] = await play({ audio: file.toString('base64'), mimeType: 'audio/wav' });
    expect(url).toBe('data:audio/wav;base64,' + file.toString('base64'));
  });

  it('puts exactly one header around raw samples, at the rate the MIME type names', async () => {
    const samples = Buffer.alloc(480, 3);
    const [url] = await play({ audio: samples.toString('base64'), mimeType: 'audio/L16;codec=pcm;rate=16000' });
    expect(url.startsWith('data:audio/wav;base64,')).toBe(true);
    const wav = Buffer.from(url.slice('data:audio/wav;base64,'.length), 'base64');
    expect(wav.length).toBe(44 + samples.length);
    expect(wav.toString('latin1', 0, 4)).toBe('RIFF');
    expect(wav.indexOf('RIFF', 4)).toBe(-1);
    expect(wav.readUInt32LE(24)).toBe(16000);
    expect(wav.subarray(44).equals(samples)).toBe(true);
  });

  it('plays nothing before there is audio', async () => {
    expect(await play({ mimeType: 'audio/wav' })).toEqual([]);
  });

  it('keeps the key on the server: the cloud function reads a Secret and sends it in a header, not the URL', () => {
    const cloud = getExample(ID)!.components.find((c) => c.name === '/#__cloud__/Speak')!;
    expect(nodesOf(cloud).some((n) => n.type === 'noodl.cloud.secret')).toBe(true);
    const script = String(nodesOf(cloud).find((n) => n.id === 'speak_tts')!.parameters!.functionScript);
    expect(script).toContain("'x-goog-api-key': key");
    expect(script).not.toMatch(/\?key=/);
  });
});

/**
 * The function a caller names is the cloud component's path after `/#__cloud__/` (noodl-viewer-cloud, the call's
 * `function` parameter). Two examples called `AddNumbers` / `TaskStats` while their components were
 * `/Cloud Functions/Add Numbers` / `/Cloud Functions/Task Stats`, outside the cloud sheet: an agent copying them is
 * told by create_component to put the function under `#__cloud__/`, and then the call names nothing. Control: the
 * check finds the calls it checks (there are some).
 */
describe('every example call names a cloud function the same example ships', () => {
  const calls = allExamples().flatMap((example) => {
    const cloud = new Set(
      example.components.filter((c) => c.name.startsWith('/#__cloud__/')).map((c) => c.name.slice('/#__cloud__/'.length))
    );
    return example.components.flatMap((c) =>
      nodesOf(c)
        .filter((n) => n.type === 'CloudFunction2')
        .map((n) => ({ example: example.id, fn: String(n.parameters?.function ?? ''), cloud }))
    );
  });

  it('has calls to check', () => expect(calls.length).toBeGreaterThanOrEqual(3));

  it.each(calls.map((c) => [c.example, c.fn, c.cloud] as const))('%s calls "%s", which it ships', (_id, fn, cloud) => {
    expect([...cloud]).toContain(fn);
  });
});
