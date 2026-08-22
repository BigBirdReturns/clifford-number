#!/usr/bin/env python3
from __future__ import annotations

import pathlib
import sys


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected one match, found {count}")
    return text.replace(old, new, 1)


def replace_between(text: str, start: str, end: str, new: str, label: str) -> str:
    start_index = text.find(start)
    if start_index < 0:
        raise SystemExit(f"{label}: start marker missing")
    end_index = text.find(end, start_index)
    if end_index < 0:
        raise SystemExit(f"{label}: end marker missing")
    return text[:start_index] + new + text[end_index:]


def insert_after(text: str, anchor: str, addition: str, label: str) -> str:
    return replace_once(text, anchor, anchor + addition, label)


root = pathlib.Path(sys.argv[1]).resolve()
source_path = root / "tools/lib/industrial-exhaust-artifacts.mjs"
test_path = root / "test/industrial-exhaust-artifacts.test.js"
source = source_path.read_text(encoding="utf-8")
test = test_path.read_text(encoding="utf-8")

source_block = r'''function assertSha256Digest(value, label) {
  if (typeof value !== 'string' || !/^[a-f0-9]{64}$/u.test(value)) {
    throw new Error(`${label} must be a lowercase SHA-256 digest`);
  }
  return value;
}

function storedArtifactBodyRecord(record, id) {
  const title = record?.title ?? '';
  const description = record?.description ?? '';
  const normalizedText = record?.normalized_text ?? '';
  const publishedAt = record?.published_at ?? null;
  if (typeof title !== 'string' || typeof description !== 'string' || typeof normalizedText !== 'string') {
    throw new Error(`artifact revision ${id} has non-string projection text`);
  }
  if (publishedAt !== null && typeof publishedAt !== 'string') {
    throw new Error(`artifact revision ${id} has an invalid published_at value`);
  }
  const normalizedTextSha256 = record?.normalized_text_sha256;
  if (normalizedTextSha256 === null) {
    if (normalizedText !== '') {
      throw new Error(`artifact revision ${id} has normalized text without normalized_text_sha256`);
    }
  } else if (normalizedTextSha256 !== sha256(normalizedText)) {
    throw new Error(`artifact revision ${id} normalized_text_sha256 does not match normalized_text`);
  }
  return {
    title,
    description,
    normalized_text: normalizedText,
    normalized_text_sha256: normalizedTextSha256,
    published_at: publishedAt
  };
}

function validateDiscoveryRevisionRecord(record, id) {
  const sourceId = record?.source_id;
  const canonicalUrl = record?.canonical_url;
  const title = record?.title;
  if (typeof sourceId !== 'string' || !sourceId || typeof canonicalUrl !== 'string' || !canonicalUrl
    || typeof title !== 'string') {
    throw new Error(`discovery revision ${id} lacks canonical source content`);
  }
  const expectedRecordKey = sha256(`${sourceId}|${canonicalUrl}`);
  if (record.source_record_key !== expectedRecordKey) {
    throw new Error(`discovery revision ${id} source_record_key does not match source_id and canonical_url`);
  }
  const expectedContentSha256 = sha256({ canonical_url: canonicalUrl, title });
  if (record.content_sha256 !== expectedContentSha256) {
    throw new Error(`discovery revision ${id} content_sha256 does not match canonical discovery content`);
  }
  return {
    occurrencePrefix: 'xdiscover',
    occurrenceParts: [sourceId, expectedRecordKey],
    payloadDigest: expectedContentSha256,
    allowLegacyOccurrence: false,
    projectionContract: null
  };
}

function validateArtifactRevisionRecord(record, id) {
  const canonicalUrl = record?.canonical_url;
  if (typeof canonicalUrl !== 'string' || !canonicalUrl) {
    throw new Error(`artifact revision ${id} lacks canonical_url`);
  }
  const expectedRecordKey = sha256(canonicalUrl);
  if (record.artifact_record_key !== expectedRecordKey) {
    throw new Error(`artifact revision ${id} artifact_record_key does not match canonical_url`);
  }
  const bodyRecord = storedArtifactBodyRecord(record, id);
  const bodySha256 = assertSha256Digest(record?.body_sha256, `artifact revision ${id} body_sha256`);
  const projectionSha256 = assertSha256Digest(
    record?.projection_sha256,
    `artifact revision ${id} projection_sha256`
  );
  const legacyProjectionSha256 = sha256({ ...bodyRecord, body_sha256: bodySha256 });
  const currentProjectionSha256 = sha256(artifactProjectionIdentity({
    bodyRecord,
    bodySha256,
    contentType: record?.content_type
  }));
  let projectionContract;
  if (projectionSha256 === currentProjectionSha256) {
    projectionContract = 'current_projection';
  } else if (projectionSha256 === legacyProjectionSha256) {
    projectionContract = 'legacy_body_bound';
  } else {
    throw new Error(`artifact revision ${id} projection_sha256 does not match a supported projection contract`);
  }
  return {
    occurrencePrefix: 'xartifact',
    occurrenceParts: [expectedRecordKey],
    payloadDigest: projectionSha256,
    allowLegacyOccurrence: projectionContract === 'legacy_body_bound',
    projectionContract
  };
}

function validateRevisionLineage(records, { label, idName, keyNames, validateRecord }) {
  if (!Array.isArray(records)) throw new Error(`${label} revision lineage must be an array`);
  const byId = new Map();
  const byRevision = new Map();

  for (const record of records) {
    const id = record?.[idName];
    if (typeof id !== 'string' || !id) throw new Error(`${label} revision is missing ${idName}`);
    if (byId.has(id)) throw new Error(`duplicate ${label} occurrence id: ${id}`);

    const keyParts = keyNames.map(keyName => record?.[keyName]);
    if (keyParts.some(value => typeof value !== 'string' || !value)) {
      throw new Error(`${label} revision ${id} lacks stable identity`);
    }
    const lineageKey = stableJson(keyParts);
    const revisionNumber = record?.revision_number;
    if (!Number.isSafeInteger(revisionNumber) || revisionNumber < 1) {
      throw new Error(`${label} revision ${id} has an invalid revision_number`);
    }
    const revisionKey = stableJson([lineageKey, revisionNumber]);
    if (byRevision.has(revisionKey)) {
      throw new Error(`forked ${label} lineage at revision ${revisionNumber}: ${id}`);
    }

    const custody = validateRecord(record, id);
    const node = {
      id,
      lineageKey,
      revisionNumber,
      record,
      custody,
      occurrenceScheme: null
    };
    byId.set(id, node);
    byRevision.set(revisionKey, node);
  }

  for (const node of byId.values()) {
    const parentId = node.record.revision_of;
    if (node.revisionNumber === 1) {
      if (parentId !== null) {
        throw new Error(`${label} root ${node.id} must declare revision_of null`);
      }
      const expectedRootId = revisionOccurrenceId(
        node.custody.occurrencePrefix,
        node.custody.occurrenceParts,
        null,
        node.custody.payloadDigest
      );
      if (node.id !== expectedRootId) {
        throw new Error(`${label} root ${node.id} occurrence id does not match its canonical payload`);
      }
      node.occurrenceScheme = 'root';
      continue;
    }
    if (typeof parentId !== 'string' || !parentId) {
      throw new Error(`${label} revision ${node.id} is missing its predecessor`);
    }
    const parent = byId.get(parentId);
    if (!parent) {
      throw new Error(`${label} revision ${node.id} names a missing predecessor: ${parentId}`);
    }
    if (parent.lineageKey !== node.lineageKey) {
      throw new Error(`${label} revision ${node.id} crosses stable identity through revision_of`);
    }
    if (parent.revisionNumber !== node.revisionNumber - 1) {
      throw new Error(`${label} revision ${node.id} does not name its immediate predecessor`);
    }

    const expectedPredecessorBoundId = revisionOccurrenceId(
      node.custody.occurrencePrefix,
      node.custody.occurrenceParts,
      parentId,
      node.custody.payloadDigest
    );
    const expectedLegacyId = revisionOccurrenceId(
      node.custody.occurrencePrefix,
      node.custody.occurrenceParts,
      null,
      node.custody.payloadDigest
    );
    if (node.id === expectedPredecessorBoundId) {
      node.occurrenceScheme = 'predecessor_bound';
    } else if (node.custody.allowLegacyOccurrence && node.id === expectedLegacyId) {
      node.occurrenceScheme = 'legacy';
    } else if (node.custody.allowLegacyOccurrence) {
      throw new Error(`${label} revision ${node.id} occurrence id matches neither supported contract`);
    } else {
      throw new Error(`${label} revision ${node.id} must use a predecessor-bound occurrence id`);
    }
  }

  for (const node of byId.values()) {
    if (node.revisionNumber === 1) continue;
    const parent = byId.get(node.record.revision_of);
    if (parent.occurrenceScheme === 'predecessor_bound' && node.occurrenceScheme !== 'predecessor_bound') {
      throw new Error(`${label} revision ${node.id} may not return to a legacy occurrence contract`);
    }
    if (parent.custody.projectionContract === 'current_projection'
      && node.custody.projectionContract === 'legacy_body_bound') {
      throw new Error(`artifact revision ${node.id} may not return to the legacy projection contract`);
    }
  }

  return records;
}

export function validateDiscoveryRevisionLineage(records) {
  return validateRevisionLineage(records, {
    label: 'discovery',
    idName: 'discovery_id',
    keyNames: ['source_id', 'source_record_key'],
    validateRecord: validateDiscoveryRevisionRecord
  });
}

export function validateArtifactRevisionLineage(records) {
  return validateRevisionLineage(records, {
    label: 'artifact',
    idName: 'artifact_id',
    keyNames: ['artifact_record_key'],
    validateRecord: validateArtifactRevisionRecord
  });
}

'''
source = replace_between(
    source,
    "function validateRevisionLineage(records, { label, idName, keyNames }) {",
    "function normalizeDate(value) {",
    source_block,
    "source lineage validator",
)

