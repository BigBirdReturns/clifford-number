import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  ACQUISITION_ID,
  DEFAULT_OUTPUT_ROOT,
  FINALIZATION_SCHEMA,
} from './electric-twin-register-request-core.mjs';
import {
  PDF_RENDERER_ID,
  renderTextPdf,
} from './deterministic-text-pdf.mjs';

export const PDF_RENDERING_SCHEMA = 'electric-twin-register-request-pdf-rendering@1';
export const SOURCE_MANIFEST_NAME = 'outbound-source-manifest.json';
export const PDF_MANIFEST_NAME = 'outbound-pdf-manifest.json';
export const SOURCE_FILES = Object.freeze([
  {
    source: 'statutory-register-of-members-request.txt',
    pdf: 'statutory-register-of-members-request.pdf',
    channel: 'statutory_register_request',
  },
  {
    source: 'voluntary-transaction-instrument-request.txt',
    pdf: 'voluntary-transaction-instrument-request.pdf',
    channel: 'voluntary_transaction_instrument_request',
  },
]);

function normalizeRelative(filePath) {
  return path.relative(process.cwd(), path.resolve(filePath)).replaceAll('\\', '/');
}

function isWithin(relativePath, root) {
  return relativePath === root || relativePath.startsWith(`${root}/`);
}

function assertNoSymlinkComponents(filePath) {
  let current = path.resolve(filePath);
  const root = path.parse(current).root;
  while (current !== root) {
    if (fs.existsSync(current)) {
      assert.equal(fs.lstatSync(current).isSymbolicLink(), false, `symlink path component is not allowed: ${current}`);
    }
    current = path.dirname(current);
  }
}

function sha256(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function assertPrivateDirectory(directory) {
  const relative = normalizeRelative(directory);
  assert.ok(relative !== DEFAULT_OUTPUT_ROOT && isWithin(relative, DEFAULT_OUTPUT_ROOT),
    `source directory must be an immutable child of ignored ${DEFAULT_OUTPUT_ROOT}/: ${relative}`);
  assertNoSymlinkComponents(directory);
  assert.ok(fs.existsSync(directory), `source directory does not exist: ${relative}`);
  const stat = fs.statSync(directory);
  assert.ok(stat.isDirectory(), `source directory must be a directory: ${relative}`);
  assert.equal(stat.mode & 0o077, 0, `source directory must not be group- or world-accessible: ${relative}`);
  return relative;
}

function assertPrivateRegularFile(filePath, label) {
  assertNoSymlinkComponents(filePath);
  assert.ok(fs.existsSync(filePath), `${label} does not exist: ${normalizeRelative(filePath)}`);
  const stat = fs.statSync(filePath);
  assert.ok(stat.isFile(), `${label} must be a regular file: ${normalizeRelative(filePath)}`);
  assert.equal(stat.mode & 0o077, 0, `${label} must not be group- or world-readable: ${normalizeRelative(filePath)}`);
}

function readPrivateBytes(filePath, label) {
  assertPrivateRegularFile(filePath, label);
  return fs.readFileSync(filePath);
}

function verifiedSourceDescriptor(sourceDir, sourceManifest, definition) {
  const descriptors = sourceManifest.files.filter((row) => row.path === definition.source);
  assert.equal(descriptors.length, 1, `expected one source descriptor for ${definition.source}`);
  const descriptor = descriptors[0];
  assert.equal(descriptor.mime_type, 'text/plain; charset=utf-8', `${definition.source} has unexpected MIME type`);
  const sourcePath = path.join(sourceDir, definition.source);
  const bytes = readPrivateBytes(sourcePath, definition.source);
  assert.equal(bytes.length, descriptor.bytes, `${definition.source} byte length does not match source manifest`);
  assert.equal(sha256(bytes), descriptor.sha256, `${definition.source} SHA-256 does not match source manifest`);
  const text = bytes.toString('utf8');
  assert.equal(Buffer.from(text, 'utf8').equals(bytes), true, `${definition.source} must be canonical UTF-8`);
  assert.equal(/\[[^\]]+\]/u.test(text), false, `${definition.source} still contains a bracketed placeholder`);
  return { descriptor, sourcePath, bytes, text };
}

function validateSourceManifest(sourceManifest) {
  assert.equal(sourceManifest?.schema_version, FINALIZATION_SCHEMA, 'unexpected source-finalization schema');
  assert.equal(sourceManifest?.acquisition_id, ACQUISITION_ID, 'source-finalization acquisition_id mismatch');
  assert.equal(sourceManifest?.controls?.private_input_copied_to_output, false);
  assert.equal(sourceManifest?.controls?.requester_particulars_in_manifest, false);
  assert.equal(sourceManifest?.controls?.network_calls_performed, false);
  assert.equal(sourceManifest?.controls?.messages_sent, false);
  assert.equal(sourceManifest?.controls?.pdfs_rendered, false);
  assert.equal(sourceManifest?.controls?.postal_dispatch_performed, false);
  assert.equal(sourceManifest?.controls?.routing_email_sent, false);
  assert.equal(sourceManifest?.controls?.response_deadline_calculated, false);
  assert.equal(sourceManifest?.controls?.response_deadline, null);
  assert.equal(sourceManifest?.controls?.canonical_effect, 'none');
  assert.ok(Array.isArray(sourceManifest.files), 'source manifest files must be an array');
  assert.equal(sourceManifest.files.length, SOURCE_FILES.length, 'source manifest must contain exactly two request sources');
  return sourceManifest;
}

