#!/usr/bin/env python3
from __future__ import annotations

import base64
import gzip
import hashlib
import os
import re
import subprocess
from pathlib import Path

SOURCE_COMMIT = '7bf6b8f6efe8ee5f377713ef8c2df7b46542c218'
SOURCE_PATH = '.tmp/rd04-nd-fy2026-two-cell-promotion-materializer-v1/materialize.py'
SOURCE_BLOB = 'b756c7bfc6b6d8516d4bafc19acb9ea80bf5daa9'
SOURCE_RAW_BYTES = 50180
SOURCE_RAW_SHA256 = '860549fad2b09eafe866a8ae81620a132d208bdf14923ca8285acc1906019a34'
PATCHED_RAW_BYTES = 58459
PATCHED_RAW_SHA256 = 'fee0fe05030b6ea85f09a30b9e5538dcd723fa8934de150e8d2d9bf1b670bb75'


def git_blob_sha(data: bytes) -> str:
    return hashlib.sha1(f'blob {len(data)}\0'.encode() + data).hexdigest()


def replace_exact(text: str, old: str, new: str, count: int = 1) -> str:
    actual = text.count(old)
    if actual != count:
        raise AssertionError(f'patch preimage count mismatch for {old[:80]!r}: {actual} != {count}')
    return text.replace(old, new)


def recover_source_wrapper() -> bytes:
    local = os.environ.get('RD04_CONTROLLER_SOURCE_PATH')
    if local:
        return Path(local).read_bytes()
    return subprocess.check_output(['git', 'show', f'{SOURCE_COMMIT}:{SOURCE_PATH}'])


wrapper = recover_source_wrapper()
if os.environ.get('RD04_CONTROLLER_SOURCE_PATH') is None:
    assert git_blob_sha(wrapper) == SOURCE_BLOB
wrapper_text = wrapper.decode('utf-8')
match = re.search(r'_PAYLOAD\s*=\s*"""([A-Za-z0-9+/=\r\n]+)"""', wrapper_text)
if not match:
    raise AssertionError('source payload not found')
raw = gzip.decompress(base64.b64decode(match.group(1)))
assert len(raw) == SOURCE_RAW_BYTES
assert hashlib.sha256(raw).hexdigest() == SOURCE_RAW_SHA256
s = raw.decode('utf-8')

needle = "CURRENT_PROOF_SHA256 = '4b9ab6dee1795defb63e55c4bf9a8616a11c33413264684aaaa7467848323af8'\n"
insert = needle + """
VALIDATION_PARENT = '5be5fc4d15391b99bb29226fdd16e408be559507'
VALIDATION_HEAD = '32d572d9302677ab45280a1f9b0b72a87429eae0'
VALIDATION_RUN = 31333502110
VALIDATION_ARTIFACT_ID = 9043612271
VALIDATION_ARTIFACT_BYTES = 9104
VALIDATION_ARTIFACT_SHA256 = '7c4bf8442b79e4721d2170216df59ce6a697357339403f40062e5e709121ccf5'
VALIDATION_RECEIPT_SHA256 = '9bac2c230df607228a3a7b0b6314370a9a0e89274d72a2ed879f1f6a75121261'
VALIDATION_PROTOCOL_SHA256 = '14c36b0a370c16d5384679861f08c03e9f5402e46ee0d747a81229fbf4f12729'
VALIDATION_LEDGER_SHA256 = '92e1e158b3b786cf8266863da28da47291ea6b79d292626012f9a9af065cc20c'
VALIDATION_ZIP = Path(os.environ['VALIDATION_ZIP']).resolve()
"""
s = replace_exact(s, needle, insert)

