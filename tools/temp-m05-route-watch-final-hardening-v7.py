#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected one target, found {count}")
    return text.replace(old, new, 1)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("root", type=Path)
    args = parser.parse_args()
    root = args.root.resolve()

    contract_path = root / "data/project/m05-answerable-power-sprint-03-leg-07-five-domain-route-watch-contract.json"
    contract = json.loads(contract_path.read_text())
    contract["execution_policy"]["future_observation_clock_authorizes_execution"] = False
    contract_path.write_text(json.dumps(contract, separators=(",", ":")) + "\n")

    library_path = root / "tools/lib/m05-answerable-power-sprint-03-leg-07-five-domain-route-watch.mjs"
    library = library_path.read_text()
    library = replace_once(
        library,
        "  assert(policy.receipt_unknown_fields_allowed===false,'receipt schemas must remain closed');\n",
        "  assert(policy.receipt_unknown_fields_allowed===false,'receipt schemas must remain closed');\n  assert(policy.future_observation_clock_authorizes_execution===false,'future observation clocks must not authorize route execution');\n",
        "execution-clock policy",
    )
    library = replace_once(
        library,
        """export async function runRouteWatch(contract,{fetchImpl=globalThis.fetch,observedAtMs=Date.now(),previousReceipt=null,sleepImpl=sleep,clock=Date.now}={}){
  validateContract(contract);
  if(previousReceipt)validateReceipt(previousReceipt,contract);
""",
        """export async function runRouteWatch(contract,{fetchImpl=globalThis.fetch,observedAtMs=Date.now(),previousReceipt=null,sleepImpl=sleep,clock=Date.now}={}){
  validateContract(contract);
  const actualClockMs=Number(clock());
  assert(Number.isFinite(actualClockMs),'execution clock must be finite');
  assert(Number.isFinite(Number(observedAtMs)),'observation clock must be finite');
  assert(Number(observedAtMs)<=actualClockMs,'observation clock cannot be in the future');
  if(previousReceipt)validateReceipt(previousReceipt,contract);
""",
        "library future-clock refusal",
    )
    library = replace_once(
        library,
        "  assert(Number.isInteger(row.body_bytes)&&row.body_bytes>=0,`${label} has an invalid body byte count`);\n",
        "  assert(Number.isInteger(row.body_bytes)&&row.body_bytes>=0,`${label} has an invalid body byte count`);\n  assert(row.body_bytes<=policy.max_body_bytes,`${label} body byte count exceeds the contract ceiling`);\n",
        "receipt body ceiling",
    )
    library = replace_once(
        library,
        """  for(let index=0;index<receipt.observations.length;index++){
    const row=receipt.observations[index];
    const {lane,route}=expectedRoutes[index];
    assert(isObject(row),`receipt observation ${row?.route_id||'unknown'} must be an object`);
    assert(TERMINAL_STATUSES.has(row.status),`${row.route_id} has unclassified status ${row.status}`);
    assert(row.network_observation_only===true,`${row.route_id} exceeds network-observation authority`);
    assert(row.promotion_authority===false,`${row.route_id} claims promotion authority`);
    assert(row.answer_effect==='none',`${row.route_id} claims an answer effect`);
    assert(row.graph_effect==='none',`${row.route_id} claims a graph effect`);
    assert(!Object.prototype.hasOwnProperty.call(row,'body'),`${row.route_id} improperly retains response body bytes`);
    validateObservationState(row,lane,route,contract);
    const intel=lane.lane_id===contract.intel_time_gate.lane_id;
    if(intel&&!eligible)assert(row.status==='gated_not_before',`${row.route_id} escaped the pre-gate Intel terminal state`);
    else assert(row.status!=='gated_not_before',`${row.route_id} is gated outside the pre-gate Intel boundary`);
  }
  assert(isObject(receipt.summary),'receipt summary must be an object');
""",
        """  for(let index=0;index<receipt.observations.length;index++){
    const row=receipt.observations[index];
    const {lane,route}=expectedRoutes[index];
    assert(isObject(row),`receipt observation ${row?.route_id||'unknown'} must be an object`);
    assert(TERMINAL_STATUSES.has(row.status),`${row.route_id} has unclassified status ${row.status}`);
    assert(row.network_observation_only===true,`${row.route_id} exceeds network-observation authority`);
    assert(row.promotion_authority===false,`${row.route_id} claims promotion authority`);
    assert(row.answer_effect==='none',`${row.route_id} claims an answer effect`);
    assert(row.graph_effect==='none',`${row.route_id} claims a graph effect`);
    assert(!Object.prototype.hasOwnProperty.call(row,'body'),`${row.route_id} improperly retains response body bytes`);
    validateObservationState(row,lane,route,contract);
    const intel=lane.lane_id===contract.intel_time_gate.lane_id;
    if(intel&&!eligible)assert(row.status==='gated_not_before',`${row.route_id} escaped the pre-gate Intel terminal state`);
    else assert(row.status!=='gated_not_before',`${row.route_id} is gated outside the pre-gate Intel boundary`);
  }
  const comparisonDeclared=receipt.previous_receipt_proof_sha256!==null;
  assert(receipt.observations.every((row)=>comparisonDeclared?typeof row.changed_since_previous==='boolean':row.changed_since_previous===null),'receipt comparison flags do not match previous-receipt provenance');
  assert(isObject(receipt.summary),'receipt summary must be an object');
""",
        "comparison provenance",
    )
    library = replace_once(
        library,
        "  assert(validSha256(proof),'receipt proof is not a SHA-256 digest');\n  assert(proof===sha256(Buffer.from(canonicalJson(core),'utf8')),'receipt proof mismatch');\n",
        "  assert(validSha256(proof),'receipt proof is not a SHA-256 digest');\n  assert(receipt.previous_receipt_proof_sha256===null||receipt.previous_receipt_proof_sha256!==proof,'receipt cannot name its own proof as the previous receipt');\n  assert(proof===sha256(Buffer.from(canonicalJson(core),'utf8')),'receipt proof mismatch');\n",
        "comparison self-reference refusal",
    )
    library_path.write_text(library)

    runner_path = root / "tools/run-m05-answerable-power-sprint-03-leg-07-five-domain-route-watch.mjs"
    runner = runner_path.read_text()
    runner = replace_once(
        runner,
        "  --observed-at <time>  RFC 3339 observation clock; defaults to current time\\n",
        "  --observed-at <time>  Historical RFC 3339 observation clock; future values are refused\\n",
        "runner usage",
    )
    runner = replace_once(
        runner,
        """  const previousReceipt=args.previous?await readJson(args.previous):null;
  const observedAtMs=args.observedAt===null?Date.now():Date.parse(args.observedAt);
  if(!Number.isFinite(observedAtMs))throw new Error(`Invalid --observed-at value: ${args.observedAt}`);
  const receipt=await runRouteWatch(contract,{observedAtMs,previousReceipt});
""",
        """  const previousReceipt=args.previous?await readJson(args.previous):null;
  const actualNow=Date.now();
  const observedAtMs=args.observedAt===null?actualNow:Date.parse(args.observedAt);
  if(!Number.isFinite(observedAtMs))throw new Error(`Invalid --observed-at value: ${args.observedAt}`);
  if(observedAtMs>actualNow)throw new Error(`--observed-at cannot be in the future: ${args.observedAt}`);
  const receipt=await runRouteWatch(contract,{observedAtMs,previousReceipt});
""",
        "runner future-clock refusal",
    )
    runner_path.write_text(runner)

    test_path = root / "test/m05-answerable-power-sprint-03-leg-07-five-domain-route-watch.test.js"
    test = test_path.read_text()
    test = replace_once(
        test,
        "const workflow=fs.readFileSync(new URL('../.github/workflows/m05-five-domain-route-watch.yml',import.meta.url),'utf8');\n",
        "const workflow=fs.readFileSync(new URL('../.github/workflows/m05-five-domain-route-watch.yml',import.meta.url),'utf8');\nconst runner=fs.readFileSync(new URL('../tools/run-m05-answerable-power-sprint-03-leg-07-five-domain-route-watch.mjs',import.meta.url),'utf8');\n",
        "runner fixture",
    )
    test = replace_once(
        test,
        "assert.equal(contract.execution_policy.receipt_unknown_fields_allowed,false);\n",
        "assert.equal(contract.execution_policy.receipt_unknown_fields_allowed,false);\nassert.equal(contract.execution_policy.future_observation_clock_authorizes_execution,false);\nassert(runner.includes('--observed-at cannot be in the future'));\n",
        "future-clock assertions",
    )
    gate_old = """{
  let calls=0;
  const receipt=await runRouteWatch(contract,{
    observedAtMs:Date.parse('2026-08-27T00:00:00Z'),
"""
    gate_new = """{
  const gateOpen=Date.parse('2026-08-27T00:00:00Z');
  clockValue=Math.max(clockValue,gateOpen+1000);
  let calls=0;
  const receipt=await runRouteWatch(contract,{
    observedAtMs:gateOpen,
"""
    test = replace_once(test, gate_old, gate_new, "post-gate fixture clock")
    after_gate = "const afterGate=Date.parse('2026-08-28T00:00:00Z');\n"
    test = test.replace(after_gate, after_gate + "  clockValue=Math.max(clockValue,afterGate+1000);\n")
    addition = r"""

{
  const actual=Date.parse('2026-08-22T00:00:00Z');
  await assert.rejects(()=>runRouteWatch(contract,{
    observedAtMs:Date.parse('2026-08-27T00:00:00Z'),
    fetchImpl:async()=>successResponse('must not execute'),
    sleepImpl:noSleep,
    clock:()=>actual
  }),/observation clock cannot be in the future/u);
}

{
  const afterGate=Date.parse('2026-08-28T00:00:00Z');
  clockValue=Math.max(clockValue,afterGate+1000);
  const receipt=await runRouteWatch(contract,{
    observedAtMs:afterGate,
    fetchImpl:async()=>successResponse('bounded representation'),
    sleepImpl:noSleep,
    clock
  });
  const oversized=clone(receipt);
  oversized.observations[0].body_bytes=contract.execution_policy.max_body_bytes+1;
  oversized.observations[0].body_sha256=sha256(Buffer.from('synthetic oversized digest'));
  resign(oversized);
  assert.throws(()=>validateReceipt(oversized,contract),/body byte count exceeds the contract ceiling/u);

  const falseComparison=clone(receipt);
  falseComparison.observations[0].changed_since_previous=false;
  resign(falseComparison);
  assert.throws(()=>validateReceipt(falseComparison,contract),/comparison flags do not match previous-receipt provenance/u);

  const previous=await runRouteWatch(contract,{
    observedAtMs:afterGate,
    fetchImpl:async()=>successResponse('previous representation'),
    sleepImpl:noSleep,
    clock
  });
  const compared=await runRouteWatch(contract,{
    observedAtMs:afterGate,
    previousReceipt:previous,
    fetchImpl:async()=>successResponse('current representation'),
    sleepImpl:noSleep,
    clock
  });
  const missingProvenance=clone(compared);
  missingProvenance.previous_receipt_proof_sha256=null;
  resign(missingProvenance);
  assert.throws(()=>validateReceipt(missingProvenance,contract),/comparison flags do not match previous-receipt provenance/u);

  const selfReference=clone(compared);
  const {proof_sha256:ignored,...core}=selfReference;
  selfReference.previous_receipt_proof_sha256=sha256(Buffer.from(canonicalJson(core),'utf8'));
  resign(selfReference);
  selfReference.previous_receipt_proof_sha256=selfReference.proof_sha256;
  resign(selfReference);
  assert.throws(()=>validateReceipt(selfReference,contract),/cannot name its own proof/u);
}
"""
    test = replace_once(
        test,
        "\nconsole.log('m05-answerable-power-sprint-03-leg-07-five-domain-route-watch.test: OK');\n",
        addition + "\nconsole.log('m05-answerable-power-sprint-03-leg-07-five-domain-route-watch.test: OK');\n",
        "final hardening tests",
    )
    test_path.write_text(test)


if __name__ == "__main__":
    main()
