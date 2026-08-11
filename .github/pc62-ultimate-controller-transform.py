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
    "  PRODUCT: '3df0391ed6fb30240423c7df3aa721479668903a'",
    "product pin",
)
once(
    "  PRODUCT_TREE: '0a6ebb735cfb7670a65da26c148306ece9fcc0c3'",
    "  PRODUCT_TREE: '955603ce04e9aca04e8dae4a3589f89bef6bc4f4'",
    "tree pin",
)
once(
    "  REPAIRED_LIBRARY_BLOB: 'ab7e0d33680abd17efc4f79a8c70359a5435dbf1'\n"
    "  REPAIRED_TEST_BLOB: '6572515cc35a7b0a15e0822e579c567470dc4140'",
    "  WEB_REPAIR_RUN: '31470358425'\n"
    "  WEB_REPAIR_ARTIFACT: '9093108773'\n"
    "  WEB_REPAIR_DIGEST: 'sha256:2bebb951bcf84d70c5c68a9acc978ccf8069dbada90764651b0dc9db3458650e'\n"
    "  WEB_REPAIR_HEAD: 'f0b1df5ebcbb0c402cbfbf3031f960a9a0200332'\n"
    "  FINAL_VALIDATION_REPAIR_RUN: '31472882541'\n"
    "  FINAL_VALIDATION_REPAIR_ARTIFACT: '9094045040'\n"
    "  FINAL_VALIDATION_REPAIR_DIGEST: 'sha256:3d4aee2b42efe7357bb0fc412ba5a90c75ba0d5639c1d59517673f7cd0686128'\n"
    "  FINAL_VALIDATION_REPAIR_HEAD: '97104f9845ecdf8068142e0acb847070c9ebe9d3'\n"
    "  REPAIRED_LIBRARY_BLOB: 'a7692f871d546ba3f16cfd4bdfa6842e7c246d9e'\n"
    "  REPAIRED_TEST_BLOB: '4633de4e3df3b0286f76d3676738d1af22145ca3'",
    "repair environment",
)
once(
    "grep -Fq 'PC-62 fixture mutations rejected: 53'",
    "grep -Fq 'PC-62 fixture mutations rejected: 61'",
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
all_repair_block = exotic_block + """
          gh api \"/repos/$GH_REPOSITORY/actions/artifacts/$WEB_REPAIR_ARTIFACT\" > \"$WORK/web-repair-artifact.json\"
          test \"$(jq -r .id \"$WORK/web-repair-artifact.json\")\" = \"$WEB_REPAIR_ARTIFACT\"
          test \"$(jq -r .name \"$WORK/web-repair-artifact.json\")\" = 'pc62-web-exotic-repair-materializer'
          test \"$(jq -r .digest \"$WORK/web-repair-artifact.json\")\" = \"$WEB_REPAIR_DIGEST\"
          test \"$(jq -r .workflow_run.id \"$WORK/web-repair-artifact.json\")\" = \"$WEB_REPAIR_RUN\"
          test \"$(jq -r .workflow_run.head_sha \"$WORK/web-repair-artifact.json\")\" = \"$WEB_REPAIR_HEAD\"
          test \"$(jq -r .expired \"$WORK/web-repair-artifact.json\")\" = false

          gh api \"/repos/$GH_REPOSITORY/actions/artifacts/$FINAL_VALIDATION_REPAIR_ARTIFACT\" > \"$WORK/final-validation-repair-artifact.json\"
          test \"$(jq -r .id \"$WORK/final-validation-repair-artifact.json\")\" = \"$FINAL_VALIDATION_REPAIR_ARTIFACT\"
          test \"$(jq -r .name \"$WORK/final-validation-repair-artifact.json\")\" = 'pc62-final-validation-repair-materializer'
          test \"$(jq -r .digest \"$WORK/final-validation-repair-artifact.json\")\" = \"$FINAL_VALIDATION_REPAIR_DIGEST\"
          test \"$(jq -r .workflow_run.id \"$WORK/final-validation-repair-artifact.json\")\" = \"$FINAL_VALIDATION_REPAIR_RUN\"
          test \"$(jq -r .workflow_run.head_sha \"$WORK/final-validation-repair-artifact.json\")\" = \"$FINAL_VALIDATION_REPAIR_HEAD\"
          test \"$(jq -r .expired \"$WORK/final-validation-repair-artifact.json\")\" = false
"""
once(exotic_block, all_repair_block, "repair artifact authentication")
once(
    '          cp "$WORK/exotic-repair-artifact.json" "$PROOF/exotic-repair-artifact.json"',
    '          cp "$WORK/exotic-repair-artifact.json" "$PROOF/exotic-repair-artifact.json"\n'
    '          cp "$WORK/web-repair-artifact.json" "$PROOF/web-repair-artifact.json"\n'
    '          cp "$WORK/final-validation-repair-artifact.json" "$PROOF/final-validation-repair-artifact.json"',
    "proof repair copies",
)
once(
    '            --arg exotic_repair_digest "$EXOTIC_REPAIR_DIGEST" \\\n'
    '            --arg floor_v60_workflow_blob',
    '            --arg exotic_repair_digest "$EXOTIC_REPAIR_DIGEST" \\\n'
    '            --arg web_repair_artifact "$WEB_REPAIR_ARTIFACT" \\\n'
    '            --arg web_repair_digest "$WEB_REPAIR_DIGEST" \\\n'
    '            --arg final_validation_repair_artifact "$FINAL_VALIDATION_REPAIR_ARTIFACT" \\\n'
    '            --arg final_validation_repair_digest "$FINAL_VALIDATION_REPAIR_DIGEST" \\\n'
    '            --arg floor_v60_workflow_blob',
    "proof jq args",
)
once(
    "adversarial_mutations:53,prototype_rewritten_exotic_mutations:16",
    "adversarial_mutations:61,prototype_rewritten_exotic_mutations:22,"
    "prototype_rewritten_node_exotic_mutations:16,prototype_rewritten_web_exotic_mutations:6,"
    "non_extensible_web_exotic_mutations:2,malformed_world_shape_mutations:2",
    "proof mutation ledger",
)
once(
    "node_exotic_internal_slot_refusal:true,floor_v60_push_dependency_filter:true",
    "node_exotic_internal_slot_refusal:true,web_api_exotic_internal_slot_refusal:true,"
    "non_extensible_canonical_json_refusal:true,malformed_world_shape_error_ledger:true,"
    "floor_v60_push_dependency_filter:true",
    "proof paid repair flags",
)
once(
    "repair_artifact:{id:($exotic_repair_artifact|tonumber),digest:$exotic_repair_digest,authenticated:true}},control_count",
    "repair_artifact:{id:($exotic_repair_artifact|tonumber),digest:$exotic_repair_digest,authenticated:true},"
    "web_repair_artifact:{id:($web_repair_artifact|tonumber),digest:$web_repair_digest,authenticated:true},"
    "final_validation_repair_artifact:{id:($final_validation_repair_artifact|tonumber),digest:$final_validation_repair_digest,authenticated:true}},control_count",
    "proof repair artifacts",
)
once(
    "          adversarial mutations                     53\n"
    "          prototype-rewritten exotic mutations     16",
    "          adversarial mutations                     61\n"
    "          prototype-rewritten exotic mutations     22\n"
    "          prototype-rewritten Node mutations       16\n"
    "          prototype-rewritten Web API mutations     6\n"
    "          non-extensible Web API mutations           2\n"
    "          malformed-world-shape mutations            2",
    "receipt mutation ledger",
)
once(
    "          Node exotic-brand refusal repair        true\n"
    "          floor-v60 push dependency repair",
    "          Node exotic-brand refusal repair        true\n"
    "          Web API exotic-brand refusal repair     true\n"
    "          non-extensible container refusal        true\n"
    "          malformed-world error ledger            true\n"
    "          floor-v60 push dependency repair",
    "receipt repair flags",
)
once(
    "The paid exotic-brand P2 repair is artifact `{e['EXOTIC_REPAIR_ARTIFACT']}` with digest `{e['EXOTIC_REPAIR_DIGEST']}`. Floor-v60 binds",
    "The paid Node exotic-brand P2 repair is artifact `{e['EXOTIC_REPAIR_ARTIFACT']}` with digest `{e['EXOTIC_REPAIR_DIGEST']}`. "
    "The paid Web API exotic-brand P2 repair is artifact `{e['WEB_REPAIR_ARTIFACT']}` with digest `{e['WEB_REPAIR_DIGEST']}`. "
    "The paid non-extensible-container and malformed-world P2 repair is artifact `{e['FINAL_VALIDATION_REPAIR_ARTIFACT']}` with digest `{e['FINAL_VALIDATION_REPAIR_DIGEST']}`. Floor-v60 binds",
    "receipt repair artifact prose",
)

Path(sys.argv[2]).write_text(source)