test = replace_once(
    test,
    "import { matchWatchTerms } from '../tools/lib/industrial-exhaust.mjs';",
    "import { contentId, matchWatchTerms, sha256 } from '../tools/lib/industrial-exhaust.mjs';",
    "test imports",
)

discovery_custody_tests = r'''
assert.throws(
  () => validateDiscoveryRevisionLineage([{ ...discoveryA1, canonical_url: `${discoveryA1.canonical_url}-tampered` }]),
  /source_record_key does not match/u
);
assert.throws(
  () => validateDiscoveryRevisionLineage([{ ...discoveryA1, title: `${discoveryA1.title} tampered` }]),
  /content_sha256 does not match/u
);
assert.throws(
  () => validateDiscoveryRevisionLineage([{ ...discoveryA1, discovery_id: 'xdiscover_forged_occurrence' }]),
  /root .* occurrence id does not match/u
);
const legacyDiscoveryRevision = {
  ...discoveryB2,
  discovery_id: contentId(
    'xdiscover',
    discoveryB2.source_id,
    discoveryB2.source_record_key,
    discoveryB2.content_sha256
  )
};
assert.throws(
  () => validateDiscoveryRevisionLineage([discoveryA1, legacyDiscoveryRevision]),
  /must use a predecessor-bound occurrence id/u
);
'''
test = insert_after(
    test,
    "assert.equal(validateDiscoveryRevisionLineage(discoveryRepeatMerge.records), discoveryRepeatMerge.records);\n",
    discovery_custody_tests,
    "discovery custody tests",
)

