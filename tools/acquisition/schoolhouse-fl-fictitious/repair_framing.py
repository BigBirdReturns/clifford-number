#!/usr/bin/env python3
"""Replace the first-pass fixed-span scanner with line-aware prefix parsing."""

from __future__ import annotations

import argparse
from pathlib import Path

REPLACEMENT = '''def scan_archive(source: Path) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    candidates: list[dict[str, Any]] = []
    member_receipts: list[dict[str, Any]] = []
    max_line_bytes = 256 * 1024
    with zipfile.ZipFile(source, "r") as archive:
        bad_member = archive.testzip()
        if bad_member is not None:
            raise RuntimeError(f"ZIP integrity failure: {bad_member}")
        infos = [info for info in archive.infolist() if not info.is_dir()]
        if not infos:
            raise RuntimeError("quarterly fictitious-name archive has no file members")
        for info in infos:
            if Path(info.filename).is_absolute() or ".." in Path(info.filename).parts:
                raise RuntimeError(f"unsafe ZIP member path: {info.filename}")
            initial_span, initial_framing = detect_record_span(archive, info)
            width_counts: Counter[int] = Counter()
            separator_counts: Counter[str] = Counter()
            extension_width_counts: Counter[int] = Counter()
            row_count = 0
            match_count = 0
            short_record_count = 0
            extension_record_count = 0
            extension_bytes_total = 0
            member_digest = hashlib.sha256()
            with archive.open(info, "r") as handle:
                while True:
                    line = handle.readline(max_line_bytes + 1)
                    if not line:
                        break
                    if len(line) > max_line_bytes and not line.endswith((b"\\n", b"\\r")):
                        raise RuntimeError(
                            f"record line exceeds {max_line_bytes} bytes in {info.filename} at row {row_count + 1}"
                        )
                    member_digest.update(line)
                    row_count += 1

                    if line.endswith(b"\\r\\n"):
                        record = line[:-2]
                        separator_state = "crlf"
                    elif line.endswith(b"\\n"):
                        record = line[:-1]
                        separator_state = "lf"
                    elif line.endswith(b"\\r"):
                        record = line[:-1]
                        separator_state = "cr"
                    else:
                        record = line
                        separator_state = "none"
                    separator_counts[separator_state] += 1
                    width_counts[len(record)] += 1

                    if len(record) < RECORD_LENGTH:
                        short_record_count += 1
                        continue
                    if len(record) > RECORD_LENGTH:
                        extension = len(record) - RECORD_LENGTH
                        extension_record_count += 1
                        extension_bytes_total += extension
                        extension_width_counts[extension] += 1
                    defined_record = record[:RECORD_LENGTH]
                    candidate = parse_candidate(defined_record, info.filename, row_count)
                    if candidate is not None:
                        candidate["source_record_bytes"] = len(record)
                        candidate["schema_defined_prefix_bytes"] = RECORD_LENGTH
                        candidate["unparsed_extension_bytes"] = max(0, len(record) - RECORD_LENGTH)
                        candidates.append(candidate)
                        match_count += 1

            member_receipts.append(
                {
                    "member": info.filename,
                    "compressed_bytes": info.compress_size,
                    "uncompressed_bytes": info.file_size,
                    "zip_crc32": f"{info.CRC:08x}",
                    "initial_record_span": initial_span,
                    "initial_record_framing": initial_framing,
                    "record_framing": "line_delimited_defined_prefix",
                    "schema_defined_prefix_bytes": RECORD_LENGTH,
                    "separator_counts": dict(sorted(separator_counts.items())),
                    "row_count": row_count,
                    "match_count": match_count,
                    "record_width_counts": {str(key): value for key, value in sorted(width_counts.items())},
                    "short_record_count": short_record_count,
                    "extension_record_count": extension_record_count,
                    "extension_bytes_total": extension_bytes_total,
                    "extension_width_counts": {str(key): value for key, value in sorted(extension_width_counts.items())},
                    "trailing_bytes": 0,
                    "uncompressed_stream_sha256": member_digest.hexdigest(),
                    "state": "scanned",
                }
            )
    return candidates, member_receipts


'''


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("target", type=Path)
    args = parser.parse_args()
    target = args.target.resolve()
    source = target.read_text(encoding="utf-8")
    start = source.index("def scan_archive(source: Path)")
    end = source.index("def build_manifest(output: Path)")
    old = source[start:end]
    if "record framing drift" not in old or "read_exact(handle, span)" not in old:
        raise RuntimeError("first-pass scanner boundary not found")
    repaired = source[:start] + REPLACEMENT + source[end:]
    if "record framing drift" in repaired or "read_exact(handle, span)" in repaired:
        raise RuntimeError("stale fixed-span scanner survived repair")
    target.write_text(repaired, encoding="utf-8")
    print(f"repaired line-aware defined-prefix parsing in {target}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
