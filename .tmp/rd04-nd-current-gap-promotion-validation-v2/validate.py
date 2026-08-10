#!/usr/bin/env python3
from __future__ import annotations
import hashlib,subprocess

SOURCE_COMMIT='b4e5ff79212a1eac1ea55df4127929150051443f'
SOURCE_PATH='.tmp/rd04-nd-current-gap-promotion-validation-v1/validate.py'
SOURCE_BLOB='0c31d47a5993e5560d4897b454f9c00e824ae7eb'
OLD_PRODUCT='130a35383043b13c0bfdf493f8b7c9d39804b08f'
NEW_PRODUCT='91ec5f11266b24cc935a33566db1c9d5db258e75'
NEW_TREE='5210b12a1158af5ac4333d5ef2bb9131bd9c2fb2'
OLD_PAYLOAD='151524421387c9cd890d970dcf53ff803256c3bbd73af255cbc0afcdca2a7aa9'
NEW_PAYLOAD='26da08a72324af72d0df60e7d4ad47a1b7175cebe951e5d98931ef2707d136a1'
SUMMARY_BYTES=1287
SUMMARY_SHA256='784791369317a1ac834318d43035a0561bac5c799df80093229865235f4c9985'
SUMMARY_BLOB='34d9b3db7a075343dad02fafeb3a4d6c73dde9cb'
MANIFEST_BYTES=3450
MANIFEST_SHA256='384e8c5a385e1b7f9d1512717874943933747235ad2210161c77f5fee72ccd74'
MANIFEST_BLOB='150c239488fb3715336ed30144a516f2313ec220'

def blob_sha(data:bytes)->str:
    return hashlib.sha1(f'blob {len(data)}\0'.encode()+data).hexdigest()

def replace_exact(text:str,old:str,new:str,count:int=1)->str:
    actual=text.count(old)
    if actual!=count:
        raise AssertionError(f'patch preimage count mismatch: {actual} != {count}: {old[:100]!r}')
    return text.replace(old,new)

source=subprocess.check_output(['git','show',f'{SOURCE_COMMIT}:{SOURCE_PATH}'])
assert blob_sha(source)==SOURCE_BLOB
s=source.decode('utf-8')
s=replace_exact(s,f"PROD='{OLD_PRODUCT}'",f"PROD='{NEW_PRODUCT}'\nTREE='{NEW_TREE}'")
s=replace_exact(
    s,
    "assert git('rev-parse','HEAD^')==CAN\n",
    "assert git('rev-parse','HEAD^')==CAN\nassert git('rev-parse','HEAD^{tree}')==TREE\n",
)
s=replace_exact(
    s,
    "manifest=load(ROOT/'product-manifest.json')\n",
    """manifest_path=ROOT/'product-manifest.json'
summary_path=ROOT/'summary.json'
manifest_bytes=manifest_path.read_bytes()
summary_bytes=summary_path.read_bytes()
assert len(manifest_bytes)==MANIFEST_BYTES and sha(manifest_bytes)==MANIFEST_SHA256
assert len(summary_bytes)==SUMMARY_BYTES and sha(summary_bytes)==SUMMARY_SHA256
assert git('rev-parse',f'HEAD:{manifest_path}')==MANIFEST_BLOB
assert git('rev-parse',f'HEAD:{summary_path}')==SUMMARY_BLOB
manifest=json.loads(manifest_bytes)
summary=json.loads(summary_bytes)
""",
)
s=replace_exact(s,OLD_PAYLOAD,NEW_PAYLOAD)
s=replace_exact(
    s,
    "assert manifest['addition_only'] is True and manifest['workflow_or_transport_paths']==0\n",
    """assert manifest['addition_only'] is True and manifest['workflow_or_transport_paths']==0
assert manifest['semantic_counts']['cumulative_ledger_effect']=='none'
assert summary['cumulative_ledger_effect']=='none'
""",
)
s=replace_exact(
    s,
    "'schema_version':'ssc-rd04-nd-current-gap-promotion-independent-validation@1'",
    "'schema_version':'ssc-rd04-nd-current-gap-promotion-independent-validation@2'",
)
s=replace_exact(
    s,
    "'class_closed':False,'outside_human_dependency':False",
    "'class_closed':False,'cumulative_ledger_effect':'none','publication_effect':'none','adoption_effect':'none','graph_effect':'none','outside_human_dependency':False",
)
compile(s,'<rd04-nd-current-gap-promotion-validation-v2>','exec')
exec(compile(s,'<rd04-nd-current-gap-promotion-validation-v2>','exec'),{'__name__':'__main__','__file__':__file__})
