#!/usr/bin/env python3
import hashlib
import json
import shutil
import sys
import zipfile
from pathlib import Path

if len(sys.argv) != 4:
    raise SystemExit('usage: materialize.py <artifact.zip> <worktree> <receipt.json>')

archive = Path(sys.argv[1]).resolve()
work = Path(sys.argv[2]).resolve()
receipt_path = Path(sys.argv[3]).resolve()

EXPECTED_ZIP_SHA256 = '515a903ae7c469a5474a4217b550dd54837386be3d90f7a07bf5ebcdcca8707d'
EXPECTED_COMBINED_SHA256 = '4050d87608fb8e9592432c59c321289a1845b4e027926c391a50c57bc20a3732'
EXPECTED_RESEARCH_HEAD = 'e6bf637f99e22fdb9ec9b5c86f9d9a611219a5d7'
EXPECTED_MAIN_HEAD = 'b9c754ba2a44dbb48d29bb0fe6b33821a81ba925'
EXPECTED_PATHS = [
    'data/project/ssc-residual-wave02/closures/RD-06-C01.json',
    'data/research/status-sovereignty-rd-wave02-rd06-offeror-universe/class-receipt.json',
    'data/research/status-sovereignty-rd-wave02-rd06-offeror-universe/manifest.json',
    'docs/milestones/ssc-rd-wave02-rd06-offeror-universe.md',
    'test/status-sovereignty-rd-wave02-rd06-offeror-universe.test.js',
    'tools/build-status-sovereignty-rd-wave02-rd06-offeror-universe.mjs',
    'tools/validate-status-sovereignty-rd-wave02-rd06-offeror-universe.mjs',
]

archive_sha = hashlib.sha256(archive.read_bytes()).hexdigest()
if archive_sha != EXPECTED_ZIP_SHA256:
    raise SystemExit(f'artifact ZIP digest mismatch: {archive_sha}')

with zipfile.ZipFile(archive) as zf:
    names = sorted(zf.namelist())
    expected_names = sorted(EXPECTED_PATHS + ['manifest.json'])
    if names != expected_names:
        raise SystemExit(f'artifact member mismatch: {names}')

    manifest = json.loads(zf.read('manifest.json'))
    assert manifest['schema_version'] == 'ssc-rd06-wave02-fourth-closure-export@2'
    assert manifest['research_head'] == EXPECTED_RESEARCH_HEAD
    assert manifest['main_head'] == EXPECTED_MAIN_HEAD
    assert manifest['entry_count'] == 7
    assert manifest['combined_sha256'] == EXPECTED_COMBINED_SHA256
    assert manifest['atlas_before'] == {'open': 39, 'closed': 3}
    assert manifest['atlas_after'] == {'open': 38, 'closed': 4}
    assert manifest['terminal_state'] == 'bounded_source_restricted'
    assert manifest['class_closed'] is True
    assert manifest['proposal_slots'] == 8
    assert manifest['terminal_slots'] == 8
    assert manifest['outside_human_dependency'] is False
    assert manifest['external_contacts'] == 0
    assert manifest['external_reviews'] == 0
    assert manifest['publication_effect'] == 'none'
    assert manifest['adoption_effect'] == 'none'
    assert manifest['graph_effect'] == 'none'

    entries = manifest['entries']
    if [row['path'] for row in entries] != sorted(EXPECTED_PATHS):
        raise SystemExit('manifest entry order or denominator changed')

    for row in entries:
        data = zf.read(row['path'])
        if len(data) != row['bytes']:
            raise SystemExit(f"byte count mismatch: {row['path']}")
        digest = hashlib.sha256(data).hexdigest()
        if digest != row['sha256']:
            raise SystemExit(f"entry digest mismatch: {row['path']}")

    combined = hashlib.sha256(
        '\n'.join(f"{row['sha256']}  {row['path']}" for row in entries).encode()
    ).hexdigest()
    if combined != EXPECTED_COMBINED_SHA256:
        raise SystemExit(f'combined digest mismatch: {combined}')

    for row in entries:
        destination = work / row['path']
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(zf.read(row['path']))

closure = json.loads((work / EXPECTED_PATHS[0]).read_text())
class_receipt = json.loads((work / EXPECTED_PATHS[1]).read_text())
product_manifest = json.loads((work / EXPECTED_PATHS[2]).read_text())

effect = closure['residual_atlas_effect_if_promoted_after_rd04_rd05_and_rd01']
assert effect == {
    'canonical_classes': 42,
    'open_before': 39,
    'closed_before': 3,
    'open_after': 38,
    'closed_after': 4,
}
assert closure['terminal_state'] == 'bounded_source_restricted'
assert closure['class_closed'] is True
assert closure['product']['manifest_combined_sha256'] == '2a17904180dac7b250e2b0ffb82e8124354e89c39be267b0f4c4ebe65c6516c5'
assert class_receipt['terminal_state'] == 'bounded_source_restricted'
assert class_receipt['class_closed'] is True
assert class_receipt['counts']['proposal_slots'] == 8
assert class_receipt['counts']['identity_and_disposition_terminal_slots'] == 8
assert product_manifest['combined_sha256'] == '2a17904180dac7b250e2b0ffb82e8124354e89c39be267b0f4c4ebe65c6516c5'

receipt = {
    'schema_version': 'ssc-rd06-wave02-fourth-closure-materialization@2',
    'artifact_id': 8873907444,
    'artifact_zip_sha256': archive_sha,
    'artifact_combined_sha256': combined,
    'source_research_head': EXPECTED_RESEARCH_HEAD,
    'source_main_head': EXPECTED_MAIN_HEAD,
    'changed_paths': EXPECTED_PATHS,
    'changed_path_count': 7,
    'transport_paths_in_product': 0,
    'terminal_state': class_receipt['terminal_state'],
    'class_closed': class_receipt['class_closed'],
    'proposal_slots': class_receipt['counts']['proposal_slots'],
    'terminal_slots': class_receipt['counts']['identity_and_disposition_terminal_slots'],
    'product_manifest_sha256': product_manifest['combined_sha256'],
    'atlas_before': {'open': 39, 'closed': 3},
    'atlas_after': {'open': 38, 'closed': 4},
    'outside_human_dependency': False,
    'external_contacts': 0,
    'external_reviews': 0,
    'publication_effect': 'none',
    'adoption_effect': 'none',
    'graph_effect': 'none',
}
receipt_path.parent.mkdir(parents=True, exist_ok=True)
receipt_path.write_text(json.dumps(receipt, indent=2) + '\n')
print(json.dumps(receipt, indent=2))
