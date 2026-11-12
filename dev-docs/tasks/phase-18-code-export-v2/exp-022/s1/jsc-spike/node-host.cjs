const fs = require('fs'); const vm = require('vm'); const dir = __dirname;
globalThis.__report = (s) => console.log(s);
for (const f of ['host-prelude.js', 'client.js', 'scenario.js']) vm.runInThisContext(fs.readFileSync(dir + '/' + f, 'utf8'), { filename: f });
