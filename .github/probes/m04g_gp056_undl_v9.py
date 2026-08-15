import gzip
import hashlib
import html
import json
import os
import pathlib
import re
import shutil
import struct
import subprocess
import time
import traceback
import urllib.parse
import zlib

ROOT = pathlib.Path(os.environ.get("QUAL_ROOT", "qualification/gp056-v9"))
BODIES = ROOT / "bodies"
TEXT = ROOT / "text"
META = ROOT / "metadata"
TMP = ROOT / "tmp"
for directory in (ROOT, BODIES, TEXT, META, TMP):
    directory.mkdir(parents=True, exist_ok=True)

RUN_ID = os.environ.get("GITHUB_RUN_ID")
COMMIT_SHA = os.environ.get("GITHUB_SHA")
DEADLINE = time.monotonic() + 8 * 60
MAX_BODY_BYTES = 64 * 1024 * 1024
BROWSER_UA = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/126.0 Safari/537.36"
)
RECORD_ID = "4043890"
FILE_STEM = "1402635_EN"
SYMBOL = "E/ESCWA/CL3.SEP/2023/4"
ESCWA_PDF = (
    "https://www.unescwa.org/sites/default/files/pubs/pdf/"
    "survey-economic-social-developments-arab-region-2022-2023-english_0.pdf"
)
ALLOWED_SUFFIXES = (
    "digitallibrary.un.org",
    "docs.un.org",
    "undocs.org",
    "unescwa.org",
    "web.archive.org",
    "data.commoncrawl.org",
)

STATE = {
    "schema_version": "m04g-gp056-undl-recovery@9",
    "route_id": "M04G-GP056",
    "workflow_run_id": RUN_ID,
    "commit_sha": COMMIT_SHA,
    "started_at_epoch": int(time.time()),
    "requirements": {
        "official_un_or_archived_official_custody": True,
        "record_4043890_or_symbol_e_escwa_cl3_sep_2023_4": True,
        "population_doubling_and_numeric_year_interval_same_window": True,
        "reject_double_digit_false_positive": True,
        "product_files_modified": False,
    },
    "controller": {
        "candidate_write_enabled": False,
        "official_record_id": RECORD_ID,
        "official_file_stem": FILE_STEM,
        "official_symbol": SYMBOL,
        "wall_clock_deadline_seconds": 480,
        "common_crawl_fallback": True,
    },
    "transports": [],
    "common_crawl": {"indexes": [], "queries": [], "warc_records": []},
    "observations": [],
    "errors": [],
    "selected": None,
    "qualified": False,
    "complete": False,
}


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def safe(value):
    return re.sub(r"[^A-Za-z0-9._-]+", "-", value).strip("-")[:170]


def remaining():
    return max(0.0, DEADLINE - time.monotonic())


def persist():
    payload = json.dumps(STATE, indent=2, ensure_ascii=False) + "\n"
    temporary = ROOT / "ledger.json.tmp"
    temporary.write_text(payload)
    temporary.replace(ROOT / "ledger.json")
    (ROOT / "ledger.sha256").write_text(f"{sha256(payload.encode())}  ledger.json\n")


