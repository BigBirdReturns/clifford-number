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
    "  PRODUCT: '7725fd2168fcab12af7d79850551dc9578acb034'",
    "product pin",
)
once(
    "  PRODUCT_TREE: '0a6ebb735cfb7670a65da26c148306ece9fcc0c3'",
    "  PRODUCT_TREE: 'cca67dfac6dc10b83668660e6947161951b663fe'",
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
    "  BUILD_WORLD_REPAIR_RUN: '31473848105'\n"
    "  BUILD_WORLD_REPAIR_ARTIFACT: '9094613464'\n"
    "  BUILD_WORLD_REPAIR_DIGEST: 'sha256:938b94a45c1429657c7204d3736de64a2c3093282cbe6ffa0c69931dc6c37fdc'\n"
    "  BUILD_WORLD_REPAIR_HEAD: 'fb3739a4e4c25c1f6e01cd148ac61c6495da4a93'\n"
    "  REPAIRED_LIBRARY_BLOB: '073998e98e15aa033489097fd864944ac005613b'\n"
    "  REPAIRED_TEST_BLOB: 'cd4e3304645dd6e76a0b92ca4e34ef711ebe2457'",
    "repair environment",
)
once(
    "grep -Fq 'PC-62 fixture mutations rejected: 53'",
    "grep -Fq 'PC-62 fixture mutations rejected: 62'",
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

          gh api \"/repos/$GH_REPOSITORY/actions/artifacts/$BUILD_WORLD_REPAIR_ARTIFACT\" > \"$WORK/build-world-repair-artifact.json\"
          test \"$(jq -r .id \"$WORK/build-world-repair-artifact.json\")\" = \"$BUILD_WORLD_REPAIR_ARTIFACT\"
          test \"$(jq -r .name \"$WORK/build-world-repair-artifact.json\")\" = 'pc62-final-validation-repair-materializer'
          test \"$(jq -r .digest \"$WORK/build-world-repair-artifact.json\")\" = \"$BUILD_WORLD_REPAIR_DIGEST\"
          test \"$(jq -r .workflow_run.id \"$WORK/build-world-repair-artifact.json\")\" = \"$BUILD_WORLD_REPAIR_RUN\"
          test \"$(jq -r .workflow_run.head_sha \"$WORK/build-world-repair-artifact.json\")\" = \"$BUILD_WORLD_REPAIR_HEAD\"
          test \"$(jq -r .expired \"$WORK/build-world-repair-artifact.json\")\" = false
"""
once(exotic_block, all_repair_block, "repair artifact authentication")
once(
    '          cp "$WORK/exotic-repair-artifact.json" "$PROOF/exotic-repair-artifact.json"',
    '          cp "$WORK/exotic-repair-artifact.json" "$PROOF/exotic-repair-artifact.json"\n'
    '          cp "$WORK/web-repair-artifact.json" "$PROOF/web-repair-artifact.json"\n'
    '          cp "$WORK/final-validation-repair-artifact.json" "$PROOF/final-validation-repair-artifact.json"\n'
    '          cp "$WORK/build-world-repair-artifact.json" "$PROOF/build-world-repair-artifact.json"',
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
    '            --arg build_world_repair_artifact "$BUILD_WORLD_REPAIR_ARTIFACT" \\\n'
    '            --arg build_world_repair_digest "$BUILD_WORLD_REPAIR_DIGEST" \\\n'
    '            --arg floor_v60_workflow_blob',
    "proof jq args",
)
once(
    "adversarial_mutations:53,prototype_rewritten_exotic_mutations:16",
    "adversarial_mutations:62,prototype_rewritten_exotic_mutations:22,"
    "prototype_rewritten_node_exotic_mutations:16,prototype_rewritten_web_exotic_mutations:6,"
    "non_extensible_web_exotic_mutations:2,malformed_fixture_world_shape_mutations:2,"
    "malformed_build_world_shape_mutations:1",
    "proof mutation ledger",
)
once(
    "node_exotic_internal_slot_refusal:true,floor_v60_push_dependency_filter:true",
    "node_exotic_internal_slot_refusal:true,web_api_exotic_internal_slot_refusal:true,"
    "non_extensible_canonical_json_refusal:true,malformed_fixture_world_shape_error_ledger:true,"
    "malformed_build_world_shape_error_ledger:true,floor_v60_push_dependency_filter:true",
    "proof paid repair flags",
)
once(
    "repair_artifact:{id:($exotic_repair_artifact|tonumber),digest:$exotic_repair_digest,authenticated:true}},control_count",
    "repair_artifact:{id:($exotic_repair_artifact|tonumber),digest:$exotic_repair_digest,authenticated:true},"
    "web_repair_artifact:{id:($web_repair_artifact|tonumber),digest:$web_repair_digest,authenticated:true},"
    "final_validation_repair_artifact:{id:($final_validation_repair_artifact|tonumber),digest:$final_validation_repair_digest,authenticated:true},"
    "build_world_repair_artifact:{id:($build_world_repair_artifact|tonumber),digest:$build_world_repair_digest,authenticated:true}},control_count",
    "proof repair artifacts",
)
once(
    "          adversarial mutations                     53\n"
    "          prototype-rewritten exotic mutations     16",
    "          adversarial mutations                     62\n"
    "          prototype-rewritten exotic mutations     22\n"
    "          prototype-rewritten Node mutations       16\n"
    "          prototype-rewritten Web API mutations     6\n"
    "          non-extensible Web API mutations           2\n"
    "          malformed fixture-world mutations          2\n"
    "          malformed build-world mutations            1",
    "receipt mutation ledger",
)
once(
    "          Node exotic-brand refusal repair        true\n"
    "          floor-v60 push dependency repair",
    "          Node exotic-brand refusal repair        true\n"
    "          Web API exotic-brand refusal repair     true\n"
    "          non-extensible container refusal        true\n"
    "          malformed fixture-world error ledger   true\n"
    "          malformed build-world error ledger     true\n"
    "          floor-v60 push dependency repair",
    "receipt repair flags",
)
once(
    "The paid exotic-brand P2 repair is artifact `{e['EXOTIC_REPAIR_ARTIFACT']}` with digest `{e['EXOTIC_REPAIR_DIGEST']}`. Floor-v60 binds",
    "The paid Node exotic-brand P2 repair is artifact `{e['EXOTIC_REPAIR_ARTIFACT']}` with digest `{e['EXOTIC_REPAIR_DIGEST']}`. "
    "The paid Web API exotic-brand P2 repair is artifact `{e['WEB_REPAIR_ARTIFACT']}` with digest `{e['WEB_REPAIR_DIGEST']}`. "
    "The paid non-extensible-container and malformed fixture-world P2 repair is artifact `{e['FINAL_VALIDATION_REPAIR_ARTIFACT']}` with digest `{e['FINAL_VALIDATION_REPAIR_DIGEST']}`. "
    "The paid malformed build-world P2 repair is artifact `{e['BUILD_WORLD_REPAIR_ARTIFACT']}` with digest `{e['BUILD_WORLD_REPAIR_DIGEST']}`. Floor-v60 binds",
    "receipt repair artifact prose",
)

Path(sys.argv[2]).write_text(source)
