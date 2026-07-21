import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = file => readFileSync(file, 'utf8');
const loader = read('src/visual-aperture.js');
const state = read('src/visual-aperture-state.mjs');
const workspace = read('src/visual-aperture-workspace.mjs');
const windowing = read('src/visual-aperture-windowing.mjs');
const boundedRuntime = read('src/visual-aperture-bounded-runtime.js');
const addressRuntime = read('src/visual-aperture-bounded-address-runtime.js');
const exportRuntime = read('src/visual-aperture-export-runtime.js');
const exportModel = read('src/visual-aperture-export.mjs');
const exportPreview = read('src/visual-aperture-export-preview-runtime.js');
const boundedCss = read('src/visual-aperture-bounded.css');
const standalone = read('tools/build-standalone.mjs');

assert.match(windowing, /APERTURE_OVERVIEW_PAGE_SIZES = Object\.freeze\(\[25, 50, 100\]\)/);
assert.match(windowing, /APERTURE_DEFAULT_OVERVIEW_PAGE_SIZE = 50/);
assert.match(windowing, /APERTURE_MAX_ROUTE_WINDOW_STEPS = 24/);
assert.match(windowing, /function paginateApertureRows/);
assert.match(windowing, /function windowApertureRoute/);

assert.match(state, /ap_overview_page/);
assert.match(state, /ap_overview_size/);
assert.match(state, /ap_route_window/);
assert.match(workspace, /ap_overview_page/);
assert.match(workspace, /ap_route_window/);

const boundedIndex = loader.indexOf('visual-aperture-bounded-runtime.js');
const mountIndex = loader.indexOf('visual-aperture-part-11.js');
const addressIndex = loader.indexOf('visual-aperture-bounded-address-runtime.js');
assert.ok(boundedIndex >= 0 && mountIndex > boundedIndex, 'bounded renderer must load before the mount script');
assert.ok(addressIndex > mountIndex, 'bounded address restoration must load after snapshot functions exist');
assert.match(loader, /visual-aperture-export-preview-runtime\.js/);
assert.match(loader, /visual-aperture-windowing\.mjs/);

assert.match(boundedRuntime, /data-ap-action="overview-next"/);
assert.match(boundedRuntime, /data-ap-action="route-window-next"/);
assert.match(boundedRuntime, /paginateApertureRows/);
assert.match(boundedRuntime, /windowApertureRoute/);
assert.match(boundedRuntime, /max_visible_steps/);
assert.match(boundedRuntime, /complete_path_retained:\s*true/);
assert.match(addressRuntime, /overview:\s*\{/);
assert.match(addressRuntime, /windowStart/);

assert.match(exportRuntime, /function handleExportAction/);
assert.match(exportPreview, /boundedOriginalHandleExportAction = handleExportAction/);
assert.match(exportPreview, /handleExportAction = function boundedHandleExportAction/);
assert.doesNotMatch(exportPreview, /handlePublicationExportAction|currentPublicationPacket|setPublicationExportStatus/);
assert.match(exportModel, /bounded_rendering_is_not_data_deletion:\s*true/);
assert.match(exportModel, /complete path is retained in this packet/i);
assert.match(exportModel, /the export retains every row/i);
assert.match(exportPreview, /APERTURE_EXPORT_PREVIEW_ROW_LIMIT = 100/);
assert.match(exportPreview, /Print packet expands the full table only for printing/);
assert.match(exportPreview, /complete:\s*true/);

assert.match(boundedCss, /\.aperture-overview-pagination/);
assert.match(boundedCss, /\.aperture-route-window-controls/);

for (const file of [
  'visual-aperture-windowing.mjs',
  'visual-aperture-bounded-runtime.js',
  'visual-aperture-bounded-address-runtime.js',
  'visual-aperture-export-preview-runtime.js',
  'visual-aperture-bounded.css'
]) assert.match(standalone, new RegExp(file.replaceAll('.', '\\.')));

console.log('visual-aperture-bounded-contract.test.js: OK');
