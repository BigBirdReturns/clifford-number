#!/usr/bin/env python3
"""Package any curated bundle directory into one self-contained, house-style HTML
dossier. Subject-agnostic and repeatable: point it at a directory of .md/.csv
files (optionally with a bundle.json manifest) and get a single standalone file
with zero network calls.

  python tools/build-dossier.py --src <dir> --out <file.html> \
      [--title "..."] [--subject "..."] [--lede "..."]

bundle.json (optional, in --src) overrides discovery:
  {"title","subject","lede","provenance_file","sections":[{"title","file","type"}]}
type is "md" (document) or "csv" (sortable ledger); inferred from extension if omitted.
Files named README* become the provenance card. Discovery order (no manifest):
readme, handoff, foia/matrix, contract, dossier, then the rest, csvs as ledgers.
"""
import argparse, csv, html, io, json, os, re, sys

# ---------- markdown ----------
def esc(t): return html.escape(t, quote=False)

def inline(t):
    t = esc(t); codes = []
    def stash(m): codes.append(m.group(1)); return f"\x00{len(codes)-1}\x00"
    t = re.sub(r"`([^`]+)`", stash, t)
    t = re.sub(r"\[([^\]]+)\]\((https?://[^)\s]+)\)", r'<a href="\2" rel="noopener noreferrer">\1</a>', t)
    t = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", t)
    t = re.sub(r"(?<!\*)\*(?!\*)([^*]+)\*(?!\*)", r"<em>\1</em>", t)
    t = re.sub(r"\x00(\d+)\x00", lambda m: f"<code>{esc(codes[int(m.group(1))])}</code>", t)
    return t

def md(text):
    lines = text.replace("\r\n", "\n").split("\n"); out, i, n = [], 0, len(lines)
    while i < n:
        ln = lines[i]
        if ln.strip().startswith("```"):
            i += 1; buf = []
            while i < n and not lines[i].strip().startswith("```"): buf.append(esc(lines[i])); i += 1
            i += 1; out.append("<pre><code>" + "\n".join(buf) + "</code></pre>"); continue
        m = re.match(r"^(#{1,6})\s+(.*)$", ln)
        if m: out.append(f"<h{len(m.group(1))}>{inline(m.group(2).strip())}</h{len(m.group(1))}>"); i += 1; continue
        if re.match(r"^\s*([-*_])\1{2,}\s*$", ln): out.append("<hr>"); i += 1; continue
        if "|" in ln and i + 1 < n and re.match(r"^\s*\|?[\s:|-]+\|[\s:|-]*$", lines[i+1]) and "-" in lines[i+1]:
            header = [c.strip() for c in ln.strip().strip("|").split("|")]; i += 2; rows = []
            while i < n and "|" in lines[i] and lines[i].strip():
                rows.append([c.strip() for c in lines[i].strip().strip("|").split("|")]); i += 1
            t = ['<div class="tbl-wrap"><table class="mdtable"><thead><tr>'] + [f"<th>{inline(h)}</th>" for h in header] + ["</tr></thead><tbody>"]
            for r in rows: t.append("<tr>" + "".join(f"<td>{inline(c)}</td>" for c in r) + "</tr>")
            t.append("</tbody></table></div>"); out.append("".join(t)); continue
        if re.match(r"^\s*>\s?", ln):
            buf = []
            while i < n and re.match(r"^\s*>\s?", lines[i]): buf.append(inline(re.sub(r"^\s*>\s?", "", lines[i]))); i += 1
            out.append("<blockquote>" + "<br>".join(buf) + "</blockquote>"); continue
        if re.match(r"^\s*[-*]\s+", ln):
            buf = []
            while i < n and re.match(r"^\s*[-*]\s+", lines[i]): buf.append(f"<li>{inline(re.sub(r'^\\s*[-*]\\s+','',lines[i]))}</li>"); i += 1
            out.append("<ul>" + "".join(buf) + "</ul>"); continue
        if re.match(r"^\s*\d+\.\s+", ln):
            buf = []
            while i < n and re.match(r"^\s*\d+\.\s+", lines[i]): buf.append(f"<li>{inline(re.sub(r'^\\s*\\d+\\.\\s+','',lines[i]))}</li>"); i += 1
            out.append("<ol>" + "".join(buf) + "</ol>"); continue
        if ln.strip() == "": i += 1; continue
        buf = [ln]; i += 1
        while i < n and lines[i].strip() != "" and not re.match(r"^(#{1,6}\s|\s*[-*]\s|\s*\d+\.\s|\s*>|```)", lines[i]) and "|" not in lines[i]:
            buf.append(lines[i]); i += 1
        out.append("<p>" + inline(" ".join(b.strip() for b in buf)) + "</p>")
    return "\n".join(out)

