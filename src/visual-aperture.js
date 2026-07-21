import * as core from './visual-aperture-core.mjs';
import * as addressState from './visual-aperture-state.mjs';
import * as workspaceModel from './visual-aperture-workspace.mjs';
import * as exportModel from './visual-aperture-export.mjs';
import * as windowingModel from './visual-aperture-windowing.mjs';

Object.assign(globalThis, core, addressState, workspaceModel, exportModel, windowingModel);

const RUNTIME_VERSION = '20260721-bounded-rendering';
const runtimeUrls = [
  `./visual-aperture-workspace-runtime.js?v=${RUNTIME_VERSION}`,
  `./visual-aperture-export-runtime.js?v=${RUNTIME_VERSION}`,
  ...Array.from({ length: 11 }, (_, index) => `./visual-aperture-part-${index + 1}.js?v=${RUNTIME_VERSION}`)
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
