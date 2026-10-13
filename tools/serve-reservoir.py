#!/usr/bin/env python3
"""Local living view over the reservoir and native estate records. No source writes.

python tools/serve-reservoir.py --estate D:/Projects --state <durable-state> --port 8877
The catalog is a disposable search projection; returns are durable append-only
records in SQLite and exported JSONL. Existing corpus SQLite files are locators,
not re-imported benchmark rows. One process owns one state directory.
"""
from __future__ import annotations
import argparse, csv, hashlib, html, json, os, re, secrets, sqlite3, subprocess
import threading, time, uuid
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit, parse_qs

ROOT = Path(__file__).resolve().parents[1]
TEXT = {'.md', '.txt', '.json', '.jsonl', '.csv', '.tsv', '.html', '.py', '.js', '.mjs', '.cjs', '.ts', '.tsx', '.css', '.yml', '.yaml', '.toml', '.rs', '.go', '.sh'}
SKIP = {'.git', '.claude', '.codex', '.ssh', '.cache', '__pycache__', '.pytest_cache', 'node_modules', '.venv', 'venv', 'vendor'}
SENSITIVE = re.compile(r'(^|[/\\])(?:\.env(?:\..*)?|id_rsa|id_ed25519|credentials(?:\..*)?|secrets?(?:\..*)?)$', re.I)
PREFIX = 16384

