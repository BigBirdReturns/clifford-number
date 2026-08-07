#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path
from typing import Any
import argparse
import base64
import hashlib
import io
import json
import re
import shutil
import tempfile
import zipfile

PRODUCT_DIR = Path("data/intake/schoolhouse-sec-edgar-exact-domain-census-v1")
SOURCE_B64 = PRODUCT_DIR / "sealed-source-artifact.zip.b64"
QUAL_B64 = PRODUCT_DIR / "sealed-qualification-artifact.zip.b64"
CUSTODY = PRODUCT_DIR / "source-custody.json"
MANIFEST = PRODUCT_DIR / "product-manifest.json"
MILESTONE = Path("docs/milestones/schoolhouse-sec-edgar-exact-domain-census-v1.md")
VALIDATOR = Path("tools/validate-schoolhouse-sec-edgar-exact-domain-census-custody.py")

PERMANENT_PATHS = [
    SOURCE_B64.as_posix(),
    QUAL_B64.as_posix(),
    CUSTODY.as_posix(),
    MANIFEST.as_posix(),
    MILESTONE.as_posix(),
    VALIDATOR.as_posix(),
]

SOURCE_SHA = "a242ddbf0a99f7c6c7586d119bc3d7eaf6d8730a6d72b1bc1ac5c0be24ecf637"
SOURCE_BYTES = 5284
QUAL_SHA = "7e81df55535db785e988a2dcbcee831e0bd78a265cbe06254670e549c4603358"
QUAL_BYTES = 2990
RESPONSE_SHA = "a23d14fd3d067e23170a44350c1429994b031afd7e22222378270b6709f1e9e2"