old_discovery_cross = r'''assert.throws(
  () => validateDiscoveryRevisionLineage([
    discoveryA1,
    otherDiscoveryRoot,
    {
      ...discoveryB2,
      discovery_id: 'xdiscover_cross_lineage',
      source_record_key: otherDiscoveryRoot.source_record_key,
      revision_of: discoveryA1.discovery_id
    }
  ]),
  /crosses stable identity through revision_of/u
);
'''
new_discovery_cross = r'''const crossDiscoveryTitle = `${otherDiscoveryRoot.title} revised`;
const crossDiscoveryDigest = sha256({
  canonical_url: otherDiscoveryRoot.canonical_url,
  title: crossDiscoveryTitle
});
const crossDiscoveryRevision = {
  ...otherDiscoveryRoot,
  discovery_id: contentId(
    'xdiscover',
    otherDiscoveryRoot.source_id,
    otherDiscoveryRoot.source_record_key,
    discoveryA1.discovery_id,
    crossDiscoveryDigest
  ),
  title: crossDiscoveryTitle,
  content_sha256: crossDiscoveryDigest,
  revision_of: discoveryA1.discovery_id,
  revision_number: 2
};
assert.throws(
  () => validateDiscoveryRevisionLineage([
    discoveryA1,
    otherDiscoveryRoot,
    crossDiscoveryRevision
  ]),
  /crosses stable identity through revision_of/u
);
'''
test = replace_once(test, old_discovery_cross, new_discovery_cross, "discovery cross-lineage test")

