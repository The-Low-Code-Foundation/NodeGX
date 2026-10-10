const fs = require('fs');
const path = require('path');
const { merge } = require('webpack-merge');
const { outPath } = require('./constants.js');
const common = require('./webpack.common.js');

const CopyWebpackPlugin = require('copy-webpack-plugin');

const noodlEditorExternalDeployPath = path.join(outPath, 'deploy');

/**
 * P109-S5 — the files this runtime was built from, written beside it as `noodl.deploy.inputs.json` (relative to the
 * runtime's folder; `node_modules` left out). `nodegx deploy` reads it and warns when a source file changed after the
 * runtime was built: on 2026-10-09 a deployed page threw `Noodl.getModule is not a function` because the runtime it
 * carried predated the source by two days, while every loader spec was green. The same rule the deploy engine's list
 * follows (`noodl-preview/build.mjs`).
 */
class InputsListPlugin {
  apply(compiler) {
    compiler.hooks.afterEmit.tap('InputsListPlugin', (compilation) => {
      const outDir = compilation.outputOptions.path;
      const inputs = [...compilation.fileDependencies]
        .filter((file) => !file.includes(`${path.sep}node_modules${path.sep}`) && fs.existsSync(file) && fs.statSync(file).isFile())
        .map((file) => path.relative(outDir, file))
        .sort();
      const listFile = path.join(outDir, 'noodl.deploy.inputs.json');
      fs.writeFileSync(listFile + '.tmp', JSON.stringify({ inputs }, null, 1) + '\n');
      fs.renameSync(listFile + '.tmp', listFile);
    });
  }
}

module.exports = merge(common, {
  entry: {
    deploy: './index.deploy.js'
  },
  output: {
    filename: 'noodl.[name].js',
    path: noodlEditorExternalDeployPath,
    clean: true
  },
  plugins: [
    new InputsListPlugin(),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: 'static/shared',
          to: '.',
          noErrorOnMissing: true,
          info: { minimized: true }
        },
        {
          from: 'static/shared-react19',
          to: 'react19',
          noErrorOnMissing: true,
          info: { minimized: true }
        },
        {
          from: 'static/deploy',
          to: '.',
          noErrorOnMissing: true,
          info: { minimized: true }
        }
      ]
    })
  ]
});
