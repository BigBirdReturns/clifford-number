#!/usr/bin/env python3
from pathlib import Path
import base64
import hashlib
import io
import json
import subprocess
import tarfile

QUALIFIED_PARENT = 'de0b6eede3c9561d9cd5728c198fc62263b67b6d'
PIECES = [
    ('payload.part-00', 2723, 'f8cfeabe732ec2fa0f36c081f16badd293e43008e4d186e2aa8cb9c5322cb794'),
    ('payload.part-01', 2723, '5c111a21a363c25a9e005ddf36470190bb7a70f406aa8504e82ffb9bfd6b44ca'),
    ('payload.part-02-00', 681, '1f114f0413ce8be65e3ce601f109cbb895caebcd9c3e42e079a946e225ca8313'),
    ('payload.part-02-01', 681, '75d7e4a717653887734e7753a543e18759d4f9a8be527071adc5dd22618effc6'),
    ('payload.part-02-02', 681, 'dbc76bff38dfe197129eb738b21348818443ccc37c0238136ce53bb4a40fa542'),
    ('payload.part-02-03', 680, '94f14591f65e0579bcb8ec4f148c08575818b846b0a04d7fc106f6c09641cff4'),
    ('payload.part-03', 2723, '0ec8bcb9e81329e5415d26d5da8991ed31fa9d7d9b37fe389d79cc86dddd5a00'),
    ('payload.part-04', 2723, '5a4f9592eae8123432f567d1a0d2dd19302c73c37ce65d7a137adcfeceb61e84'),
    ('payload.part-05', 2723, '9b50947544dbb2f3cf286cfaafa77c6445e4af5f530a9e2c04f8ff0f98199d99'),
    ('payload.part-06', 2723, 'a1686cc3e1685d8dd17216868a6c0948160a3b9bb9bed6552dd77362c49deec0'),
    ('payload.part-07', 2723, '9a45bdd94087fcc0e147504016ce3eb4ac8540c8e4a4a30d3d40e0f421a4e58d'),
]
EXPECTED_FILES = {
    'data/research/preference-custody/control-manifest-v38.json': (12153, '5e0d011fbd0129806d8ea5bccac096e5a602f57e53cd463fdeae7897ae023016'),
    'data/research/preference-custody/linkage-confidence-adjudication-assurance.fixture.json': (22839, 'bde1f9bbcfbf10bc3abc2510af4872f44df655e36148f880f52a50dad1900c82'),
    'docs/preference-custody-laboratory-floor-v38.md': (931, '2714e64a27b460bbfc6ba63fce3d27dfe479db705dbe20132ccc0af7f880a019'),
    'docs/preference-custody-linkage-confidence-adjudication-assurance.md': (929, '8349a4dc086ac1bfe88c301344439a9c59a5dcac792dcf8664239f99d38fee67'),
    'test/preference-custody-manifest-v38.test.js': (8166, 'df9ce7b351e5aa34aaf4ef611b12431149a37782d681cc2ceb0687992f30daf5'),
    'test/preference-linkage-confidence-adjudication-assurance.test.js': (9977, 'a75e9a164034fb37ebf0fdb706ffda3dcaf63a3d14a59b022a13e48e4b526de7'),
    'tools/compile-preference-custody-manifest-v38.mjs': (1706, '298e9f8f390aaa0421cacabc068a9fac5de3320339c4a0b3233e268d39fbe458'),
    'tools/compile-preference-linkage-confidence-adjudication-assurance.mjs': (1181, 'd8f58a255f5f1ad16031e53c8c5e87ec8bf0c4fe615a49d2063291ea5fe52f4d'),
    'tools/lib/preference-custody-manifest-v38.mjs': (20540, '66019565a6f7d94997ba07177b754b3b86a321f149caf8e0630627eb1e4827ef'),
    'tools/lib/preference-linkage-confidence-adjudication-assurance.mjs': (42703, 'c658a9a19c6ad624547fd2564ee126d4fe3141b12a5120cbda6c547e90aef84c'),
    'tools/validate-preference-custody-manifest-v38.mjs': (799, '1b6207ce70f1e0b3d55d9d3b8ca71c2713862076c2949086cf51e45bcbb53cc5'),
    'tools/validate-preference-linkage-confidence-adjudication-assurance.mjs': (991, '702998ea405faaa86a31962d392a44627d472d21b12125ff4b6166c6c250f5bb'),
}

