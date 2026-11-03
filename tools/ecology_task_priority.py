#!/usr/bin/env python3
"""Add an evidence-neutral, exact-order SQLite task scheduler index.

Use the existing W03 ecology acquisition lock. No source row, selection,
review state, task ID, or canonical graph relationship is changed. This index
prevents a temporary JSON-expression sort for every source-lane selection.
"""
from __future__ import annotations

import argparse
import contextlib
import datetime as dt
import fcntl
import json
import os
from pathlib import Path
import sqlite3
import statistics
import time

INDEX = "tasks_ready_priority_v1"
EXPR = "COALESCE(json_extract(spec,'$.start'),json_extract(spec,'$.record_date'),json_extract(spec,'$.date'),'0000')"
PREDICATE = "status IN ('ready','partial')"
INDEX_SQL = f"CREATE INDEX IF NOT EXISTS {INDEX} ON tasks(lane,pages,{EXPR},updated,id) WHERE {PREDICATE}"
SELECTION = f"SELECT id FROM tasks WHERE lane=? AND {PREDICATE} ORDER BY pages,{EXPR},updated,id LIMIT 1"
SCHEMA = "clifford/ecology-task-priority@1"
LANES = ("sources", "awards", "policy")


def iso() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat()


@contextlib.contextmanager
def acquisition_lock(state: Path):
    """Use the actual ecology lock; never clear another task's state."""
    lock_path = state / "acquisition.lock"
    if not lock_path.exists():
        raise ValueError("Missing native acquisition.lock; refusing to invent a new owner")
    with lock_path.open("a+") as handle:
        try:
            fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError as exc:
            raise RuntimeError("Existing acquisition owner is active; defer migration") from exc
        try:
            handle.seek(0)
            handle.truncate()
            handle.write(json.dumps({"pid": os.getpid(), "started": iso(), "purpose": "additive_sqlite_priority_index"}))
            handle.flush()
            yield
        finally:
            fcntl.flock(handle, fcntl.LOCK_UN)


def connect(db: Path, *, readonly=False) -> sqlite3.Connection:
    if not db.is_file():
        raise FileNotFoundError("Ecology SQLite source does not exist: " + str(db))
    mode = "ro" if readonly else "rw"
    c = sqlite3.connect(f"file:{db.resolve()}?mode={mode}", uri=True, timeout=8)
    c.execute("PRAGMA busy_timeout=8000")
    if readonly:
        c.execute("PRAGMA query_only=ON")
    return c


def sample(c: sqlite3.Connection, n=9) -> dict:
    out = {}
    for lane in LANES:
        measurements = []
        first = None
        for _ in range(n):
            start = time.perf_counter()
            first = c.execute(SELECTION, (lane,)).fetchone()
            measurements.append((time.perf_counter()-start)*1000)
        plan = [x[3] for x in c.execute("EXPLAIN QUERY PLAN " + SELECTION, (lane,)).fetchall()]
        out[lane] = {"next_id": first[0] if first else None,
                     "median_ms": round(statistics.median(measurements), 4),
                     "maximum_ms": round(max(measurements), 4),
                     "plan": plan}
    return out


def verify(c: sqlite3.Connection) -> dict:
    existing = c.execute("SELECT sql FROM sqlite_master WHERE type='index' AND name=?", (INDEX,)).fetchone()
    if not existing:
        raise ValueError("Priority index absent")
    if "WHERE status IN ('ready','partial')" not in existing[0]:
        raise ValueError("Priority index predicate is different")
    for lane in LANES:
        plan = [x[3] for x in c.execute("EXPLAIN QUERY PLAN " + SELECTION, (lane,)).fetchall()]
        if not any(INDEX in x for x in plan):
            raise ValueError("SQLite did not choose the priority index: " + str(plan))
        if any("TEMP B-TREE" in x for x in plan):
            raise ValueError("Task sort still uses a temporary B-tree")
    # Narrow check validates the task B-tree and its indexes, not a 6.7 GB
    # unrelated evidence body corpus.
    row = c.execute("PRAGMA integrity_check('tasks')").fetchone()
    if not row or row[0] != "ok":
        raise ValueError("Task/index integrity_check failed: " + repr(row))
    return {"index": INDEX, "query_plan": "index_search_no_temp_sort", "task_index_integrity": "PASS"}


def apply(state: Path, receipt: Path) -> dict:
    if receipt.exists():
        raise FileExistsError("Receipt path exists; do not overwrite prior acceptance")
    db = state / "ecology.sqlite"
    with acquisition_lock(state), connect(db) as c:
        existing = c.execute("SELECT sql FROM sqlite_master WHERE type='index' AND name=?", (INDEX,)).fetchone()
        if existing:
            v=verify(c)
            return {"status": "already_installed", "observed_at": iso(), **v}
        count = c.execute("SELECT count(*) FROM tasks").fetchone()[0]
        before = sample(c)
        c.execute("BEGIN IMMEDIATE")
        try:
            t=time.perf_counter()
            c.execute(INDEX_SQL)
            seconds=time.perf_counter()-t
            c.execute("COMMIT")
        except Exception:
            c.execute("ROLLBACK")
            raise
        after = sample(c)
        for lane in LANES:
            if before[lane]["next_id"] != after[lane]["next_id"]:
                raise ValueError("Task order changed for lane "+lane)
        v = verify(c)
        result = {
            "schema": SCHEMA, "status": "PASS", "observed_at": iso(), "source": str(db),
            "rows": count, "index_creation_seconds": round(seconds, 4),
            "before": before, "after": after, "source_tasks_modified": 0,
            "task_ids_modified": 0, "source_capture_files_modified": 0,
            "original_source_date_or_review_modified": False,
            "lock": str(state / "acquisition.lock"), "new_cross_entity_links": 0,
            **v,
        }
        if receipt.exists():
            raise FileExistsError("Receipt path exists; do not overwrite prior acceptance")
        receipt.parent.mkdir(parents=True, exist_ok=True)
        stage = receipt.with_name(receipt.name + "." + str(os.getpid()) + ".tmp")
        stage.write_text(json.dumps(result, indent=2)+"\n", encoding="utf-8")
        os.replace(stage, receipt)
        return result


def main():
    a = argparse.ArgumentParser(description=__doc__)
    a.add_argument("command", choices=["apply", "verify"])
    a.add_argument("--state", type=Path, required=True)
    a.add_argument("--receipt", type=Path)
    args = a.parse_args()
    db = args.state / "ecology.sqlite"
    try:
        if args.command == "apply":
            if not args.receipt:
                raise ValueError("Explicit --receipt path is required for a production migration")
            result = apply(args.state, args.receipt)
        else:
            with connect(db, readonly=True) as c:
                result = {"schema": SCHEMA, "status": "PASS", "observed_at": iso(), "source": str(db),
                          "source_tasks_modified": 0, **verify(c), "sample": sample(c)}
        print(json.dumps(result, indent=2))
    except (OSError, sqlite3.Error, ValueError, RuntimeError) as exc:
        print(json.dumps({"status": "FAILED", "error": str(exc)}), file=__import__("sys").stderr)
        raise SystemExit(1)


if __name__ == "__main__":
    main()
