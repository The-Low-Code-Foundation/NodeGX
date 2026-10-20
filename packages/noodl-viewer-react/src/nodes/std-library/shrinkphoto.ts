/**
 * P121-TWO008-UPLOADSHRINK: a photo made smaller in the browser before Upload File sends it.
 *
 * A phone's camera file is 3 to 8 MB; on a slow, paid connection the backend's `?thumb=`
 * transforms come too late, because they shrink what is served and not what is sent. So the
 * picked image is decoded, drawn onto a canvas no larger than the asked side, and the canvas
 * is what goes.
 *
 * What it never does, each measured as a refusal to make things worse:
 * - it never enlarges, and never re-encodes a photo already within the size;
 * - it never sends a result bigger than the original;
 * - it never turns a PNG or a WebP into a JPEG (a seller's logo keeps its transparency);
 * - it never touches a GIF (the animation would be lost) or an SVG (it has no pixels);
 * - it never fails the upload: an image the browser cannot decode goes as it was picked.
 *
 * The canvas steps are behind `PhotoOps` so the rules above are gradeable in node; the real
 * ops are graded in a browser by P121's drive (`two-003-drive.test.ts`).
 */

export interface ShrinkOptions {
  /** The longer side, in pixels, after shrinking. 0 or less: send as picked. */
  largestSide: number;
  /** 0 to 100, for JPEG and WebP. Out of range or not a number: 80. */
  quality?: number;
}

/** A decoded image, already turned the way its EXIF orientation says. */
export interface DecodedPhoto {
  width: number;
  height: number;
  close?(): void;
}

export interface PhotoOps {
  decode(file: Blob): Promise<DecodedPhoto>;
  encode(photo: DecodedPhoto, width: number, height: number, type: string, quality: number): Promise<Blob | null>;
}

export const DEFAULT_PHOTO_QUALITY = 80;

/** Types a canvas can write back as themselves. Anything else decodable becomes a JPEG. */
const KEEPS_ITS_TYPE = new Set(['image/png', 'image/webp', 'image/jpeg']);
/** Images this never touches. */
const LEFT_ALONE = new Set(['image/gif', 'image/svg+xml']);

/** The size a `width` × `height` image is drawn at so its longer side is at most `largestSide`; undefined when it already is. */
export function shrunkSize(width: number, height: number, largestSide: number): { width: number; height: number } | undefined {
  const longer = Math.max(width, height);
  if (!(largestSide > 0) || !(longer > largestSide)) return undefined;
  const scale = largestSide / longer;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale))
  };
}

/** The type the shrunk file is written as. */
export function shrunkType(type: string): string {
  return KEEPS_ITS_TYPE.has(type) ? type : 'image/jpeg';
}

/** Whether a file of this type is one this tries to shrink at all. */
export function isShrinkable(type: string | undefined): boolean {
  return typeof type === 'string' && type.startsWith('image/') && !LEFT_ALONE.has(type);
}

/** `photo.HEIC` written as JPEG is `photo.jpg`; a name whose type did not change is kept as it is. */
export function shrunkName(name: string, fromType: string, toType: string): string {
  if (fromType === toType) return name;
  const ext = toType === 'image/jpeg' ? 'jpg' : toType.slice('image/'.length);
  const dot = name.lastIndexOf('.');
  return `${dot > 0 ? name.slice(0, dot) : name || 'photo'}.${ext}`;
}

function qualityOf(quality: number | undefined): number {
  const q = typeof quality === 'number' && quality > 0 && quality <= 100 ? quality : DEFAULT_PHOTO_QUALITY;
  return q / 100;
}

/** The browser's own decode and canvas. `imageOrientation: 'from-image'` honours a phone photo's EXIF turn. */
export const browserPhotoOps: PhotoOps = {
  async decode(file) {
    return createImageBitmap(file, { imageOrientation: 'from-image' });
  },
  encode(photo, width, height, type, quality) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return Promise.resolve(null);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(photo as unknown as CanvasImageSource, 0, 0, width, height);
    return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
  }
};

/**
 * The file to send: a smaller one when that is possible and better, else `file` itself.
 * Never rejects.
 */
export async function shrinkPhoto(file: File, options: ShrinkOptions, ops: PhotoOps = browserPhotoOps): Promise<File> {
  if (!(options.largestSide > 0) || !isShrinkable(file.type)) return file;

  let photo: DecodedPhoto | undefined;
  try {
    photo = await ops.decode(file);
    const size = shrunkSize(photo.width, photo.height, options.largestSide);
    if (!size) return file;

    const type = shrunkType(file.type);
    const blob = await ops.encode(photo, size.width, size.height, type, qualityOf(options.quality));
    if (!blob || blob.size === 0 || blob.size >= file.size) return file;

    return new File([blob], shrunkName(file.name, file.type, type), {
      type,
      lastModified: file.lastModified
    });
  } catch (_e) {
    return file;
  } finally {
    if (photo && photo.close) photo.close();
  }
}