def curl_fetch(url, *, label, timeout=35, accept="*/*", byte_range=None, referer=None):
    if remaining() < 2:
        return {
            "ok": False,
            "status": None,
            "url": url,
            "body": b"",
            "content_type": "",
            "error": "controller deadline reached",
            "elapsed_ms": 0,
            "curl_exit": None,
        }
    timeout = max(2, min(int(timeout), max(2, int(remaining()) - 1)))
    token = safe(f"{label}-{sha256(url.encode())[:12]}")
    body_path = TMP / f"{token}.body"
    header_path = TMP / f"{token}.headers"
    command = [
        "curl",
        "--location",
        "--silent",
        "--show-error",
        "--connect-timeout",
        "10",
        "--max-time",
        str(timeout),
        "--max-filesize",
        str(MAX_BODY_BYTES),
        "--user-agent",
        BROWSER_UA,
        "--header",
        f"Accept: {accept}",
        "--header",
        "Accept-Encoding: identity",
    ]
    if byte_range:
        command.extend(["--range", byte_range])
    if referer:
        command.extend(["--referer", referer])
    command.extend([
        "--dump-header",
        str(header_path),
        "--output",
        str(body_path),
        "--write-out",
        "%{http_code}\n%{url_effective}\n%{content_type}\n%{size_download}\n%{num_redirects}\n",
        url,
    ])
    started = time.monotonic()
    completed = subprocess.run(command, capture_output=True, text=True)
    elapsed_ms = int((time.monotonic() - started) * 1000)
    body = body_path.read_bytes() if body_path.exists() else b""
    headers = header_path.read_bytes() if header_path.exists() else b""
    lines = completed.stdout.splitlines()
    status = int(lines[0]) if lines and lines[0].isdigit() else None
    final_url = lines[1] if len(lines) > 1 else url
    content_type = lines[2] if len(lines) > 2 else ""
    redirect_count = int(lines[4]) if len(lines) > 4 and lines[4].isdigit() else None
    ok = completed.returncode == 0 and status is not None and 200 <= status < 400 and bool(body)
    receipt = {
        "label": label,
        "requested_url": url,
        "final_url": final_url,
        "status": status,
        "content_type": content_type,
        "bytes": len(body),
        "body_sha256": sha256(body) if body else None,
        "headers_sha256": sha256(headers) if headers else None,
        "redirect_count": redirect_count,
        "elapsed_ms": elapsed_ms,
        "curl_exit": completed.returncode,
        "stderr": completed.stderr[-1600:],
        "byte_range": byte_range,
    }
    STATE["transports"].append(receipt)
    (META / f"{token}.json").write_text(json.dumps(receipt, indent=2) + "\n")
    if headers:
        (META / f"{token}.headers").write_bytes(headers)
    persist()
    return {
        "ok": ok,
        "status": status,
        "url": final_url,
        "body": body,
        "headers": headers,
        "content_type": content_type,
        "error": None if ok else (completed.stderr.strip() or f"HTTP {status}"),
        "elapsed_ms": elapsed_ms,
        "curl_exit": completed.returncode,
        "receipt": receipt,
    }


def official_or_archive_url(url):
    try:
        host = (urllib.parse.urlparse(url).hostname or "").lower()
    except Exception:
        return False
    return any(host == suffix or host.endswith("." + suffix) for suffix in ALLOWED_SUFFIXES)


def canonical_original(url):
    parsed = urllib.parse.urlparse(url)
    if (parsed.hostname or "").lower() == "web.archive.org":
        candidate = parsed.path + (("?" + parsed.query) if parsed.query else "")
        match = re.search(r"/web/\d+(?:[a-z_]+)?/(https?://.+)$", candidate, re.I)
        if match:
            return match.group(1)
    return url


def extract_candidates(raw, base_url):
    value = raw.decode("utf-8", errors="replace").replace("\\/", "/")
    found = []
    patterns = [
        r'''(?is)\b(?:href|src)\s*=\s*["']([^"'#]+)["']''',
        r'''(?i)(https?://[^\s"'<>]+)''',
        r'''(?i)(/record/4043890/files/[^\s"'<>]+)''',
        r'''(?i)(/files/1402635_EN[^\s"'<>]*)''',
    ]
    for pattern in patterns:
        for match in re.finditer(pattern, value):
            candidate = html.unescape(match.group(1)).strip().rstrip(".,);]")
            absolute = canonical_original(urllib.parse.urljoin(base_url, candidate))
            if not official_or_archive_url(absolute):
                continue
            lowered = absolute.lower()
            if any(token in lowered for token in (
                "1402635_en", ".pdf", "/download", "4043890", "cl3.sep", "escwa",
            )):
                found.append(absolute)
    return list(dict.fromkeys(found))[:40]


def html_to_text(raw):
    value = raw.decode("utf-8", errors="replace")
    value = re.sub(r"(?is)<script\b[^>]*>.*?</script>", " ", value)
    value = re.sub(r"(?is)<style\b[^>]*>.*?</style>", " ", value)
    value = re.sub(r"(?s)<[^>]+>", " ", value)
    return re.sub(r"\s+", " ", html.unescape(value)).strip()


