#!/usr/bin/env python3
"""Replace the first-pass fixed-span scanner with flexible record separators."""

from __future__ import annotations

import argparse
from pathlib import Path

REPLACEMENT = '''def scan_archive(source: Path) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    candidates: list[dict[str, Any]] = []
    member_receipts: list[dict[str, Any]] = []
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
            row_count = 0
            match_count = 0
            trailing_bytes = 0
            member_digest = hashlib.sha256()
            with archive.open(info, "r") as handle:
                while True:
                    record = read_exact(handle, RECORD_LENGTH)
                    if not record:
                        break
                    if len(record) != RECORD_LENGTH:
                        member_digest.update(record)
                        trailing_bytes = len(record)
                        if record.strip(b"\\x00\\r\\n\\t \\x1a"):
                            raise RuntimeError(
                                f"non-padding trailing bytes in {info.filename}: {len(record)}"
                            )
                        break

                    member_digest.update(record)
                    width_counts[len(record)] += 1
                    row_count += 1
                    candidate = parse_candidate(record, info.filename, row_count)
                    if candidate is not None:
                        candidates.append(candidate)
                        match_count += 1

                    lookahead = handle.peek(2)[:2]
                    separator = b""
                    separator_state = "none"
                    if lookahead.startswith(b"\\r\\n"):
                        separator = read_exact(handle, 2)
                        separator_state = "crlf"
                    elif lookahead.startswith(b"\\n"):
                        separator = read_exact(handle, 1)
                        separator_state = "lf"
                    elif lookahead.startswith(b"\\r"):
                        separator = read_exact(handle, 1)
                        separator_state = "cr"
                        if handle.peek(1)[:1] == b"\\n":
                            separator += read_exact(handle, 1)
                            separator_state = "crlf"
                    if separator:
                        member_digest.update(separator)
                    separator_counts[separator_state] += 1

            member_receipts.append(
                {
                    "member": info.filename,
                    "compressed_bytes": info.compress_size,
                    "uncompressed_bytes": info.file_size,
                    "zip_crc32": f"{info.CRC:08x}",
                    "initial_record_span": initial_span,
                    "initial_record_framing": initial_framing,
                    "record_framing": "fixed_width_flexible_separator",
                    "separator_counts": dict(sorted(separator_counts.items())),
                    "row_count": row_count,
                    "match_count": match_count,
                    "record_width_counts": {str(key): value for key, value in sorted(width_counts.items())},
                    "trailing_bytes": trailing_bytes,
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
    print(f"repaired flexible record separators in {target}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