def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", re.sub(r"<[^>]+>", "", s).lower()).strip("-")[:48] or "h"

def add_anchors(htmltext, prefix):
    seen = {}
    def repl(m):
        lvl, inner = m.group(1), m.group(2)
        base = f"{prefix}-{slug(inner)}"; seen[base] = seen.get(base, 0) + 1
        hid = base if seen[base] == 1 else f"{base}-{seen[base]}"
        return (f'<h{lvl} id="{hid}">{inner}'
                f'<a class="anchor" href="#{hid}" aria-label="Link to this section">#</a></h{lvl}>')
    return re.sub(r"<h([23])>(.*?)</h\1>", repl, htmltext, flags=re.S)

def csv_table(text, sid):
    rows = list(csv.reader(io.StringIO(text)))
    if not rows: return "<p>(empty)</p>"
    head, body = rows[0], rows[1:]
    h = "".join(f'<th onclick="sortT(this)">{esc(c)}</th>' for c in head)
    b = []
    for r in body:
        cells = []
        for c in r:
            c2 = re.sub(r"(https?://[^\s,]+)", r'<a href="\1" rel="noopener noreferrer">\1</a>', esc(c))
            cells.append(f"<td>{c2}</td>")
        b.append("<tr>" + "".join(cells) + "</tr>")
    return (f'<div class="filterbar"><input placeholder="filter rows..." oninput="filterT(this,\'{sid}\')"></div>'
            f'<div class="tbl-wrap"><table class="datatable" id="{sid}"><thead><tr>{h}</tr></thead>'
            f'<tbody>{"".join(b)}</tbody></table></div><div class="rowcount">{len(body)} rows</div>')

# ---------- discovery ----------
def discover(src):
    files = [f for f in sorted(os.listdir(src)) if f.lower().endswith((".md", ".csv"))]
    readme = next((f for f in files if f.lower().startswith("readme")), None)
    rest = [f for f in files if f != readme]
    def rank(f):
        n = f.lower()
        for i, kw in enumerate(["handoff", "foia", "matrix", "contract", "dossier", "influence",
                                "teardown", "failure", "enumerat", "source", "order", "genealog"]):
            if kw in n: return (i, f)
        return (99, f)
    rest.sort(key=rank)
    sections = [{"title": pretty(f), "file": f, "type": "csv" if f.endswith(".csv") else "md"} for f in rest]
    return readme, sections

def pretty(fname):
    s = re.sub(r"\.(md|csv)$", "", fname)
    s = re.sub(r"_v\d+", "", s); s = re.sub(r"\d{4}-\d{2}-\d{2}", "", s)
    s = s.replace("_", " ").replace("-", " ").strip()
    return re.sub(r"\s+", " ", s).title()

# ---------- shell (house style; no network) ----------
CSS = open(os.path.join(os.path.dirname(__file__), "dossier-style.css")).read() \
    if os.path.exists(os.path.join(os.path.dirname(__file__), "dossier-style.css")) else ""

