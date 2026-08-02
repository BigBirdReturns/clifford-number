#!/usr/bin/env python3
from __future__ import annotations

import html
import sys
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent))

from lib.ssc_rd04_a04_common import (
    A02_ROOT,
    A03_ROOT,
    A04_ROOT,
    BUILD_ROOT,
    MANIFEST_PATH,
    REPORT_ROOT,
    ROOT,
    all_files,
    exact_manifest,
    read_json,
    stable_json,
    write_json,
)
from lib.ssc_rd04_a04_fetch import rehydrate_fetch
from lib.ssc_rd04_a04_model import EXECUTION_ID, ISSUE, derive_model, load_inputs

PERMANENT_PATHS = [
    ROOT / ".github/workflows/status-sovereignty-rd04-snap-route-adjudication-a04.yml",
    ROOT / "docs/milestones/ssc-rd04-snap-route-adjudication-a04.md",
    ROOT / "schemas/status-sovereignty-rd04-snap-route-adjudication-a04.schema.json",
    ROOT / "tools/lib/ssc_rd04_a04_common.py",
    ROOT / "tools/lib/ssc_rd04_a04_fetch.py",
    ROOT / "tools/lib/ssc_rd04_a04_classify.py",
    ROOT / "tools/lib/ssc_rd04_a04_model.py",
    ROOT / "tools/acquire-status-sovereignty-rd04-snap-route-adjudication-a04.py",
    ROOT / "tools/build-status-sovereignty-rd04-snap-route-adjudication-a04.py",
    ROOT / "tools/validate-status-sovereignty-rd04-snap-route-adjudication-a04.py",
    ROOT / "test/status-sovereignty-rd04-snap-route-adjudication-a04.test.py",
]


def _stored_fetch(path: Path) -> dict[str, Any]:
    return rehydrate_fetch(read_json(path), ROOT)


def load_fetches() -> tuple[dict[str, dict[str, Any]], dict[str, dict[str, Any]]]:
    candidates, sources, _ = load_inputs()
    candidate_fetches = {
        row["candidate_id"]: _stored_fetch(A04_ROOT / "page-custody/a03" / row["candidate_id"] / "fetch.json")
        for row in candidates
    }
    source_fetches = {
        row["source_id"]: _stored_fetch(A04_ROOT / "page-custody/a02" / row["source_id"] / "fetch.json")
        for row in sources
    }
    return candidate_fetches, source_fetches


def manifest_inputs() -> list[Path]:
    paths = []
    paths.extend(all_files(A04_ROOT / "page-custody"))
    paths.append(A03_ROOT / "source-delta.json")
    paths.extend(sorted(A02_ROOT.glob("sources-*.json")))
    paths.extend(sorted(A02_ROOT.glob("states-*.json")))
    for path in PERMANENT_PATHS:
        if not path.exists():
            raise FileNotFoundError(f"permanent A04 path missing: {path.relative_to(ROOT)}")
        paths.append(path)
    return paths


def summary_from_model(model: dict[str, Any], manifest: dict[str, Any]) -> dict[str, Any]:
    core = model["core"]
    changed = [row for row in model["decisions"] if row["score_change"]]
    return {
        "schema_version": "ssc-rd04-a04-summary@1",
        "execution_id": EXECUTION_ID,
        "issue": ISSUE,
        "as_of": core["as_of"],
        "authority": core["authority"],
        "counts": core["counts"],
        "route_dispositions": core["route_dispositions"],
        "a02_reconciliation_states": core["a02_reconciliation_states"],
        "selection": model["selection"],
        "score_changes": changed,
        "state_scores": [
            {
                "state": row["state"],
                "state_name": row["state_name"],
                "prior_total": row["prior_total"],
                "new_total": row["new_total"],
                "score_change": row["score_change"],
            }
            for row in model["score_rows"]
        ],
        "current_result": core["current_result"],
        "boundaries": core["boundaries"],
        "release_manifest": {
            "path": MANIFEST_PATH.relative_to(ROOT).as_posix(),
            "entries": len(manifest["entries"]),
            "combined_sha256": manifest["combined_sha256"],
        },
    }


def manifest_digest(summary: dict[str, Any]) -> str:
    return summary["release_manifest"]["combined_sha256"]


