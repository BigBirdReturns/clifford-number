#!/usr/bin/env node
import fs from 'node:fs';
import {
  canonicalizeGenesisV1,
  deriveGenesisProvenanceId,
  deriveGenesisSpanId,
  recomputeGenesisClaimId,
  recomputeGenesisEntityId
} from './lib/axm-genesis-identity-v1.mjs';

const fixturePath = process.argv[2] ?? 'data/project/axm-genesis-v1-identity-vectors.json';
const vectors = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

const output = {
  schema_version: 'axm-genesis-identity-runtime-results@1',
  canonicalization: vectors.canonicalization.map(item => {
    try {
      return { input: item.input, result: canonicalizeGenesisV1(item.input) };
    } catch {
      return { input: item.input, error: 'ValueError' };
    }
  }),
  entity_ids: vectors.entity_ids.map(item => ({
    namespace: item.namespace,
    label: item.label,
    id: recomputeGenesisEntityId(item.namespace, item.label)
  })),
  claim_ids: vectors.claim_ids.map(item => ({
    subject: item.subject,
    predicate: item.predicate,
    object: item.object,
    object_type: item.object_type,
    id: recomputeGenesisClaimId(item.subject, item.predicate, item.object, item.object_type)
  })),
  provenance_ids: vectors.provenance_ids.map(item => ({
    claim_id: item.claim_id,
    source_hash: item.source_hash,
    byte_start: item.byte_start,
    byte_end: item.byte_end,
    id: deriveGenesisProvenanceId(item.claim_id, item.source_hash, item.byte_start, item.byte_end)
  })),
  span_ids: vectors.span_ids.map(item => ({
    source_hash: item.source_hash,
    byte_start: item.byte_start,
    byte_end: item.byte_end,
    text: item.text,
    id: deriveGenesisSpanId(item.source_hash, item.byte_start, item.byte_end, item.text)
  }))
};

process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