def build(src, out, title, subject, lede):
    manifest = {}
    mpath = os.path.join(src, "bundle.json")
    if os.path.exists(mpath): manifest = json.load(open(mpath, encoding="utf8"))
    title = manifest.get("title", title) or (subject + " — Reporting Bundle")
    subject = manifest.get("subject", subject) or title
    lede = manifest.get("lede", lede) or ("A source-indexed reporting package assembled entirely from "
        "disclosed public records. Every claim ties to a primary record you can verify independently.")
    if manifest.get("sections"):
        readme = manifest.get("provenance_file")
        sections = manifest["sections"]
        for s in sections: s.setdefault("type", "csv" if s["file"].endswith(".csv") else "md")
    else:
        readme, sections = discover(src)
    for k, s in enumerate(sections): s["id"] = f"s{k+1}"

    def read(f): return open(os.path.join(src, f), encoding="utf8").read()

    toc = ['<div class="brandrow">'
           f'<span class="brand">{esc(subject.split("—")[0].strip()[:20]).upper()}</span>'
           '<button class="themebtn" id="themebtn" aria-label="Toggle theme">theme</button></div>'
           '<div class="eyebrow">Reporting Bundle</div>'
           '<input class="tocfilter" id="tocfilter" placeholder="filter sections…" aria-label="Filter sections">'
           '<a href="#cover" data-t="start here">00 · Start Here</a>']
    toc += [f'<a href="#{s["id"]}" data-t="{esc(s["title"].lower())}">{k+1:02d} · {esc(s["title"])[:40]}</a>'
            for k, s in enumerate(sections)]

    prov = f'<div class="card"><div class="lbl">Provenance &amp; boundary</div>{md(read(readme))}</div>' if readme else ""
    funnel_links = " · ".join(f'<a href="#{s["id"]}">{esc(s["title"])[:28]}</a>' for s in sections[:5])
    stats = manifest.get("stats", [])
    stat_html = ""
    if stats:
        tiles = "".join(f'<div class="stat"><div class="num">{esc(str(s.get("num","")))}</div>'
                        f'<div class="lab">{esc(str(s.get("lab","")))}</div></div>' for s in stats)
        stat_html = f'<div class="stats">{tiles}</div>'
    cover = f"""
<section id="cover" class="cover">
  <div class="eyebrow">Public-Records Reporting Bundle</div>
  <h1>{esc(title)}</h1>
  <div class="lede">{esc(lede)}</div>
  {stat_html}
  {prov}
  <div class="card"><div class="lbl">Method — a research question reduced to a solution space</div>
    <p>This bundle is one run of a repeatable pipeline: <strong>bound the question</strong> to a defined universe, <strong>enumerate the candidate space</strong> from open records with an adapter, <strong>attach a receipt to every candidate</strong> so each is independently checkable, and <strong>mark the residual honestly</strong> (what remains unsearched or withheld). Nothing here is a finding; these are candidate surfaces and records targets. Because every claim carries its own source, the only open question this package leaves is <em>how it was built</em> — answered above — so you can act on it rather than interrogate it.</p>
    <p><span class="badge pub">public records</span><span class="badge pub">independently verifiable</span><span class="badge warn">candidates &amp; targets, not findings</span></p>
  </div>
  <div class="card"><div class="lbl">How to read this</div><p>Start with the handoff. {funnel_links}. Ledgers are sortable and filterable.</p></div>
  <div class="card"><div class="lbl">Handoff details — set before sending</div>
    <p>Prepared for: <span class="placeholder">[reporter / outlet]</span> · From: <span class="placeholder">[your attribution line]</span> · Exclusivity: <span class="placeholder">[stated?]</span></p>
  </div>
</section>"""

    secs = []
    for k, s in enumerate(sections):
        if s["type"] == "md":
            body = add_anchors(md(read(s["file"])), s["id"])
        else:
            body = csv_table(read(s["file"]), s["id"] + "t")
        secs.append(f'<section id="{s["id"]}"><div class="sec-eyebrow">{k+1:02d} · '
                    f'{"document" if s["type"]=="md" else "ledger"}</div>{body}</section>')

    doc = f"""<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow">
<meta name="color-scheme" content="dark light"><meta name="theme-color" content="#0e0e0f">
<title>{esc(title)}</title><style>{CSS}</style></head>
<body><a class="skip" href="#cover">Skip to content</a><div class="progress" id="prog"></div>
<div class="layout"><nav class="toc">{''.join(toc)}</nav>
<main id="main">{cover}{''.join(secs)}
<footer>SELF-CONTAINED HTML · NO NETWORK CALLS · built by tools/build-dossier.py<br>
Curated public-records bundle. Official filings establish disclosed activity, not motive or causation.
Candidate surfaces are questions and targets, not findings, and must not replace the underlying source.</footer>
</main></div>
<button class="totop" id="totop" aria-label="Back to top">&uarr;</button>
<script>{JS}</script></body></html>"""
    open(out, "w", encoding="utf8").write(doc)
    return len(doc.encode("utf8")), len(sections)