old_legacy_projection = r'''const legacyProjectionArtifact = {
  ...artifactMerge.added,
  projection_sha256: 'f'.repeat(64)
};
'''
new_legacy_projection = r'''const legacyProjectionSha256 = sha256({
  title: artifactMerge.added.title ?? '',
  description: artifactMerge.added.description ?? '',
  normalized_text: artifactMerge.added.normalized_text ?? '',
  normalized_text_sha256: artifactMerge.added.normalized_text_sha256 ?? null,
  published_at: artifactMerge.added.published_at ?? null,
  body_sha256: artifactMerge.added.body_sha256
});
const legacyProjectionArtifact = {
  ...artifactMerge.added,
  artifact_id: contentId(
    'xartifact',
    artifactMerge.added.artifact_record_key,
    legacyProjectionSha256
  ),
  projection_sha256: legacyProjectionSha256
};
assert.equal(validateArtifactRevisionLineage([legacyProjectionArtifact]), [legacyProjectionArtifact]);
'''
test = replace_once(test, old_legacy_projection, new_legacy_projection, "legacy projection fixture")

legacy_transition_tests = r'''
const legacyChangedBodySha256 = '1'.repeat(64);
const legacyChangedBody = {
  title: projection.title,
  description: projection.description,
  normalized_text: changedText,
  normalized_text_sha256: sha256(changedText),
  published_at: projection.published_at
};
const legacyChangedProjectionSha256 = sha256({
  ...legacyChangedBody,
  body_sha256: legacyChangedBodySha256
});
const legacyRevisionArtifact = {
  ...legacyProjectionArtifact,
  ...legacyChangedBody,
  artifact_id: contentId(
    'xartifact',
    legacyProjectionArtifact.artifact_record_key,
    legacyChangedProjectionSha256
  ),
  body_sha256: legacyChangedBodySha256,
  projection_sha256: legacyChangedProjectionSha256,
  revision_of: legacyProjectionArtifact.artifact_id,
  revision_number: 2
};
assert.equal(
  validateArtifactRevisionLineage([legacyProjectionArtifact, legacyRevisionArtifact]).length,
  2,
  'historical body-bound artifact revisions must remain valid'
);

const currentSuccessorText = `${changedText} A current-contract successor changed again.`;
const legacyToCurrentMerge = mergeArtifactProjection({
  artifacts: [legacyProjectionArtifact, legacyRevisionArtifact],
  candidate,
  sourceProjection: {
    ...projection,
    normalized_text: currentSuccessorText,
    normalized_text_sha256: sha256(currentSuccessorText)
  },
  capturedAt: '2026-08-18T13:30:00.000Z',
  bodyReceiptPath: 'receipts/article-current-successor.json',
  bodySha256: '2'.repeat(64),
  responseHeaders: {
    content_type: 'text/html',
    etag: 'current-successor',
    last_modified: null,
    final_url: candidate.canonical_url,
    redirect_chain: [],
    watch_config: watchConfig
  }
});
assert.ok(legacyToCurrentMerge.added, 'a legacy lineage must accept one-way migration to the current projection contract');
assert.equal(legacyToCurrentMerge.added.revision_number, 3);
assert.equal(legacyToCurrentMerge.added.revision_of, legacyRevisionArtifact.artifact_id);
assert.equal(
  legacyToCurrentMerge.added.artifact_id,
  contentId(
    'xartifact',
    legacyToCurrentMerge.added.artifact_record_key,
    legacyRevisionArtifact.artifact_id,
    legacyToCurrentMerge.added.projection_sha256
  )
);
assert.equal(validateArtifactRevisionLineage(legacyToCurrentMerge.artifacts), legacyToCurrentMerge.artifacts);
'''
test = insert_after(
    test,
    "const changedText = `${projection.normalized_text} A substantive publisher statement changed.`;\n",
    legacy_transition_tests,
    "legacy transition tests",
)

