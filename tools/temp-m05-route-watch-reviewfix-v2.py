#!/usr/bin/env python3
from __future__ import annotations

import argparse
from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected one replacement target, found {count}")
    return text.replace(old, new, 1)


def patch_workflow(root: Path) -> None:
    path = root / ".github/workflows/m05-five-domain-route-watch.yml"
    text = path.read_text()
    text = replace_once(
        text,
        "permissions:\n  contents: read\n  issues: write\n",
        "permissions:\n  actions: read\n  contents: read\n  issues: write\n",
        "workflow permissions",
    )
    old = """      - name: Execute the frozen twenty-route watch
        run: |
          node tools/run-m05-answerable-power-sprint-03-leg-07-five-domain-route-watch.mjs \\
            --output build/m05-five-domain-route-watch/m05-five-domain-route-watch-receipt.json
"""
    new = """      - name: Restore latest compatible validated receipt
        id: previous
        env:
          GH_TOKEN: ${{ github.token }}
        shell: bash
        run: |
          set -euo pipefail
          previous_dir="$RUNNER_TEMP/m05-five-domain-route-watch-previous"
          rm -rf "$previous_dir"
          mkdir -p "$previous_dir"
          while IFS= read -r run_id; do
            [[ -n "$run_id" ]] || continue
            [[ "$run_id" == "$GITHUB_RUN_ID" ]] && continue
            artifact_id="$(
              gh api --method GET \\
                "repos/${GITHUB_REPOSITORY}/actions/runs/${run_id}/artifacts?per_page=100" \\
                --jq ".artifacts[] | select(.expired == false and .name == \\\"m05-five-domain-route-watch-${run_id}\\\") | .id" \\
                | head -n 1
            )"
            [[ -n "$artifact_id" ]] || continue
            rm -rf "$previous_dir/extracted"
            mkdir -p "$previous_dir/extracted"
            gh api \\
              "repos/${GITHUB_REPOSITORY}/actions/artifacts/${artifact_id}/zip" \\
              > "$previous_dir/artifact.zip"
            unzip -q "$previous_dir/artifact.zip" -d "$previous_dir/extracted"
            candidate="$(find "$previous_dir/extracted" -type f -name 'm05-five-domain-route-watch-receipt.json' -print -quit)"
            if [[ -z "$candidate" ]]; then
              echo "Prior successful run ${run_id} has a malformed watcher artifact" >&2
              exit 2
            fi
            if node tools/validate-m05-answerable-power-sprint-03-leg-07-five-domain-route-watch.mjs --receipt "$candidate"; then
              cp "$candidate" "$previous_dir/previous-receipt.json"
              echo "previous_receipt=$previous_dir/previous-receipt.json" >> "$GITHUB_OUTPUT"
              echo "previous_run_id=$run_id" >> "$GITHUB_OUTPUT"
              exit 0
            fi
            echo "::notice::Skipping prior run ${run_id} because its receipt is incompatible with the current contract"
          done < <(
            gh api --method GET \\
              "repos/${GITHUB_REPOSITORY}/actions/workflows/m05-five-domain-route-watch.yml/runs?branch=main&status=success&per_page=30" \\
              --jq '.workflow_runs[].id'
          )
          echo 'previous_receipt=' >> "$GITHUB_OUTPUT"
          echo 'previous_run_id=' >> "$GITHUB_OUTPUT"
      - name: Execute the frozen twenty-route watch
        env:
          PREVIOUS_RECEIPT: ${{ steps.previous.outputs.previous_receipt }}
        shell: bash
        run: |
          set -euo pipefail
          previous_args=()
          if [[ -n "$PREVIOUS_RECEIPT" ]]; then
            previous_args=(--previous "$PREVIOUS_RECEIPT")
          fi
          node tools/run-m05-answerable-power-sprint-03-leg-07-five-domain-route-watch.mjs \\
            --output build/m05-five-domain-route-watch/m05-five-domain-route-watch-receipt.json \\
            "${previous_args[@]}"
"""
    text = replace_once(text, old, new, "workflow previous receipt")
    text = replace_once(
        text,
        "      - name: Write step summary\n        run: |\n",
        "      - name: Write step summary\n        env:\n          PREVIOUS_RUN_ID: ${{ steps.previous.outputs.previous_run_id }}\n        run: |\n",
        "workflow summary environment",
    )
    text = replace_once(
        text,
        "            `- Unclassified failures: ${s.unclassified_failures}`,\n            `- Qualifying evidence receipts: ${s.qualifying_evidence_receipts}`,\n",
        "            `- Unclassified failures: ${s.unclassified_failures}`,\n            `- Previous successful run: ${process.env.PREVIOUS_RUN_ID||'none'}`,\n            `- Previous receipt proof: ${receipt.previous_receipt_proof_sha256||'none'}`,\n            `- Changed routes: ${s.changed_routes}`,\n            `- Uncompared routes: ${s.uncompared_routes}`,\n            `- Qualifying evidence receipts: ${s.qualifying_evidence_receipts}`,\n",
        "workflow summary comparison fields",
    )
    path.write_text(text)


