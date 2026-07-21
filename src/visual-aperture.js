import * as core from './visual-aperture-core.mjs';
import * as addressState from './visual-aperture-state.mjs';

Object.assign(globalThis, core, addressState);

const partUrls = Array.from({ length: 11 }, (_, index) => `./visual-aperture-part-${index + 1}.js`);

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
