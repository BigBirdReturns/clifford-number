#!/usr/bin/env python3
from __future__ import annotations

import datetime as dt
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

OWNER = "BigBirdReturns"
REPO = "clifford-number"
FULL_REPO = f"{OWNER}/{REPO}"
PR_NUMBER = 2194
PR_BRANCH = "agent/pr2190-nonadjacent-wrapper-v1"
CONTROL_BRANCH = "agent/pr2194-finalizer-control-v1"
EXPECTED_FILES = [
    "test/industrial-exhaust.test.js",
    "tools/lib/industrial-exhaust.mjs",
]
EXPECTED_BLOBS = {
    "tools/lib/industrial-exhaust.mjs": "273d8c19ac063635ea96872be79c93fab063a741",
    "test/industrial-exhaust.test.js": "a6db6d69498d42e7cdad716637f29d163f41b49d",
}
REQUIRED_WORKFLOWS = {
    "First-party industrial-exhaust intake",
    "No magic human gate",
    "Release checks",
}
BARRIER_MARKER = "[pr2194-review-barrier]"
CLOSURE_MARKER = "[pr2194-finalizer-receipt]"
COMMIT_MESSAGE = "fix(crawler): classify narrative periods by construct"
COMMIT_DATE = "2026-08-19T22:00:00Z"
TOKEN = os.environ["GITHUB_TOKEN"]
API = f"https://api.github.com/repos/{FULL_REPO}"
HEADERS = {
    "Accept": "application/vnd.github+json",
    "Authorization": f"Bearer {TOKEN}",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "pr2194-exact-head-finalizer",
}
COMPLETION_RE = re.compile(
    r"\b(no (?:major|actionable|correctness) issues?|no issues? found|"
    r"looks good|nothing actionable|no major issue)\b",
    re.IGNORECASE,
)


def log(message: str, **fields: Any) -> None:
    payload = {"message": message, **fields}
    print(json.dumps(payload, sort_keys=True), flush=True)


def parse_time(value: str | None) -> float:
    if not value:
        return 0.0
    return dt.datetime.fromisoformat(value.replace("Z", "+00:00")).timestamp()


def is_codex(login: str | None) -> bool:
    normalized = (login or "").lower()
    return normalized in {
        "codex",
        "chatgpt-codex-connector",
        "chatgpt-codex-connector[bot]",
    } or "codex" in normalized


def request(
    method: str,
    url: str,
    data: dict[str, Any] | None = None,
    expected: tuple[int, ...] = (200,),
    allow: tuple[int, ...] = (),
) -> tuple[int, Any]:
    body = None if data is None else json.dumps(data).encode("utf-8")
    headers = dict(HEADERS)
    if body is not None:
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=60) as response:
            raw = response.read()
            parsed = json.loads(raw) if raw else None
            if response.status not in expected:
                raise RuntimeError(f"unexpected HTTP {response.status} for {method} {url}: {parsed}")
            return response.status, parsed
    except urllib.error.HTTPError as error:
        raw = error.read()
        try:
            parsed = json.loads(raw) if raw else None
        except json.JSONDecodeError:
            parsed = raw.decode("utf-8", errors="replace")
        if error.code in allow:
            return error.code, parsed
        raise RuntimeError(f"HTTP {error.code} for {method} {url}: {parsed}") from error


def api_get(path: str, allow: tuple[int, ...] = ()) -> tuple[int, Any]:
    return request("GET", f"{API}{path}", allow=allow)


def api_post(path: str, data: dict[str, Any], expected: tuple[int, ...] = (201,)) -> Any:
    return request("POST", f"{API}{path}", data=data, expected=expected)[1]


def api_patch(path: str, data: dict[str, Any], expected: tuple[int, ...] = (200,)) -> Any:
    return request("PATCH", f"{API}{path}", data=data, expected=expected)[1]


def api_put(
    path: str,
    data: dict[str, Any],
    expected: tuple[int, ...] = (200,),
    allow: tuple[int, ...] = (),
) -> tuple[int, Any]:
    return request("PUT", f"{API}{path}", data=data, expected=expected, allow=allow)


def api_delete(path: str, allow: tuple[int, ...] = (404, 422)) -> None:
    request("DELETE", f"{API}{path}", expected=(204,), allow=allow)