normalized = []
observed_pieces = []
for name, size, required_sha in PIECES:
    path = Path('.pc40') / name
    text = ''.join(path.read_text().split())
    digest = hashlib.sha256(text.encode()).hexdigest()
    if len(text) != size or digest != required_sha:
        raise SystemExit(f'{name} mismatch: chars={len(text)} sha256={digest}')
    normalized.append(text)
    observed_pieces.append({'path': str(path), 'chars': len(text), 'sha256': digest})

part02 = ''.join(normalized[2:6])
part02_sha = hashlib.sha256(part02.encode()).hexdigest()
if len(part02) != 2723 or part02_sha != '219d35313b87a076f2002a8a3eba2e20425bfbf5f491c1d0902a7146b795d087':
    raise SystemExit(f'subdivided shard 02 mismatch: chars={len(part02)} sha256={part02_sha}')

encoded = ''.join(normalized)
aggregate_sha = hashlib.sha256(encoded.encode()).hexdigest()
if len(encoded) != 21784 or aggregate_sha != 'f2003caa535bc2c26df156a88de666885f4b7b1bf3ee3a280dac7d5abd7df474':
    raise SystemExit(f'aggregate mismatch: chars={len(encoded)} sha256={aggregate_sha}')
archive_bytes = base64.b64decode(encoded, validate=True)
archive_sha = hashlib.sha256(archive_bytes).hexdigest()
if len(archive_bytes) != 16336 or archive_sha != '21452c3235b534c37a49f26df2a95d5edaa16e10cc7beaf4f4aa894752c70d97':
    raise SystemExit(f'archive mismatch: bytes={len(archive_bytes)} sha256={archive_sha}')

with tarfile.open(fileobj=io.BytesIO(archive_bytes), mode='r:xz') as archive:
    members = archive.getmembers()
    if [member.name for member in members] != list(EXPECTED_FILES):
        raise SystemExit('archive path/order mismatch')
    for member in members:
        path = Path(member.name)
        if not member.isfile() or member.issym() or member.islnk() or path.is_absolute() or '..' in path.parts:
            raise SystemExit(f'unsafe archive member: {member.name}')
        source = archive.extractfile(member)
        if source is None:
            raise SystemExit(f'missing archive bytes: {member.name}')
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(source.read())

observed_files = {}
for name, (size, required_sha) in EXPECTED_FILES.items():
    raw = Path(name).read_bytes()
    digest = hashlib.sha256(raw).hexdigest()
    if len(raw) != size or digest != required_sha:
        raise SystemExit(f'product mismatch for {name}: bytes={len(raw)} sha256={digest}')
    observed_files[name] = {'bytes': len(raw), 'sha256': digest}

receipt = {
    'schema_version': 'pc40-exact-materialization-receipt@4',
    'source_head': subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip(),
    'qualified_parent': QUALIFIED_PARENT,
    'transport_pieces': observed_pieces,
    'reconstructed_shard_02_sha256': part02_sha,
    'aggregate_chars': len(encoded),
    'aggregate_sha256': aggregate_sha,
    'archive_bytes': len(archive_bytes),
    'archive_sha256': archive_sha,
    'permanent_nonworkflow_file_count': len(EXPECTED_FILES),
    'files': observed_files,
    'outside_human_dependency': False,
    'graph_effect': 'none',
}
Path('/tmp/pc40-materialization-receipt.json').write_text(json.dumps(receipt, indent=2) + '\n')
print(json.dumps(receipt, indent=2))
