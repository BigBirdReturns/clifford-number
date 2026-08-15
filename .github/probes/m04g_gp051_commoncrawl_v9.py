import gzip
import hashlib
import html
import json
import os
import pathlib
import re
import shutil
import subprocess
import time
import traceback
import urllib.parse

ROOT = pathlib.Path(os.environ.get("QUAL_ROOT", "qualification/gp051-v9"))
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
ROUTE_ID = "M04G-GP051"
ROUTES = [
    "https://www.unescwa.org/file/323820/download",
    "http://www.unescwa.org/file/323820/download",
    "https://unescwa.org/file/323820/download",
    "http://unescwa.org/file/323820/download",
]
QUERY_TARGETS = [
    "www.unescwa.org/file/323820/download",
    "unescwa.org/file/323820/download",
]
PREFIX_TARGETS = [
    "www.unescwa.org/file/323820/",
    "unescwa.org/file/323820/",
]
OFFICIAL_SUFFIXES = (
    "unescwa.org",
    "archive.unescwa.org",
    "documents.un.org",
    "docs.un.org",
    "digitallibrary.un.org",
)

STATE = {
    "schema_version": "m04g-gp051-commoncrawl-recovery@9",
    "route_id": ROUTE_ID,
    "workflow_run_id": RUN_ID,
    "commit_sha": COMMIT_SHA,
    "started_at_epoch": int(time.time()),
    "requirements": {
        "original_route_or_redirect_custody": True,
        "official_or_archived_official_body": True,
        "numeric_health_workforce_density_per_1000_and_2030_same_window": True,
        "discovery_only_sources_not_admissible": True,
        "product_files_modified": False,
    },
    "controller": {
        "candidate_write_enabled": False,
        "wall_clock_deadline_seconds": 480,
        "common_crawl_redirect_index": True,
        "common_crawl_warc_range_fetch": True,
        "jina_discovery_only": True,
    },
    "indexes": [],
    "index_queries": [],
    "warc_records": [],
    "redirects": [],
    "discovery": [],
    "transports": [],
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


def curl_fetch(url, *, label, timeout=30, accept="*/*", byte_range=None, referer=None):
    if remaining() < 2:
        return {
            "ok": False,
            "status": None,
            "url": url,
            "body": b"",
            "headers": b"",
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


def official_url(url):
    try:
        host = (urllib.parse.urlparse(url).hostname or "").lower()
    except Exception:
        return False
    return any(host == suffix or host.endswith("." + suffix) for suffix in OFFICIAL_SUFFIXES)


def html_to_text(raw):
    value = raw.decode("utf-8", errors="replace")
    value = re.sub(r"(?is)<script\b[^>]*>.*?</script>", " ", value)
    value = re.sub(r"(?is)<style\b[^>]*>.*?</style>", " ", value)
    value = re.sub(r"(?s)<[^>]+>", " ", value)
    return re.sub(r"\s+", " ", html.unescape(value)).strip()


def extract_urls(raw, base_url, *, official_only=False):
    value = raw.decode("utf-8", errors="replace").replace("\\/", "/")
    found = []
    patterns = [
        r'''(?is)\b(?:href|src)\s*=\s*["']([^"'#]+)["']''',
        r'''(?i)(https?://[^\s"'<>]+)''',
        r'''(?i)(/sites/default/files/[^\s"'<>]+)''',
        r'''(?i)(/file/\d+/download[^\s"'<>]*)''',
    ]
    for pattern in patterns:
        for match in re.finditer(pattern, value):
            candidate = html.unescape(match.group(1)).strip().rstrip(".,);]")
            absolute = urllib.parse.urljoin(base_url, candidate)
            if official_only and not official_url(absolute):
                continue
            found.append(absolute)
    return list(dict.fromkeys(found))[:80]


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


def numeric_values(fragment):
    values = []
    for token in re.findall(r"(?<![\d,])(?:0?\.\d+|\d{1,4}(?:\.\d+)?)(?![\d,])", fragment):
        try:
            number = float(token)
        except ValueError:
            continue
        if number in (1000.0, 2030.0) or number > 100:
            continue
        values.append(token)
    return values


def semantic_gp051(text):
    compact = re.sub(r"\s+", " ", text)
    terms = list(re.finditer(
        r"\b(?:physician|physicians|doctor|doctors|medical doctor|medical doctors|"
        r"health workforce|health-care workforce|healthcare workforce)\b",
        compact,
        re.I,
    ))
    densities = list(re.finditer(
        r"(?:\bper\s+(?:1[\s,]?000|one\s+thousand|thousand)\b|"
        r"\b(?:1[\s,]?000|one\s+thousand|thousand)\s+"
        r"(?:people|persons|population|inhabitants)\b)",
        compact,
        re.I,
    ))
    matches = []
    for term in terms:
        for density in densities:
            distance = abs(term.start() - density.start())
            if distance > 650:
                continue
            values = numeric_values(
                compact[max(0, density.start() - 220):min(len(compact), density.end() + 220)]
            )
            if not values:
                continue
            start = max(0, min(term.start(), density.start()) - 1000)
            end = min(len(compact), max(term.end(), density.end()) + 1000)
            window = compact[start:end]
            if not re.search(r"\b2030\b", window):
                continue
            matches.append({
                "distance": distance,
                "values": values[:10],
                "window": window,
            })
    matches.sort(key=lambda row: row["distance"])
    return {
        "matched": bool(matches),
        "health_term_count": len(terms),
        "density_term_count": len(densities),
        "has_2030": bool(re.search(r"\b2030\b", compact)),
        "nearest_distance": matches[0]["distance"] if matches else None,
        "density_values": [row["values"] for row in matches[:10]],
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
    key = safe(f"{ROUTE_ID}-{label}-{len(STATE['observations']):03d}")
    is_pdf = raw.startswith(b"%PDF-") or "application/pdf" in response.get("content_type", "").lower()
    text_error = None
    if is_pdf:
        text, text_error = pdf_to_text(raw, key)
    else:
        (BODIES / f"{key}.body").write_bytes(raw)
        text = html_to_text(raw)
        (TEXT / f"{key}.txt").write_text(text)
    semantic = semantic_gp051(text)
    original_url = source.get("original_url") or source.get("requested_url") or response.get("url") or ""
    custody_url = original_url if source.get("kind", "").startswith("common_crawl") else (response.get("url") or original_url)
    official_custody = official_url(custody_url)
    route_marker = (
        "323820" in json.dumps(source)
        or "323820" in (response.get("url") or "")
        or "323820" in text
    )
    row = {
        "route_id": ROUTE_ID,
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
        "route_marker": route_marker,
        "semantic": semantic,
        "text_prefix": re.sub(r"\s+", " ", text[:2200]),
    }
    linked = [] if is_pdf else extract_urls(raw, response.get("url") or original_url, official_only=True)
    row["linked_official_urls"] = linked
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


def select_indexes():
    endpoint = "https://index.commoncrawl.org/collinfo.json"
    response = curl_fetch(endpoint, label="cc-collinfo", timeout=30, accept="application/json")
    if not response.get("ok"):
        return []
    try:
        all_indexes = json.loads(response["body"])
    except Exception as error:
        STATE["errors"].append({"phase": "collinfo_parse", "error": f"{type(error).__name__}: {error}"})
        persist()
        return []
    by_year = {}
    for index in all_indexes:
        match = re.search(r"CC-MAIN-(\d{4})", index.get("id", ""))
        if match and 2014 <= int(match.group(1)) <= 2026:
            by_year.setdefault(match.group(1), []).append(index)
    selected = []
    for year in sorted(by_year, reverse=True):
        items = by_year[year]
        selected.append(items[0])
        if len(items) > 1:
            selected.append(items[-1])
    deduped = []
    seen = set()
    for index in selected:
        if index.get("id") not in seen:
            seen.add(index.get("id"))
            deduped.append(index)
    STATE["indexes"] = [index.get("id") for index in deduped]
    persist()
    return deduped


def query_index(index, target, *, prefix=False):
    params = {
        "url": target,
        "output": "json",
        "collapse": "digest",
        "limit": "100",
    }
    if prefix:
        params["matchType"] = "prefix"
    endpoint = index["cdx-api"] + "?" + urllib.parse.urlencode(params)
    response = curl_fetch(endpoint, label=f"cc-query-{index['id']}", timeout=24, accept="application/json")
    rows = parse_cdx_lines(response.get("body", b"")) if response.get("body") else []
    receipt = {
        "index": index.get("id"),
        "target": target,
        "prefix": prefix,
        "endpoint": endpoint,
        "status": response.get("status"),
        "row_count": len(rows),
        "rows": rows,
        "error": response.get("error"),
    }
    STATE["index_queries"].append(receipt)
    persist()
    return rows


def query_routes(indexes):
    rows = []
    hits = 0
    for index in indexes:
        if remaining() < 185:
            break
        for target in QUERY_TARGETS:
            current = query_index(index, target, prefix=False)
            rows.extend({**row, "index": index.get("id")} for row in current)
            hits += len(current)
            if remaining() < 185:
                break
        if hits >= 20:
            break
    if not rows and remaining() > 200:
        for index in indexes[:8]:
            for target in PREFIX_TARGETS:
                current = query_index(index, target, prefix=True)
                rows.extend({**row, "index": index.get("id")} for row in current)
                if remaining() < 160:
                    break
            if rows or remaining() < 160:
                break
    deduped = {}
    for row in rows:
        key = (row.get("digest"), row.get("filename"), row.get("offset"), row.get("length"))
        deduped[key] = row
    return list(deduped.values())


def decode_chunked(body):
    output = bytearray()
    position = 0
    while position < len(body):
        line_end = body.find(b"\r\n", position)
        if line_end < 0:
            raise ValueError("invalid chunk size line")
        size_token = body[position:line_end].split(b";", 1)[0]
        size = int(size_token, 16)
        position = line_end + 2
        if size == 0:
            return bytes(output)
        output.extend(body[position:position + size])
        position += size + 2
    return bytes(output)


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
    if "chunked" in headers.get("transfer-encoding", "").lower():
        try:
            body = decode_chunked(body)
        except Exception:
            pass
    if "gzip" in headers.get("content-encoding", "").lower() and not body.startswith(b"%PDF-"):
        try:
            body = gzip.decompress(body)
        except Exception:
            pass
    return {
        "warc_header": warc_header,
        "http_header": http_header,
        "status": status,
        "headers": headers,
        "body": body,
    }


def fetch_warc(row, number):
    try:
        offset = int(row["offset"])
        length = int(row["length"])
        filename = row["filename"]
    except Exception as error:
        STATE["errors"].append({"phase": "warc_row_fields", "row": row, "error": str(error)})
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
            "phase": "warc_parse",
            "row": row,
            "error": f"{type(error).__name__}: {error}",
        })
        persist()
        return None
    token = safe(f"cc-{row.get('timestamp', 'na')}-{number}")
    (META / f"{token}.warc-header").write_bytes(record["warc_header"])
    (META / f"{token}.http-header").write_bytes(record["http_header"])
    original_url = row.get("url") or row.get("original") or ROUTES[0]
    redirect = row.get("redirect") or record["headers"].get("location")
    resolved_redirect = urllib.parse.urljoin(original_url, redirect) if redirect else None
    receipt = {
        "row": row,
        "status": record["status"],
        "headers": record["headers"],
        "body_bytes": len(record["body"]),
        "body_sha256": sha256(record["body"]) if record["body"] else None,
        "redirect": redirect,
        "resolved_redirect": resolved_redirect,
    }
    STATE["warc_records"].append(receipt)
    if resolved_redirect:
        STATE["redirects"].append({
            "kind": "common_crawl_redirect",
            "from": original_url,
            "to": resolved_redirect,
            "status": record["status"] or row.get("status"),
            "capture": row,
        })
    persist()
    return {
        "record": record,
        "response": {
            "ok": bool(record["body"]),
            "status": record["status"],
            "url": original_url,
            "body": record["body"],
            "headers": record["http_header"],
            "content_type": record["headers"].get("content-type", row.get("mime", "")),
            "error": None,
            "elapsed_ms": response.get("elapsed_ms"),
            "curl_exit": response.get("curl_exit"),
        },
        "redirect": resolved_redirect,
    }


def discovery_pass():
    discovered = []
    for route in ROUTES:
        if remaining() < 90:
            break
        url = "https://r.jina.ai/http://" + route.split("//", 1)[1]
        response = curl_fetch(url, label="jina-discovery", timeout=35, accept="text/plain,text/markdown,*/*")
        text = response.get("body", b"").decode("utf-8", errors="replace")
        urls = extract_urls(response.get("body", b""), route, official_only=True) if response.get("body") else []
        receipt = {
            "kind": "jina_discovery_only",
            "requested_url": url,
            "route": route,
            "status": response.get("status"),
            "body_sha256": sha256(response.get("body", b"")) if response.get("body") else None,
            "text_prefix": re.sub(r"\s+", " ", text[:2200]),
            "official_urls": urls,
            "admissible": False,
        }
        STATE["discovery"].append(receipt)
        discovered.extend(urls)
        persist()
    return list(dict.fromkeys(discovered))


def fetch_live_official(url, source, number):
    response = curl_fetch(
        url,
        label=f"live-official-{number}",
        timeout=40,
        accept="application/pdf,text/html,*/*;q=0.8",
        referer=ROUTES[0],
    )
    if not response.get("ok"):
        STATE["errors"].append({
            "phase": "live_official_fetch",
            "source": source,
            "requested_url": url,
            "status": response.get("status"),
            "error": response.get("error"),
        })
        persist()
        return []
    _, linked = inspect_body(
        f"live-{number}",
        {**source, "requested_url": url},
        response,
    )
    return linked


def select():
    matches = [
        row for row in STATE["observations"]
        if row.get("official_custody")
        and row.get("route_marker")
        and row.get("semantic", {}).get("matched")
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
    live_targets = [
        *ROUTES,
        "https://www.unescwa.org/file/323820",
        "https://unescwa.org/file/323820",
        "https://archive.unescwa.org/file/323820/download",
        "http://archive.unescwa.org/file/323820/download",
    ]
    linked = []
    for number, target in enumerate(live_targets):
        if remaining() < 390:
            break
        linked.extend(fetch_live_official(target, {
            "kind": "official_live_route",
            "original_route": ROUTES[0],
        }, number))

    indexes = select_indexes()
    rows = query_routes(indexes)
    rows.sort(key=lambda row: (
        0 if str(row.get("status", "")).startswith("3") else 1,
        row.get("timestamp", ""),
    ))
    discovered_targets = []
    for number, row in enumerate(rows[:16]):
        if remaining() < 95:
            break
        result = fetch_warc(row, number)
        if not result:
            continue
        original_url = row.get("url") or row.get("original") or ROUTES[0]
        status = result["record"].get("status")
        if result.get("redirect"):
            discovered_targets.append(result["redirect"])
        if status == 200 and result["response"].get("body"):
            _, links = inspect_body(
                f"common-crawl-{number}",
                {
                    "kind": "common_crawl_original_route_capture",
                    "original_url": original_url,
                    "original_route": ROUTES[0],
                    "capture": row,
                    "requested_url": original_url,
                },
                result["response"],
            )
            discovered_targets.extend(links)

    discovered_targets.extend(linked)
    if not discovered_targets and remaining() > 75:
        discovered_targets.extend(discovery_pass())
    discovered_targets = list(dict.fromkeys(discovered_targets))

    followups = []
    for target in discovered_targets:
        if official_url(target):
            followups.append(target)
    for number, target in enumerate(followups[:12]):
        if remaining() < 70:
            break
        new_links = fetch_live_official(target, {
            "kind": "redirect_or_linked_official_target",
            "original_route": ROUTES[0],
            "discovered_target": target,
        }, 100 + number)
        for link in new_links:
            if official_url(link) and link not in followups:
                followups.append(link)
        select()
        if STATE["qualified"]:
            return

    for target_number, target in enumerate(followups[:8]):
        if remaining() < 55:
            break
        capture_rows = []
        for index in indexes[:8]:
            capture_rows.extend({**row, "index": index.get("id")} for row in query_index(index, target))
            if capture_rows or remaining() < 55:
                break
        capture_rows.sort(key=lambda row: (
            0 if str(row.get("status", "")) == "200" else 1,
            row.get("timestamp", ""),
        ))
        for row_number, row in enumerate(capture_rows[:3]):
            if remaining() < 35:
                break
            result = fetch_warc(row, 1000 + target_number * 10 + row_number)
            if not result:
                continue
            status = result["record"].get("status")
            if status == 200 and result["response"].get("body"):
                inspect_body(
                    f"common-crawl-followup-{target_number}-{row_number}",
                    {
                        "kind": "common_crawl_linked_official_capture",
                        "original_url": row.get("url") or target,
                        "original_route": ROUTES[0],
                        "discovered_target": target,
                        "capture": row,
                        "requested_url": row.get("url") or target,
                    },
                    result["response"],
                )
            select()
            if STATE["qualified"]:
                return
    select()


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
                "density_values": STATE["selected"].get("semantic", {}).get("density_values"),
            }
            if STATE["selected"] else None
        ),
        "index_queries": len(STATE["index_queries"]),
        "warc_records": len(STATE["warc_records"]),
        "redirects": len(STATE["redirects"]),
        "observations": len(STATE["observations"]),
        "errors": len(STATE["errors"]),
        "product_files_modified": False,
    }, indent=2))