artifact_custody_tests = r'''
assert.throws(
  () => validateArtifactRevisionLineage([{ ...artifactA1, canonical_url: `${artifactA1.canonical_url}-tampered` }]),
  /artifact_record_key does not match/u
);
assert.throws(
  () => validateArtifactRevisionLineage([{ ...artifactA1, normalized_text_sha256: '0'.repeat(64) }]),
  /normalized_text_sha256 does not match/u
);
assert.throws(
  () => validateArtifactRevisionLineage([{ ...artifactA1, projection_sha256: '0'.repeat(64) }]),
  /projection_sha256 does not match/u
);
assert.throws(
  () => validateArtifactRevisionLineage([{ ...artifactA1, artifact_id: 'xartifact_forged_occurrence' }]),
  /root .* occurrence id does not match/u
);
const legacyCurrentArtifactRevision = {
  ...artifactB2,
  artifact_id: contentId(
    'xartifact',
    artifactB2.artifact_record_key,
    artifactB2.projection_sha256
  )
};
assert.throws(
  () => validateArtifactRevisionLineage([artifactA1, legacyCurrentArtifactRevision]),
  /must use a predecessor-bound occurrence id/u
);
'''
test = insert_after(
    test,
    "assert.equal(validateArtifactRevisionLineage(semanticRepeatMerge.artifacts), semanticRepeatMerge.artifacts);\n",
    artifact_custody_tests,
    "artifact custody tests",
)

legacy_downgrade_test = r'''
const downgradeLegacyProjectionSha256 = sha256({
  title: artifactA3.title ?? '',
  description: artifactA3.description ?? '',
  normalized_text: artifactA3.normalized_text ?? '',
  normalized_text_sha256: artifactA3.normalized_text_sha256 ?? null,
  published_at: artifactA3.published_at ?? null,
  body_sha256: artifactA3.body_sha256
});
const legacyProjectionDowngrade = {
  ...artifactA3,
  artifact_id: contentId(
    'xartifact',
    artifactA3.artifact_record_key,
    artifactB2.artifact_id,
    downgradeLegacyProjectionSha256
  ),
  projection_sha256: downgradeLegacyProjectionSha256,
  revision_of: artifactB2.artifact_id,
  revision_number: 3
};
assert.throws(
  () => validateArtifactRevisionLineage([artifactA1, artifactB2, legacyProjectionDowngrade]),
  /may not return to the legacy projection contract/u
);
'''
test = insert_after(
    test,
    "const [artifactA1, artifactB2, artifactA3] = artifactLineage;\n",
    legacy_downgrade_test,
    "legacy projection downgrade test",
)

old_artifact_cross = r'''assert.throws(
  () => validateArtifactRevisionLineage([
    artifactA1,
    {
      ...artifactB2,
      artifact_id: 'xartifact_cross_lineage',
      artifact_record_key: 'artifact-record-key-other',
      revision_of: artifactA1.artifact_id
    }
  ]),
  /crosses stable identity through revision_of/u
);
'''
new_artifact_cross = r'''const crossArtifactCanonicalUrl = 'https://www.dentsu.com/news-releases/cross-lineage-artifact';
const crossArtifactRecordKey = sha256(crossArtifactCanonicalUrl);
const crossArtifactRevision = {
  ...artifactB2,
  artifact_id: contentId(
    'xartifact',
    crossArtifactRecordKey,
    artifactA1.artifact_id,
    artifactB2.projection_sha256
  ),
  artifact_record_key: crossArtifactRecordKey,
  canonical_url: crossArtifactCanonicalUrl,
  revision_of: artifactA1.artifact_id
};
assert.throws(
  () => validateArtifactRevisionLineage([
    artifactA1,
    crossArtifactRevision
  ]),
  /crosses stable identity through revision_of/u
);
'''
test = replace_once(test, old_artifact_cross, new_artifact_cross, "artifact cross-lineage test")

canonical_corpus_tests = r'''
const canonicalDiscoveryRecords = fs.readFileSync(
  new URL('../data/exhaust/discovery-observations.jsonl', import.meta.url),
  'utf8'
).trim().split(/\r?\n/u).map(line => JSON.parse(line));
const canonicalArtifactRecords = fs.readFileSync(
  new URL('../data/exhaust/artifacts.jsonl', import.meta.url),
  'utf8'
).trim().split(/\r?\n/u).map(line => JSON.parse(line));
assert.equal(
  validateDiscoveryRevisionLineage(canonicalDiscoveryRecords),
  canonicalDiscoveryRecords,
  'the canonical discovery corpus must satisfy record and lineage custody'
);
assert.equal(
  validateArtifactRevisionLineage(canonicalArtifactRecords),
  canonicalArtifactRecords,
  'the canonical artifact corpus must retain its historical projection and occurrence custody'
);

'''
test = replace_once(
    test,
    "console.log('industrial-exhaust artifact tests passed');",
    canonical_corpus_tests + "console.log('industrial-exhaust artifact tests passed');",
    "canonical corpus tests",
)

source_path.write_text(source, encoding="utf-8")
test_path.write_text(test, encoding="utf-8")
