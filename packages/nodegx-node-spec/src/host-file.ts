/**
 * The host's `File` constructor (OWN-002). A browser has one; Node has had one as a global since
 * 20 (the repo requires 22). Before this the package imported it from Node's `buffer`, which a
 * browser bundler resolves to a 20 KB polyfill when one happens to be installed and refuses when
 * none is; the global is the same object either way and costs nothing.
 *
 * Typed minimally because the package's `lib` is ES2020 only (no DOM): what the world and the
 * interpreter adapter make for a picked file, and what a node reads from one.
 */
export interface HostFile {
  readonly name: string;
  readonly type: string;
  readonly size: number;
  readonly lastModified: number;
  arrayBuffer(): Promise<ArrayBuffer>;
}

export type HostFileConstructor = new (parts: Array<Uint8Array | ArrayBuffer | string>, name: string, options?: { type?: string; lastModified?: number }) => HostFile;

const found = (globalThis as { File?: HostFileConstructor }).File;
if (!found) throw new Error('@nodegx/node-spec: this host has no File constructor (a browser, or Node 20 or newer, has one)');

export const HostFileCtor: HostFileConstructor = found;