def get_all(path: str) -> list[dict[str, Any]]:
    separator = "&" if "?" in path else "?"
    records: list[dict[str, Any]] = []
    for page in range(1, 21):
        _, batch = api_get(f"{path}{separator}per_page=100&page={page}")
        if not isinstance(batch, list):
            raise RuntimeError(f"expected list from {path}, received {type(batch).__name__}")
        records.extend(batch)
        if len(batch) < 100:
            return records
    raise RuntimeError(f"pagination limit exceeded for {path}")


def graphql(query: str, variables: dict[str, Any]) -> dict[str, Any]:
    _, payload = request(
        "POST",
        "https://api.github.com/graphql",
        data={"query": query, "variables": variables},
        expected=(200,),
    )
    if payload.get("errors"):
        raise RuntimeError(f"GraphQL errors: {payload['errors']}")
    return payload["data"]


def review_threads() -> list[dict[str, Any]]:
    query = """
      query($owner:String!, $name:String!, $number:Int!, $cursor:String) {
        repository(owner:$owner, name:$name) {
          pullRequest(number:$number) {
            reviewThreads(first:100, after:$cursor) {
              nodes {
                id
                isResolved
                isOutdated
                comments(first:100) {
                  nodes { author { login } body createdAt }
                }
              }
              pageInfo { hasNextPage endCursor }
            }
          }
        }
      }
    """
    cursor: str | None = None
    result: list[dict[str, Any]] = []
    while True:
        data = graphql(
            query,
            {"owner": OWNER, "name": REPO, "number": PR_NUMBER, "cursor": cursor},
        )
        connection = data["repository"]["pullRequest"]["reviewThreads"]
        result.extend(connection["nodes"])
        if not connection["pageInfo"]["hasNextPage"]:
            return result
        cursor = connection["pageInfo"]["endCursor"]


def pull_request() -> dict[str, Any]:
    return api_get(f"/pulls/{PR_NUMBER}")[1]


def main_sha() -> str:
    return api_get("/branches/main")[1]["commit"]["sha"]


def commit_details(sha: str) -> dict[str, Any]:
    return api_get(f"/commits/{sha}")[1]


def blob_sha(path: str, ref: str) -> str:
    encoded_path = urllib.parse.quote(path, safe="/")
    encoded_ref = urllib.parse.quote(ref, safe="")
    status, payload = api_get(f"/contents/{encoded_path}?ref={encoded_ref}", allow=(404,))
    if status == 404:
        raise RuntimeError(f"required path {path} is absent at {ref}")
    if payload.get("type") != "file":
        raise RuntimeError(f"required path {path} is not a file at {ref}")
    return payload["sha"]


def pr_files() -> list[str]:
    return sorted(item["filename"] for item in get_all(f"/pulls/{PR_NUMBER}/files"))


def changed_between(base: str, head: str) -> list[str]:
    comparison = api_get(f"/compare/{base}...{head}")[1]
    return sorted(item["filename"] for item in comparison.get("files", []))


def verify_product_bytes(head: str) -> None:
    paths = pr_files()
    if paths != EXPECTED_FILES:
        raise RuntimeError(f"PR path proof failed: {paths}")
    for path, expected in EXPECTED_BLOBS.items():
        actual = blob_sha(path, head)
        if actual != expected:
            raise RuntimeError(f"blob proof failed for {path}: {actual} != {expected}")
    for path in (
        ".github/workflows/pr2194-finalizer-control.yml",
        "tools/pr2194-finalizer-controller.py",
        "tools/temporary-pr2194-period-state-machine.py",
    ):
        encoded_path = urllib.parse.quote(path, safe="/")
        encoded_ref = urllib.parse.quote(head, safe="")
        status, _ = api_get(f"/contents/{encoded_path}?ref={encoded_ref}", allow=(404,))
        if status != 404:
            raise RuntimeError(f"temporary control surface leaked into PR head: {path}")


