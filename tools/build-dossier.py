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

    toc = [f'<div class="brand">{esc(subject.split("—")[0].strip()[:22]).upper()}</div>'
           f'<div class="eyebrow">Reporting Bundle</div>', '<a href="#cover">00 · Start Here</a>']
    toc += [f'<a href="#{s["id"]}">{k+1:02d} · {esc(s["title"])[:40]}</a>' for k, s in enumerate(sections)]

    prov = f'<div class="card"><div class="lbl">Provenance &amp; boundary</div>{md(read(readme))}</div>' if readme else ""
    funnel_links = " · ".join(f'<a href="#{s["id"]}">{esc(s["title"])[:28]}</a>' for s in sections[:5])
    cover = f"""
<section id="cover" class="cover">
  <div class="eyebrow">Public-Records Reporting Bundle</div>
  <h1>{esc(title)}</h1>
  <div class="lede">{esc(lede)}</div>
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
        body = md(read(s["file"])) if s["type"] == "md" else csv_table(read(s["file"]), s["id"] + "t")
        secs.append(f'<section id="{s["id"]}"><div class="sec-eyebrow">{k+1:02d} · '
                    f'{"document" if s["type"]=="md" else "ledger"}</div>{body}</section>')

    doc = f"""<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow">
<title>{esc(title)}</title><style>{CSS}</style></head>
<body><div class="layout"><nav class="toc">{''.join(toc)}</nav>
<main>{cover}{''.join(secs)}
<footer>SELF-CONTAINED HTML · NO NETWORK CALLS · built by tools/build-dossier.py<br>
Curated public-records bundle. Official filings establish disclosed activity, not motive or causation.
Candidate surfaces are questions and targets, not findings, and must not replace the underlying source.</footer>
</main></div><script>{JS}</script></body></html>"""
    open(out, "w", encoding="utf8").write(doc)
    return len(doc.encode("utf8")), len(sections)


JS = """
const links=[...document.querySelectorAll('nav.toc a')];
const obs=new IntersectionObserver(es=>{es.forEach(e=>{if(e.isIntersecting){
 links.forEach(l=>l.classList.toggle('active',l.getAttribute('href')==='#'+e.target.id));}})},{rootMargin:'-10% 0px -80% 0px'});
document.querySelectorAll('main section').forEach(s=>obs.observe(s));
function filterT(inp,id){const q=inp.value.toLowerCase();
 document.querySelectorAll('#'+id+' tbody tr').forEach(r=>{r.style.display=r.innerText.toLowerCase().includes(q)?'':'none';});}
function sortT(th){const t=th.closest('table'),tb=t.tBodies[0],i=[...th.parentNode.children].indexOf(th);
 const dir=th.dataset.d==='1'?-1:1;th.dataset.d=dir===1?'1':'0';
 [...tb.rows].sort((a,b)=>{const x=a.cells[i].innerText.trim(),y=b.cells[i].innerText.trim();
  const nx=parseFloat(x.replace(/[^0-9.-]/g,'')),ny=parseFloat(y.replace(/[^0-9.-]/g,''));
  if(!isNaN(nx)&&!isNaN(ny))return(nx-ny)*dir;return x.localeCompare(y)*dir;}).forEach(r=>tb.appendChild(r));}
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
