/**
 * P121-TWO001-MEMBERSPHOTO — `Noodl.Files.sign`, the script half of the Sign File URL node.
 *
 * A community's feed reads each post's photos as a list of plain stored files, which the node does not take (it
 * holds a `CloudFile` only), so the feed signs them in its loader script. This spec holds what `sign` hands the store
 * for each shape a script holds a file in, and that a refusal reaches the script as a rejection.
 */
const signFileUrlSpy = jest.fn();

jest.mock('@noodl/runtime/src/api/cloudstore', () => ({
  instance: { signFileUrl: (options: unknown) => signFileUrlSpy(options) }
}));
jest.mock('@noodl/runtime/src/api/cloudfile', () => class FakeCloudFile {});

import files from '../src/api/files';

interface SignCall {
  name: string;
  target?: unknown;
  success: (r: unknown) => void;
  error: (e: unknown) => void;
}
const lastCall = (): SignCall => signFileUrlSpy.mock.calls[signFileUrlSpy.mock.calls.length - 1][0];

beforeEach(() => signFileUrlSpy.mockReset());

describe('Noodl.Files.sign', () => {
  const link = { url: 'https://b.example/files/ab_photo.png?exp=1&sig=00', kind: 'signed', expiresAt: '2026-10-15T12:00:00.000Z', ttlSeconds: 300 };

  test('a record’s file read as a plain object: signs its stored name and resolves with the link', async () => {
    signFileUrlSpy.mockImplementation((o: SignCall) => o.success(link));
    await expect(files.sign({ __type: 'File', name: 'ab_photo.png', url: 'https://b.example/files/ab_photo.png' } as never)).resolves.toEqual(link);
    expect(lastCall().name).toBe('ab_photo.png');
    expect(lastCall().target).toBeUndefined();
  });

  test('a CloudFile: its name and its target (the two backends that address a file by where it is)', async () => {
    signFileUrlSpy.mockImplementation((o: SignCall) => o.success(link));
    const target = { kind: 'bucket', bucket: 'photos', path: 'a.png' };
    await files.sign({ getName: () => 'a.png', getTarget: () => target });
    expect(lastCall()).toMatchObject({ name: 'a.png', target });
  });

  test('a stored name alone', async () => {
    signFileUrlSpy.mockImplementation((o: SignCall) => o.success(link));
    await files.sign('cd_lunch.jpg');
    expect(lastCall().name).toBe('cd_lunch.jpg');
  });

  test('🔴 a refusal rejects with the store’s envelope, so the script can say why', async () => {
    const refused = { error: 'This file is private.', code: 119, status: 403 };
    signFileUrlSpy.mockImplementation((o: SignCall) => o.error(refused));
    await expect(files.sign('cd_lunch.jpg')).rejects.toEqual(refused);
  });

  test('🔴 nothing to sign is refused before any request', async () => {
    for (const nothing of ['', null, undefined, {}, { name: '' }, 42]) {
      await expect(files.sign(nothing as never)).rejects.toEqual({ error: 'No file specified' });
    }
    expect(signFileUrlSpy).not.toHaveBeenCalled();
  });
});