JS = """
const links=[...document.querySelectorAll('nav.toc a')];
const secs=[...document.querySelectorAll('main section')];
// active TOC + reading progress
const prog=document.getElementById('prog');
const obs=new IntersectionObserver(es=>{es.forEach(e=>{if(e.isIntersecting){
 links.forEach(l=>l.setAttribute('aria-current', l.getAttribute('href')==='#'+e.target.id ? 'true':'false'));}})},
 {rootMargin:'-12% 0px -80% 0px'});
secs.forEach(s=>obs.observe(s));
function onScroll(){const h=document.documentElement;const max=h.scrollHeight-h.clientHeight;
 if(prog)prog.style.transform='scaleX('+(max>0?h.scrollTop/max:0)+')';
 const tt=document.getElementById('totop');if(tt)tt.classList.toggle('show',h.scrollTop>600);}
addEventListener('scroll',onScroll,{passive:true});onScroll();
document.getElementById('totop').onclick=()=>scrollTo({top:0,behavior:'smooth'});
// section filter
const tf=document.getElementById('tocfilter');
if(tf)tf.oninput=()=>{const q=tf.value.toLowerCase();
 links.forEach(l=>{if(l.dataset.t===undefined)return;l.classList.toggle('hide',q&&!l.dataset.t.includes(q));});};
// theme toggle (persisted; falls back to OS pref)
const tb=document.getElementById('themebtn');
function curTheme(){return document.documentElement.getAttribute('data-theme')
 || (matchMedia('(prefers-color-scheme: light)').matches?'light':'dark');}
if(tb)tb.onclick=()=>{const next=curTheme()==='dark'?'light':'dark';
 document.documentElement.setAttribute('data-theme',next);
 try{localStorage.setItem('dossier-theme',next);}catch(e){}
 document.querySelector('meta[name=theme-color]').setAttribute('content',next==='dark'?'#0e0e0f':'#f6f3ec');};
try{const saved=localStorage.getItem('dossier-theme');if(saved)document.documentElement.setAttribute('data-theme',saved);}catch(e){}
// table filter + sort
function filterT(inp,id){const q=inp.value.toLowerCase();let n=0;
 document.querySelectorAll('#'+id+' tbody tr').forEach(r=>{const m=r.innerText.toLowerCase().includes(q);
  r.style.display=m?'':'none';if(m)n++;});
 const rc=inp.closest('section').querySelector('.rowcount');if(rc)rc.textContent=n+' rows'+(q?' (filtered)':'');}
function sortT(th){const t=th.closest('table'),tb=t.tBodies[0],i=[...th.parentNode.children].indexOf(th);
 const dir=th.dataset.d==='1'?-1:1;[...t.querySelectorAll('th')].forEach(x=>x.removeAttribute('data-d'));
 th.dataset.d=dir===1?'1':'0';
 [...tb.rows].sort((a,b)=>{const x=a.cells[i].innerText.trim(),y=b.cells[i].innerText.trim();
  const nx=parseFloat(x.replace(/[^0-9.-]/g,'')),ny=parseFloat(y.replace(/[^0-9.-]/g,''));
  if(!isNaN(nx)&&!isNaN(ny)&&x.match(/\\d/)&&y.match(/\\d/))return(nx-ny)*dir;return x.localeCompare(y)*dir;})
  .forEach(r=>tb.appendChild(r));}
// keyboard: / filter, j/k next-prev section, g/G top-bottom, t theme
addEventListener('keydown',e=>{if(e.target.matches('input,textarea'))return;
 if(e.key==='/'){e.preventDefault();tf&&tf.focus();}
 else if(e.key==='t'){tb&&tb.click();}
 else if(e.key==='g'){scrollTo({top:0});}
 else if(e.key==='G'){scrollTo({top:document.body.scrollHeight});}
 else if(e.key==='j'||e.key==='k'){e.preventDefault();
  const y=scrollY+120;let idx=secs.findIndex(s=>s.offsetTop>y);
  if(e.key==='k'){idx=[...secs].reverse().find(s=>s.offsetTop<scrollY-4);idx=idx?secs.indexOf(idx):0;}
  else{idx=idx<0?secs.length-1:idx;}
  const t=secs[Math.max(0,Math.min(secs.length-1,idx))];if(t)t.scrollIntoView({behavior:'smooth'});}});
"""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", required=True); ap.add_argument("--out", required=True)
    ap.add_argument("--title", default=""); ap.add_argument("--subject", default="")
    ap.add_argument("--lede", default="")
    a = ap.parse_args()
    if not CSS:
        print("warning: tools/dossier-style.css not found; output will be unstyled", file=sys.stderr)
    b, n = build(a.src, a.out, a.title, a.subject, a.lede)
    print(f"wrote {a.out}  ({b:,} bytes, {n} sections)")


if __name__ == "__main__":
    main()
