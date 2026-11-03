#!/usr/bin/env python3
"""Owner launcher for an installed, portable evidence desk."""
from __future__ import annotations
import argparse,hashlib,json,os,subprocess,sys,webbrowser
from pathlib import Path
ROOT=Path(__file__).resolve().parent

def execute(args,env=None):
    env=dict(os.environ if env is None else env);env.update(PYTHONUTF8='1',PYTHONIOENCODING='utf-8')
    result=subprocess.run(args,env=env,capture_output=True,text=True,encoding='utf-8',timeout=90)
    if result.returncode:
        raise RuntimeError(result.stderr.strip() or result.stdout.strip())
    return json.loads(result.stdout)

def main():
    sys.stdout.reconfigure(encoding='utf-8');sys.stderr.reconfigure(encoding='utf-8')
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('command',choices=['open','verify','inspect','ask'],nargs='?',default='open')
    p.add_argument('--query',default='Firestorm');p.add_argument('--state',type=Path)
    a=p.parse_args()
    verified=execute([sys.executable,'-B',str(ROOT/'runtime/workbench.py'),'verify','--bundle',str(ROOT)])
    edition=verified['edition']
    state=a.state or Path(os.environ.get('LOCALAPPDATA') or os.environ.get('XDG_STATE_HOME') or str(Path.home()/'.local/state'))/'AXM/CliffordEvidence'/edition[:20]
    if a.command=='open':
        webbrowser.open((ROOT/'index.html').as_uri());result={'opened':str(ROOT/'index.html'),'verification':verified}
    elif a.command=='verify':result=verified
    elif a.command=='inspect':
        state.mkdir(parents=True,exist_ok=True)
        result=execute([sys.executable,'-B',str(ROOT/'runtime/second_run/work.py'),'--request',str(ROOT/'runtime/second_run/request.json'),'--store',str(state/'cantos')])
    else:
        state.mkdir(parents=True,exist_ok=True)
        env=os.environ.copy();env['PYTHONPATH']=str(ROOT/'runtime')
        result=execute([sys.executable,'-B','-m','mary.evidence','--machine',str(ROOT/'runtime/clifford_machine.py'),'--bundle',str(ROOT),'--sha256',hashlib.sha256((ROOT/'data.json').read_bytes()).hexdigest(),'--query',a.query,'--ledger',str(state/'mary-outcomes.jsonl')],env)
    print(json.dumps(result,ensure_ascii=False,indent=2));return 0

if __name__=='__main__':
    try:raise SystemExit(main())
    except (OSError,ValueError,RuntimeError,subprocess.SubprocessError) as e:
        print(json.dumps({'status':'failed','error':str(e)}),file=sys.stderr);raise SystemExit(1)