def render_html(summary: dict[str, Any]) -> str:
    selection = summary["selection"]
    top_set = " ".join(selection["highest_coverage_set"])
    route_rows = "".join(
        f"<tr><td><code>{html.escape(key)}</code></td><td>{value}</td></tr>"
        for key, value in summary["route_dispositions"].items()
    )
    score_rows = "".join(
        f"<tr><td><code>{row['state']}</code> {html.escape(row['state_name'])}</td><td>{row['prior_total']}</td><td>{row['new_total']}</td><td>{row['score_change']:+d}</td></tr>"
        for row in summary["state_scores"]
    )
    return f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>SSC RD-04 A04 route adjudication</title><style>:root{{background:#eeeae0;color:#191713;font-family:system-ui,sans-serif}}body{{max-width:1100px;margin:auto;padding:40px 24px 72px;line-height:1.5}}h1{{font-size:clamp(2rem,5vw,4.5rem);line-height:1}}.grid{{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px}}.card,table,.boundary{{background:#fffdf7;border:1px solid #c8c0b2;border-radius:12px}}.card{{padding:16px}}.card b{{display:block;font-size:2rem}}table{{width:100%;border-collapse:collapse}}th,td{{padding:9px;border-bottom:1px solid #ddd5c7;text-align:left}}.boundary{{border-left:6px solid #7c2920;padding:18px}}code,pre{{overflow-wrap:anywhere}}</style></head><body>
<p><b>CLIFFORD NUMBER · SSC-H01 · PAGE-LEVEL SOURCE CUSTODY</b></p>
<h1>A04 adjudicates routes; it does not rank policy</h1>
<p><b>59 A03 routes · 53 A02 sources · 112 reconciliations · 400 score cells · {len(summary['score_changes'])} score changes · selection gate complete · residual closures 0</b></p>
<div class="grid"><div class="card"><b>59</b>A03 routes</div><div class="card"><b>53</b>A02 sources</div><div class="card"><b>400</b>decisions</div><div class="card"><b>{len(summary['score_changes'])}</b>score changes</div><div class="card"><b>{selection['highest_score']}</b>highest score</div><div class="card"><b>0</b>residual closures</div></div>
<h2>Highest-coverage set</h2><p><code>{html.escape(top_set)}</code></p><p>Final selected state: <code>{html.escape(str(selection['final_selected_state']))}</code>. California eligible: <code>{str(selection['california_eligible']).lower()}</code>. California uniquely highest: <code>{str(selection['california_uniquely_highest']).lower()}</code>.</p>
<h2>Route dispositions</h2><table><thead><tr><th>Disposition</th><th>Count</th></tr></thead><tbody>{route_rows}</tbody></table>
<h2>Fifty-state recomputation</h2><table><thead><tr><th>State</th><th>Prior</th><th>New</th><th>Delta</th></tr></thead><tbody>{score_rows}</tbody></table>
<h2>Authority boundary</h2><pre class="boundary">{html.escape(stable_json(summary['boundaries']))}</pre>
<p><code>release SHA-256: {manifest_digest(summary)}</code></p>
</body></html>\n'''


def build() -> dict[str, Any]:
    candidates, sources, states = load_inputs()
    candidate_fetches, source_fetches = load_fetches()
    existing_core = read_json(A04_ROOT / "core.json")
    model = derive_model(candidates, sources, states, candidate_fetches, source_fetches, as_of=existing_core["as_of"])
    write_json(A04_ROOT / "core.json", model["core"])
    write_json(A04_ROOT / "route-adjudications.json", {"schema_version": "ssc-rd04-a04-route-ledger@1", "rows": model["route_rows"]})
    write_json(A04_ROOT / "a02-source-reconciliations.json", {"schema_version": "ssc-rd04-a04-a02-reconciliation@1", "rows": model["source_rows"]})
    write_json(A04_ROOT / "decision-matrix.json", {"schema_version": "ssc-rd04-a04-decision-matrix@1", "rows": model["decisions"]})
    write_json(A04_ROOT / "state-scores.json", {"schema_version": "ssc-rd04-a04-state-scores@1", "rows": model["score_rows"], "selection": model["selection"]})

    manifest = exact_manifest(manifest_inputs(), execution_id=EXECUTION_ID, issue=ISSUE)
    summary = summary_from_model(model, manifest)
    write_json(MANIFEST_PATH, manifest)
    write_json(BUILD_ROOT / "manifest.json", manifest)
    write_json(BUILD_ROOT / "summary.json", summary)
    write_json(REPORT_ROOT / "summary.json", summary)
    REPORT_ROOT.mkdir(parents=True, exist_ok=True)
    (REPORT_ROOT / "index.html").write_text(render_html(summary), encoding="utf-8")
    print(f"build A04: 59 routes, 53 baselines, {len(summary['score_changes'])} score changes, top {'/'.join(model['selection']['highest_coverage_set'])}")
    return {"model": model, "manifest": manifest, "summary": summary}


if __name__ == "__main__":
    build()
