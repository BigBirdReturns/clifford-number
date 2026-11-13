#!/usr/bin/env python3
"""Reproduce an owner-internal turnkey edition using declared component sources.

Component source directories are build inputs only. Installed runtimes contain
pinned file copies and import no sibling checkout. No service is activated and
no source corpus is published by this command.
"""
from __future__ import annotations
import argparse,hashlib,json,shutil,subprocess
from pathlib import Path
import workbench as W
HERE=Path(__file__).resolve().parent

def revision(root):
    p=subprocess.run(['git','-C',str(root),'rev-parse','HEAD'],capture_output=True,text=True)
    if p.returncode:raise ValueError('Component has no Git identity: '+str(root))
    return p.stdout.strip()

def assemble(repo,cantos,mary,out,source_ref=None):
    result=W.build(repo,out,source_ref);out=out.resolve();runtime=out/'runtime'
    (runtime/'second_run').mkdir();(runtime/'mary').mkdir()
    pieces=[(HERE/'workbench.py','runtime/workbench.py','Clifford compiler / reader',repo),(cantos/'integration/work.py','runtime/second_run/work.py','Cantos / Second Run',cantos),
            (cantos/'integration/task_evidence.py','runtime/second_run/task_evidence.py','Cantos / Second Run',cantos),
            (HERE/'clifford_machine.py','runtime/clifford_machine.py','Clifford scoped evidence aperture',repo),
            (HERE/'run.py','run.py','Clifford launcher',repo)]
    pieces += [(mary/'mary'/name,'runtime/mary/'+name,'MARY',mary) for name in ['__init__.py','machine.py','canonical.py','errors.py','ledger.py','evidence.py']]
    components=[]
    for source,name,owner,origin in pieces:
        raw=source.read_bytes();target=out/name;target.write_bytes(raw)
        commit=revision(origin);original=subprocess.run(['git','-C',str(origin),'show',commit+':'+str(source.relative_to(origin))],capture_output=True)
        if original.returncode or W.sha(original.stdout)!=W.sha(raw):raise ValueError('Component must be committed before assembly: '+str(source))
        components.append({'component':owner,'installed':name,'sha256':W.sha(raw),'source_file':str(source.relative_to(origin)),
                           'source_revision':commit,'edge':'versioned executable/package copy; build source only'})
    components.append({'component':'AXM Genesis-reconciled identity','edge':'compile-time owner implementation',**W.read_json(out/'data.json')['identity_owner']})
    (out/'COMPONENTS.json').write_text(json.dumps({'schema':'clifford/component-custody@1','distribution':'owner_internal_evaluation_only','components':components,
        'boundaries':['Cantos native execution and reuse owner with one registered evidence-inspect adapter',
                      'MARY native MachineProcess and outcome ledger; read-only retrieval, not voice or household mirror deployment',
                      'Scoped evidence aperture uses pinned artifact, bounded calls and no caller-supplied paths or commands; not Flight Runtime or media-Aperture deployment',
                      'AXM identity is source-record identity, not legal-entity resolution, a signature or truth certification',
                      'Existing TierDesk owns the build jobs; no new scheduler, global registry or daemon was activated'],
        'rights':'MARY has no selected public redistribution license and Cantos has no blanket root license. The assembled runtime remains owner-internal. Source documents retain their own rights.'},indent=2))
    (out/'LICENSE-STATUS.txt').write_text('OWNER-INTERNAL EVALUATION CANDIDATE\n\nClifford source is MIT. MARY has no public redistribution license selected. Cantos has no blanket root software license. No third-party source rights are overridden. This assembled runtime grants no external public redistribution or commercial rights. The separate review projection contains no MARY or Cantos executable code. Claim review, software licensing and consumer ingestion are separate acceptance states.\n')
    req={'tasks':[{'id':'procurement','task_class':'evidence-inspect','source':'../../data.json','collection':'Government awards'},
                  {'id':'capital','task_class':'evidence-inspect','source':'../../data.json','collection':'Capital observations'},
                  {'id':'source-conflict','task_class':'evidence-inspect','source':'../../data.json','collection':'Source reconciliation'}]}
    (runtime/'second_run/request.json').write_text(json.dumps(req,indent=2))
    for name,command in [('RUN CHECKED WORK.cmd','inspect'),('ASK FIRESTORM.cmd','ask --query Firestorm')]:
        (out/name).write_text('@echo off\r\ncd /d "%~dp0"\r\npython -B run.py '+command+'\r\npause\r\n')
    (out/'README.txt').write_text('CLIFFORD NUMBER | EVIDENCE DESK\n\nOpen OPEN EVIDENCE DESK.cmd or index.html. The page works offline with byte-exact JSONL/CSV downloads.\nRUN CHECKED WORK.cmd invokes the native Cantos / Second Run owner. Its next invocation reuses the checked results.\nASK FIRESTORM.cmd retrieves real records through the MARY executable membrane and native outcome ledger.\n\nCLI: python -B run.py verify\nCLI: python -B run.py inspect --state <operator-owned-state-directory>\nCLI: python -B run.py ask --query Neros --state <operator-owned-state-directory>\n\nThe UI needs no installation. Native operations require Python 3.10+ and no third-party Python packages. Rebuilding the source edition also needs Node.js and Git. State stays outside the immutable package, in the explicit --state directory or the operating system user-state directory.\n\n'+W.BOUNDARY+'\n\nRead LICENSE-STATUS.txt before external software redistribution. The external review projection omits Cantos and MARY runtime code. No partner account, API ingestion, scoring, public publication or background monitor is enabled.\n')
    W.write_manifest(out);result['verification']=W.verify(out);return result

def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--repo',type=Path,default=HERE.parent);p.add_argument('--cantos',type=Path,required=True);p.add_argument('--mary',type=Path,required=True);p.add_argument('--out',type=Path,required=True);p.add_argument('--source-ref')
    a=p.parse_args();print(json.dumps(assemble(a.repo.resolve(),a.cantos.resolve(),a.mary.resolve(),a.out.resolve(),a.source_ref),indent=2))
if __name__=='__main__':main()
