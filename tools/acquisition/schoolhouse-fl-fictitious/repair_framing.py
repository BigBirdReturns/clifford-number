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
            reassembly_mode_counts: Counter[str] = Counter()
            physical_line_count = 0
            row_count = 0
            match_count = 0
            direct_record_count = 0
            reassembled_record_count = 0
            fragment_line_count = 0
            member_digest = hashlib.sha256()
            reassembly_groups: list[dict[str, Any]] = []
            pending_payloads: list[bytes] = []
            pending_separator_states: list[str] = []
            pending_start_line: int | None = None

            def split_physical_line(line: bytes) -> tuple[bytes, str]:
                if line.endswith(b"\\r\\n"):
                    return line[:-2], "crlf"
                if line.endswith(b"\\n"):
                    return line[:-1], "lf"
                if line.endswith(b"\\r"):
                    return line[:-1], "cr"
                return line, "none"

            def accept_record(
                record: bytes,
                fragment_count: int,
                external_separator: str,
                reassembly_mode: str,
            ) -> None:
                nonlocal row_count, match_count
                if len(record) != RECORD_LENGTH:
                    raise RuntimeError(
                        f"logical record width drift in {info.filename}: {len(record)}"
                    )
                row_count += 1
                external_separator_counts[external_separator] += 1
                reassembly_mode_counts[reassembly_mode] += 1
                candidate = parse_candidate(record, info.filename, row_count)
                if candidate is not None:
                    candidate["source_record_bytes"] = len(record)
                    candidate["schema_defined_prefix_bytes"] = RECORD_LENGTH
                    candidate["physical_fragment_count"] = fragment_count
                    candidate["reassembly_mode"] = reassembly_mode
                    candidates.append(candidate)
                    match_count += 1

            def resolve_pending() -> tuple[bytes, str] | None:
                if not pending_payloads:
                    return None
                choices = [
                    (b"".join(pending_payloads), "concatenate_fragments"),
                    (b"\\n".join(pending_payloads), "join_fragments_with_lf"),
                    (b"\\r\\n".join(pending_payloads), "join_fragments_with_crlf"),
                    (b"\\r".join(pending_payloads), "join_fragments_with_cr"),
                ]
                for record, mode in choices:
                    if len(record) == RECORD_LENGTH:
                        return record, mode
                if len(choices[0][0]) > RECORD_LENGTH:
                    widths = [len(payload) for payload in pending_payloads]
                    raise RuntimeError(
                        f"fragment payloads exceeded logical record width in {info.filename} "
                        f"at physical lines {pending_start_line}-{physical_line_count}: "
                        f"payload_widths={widths}"
                    )
                return None

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
                    payload, separator_state = split_physical_line(line)
                    physical_width_counts[len(payload)] += 1
                    physical_separator_counts[separator_state] += 1

                    if not pending_payloads and len(payload) == RECORD_LENGTH:
                        direct_record_count += 1
                        accept_record(payload, 1, separator_state, "direct_fixed_width_line")
                        continue

                    if not pending_payloads:
                        pending_start_line = physical_line_count
                    pending_payloads.append(payload)
                    pending_separator_states.append(separator_state)
                    fragment_line_count += 1

                    resolved = resolve_pending()
                    if resolved is not None:
                        record, mode = resolved
                        reassembled_record_count += 1
                        external_separator = pending_separator_states[-1]
                        accept_record(record, len(pending_payloads), external_separator, mode)
                        reassembly_groups.append(
                            {
                                "logical_row_number": row_count,
                                "physical_line_start": pending_start_line,
                                "physical_line_end": physical_line_count,
                                "physical_fragment_count": len(pending_payloads),
                                "fragment_payload_widths": [len(payload) for payload in pending_payloads],
                                "physical_separator_states": pending_separator_states,
                                "payload_bytes_without_separators": sum(len(payload) for payload in pending_payloads),
                                "logical_record_bytes": len(record),
                                "reassembly_mode": mode,
                                "external_separator": external_separator,
                            }
                        )
                        pending_payloads = []
                        pending_separator_states = []
                        pending_start_line = None

            if pending_payloads:
                widths = [len(payload) for payload in pending_payloads]
                raise RuntimeError(
                    f"unterminated fragment group in {info.filename}: payload_widths={widths}"
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
                    "reassembly_mode_counts": dict(sorted(reassembly_mode_counts.items())),
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
