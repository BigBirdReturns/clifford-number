export const STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];
export const DIMS = ["D1","D2","D3","D4","D5","D6","D7","D8"];
export const TOP = ["CA","CT","KS","KY","WA"];
export const D7_STATES = ["CA","CO","CT","DE","GA","IL","KS","KY","MA","MN","MS","OR","RI","TN","VT","VA","WA"];
export const EXPECTED_TOTALS = {AL:4,AK:4,AZ:7,AR:5,CA:12,CO:9,CT:12,DE:8,FL:5,GA:9,HI:4,ID:7,IL:6,IN:5,IA:7,KS:12,KY:12,LA:4,ME:5,MD:5,MA:6,MI:4,MN:8,MS:6,MO:7,MT:4,NE:4,NV:6,NH:4,NJ:4,NM:8,NY:4,NC:4,ND:5,OH:5,OK:5,OR:9,PA:4,RI:6,SC:5,SD:5,TN:6,TX:5,UT:4,VT:6,VA:7,WA:12,WV:6,WI:5,WY:4};
export const CORE_PATH = 'data/intake/status-sovereignty-rd04-snap-source-availability-a02/core.json';
export const SELECTION_PATH = 'data/intake/status-sovereignty-rd04-snap-source-availability-a02/selection.json';
export const PARENT_PATH = 'data/intake/status-sovereignty-rd04-snap-state-remedy.json';
export const MANIFEST_PATH = 'data/project/status-sovereignty-rd04-snap-source-availability-a02-release-manifest.json';
export const BUILD_ROOT = 'build/core-thesis/status-sovereignty/rd04-snap-source-availability-a02';
export const REPORT_ROOT = 'reports/core-thesis/status-sovereignty/rd04-snap-source-availability-a02';
export const SOURCE_SHARDS = [1,2,3,4].map(i=>`data/intake/status-sovereignty-rd04-snap-source-availability-a02/sources-${String(i).padStart(2,'0')}.json`);
export const STATE_SHARDS = [1,2,3,4,5].map(i=>`data/intake/status-sovereignty-rd04-snap-source-availability-a02/states-${String(i).padStart(2,'0')}.json`);
export const SCHEMAS = {
  core:'schemas/status-sovereignty-rd04-snap-source-availability-a02-core.schema.json',
  selection:'schemas/status-sovereignty-rd04-snap-source-availability-a02-selection.schema.json',
  source:'schemas/status-sovereignty-rd04-snap-source-availability-a02-source-shard.schema.json',
  state:'schemas/status-sovereignty-rd04-snap-source-availability-a02-state-shard.schema.json'
};
export const releaseScope = [
  '.github/workflows/status-sovereignty-rd04-snap-source-availability-a02.yml',
  CORE_PATH,SELECTION_PATH,...SOURCE_SHARDS,...STATE_SHARDS,
  SCHEMAS.core,SCHEMAS.selection,SCHEMAS.source,SCHEMAS.state,
  'docs/milestones/ssc-rd04-snap-source-availability-a02.md',
  'tools/lib/status-sovereignty-rd04-snap-source-availability-a02-constants.mjs',
  'tools/lib/status-sovereignty-rd04-snap-source-availability-a02-io.mjs',
  'tools/lib/status-sovereignty-rd04-snap-source-availability-a02-schema.mjs',
  'tools/lib/status-sovereignty-rd04-snap-source-availability-a02-core-checks.mjs',
  'tools/lib/status-sovereignty-rd04-snap-source-availability-a02-evidence-checks.mjs',
  'tools/build-status-sovereignty-rd04-snap-source-availability-a02.mjs',
  'tools/validate-status-sovereignty-rd04-snap-source-availability-a02.mjs',
  'test/status-sovereignty-rd04-snap-source-availability-a02.test.js'
];