def pdf_to_text(raw, key):
    pdf_path = BODIES / f"{key}.pdf"
    layout_path = TEXT / f"{key}-layout.txt"
    plain_path = TEXT / f"{key}-plain.txt"
    pdf_path.write_bytes(raw)
    if not shutil.which("pdftotext"):
        return "", "pdftotext unavailable"
    outputs = []
    errors = []
    for args, target in ((["-layout"], layout_path), ([], plain_path)):
        try:
            completed = subprocess.run(
                ["pdftotext", *args, str(pdf_path), str(target)],
                capture_output=True,
                text=True,
                timeout=max(2, min(45, max(2, int(remaining()) - 1))),
            )
        except Exception as error:
            errors.append(f"{type(error).__name__}: {error}")
            continue
        if completed.returncode != 0:
            errors.append(f"pdftotext exit {completed.returncode}: {completed.stderr[:1000]}")
            continue
        text = target.read_text(errors="replace") if target.exists() else ""
        if text:
            outputs.append(text)
    if not outputs:
        return "", "; ".join(errors) or "no text output"
    combined = outputs[0]
    if len(outputs) > 1 and outputs[1] != outputs[0]:
        combined += "\n\n--- PLAIN EXTRACTION ---\n\n" + outputs[1]
    return combined, "; ".join(errors) if errors else None


def semantic_gp056(text):
    compact = re.sub(r"\s+", " ", text)
    populations = list(re.finditer(r"\bpopulation\b", compact, re.I))
    doublings = list(re.finditer(
        r"\b(?:double|doubles|doubled|doubling)\b(?![\s-]*digit)", compact, re.I
    ))
    intervals = list(re.finditer(
        r"\b(?:[1-9]\d{0,2}(?:\.\d+)?)\s+(?:year|years)\b", compact, re.I
    ))
    matches = []
    for doubling in doublings:
        population = min(
            populations,
            key=lambda item: abs(item.start() - doubling.start()),
            default=None,
        )
        interval = min(
            intervals,
            key=lambda item: abs(item.start() - doubling.start()),
            default=None,
        )
        if population is None or interval is None:
            continue
        population_distance = abs(population.start() - doubling.start())
        interval_distance = abs(interval.start() - doubling.start())
        if population_distance > 700 or interval_distance > 700:
            continue
        start = max(0, min(population.start(), doubling.start(), interval.start()) - 500)
        end = min(len(compact), max(population.end(), doubling.end(), interval.end()) + 750)
        window = compact[start:end]
        if re.search(r"\bdouble[\s-]*digit\b", window, re.I):
            continue
        matches.append({
            "distance": max(population_distance, interval_distance),
            "interval": interval.group(0),
            "window": window,
        })
    matches.sort(key=lambda row: row["distance"])
    return {
        "matched": bool(matches),
        "population_count": len(populations),
        "exact_doubling_count": len(doublings),
        "numeric_interval_count": len(intervals),
        "nearest_distance": matches[0]["distance"] if matches else None,
        "intervals": [row["interval"] for row in matches[:10]],
        "windows": [row["window"] for row in matches[:10]],
    }


