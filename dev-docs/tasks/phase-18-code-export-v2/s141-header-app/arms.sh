#!/bin/zsh
# Runs both arms on the Header Desk: `arms.sh <exportDir> <label>` → readings-<label>.json (runtime on work/desk, the export on <exportDir>).
X=${0:A:h}
H=/Users/richardosborne/vscode_projects/OpenNoodl/packages/nodegx-export/tests/helpers
SC='[["Mark A","Mark B","Header drop","Mark A","Solo","Mark B"],["Header drop","Solo"],["Solo","Solo"]]'
ST='{"keys":["noodl_store_store-desk"],"seeds":[{},{"noodl_store_store-desk":"{\"app\":{\"items\":[\"kept\"]}}"},{}]}'
if [[ ! -f $X/readings-runtime.json || $3 == runtime ]]; then
  echo "[{\"dir\":\"$X/work/desk\",\"scenarios\":$SC,\"storage\":$ST}]" | RUNTIME_ARM_URL=http://localhost/ nice -n 19 node $H/runtime-mounted-arm.js > $X/readings-runtime.json 2> $X/work/runtime.err
fi
echo "[{\"dir\":\"$1\",\"scenarios\":$SC,\"settled\":true,\"ticks\":2,\"storage\":$ST}]" | nice -n 19 node $H/export-react-arm.js > $X/readings-$2.json 2> $X/work/export-$2.err
node -e 'const r=require(process.argv[1]), e=require(process.argv[2]); r[0].forEach((sc,i)=>{console.log("scenario",i+1); sc.forEach((rd,j)=>console.log("  ", JSON.stringify(rd).padEnd(60), " | ", JSON.stringify(e[0][i][j])))})' $X/readings-runtime.json $X/readings-$2.json