def create_rebased_candidate(old_head: str, live_main: str) -> str:
    old_commit = commit_details(old_head)
    parents = old_commit.get("parents", [])
    if len(parents) != 1:
        raise RuntimeError(f"candidate {old_head} does not have exactly one parent")
    old_parent = parents[0]["sha"]
    overlap = sorted(set(changed_between(old_parent, live_main)) & set(EXPECTED_FILES))
    if overlap:
        raise RuntimeError(f"live main overlaps product paths: {overlap}")

    git_main = api_get(f"/git/commits/{live_main}")[1]
    tree = api_post(
        "/git/trees",
        {
            "base_tree": git_main["tree"]["sha"],
            "tree": [
                {"path": path, "mode": "100644", "type": "blob", "sha": sha}
                for path, sha in EXPECTED_BLOBS.items()
            ],
        },
    )
    candidate = api_post(
        "/git/commits",
        {
            "message": COMMIT_MESSAGE,
            "tree": tree["sha"],
            "parents": [live_main],
            "author": {
                "name": "github-actions[bot]",
                "email": "41898282+github-actions[bot]@users.noreply.github.com",
                "date": COMMIT_DATE,
            },
            "committer": {
                "name": "github-actions[bot]",
                "email": "41898282+github-actions[bot]@users.noreply.github.com",
                "date": COMMIT_DATE,
            },
        },
    )

    current_pr = pull_request()
    if current_pr["head"]["sha"] != old_head or main_sha() != live_main:
        log("candidate reconstruction superseded before ref update")
        return pull_request()["head"]["sha"]

    encoded_ref = urllib.parse.quote(f"heads/{PR_BRANCH}", safe="/")
    api_patch(f"/git/refs/{encoded_ref}", {"sha": candidate["sha"], "force": True})
    observed = pull_request()["head"]["sha"]
    if observed != candidate["sha"]:
        raise RuntimeError(f"branch readback mismatch after reconstruction: {observed}")
    log("reconstructed candidate on live main", head=observed, base=live_main)
    return observed


def mark_ready_if_needed(pr: dict[str, Any]) -> None:
    if not pr.get("draft"):
        return
    mutation = """
      mutation($id:ID!) {
        markPullRequestReadyForReview(input:{pullRequestId:$id}) {
          pullRequest { isDraft }
        }
      }
    """
    data = graphql(mutation, {"id": pr["node_id"]})
    if data["markPullRequestReadyForReview"]["pullRequest"]["isDraft"]:
        raise RuntimeError("ready-for-review mutation did not clear draft state")


def ensure_candidate() -> tuple[str, str]:
    pr = pull_request()
    if pr.get("merged"):
        return pr["head"]["sha"], main_sha()
    if pr["state"] != "open":
        raise RuntimeError(f"PR is not open: {pr['state']}")
    if pr["head"]["ref"] != PR_BRANCH:
        raise RuntimeError(f"unexpected PR branch: {pr['head']['ref']}")
    mark_ready_if_needed(pr)

    head = pr["head"]["sha"]
    verify_product_bytes(head)
    live_main = main_sha()
    details = commit_details(head)
    parents = details.get("parents", [])
    if len(parents) != 1:
        raise RuntimeError(f"candidate {head} does not have exactly one parent")
    if parents[0]["sha"] != live_main:
        head = create_rebased_candidate(head, live_main)
        verify_product_bytes(head)
        details = commit_details(head)
        if len(details.get("parents", [])) != 1 or details["parents"][0]["sha"] != live_main:
            raise RuntimeError("rebased candidate parent proof failed")
    return head, live_main


def workflow_gate(head: str) -> tuple[bool, dict[str, Any]]:
    encoded = urllib.parse.quote(head, safe="")
    runs = get_all(f"/actions/runs?head_sha={encoded}&event=pull_request")
    latest: dict[str, dict[str, Any]] = {}
    for run in sorted(runs, key=lambda item: (item.get("created_at", ""), item.get("id", 0))):
        if run.get("name") in REQUIRED_WORKFLOWS:
            latest[run["name"]] = run
    evidence: dict[str, Any] = {}
    ready = True
    for name in sorted(REQUIRED_WORKFLOWS):
        run = latest.get(name)
        if not run:
            ready = False
            evidence[name] = {"status": "missing"}
            continue
        evidence[name] = {
            "id": run["id"],
            "status": run["status"],
            "conclusion": run.get("conclusion"),
            "head_sha": run.get("head_sha"),
        }
        if run["status"] != "completed" or run.get("conclusion") != "success":
            ready = False
    return ready, evidence


