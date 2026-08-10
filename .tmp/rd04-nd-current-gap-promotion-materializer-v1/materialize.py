#!/usr/bin/env python3
from __future__ import annotations
import base64,hashlib,io,json,lzma,pathlib,sys,tarfile
ARCHIVE_SHA256='db6fc2c935b11aa1bce1d54bf69cc7dd49f7e5146da694740d7a59cec6d9f79c'
ARCHIVE_BYTES=39440
ARCHIVE_B64_BYTES=52588
CHUNKS=['archive-00.b64', 'archive-01.b64', 'archive-02.b64', 'archive-03.b64', 'archive-04.b64', 'archive-05.b64', 'archive-06.b64', 'archive-07.b64', 'archive-08.b64', 'archive-09.b64', 'archive-10.b64', 'archive-11.b64', 'archive-12.b64', 'archive-13.b64', 'archive-14.b64', 'archive-15.b64', 'archive-16.b64', 'archive-17.b64']
EXPECTED_FILES={".github/workflows/status-sovereignty-rd-wave03-rd04-nd-current-public-record-gap-promotion.yml":{"bytes":13811,"git_blob_sha":"3e10811df745e20b03e7a201bb61afbc782d56e3","sha256":"c9903922acf9f6f768c8cbb64fd41cafcc13caea547207593f290a114af4169b"},"data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-nd-current-public-record-gap-promotion/cell-promotion-ledger.json":{"bytes":10039,"git_blob_sha":"3b632746f8866a3b9ced290165743dff5c9c828e","sha256":"b26f63a349ce281283d5072fadc9350e68cc03575134e0946e9585c053c4e218"},"data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-nd-current-public-record-gap-promotion/product-manifest.json":{"bytes":4775,"git_blob_sha":"6064c9eb186127b97c759707f87e2e3948b13072","sha256":"689e1e542d91b8db8519bdf9388979dbfd9d66f59352f929933f9d112f2954d8"},"data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-nd-current-public-record-gap-promotion/promoted-partial-field-matrix.json":{"bytes":495146,"git_blob_sha":"9c9b42817d34b7cd11783c8121405794e64c9013","sha256":"f80efa6f92b1fc9a48ab24b4258efff5426936c46cf1431513bd8da428af3843"},"data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-nd-current-public-record-gap-promotion/promotion-decision.json":{"bytes":3114,"git_blob_sha":"7883af66adb740c2766095bd259d8c93027d7337","sha256":"25192d9fdc48513b3a6dc78261be03bb8568635f4d0440998cbbaad867361c13"},"data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-nd-current-public-record-gap-promotion/promotion-input-custody.json":{"bytes":4951,"git_blob_sha":"36c91910f712768b45b6146cfe935fa3b9ae33c7","sha256":"111e44aedb9c086272117400fe11f6eea4aefb4f3e91a03a3071e98fa9156750"},"data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-nd-current-public-record-gap-promotion/remaining-open-field-census.json":{"bytes":1828,"git_blob_sha":"6023d040007b9b2d78811db6242f422783d7de56","sha256":"74091ebf46f26961d591dfbeb4f0cd312c053224382bf9ed32a5bec29ca41bd0"},"data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-nd-current-public-record-gap-promotion/summary.json":{"bytes":2220,"git_blob_sha":"3289c87764b730767faa83122f617269c9366fda","sha256":"1e098afd0f8871efb57b63d147439bb91b25c88673a32e46a2fe0fdb64cfdb0e"}}
def sha256(data:bytes)->str:return hashlib.sha256(data).hexdigest()
def git_blob_sha(data:bytes)->str:return hashlib.sha1(f"blob {len(data)}\0".encode()+data).hexdigest()
def main()->None:
    if len(sys.argv)!=3:raise SystemExit('usage: materialize.py WORKTREE OUT')
    worktree=pathlib.Path(sys.argv[1]).resolve();out=pathlib.Path(sys.argv[2]).resolve();out.mkdir(parents=True,exist_ok=True);root=pathlib.Path(__file__).resolve().parent
    encoded=''.join((root/name).read_text(encoding='ascii').strip() for name in CHUNKS);assert len(encoded)==ARCHIVE_B64_BYTES
    archive=base64.b64decode(encoded,validate=True);assert len(archive)==ARCHIVE_BYTES and sha256(archive)==ARCHIVE_SHA256
    tar_bytes=lzma.decompress(archive)
    with tarfile.open(fileobj=io.BytesIO(tar_bytes),mode='r:') as tf:
        names=[]
        for member in tf.getmembers():
            raw=member.name;normalized=pathlib.PurePosixPath(raw)
            if normalized.is_absolute() or '..' in normalized.parts:raise AssertionError(f'unsafe archive path: {raw}')
            if member.issym() or member.islnk() or member.isdev():raise AssertionError(f'unsupported archive member: {raw}')
            if member.isfile():names.append(raw[2:] if raw.startswith('./') else raw)
        assert sorted(names)==sorted(EXPECTED_FILES);tf.extractall(worktree,filter='data')
    observed={}
    for rel,expected in EXPECTED_FILES.items():
        data=(worktree/rel).read_bytes();actual={'bytes':len(data),'sha256':sha256(data),'git_blob_sha':git_blob_sha(data)};assert actual==expected,(rel,actual,expected);observed[rel]=actual
    receipt={'schema_version':'ssc-rd04-nd-current-public-record-gap-promotion-materializer-receipt@2','state':'sealed_eight_path_product_materialized','archive_format':'tar_xz','archive_bytes':ARCHIVE_BYTES,'archive_sha256':ARCHIVE_SHA256,'archive_chunk_count':len(CHUNKS),'product_path_count':len(EXPECTED_FILES),'addition_only':True,'expected_files':observed,'source_requests':0,'route_executions':0,'source_admissions':0,'field_terminalizations':1,'matrix_updates':1,'row_state_mutations':0,'row_terminalizations':0,'class_closed':False,'cumulative_ledger_effect':'none','publication_effect':'none','adoption_effect':'none','graph_effect':'none','outside_human_dependency':False}
    (out/'materialization-receipt.json').write_text(json.dumps(receipt,indent=2,sort_keys=True)+'\n');(out/'archive.sha256').write_text(ARCHIVE_SHA256+'\n');print(json.dumps(receipt,sort_keys=True))
if __name__=='__main__':main()
