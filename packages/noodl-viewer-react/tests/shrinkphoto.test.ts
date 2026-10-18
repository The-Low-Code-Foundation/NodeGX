/**
 * P121-TWO008-UPLOADSHRINK: the rules `shrinkPhoto` keeps, with the canvas faked.
 *
 * The real decode and canvas are graded in a browser by P121's drive
 * (`packages/nodegx-backend/tests/two-003-drive.test.ts`), which uploads a camera-sized JPEG
 * and reads the stored file's size back.
 */
import {
  type DecodedPhoto,
  type PhotoOps,
  isShrinkable,
  shrinkPhoto,
  shrunkName,
  shrunkSize,
  shrunkType
} from '../src/nodes/std-library/shrinkphoto';

interface Encoded {
  width: number;
  height: number;
  type: string;
  quality: number;
}

/** A fake canvas: decodes to `size`, encodes to `bytes` bytes, and records what it was asked. */
function fakeOps(size: { width: number; height: number }, bytes: number) {
  const encoded: Encoded[] = [];
  let closed = 0;
  const ops: PhotoOps = {
    async decode() {
      return { ...size, close: () => void closed++ } as DecodedPhoto;
    },
    async encode(_photo, width, height, type, quality) {
      encoded.push({ width, height, type, quality });
      return new Blob([new Uint8Array(bytes)], { type });
    }
  };
  return { ops, encoded, closed: () => closed };
}

function photo(name: string, type: string, bytes: number): File {
  return new File([new Uint8Array(bytes)], name, { type, lastModified: 1700000000000 });
}

describe('shrunkSize', () => {
  test('the longer side lands on the limit, the shorter in proportion', () => {
    expect(shrunkSize(4000, 3000, 1600)).toEqual({ width: 1600, height: 1200 });
    expect(shrunkSize(3000, 4000, 1600)).toEqual({ width: 1200, height: 1600 });
  });

  test('never enlarges: an image within the limit is undefined', () => {
    expect(shrunkSize(1600, 1200, 1600)).toBeUndefined();
    expect(shrunkSize(800, 600, 1600)).toBeUndefined();
  });

  test('0, a negative or a missing limit is off', () => {
    expect(shrunkSize(4000, 3000, 0)).toBeUndefined();
    expect(shrunkSize(4000, 3000, -5)).toBeUndefined();
    expect(shrunkSize(4000, 3000, NaN)).toBeUndefined();
  });

  test('a very thin image keeps at least one pixel', () => {
    expect(shrunkSize(10000, 1, 100)).toEqual({ width: 100, height: 1 });
  });
});

describe('which files, written as what', () => {
  test('JPEG, PNG and WebP keep their type; anything else decodable becomes a JPEG', () => {
    expect(shrunkType('image/jpeg')).toBe('image/jpeg');
    expect(shrunkType('image/png')).toBe('image/png');
    expect(shrunkType('image/webp')).toBe('image/webp');
    expect(shrunkType('image/heic')).toBe('image/jpeg');
  });

  test('GIF, SVG and anything not an image are never touched', () => {
    expect(isShrinkable('image/gif')).toBe(false);
    expect(isShrinkable('image/svg+xml')).toBe(false);
    expect(isShrinkable('application/pdf')).toBe(false);
    expect(isShrinkable('')).toBe(false);
    expect(isShrinkable(undefined)).toBe(false);
    expect(isShrinkable('image/jpeg')).toBe(true);
    expect(isShrinkable('image/heic')).toBe(true);
  });

  test('a name changes only when the type did', () => {
    expect(shrunkName('IMG_0001.HEIC', 'image/heic', 'image/jpeg')).toBe('IMG_0001.jpg');
    expect(shrunkName('juice.jpeg', 'image/jpeg', 'image/jpeg')).toBe('juice.jpeg');
    expect(shrunkName('noext', 'image/heic', 'image/jpeg')).toBe('noext.jpg');
  });
});

describe('shrinkPhoto', () => {
  test('a camera JPEG is drawn at the limit, at the asked quality, and sent smaller', async () => {
    const fake = fakeOps({ width: 4032, height: 3024 }, 300_000);
    const sent = await shrinkPhoto(photo('juice.jpg', 'image/jpeg', 4_000_000), { largestSide: 1600, quality: 70 }, fake.ops);

    expect(fake.encoded).toEqual([{ width: 1600, height: 1200, type: 'image/jpeg', quality: 0.7 }]);
    expect(sent.size).toBe(300_000);
    expect(sent.name).toBe('juice.jpg');
    expect(sent.type).toBe('image/jpeg');
    expect(sent.lastModified).toBe(1700000000000);
    expect(fake.closed()).toBe(1);
  });

  test('no quality, or one out of range, is 80', async () => {
    for (const quality of [undefined, 0, 101, NaN]) {
      const fake = fakeOps({ width: 4000, height: 3000 }, 10);
      await shrinkPhoto(photo('a.jpg', 'image/jpeg', 1000), { largestSide: 1000, quality }, fake.ops);
      expect(fake.encoded[0].quality).toBe(0.8);
    }
  });

  test('a PNG logo stays a PNG', async () => {
    const fake = fakeOps({ width: 2000, height: 2000 }, 100);
    const sent = await shrinkPhoto(photo('logo.png', 'image/png', 5000), { largestSide: 512 }, fake.ops);
    expect(fake.encoded[0].type).toBe('image/png');
    expect(sent.type).toBe('image/png');
    expect(sent.name).toBe('logo.png');
  });

  test('a photo already within the limit is sent as picked, not re-encoded', async () => {
    const fake = fakeOps({ width: 1200, height: 900 }, 10);
    const file = photo('a.jpg', 'image/jpeg', 1000);
    expect(await shrinkPhoto(file, { largestSide: 1600 }, fake.ops)).toBe(file);
    expect(fake.encoded).toEqual([]);
  });

  test('a result bigger than the original is thrown away', async () => {
    const fake = fakeOps({ width: 4000, height: 3000 }, 2000);
    const file = photo('a.jpg', 'image/jpeg', 1000);
    expect(await shrinkPhoto(file, { largestSide: 1600 }, fake.ops)).toBe(file);
  });

  test('a photo the browser cannot decode goes as picked, and the promise still resolves', async () => {
    const ops: PhotoOps = {
      decode: () => Promise.reject(new Error('The source image could not be decoded.')),
      encode: () => Promise.reject(new Error('unreached'))
    };
    const file = photo('a.heic', 'image/heic', 1000);
    expect(await shrinkPhoto(file, { largestSide: 1600 }, ops)).toBe(file);
  });

  test('a canvas that writes nothing sends the original', async () => {
    const ops: PhotoOps = {
      decode: async () => ({ width: 4000, height: 3000 }),
      encode: async () => null
    };
    const file = photo('a.jpg', 'image/jpeg', 1000);
    expect(await shrinkPhoto(file, { largestSide: 1600 }, ops)).toBe(file);
  });

  test('off, or a GIF, never decodes at all', async () => {
    const decode = jest.fn();
    const ops = { decode, encode: jest.fn() } as unknown as PhotoOps;
    await shrinkPhoto(photo('a.jpg', 'image/jpeg', 1000), { largestSide: 0 }, ops);
    await shrinkPhoto(photo('a.gif', 'image/gif', 1000), { largestSide: 100 }, ops);
    expect(decode).not.toHaveBeenCalled();
  });
});
