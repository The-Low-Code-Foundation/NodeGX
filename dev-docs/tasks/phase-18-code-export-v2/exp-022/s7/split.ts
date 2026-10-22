const PKG = '/Users/richardosborne/vscode_projects/OpenNoodl/packages/nodegx-export';
const spec = require(`${PKG}/../nodegx-node-spec/src`);
const { swiftGraphVerdicts, SWIFT_PRINTER_VERDICT, EXPORTER_VERDICT } = require(`${PKG}/tests/helpers/swift-graph-target`);
const v = swiftGraphVerdicts(spec.loadGraphScenarios());
const out = v.filter((x: any) => x.outside);
console.log({ playable: v.length - out.length, swift: out.filter((x: any) => SWIFT_PRINTER_VERDICT.test(x.outside)).length, plan: out.filter((x: any) => !SWIFT_PRINTER_VERDICT.test(x.outside) && EXPORTER_VERDICT.test(x.outside)).length });