def sha256(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()

def read_json(path: Path) -> Any:
    return json.loads(path.read_text())

def read_jsonl_bytes(value: bytes) -> list[Any]:
    text = value.decode()
    decoder = json.JSONDecoder()
    rows: list[Any] = []
    index = 0
    while True:
        while index < len(text) and text[index].isspace():
            index += 1
        if index == len(text):
            return rows
        row, index = decoder.raw_decode(text, index)
        rows.append(row)

def zip_members(value: bytes) -> dict[str, bytes]:
    with zipfile.ZipFile(io.BytesIO(value)) as archive:
        assert archive.testzip() is None
        names = archive.namelist()
        assert len(names) == len(set(names))
        assert all(
            name
            and not name.startswith("/")
            and ".." not in Path(name).parts
            and "\\" not in name
            for name in names
        )
        return {name: archive.read(name) for name in names}

def check_sums(members: dict[str, bytes], sums_name: str, expected_rows: int) -> None:
    rows = members[sums_name].decode().splitlines()
    assert len(rows) == expected_rows
    for row in rows:
        digest, name = row.split("  ", 1)
        assert "/" not in name and name in members
        assert sha256(members[name]) == digest

def assert_authority(value: dict[str, Any]) -> None:
    assert value == {
        "adoption_effect": "none",
        "graph_effect": "none",
        "identities_admitted": 0,
        "issuer_admissions": 0,
        "negative_existence_claims": 0,
        "outside_human_dependency": False,
        "owner_or_operator_admissions": 0,
        "publication_effect": "none",
        "public_schoolhouse_legal_identity": "unresolved",
        "relationships_admitted": 0,
    }

def validate(root: Path) -> None:
    root = root.resolve()
    for relative in PERMANENT_PATHS:
        assert (root / relative).is_file(), relative

    product_files = sorted(
        path.relative_to(root).as_posix()
        for path in (root / PRODUCT_DIR).iterdir()
        if path.is_file()
    )
    assert product_files == sorted([
        SOURCE_B64.as_posix(),
        QUAL_B64.as_posix(),
        CUSTODY.as_posix(),
        MANIFEST.as_posix(),
    ])

    source_zip_bytes = base64.b64decode(
        (root / SOURCE_B64).read_text().strip(), validate=True
    )
    qual_zip_bytes = base64.b64decode(
        (root / QUAL_B64).read_text().strip(), validate=True
    )
    assert len(source_zip_bytes) == SOURCE_BYTES
    assert sha256(source_zip_bytes) == SOURCE_SHA
    assert len(qual_zip_bytes) == QUAL_BYTES
    assert sha256(qual_zip_bytes) == QUAL_SHA

    source = zip_members(source_zip_bytes)
    assert sorted(source) == sorted([
        "RUNNER-OUTPUT.log",
        "RUNNER_EXIT_CODE",
        "SHA256SUMS",
        "adjudication.json",
        "artifact-manifest.json",
        "candidate-filings.jsonl",
        "query-receipts.jsonl",
        "route-policy.json",
        "summary.json",
    ])
    assert source["RUNNER_EXIT_CODE"].decode().strip() == "0"
    check_sums(source, "SHA256SUMS", 7)

    policy = json.loads(source["route-policy.json"])
    summary = json.loads(source["summary.json"])
    adjudication = json.loads(source["adjudication.json"])
    source_manifest = json.loads(source["artifact-manifest.json"])
    receipts = read_jsonl_bytes(source["query-receipts.jsonl"])
    candidates = read_jsonl_bytes(source["candidate-filings.jsonl"])

    assert policy["schema_version"] == "schoolhouse-sec-edgar-exact-domain-route-policy@1"
    assert policy["issue"] == 1357
    assert policy["canonical_predecessor"] == "8a2f4538bdbcf9455f02e70c35a71cb39f805b18"
    assert policy["canonical_predecessor_tree"] == "11e4905a11c1638cfc26865124f9ce181ae0c134"
    assert policy["official_source"] == {
        "date_range": "all",
        "endpoint": "https://efts.sec.gov/LATEST/search-index",
        "fixed_query_id": "q1_exact_school_house_domain",
        "fixed_query_text": '"school.house"',
        "host": "efts.sec.gov",
    }
    assert all(value == 0 for value in policy["retention"].values())
    assert policy["authority"] == {
        "adoption_effect": "none",
        "graph_effect": "none",
        "identities_admitted": 0,
        "issuer_admissions": 0,
        "negative_existence_claims": 0,
        "outside_human_dependency": False,
        "owner_or_operator_admissions": 0,
        "publication_effect": "none",
        "relationships_admitted": 0,
    }

    assert summary["state"] == "terminal_bounded_sec_edgar_exact_domain_candidate_census"
    assert summary["query_terminal_state"] == "bounded_source_unavailable"
    assert summary["query_terminal_error_class"] == "http_status_403"
    assert summary["pages_requested"] == 1
    assert summary["query_receipt_rows"] == 1
    assert summary["observed_total_value"] is None
    assert summary["observed_total_relation"] is None
    assert summary["search_complete_under_fixed_denominator"] is False
    assert summary["raw_hits_seen"] == 0
    assert summary["retained_candidate_rows"] == 0
    assert summary["unique_opaque_result_ids"] == 0
    assert summary["unique_public_ciks"] == 0
    assert summary["aggregate_response_bytes"] == 4819
    assert candidates == []
    assert source["candidate-filings.jsonl"] == b""

    assert len(receipts) == 1
    request = receipts[0]
    exact_url = (
        "https://efts.sec.gov/LATEST/search-index?"
        "q=%22school.house%22&dateRange=all&category=custom&from=0&size=100"
    )
    assert request["request_url"] == exact_url
    assert request["final_url"] == exact_url
    assert request["attempts"] == 2
    assert request["status"] == 403
    assert request["response_bytes"] == 4819
    assert request["response_sha256"] == RESPONSE_SHA
    assert request["terminal_state"] == "bounded_source_unavailable"
    assert request["error_class"] == "http_status_403"
    assert request["hit_rows_returned"] == 0
    assert request["hit_rows_retained"] == 0
    assert re.fullmatch(
        r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+00:00",
        request["observed_at"],
    )

    assert adjudication["state"] == summary["state"]
    assert adjudication["query_terminal_state"] == "bounded_source_unavailable"
    assert adjudication["promotes_to"] == "candidate_only"
    assert adjudication["sec_filing_reference_candidate_rows"] == 0
    assert adjudication["literal_school_house_occurrence_admitted"] is False
    assert adjudication["sec_issuer_admitted"] is False
    assert adjudication["public_schoolhouse_identity_admitted"] is False
    assert adjudication["owner_or_operator_admitted"] is False
    assert adjudication["negative_existence_claim_created"] is False
    assert all(adjudication["interpretation"].values())
    assert adjudication["outside_human_dependency"] is False
    assert [adjudication[key] for key in (
        "publication_effect", "adoption_effect", "graph_effect"
    )] == ["none", "none", "none"]

    assert source_manifest["counts"] == {
        "candidate_rows": 0,
        "query_receipts": 1,
        "unique_opaque_result_ids": 0,
        "unique_public_ciks": 0,
    }
    assert source_manifest["authority"] == policy["authority"]
    combined = hashlib.sha256()
    for row in source_manifest["files"]:
        assert sha256(source[row["path"]]) == row["sha256"]
        assert len(source[row["path"]]) == row["bytes"]
        combined.update(f"{row['sha256']}  {row['path']}\n".encode())
    assert source_manifest["combined_sha256"] == combined.hexdigest()

    qualification = zip_members(qual_zip_bytes)
    assert sorted(qualification) == sorted([
        "SHA256SUMS",
        "qualification.json",
        "source-SHA256SUMS",
        "source-query-receipts.jsonl",
        "source-summary.json",
    ])
    check_sums(qualification, "SHA256SUMS", 4)
    assert qualification["source-SHA256SUMS"] == source["SHA256SUMS"]
    assert qualification["source-query-receipts.jsonl"] == source["query-receipts.jsonl"]
    assert qualification["source-summary.json"] == source["summary.json"]
    q = json.loads(qualification["qualification.json"])
    assert q["schema_version"] == "schoolhouse-sec-edgar-exact-domain-qualification@1"
    assert q["qualification"] == "pass"
    assert q["canonical_predecessor"] == policy["canonical_predecessor"]
    assert q["canonical_predecessor_tree"] == policy["canonical_predecessor_tree"]
    assert q["source_pr"] == 1362
    assert q["source_head"] == "b48943b058b7514f268b86d1a1faa402fba6404a"
    assert q["source_workflow_run"] == 31196813413
    assert q["artifact_id"] == 9001135306
    assert q["artifact_bytes"] == SOURCE_BYTES
    assert q["artifact_sha256"] == SOURCE_SHA
    assert q["query_terminal_state"] == "bounded_source_unavailable"
    assert q["terminal_http_status"] == 403
    assert q["terminal_attempts"] == 2
    assert q["terminal_response_bytes"] == 4819
    assert q["terminal_response_sha256"] == RESPONSE_SHA
    assert q["retained_candidate_rows"] == 0
    assert q["identities_admitted"] == 0
    assert q["relationships_admitted"] == 0
    assert q["negative_existence_claims"] == 0
    assert q["issuer_admissions"] == 0
    assert q["owner_or_operator_admissions"] == 0
    assert q["outside_human_dependency"] is False
    assert [q[key] for key in (
        "publication_effect", "adoption_effect", "graph_effect"
    )] == ["none", "none", "none"]

    custody = read_json(root / CUSTODY)
    assert custody["schema_version"] == "schoolhouse-sec-edgar-exact-domain-source-custody@1"
    assert custody["canonical_parent"] == policy["canonical_predecessor"]
    assert custody["canonical_parent_tree"] == policy["canonical_predecessor_tree"]
    assert custody["issue"] == 1357
    assert custody["artifact_encoding"] == {
        "source": "base64_of_exact_zip",
        "independent_qualification": "base64_of_exact_zip",
    }
    assert custody["source"]["artifact_sha256"] == SOURCE_SHA
    assert custody["source"]["artifact_bytes"] == SOURCE_BYTES
    assert custody["independent_qualification"]["artifact_sha256"] == QUAL_SHA
    assert custody["independent_qualification"]["artifact_bytes"] == QUAL_BYTES
    assert custody["terminal_result"] == {
        "absence_inference_authorized": False,
        "attempts": 2,
        "http_status": 403,
        "response_bytes": 4819,
        "response_sha256": RESPONSE_SHA,
        "retained_candidate_rows": 0,
        "search_complete_under_fixed_denominator": False,
        "state": "bounded_source_unavailable",
        "unique_public_ciks": 0,
    }
    assert all(value == 0 for value in custody["retention"].values())
    assert_authority(custody["authority"])

    manifest = read_json(root / MANIFEST)
    assert manifest["schema_version"] == "schoolhouse-sec-edgar-exact-domain-product-manifest@1"
    assert manifest["canonical_parent"] == policy["canonical_predecessor"]
    assert manifest["canonical_parent_tree"] == policy["canonical_predecessor_tree"]
    assert manifest["artifact_encoding"] == "base64_of_exact_zip"
    assert manifest["permanent_paths"] == PERMANENT_PATHS
    assert manifest["permanent_path_count"] == 6
    assert manifest["workflow_paths"] == 0
    assert manifest["terminal_result"] == custody["terminal_result"]
    assert_authority(manifest["authority"])
    assert len(manifest["bound_files"]) == 5
    expected_bound = sorted(set(PERMANENT_PATHS) - {MANIFEST.as_posix()})
    assert sorted(row["path"] for row in manifest["bound_files"]) == expected_bound
    for row in manifest["bound_files"]:
        path = root / row["path"]
        assert path.stat().st_size == row["bytes"]
        assert sha256(path.read_bytes()) == row["sha256"]

    milestone = (root / MILESTONE).read_text()
    for phrase in (
        "bounded_source_unavailable",
        "not evidence",
        "HTTP 403",
        "outside-human dependency",
        "public School.House legal identity",
        "unresolved",
    ):
        assert phrase in milestone

    prohibited = {
        "display_names", "display_name", "names", "name",
        "person_name", "owner", "owner_name", "applicant", "applicant_name",
        "street_address", "mailing_address", "postal_code", "phone", "email",
        "signature", "officer_name", "highlight", "highlights", "snippet",
        "filing_text", "raw_json", "cookie", "credential", "token",
    }
    def walk(value: Any) -> None:
        if isinstance(value, dict):
            assert prohibited.isdisjoint(value)
            for child in value.values():
                walk(child)
        elif isinstance(value, list):
            for child in value:
                walk(child)

    for value in (
        policy, summary, adjudication, source_manifest, receipts, candidates,
        q, custody, manifest,
    ):
        walk(value)

def self_test(root: Path) -> None:
    validate(root)
    with tempfile.TemporaryDirectory() as directory:
        base = Path(directory) / "base"
        for relative in PERMANENT_PATHS:
            destination = base / relative
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(root / relative, destination)

        mutations = []

        def mutate_source_byte(copy_root: Path) -> None:
            path = copy_root / SOURCE_B64
            data = bytearray(base64.b64decode(path.read_text().strip(), validate=True))
            data[-1] ^= 1
            path.write_text(base64.b64encode(bytes(data)).decode() + "\n")
        mutations.append(mutate_source_byte)

        def mutate_qualification_byte(copy_root: Path) -> None:
            path = copy_root / QUAL_B64
            data = bytearray(base64.b64decode(path.read_text().strip(), validate=True))
            data[-1] ^= 1
            path.write_text(base64.b64encode(bytes(data)).decode() + "\n")
        mutations.append(mutate_qualification_byte)

        def mutate_authority(copy_root: Path) -> None:
            path = copy_root / CUSTODY
            value = read_json(path)
            value["authority"]["identities_admitted"] = 1
            path.write_text(json.dumps(value, indent=2, sort_keys=True) + "\n")
        mutations.append(mutate_authority)

        def mutate_manifest(copy_root: Path) -> None:
            path = copy_root / MANIFEST
            value = read_json(path)
            value["bound_files"][0]["sha256"] = "0" * 64
            path.write_text(json.dumps(value, indent=2, sort_keys=True) + "\n")
        mutations.append(mutate_manifest)

        def mutate_milestone(copy_root: Path) -> None:
            path = copy_root / MILESTONE
            path.write_text(path.read_text().replace("not evidence", "evidence", 1))
        mutations.append(mutate_milestone)

        for index, mutation in enumerate(mutations):
            trial = Path(directory) / f"mutation-{index}"
            for relative in PERMANENT_PATHS:
                destination = trial / relative
                destination.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(base / relative, destination)
            mutation(trial)
            try:
                validate(trial)
            except (AssertionError, ValueError, KeyError, zipfile.BadZipFile):
                continue
            raise AssertionError(f"adversarial mutation {index} was not refused")

    print("schoolhouse_sec_edgar_exact_domain_adversarial_refusals=5")

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, default=Path.cwd())
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    validate(args.root)
    print("schoolhouse_sec_edgar_exact_domain_custody_validation=pass")
    if args.self_test:
        self_test(args.root)

if __name__ == "__main__":
    main()
