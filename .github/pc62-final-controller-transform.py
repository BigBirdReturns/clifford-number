from pathlib import Path
import sys

source = Path(sys.argv[1]).read_text()


def once(old: str, new: str, label: str) -> None:
    global source
    count = source.count(old)
    if count != 1:
        raise SystemExit(f"{label} denominator {count} != 1")
    source = source.replace(old, new)


once(
    "  PRODUCT: '6c2ffff2b1768f766a84a4bd37f9c1a9ab7827cd'",
    "  PRODUCT: 'a45823ea9cdf8e587472a9ee116cf8487a65fb97'",
    "product pin",
)
once(
    "  PRODUCT_TREE: '0a6ebb735cfb7670a65da26c148306ece9fcc0c3'",
    "  PRODUCT_TREE: '2f802dce5499c95a60bf0634766061e9524092b9'",
    "tree pin",
)
once(
    "  REPAIRED_LIBRARY_BLOB: 'ab7e0d33680abd17efc4f79a8c70359a5435dbf1'\n"
    "  REPAIRED_TEST_BLOB: '6572515cc35a7b0a15e0822e579c567470dc4140'",
    "  WEB_REPAIR_RUN: '31470358425'\n"
    "  WEB_REPAIR_ARTIFACT: '9093108773'\n"
    "  WEB_REPAIR_DIGEST: 'sha256:2bebb951bcf84d70c5c68a9acc978ccf8069dbada90764651b0dc9db3458650e'\n"
    "  WEB_REPAIR_HEAD: 'f0b1df5ebcbb0c402cbfbf3031f960a9a0200332'\n"
    "  REPAIRED_LIBRARY_BLOB: 'e1b853f4dc71b8e102a5517df6ccf5834fc22d6e'\n"
    "  REPAIRED_TEST_BLOB: '034bf4a4dde5cf074d01e4430cd3a6d78b6125c8'",
    "repair env",
)
once(
    "grep -Fq 'PC-62 fixture mutations rejected: 53'",
    "grep -Fq 'PC-62 fixture mutations rejected: 57'",
    "mutation gate",
)

exotic_block = """          gh api \"/repos/$GH_REPOSITORY/actions/artifacts/$EXOTIC_REPAIR_ARTIFACT\" > \"$WORK/exotic-repair-artifact.json\"
          test \"$(jq -r .id \"$WORK/exotic-repair-artifact.json\")\" = \"$EXOTIC_REPAIR_ARTIFACT\"
          test \"$(jq -r .name \"$WORK/exotic-repair-artifact.json\")\" = 'pc62-exotic-brand-repair-materializer'
          test \"$(jq -r .digest \"$WORK/exotic-repair-artifact.json\")\" = \"$EXOTIC_REPAIR_DIGEST\"
          test \"$(jq -r .workflow_run.id \"$WORK/exotic-repair-artifact.json\")\" = \"$EXOTIC_REPAIR_RUN\"
          test \"$(jq -r .workflow_run.head_sha \"$WORK/exotic-repair-artifact.json\")\" = \"$EXOTIC_REPAIR_HEAD\"
          test \"$(jq -r .expired \"$WORK/exotic-repair-artifact.json\")\" = false
"""
web_block = exotic_block + """
          gh api \"/repos/$GH_REPOSITORY/actions/artifacts/$WEB_REPAIR_ARTIFACT\" > \"$WORK/web-repair-artifact.json\"
          test \"$(jq -r .id \"$WORK/web-repair-artifact.json\")\" = \"$WEB_REPAIR_ARTIFACT\"
          test \"$(jq -r .name \"$WORK/web-repair-artifact.json\")\" = 'pc62-web-exotic-repair-materializer'
          test \"$(jq -r .digest \"$WORK/web-repair-artifact.json\")\" = \"$WEB_REPAIR_DIGEST\"
          test \"$(jq -r .workflow_run.id \"$WORK/web-repair-artifact.json\")\" = \"$WEB_REPAIR_RUN\"
          test \"$(jq -r .workflow_run.head_sha \"$WORK/web-repair-artifact.json\")\" = \"$WEB_REPAIR_HEAD\"
          test \"$(jq -r .expired \"$WORK/web-repair-artifact.json\")\" = false
"""
once(exotic_block, web_block, "repair artifact authentication")
once(
    '          cp "$WORK/exotic-repair-artifact.json" "$PROOF/exotic-repair-artifact.json"',
    '          cp "$WORK/exotic-repair-artifact.json" "$PROOF/exotic-repair-artifact.json"\n'
    '          cp "$WORK/web-repair-artifact.json" "$PROOF/web-repair-artifact.json"',
    "proof repair copies",
)
once(
    '            --arg exotic_repair_digest "$EXOTIC_REPAIR_DIGEST" \\\n'
    '            --arg floor_v60_workflow_blob',
    '            --arg exotic_repair_digest "$EXOTIC_REPAIR_DIGEST" \\\n'
    '            --arg web_repair_artifact "$WEB_REPAIR_ARTIFACT" \\\n'
    '            --arg web_repair_digest "$WEB_REPAIR_DIGEST" \\\n'
    '            --arg floor_v60_workflow_blob',
    "proof jq args",
)
once(
    "adversarial_mutations:53,prototype_rewritten_exotic_mutations:16",
    "adversarial_mutations:57,prototype_rewritten_exotic_mutations:20,"
    "prototype_rewritten_node_exotic_mutations:16,prototype_rewritten_web_exotic_mutations:4",
    "proof mutation ledger",
)
once(
    "node_exotic_internal_slot_refusal:true,floor_v60_push_dependency_filter:true",
    "node_exotic_internal_slot_refusal:true,web_api_exotic_internal_slot_refusal:true,"
    "floor_v60_push_dependency_filter:true",
    "proof paid repair flags",
)
once(
    "repair_artifact:{id:($exotic_repair_artifact|tonumber),digest:$exotic_repair_digest,authenticated:true}},control_count",
    "repair_artifact:{id:($exotic_repair_artifact|tonumber),digest:$exotic_repair_digest,authenticated:true},"
    "web_repair_artifact:{id:($web_repair_artifact|tonumber),digest:$web_repair_digest,authenticated:true}},control_count",
    "proof repair artifacts",
)
once(
    "          adversarial mutations                     53\n"
    "          prototype-rewritten exotic mutations     16",
    "          adversarial mutations                     57\n"
    "          prototype-rewritten exotic mutations     20\n"
    "          prototype-rewritten Node mutations       16\n"
    "          prototype-rewritten Web API mutations     4",
    "receipt mutation ledger",
)
once(
    "          Node exotic-brand refusal repair        true\n"
    "          floor-v60 push dependency repair",
    "          Node exotic-brand refusal repair        true\n"
    "          Web API exotic-brand refusal repair     true\n"
    "          floor-v60 push dependency repair",
    "receipt repair flags",
)
once(
    "The paid exotic-brand P2 repair is artifact `{e['EXOTIC_REPAIR_ARTIFACT']}` with digest `{e['EXOTIC_REPAIR_DIGEST']}`. Floor-v60 binds",
    "The paid Node exotic-brand P2 repair is artifact `{e['EXOTIC_REPAIR_ARTIFACT']}` with digest `{e['EXOTIC_REPAIR_DIGEST']}`. "
    "The paid Web API exotic-brand P2 repair is artifact `{e['WEB_REPAIR_ARTIFACT']}` with digest `{e['WEB_REPAIR_DIGEST']}`. Floor-v60 binds",
    "receipt repair artifact prose",
)

Path(sys.argv[2]).write_text(source)