function privateWrite(filePath, bytes) {
  fs.writeFileSync(filePath, bytes, { mode: 0o600, flag: 'wx' });
  fs.chmodSync(filePath, 0o600);
}

function pdfDescriptor(definition, source, rendered) {
  return {
    path: definition.pdf,
    channel: definition.channel,
    mime_type: 'application/pdf',
    bytes: rendered.bytes.length,
    sha256: sha256(rendered.bytes),
    pages: rendered.pageCount,
    renderer: rendered.renderer,
    source: {
      path: definition.source,
      bytes: source.bytes.length,
      sha256: sha256(source.bytes),
    },
    layout: {
      page_size: 'A4',
      page_width_points: rendered.layout.page_width_points,
      page_height_points: rendered.layout.page_height_points,
      font: rendered.layout.font,
      font_size_points: rendered.layout.font_size_points,
      line_height_points: rendered.layout.line_height_points,
      max_characters_per_line: rendered.layout.max_characters_per_line,
      lines_per_page: rendered.layout.lines_per_page,
    },
  };
}

export function renderRequestPdfs({ sourceDir } = {}) {
  assert.equal(typeof sourceDir, 'string', '--source-dir is required');
  const sourceDirectory = path.resolve(sourceDir);
  const relativeSourceDirectory = assertPrivateDirectory(sourceDirectory);
  const sourceManifestPath = path.join(sourceDirectory, SOURCE_MANIFEST_NAME);
  const sourceManifestBytes = readPrivateBytes(sourceManifestPath, SOURCE_MANIFEST_NAME);
  const sourceManifest = validateSourceManifest(JSON.parse(sourceManifestBytes.toString('utf8')));

  const outputPaths = [
    ...SOURCE_FILES.map((definition) => path.join(sourceDirectory, definition.pdf)),
    path.join(sourceDirectory, PDF_MANIFEST_NAME),
  ];
  for (const outputPath of outputPaths) {
    assertNoSymlinkComponents(outputPath);
    assert.equal(fs.existsSync(outputPath), false, `refusing to overwrite existing PDF custody artifact: ${normalizeRelative(outputPath)}`);
  }

  const renderedRows = SOURCE_FILES.map((definition) => {
    const source = verifiedSourceDescriptor(sourceDirectory, sourceManifest, definition);
    const rendered = renderTextPdf(source.text);
    return { definition, source, rendered, descriptor: pdfDescriptor(definition, source, rendered) };
  });

  const manifest = {
    schema_version: PDF_RENDERING_SCHEMA,
    acquisition_id: ACQUISITION_ID,
    state: 'pdfs_rendered_not_dispatched',
    source_finalization: {
      directory: relativeSourceDirectory,
      manifest: SOURCE_MANIFEST_NAME,
      bytes: sourceManifestBytes.length,
      sha256: sha256(sourceManifestBytes),
      state: sourceManifest.state,
      finalized_at: sourceManifest.finalized_at,
      request_date: sourceManifest.request_date,
    },
    authorization: {
      finalization_record: sourceManifest.authorization.finalization_record,
      statutory_dispatch_authorized: sourceManifest.authorization.statutory_dispatch_authorized,
      statutory_dispatch_record: sourceManifest.authorization.statutory_dispatch_record,
      voluntary_dispatch_authorized: sourceManifest.authorization.voluntary_dispatch_authorized,
      voluntary_dispatch_record: sourceManifest.authorization.voluntary_dispatch_record,
    },
    renderer: {
      id: PDF_RENDERER_ID,
      deterministic: true,
      external_fonts: false,
      browser_runtime: false,
      creation_timestamp_embedded: false,
      source_text_embedded_as_winansi_courier: true,
    },
    files: renderedRows.map((row) => row.descriptor),
    controls: {
      source_files_verified_against_manifest: true,
      requester_particulars_in_manifest: false,
      pdfs_contain_requester_particulars: true,
      output_directory_private: true,
      network_calls_performed: false,
      messages_sent: false,
      dispatch_ready: false,
      pdfs_rendered: true,
      postal_dispatch_performed: false,
      routing_email_sent: false,
      response_deadline_calculated: false,
      response_deadline: null,
      canonical_effect: 'none',
    },
  };
  const manifestBytes = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  const created = [];

  try {
    for (const row of renderedRows) {
      const outputPath = path.join(sourceDirectory, row.definition.pdf);
      privateWrite(outputPath, row.rendered.bytes);
      created.push(outputPath);
    }
    const manifestPath = path.join(sourceDirectory, PDF_MANIFEST_NAME);
    privateWrite(manifestPath, manifestBytes);
    created.push(manifestPath);
  } catch (error) {
    for (const filePath of created) fs.rmSync(filePath, { force: true });
    throw error;
  }

  return {
    state: manifest.state,
    source_dir: relativeSourceDirectory,
    manifest_path: normalizeRelative(path.join(sourceDirectory, PDF_MANIFEST_NAME)),
    files: manifest.files,
    messages_sent: false,
    dispatch_ready: false,
  };
}
