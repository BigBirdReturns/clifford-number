from __future__ import annotations

from pathlib import Path
import base64
import hashlib
import json
import sys
import textwrap
import zlib

LEGACY_PROOF = '90bb94f010fdca48285e39cc8a9874eabb20863a1ac2312980e64b6ff20489dd'
LEGACY_CONTRACT = '26f179d929e40f91282967f985bbc96fcb5ab442aa2bc96a1ebc3f2ad04aedfc'
LEGACY_ROUTES = [
    'M05-WATCH-AU-ROBODEBT-ANNUAL-REPORT',
    'M05-WATCH-AU-ROBODEBT-ANAO-FUTURE-AUDIT',
    'M05-WATCH-AU-ROBODEBT-DEBT-SUPPORT',
]


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected one anchor, found {count}')
    return text.replace(old, new, 1)


def canonical(value):
    if isinstance(value, list):
        return [canonical(item) for item in value]
    if isinstance(value, dict):
        return {key: canonical(value[key]) for key in sorted(value)}
    return value


def load_legacy(path: Path) -> tuple[dict, str]:
    raw = path.read_bytes()
    receipt = json.loads(raw)
    if receipt.get('proof_sha256') != LEGACY_PROOF:
        raise SystemExit('legacy receipt proof identity drift')
    if receipt.get('contract_semantic_sha256') != LEGACY_CONTRACT:
        raise SystemExit('legacy receipt contract identity drift')
    core = {key: value for key, value in receipt.items() if key != 'proof_sha256'}
    encoded = json.dumps(canonical(core), separators=(',', ':'), ensure_ascii=False).encode()
    if hashlib.sha256(encoded).hexdigest() != LEGACY_PROOF:
        raise SystemExit('legacy receipt proof does not recompute')
    completionless = [
        row['route_id'] for row in receipt['observations']
        if row['status'] != 'gated_not_before' and 'completed_at' not in row
    ]
    if completionless != LEGACY_ROUTES:
        raise SystemExit(f'legacy completionless denominator drift: {completionless}')
    return receipt, base64.b64encode(zlib.compress(raw, 9)).decode()


def fixture(encoded: str) -> str:
    chunks = textwrap.wrap(encoded, 100)
    lines = ['const legacyCompletionlessReceipt=JSON.parse(inflateSync(Buffer.from(']
    for index, chunk in enumerate(chunks):
        lines.append(f"  '{chunk}'{'+' if index < len(chunks) - 1 else ','}")
    lines.extend(["  'base64'", ")).toString('utf8'));"])
    return '\n'.join(lines)


def patch_library(path: Path) -> None:
    text = path.read_text()
    text = replace_once(
        text,
        "const FAILURE_STATUSES=new Set(['challenge_page','http_failure','transport_failure','timeout','body_limit_exceeded','policy_refusal']);\n\n"
        "function validSha256(value){return typeof value==='string'&&/^[0-9a-f]{64}$/u.test(value)}",
        "const FAILURE_STATUSES=new Set(['challenge_page','http_failure','transport_failure','timeout','body_limit_exceeded','policy_refusal']);\n"
        f"const LEGACY_COMPLETIONLESS_RECEIPT_PROOFS=new Set(['{LEGACY_PROOF}']);\n"
        "const LEGACY_COMPLETIONLESS_STATUSES=new Set(['transport_failure','timeout','body_limit_exceeded','policy_refusal']);\n\n"
        "function validSha256(value){return typeof value==='string'&&/^[0-9a-f]{64}$/u.test(value)}",
        'legacy compatibility constants',
    )
    text = replace_once(
        text,
        "function validateObservationState(row,lane,route,contract,receiptTimes){\n"
        "  const label=row.route_id;\n"
        "  const policy=contract.execution_policy;\n"
        "  const keys=[...OBSERVATION_KEYS];\n"
        "  if(COMPLETED_STATUSES.has(row.status))keys.push('completed_at');",
        "function validateObservationState(row,lane,route,contract,receiptTimes){\n"
        "  const label=row.route_id;\n"
        "  const policy=contract.execution_policy;\n"
        "  const legacyCompletionless=receiptTimes.legacyCompletionlessReceipt&&\n"
        "    LEGACY_COMPLETIONLESS_STATUSES.has(row.status)&&\n"
        "    !Object.prototype.hasOwnProperty.call(row,'completed_at');\n"
        "  const keys=[...OBSERVATION_KEYS];\n"
        "  if(COMPLETED_STATUSES.has(row.status)&&!legacyCompletionless)keys.push('completed_at');",
        'legacy exact-key exception',
    )
    text = replace_once(
        text,
        "  if(COMPLETED_STATUSES.has(row.status)){\n"
        "    assert(validTimestamp(row.completed_at),`${label} has an invalid completion timestamp`);\n"
        "    const completedAtMs=Date.parse(row.completed_at);\n"
        "    assert(completedAtMs>=rowObservedAtMs,`${label} completes before it starts`);\n"
        "    assert(completedAtMs<=receiptTimes.generatedAtMs,`${label} completes after receipt generation`);\n"
        "  }",
        "  if(COMPLETED_STATUSES.has(row.status)&&!legacyCompletionless){\n"
        "    assert(validTimestamp(row.completed_at),`${label} has an invalid completion timestamp`);\n"
        "    const completedAtMs=Date.parse(row.completed_at);\n"
        "    assert(completedAtMs>=rowObservedAtMs,`${label} completes before it starts`);\n"
        "    assert(completedAtMs<=receiptTimes.generatedAtMs,`${label} completes after receipt generation`);\n"
        "  }",
        'legacy temporal exception',
    )
    text = replace_once(
        text,
        "    validateObservationState(row,lane,route,contract,{observationClockMs:observedAtMs,generatedAtMs});",
        "    validateObservationState(row,lane,route,contract,{\n"
        "      observationClockMs:observedAtMs,\n"
        "      generatedAtMs,\n"
        "      legacyCompletionlessReceipt:LEGACY_COMPLETIONLESS_RECEIPT_PROOFS.has(receipt.proof_sha256)\n"
        "    });",
        'legacy proof binding',
    )
    path.write_text(text)


