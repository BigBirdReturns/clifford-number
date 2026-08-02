#!/usr/bin/env python3
from __future__ import annotations

import os
import shutil
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent))

from lib.ssc_rd04_a04_common import A04_ROOT, stable_json, write_json
from lib.ssc_rd04_a04_fetch import fetch_for_storage, fetch_url
from lib.ssc_rd04_a04_model import derive_model, load_inputs


def fetch_many(items: list[tuple[str, str, Path]], workers: int) -> dict[str, dict[str, Any]]:
    results: dict[str, dict[str, Any]] = {}
    url_by_key = {key: url for key, url, _ in items}
    with ThreadPoolExecutor(max_workers=workers) as pool:
        future_map = {pool.submit(fetch_url, url, custody_dir, retry_once=True): key for key, url, custody_dir in items}
        for future in as_completed(future_map):
            key = future_map[future]
            try:
                results[key] = future.result()
            except Exception as exc:
                results[key] = {
                    "requested_url": url_by_key[key],
                    "attempt_count": 0,
                    "retry_reason": "acquisition_exception",
                    "attempts": [],
                    "accessible": False,
                    "final_url": None,
                    "final_host": None,
                    "final_http_status": 0,
                    "final_content_type": "",
                    "official_after_redirects": False,
                    "page_title": None,
                    "parse_state": "acquisition_exception",
                    "text": None,
                    "text_sha256": None,
                    "exception": f"{type(exc).__name__}: {exc}",
                }
    return results


def acquire() -> None:
    workers = max(1, min(int(os.environ.get("A04_WORKERS", "8")), 16))
    candidates, sources, states = load_inputs()
    if A04_ROOT.exists():
        shutil.rmtree(A04_ROOT)
    (A04_ROOT / "page-custody/a03").mkdir(parents=True, exist_ok=True)
    (A04_ROOT / "page-custody/a02").mkdir(parents=True, exist_ok=True)

    candidate_fetches = fetch_many(
        [(row["candidate_id"], row["url"], A04_ROOT / "page-custody/a03" / row["candidate_id"]) for row in candidates],
        workers,
    )
    for candidate in candidates:
        write_json(A04_ROOT / "page-custody/a03" / candidate["candidate_id"] / "fetch.json", fetch_for_storage(candidate_fetches[candidate["candidate_id"]]))

    source_fetches = fetch_many(
        [(row["source_id"], row["url"], A04_ROOT / "page-custody/a02" / row["source_id"]) for row in sources],
        workers,
    )
    for source in sources:
        write_json(A04_ROOT / "page-custody/a02" / source["source_id"] / "fetch.json", fetch_for_storage(source_fetches[source["source_id"]]))

    model = derive_model(candidates, sources, states, candidate_fetches, source_fetches)
    write_json(A04_ROOT / "core.json", model["core"])
    write_json(A04_ROOT / "route-adjudications.json", {"schema_version": "ssc-rd04-a04-route-ledger@1", "rows": model["route_rows"]})
    write_json(A04_ROOT / "a02-source-reconciliations.json", {"schema_version": "ssc-rd04-a04-a02-reconciliation@1", "rows": model["source_rows"]})
    write_json(A04_ROOT / "decision-matrix.json", {"schema_version": "ssc-rd04-a04-decision-matrix@1", "rows": model["decisions"]})
    write_json(A04_ROOT / "state-scores.json", {"schema_version": "ssc-rd04-a04-state-scores@1", "rows": model["score_rows"], "selection": model["selection"]})
    print(stable_json({
        "execution_id": model["core"]["execution_id"],
        "route_dispositions": model["core"]["route_dispositions"],
        "source_reconciliations": model["core"]["a02_reconciliation_states"],
        "score_changes": model["core"]["counts"]["score_changes"],
        "selection": model["selection"],
    }), end="")


if __name__ == "__main__":
    acquire()