def issue_comments() -> list[dict[str, Any]]:
    return get_all(f"/issues/{PR_NUMBER}/comments")


def barrier_comment(head: str) -> dict[str, Any]:
    comments = issue_comments()
    candidates = [
        item for item in comments
        if (item.get("user") or {}).get("login") == OWNER
        and BARRIER_MARKER in item.get("body", "")
        and head in item.get("body", "")
    ]
    if candidates:
        return max(candidates, key=lambda item: item.get("created_at", ""))
    body = (
        f"@codex review\n\n{BARRIER_MARKER} Review exact head `{head}` as the final two-file "
        "candidate. Do not modify the branch. Inspect the compound telephone-label, lexical "
        "abbreviation, dotted-domain, quoted-period, wrapper-ownership, `(0)` trunk, numeric-tail, "
        "extension, later-phone, URL, and attached-identifier controls. Submit every actionable "
        "correctness finding against this exact head, or react with 👍 if none remains."
    )
    return api_post(f"/issues/{PR_NUMBER}/comments", {"body": body})


def review_barrier(head: str, request_comment: dict[str, Any]) -> tuple[str, dict[str, Any]]:
    request_time = parse_time(request_comment["created_at"])
    reviews = get_all(f"/pulls/{PR_NUMBER}/reviews")
    issue = issue_comments()
    inline = get_all(f"/pulls/{PR_NUMBER}/comments")
    reactions = get_all(f"/issues/comments/{request_comment['id']}/reactions")
    threads = review_threads()

    fresh_reviews = [
        item for item in reviews
        if is_codex((item.get("user") or {}).get("login"))
        and parse_time(item.get("submitted_at")) >= request_time - 2
        and item.get("commit_id") in {None, head}
    ]
    fresh_issue = [
        item for item in issue
        if is_codex((item.get("user") or {}).get("login"))
        and parse_time(item.get("created_at")) >= request_time - 2
    ]
    fresh_inline = [
        item for item in inline
        if is_codex((item.get("user") or {}).get("login"))
        and parse_time(item.get("created_at")) >= request_time - 2
        and item.get("commit_id") == head
    ]
    fresh_reactions = [
        item for item in reactions
        if is_codex((item.get("user") or {}).get("login"))
        and parse_time(item.get("created_at")) >= request_time - 2
    ]
    unresolved = [item for item in threads if not item["isResolved"] and not item["isOutdated"]]
    changes_requested = [
        item for item in fresh_reviews if str(item.get("state", "")).upper() == "CHANGES_REQUESTED"
    ]
    positive = [
        item for item in fresh_reactions if item.get("content") in {"+1", "heart", "hooray", "rocket"}
    ]
    completion_comments = [
        item for item in fresh_issue if COMPLETION_RE.search(item.get("body", ""))
    ]
    completion_reviews = [
        item for item in fresh_reviews
        if str(item.get("state", "")).upper() == "APPROVED"
        or not item.get("body", "").strip()
        or COMPLETION_RE.search(item.get("body", ""))
    ]

    event_times = [request_time]
    event_times += [parse_time(item.get("submitted_at")) for item in fresh_reviews]
    event_times += [parse_time(item.get("created_at")) for item in fresh_issue + fresh_inline + fresh_reactions]
    for thread in threads:
        for comment in thread.get("comments", {}).get("nodes", []):
            created = parse_time(comment.get("createdAt"))
            if created >= request_time - 2:
                event_times.append(created)
    latest_event = max(event_times)
    now = time.time()

    evidence = {
        "request_comment_id": request_comment["id"],
        "request_created_at": request_comment["created_at"],
        "fresh_review_ids": [item["id"] for item in fresh_reviews],
        "fresh_inline_ids": [item["id"] for item in fresh_inline],
        "fresh_reaction_ids": [item["id"] for item in fresh_reactions],
        "unresolved_thread_ids": [item["id"] for item in unresolved],
        "ready_age_seconds": round(now - request_time, 3),
        "quiescence_seconds": round(now - latest_event, 3),
    }
    if unresolved or changes_requested or fresh_inline:
        return "actionable", evidence
    terminal = bool(positive or completion_comments or completion_reviews)
    if terminal and now - request_time >= 180 and now - latest_event >= 90:
        return "ready", evidence
    return "monitoring", evidence


