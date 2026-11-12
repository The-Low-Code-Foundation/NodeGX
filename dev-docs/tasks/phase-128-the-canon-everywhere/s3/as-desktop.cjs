// P128-S3-HELPERNODE — stand where Claude Desktop's built-in Node stands: `process.execPath` is a helper binary that
// refuses to run a script (exit 64), as "Claude Helper (Plugin)" does, and `process.versions.electron` is set.
// Use: node -r dev-docs/tasks/phase-128-the-canon-everywhere/s3/as-desktop.cjs <server> …  (drive-mcpb.mjs: PRELOAD=)
const path = require('path');
Object.defineProperty(process, 'execPath', { value: path.join(__dirname, 'Claude Helper (Plugin)') });
Object.defineProperty(process.versions, 'electron', { value: '39.0.0', enumerable: true });