def patch_library(root: Path) -> None:
    path = root / "tools/lib/m05-answerable-power-sprint-03-leg-07-five-domain-route-watch.mjs"
    text = path.read_text()
    start = text.index("function expectedSummary(receipt,contract)")
    end = text.index("  const derived=expectedSummary(receipt,contract);", start)
    replacement = r"""function expectedSummary(receipt,contract){return summarizeObservations(receipt.observations,contract)}

function validSha256(value){return typeof value==='string'&&/^[0-9a-f]{64}$/u.test(value)}
function nonEmptyString(value){return typeof value==='string'&&value.length>0}
function validTimestamp(value){return typeof value==='string'&&Number.isFinite(Date.parse(value))}

function validateObservationState(row,lane,route,contract){
  const label=row.route_id;
  const policy=contract.execution_policy;
  assert(row.lane_id===lane.lane_id,`${label} lane binding drift`);
  assert(row.domain_id===lane.domain_id,`${label} domain binding drift`);
  assert(row.jurisdiction===lane.jurisdiction,`${label} jurisdiction binding drift`);
  assert(row.route_class===lane.route_class,`${label} route-class binding drift`);
  assert(row.requested_url===route.url,`${label} requested URL binding drift`);
  assert(nonEmptyString(row.final_url),`${label} requires a final_url`);
  assert(validTimestamp(row.observed_at),`${label} has an invalid observation timestamp`);
  if(Object.prototype.hasOwnProperty.call(row,'completed_at'))assert(validTimestamp(row.completed_at),`${label} has an invalid completion timestamp`);
  assert(typeof row.route_success==='boolean',`${label} route_success must be boolean`);
  assert(typeof row.content_success==='boolean',`${label} content_success must be boolean`);
  assert(typeof row.metadata_only==='boolean',`${label} metadata_only must be boolean`);
  assert(row.changed_since_previous===null||typeof row.changed_since_previous==='boolean',`${label} changed_since_previous must be boolean or null`);
  assert(Array.isArray(row.redirect_chain),`${label} redirect_chain must be an array`);
  assert(isObject(row.response_headers),`${label} response_headers must be an object`);
  assert(Number.isInteger(row.network_request_count)&&row.network_request_count>=0&&row.network_request_count<=policy.max_redirects+1,`${label} has an invalid request count`);
  assert(row.status_code===null||(Number.isInteger(row.status_code)&&row.status_code>=100&&row.status_code<=599),`${label} has an invalid status_code`);
  assert(Number.isInteger(row.body_bytes)&&row.body_bytes>=0,`${label} has an invalid body byte count`);
  if(row.body_bytes===0)assert(row.body_sha256===null,`${label} zero-byte observation must not carry a body digest`);
  else assert(validSha256(row.body_sha256),`${label} nonempty body requires a SHA-256 digest`);

  const contentRetrieved=row.status==='content_retrieved';
  const metadataOnly=row.status==='metadata_only';
  assert(row.route_success===(contentRetrieved||metadataOnly),`${label} route_success is incoherent with ${row.status}`);
  assert(row.content_success===contentRetrieved,`${label} content_success is incoherent with ${row.status}`);
  assert(row.metadata_only===metadataOnly,`${label} metadata_only flag is incoherent with ${row.status}`);

  switch(row.status){
    case 'content_retrieved':
      assert(row.status_code>=200&&row.status_code<=299,`${label} content_retrieved requires a 2xx status`);
      assert(row.network_request_count>=1,`${label} content_retrieved requires a network request`);
      assert(row.body_bytes>0,`${label} content_retrieved requires positive body bytes`);
      assert(row.reason===null,`${label} content_retrieved must not carry a failure reason`);
      break;
    case 'metadata_only':
      assert(row.status_code>=200&&row.status_code<=299,`${label} metadata_only requires a 2xx status`);
      assert(row.network_request_count>=1,`${label} metadata_only requires a network request`);
      assert(row.body_bytes===0&&row.body_sha256===null,`${label} metadata_only must remain bodyless`);
      assert(row.reason===null,`${label} metadata_only must not carry a failure reason`);
      break;
    case 'http_failure':
      assert(row.status_code>=400&&row.status_code<=599,`${label} http_failure requires a 4xx or 5xx status`);
      assert(row.network_request_count>=1,`${label} http_failure requires a network request`);
      assert(nonEmptyString(row.reason),`${label} http_failure requires a reason`);
      break;
    case 'transport_failure':
    case 'timeout':
      assert(row.status_code===null,`${label} ${row.status} status_code must be null`);
      assert(row.network_request_count>=1,`${label} ${row.status} requires a network attempt`);
      assert(row.body_bytes===0&&row.body_sha256===null,`${label} ${row.status} must not retain body bytes`);
      assert(nonEmptyString(row.reason),`${label} ${row.status} requires a reason`);
      break;
    case 'body_limit_exceeded':
      assert(row.status_code!==null&&row.status_code>=200&&row.status_code<=599,`${label} body_limit_exceeded requires an HTTP status`);
      assert(row.network_request_count>=1,`${label} body_limit_exceeded requires a network request`);
      assert(row.body_bytes===0&&row.body_sha256===null,`${label} body_limit_exceeded must not retain body bytes`);
      assert(nonEmptyString(row.reason),`${label} body_limit_exceeded requires a reason`);
      break;
    case 'gated_not_before':
      assert(row.status_code===null,`${label} gated_not_before status_code must be null`);
      assert(row.network_request_count===0,`${label} executed before its gate`);
      assert(row.body_bytes===0&&row.body_sha256===null,`${label} gated_not_before must remain bodyless`);
      assert(row.not_before_utc===contract.intel_time_gate.ordinary_gate_utc,`${label} Intel not-before boundary drift`);
      assert(nonEmptyString(row.reason),`${label} gated_not_before requires a reason`);
      break;
    case 'policy_refusal':
      assert(row.status_code===null||(row.status_code>=300&&row.status_code<=399),`${label} policy_refusal status_code must be null or 3xx`);
      assert(row.body_bytes===0&&row.body_sha256===null,`${label} policy_refusal must not retain body bytes`);
      assert(nonEmptyString(row.reason),`${label} policy_refusal requires a reason`);
      break;
    default:
      fail(`${label} has unclassified status ${row.status}`);
  }
}

export function validateReceipt(receipt,contract){
  validateContract(contract);
  assert(isObject(receipt),'receipt must be an object');
  assert(receipt.schema_version===RECEIPT_SCHEMA,`unexpected receipt schema ${receipt.schema_version}`);
  assert(receipt.object_class==='bounded_five_domain_official_route_watch_receipt','unexpected receipt object_class');
  assert(receipt.program_id==='M-05'&&receipt.sprint_id==='M05-SPRINT-03'&&receipt.leg_id==='S03-L7','receipt program identity drift');
  assert(receipt.issue===345,'receipt issue binding must remain 345');
  assert(receipt.contract_semantic_sha256===semanticSha256(contract),'receipt contract binding drift');
  assert(canonicalJson(receipt.contract_authoring_base)===canonicalJson(contract.canonical_base_at_authoring),'receipt authoring-base binding drift');
  assert(receipt.body_hash_domain===contract.execution_policy.body_hash_domain,'receipt body hash domain drift');
  assert(receipt.previous_receipt_proof_sha256===null||validSha256(receipt.previous_receipt_proof_sha256),'previous receipt proof must be null or a SHA-256 digest');
  assert(validTimestamp(receipt.generated_at),'receipt generated_at is invalid');
  assert(validTimestamp(receipt.observation_clock_utc),'receipt observation clock is invalid');
  assert(Array.isArray(receipt.observations)&&receipt.observations.length===20,'receipt must contain twenty observations');
  const expectedRoutes=flattenRoutes(contract);
  const expectedIds=expectedRoutes.map(({route})=>route.route_id);
  const actualIds=receipt.observations.map((row)=>row.route_id);
  assert(JSON.stringify(actualIds)===JSON.stringify(expectedIds),'receipt route order or denominator drift');
  assert(new Set(actualIds).size===20,'receipt route identities must be unique');
  for(let index=0;index<receipt.observations.length;index++){
    const row=receipt.observations[index];
    const {lane,route}=expectedRoutes[index];
    assert(isObject(row),`receipt observation ${row?.route_id||'unknown'} must be an object`);
    assert(row.terminal===true,`${row.route_id} is not terminal`);
    assert(TERMINAL_STATUSES.has(row.status),`${row.route_id} has unclassified status ${row.status}`);
    assert(row.network_observation_only===true,`${row.route_id} exceeds network-observation authority`);
    assert(row.promotion_authority===false,`${row.route_id} claims promotion authority`);
    assert(row.answer_effect==='none',`${row.route_id} claims an answer effect`);
    assert(row.graph_effect==='none',`${row.route_id} claims a graph effect`);
    assert(!Object.prototype.hasOwnProperty.call(row,'body'),`${row.route_id} improperly retains response body bytes`);
    validateObservationState(row,lane,route,contract);
  }
"""
    text = text[:start] + replacement + text[end:]
    path.write_text(text)


