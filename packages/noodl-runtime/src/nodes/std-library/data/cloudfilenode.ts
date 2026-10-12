import type { NodeDefinitionOptions, NodeInstance, NodeModule } from '@noodl/types';

import CloudFile = require('../../../api/cloudfile');

/** `this` inside the Cloud File node — it holds one file and reports its URL and name. */
interface CloudFileNodeInstance extends NodeInstance {
  _internal: {
    cloudFile?: CloudFile;
  };
}

const CloudFileNode: NodeDefinitionOptions = {
  name: 'Cloud File',
  docs: 'https://docs.noodl.net/nodes/data/cloud-data/cloud-file',
  category: 'Cloud Services',
  color: 'data',
  getInspectInfo(this: CloudFileNodeInstance) {
    return this._internal.cloudFile && this._internal.cloudFile.getUrl();
  },
  outputs: {
    url: {
      type: 'string',
      displayName: 'URL',
      group: 'General',
      description: 'Address the file can be fetched from; a private file needs a Sign File URL node before this link works',
      get(this: CloudFileNodeInstance) {
        return this._internal.cloudFile && this._internal.cloudFile.getUrl();
      }
    },
    name: {
      type: 'string',
      displayName: 'Name',
      group: 'General',
      description: 'Original file name as it was uploaded, without the storage prefix',
      get(this: CloudFileNodeInstance) {
        const file = this._internal.cloudFile;
        if (!file) return;

        // P107-C52 (P109 ISL-030, ruled "Keep the real name"): the name it was uploaded as, when that is known.
        const filename = typeof file.getFilename === 'function' ? file.getFilename() : undefined;
        if (typeof filename === 'string' && filename !== '') return filename;
        // Not known (a file read back from a record). A file addressed by a target (PocketBase, Supabase) has a stored
        // name that is not prefixed — `<name>_<suffix>`, a path — so it is shown whole rather than chopped at its first
        // underscore, which showed PocketBase's random suffix.
        if (file.getTarget() !== undefined) return file.getName();
        // The Parse wire prefixes the file with a guid_; remove it so the name is the one uploaded. (A Directus UUID has
        // no underscore, so it is whole either way.)
        const n = file.getName().split('_');
        return n.length === 1 ? n[0] : n.slice(1).join('_');
      }
    },
    // BCN-007's live pass found the backend reports both on a real 201 and
    // `normalizeFileRef` keeps both, but nothing downstream could read them.
    // Both stay `undefined` rather than `''`/`0` on a backend that does not
    // report them, and on a file read back out of a saved record property —
    // see `cloudfile.ts` for why that distinction is kept rather than defaulted.
    contentType: {
      type: 'string',
      displayName: 'Content Type',
      group: 'General',
      description: 'MIME type the backend recorded on upload; empty on a backend that does not report one, and on a file read back from a record property',
      get(this: CloudFileNodeInstance) {
        return this._internal.cloudFile && this._internal.cloudFile.getContentType();
      }
    },
    size: {
      type: 'number',
      displayName: 'Size',
      group: 'General',
      description: 'Size in bytes the backend recorded on upload; empty on a backend that does not report one, and on a file read back from a record property',
      get(this: CloudFileNodeInstance) {
        return this._internal.cloudFile && this._internal.cloudFile.getSize();
      }
    }
  },
  inputs: {
    file: {
      type: 'cloudfile',
      displayName: 'Cloud File',
      group: 'General',
      description:
        'Stored file to read, as an Upload File node or a record property produces it; any other value leaves the previous file in place',
      set(this: CloudFileNodeInstance, value: unknown) {
        if (value instanceof CloudFile === false) {
          return;
        }
        this._internal.cloudFile = value as CloudFile;
        this.flagOutputDirty('name');
        this.flagOutputDirty('url');
        this.flagOutputDirty('contentType');
        this.flagOutputDirty('size');
      }
    }
  }
};

const CloudFileNodeModule: NodeModule = {
  node: CloudFileNode
};

export = CloudFileNodeModule;
