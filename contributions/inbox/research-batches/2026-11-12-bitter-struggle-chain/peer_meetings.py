"""Count ministers' meetings rows per AI company across every return held, for a denominator to Anthropic's sixteen."""
import csv, glob, io, json, os, re, sys, collections
SRC = 'S:/Scratch/Runs/Clifford-Lens-Research-20261110/balance/uk/meetings'
LABS = {
 'Anthropic': r'\banthropic\b', 'OpenAI': r'\bopen\s?ai\b', 'Google DeepMind': r'\bdeep\s?mind\b',
 'Google (other)': r'\bgoogle\b(?!\s*deep\s?mind)', 'Microsoft': r'\bmicrosoft\b', 'Meta': r'\bmeta\b(?!\s*data)', 'Amazon or AWS': r'\bamazon\b|\baws\b',
 'Cohere': r'\bcohere\b', 'Mistral': r'\bmistral\b', 'Nvidia': r'\bnvidia\b', 'CoreWeave': r'\bcore\s?weave\b', 'Scale AI': r'\bscale ai\b|alexandr wang',
 'Palantir': r'\bpalantir\b', 'Faculty': r'\bfaculty( ai)?\b(?! of)', 'xAI': r'\bxai\b|\bx\.ai\b', 'Stability AI': r'\bstability ai\b',
}
MONTHS = {m: i + 1 for i, m in enumerate(['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'])}
def day(cells):
    for c in cells:
        c = c.strip()
        m = re.match(r'^(\d{4})-(\d{2})-(\d{2})', c)
        if m: return f'{m[1]}-{m[2]}-{m[3]}'
        m = re.match(r'^(\d{1,2})/(\d{1,2})/(\d{2,4})$', c)
        if m:
            y = int(m[3]); y += 2000 if y < 100 else 0
            return f'{y:04d}-{int(m[2]):02d}-{int(m[1]):02d}'
        m = re.match(r'^(\d{1,2})[ -]([A-Za-z]{3})[a-z]*[ -](\d{2,4})$', c)
        if m and m[2].lower() in MONTHS:
            y = int(m[3]); y += 2000 if y < 100 else 0
            return f'{y:04d}-{MONTHS[m[2].lower()]:02d}-{int(m[1]):02d}'
    return None
seen = set(); rows = []
for path in sorted(glob.glob(SRC + '/*.csv')):
    raw = open(path, 'rb').read()
    for enc in ('utf-8-sig', 'cp1252', 'latin-1'):
        try: text = raw.decode(enc); break
        except UnicodeDecodeError: continue
    for cells in csv.reader(io.StringIO(text, newline='')):
        if len(cells) < 3: continue
        d = day(cells)
        if not d: continue
        org_cells = ' | '.join(cells[1:])
        low = org_cells.lower()
        for lab, rx in LABS.items():
            # match on the organisation cell only: the cell after the date, when one exists
            idx = next((i for i, c in enumerate(cells) if day([c])), None)
            org = cells[idx + 1] if idx is not None and idx + 1 < len(cells) else ''
            if re.search(rx, org.lower()):
                key = (cells[0].strip().lower(), d, lab, re.sub(r'\s+', ' ', org.strip().lower())[:60])
                if key in seen: continue
                seen.add(key)
                rows.append({'minister': cells[0].strip(), 'date': d, 'lab': lab, 'org_cell': org.strip()[:160], 'purpose': (cells[idx + 2].strip() if idx + 2 < len(cells) else '')[:300], 'file': os.path.basename(path)})
rows.sort(key=lambda r: (r['date'], r['lab']))
json.dump(rows, open(os.path.join(os.path.dirname(__file__), 'peer-meetings.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
def count(lo, hi):
    c = collections.Counter(r['lab'] for r in rows if lo <= r['date'] <= hi); return c
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
for label, lo, hi in [('all returns 2023-04-01 to 2026-06-30', '2023-04-01', '2026-06-30'), ('plan drafting 2024-07-26 to 2025-01-12', '2024-07-26', '2025-01-12'),
                      ('from publication to first memorandum 2025-01-13 to 2025-02-13', '2025-01-13', '2025-02-13')]:
    print(label); print('  ' + ', '.join(f'{k} {v}' for k, v in count(lo, hi).most_common()))
print('drafting-window rows:')
for r in rows:
    if '2024-07-26' <= r['date'] <= '2025-01-12': print('  ', r['date'], '|', r['minister'][:16], '|', r['lab'], '|', r['org_cell'][:50], '|', r['purpose'][:120])
