import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ARCHIVE_PATH, CUSTODY_PATH, DATA_DIR, DOC_PATH, MANIFEST_PATH, SUMS_PATH } from './build-schoolhouse-irs-historical-filing-website-screen-custody.mjs';
import { validateProduct } from './validate-schoolhouse-irs-historical-filing-website-screen-custody.mjs';

async function copyProduct(root) {
  for (const rel of [DATA_DIR, DOC_PATH]) {
    await cp(rel, path.join(root, rel), { recursive: true });
  }
}

async function expectRefusal(name, mutate) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'historical-website-custody-test-'));
  try {
    await copyProduct(root);
    await mutate(root);
    await assert.rejects(() => validateProduct(root), undefined, name);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function main() {
  await validateProduct();
  let refused = 0;

  await expectRefusal('sealed archive tamper', async (root) => {
    const target = path.join(root, ARCHIVE_PATH);
    const bytes = await readFile(target);
    bytes[100] ^= 1;
    await writeFile(target, bytes);
  });
  refused += 1;

  await expectRefusal('identity authority inflation', async (root) => {
    const target = path.join(root, CUSTODY_PATH);
    const value = JSON.parse(await readFile(target, 'utf8'));
    value.authority.identities_admitted = 1;
    await writeFile(target, `${JSON.stringify(value, null, 2)}\n`);
  });
  refused += 1;

  await expectRefusal('negative existence inflation', async (root) => {
    const target = path.join(root, CUSTODY_PATH);
    const value = JSON.parse(await readFile(target, 'utf8'));
    value.authority.negative_existence_claims_created = 1;
    await writeFile(target, `${JSON.stringify(value, null, 2)}\n`);
  });
  refused += 1;

  await expectRefusal('permanent path denominator drift', async (root) => {
    const target = path.join(root, MANIFEST_PATH);
    const value = JSON.parse(await readFile(target, 'utf8'));
    value.permanent_path_count = 9;
    await writeFile(target, `${JSON.stringify(value, null, 2)}\n`);
  });
  refused += 1;

  await expectRefusal('milestone absence overclaim', async (root) => {
    const target = path.join(root, DOC_PATH);
    const text = await readFile(target, 'utf8');
    await writeFile(target, text.replace('bounded result', 'proof of global absence'));
  });
  refused += 1;

  await expectRefusal('outer checksum deletion', async (root) => {
    const target = path.join(root, SUMS_PATH);
    const lines = (await readFile(target, 'utf8')).trimEnd().split('\n');
    await writeFile(target, `${lines.slice(0, -1).join('\n')}\n`);
  });
  refused += 1;

  console.log(`historical_filing_website_adversarial_refusals=${refused}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  });
}
