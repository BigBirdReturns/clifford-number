import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCoreThesis } from './build-core-thesis.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

export function validateCoreThesis() {
  const errors = [];
  let data;
  try {
    data = buildCoreThesis({ write: false });
  } catch (error) {
    return [`core thesis compilation failed: ${error.message}`];
  }

  const expected = [
    ['build/core-thesis/manifest.json', 'clifford-core-thesis-manifest@1'],
    ['build/core-thesis/data.json', data.thesis.thesis_id],
    ['reports/core-thesis/data.json', data.thesis.thesis_id],
    ['reports/core-thesis/index.html', data.thesis.short_form]
  ];

  for (const [relative, marker] of expected) {
    const file = path.join(root, relative);
    if (!fs.existsSync(file)) {
      errors.push(`${relative}: missing generated product`);
      continue;
    }
    const text = fs.readFileSync(file, 'utf8');
    if (!text.includes(marker)) errors.push(`${relative}: missing marker ${marker}`);
  }

  const manifestPath = path.join(root, 'build', 'core-thesis', 'manifest.json');
  if (fs.existsSync(manifestPath)) {
    const committed = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const expectedManifest = data.manifest;
    if (JSON.stringify(committed) !== JSON.stringify(expectedManifest)) {
      errors.push('build/core-thesis/manifest.json: deterministic manifest drift');
    }
  }

  const htmlPath = path.join(root, 'reports', 'core-thesis', 'index.html');
  if (fs.existsSync(htmlPath)) {
    const html = fs.readFileSync(htmlPath, 'utf8');
    for (const marker of [
      'Five overlapping post-Cold War phases',
      'From problem framing to reversibility',
      'Intentionality ladder',
      'Twenty-four estates under one falsifiable grammar',
      'Seven report contracts',
      'Interpretation boundary'
    ]) {
      if (!html.includes(marker)) errors.push(`reports/core-thesis/index.html: missing ${marker}`);
    }
    if (!html.includes('graph_effect: none')) errors.push('reports/core-thesis/index.html: graph boundary missing');
    if (!html.includes('conclusion_generated: false')) errors.push('reports/core-thesis/index.html: conclusion boundary missing');
  }

  return errors;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const errors = validateCoreThesis();
  if (errors.length) {
    console.error(errors.join('\n'));
    process.exit(1);
  }
  console.log('core thesis validation passed');
}
