const CloudStore = require('@noodl/runtime/src/api/cloudstore');
const CloudFile = require('@noodl/runtime/src/api/cloudfile');

export interface FileUploadOptions {
  /** Receives the upload progress event as the browser reports it. */
  onProgress?: (progress: unknown) => void;
}

/**
 * A stored file as a script holds it: the `CloudFile` an upload resolved with, a
 * record's file read with `plain: true` (`{ __type: 'File', name, url }`), an
 * item of a list of such files, or the stored name alone.
 */
export type StoredFileLike = string | { getName?: () => string; getTarget?: () => unknown; name?: unknown; target?: unknown };

/** What `sign` resolves with: the contract's `SignedFileUrl`. */
export interface SignedLink {
  url: string;
  kind: string;
  expiresAt?: string;
  ttlSeconds?: number;
}

function storedName(file: StoredFileLike): { name: string; target?: unknown } | undefined {
  if (typeof file === 'string') return file ? { name: file } : undefined;
  if (!file || typeof file !== 'object') return undefined;
  if (typeof file.getName === 'function') return { name: file.getName(), target: file.getTarget ? file.getTarget() : undefined };
  return typeof file.name === 'string' && file.name ? { name: file.name, target: file.target } : undefined;
}

/**
 * `Noodl.Files` — the file half of the JavaScript API a project's own script nodes
 * use. Resolves with a `CloudFile` wrapper rather than the raw backend response.
 */
const files = {
  async upload(file: File | Blob, options?: FileUploadOptions): Promise<unknown> {
    return new Promise((resolve, reject) => {
      CloudStore.instance.uploadFile({
        file,
        onUploadProgress: (p: unknown) => {
          options && options.onProgress && options.onProgress(p);
        },
        success: (response: unknown) => {
          resolve(new CloudFile(response));
        },
        error: (e: unknown) => {
          reject(e);
        }
      });
    });
  },

  /**
   * P121-TWO001-MEMBERSPHOTO: a link an `<img>` can use for a private file, the
   * Sign File URL node's call. A list of photos is read as plain objects, which
   * that node does not take, so a feed signs its photos here in one script. Refused
   * (rejected) for a caller who could not read the file itself.
   */
  async sign(file: StoredFileLike): Promise<SignedLink> {
    const stored = storedName(file);
    if (!stored) throw { error: 'No file specified' };
    return new Promise((resolve, reject) => {
      CloudStore.instance.signFileUrl({
        name: stored.name,
        target: stored.target,
        success: (result: SignedLink) => resolve(result),
        error: (e: unknown) => reject(e)
      });
    });
  }
};

export default files;
