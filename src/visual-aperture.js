import * as core from './visual-aperture-core.mjs';

Object.assign(globalThis, core);

const partUrls = [
  './visual-aperture-part-1.js',
  './visual-aperture-part-2.js',
  './visual-aperture-part-3.js',
  './visual-aperture-part-4.js'
];

for (const relativeUrl of partUrls) {
  await new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = new URL(relativeUrl, import.meta.url).href;
    script.async = false;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`failed to load ${relativeUrl}`));
    document.head.append(script);
  });
}