def now(): return datetime.now(timezone.utc).isoformat(timespec='seconds')
def stable(data): return json.dumps(data, ensure_ascii=False, sort_keys=True, separators=(',', ':'))
def digest(data): return hashlib.sha256(data).hexdigest()
def atomic(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(path.name + '.pending')
    tmp.write_bytes(data)
    os.replace(tmp, path)
def inside(path, base):
    try: path.resolve().relative_to(base.resolve()); return True
    except ValueError: return False

def git(root, *args):
    p = subprocess.run(['git', '-c', f'safe.directory={root.as_posix()}', '-C', str(root), *args], capture_output=True, timeout=35)
    if p.returncode: raise RuntimeError(p.stderr.decode('utf-8', 'replace')[:800])
    return p.stdout

def discover(estate):
    found = {}
    registry = estate/'Tooling/Estate/main/PROJECT_REMOTES.csv'
    if registry.exists():
        for r in csv.DictReader(registry.read_text(encoding='utf-8-sig').splitlines()):
            p = estate/Path(r['DurablePath'].replace('\\', '/'))
            found[str(p.resolve()).lower()] = {'project': r['Project'], 'root': str(p), 'home': str(p.parent if p.name in {'main', 'repo', 'workspace'} else p), 'policy': r.get('CloudPolicy', 'unset'), 'remote': r.get('Remote', '')}
    # Complement the registry with real project checkouts in its declared wings.
    # Recovery, personal collections and model bodies remain outside this scan.
    for wing in ['Products', 'Measurement', 'Science', 'Ancestors', 'Tooling', 'Organs/AXM']:
        parent = estate/wing
        if not parent.is_dir(): continue
        for home in sorted(parent.iterdir()):
            if not home.is_dir() or home.name.startswith('.'): continue
            for p in [home/'main', home/'repo', home/'workspace', home]:
                if (p/'.git').exists():
                    found.setdefault(str(p.resolve()).lower(), {'project': home.name, 'root': str(p), 'home': str(home), 'policy': 'local', 'remote': ''})
                    break
    return sorted(found.values(), key=lambda r: ({'cantos':0,'second-run':1,'clifford-number':2}.get(r['project'].lower(),3),r['project'].lower()))

class Reservoir:
    def __init__(self, estate, state, port):
        self.estate, self.state, self.port = estate.resolve(), state.resolve(), port
        self.state.mkdir(parents=True, exist_ok=True)
        self.lock = threading.Lock()
        self.scan_lock = threading.Lock()
        self.token = secrets.token_urlsafe(32)
        self.owner = self.state/'server.lock'
        try:
            fd = os.open(self.owner, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
            os.write(fd, str(os.getpid()).encode()); os.close(fd)
        except FileExistsError:
            pid = int(self.owner.read_text())
            alive = False
            if os.name == 'nt':
                listing=subprocess.run(['tasklist','/FI',f'PID eq {pid}','/FO','CSV','/NH'],capture_output=True,text=True).stdout
                alive=any(len(r)>1 and r[1]==str(pid) for r in csv.reader(listing.splitlines()))
            else:
                try: os.kill(pid,0); alive=True
                except OSError: pass
            if not alive: self.owner.unlink(); return self.__init__(estate,state,port)
            raise RuntimeError(f'State already owned by PID {pid}; use that server or stop it first.')
        self.dbpath = self.state/'native-catalog.sqlite'
        with self.db() as db:
            db.executescript('''
CREATE TABLE IF NOT EXISTS documents(id TEXT PRIMARY KEY, project TEXT, path TEXT, relative TEXT, title TEXT, body TEXT, bytes INTEGER, mtime INTEGER, prefix_sha256 TEXT, text_scope TEXT, available INTEGER, observed_at TEXT);
CREATE VIRTUAL TABLE IF NOT EXISTS search USING fts5(project,relative,title,body,content=documents,content_rowid=rowid);
CREATE TRIGGER IF NOT EXISTS docs_ai AFTER INSERT ON documents BEGIN INSERT INTO search(rowid,project,relative,title,body) VALUES(new.rowid,new.project,new.relative,new.title,new.body); END;
CREATE TRIGGER IF NOT EXISTS docs_ad AFTER DELETE ON documents BEGIN INSERT INTO search(search,rowid,project,relative,title,body) VALUES('delete',old.rowid,old.project,old.relative,old.title,old.body); END;
CREATE TRIGGER IF NOT EXISTS docs_au AFTER UPDATE ON documents BEGIN INSERT INTO search(search,rowid,project,relative,title,body) VALUES('delete',old.rowid,old.project,old.relative,old.title,old.body); INSERT INTO search(rowid,project,relative,title,body) VALUES(new.rowid,new.project,new.relative,new.title,new.body); END;
CREATE INDEX IF NOT EXISTS docs_project ON documents(project);
CREATE TABLE IF NOT EXISTS revisions(id TEXT, at TEXT, old_digest TEXT, new_digest TEXT, old_text TEXT, new_text TEXT, available INTEGER);
CREATE INDEX IF NOT EXISTS revisions_id ON revisions(id);
CREATE TABLE IF NOT EXISTS returns(request_id TEXT PRIMARY KEY, at TEXT NOT NULL, inquiry TEXT NOT NULL, body TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS passes(id INTEGER PRIMARY KEY, at TEXT, body TEXT);
''')
        self.historypath = self.state/'history.sqlite'
        with self.history_db() as history:
            history.executescript('CREATE TABLE IF NOT EXISTS returns(request_id TEXT PRIMARY KEY,at TEXT NOT NULL,inquiry TEXT NOT NULL,body TEXT NOT NULL);CREATE TABLE IF NOT EXISTS passes(id INTEGER PRIMARY KEY,at TEXT,body TEXT);')
            with self.db() as previous:
                for row in previous.execute('SELECT request_id,at,inquiry,body FROM returns'):
                    history.execute('INSERT OR IGNORE INTO returns VALUES(?,?,?,?)',tuple(row))
            history.commit()
        self.projects = discover(self.estate)
        self.status = {'phase': 'starting', 'projects': len(self.projects), 'files': 0, 'checked_at': None, 'fingerprint': None, 'error': None}
        self.site = None
        saved = self.state/'latest.json'
        if saved.exists():
            old = json.loads(saved.read_text())
            self.site = Path(old['site']) if Path(old['site']).is_dir() else None
            self.status.update(old.get('status', {}))
            self.status.update(phase='starting', error=None)
        with self.db() as db:
            self.status['files']=db.execute('SELECT count(*) FROM documents WHERE available=1').fetchone()[0]
            for project in self.projects:
                project['files']=db.execute('SELECT count(*) FROM documents WHERE available=1 AND project=?',(project['project'],)).fetchone()[0]
        self.last_signature = None
    def db(self):
        db = sqlite3.connect(self.dbpath, timeout=45)
        db.row_factory = sqlite3.Row
        db.execute('PRAGMA recursive_triggers=ON'); db.execute('PRAGMA journal_mode=WAL'); db.execute('PRAGMA busy_timeout=45000')
        return db
    def history_db(self):
        db=sqlite3.connect(self.historypath,timeout=15);db.row_factory=sqlite3.Row
        db.execute('PRAGMA journal_mode=WAL')
        return db
    def paths(self, project):
        root = Path(project['root']); paths = set()
        if not root.is_dir(): raise FileNotFoundError(str(root))
        for raw in git(root, 'ls-files', '-z', '--cached', '--others', '--exclude-standard').split(b'\0'):
            if raw: paths.add(root/raw.decode('utf-8', 'replace'))
        home = Path(project['home'])
        for name in ['sessions', 'notes']:
            base = home/name
            if not base.is_dir(): continue
            for directory, folders, files in os.walk(base):
                folders[:] = [x for x in folders if x not in SKIP and not (Path(directory)/x).is_symlink() and not (getattr(Path(directory)/x,'is_junction',lambda:False)())]
                for name in files:
                    if Path(name).suffix.lower() in TEXT: paths.add(Path(directory)/name)
        return sorted(p for p in paths if not set(p.parts).intersection(SKIP) and not SENSITIVE.search(str(p)) and not p.is_symlink())
    def scan(self):
        started = time.monotonic(); changes = []; errors = []; summaries = []
        self.projects = discover(self.estate)
        for project in self.projects:
            label, root = project['project'], Path(project['root'])
            self.status.update(indexing=True, reading=label)
            try:
                paths = self.paths(project)
                with self.db() as db:
                    old = {r['path']: dict(r) for r in db.execute('SELECT * FROM documents WHERE project=?', (label,))}
                    seen = set(); changed = 0; total = 0; content = 0
                    for p in paths:
                        if p.is_relative_to(self.state): continue
                        try:
                            stat = p.stat()
                            if not p.is_file(): continue
                            name = str(p); seen.add(name); total += 1
                            if total % 500 == 0:
                                self.status.update(reading_files=total, files=sum(p.get('files',0) for p in self.projects)+total)
                                db.commit()
                            prev = old.get(name)
                            if prev and prev['mtime'] == stat.st_mtime_ns and prev['bytes'] == stat.st_size and prev['available']:
                                content += int(bool(prev['body'])); continue
                            text = ''; scope = 'path_only'
                            if p.suffix.lower() in TEXT and inside(p, Path(project['home'])):
                                with p.open('rb') as f: data = f.read(PREFIX)
                                if b'\0' not in data:
                                    text = data.decode('utf-8', 'replace')
                                    scope = 'full_text' if stat.st_size <= PREFIX else 'first_16_KiB'
                            content += int(bool(text))
                            h = digest(text.encode())
                            relative = os.path.relpath(p, root).replace('\\', '/')
                            title = next((x.lstrip('# ').strip() for x in text.splitlines()[:20] if x.startswith('# ')), p.name)
                            sid = digest((label+'\0'+name).encode())[:32]
                            at = now()
                            db.execute('INSERT INTO revisions VALUES(?,?,?,?,?,?,?)', (sid, at, prev['prefix_sha256'] if prev else None, h, prev['body'] if prev else None, text, 1))
                            db.execute('INSERT OR REPLACE INTO documents VALUES(?,?,?,?,?,?,?,?,?,?,?,?)', (sid, label, name, relative, title[:300], text, stat.st_size, stat.st_mtime_ns, h, scope, 1, at))
                            changed += 1
                            if len(changes) < 200: changes.append({'project': label, 'path': relative, 'kind': 'changed' if prev else 'added'})
                        except (OSError, ValueError) as exc:
                            errors.append({'project': label, 'path': str(p), 'error': str(exc)[:180]})
                    for name, prev in old.items():
                        if name not in seen and prev['available'] and not Path(name).exists():
                            db.execute('UPDATE documents SET available=0,observed_at=? WHERE id=?', (now(),prev['id']))
                            db.execute('INSERT INTO revisions VALUES(?,?,?,?,?,?,?)', (prev['id'],now(),prev['prefix_sha256'],None,prev['body'],None,0))
                            changed += 1
                    db.commit()
                project.update(files=total, text_files=content, changes=changed, available=True)
                summaries.append({k: project[k] for k in ['project','files','text_files','changes','available']})
            except (OSError, RuntimeError, subprocess.TimeoutExpired) as exc:
                project.update(files=0, text_files=0, changes=0, available=False)
                errors.append({'project': label, 'error': str(exc)[:350]})
            self.status.update(files=sum(p.get('files',0) for p in self.projects), scanned_projects=len(summaries))
            if len(summaries) % 5 == 0: self.cycle(scan=False)
        report = {'at': now(), 'seconds': round(time.monotonic()-started, 2), 'projects': summaries, 'changes': sum(p['changes'] for p in summaries), 'changed_paths_sample': changes, 'errors': errors, 'text_limit_bytes': PREFIX, 'scope': 'Native working checkouts and project sessions/notes; history-only bundles and unmounted collections remain separate locators. No source files modified.'}
        atomic(self.state/'coverage.json', (stable(report)+'\n').encode())
        self.status.update(coverage=report, checked_at=now(), indexing=False)
        return report
    def export_views(self):
        rows = []
        with self.db() as db:
            for project in self.projects:
                label = project['project']; count = db.execute('SELECT count(*) FROM documents WHERE project=? AND available=1',(label,)).fetchone()[0]
                examples = list(db.execute("SELECT title,body,path,observed_at FROM documents WHERE project=? AND relative IN ('README.md','HANDOFF.md','WORK.md','data/positioning.json') ORDER BY relative",(label,)))
                text = '\n\n'.join(r['body'][:3500] for r in examples)
                identity = hashlib.sha256()
                for item in db.execute('SELECT id,prefix_sha256,bytes,mtime,available FROM documents WHERE project=? ORDER BY id',(label,)):
                    identity.update(stable(list(item)).encode())
                text += '\nNative collection revision: '+identity.hexdigest()
                observed = db.execute('SELECT max(observed_at) FROM documents WHERE project=?',(label,)).fetchone()[0]
                rows.append({'project': label, 'record_id': 'native-collection', 'question': f'{label}: retained work and current source records', 'text': f'{count} available native files. '+text, 'origin': {'kind':'derived_from_record','author':'native estate collection reader'}, 'as_of': (observed or '2026-10-12')[:10], 'kind':'native_collection','locators':[{'kind':'estate_path','host':'octo-w01','path':project['root'],'verified':bool(project.get('available', False))}]})
        with self.history_db() as history:
            events=[json.loads(r[0]) for r in history.execute('SELECT body FROM returns ORDER BY at,request_id')]
        rows.extend(event['view'] for event in events)
        content=''.join(stable(r)+'\n' for r in rows).encode()
        file=self.state/'estate.view.jsonl'
        if not file.exists() or file.read_bytes()!=content: atomic(file,content)
        atomic(self.state/'returned-results.jsonl',''.join(stable(x)+'\n' for x in events).encode())
        return file
    def build(self):
        self.status.update(phase='circulating')
        view=self.export_views()
        generation='g-'+datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S')+'-'+uuid.uuid4().hex[:6]
        out=ROOT/'build/reservoir-live'/generation
        out.mkdir(parents=True)
        if self.site:
            for name in ['manifest.json','inquiries.compiled.jsonl']:
                if (self.site/name).exists(): (out/name).write_bytes((self.site/name).read_bytes())
        relative=out.relative_to(ROOT).as_posix()
        logs=[]
        for args in [['node','tools/build-reservoir.mjs','--view',str(view),'--out',relative],['node','tools/render-reservoir-page.mjs',relative]]:
            p=subprocess.run(args,cwd=ROOT,capture_output=True,encoding='utf-8',errors='replace',timeout=120)
            logs.append(p.stdout+'\n'+p.stderr)
            if p.returncode:
                atomic(self.state/'build-error.log','\n'.join(logs).encode()); raise RuntimeError(logs[-1][-1600:])
        manifest=json.loads((out/'manifest.json').read_text())
        delta=json.loads((out/'delta.json').read_text())
        self.site=out
        self.status.update(phase='ready', fingerprint=manifest['fingerprint'], inquiries=manifest['counts']['total_inquiries'], project_views=manifest['counts']['projects'], built_at=now(), delta=delta,error=None)
        atomic(self.state/'latest.json',stable({'site':str(out),'status':self.status}).encode())
        atomic(self.state/'last-build.log','\n'.join(logs).encode())
        with self.history_db() as db: db.execute('INSERT INTO passes(at,body) VALUES(?,?)',(now(),stable(self.status))); db.commit()
        # File discovery runs separately; it never delays returning an inquiry result.
    def signature(self):
        # Metadata is a change trigger, not a full cryptographic source audit.
        with self.db() as db: paths=[r[0] for r in db.execute('SELECT path FROM documents WHERE available=1')]
        h=hashlib.sha256()
        for name in paths:
            try:
                stat=Path(name).stat(); h.update((name+str(stat.st_mtime_ns)+str(stat.st_size)).encode())
            except OSError: h.update((name+'missing').encode())
        return h.hexdigest()
    def scan_worker(self):
        if not self.scan_lock.acquire(False): return
        try: self.scan()
        except Exception as exc: self.status.update(indexing=False, scan_error=str(exc))
        finally:
            self.scan_lock.release()
            self.cycle(scan=False)
    def cycle(self, scan=True):
        if scan: threading.Thread(target=self.scan_worker,daemon=True).start()
        if not self.lock.acquire(False):
            self.pending=True
            return False
        try: self.build()
        except Exception as exc:
            self.status.update(phase='error',error=str(exc));print('CYCLE ERROR',str(exc),flush=True)
        finally:
            self.lock.release()
            if getattr(self,'pending',False):
                self.pending=False
                threading.Thread(target=self.cycle,kwargs={'scan':False},daemon=True).start()
        return True
    def search(self, q='', project='', offset=0):
        offset=max(0,min(offset,1000000)); params=[]; clauses=[]
        terms=re.findall(r'[\w-]+',q)[:12]
        source='documents d'; select='d.*'; order='d.project,d.relative'
        if terms:
            source='search JOIN documents d ON d.rowid=search.rowid'; clauses.append('search MATCH ?');params.append(' AND '.join('"'+t.replace('"','')+'"*' for t in terms)); order='bm25(search)'
        if project:clauses.append('d.project=?');params.append(project)
        where=(' WHERE '+' AND '.join(clauses)) if clauses else ''
        with self.db() as db:
            count=db.execute('SELECT count(*) FROM '+source+where,params).fetchone()[0]
            rows=[dict(r) for r in db.execute('SELECT '+select+' FROM '+source+where+' ORDER BY '+order+' LIMIT 30 OFFSET ?',params+[offset])]
        for r in rows:
            body=r.pop('body');r['excerpt']=body[:700]
            if terms:
                pos=body.lower().find(terms[0].lower())
                if pos>=0:r['excerpt']=body[max(0,pos-100):pos+600]
        return {'total':count,'offset':offset,'rows':rows,'scope':'File paths and indexed text prefixes. Open a source to read current bytes; a textual match is a discovery lead.'}
    def source(self, sid):
        with self.db() as db:
            row=db.execute('SELECT * FROM documents WHERE id=?',(sid,)).fetchone()
            if not row:raise KeyError(sid)
            result=dict(row)
            result['revisions']=[dict(x) for x in db.execute('SELECT at,old_digest,new_digest,available FROM revisions WHERE id=? ORDER BY rowid DESC LIMIT 20',(sid,))]
        p=Path(result['path'])
        owners=[Path(x['home']) for x in self.projects if x['project']==result['project']]
        if not any(inside(p,x) for x in owners) or p.is_symlink():raise ValueError('Source no longer lies inside its project home')
        if p.is_file():
            with p.open('rb') as f: data=f.read(262144)
            result.update(text=data.decode('utf-8','replace') if b'\0' not in data else '[Binary source retained at the displayed native path]', displayed_bytes=len(data),displayed_sha256=digest(data),truncated=p.stat().st_size>len(data),current=True)
        else:result.update(text=result['body'],current=False,truncated=result['text_scope']!='full_text')
        result.pop('body',None);return result
    def add_return(self, body):
        if not self.site:raise ValueError('Initial pass is still running')
        text=body.get('text','').strip(); inquiry=body.get('inquiry',''); rid=body.get('request_id','')
        if not text or len(text)>20000:raise ValueError('Result text must contain 1..20000 characters')
        if not re.fullmatch(r'[a-zA-Z0-9_-]{8,80}',rid):raise ValueError('A stable request id is required')
        compiled=[json.loads(x) for x in (self.site/'inquiries.compiled.jsonl').read_text(encoding='utf-8').splitlines() if x]
        parent=next((x for x in compiled if x['project']+':'+x['inquiry_id']==inquiry),None)
        if parent is None:raise ValueError('Select an existing inquiry')
        origin=body.get('origin',{'kind':'human_words','author':'Local operator'})
        if origin.get('kind') not in {'human_words','agent_observation','agent_interpretation'} or not isinstance(origin.get('author'),str):raise ValueError('Invalid origin')
        locators=[{'kind':'reservoir','project':parent['project'],'id':parent['inquiry_id']}]
        for sid in body.get('source_ids',[])[:20]:
            src=self.source(sid);locators.append({'kind':'estate_path','host':'octo-w01','path':src['path'],'note':'Result refers to this source; displayed-byte hash '+src['displayed_sha256'] if src.get('current') else 'Retained source currently unavailable'})
        at=now()
        view={'project':'estate-results','record_id':rid,'question':body.get('title') or 'Returned result: '+parent['question'][:180],'text':text,'origin':origin,'as_of':at[:10],'kind':'returned_result','locators':locators,'related_inquiry_ids':[inquiry]}
        event={'request_id':rid,'at':at,'inquiry':inquiry,'text':text,'origin':origin,'source_ids':body.get('source_ids',[]),'view':view}
        with self.history_db() as db:
            old=db.execute('SELECT body FROM returns WHERE request_id=?',(rid,)).fetchone()
            if old:
                prev=json.loads(old[0])
                if prev['text']!=text or prev['inquiry']!=inquiry:raise ValueError('Request id already belongs to another result')
                return {'saved':True,'duplicate':True,'request_id':rid}
            db.execute('INSERT INTO returns VALUES(?,?,?,?)',(rid,at,inquiry,stable(event)));db.commit()
        return {'saved':True,'duplicate':False,'request_id':rid}
    def watch(self):
        self.cycle()
        last_discovery=time.monotonic()
        while True:
            time.sleep(30)
            if self.scan_lock.locked(): continue
            try:
                sig=self.signature()
                if sig!=self.last_signature or time.monotonic()-last_discovery>300:
                    self.last_signature=sig;last_discovery=time.monotonic();self.cycle()
                else: self.status['checked_at']=now()
            except Exception as exc: self.status['watch_error']=str(exc)

class Handler(BaseHTTPRequestHandler):
    def log_message(self,*args):pass
    def allowed(self):
        allowed={f'127.0.0.1:{self.server.app.port}',f'localhost:{self.server.app.port}'}
        if self.headers.get('Host') not in allowed:return False
        origin=self.headers.get('Origin')
        return origin is None or origin in {'http://'+h for h in allowed}
    def send(self,obj,status=200,kind='application/json; charset=utf-8'):
        data=obj if isinstance(obj,bytes) else stable(obj).encode()
        self.send_response(status);self.send_header('Content-Type',kind);self.send_header('Content-Length',str(len(data)));self.send_header('Cache-Control','no-store');self.send_header('X-Content-Type-Options','nosniff');self.send_header('Referrer-Policy','no-referrer');self.end_headers();self.wfile.write(data)
    def do_GET(self):
        app=self.server.app
        if not self.allowed():self.send({'error':'Unrecognized local origin'},403);return
        url=urlsplit(self.path);q=parse_qs(url.query)
        try:
            if url.path=='/api/status':self.send(app.status)
            elif url.path=='/api/projects':self.send({'projects':app.projects})
            elif url.path=='/api/search':self.send(app.search(q.get('q',[''])[0],q.get('project',[''])[0],int(q.get('offset',['0'])[0])))
            elif url.path=='/api/source':self.send(app.source(q.get('id',[''])[0]))
            elif url.path=='/api/returns':
                with app.history_db() as db:rows=[json.loads(r[0]) for r in db.execute('SELECT body FROM returns WHERE inquiry=? ORDER BY at',(q.get('inquiry',[''])[0],))]
                self.send({'rows':rows})
            elif url.path=='/live.js':self.send((ROOT/'tools/lib/reservoir-live-client.js').read_bytes(),kind='text/javascript; charset=utf-8')
            elif url.path=='/':
                if not app.site:self.send(b'<!doctype html><meta http-equiv="refresh" content="3"><title>Reading the estate</title><h1>Reading native collections</h1><p>The first pass is running. This page will open the reservoir when it completes.</p>',kind='text/html; charset=utf-8');return
                data=(app.site/'index.html').read_bytes()
                boot='<script>window.RESERVOIR_LOCAL='+stable({'token':app.token,'fingerprint':app.status.get('fingerprint')})+';</script><script src="/live.js"></script>'
                self.send(data+boot.encode(),kind='text/html; charset=utf-8')
            else:self.send({'error':'Not found'},404)
        except (ValueError,KeyError) as exc:self.send({'error':str(exc)},400)
        except Exception as exc:self.send({'error':str(exc)},500)
    def do_POST(self):
        app=self.server.app
        if not self.allowed() or self.headers.get('X-Reservoir-Token')!=app.token:self.send({'error':'Local write token required'},403);return
        try:
            length=int(self.headers.get('Content-Length','0'))
            if not 0<length<=100000:raise ValueError('Invalid body size')
            body=json.loads(self.rfile.read(length))
            if self.path=='/api/return':
                result=app.add_return(body)
                threading.Thread(target=app.cycle,kwargs={'scan':False},daemon=True).start();self.send(result,202)
            elif self.path=='/api/refresh':
                threading.Thread(target=app.cycle,kwargs={'scan':body.get('read_sources',True) is not False},daemon=True).start();self.send({'requested':True},202)
            else:self.send({'error':'Not found'},404)
        except (ValueError,KeyError) as exc:self.send({'error':str(exc)},400)
        except Exception as exc:self.send({'error':str(exc)},500)

def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--estate',type=Path,required=True);parser.add_argument('--state',type=Path,required=True);parser.add_argument('--port',type=int,default=8877);parser.add_argument('--open',action='store_true')
    args=parser.parse_args();app=Reservoir(args.estate,args.state,args.port)
    server=ThreadingHTTPServer(('127.0.0.1',args.port),Handler);server.app=app
    threading.Thread(target=app.watch,daemon=True).start()
    print(f'Reservoir running at http://127.0.0.1:{args.port}/; native sources stay in place; durable state {args.state}',flush=True)
    if args.open:
        import webbrowser
        webbrowser.open(f'http://127.0.0.1:{args.port}/')
    try:server.serve_forever()
    finally:server.server_close();app.owner.unlink(missing_ok=True)
if __name__=='__main__':main()