needle = "    return receipt, source, field, row, proof, extracted\n\n\ndef make_builder() -> str:\n"
verifier = r'''    return receipt, source, field, row, proof, extracted


def verify_validation_artifact() -> tuple[dict[str, Any], dict[str, Any], dict[str, Any], dict[str, Any], dict[str, Any], Path]:
    data = VALIDATION_ZIP.read_bytes()
    if len(data) != VALIDATION_ARTIFACT_BYTES:
        raise AssertionError(f'validation artifact byte mismatch: {len(data)}')
    if sha256_bytes(data) != VALIDATION_ARTIFACT_SHA256:
        raise AssertionError('validation artifact sha256 mismatch')
    extracted = OUT / 'validation-artifact'
    extracted.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(VALIDATION_ZIP) as zf:
        bad = zf.testzip()
        if bad:
            raise AssertionError(f'validation artifact zip failure: {bad}')
        zf.extractall(extracted)
    sums = (extracted / 'SHA256SUMS').read_text(encoding='utf-8').splitlines()
    if len(sums) != 14:
        raise AssertionError(f'validation checksum row mismatch: {len(sums)}')
    for line in sums:
        digest, name = line.split(None, 1)
        name = name.strip().lstrip('*')
        path = extracted / name
        if not path.is_file() or sha256_bytes(path.read_bytes()) != digest:
            raise AssertionError(f'validation internal checksum mismatch: {name}')
    expected = {
        'receipt.json': VALIDATION_RECEIPT_SHA256,
        'validated-candidate-protocol.json': VALIDATION_PROTOCOL_SHA256,
        'validation-ledger.json': VALIDATION_LEDGER_SHA256,
        'validated-target-candidate.json': FIELD_SHA256,
        'validated-row-candidate.json': ROW_SHA256,
    }
    for name, digest in expected.items():
        if sha256_bytes((extracted / name).read_bytes()) != digest:
            raise AssertionError(f'exact validation object mismatch: {name}')
    receipt = read_json(extracted / 'receipt.json')
    protocol = read_json(extracted / 'validated-candidate-protocol.json')
    target = read_json(extracted / 'validated-target-candidate.json')
    row = read_json(extracted / 'validated-row-candidate.json')
    ledger = read_json(extracted / 'validation-ledger.json')
    assert receipt['schema_version'] == 'ssc-rd04-nd-fy2026-fixed-protocol-candidate-validation-receipt@1'
    assert receipt['state'] == 'exact_current_two_candidate_validation_complete'
    assert receipt['validation_parent'] == VALIDATION_PARENT == CARRIER_PARENT
    assert receipt['candidate_artifact_id'] == CANDIDATE_ARTIFACT_ID
    assert receipt['candidate_artifact_sha256'] == CANDIDATE_ARTIFACT_SHA256
    assert receipt['matrix_blob'] == MATRIX_BLOB
    assert receipt['validated_candidate_count'] == 2 and receipt['rejected_candidate_count'] == 0
    assert receipt['promotion_effect_authorized_here'] is False
    assert receipt['separate_promotion_product_authorized'] is True
    projection = receipt['projected_separate_promotion']
    assert projection['counts'] == {
        'class_closed': False,
        'materialized_cells': 450,
        'still_open_cells': 221,
        'still_open_substantive_cells': 182,
        'terminal_cells': 229,
        'terminal_substantive_cells': 118,
        'terminal_units': 11,
    }
    assert projection['effects'] == {
        'field_terminalizations': 1,
        'matrix_updates': 2,
        'row_state_mutations': 1,
        'row_terminalizations': 1,
    }
    assert protocol['schema_version'] == 'ssc-rd04-nd-fy2026-fixed-protocol-validated-candidate-protocol@1'
    assert protocol['validation_parent'] == VALIDATION_PARENT
    assert protocol['candidate_artifact_id'] == CANDIDATE_ARTIFACT_ID
    assert protocol['candidate_artifact_sha256'] == CANDIDATE_ARTIFACT_SHA256
    assert protocol['separate_promotion_product_authorized'] is True
    assert protocol['required_transition_effects'] == projection['effects']
    assert protocol['required_projected_counts'] == projection['counts']
    assert protocol['required_row_after'] == {
        'open_fields': 0,
        'row_state': 'terminal',
        'terminal_fields': 9,
        'unit_id': 'US-STATE-ND',
    }
    assert ledger['validation_parent'] == VALIDATION_PARENT
    assert ledger['candidate_artifact']['id'] == CANDIDATE_ARTIFACT_ID
    assert ledger['candidate_artifact']['sha256'] == CANDIDATE_ARTIFACT_SHA256
    assert ledger['validated_candidate_count'] == 2 and ledger['rejected_candidate_count'] == 0
    assert ledger['projected_separate_promotion_effects'] == projection['effects']
    assert ledger['projected_separate_promotion_counts'] == projection['counts']
    return receipt, protocol, target, row, ledger, extracted


def make_builder() -> str:
'''
s = replace_exact(s, needle, verifier)

needle = "assert.equal(input.candidate_custody.row_closure_candidate_sha256, {json.dumps(ROW_SHA256)});\n"
insert = needle + """assert.equal(input.validation_custody.artifact_id, {VALIDATION_ARTIFACT_ID});
assert.equal(input.validation_custody.artifact_zip_sha256, {json.dumps(VALIDATION_ARTIFACT_SHA256)});
assert.equal(input.validation_custody.receipt_sha256, {json.dumps(VALIDATION_RECEIPT_SHA256)});
assert.equal(input.validation_custody.validated_candidate_protocol_sha256, {json.dumps(VALIDATION_PROTOCOL_SHA256)});
assert.equal(input.validation_custody.validation_ledger_sha256, {json.dumps(VALIDATION_LEDGER_SHA256)});
assert.equal(input.validation_custody.validated_candidate_protocol.required_transition_effects.matrix_updates, 2);
"""
s = replace_exact(s, needle, insert, count=2)

needle = "    receipt, source, field, row_candidate, proof, extracted = verify_artifact()\n"
insert = needle + """    validation_receipt, validation_protocol, validation_target, validation_row, validation_ledger, validation_extracted = verify_validation_artifact()
    if validation_target != field:
        raise AssertionError('validated target candidate differs from candidate artifact')
    if validation_row != row_candidate:
        raise AssertionError('validated row candidate differs from candidate artifact')
"""
s = replace_exact(s, needle, insert)