def patch_test(root: Path) -> None:
    path = root / "test/m05-answerable-power-sprint-03-leg-07-five-domain-route-watch.test.js"
    text = path.read_text()
    text = replace_once(
        text,
        "  runRouteWatch,\n  validateContract,\n",
        "  runRouteWatch,\n  sha256,\n  validateContract,\n",
        "test sha256 import",
    )
    text = replace_once(
        text,
        "const clock=()=>++clockValue;\n\nvalidateContract(contract);\n",
        """const clock=()=>++clockValue;
const workflow=fs.readFileSync(new URL('../.github/workflows/m05-five-domain-route-watch.yml',import.meta.url),'utf8');
const resign=(receipt)=>{
  const {proof_sha256:ignored,...core}=receipt;
  receipt.proof_sha256=sha256(Buffer.from(canonicalJson(core),'utf8'));
  return receipt;
};

assert(workflow.includes('actions: read'));
assert(workflow.includes('status=success'));
assert(workflow.includes('actions/runs/${run_id}/artifacts'));
assert(workflow.includes('--previous "$PREVIOUS_RECEIPT"'));
assert(workflow.includes('validate-m05-answerable-power-sprint-03-leg-07-five-domain-route-watch.mjs --receipt "$candidate"'));

validateContract(contract);
""",
        "test workflow assertions",
    )
    insertion = r"""
{
  const afterGate=Date.parse('2026-08-28T00:00:00Z');
  const content=await runRouteWatch(contract,{
    observedAtMs:afterGate,
    fetchImpl:async()=>successResponse('coherent content'),
    sleepImpl:noSleep,
    clock
  });
  const zeroBody=clone(content);
  zeroBody.observations[0].body_bytes=0;
  zeroBody.observations[0].body_sha256=null;
  resign(zeroBody);
  assert.throws(()=>validateReceipt(zeroBody,contract),/content_retrieved requires positive body bytes/u);

  let mixedCalls=0;
  const mixed=await runRouteWatch(contract,{
    observedAtMs:afterGate,
    fetchImpl:async()=>{
      const index=mixedCalls++;
      if(index===0)return new Response(null,{status:204,headers:{'content-type':'text/html'}});
      if(index===1)return successResponse('failure body',503);
      return successResponse('coherent content');
    },
    sleepImpl:noSleep,
    clock
  });
  const contradictoryMetadata=clone(mixed);
  contradictoryMetadata.observations.find((row)=>row.status==='metadata_only').metadata_only=false;
  resign(contradictoryMetadata);
  assert.throws(()=>validateReceipt(contradictoryMetadata,contract),/metadata_only flag is incoherent/u);
  const contradictoryHttp=clone(mixed);
  contradictoryHttp.observations.find((row)=>row.status==='http_failure').status_code=200;
  resign(contradictoryHttp);
  assert.throws(()=>validateReceipt(contradictoryHttp,contract),/http_failure requires a 4xx or 5xx status/u);

  const policy=await runRouteWatch(contract,{
    observedAtMs:afterGate,
    fetchImpl:async()=>new Response(null,{status:302,headers:{location:'https://example.com/refused'}}),
    sleepImpl:noSleep,
    clock
  });
  const contradictoryPolicy=clone(policy);
  contradictoryPolicy.observations[0].status_code=200;
  resign(contradictoryPolicy);
  assert.throws(()=>validateReceipt(contradictoryPolicy,contract),/policy_refusal status_code must be null or 3xx/u);

  const bounded=clone(contract);
  bounded.execution_policy.max_body_bytes=1024;
  validateContract(bounded);
  const limited=await runRouteWatch(bounded,{
    observedAtMs:afterGate,
    fetchImpl:async()=>successResponse('x'.repeat(1025)),
    sleepImpl:noSleep,
    clock
  });
  const contradictoryLimit=clone(limited);
  contradictoryLimit.observations[0].body_bytes=1;
  contradictoryLimit.observations[0].body_sha256=sha256(Buffer.from('x'));
  resign(contradictoryLimit);
  assert.throws(()=>validateReceipt(contradictoryLimit,bounded),/body_limit_exceeded must not retain body bytes/u);

  const transport=await runRouteWatch(contract,{
    observedAtMs:afterGate,
    fetchImpl:async()=>{throw new Error('offline')},
    sleepImpl:noSleep,
    clock
  });
  const contradictoryTransport=clone(transport);
  contradictoryTransport.observations[0].body_bytes=1;
  contradictoryTransport.observations[0].body_sha256=sha256(Buffer.from('x'));
  resign(contradictoryTransport);
  assert.throws(()=>validateReceipt(contradictoryTransport,contract),/transport_failure must not retain body bytes/u);

  const timeout=await runRouteWatch(contract,{
    observedAtMs:afterGate,
    fetchImpl:async()=>{const error=new Error('aborted');error.name='AbortError';throw error},
    sleepImpl:noSleep,
    clock
  });
  const contradictoryTimeout=clone(timeout);
  contradictoryTimeout.observations[0].status_code=408;
  resign(contradictoryTimeout);
  assert.throws(()=>validateReceipt(contradictoryTimeout,contract),/timeout status_code must be null/u);

  const beforeGate=await runRouteWatch(contract,{
    observedAtMs:Date.parse('2026-08-22T00:00:00Z'),
    fetchImpl:async()=>successResponse('coherent content'),
    sleepImpl:noSleep,
    clock
  });
  const contradictoryGate=clone(beforeGate);
  contradictoryGate.observations.find((row)=>row.status==='gated_not_before').status_code=200;
  resign(contradictoryGate);
  assert.throws(()=>validateReceipt(contradictoryGate,contract),/gated_not_before status_code must be null/u);
}

"""
    text = replace_once(
        text,
        "console.log('m05-answerable-power-sprint-03-leg-07-five-domain-route-watch.test: OK');\n",
        insertion + "console.log('m05-answerable-power-sprint-03-leg-07-five-domain-route-watch.test: OK');\n",
        "test adversarial insertion",
    )
    path.write_text(text)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("root", type=Path)
    args = parser.parse_args()
    root = args.root.resolve()
    patch_workflow(root)
    patch_library(root)
    patch_test(root)


if __name__ == "__main__":
    main()
