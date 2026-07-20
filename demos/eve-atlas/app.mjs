import * as Core from './demo-core.mjs';
import { sampleData } from './sample-data.mjs';

globalThis.CliffordDemoCore = Object.freeze({ ...Core, sampleData });

for (const source of ['./app-part-1.js', './app-part-2.js', './app-part-3.js', './app-part-4.js', './app-part-5.js']) {
  await new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = source;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Failed to load ${source}`));
    document.head.append(script);
  });
}