needle = """            'candidate_custody': {
                'run_id': CANDIDATE_RUN, 'artifact_id': CANDIDATE_ARTIFACT_ID, 'artifact_bytes': CANDIDATE_ARTIFACT_BYTES, 'artifact_zip_sha256': CANDIDATE_ARTIFACT_SHA256,
                'receipt_sha256': RECEIPT_SHA256, 'source_adjudication_sha256': SOURCE_SHA256, 'field_adjudication_sha256': FIELD_SHA256, 'row_closure_candidate_sha256': ROW_SHA256, 'current_cell_proof_sha256': CURRENT_PROOF_SHA256,
                'receipt': receipt, 'source_adjudication': source, 'field_adjudication': field, 'row_closure_candidate': row_candidate, 'current_cell_proof': proof,
            },
"""
insert = needle + """            'validation_custody': {
                'validation_parent': VALIDATION_PARENT, 'validation_head': VALIDATION_HEAD,
                'run_id': VALIDATION_RUN, 'artifact_id': VALIDATION_ARTIFACT_ID, 'artifact_bytes': VALIDATION_ARTIFACT_BYTES, 'artifact_zip_sha256': VALIDATION_ARTIFACT_SHA256,
                'receipt_sha256': VALIDATION_RECEIPT_SHA256, 'validated_candidate_protocol_sha256': VALIDATION_PROTOCOL_SHA256, 'validation_ledger_sha256': VALIDATION_LEDGER_SHA256,
                'validated_target_candidate_sha256': FIELD_SHA256, 'validated_row_candidate_sha256': ROW_SHA256,
                'receipt': validation_receipt, 'validated_candidate_protocol': validation_protocol, 'validation_ledger': validation_ledger,
            },
"""
s = replace_exact(s, needle, insert)

s = s.replace("matrix_updates: 1, row_state_mutations: 1", "matrix_updates: 2, matrix_files_updated: 1, row_state_mutations: 1")
s = s.replace("'matrix_updates': 1, 'row_state_mutations': 1", "'matrix_updates': 2, 'matrix_files_updated': 1, 'row_state_mutations': 1")
s = replace_exact(s, "assert.equal(summary.effects.matrix_updates, 1);", "assert.equal(summary.effects.matrix_updates, 2);\nassert.equal(summary.effects.matrix_files_updated, 1);")

s = s.replace(
    "'schema_version': 'ssc-rd04-nd-fy2026-fixed-protocol-two-cell-promotion-materializer-receipt@1',",
    "'schema_version': 'ssc-rd04-nd-fy2026-fixed-protocol-two-cell-promotion-materializer-receipt@2',",
)
needle = """            'candidate_artifact_id': CANDIDATE_ARTIFACT_ID, 'candidate_artifact_sha256': CANDIDATE_ARTIFACT_SHA256,
            'field_candidate_sha256': FIELD_SHA256, 'row_candidate_sha256': ROW_SHA256,
"""
insert = """            'candidate_artifact_id': CANDIDATE_ARTIFACT_ID, 'candidate_artifact_sha256': CANDIDATE_ARTIFACT_SHA256,
            'validation_artifact_id': VALIDATION_ARTIFACT_ID, 'validation_artifact_sha256': VALIDATION_ARTIFACT_SHA256,
            'validation_receipt_sha256': VALIDATION_RECEIPT_SHA256, 'validated_candidate_protocol_sha256': VALIDATION_PROTOCOL_SHA256, 'validation_ledger_sha256': VALIDATION_LEDGER_SHA256,
            'field_candidate_sha256': FIELD_SHA256, 'row_candidate_sha256': ROW_SHA256,
"""
s = replace_exact(s, needle, insert)

needle = """        for name in ['receipt.json', 'source-adjudication.json', 'field-adjudication.json', 'row-closure-candidate.json', 'current-cell-proof.json']:
            shutil.copy2(extracted / name, OUT / f'candidate-{name}')
"""
insert = needle + """        for name in ['receipt.json', 'validated-candidate-protocol.json', 'validation-ledger.json', 'validated-target-candidate.json', 'validated-row-candidate.json']:
            shutil.copy2(validation_extracted / name, OUT / f'validation-{name}')
"""
s = replace_exact(s, needle, insert)

s = replace_exact(
    s,
    "'source_requests': 0, 'route_executions': 0, 'field_terminalizations': 0, 'matrix_updates': 0,\n            'row_state_mutations'",
    "'source_requests': 0, 'route_executions': 0, 'field_terminalizations': 0, 'matrix_updates': 0, 'matrix_files_updated': 0,\n            'row_state_mutations'",
)

assert "matrix_updates: 1" not in s
assert "'matrix_updates': 1" not in s
assert 'verify_validation_artifact' in s
assert 'validation_custody' in s
patched = s.encode('utf-8')
assert len(patched) == PATCHED_RAW_BYTES
assert hashlib.sha256(patched).hexdigest() == PATCHED_RAW_SHA256
exec(compile(patched, '<rd04-two-cell-materializer-v2>', 'exec'), {'__name__': '__main__', '__file__': __file__})
