import * as core from './visual-aperture-core.mjs';
import * as addressState from './visual-aperture-state.mjs';
import * as workspaceModel from './visual-aperture-workspace.mjs';
import * as exportModel from './visual-aperture-export.mjs';
import * as windowingModel from './visual-aperture-windowing.mjs';
import * as timelineModel from './visual-aperture-timeline.mjs';
import * as social from './social-field.js';

Object.assign(globalThis, core, addressState, workspaceModel, exportModel, windowingModel, timelineModel);
// The pure social-field API (ledger field model, heat, ledger index) for the
// Field runtime, under one name so none of its exports collides with a runtime
// global (both the timeline model and the field module export rowInWindow).
globalThis.cliffordSocialField = social;

globalThis.loadCliffordSocialField = async () => {
  const [renderer, social] = await Promise.all([import('./atlas-webgl.js?v=20261108-field1'), import('./social-field.js')]);
  return { ...renderer, buildResearchNetworkModel: social.buildResearchNetworkModel, buildEcologyEventModel: social.buildEcologyEventModel, ecologyEventsForNode: social.ecologyEventsForNode, activeEcologyEvents: social.activeEcologyEvents, ecologyPlayheadLabel: social.ecologyPlayheadLabel };
};

const RUNTIME_VERSION = '20261108-field1';
const runtimeUrls = [
  `./visual-aperture-workspace-runtime.js?v=${RUNTIME_VERSION}`,
  `./visual-aperture-export-runtime.js?v=${RUNTIME_VERSION}`,
  ...Array.from({ length: 10 }, (_, index) => `./visual-aperture-part-${index + 1}.js?v=${RUNTIME_VERSION}`),
  `./visual-aperture-timeline-runtime.js?v=${RUNTIME_VERSION}`,
  `./visual-aperture-social-field-runtime.js?v=${RUNTIME_VERSION}`,
  `./visual-aperture-field-runtime.js?v=${RUNTIME_VERSION}`,
  `./visual-aperture-bounded-runtime.js?v=${RUNTIME_VERSION}`,
  `./visual-aperture-export-preview-runtime.js?v=${RUNTIME_VERSION}`,
  `./visual-aperture-part-11.js?v=${RUNTIME_VERSION}`,
  `./visual-aperture-bounded-address-runtime.js?v=${RUNTIME_VERSION}`
];

for (const relativeUrl of runtimeUrls) {
  await new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = new URL(relativeUrl, import.meta.url).href;
    script.async = false;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`failed to load ${relativeUrl}`));
    document.head.append(script);
  });
}