def premerge_recheck(expected_head: str, expected_main: str) -> bool:
    pr = pull_request()
    if pr.get("merged"):
        return False
    if pr["state"] != "open" or pr.get("draft"):
        raise RuntimeError("PR state changed before merge")
    if pr["head"]["sha"] != expected_head or main_sha() != expected_main:
        return False
    verify_product_bytes(expected_head)
    details = commit_details(expected_head)
    if len(details.get("parents", [])) != 1 or details["parents"][0]["sha"] != expected_main:
        return False
    workflows_ready, _ = workflow_gate(expected_head)
    if not workflows_ready:
        return False
    return True


def merge_exact_head(head: str) -> str | None:
    status, payload = api_put(
        f"/pulls/{PR_NUMBER}/merge",
        {
            "merge_method": "squash",
            "sha": head,
            "commit_title": "[Crawler] Preserve non-adjacent outer wrapper closers (#2194)",
            "commit_message": (
                "Classify narrative periods by lexical construct, preserve isolated compound "
                "telephone labels and genuine continuing abbreviations, and reject sentence-final "
                "abbreviations, quoted boundaries, and dotted domains."
            ),
        },
        allow=(405, 409),
    )
    if status == 200 and payload.get("merged"):
        return payload["sha"]
    pr = pull_request()
    if pr.get("merged"):
        return pr.get("merge_commit_sha")
    log("merge endpoint did not merge; transaction will requalify", status=status, payload=payload)
    return None


def postmerge_workflow(merge_sha: str) -> dict[str, Any]:
    deadline = time.time() + 3600
    while time.time() < deadline:
        encoded = urllib.parse.quote(merge_sha, safe="")
        runs = get_all(f"/actions/runs?head_sha={encoded}&event=push")
        candidates = [item for item in runs if item.get("name") == "First-party industrial-exhaust intake"]
        if candidates:
            run = max(candidates, key=lambda item: (item.get("created_at", ""), item.get("id", 0)))
            if run["status"] == "completed":
                if run.get("conclusion") != "success":
                    raise RuntimeError(f"post-merge workflow failed: {run['id']} {run.get('conclusion')}")
                return {"id": run["id"], "conclusion": run["conclusion"]}
        time.sleep(20)
    raise RuntimeError("post-merge workflow did not reach a successful terminal state")


def audit_crawler_commits(merge_sha: str) -> list[dict[str, Any]]:
    live = main_sha()
    comparison = api_get(f"/compare/{merge_sha}...{live}")[1]
    if comparison.get("status") not in {"identical", "ahead"}:
        raise RuntimeError(f"merge commit is not an ancestor of main: {comparison.get('status')}")

    audited: list[dict[str, Any]] = []
    cursor = live
    for _ in range(100):
        if cursor == merge_sha:
            return audited
        commit = commit_details(cursor)
        message = commit["commit"]["message"].splitlines()[0]
        author_login = (commit.get("author") or {}).get("login")
        if author_login == "clifford-intake-bot" or message.startswith("crawl: official-record intake"):
            paths = sorted(item["filename"] for item in commit.get("files", []))
            invalid = [
                path for path in paths
                if not (path.startswith("data/exhaust/") or path.startswith("receipts/exhaust/"))
            ]
            if invalid:
                raise RuntimeError(f"crawler commit {cursor} escaped generated paths: {invalid}")
            audited.append({"sha": cursor, "paths": paths})
        parents = commit.get("parents", [])
        if not parents:
            break
        cursor = parents[0]["sha"]
    raise RuntimeError("could not reach merge commit on main first-parent history")


def closure_comment_exists() -> bool:
    return any(CLOSURE_MARKER in item.get("body", "") for item in issue_comments())


