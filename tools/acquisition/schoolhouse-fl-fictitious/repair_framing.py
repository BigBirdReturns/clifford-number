#!/usr/bin/env python3
"""Replace the first-pass fixed-span scanner with fragment reassembly."""

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
            physical_width_counts: Counter[int] = Counter()
            physical_separator_counts: Counter[str] = Counter()
            external_separator_counts: Counter[str] = Counter()
            physical_line_count = 0
            row_count = 0
            match_count = 0
            direct_record_count = 0
            reassembled_record_count = 0
            fragment_line_count = 0
            member_digest = hashlib.sha256()
            reassembly_groups: list[dict[str, Any]] = []
            pending = bytearray()
            pending_payload_widths: list[int] = []
            pending_start_line: int | None = None

            def split_physical_line(line: bytes) -> tuple[bytes, str, int]:
                if line.endswith(b"\\r\\n"):
                    return line[:-2], "crlf", 2
                if line.endswith(b"\\n"):
                    return line[:-1], "lf", 1
                if line.endswith(b"\\r"):
                    return line[:-1], "cr", 1
                return line, "none", 0

            def accept_record(record: bytes, fragment_count: int, external_separator: str) -> None:
                nonlocal row_count, match_count
                if len(record) != RECORD_LENGTH:
                    raise RuntimeError(
                        f"logical record width drift in {info.filename}: {len(record)}"
                    )
                row_count += 1
                external_separator_counts[external_separator] += 1
                candidate = parse_candidate(record, info.filename, row_count)
                if candidate is not None:
                    candidate["source_record_bytes"] = len(record)
                    candidate["schema_defined_prefix_bytes"] = RECORD_LENGTH
                    candidate["physical_fragment_count"] = fragment_count
                    candidates.append(candidate)
                    match_count += 1

            with archive.open(info, "r") as handle:
                while True:
                    line = handle.readline(max_line_bytes + 1)
                    if not line:
                        break
                    if len(line) > max_line_bytes and not line.endswith((b"\\n", b"\\r")):
                        raise RuntimeError(
                            f"physical line exceeds {max_line_bytes} bytes in {info.filename} at line {physical_line_count + 1}"
                        )
                    member_digest.update(line)
                    physical_line_count += 1
                    payload, separator_state, _separator_bytes = split_physical_line(line)
                    physical_width_counts[len(payload)] += 1
                    physical_separator_counts[separator_state] += 1

                    if not pending and len(payload) == RECORD_LENGTH:
                        direct_record_count += 1
                        accept_record(payload, 1, separator_state)
                        continue

                    if not pending:
                        pending_start_line = physical_line_count
                    pending.extend(line)
                    pending_payload_widths.append(len(payload))
                    fragment_line_count += 1

                    complete = False
                    external_separator = "none"
                    record = b""
                    if len(pending) == RECORD_LENGTH + 2 and pending.endswith(b"\\r\\n"):
                        record = bytes(pending[:-2])
                        external_separator = "crlf"
                        complete = True
                    elif len(pending) == RECORD_LENGTH + 1 and pending.endswith(b"\\n"):
                        record = bytes(pending[:-1])
                        external_separator = "lf"
                        complete = True
                    elif len(pending) == RECORD_LENGTH and not pending.endswith((b"\\r", b"\\n")):
                        record = bytes(pending)
                        external_separator = "none"
                        complete = True
                    elif len(pending) > RECORD_LENGTH + 2:
                        raise RuntimeError(
                            f"fragment group exceeded logical record width in {info.filename} "
                            f"at physical lines {pending_start_line}-{physical_line_count}: {len(pending)} bytes"
                        )

                    if complete:
                        reassembled_record_count += 1
                        accept_record(record, len(pending_payload_widths), external_separator)
                        reassembly_groups.append(
                            {
                                "logical_row_number": row_count,
                                "physical_line_start": pending_start_line,
                                "physical_line_end": physical_line_count,
                                "physical_fragment_count": len(pending_payload_widths),
                                "fragment_payload_widths": pending_payload_widths,
                                "group_bytes_including_external_separator": len(pending),
                                "logical_record_bytes": len(record),
                                "external_separator": external_separator,
                            }
                        )
                        pending = bytearray()
                        pending_payload_widths = []
                        pending_start_line = None

            if pending:
                if len(pending) == RECORD_LENGTH:
                    reassembled_record_count += 1
                    accept_record(bytes(pending), len(pending_payload_widths), "none")
                    reassembly_groups.append(
                        {
                            "logical_row_number": row_count,
                            "physical_line_start": pending_start_line,
                            "physical_line_end": physical_line_count,
                            "physical_fragment_count": len(pending_payload_widths),
                            "fragment_payload_widths": pending_payload_widths,
                            "group_bytes_including_external_separator": len(pending),
                            "logical_record_bytes": len(pending),
                            "external_separator": "none",
                        }
                    )
                else:
                    raise RuntimeError(
                        f"unterminated fragment group in {info.filename}: {len(pending)} bytes"
                    )

            member_receipts.append(
                {
                    "member": info.filename,
                    "compressed_bytes": info.compress_size,
                    "uncompressed_bytes": info.file_size,
                    "zip_crc32": f"{info.CRC:08x}",
                    "initial_record_span": initial_span,
                    "initial_record_framing": initial_framing,
                    "record_framing": "fixed_width_with_embedded_linebreak_reassembly",
                    "schema_defined_record_bytes": RECORD_LENGTH,
                    "physical_line_count": physical_line_count,
                    "physical_record_width_counts": {str(key): value for key, value in sorted(physical_width_counts.items())},
                    "physical_separator_counts": dict(sorted(physical_separator_counts.items())),
                    "external_separator_counts": dict(sorted(external_separator_counts.items())),
                    "row_count": row_count,
                    "direct_record_count": direct_record_count,
                    "reassembled_record_count": reassembled_record_count,
                    "fragment_line_count": fragment_line_count,
                    "reassembly_groups": reassembly_groups,
                    "match_count": match_count,
                    "short_record_count": 0,
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
    print(f"repaired embedded-linebreak record reassembly in {target}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