def inspect_body(label, source, response):
    raw = response.get("body", b"")
    if not raw:
        STATE["errors"].append({
            "phase": "empty_or_failed_body",
            "label": label,
            "source": source,
            "status": response.get("status"),
            "error": response.get("error"),
        })
        persist()
        return None, []
    content_hash = sha256(raw)
    if content_hash in {row.get("content_sha256") for row in STATE["observations"]}:
        return None, []
    key = safe(f"M04G-GP056-{label}-{len(STATE['observations']):03d}")
    is_pdf = raw.startswith(b"%PDF-") or "application/pdf" in response.get("content_type", "").lower()
    text_error = None
    if is_pdf:
        text, text_error = pdf_to_text(raw, key)
    else:
        (BODIES / f"{key}.body").write_bytes(raw)
        text = html_to_text(raw)
        (TEXT / f"{key}.txt").write_text(text)
    semantic = semantic_gp056(text)
    canonical = canonical_original(response.get("url") or source.get("requested_url") or "")
    custody_host = (urllib.parse.urlparse(canonical).hostname or "").lower()
    official_custody = any(
        custody_host == suffix or custody_host.endswith("." + suffix)
        for suffix in ("digitallibrary.un.org", "docs.un.org", "undocs.org", "unescwa.org")
    )
    if source.get("kind", "").startswith("common_crawl") or source.get("kind", "").startswith("wayback"):
        original = source.get("original_url") or canonical
        original_host = (urllib.parse.urlparse(original).hostname or "").lower()
        official_custody = any(
            original_host == suffix or original_host.endswith("." + suffix)
            for suffix in ("digitallibrary.un.org", "docs.un.org", "undocs.org", "unescwa.org")
        )
    record_markers = {
        "record_id": RECORD_ID in text or RECORD_ID in json.dumps(source),
        "file_stem": FILE_STEM.lower() in text.lower() or FILE_STEM.lower() in json.dumps(source).lower(),
        "symbol": SYMBOL.lower() in text.lower() or SYMBOL.lower() in json.dumps(source).lower(),
        "title": "survey of economic and social developments in the arab region 2022-2023" in text.lower(),
    }
    row = {
        "route_id": "M04G-GP056",
        "key": key,
        "source": source,
        "requested_url": source.get("requested_url"),
        "status": response.get("status"),
        "final_url": response.get("url"),
        "content_type": response.get("content_type"),
        "bytes": len(raw),
        "content_sha256": content_hash,
        "pdf": is_pdf,
        "text_bytes": len(text.encode()),
        "text_sha256": sha256(text.encode()) if text else None,
        "text_error": text_error,
        "official_custody": official_custody,
        "record_markers": record_markers,
        "semantic": semantic,
        "text_prefix": re.sub(r"\s+", " ", text[:2200]),
    }
    linked = [] if is_pdf else extract_candidates(raw, response.get("url") or source.get("requested_url") or "")
    row["linked_candidates"] = linked
    STATE["observations"].append(row)
    persist()
    return row, linked


def parse_cdx_lines(raw):
    rows = []
    for line in raw.decode("utf-8", errors="replace").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            rows.append(json.loads(line))
        except json.JSONDecodeError:
            continue
    return rows


def common_crawl_indexes():
    endpoint = "https://index.commoncrawl.org/collinfo.json"
    response = curl_fetch(endpoint, label="cc-collinfo", timeout=30, accept="application/json")
    if not response.get("ok"):
        return []
    try:
        all_indexes = json.loads(response["body"])
    except Exception as error:
        STATE["errors"].append({"phase": "cc_collinfo_parse", "error": f"{type(error).__name__}: {error}"})
        persist()
        return []
    selected = []
    by_year = {}
    for index in all_indexes:
        match = re.search(r"CC-MAIN-(\d{4})", index.get("id", ""))
        if match:
            by_year.setdefault(match.group(1), []).append(index)
    for year in ("2026", "2025", "2024", "2023", "2022"):
        items = by_year.get(year, [])
        if not items:
            continue
        selected.append(items[0])
        if len(items) > 1:
            selected.append(items[-1])
    deduped = []
    seen = set()
    for index in selected:
        if index.get("id") not in seen:
            seen.add(index.get("id"))
            deduped.append(index)
    STATE["common_crawl"]["indexes"] = [item.get("id") for item in deduped]
    persist()
    return deduped


def query_common_crawl(url, indexes):
    rows = []
    for index in indexes:
        if remaining() < 120:
            break
        endpoint = index["cdx-api"] + "?" + urllib.parse.urlencode({
            "url": url,
            "output": "json",
            "filter": "status:200",
            "collapse": "digest",
            "limit": "10",
        })
        response = curl_fetch(endpoint, label=f"cc-query-{index['id']}", timeout=25, accept="application/json")
        parsed = parse_cdx_lines(response.get("body", b"")) if response.get("body") else []
        receipt = {
            "index": index.get("id"),
            "url": url,
            "endpoint": endpoint,
            "status": response.get("status"),
            "row_count": len(parsed),
            "rows": parsed,
            "error": response.get("error"),
        }
        STATE["common_crawl"]["queries"].append(receipt)
        rows.extend(parsed)
        persist()
        if rows:
            break
    deduped = {}
    for row in rows:
        key = (row.get("digest"), row.get("filename"), row.get("offset"), row.get("length"))
        deduped[key] = row
    return list(deduped.values())