def post_closure_receipt(
    head: str,
    merge_sha: str,
    workflows: dict[str, Any],
    review_evidence: dict[str, Any],
    postmerge: dict[str, Any],
    crawler: list[dict[str, Any]],
) -> None:
    if closure_comment_exists():
        return
    body = (
        f"{CLOSURE_MARKER}\n\n"
        f"PR #{PR_NUMBER} was squash-merged from exact qualified head `{head}` as `{merge_sha}`. "
        f"The admitted diff contains exactly `{EXPECTED_FILES[0]}` and `{EXPECTED_FILES[1]}`, "
        f"with blob identifiers `{EXPECTED_BLOBS[EXPECTED_FILES[0]]}` and "
        f"`{EXPECTED_BLOBS[EXPECTED_FILES[1]]}`. All three exact-head workflows completed "
        f"successfully: `{json.dumps(workflows, sort_keys=True)}`. The ready-triggered review "
        f"barrier completed with `{json.dumps(review_evidence, sort_keys=True)}` and no unresolved "
        f"active thread. Post-merge intake run `{postmerge['id']}` succeeded. Crawler descendants "
        f"were confined to generated exhaust paths: `{json.dumps(crawler, sort_keys=True)}`.\n\n"
        "The control question is whether any descendant product mutation or unresolved exact-head "
        "review event exists outside this recorded transaction."
    )
    api_post(f"/issues/{PR_NUMBER}/comments", {"body": body})


def verify_merged_product(merge_sha: str) -> None:
    for path, expected in EXPECTED_BLOBS.items():
        actual = blob_sha(path, merge_sha)
        if actual != expected:
            raise RuntimeError(f"merged blob proof failed for {path}: {actual} != {expected}")


def cleanup_control_branch() -> None:
    encoded = urllib.parse.quote(f"heads/{CONTROL_BRANCH}", safe="/")
    api_delete(f"/git/refs/{encoded}")


def main() -> int:
    last_head: str | None = None
    last_barrier_id: int | None = None
    final_workflows: dict[str, Any] = {}
    final_review: dict[str, Any] = {}

    while True:
        pr = pull_request()
        if pr.get("merged"):
            merge_sha = pr.get("merge_commit_sha")
            if not merge_sha:
                raise RuntimeError("merged PR lacks merge_commit_sha")
            head = pr["head"]["sha"]
            break

        head, live_main = ensure_candidate()
        if head != last_head:
            log("qualifying exact head", head=head, base=live_main)
            last_head = head
            last_barrier_id = None

        workflows_ready, workflow_evidence = workflow_gate(head)
        if not workflows_ready:
            log("waiting for exact-head workflows", head=head, workflows=workflow_evidence)
            time.sleep(20)
            continue

        request_comment = barrier_comment(head)
        if request_comment["id"] != last_barrier_id:
            log("review barrier armed", head=head, comment_id=request_comment["id"])
            last_barrier_id = request_comment["id"]

        barrier_state, review_evidence = review_barrier(head, request_comment)
        if barrier_state == "actionable":
            api_post(
                f"/issues/{PR_NUMBER}/comments",
                {
                    "body": (
                        f"{BARRIER_MARKER} Exact-head review produced actionable or unresolved "
                        f"feedback on `{head}`. Merge remains blocked. Evidence: "
                        f"`{json.dumps(review_evidence, sort_keys=True)}`"
                    )
                },
            )
            raise RuntimeError(f"actionable exact-head review feedback: {review_evidence}")
        if barrier_state != "ready":
            log("waiting for terminal review and quiescence", head=head, review=review_evidence)
            time.sleep(20)
            continue

        if not premerge_recheck(head, live_main):
            log("premerge state changed; restarting qualification")
            time.sleep(5)
            continue

        merge_sha = merge_exact_head(head)
        if not merge_sha:
            time.sleep(5)
            continue
        final_workflows = workflow_evidence
        final_review = review_evidence
        log("merge completed", head=head, merge_sha=merge_sha)
        break

    verify_merged_product(merge_sha)
    postmerge = postmerge_workflow(merge_sha)
    crawler = audit_crawler_commits(merge_sha)
    post_closure_receipt(head, merge_sha, final_workflows, final_review, postmerge, crawler)
    cleanup_control_branch()
    log(
        "finalizer completed",
        head=head,
        merge_sha=merge_sha,
        postmerge=postmerge,
        crawler_commits=len(crawler),
    )
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        log("finalizer failed closed", error=str(error))
        raise
