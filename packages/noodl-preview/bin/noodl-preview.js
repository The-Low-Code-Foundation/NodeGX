#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const dist = path.join(__dirname, '..', 'dist', 'noodl-preview.cjs');
if (!fs.existsSync(dist)) {
  process.stderr.write(
    'noodl-preview: dist/noodl-preview.cjs is missing, so this copy of @nodegx/preview is incomplete.\n' +
      'Installed from npm: install it again (npx -y @nodegx/preview@latest <project-dir>).\n' +
      'In a NodeGX checkout: build it first,  npm --prefix packages/noodl-preview run build\n' +
      '(or run `npm run preview -- <project-dir>` from the repo root, which builds for you)\n'
  );
  process.exit(2);
}
require(dist);