def parse_warc_record(raw):
    decompressed = gzip.decompress(raw)
    first = decompressed.find(b"\r\n\r\n")
    sep = 4
    if first < 0:
        first = decompressed.find(b"\n\n")
        sep = 2
    warc_header = decompressed[:first] if first >= 0 else b""
    remainder = decompressed[first + sep:] if first >= 0 else decompressed
    second = remainder.find(b"\r\n\r\n")
    sep2 = 4
    if second < 0:
        second = remainder.find(b"\n\n")
        sep2 = 2
    http_header = remainder[:second] if second >= 0 else b""
    body = remainder[second + sep2:] if second >= 0 else remainder
    headers = {}
    status = None
    lines = http_header.decode("latin-1", errors="replace").splitlines()
    if lines:
        match = re.search(r"\s(\d{3})\s", lines[0] + " ")
        if match:
            status = int(match.group(1))
    for line in lines[1:]:
        if ":" in line:
            name, value = line.split(":", 1)
            headers[name.lower().strip()] = value.strip()
    return {
        "warc_header": warc_header,
        "http_header": http_header,
        "status": status,
        "headers": headers,
        "body": body,
    }


def fetch_common_crawl_row(row, number):
    try:
        offset = int(row["offset"])
        length = int(row["length"])
        filename = row["filename"]
    except Exception as error:
        STATE["errors"].append({"phase": "cc_row_fields", "row": row, "error": str(error)})
        persist()
        return None
    url = "https://data.commoncrawl.org/" + filename
    response = curl_fetch(
        url,
        label=f"cc-warc-{number}",
        timeout=50,
        accept="application/warc,*/*",
        byte_range=f"{offset}-{offset + length - 1}",
    )
    if not response.get("ok"):
        return None
    try:
        record = parse_warc_record(response["body"])
    except Exception as error:
        STATE["errors"].append({
            "phase": "cc_warc_parse",
            "row": row,
            "error": f"{type(error).__name__}: {error}",
        })
        persist()
        return None
    token = safe(f"cc-{row.get('timestamp', 'na')}-{number}")
    (META / f"{token}.warc-header").write_bytes(record["warc_header"])
    (META / f"{token}.http-header").write_bytes(record["http_header"])
    receipt = {
        "row": row,
        "status": record["status"],
        "headers": record["headers"],
        "body_bytes": len(record["body"]),
        "body_sha256": sha256(record["body"]) if record["body"] else None,
    }
    STATE["common_crawl"]["warc_records"].append(receipt)
    persist()
    return {
        "ok": bool(record["body"]),
        "status": record["status"],
        "url": row.get("url") or row.get("original") or ESCWA_PDF,
        "body": record["body"],
        "headers": record["http_header"],
        "content_type": record["headers"].get("content-type", row.get("mime", "")),
        "error": None,
        "elapsed_ms": response.get("elapsed_ms"),
        "curl_exit": response.get("curl_exit"),
    }


def add_queue(queue, seen, url, source):
    if not url:
        return
    url = url.replace("http://web.archive.org/", "https://web.archive.org/")
    if url in seen:
        return
    seen.add(url)
    queue.append((url, source))


def select():
    matches = [
        row for row in STATE["observations"]
        if row.get("official_custody")
        and row.get("semantic", {}).get("matched")
        and any(row.get("record_markers", {}).values())
    ]
    matches.sort(key=lambda row: (
        0 if row.get("pdf") else 1,
        row.get("semantic", {}).get("nearest_distance") or 10**9,
        -int(row.get("text_bytes") or 0),
    ))
    STATE["selected"] = matches[0] if matches else None
    STATE["qualified"] = bool(matches)
    persist()