def patch_test(path: Path, encoded: str) -> None:
    text = path.read_text()
    text = replace_once(
        text,
        "import fs from 'node:fs';\n",
        "import fs from 'node:fs';\nimport {inflateSync} from 'node:zlib';\n",
        'fixture decompressor import',
    )
    text = replace_once(
        text,
        "const clone=(value)=>JSON.parse(JSON.stringify(value));",
        "const clone=(value)=>JSON.parse(JSON.stringify(value));\n" + fixture(encoded),
        'canonical legacy fixture',
    )
    insertion = f"""

{{
  assert.equal(legacyCompletionlessReceipt.proof_sha256,'{LEGACY_PROOF}');
  assert.equal(legacyCompletionlessReceipt.contract_semantic_sha256,'{LEGACY_CONTRACT}');
  validateReceipt(legacyCompletionlessReceipt,contract);
  assert.deepEqual(
    legacyCompletionlessReceipt.observations
      .filter((row)=>row.status!=='gated_not_before'&&!Object.prototype.hasOwnProperty.call(row,'completed_at'))
      .map((row)=>row.route_id),
    {json.dumps(LEGACY_ROUTES, indent=4)}
  );

  const afterGate=Date.parse('2026-08-28T20:00:00Z');
  clockValue=Math.max(clockValue,afterGate+1000);
  const successor=await runRouteWatch(contract,{{
    observedAtMs:afterGate,
    previousReceipt:legacyCompletionlessReceipt,
    fetchImpl:async()=>successResponse('strict successor after legacy predecessor'),
    sleepImpl:noSleep,
    clock
  }});
  validateReceipt(successor,contract);
  assert.equal(successor.previous_receipt_proof_sha256,legacyCompletionlessReceipt.proof_sha256);
  assert.equal(successor.summary.uncompared_routes,0);
  assert(successor.observations.every((row)=>typeof row.changed_since_previous==='boolean'));
  assert(successor.observations.every((row)=>Object.prototype.hasOwnProperty.call(row,'completed_at')));

  const resignedLegacy=clone(legacyCompletionlessReceipt);
  resignedLegacy.observations.find((row)=>row.status==='timeout').reason='synthetic resigned legacy timeout';
  resign(resignedLegacy);
  assert.notEqual(resignedLegacy.proof_sha256,legacyCompletionlessReceipt.proof_sha256);
  assert.throws(()=>validateReceipt(resignedLegacy,contract),/keys drift/u);
}}
"""
    text = replace_once(
        text,
        "\nconsole.log('m05-answerable-power-sprint-03-leg-07-five-domain-route-watch.test: OK');\n",
        insertion + "\nconsole.log('m05-answerable-power-sprint-03-leg-07-five-domain-route-watch.test: OK');\n",
        'legacy compatibility regression',
    )
    path.write_text(text)


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit('usage: patcher ROOT LEGACY_RECEIPT')
    root = Path(sys.argv[1])
    _, encoded = load_legacy(Path(sys.argv[2]))
    patch_library(root / 'tools/lib/m05-answerable-power-sprint-03-leg-07-five-domain-route-watch.mjs')
    patch_test(root / 'test/m05-answerable-power-sprint-03-leg-07-five-domain-route-watch.test.js', encoded)


if __name__ == '__main__':
    main()
