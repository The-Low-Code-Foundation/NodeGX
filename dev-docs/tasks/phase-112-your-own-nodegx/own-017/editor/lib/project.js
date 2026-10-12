'use strict';

const path = require('path');
const { diskFiles } = require('@nodegx/project-contract/format-node');
const { V2ProjectStore } = require('@nodegx/project-contract/format');

/**
 * The project this editor opens. Override with NODEGX_PROJECT_DIR; by default it's the
 * `french-phrases` folder that sits next to this `editor` folder.
 */
const PROJECT_DIR = process.env.NODEGX_PROJECT_DIR
  ? path.resolve(process.cwd(), process.env.NODEGX_PROJECT_DIR)
  : path.resolve(__dirname, '..', '..', 'french-phrases');

/** A fresh store per call: this editor is a short-lived HTTP request, not a long-held session. */
function openStore() {
  return new V2ProjectStore(diskFiles(PROJECT_DIR));
}

module.exports = { PROJECT_DIR, openStore };