def run():
    queue = []
    seen = set()
    seeds = [
        f"https://digitallibrary.un.org/record/{RECORD_ID}?ln=en",
        f"https://digitallibrary.un.org/record/{RECORD_ID}?ln=ar",
        f"https://digitallibrary.un.org/record/{RECORD_ID}?of=recjson",
        f"https://digitallibrary.un.org/record/{RECORD_ID}/export/json",
        f"https://digitallibrary.un.org/api/records/{RECORD_ID}",
        f"https://digitallibrary.un.org/record/{RECORD_ID}/files/{FILE_STEM}.pdf",
        f"https://digitallibrary.un.org/record/{RECORD_ID}/files/{FILE_STEM}.pdf?download=1",
        f"https://digitallibrary.un.org/record/{RECORD_ID}/files/{FILE_STEM}.pdf?ln=en",
        f"https://docs.un.org/en/{SYMBOL}",
        f"https://docs.un.org/en/{SYMBOL}/download",
        f"https://undocs.org/{SYMBOL}",
        "https://doi.org/10.18356/9789213589700",
        ESCWA_PDF,
        "https://web.archive.org/web/20240710090350id_/" + ESCWA_PDF,
        "https://web.archive.org/web/20240710090350/" + ESCWA_PDF,
    ]
    for url in seeds:
        add_queue(queue, seen, url, {"kind": "official_seed", "requested_url": url})
    successes = 0
    while queue and remaining() > 150 and successes < 18:
        url, source = queue.pop(0)
        response = curl_fetch(
            url,
            label=f"official-{successes}-{len(STATE['transports'])}",
            timeout=40,
            accept="application/pdf,application/json,text/html,application/xml,*/*;q=0.8",
            referer=f"https://digitallibrary.un.org/record/{RECORD_ID}?ln=en",
        )
        source = {**source, "requested_url": url}
        if not response.get("ok"):
            STATE["errors"].append({
                "phase": "official_fetch",
                "source": source,
                "status": response.get("status"),
                "error": response.get("error"),
            })
            persist()
            continue
        row, linked = inspect_body(f"official-{successes}", source, response)
        if row:
            successes += 1
        for candidate in linked:
            add_queue(queue, seen, candidate, {
                "kind": "official_link",
                "discovered_from": response.get("url"),
                "requested_url": candidate,
            })

    select()
    if STATE["qualified"] or remaining() < 100:
        return

    indexes = common_crawl_indexes()
    cc_targets = [
        ESCWA_PDF,
        f"https://digitallibrary.un.org/record/{RECORD_ID}/files/{FILE_STEM}.pdf",
    ]
    for target in cc_targets:
        if remaining() < 90:
            break
        rows = query_common_crawl(target, indexes)
        for number, row in enumerate(rows[:4]):
            if remaining() < 45:
                break
            response = fetch_common_crawl_row(row, number)
            if not response:
                continue
            inspect_body(
                f"common-crawl-{number}",
                {
                    "kind": "common_crawl_official_capture",
                    "original_url": row.get("url") or target,
                    "capture": row,
                    "requested_url": row.get("url") or target,
                },
                response,
            )
        select()
        if STATE["qualified"]:
            break


persist()
try:
    run()
except Exception as error:
    STATE["controller_error"] = {
        "type": type(error).__name__,
        "message": str(error),
        "traceback": traceback.format_exc()[-10000:],
    }
finally:
    select()
    STATE["complete"] = True
    STATE["finished_at_epoch"] = int(time.time())
    STATE["remaining_deadline_seconds"] = int(remaining())
    STATE["candidate_write_enabled"] = False
    STATE["product_files_modified"] = False
    persist()
    print(json.dumps({
        "qualified": STATE["qualified"],
        "selected": (
            {
                "final_url": STATE["selected"].get("final_url"),
                "content_sha256": STATE["selected"].get("content_sha256"),
                "text_sha256": STATE["selected"].get("text_sha256"),
                "intervals": STATE["selected"].get("semantic", {}).get("intervals"),
            }
            if STATE["selected"] else None
        ),
        "observations": len(STATE["observations"]),
        "errors": len(STATE["errors"]),
        "product_files_modified": False,
    }, indent=2))
