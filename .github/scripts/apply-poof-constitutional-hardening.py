#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
from pathlib import Path

ROOT = Path.cwd()
DIMS = ["evidence", "graph", "review_queue", "publication", "visibility", "ranking", "custody"]
EFFECTS = {
    "POOF-O1": {
        "evidence": "none",
        "graph": "none",
        "review_queue": "none",
        "publication": "binds_projection_custody",
        "visibility": "none",
        "ranking": "none",
        "custody": "release_attached",
    },
    "POOF-O2": {
        "evidence": "none",
        "graph": "none",
        "review_queue": "opens_intake_review",
        "publication": "separate_decision_required",
        "visibility": "none",
        "ranking": "none",
        "custody": "intake_append_only",
    },
    "POOF-O3": {
        "evidence": "none",
        "graph": "none",
        "review_queue": "advisory_candidate",
        "publication": "advisory_only",
        "visibility": "none",
        "ranking": "none",
        "custody": "reader_local_or_voluntary_export",
    },
    "POOF-O4": {
        "evidence": "none",
        "graph": "none",
        "review_queue": "opens_publication_repair_review",
        "publication": "separate_decision_required",
        "visibility": "none",
        "ranking": "none",
        "custody": "audit_append_only",
    },
    "POOF-O5": {
        "evidence": "none",
        "graph": "none",
        "review_queue": "opens_correction_review",
        "publication": "separate_decision_required",
        "visibility": "none",
        "ranking": "none",
        "custody": "versioned_append_only",
    },
}
SCHEMA_FILES = {
    "POOF-O1": "schemas/poof-projection-manifest.schema.json",
    "POOF-O2": "schemas/poof-referral-packet.schema.json",
    "POOF-O3": "schemas/poof-comprehension-receipt.schema.json",
    "POOF-O4": "schemas/poof-publication-audit-receipt.schema.json",
    "POOF-O5": "schemas/poof-right-of-reply.schema.json",
}
FIXTURE_FILES = {
    "POOF-O1": "test/fixtures/poof-projection-manifest.fixture.json",
    "POOF-O2": "test/fixtures/poof-referral-packet.fixture.json",
    "POOF-O3": "test/fixtures/poof-comprehension-receipt.fixture.json",
    "POOF-O4": "test/fixtures/poof-publication-audit-receipt.fixture.json",
    "POOF-O5": "test/fixtures/poof-right-of-reply.fixture.json",
}


def read_json(relative: str):
    return json.loads((ROOT / relative).read_text())


def write_json(relative: str, value) -> None:
    target = ROOT / relative
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n")


def replace_once(relative: str, old: str, new: str) -> None:
    target = ROOT / relative
    text = target.read_text()
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{relative}: expected one anchor, found {count}: {old[:120]!r}")
    target.write_text(text.replace(old, new, 1))


def append_once(relative: str, marker: str, addition: str) -> None:
    target = ROOT / relative
    text = target.read_text()
    if marker not in text:
        target.write_text(text.rstrip() + "\n\n" + addition.strip() + "\n")


def effect_schema(effect: dict[str, str]) -> dict:
    return {
        "type": "object",
        "additionalProperties": False,
        "required": DIMS,
        "properties": {key: {"const": effect[key]} for key in DIMS},
    }


def insert_required(schema: dict, field: str, before: str = "graph_effect") -> None:
    required = schema.setdefault("required", [])
    if field in required:
        return
    if before in required:
        required.insert(required.index(before), field)
    else:
        required.append(field)


contract_path = "data/project/poof-clifford-ecology-contract.json"
contract = read_json(contract_path)
contract["operational_effect_law"] = {
    "statement": "Graph-inert is not power-inert. Every transaction must declare each operational effect it may exercise.",
    "dimensions": DIMS,
    "undeclared_effects_forbidden": True,
    "default_effect": "none",
    "effect_contract_required_on_transaction_objects": True,
    "publication_or_queue_effect_requires_separate_decision": True,
}
protected_paths = [
    contract_path,
    "data/project/poof-clifford-object-registry.json",
    "data/project/poof-clifford-projection-contracts.json",
    "schemas/poof-projection-manifest.schema.json",
    "schemas/poof-referral-packet.schema.json",
    "schemas/poof-comprehension-receipt.schema.json",
    "schemas/poof-publication-audit-receipt.schema.json",
    "schemas/poof-right-of-reply.schema.json",
    "tools/validate-poof-clifford-ecology.mjs",
]
contract["constitutional_amendment_law"] = {
    "statement": "A constitutional rule may change only through a receipted, migration-aware repository transaction whose consequences remain inspectable.",
    "change_log_path": "data/project/poof-clifford-constitutional-change-log.json",
    "protected_paths": protected_paths,
    "required_fields": [
        "affected_invariants",
        "reason",
        "previous_behavior",
        "proposed_behavior",
        "migration",
        "backward_compatibility",
        "adversarial_fixtures_added",
        "emergency_override",
    ],
    "prior_release_interpretation_preserved": True,
    "validator_and_fixture_change_same_commit_requires_explicit_receipt": True,
    "emergency_override_rule": {
        "permitted": True,
        "must_be_explicit": True,
        "must_expire": True,
        "cannot_create_evidence_or_graph_authority": True,
        "post_hoc_ratification_forbidden": True,
    },
}
contract.setdefault("boundaries", {}).update({
    "undeclared_operational_effect_allowed": False,
    "publication_selection_may_be_opaque": False,
    "constitutional_change_without_receipt": False,
    "interpretive_model_is_observed_mental_state": False,
    "steel_mirror_requires_symmetric_result": False,
})
write_json(contract_path, contract)

change_log_path = "data/project/poof-clifford-constitutional-change-log.json"
change_log = {
    "schema_version": "poof-clifford-constitutional-change-log@1",
    "ecology_id": contract["ecology_id"],
    "as_of": "2026-07-29",
    "protected_paths": protected_paths,
    "changes": [
        {
            "change_id": "POOF-CONST-2026-07-29-001",
            "effective_at": "2026-07-29T18:30:00-07:00",
            "affected_invariants": [
                "graph-inert objects may still exercise operational power",
                "publication compression must be disclosed",
                "constitutional rules require a durable amendment receipt",
                "R8 separates observation from inference and model",
                "R9 permits asymmetric, null, and noncomparable outcomes",
            ],
            "reason": "Adversarial review identified non-graph power, opaque selection, amendment, inference, and forced-symmetry bypasses.",
            "previous_behavior": [
                "transaction objects declared graph and canonical effects but not all operational effects",
                "projection manifests identified included sources without binding the compression procedure",
                "constitutional files could change without a dedicated amendment receipt",
            ],
            "proposed_behavior": [
                "all transaction schemas carry exact seven-dimension effect contracts",
                "projection manifests bind candidate universe, selection, ordering, truncation, missingness, counterevidence, null-result, and override rules",
                "protected constitutional changes carry a durable change record and adversarial fixtures",
            ],
            "migration": "Existing staged fixtures and the generated aperture are regenerated under additive version-one fields before any deployment.",
            "backward_compatibility": "No canonical evidence object, graph edge, claim, receipt, identity, event, or prior release is rewritten; old releases retain their original interpretation contracts.",
            "adversarial_fixtures_added": [
                "undeclared operational effect mutation",
                "missing projection selection contract mutation",
                "unreceipted constitutional change mutation",
                "R8 inference-firewall mutation",
                "R9 forced-symmetry mutation",
            ],
            "emergency_override": False,
            "expires_at": None,
            "authority": "repository_change_receipt_below_canonical_evidence",
            "graph_effect": "none",
        }
    ],
    "boundaries": {
        "change_log_is_canonical_evidence": False,
        "emergency_override_active": False,
        "graph_effect": "none",
    },
}
write_json(change_log_path, change_log)

registry_path = "data/project/poof-clifford-object-registry.json"
registry = read_json(registry_path)
for row in registry["objects"]:
    row["effect_contract"] = EFFECTS[row["object_id"]]
registry["effect_dimensions"] = DIMS
registry.setdefault("boundaries", {}).update({
    "undeclared_effect_is_permitted": False,
    "graph_inert_means_power_inert": False,
})
write_json(registry_path, registry)

bindings_path = "data/project/poof-clifford-projection-contracts.json"
bindings = read_json(bindings_path)
bindings["inference_firewalls"] = {
    "R8-epistemic-admissibility-ceiling-conversion": {
        "claim_classes": [
            {
                "class_id": "documented_act",
                "definition": "An act, statement, decision, gate, consequence, or changed explanation directly supported by a canonical object or receipt.",
            },
            {
                "class_id": "supported_inference",
                "definition": "A bounded inference from documented acts whose alternatives, confidence, and disconfirming evidence are stated.",
            },
            {
                "class_id": "interpretive_model",
                "definition": "A causal model used to organize evidence that is not represented as an observed internal state or diagnosis.",
            },
        ],
        "strongest_alternative_required": True,
        "disconfirmation_evidence_required": True,
        "motive_requires_independent_support": True,
        "psychological_or_clinical_diagnosis_forbidden": True,
        "model_may_not_be_presented_as_observed_internal_state": True,
    },
    "R9-two-tier-constitution-safeguard-allocation": {
        "permitted_outcomes": [
            "materially_comparable_and_similarly_safeguarded",
            "materially_comparable_but_asymmetrically_safeguarded",
            "partially_comparable",
            "not_materially_comparable",
            "insufficient_evidence_to_compare",
        ],
        "forced_symmetry_forbidden": True,
        "formal_and_practical_remedy_must_be_separate": True,
        "context_dimensions": [
            "scale",
            "coerciveness",
            "affected_population",
            "law",
            "security",
            "technical_feasibility",
            "reversibility",
            "counterpower",
        ],
        "missing_regime_evidence_result": "insufficient_evidence_to_compare",
    },
}
for row in bindings["bindings"]:
    if row["report_type_id"].startswith("R8-"):
        row["inference_firewall_ref"] = "inference_firewalls.R8-epistemic-admissibility-ceiling-conversion"
    if row["report_type_id"].startswith("R9-"):
        row["comparison_firewall_ref"] = "inference_firewalls.R9-two-tier-constitution-safeguard-allocation"
bindings.setdefault("boundaries", {}).update({
    "interpretive_model_is_observed_internal_state": False,
    "comparison_forces_equivalence": False,
})
write_json(bindings_path, bindings)

for object_id, schema_file in SCHEMA_FILES.items():
    schema = read_json(schema_file)
    insert_required(schema, "effect_contract")
    schema["properties"]["effect_contract"] = effect_schema(EFFECTS[object_id])
    if object_id == "POOF-O1":
        insert_required(schema, "selection_contract", before="qualification_state")
        schema["properties"]["selection_contract"] = {
            "type": "object",
            "additionalProperties": False,
            "required": [
                "bounded_universe_ref",
                "candidate_set_hash",
                "candidate_set_hash_mode",
                "candidate_count",
                "included_count",
                "inclusion_rule",
                "exclusion_rule",
                "ordering_rule",
                "truncation_rule",
                "missingness_statement",
                "counterevidence_ids",
                "null_result_policy",
                "override_receipt_ids",
                "compression_disclosure",
            ],
            "properties": {
                "bounded_universe_ref": {"type": "string", "minLength": 3},
                "candidate_set_hash": {"type": "string", "pattern": "^[0-9a-f]{64}$"},
                "candidate_set_hash_mode": {"const": "sha256_stable_source_object_ids"},
                "candidate_count": {"type": "integer", "minimum": 0},
                "included_count": {"type": "integer", "minimum": 0},
                "inclusion_rule": {"type": "string", "minLength": 10},
                "exclusion_rule": {"type": "string", "minLength": 10},
                "ordering_rule": {"type": "string", "minLength": 10},
                "truncation_rule": {"type": "string", "minLength": 10},
                "missingness_statement": {"type": "string", "minLength": 10},
                "counterevidence_ids": {"type": "array", "uniqueItems": True, "items": {"type": "string"}},
                "null_result_policy": {"enum": ["publish_explicit_null", "withhold_and_explain", "fixture_only"]},
                "override_receipt_ids": {"type": "array", "uniqueItems": True, "items": {"type": "string"}},
                "compression_disclosure": {"type": "string", "minLength": 15},
            },
        }
    write_json(schema_file, schema)

for object_id, fixture_file in FIXTURE_FILES.items():
    fixture = read_json(fixture_file)
    fixture["effect_contract"] = EFFECTS[object_id]
    if object_id == "POOF-O1":
        fixture["selection_contract"] = {
            "bounded_universe_ref": "fixture/candidate-universe.json",
            "candidate_set_hash": "0" * 64,
            "candidate_set_hash_mode": "sha256_stable_source_object_ids",
            "candidate_count": 1,
            "included_count": 1,
            "inclusion_rule": "Include the single synthetic candidate used by this regression fixture.",
            "exclusion_rule": "Exclude every object outside the named synthetic fixture universe.",
            "ordering_rule": "Preserve the fixture's declared deterministic order.",
            "truncation_rule": "Do not truncate the one-candidate fixture universe.",
            "missingness_statement": "No real evidence universe is represented by this synthetic fixture.",
            "counterevidence_ids": [],
            "null_result_policy": "fixture_only",
            "override_receipt_ids": [],
            "compression_disclosure": "This fixture compresses no real evidence and authorizes no public assertion.",
        }
    write_json(fixture_file, fixture)

build_path = "tools/build-poof-clifford-ecology.mjs"
replace_once(build_path, "  'data/project/poof-clifford-aperture.json',\n", "  'data/project/poof-clifford-aperture.json',\n  'data/project/poof-clifford-constitutional-change-log.json',\n")
replace_once(build_path, "  'docs/methods/poof-projection-referral-law.md',\n", "  'docs/methods/poof-projection-referral-law.md',\n  'docs/methods/poof-operational-effect-and-amendment-law.md',\n")
replace_once(build_path, "  const aperture = readJson(root, 'data/project/poof-clifford-aperture.json');\n", "  const aperture = readJson(root, 'data/project/poof-clifford-aperture.json');\n  const constitutionalChanges = readJson(root, 'data/project/poof-clifford-constitutional-change-log.json');\n")
replace_once(build_path, "    aperture,\n    reportContracts,\n", "    aperture,\n    constitutionalChanges,\n    reportContracts,\n")
replace_once(build_path, "canonical_write:false,graph_effect:'none'};", "canonical_write:false,effect_contract:{evidence:'none',graph:'none',review_queue:'advisory_candidate',publication:'advisory_only',visibility:'none',ranking:'none',custody:'reader_local_or_voluntary_export'},graph_effect:'none'};")
replace_once(build_path, "status:'open',promotes_to:'candidate_only',graph_effect:'none'};", "status:'open',promotes_to:'candidate_only',effect_contract:{evidence:'none',graph:'none',review_queue:'opens_intake_review',publication:'separate_decision_required',visibility:'none',ranking:'none',custody:'intake_append_only'},graph_effect:'none'};")
replace_once(build_path, "${pills([`canonical write: ${row.canonical_write}`, `graph effect: ${row.graph_effect}`])}", "${pills([`canonical write: ${row.canonical_write}`, `graph effect: ${row.graph_effect}`, `review queue: ${row.effect_contract.review_queue}`, `publication: ${row.effect_contract.publication}`, `custody: ${row.effect_contract.custody}`])}")
replace_once(build_path, "<section class=\"section\"><div class=\"wrap\"><h2>Five transaction schemas</h2><div class=\"grid\">${objectCards}</div></div></section><section class=\"section\"><div class=\"wrap\"><h2>Hard refusals</h2>", "<section class=\"section\"><div class=\"wrap\"><h2>Operational-effect constitution</h2><p class=\"law\">${escapeHtml(data.contract.operational_effect_law.statement)}</p><div class=\"grid\">${data.objects.objects.map((row) => `<article class=\"card wide\"><p class=\"eyebrow\">${escapeHtml(row.object_id)}</p><h3>${escapeHtml(row.schema_version)}</h3>${list(Object.entries(row.effect_contract).map(([key,value]) => `${key}: ${value}`))}</article>`).join('')}</div></div></section><section class=\"section\"><div class=\"wrap\"><h2>Constitutional amendment law</h2><p>${escapeHtml(data.contract.constitutional_amendment_law.statement)}</p>${list(data.contract.constitutional_amendment_law.required_fields)}<p><strong>Change receipts:</strong> ${escapeHtml(String(data.constitutionalChanges.changes.length))}</p></div></section><section class=\"section\"><div class=\"wrap\"><h2>Five transaction schemas</h2><div class=\"grid\">${objectCards}</div></div></section><section class=\"section\"><div class=\"wrap\"><h2>Hard refusals</h2>")
replace_once(build_path, "${list(r9.required_panels)}</article></div></div></section><section class=\"section\"><div class=\"wrap\"><div class=\"notice\">", "${list(r9.required_panels)}</article></div></div></section><section class=\"section\"><div class=\"wrap\"><h2>Inference and comparison firewalls</h2><div class=\"grid\"><article class=\"card wide\"><h3>R8 claim classes</h3>${list(data.projectionBindings.inference_firewalls['R8-epistemic-admissibility-ceiling-conversion'].claim_classes.map((row) => `${row.class_id}: ${row.definition}`))}</article><article class=\"card wide\"><h3>R9 lawful outcomes</h3>${list(data.projectionBindings.inference_firewalls['R9-two-tier-constitution-safeguard-allocation'].permitted_outcomes)}</article></div></div></section><section class=\"section\"><div class=\"wrap\"><div class=\"notice\">")
replace_once(build_path, "function buildMachineContracts(data) {\n  const base = data.contract.publication_state.public_root_target;\n", "function buildMachineContracts(data) {\n  const base = data.contract.publication_state.public_root_target;\n  const effectContract = { evidence:'none', graph:'none', review_queue:'none', publication:'none', visibility:'none', ranking:'none', custody:'none' };\n")
replace_once(build_path, "    'x-graph-effect': 'none'\n", "    'x-graph-effect': 'none',\n    'x-effect-contract': effectContract\n")
replace_once(build_path, "    graph_effect: 'none',\n    interpretation_contract:", "    graph_effect: 'none',\n    effect_contract: effectContract,\n    interpretation_contract:")
replace_once(build_path, "    writes_to_canonical: false\n", "    writes_to_canonical: false,\n    effect_contract: effectContract\n")
empty_hash = hashlib.sha256(b"").hexdigest()
replace_once(build_path, "    source_objects: { claim_ids: [], event_ids: [], receipt_ids: [] },\n    qualification_state: 'open_record',\n", "    source_objects: { claim_ids: [], event_ids: [], receipt_ids: [] },\n    selection_contract: {\n      bounded_universe_ref: 'data/project/poof-clifford-ecology-contract.json#jurisdictions-and-transaction-objects',\n      candidate_set_hash: '" + empty_hash + "',\n      candidate_set_hash_mode: 'sha256_stable_source_object_ids',\n      candidate_count: 0,\n      included_count: 0,\n      inclusion_rule: 'Include the complete staged methodological architecture and no substantive case proposition.',\n      exclusion_rule: 'Exclude canonical case assertions and private manuscript prose from this architecture-only exhibit.',\n      ordering_rule: 'Render the declared route, jurisdiction, object, and report-contract order deterministically.',\n      truncation_rule: 'Do not truncate the declared methodological architecture.',\n      missingness_statement: 'No substantive candidate evidence universe is asserted by this architecture-only projection.',\n      counterevidence_ids: [],\n      null_result_policy: 'publish_explicit_null',\n      override_receipt_ids: [],\n      compression_disclosure: 'This release compresses repository methodology into a review aperture; it does not compress or adjudicate a substantive case universe.'\n    },\n    qualification_state: 'open_record',\n")
replace_once(build_path, "    graph_effect: 'none'\n  };\n  write(root, `${outputRoot}/projection-manifest.json`, stable(projectionManifest));", "    effect_contract: { evidence:'none', graph:'none', review_queue:'none', publication:'binds_projection_custody', visibility:'none', ranking:'none', custody:'release_attached' },\n    graph_effect: 'none'\n  };\n  write(root, `${outputRoot}/projection-manifest.json`, stable(projectionManifest));")

validator_path = "tools/validate-poof-clifford-ecology.mjs"
replace_once(validator_path, "const readJson = (root, relative) => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));\n", "const readJson = (root, relative) => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));\nconst effectDimensions = ['evidence','graph','review_queue','publication','visibility','ranking','custody'];\nfunction effectFailures(value, expected, location) {\n  const failures = [];\n  if (!value || typeof value !== 'object' || Array.isArray(value)) return [`${location}: missing effect contract`];\n  const keys = Object.keys(value).sort();\n  if (JSON.stringify(keys) !== JSON.stringify([...effectDimensions].sort())) failures.push(`${location}: undeclared or missing effect dimension`);\n  for (const key of effectDimensions) if (value[key] !== expected[key]) failures.push(`${location}.${key}: expected ${expected[key]}, saw ${value[key]}`);\n  return failures;\n}\n")
replace_once(validator_path, "  const aperture = source('aperture', 'data/project/poof-clifford-aperture.json');\n", "  const aperture = source('aperture', 'data/project/poof-clifford-aperture.json');\n  const changeLog = source('changeLog', 'data/project/poof-clifford-constitutional-change-log.json');\n")
replace_once(validator_path, "  if (contract.transaction_objects.length !== 5) fail('transaction object count drift');\n", "  if (contract.transaction_objects.length !== 5) fail('transaction object count drift');\n  if (contract.operational_effect_law.undeclared_effects_forbidden !== true || JSON.stringify(contract.operational_effect_law.dimensions) !== JSON.stringify(effectDimensions)) fail('operational effect law drift');\n  if (contract.constitutional_amendment_law.change_log_path !== 'data/project/poof-clifford-constitutional-change-log.json' || contract.constitutional_amendment_law.prior_release_interpretation_preserved !== true) fail('constitutional amendment law drift');\n  if (changeLog.schema_version !== 'poof-clifford-constitutional-change-log@1' || changeLog.changes.length < 1) fail('constitutional change log missing');\n  for (const change of changeLog.changes) {\n    for (const key of contract.constitutional_amendment_law.required_fields) if (!(key in change)) fail(`${change.change_id || 'constitutional change'}: missing ${key}`);\n    if (change.emergency_override !== false || change.graph_effect !== 'none') fail(`${change.change_id}: unconstitutional override or graph effect`);\n  }\n")
replace_once(validator_path, "  for (const row of bindings.bindings) if (row.graph_effect !== 'none') fail(`${row.report_type_id}: graph leak`);\n", "  for (const row of bindings.bindings) if (row.graph_effect !== 'none') fail(`${row.report_type_id}: graph leak`);\n  const r8Firewall = bindings.inference_firewalls?.['R8-epistemic-admissibility-ceiling-conversion'];\n  const r9Firewall = bindings.inference_firewalls?.['R9-two-tier-constitution-safeguard-allocation'];\n  if (JSON.stringify(r8Firewall?.claim_classes?.map((row) => row.class_id)) !== JSON.stringify(['documented_act','supported_inference','interpretive_model']) || r8Firewall?.strongest_alternative_required !== true || r8Firewall?.disconfirmation_evidence_required !== true || r8Firewall?.model_may_not_be_presented_as_observed_internal_state !== true) fail('R8 inference firewall drift');\n  if (JSON.stringify(r9Firewall?.permitted_outcomes) !== JSON.stringify(['materially_comparable_and_similarly_safeguarded','materially_comparable_but_asymmetrically_safeguarded','partially_comparable','not_materially_comparable','insufficient_evidence_to_compare']) || r9Firewall?.forced_symmetry_forbidden !== true || r9Firewall?.formal_and_practical_remedy_must_be_separate !== true) fail('R9 comparison firewall drift');\n")
replace_once(validator_path, "  for (const row of objects.objects) if (row.canonical_write !== false || row.graph_effect !== 'none') fail(`${row.object_id}: object authority leak`);\n", "  for (const row of objects.objects) {\n    if (row.canonical_write !== false || row.graph_effect !== 'none') fail(`${row.object_id}: object authority leak`);\n    for (const error of effectFailures(row.effect_contract, row.effect_contract, row.object_id)) fail(error);\n    if (row.effect_contract.evidence !== 'none' || row.effect_contract.graph !== 'none' || row.effect_contract.visibility !== 'none' || row.effect_contract.ranking !== 'none') fail(`${row.object_id}: forbidden operational effect`);\n  }\n  if (JSON.stringify(objects.effect_dimensions) !== JSON.stringify(effectDimensions)) fail('object effect dimensions drift');\n")
replace_once(validator_path, "    if (fixture.graph_effect !== 'none') fail(`${fixturePath}: graph leak`);\n", "    if (fixture.graph_effect !== 'none') fail(`${fixturePath}: graph leak`);\n    const registryObject = objects.objects.find((row) => row.schema_version === fixture.schema_version);\n    if (!registryObject) fail(`${fixturePath}: schema absent from object registry`);\n    else for (const error of effectFailures(fixture.effect_contract, registryObject.effect_contract, fixturePath)) fail(error);\n")
replace_once(validator_path, "  if (projection.source_commit !== contract.source_repository.base_commit || projection.review_state !== 'review_required') fail('projection custody drift');\n", "  if (projection.source_commit !== contract.source_repository.base_commit || projection.review_state !== 'review_required') fail('projection custody drift');\n  const projectionObject = objects.objects.find((row) => row.object_id === 'POOF-O1');\n  for (const error of effectFailures(projection.effect_contract, projectionObject.effect_contract, 'projection-manifest')) fail(error);\n  if (!projection.selection_contract || projection.selection_contract.candidate_set_hash_mode !== 'sha256_stable_source_object_ids' || projection.selection_contract.candidate_count < projection.selection_contract.included_count || !projection.selection_contract.compression_disclosure) fail('projection selection or compression contract drift');\n")
replace_once(validator_path, "  if (mcp.implementation_status !== 'contract_only_not_deployed' || mcp.endpoint !== null || mcp.canonical_write !== false || mcp.graph_effect !== 'none') fail('MCP deployment or authority laundering');\n", "  if (mcp.implementation_status !== 'contract_only_not_deployed' || mcp.endpoint !== null || mcp.canonical_write !== false || mcp.graph_effect !== 'none') fail('MCP deployment or authority laundering');\n  const noEffect = Object.fromEntries(effectDimensions.map((key) => [key, 'none']));\n  for (const error of effectFailures(mcp.effect_contract, noEffect, 'MCP effect contract')) fail(error);\n")

test_path = "test/poof-clifford-ecology.test.js"
replace_once(test_path, "assert.ok(result.failures.some((row) => row.includes(fixturePath)));\n\nfor (const route", "assert.ok(result.failures.some((row) => row.includes(fixturePath)));\n\nconst objects = read('data/project/poof-clifford-object-registry.json');\nmutation = structuredClone(objects);\nmutation.objects.find((row) => row.object_id === 'POOF-O2').effect_contract.ranking = 'priority_boost';\nresult = validatePoofCliffordEcology({ root, overrides: { objects: mutation } });\nassert.equal(result.ok, false);\nassert.ok(result.failures.some((row) => row.includes('POOF-O2')));\n\nconst projection = read('reports/core-thesis/poof-clifford-ecology/projection-manifest.json');\nmutation = structuredClone(projection);\ndelete mutation.selection_contract;\nresult = validatePoofCliffordEcology({ root, overrides: { projection: mutation } });\nassert.equal(result.ok, false);\nassert.ok(result.failures.some((row) => row.includes('selection')));\n\nconst changeLog = read('data/project/poof-clifford-constitutional-change-log.json');\nmutation = structuredClone(changeLog);\nmutation.changes[0].emergency_override = true;\nresult = validatePoofCliffordEcology({ root, overrides: { changeLog: mutation } });\nassert.equal(result.ok, false);\nassert.ok(result.failures.some((row) => row.includes('override')));\n\nconst bindings = read('data/project/poof-clifford-projection-contracts.json');\nmutation = structuredClone(bindings);\nmutation.inference_firewalls['R8-epistemic-admissibility-ceiling-conversion'].claim_classes.pop();\nresult = validatePoofCliffordEcology({ root, overrides: { bindings: mutation } });\nassert.equal(result.ok, false);\nassert.ok(result.failures.some((row) => row.includes('R8 inference')));\nmutation = structuredClone(bindings);\nmutation.inference_firewalls['R9-two-tier-constitution-safeguard-allocation'].forced_symmetry_forbidden = false;\nresult = validatePoofCliffordEcology({ root, overrides: { bindings: mutation } });\nassert.equal(result.ok, false);\nassert.ok(result.failures.some((row) => row.includes('R9 comparison')));\n\nfor (const route")

method_doc = """# Operational-effect, projection-compression, and amendment law

## Graph-inert is not power-inert

Every POOF transaction declares seven effects: evidence, graph, review queue, publication, visibility, ranking, and custody. An object may open a review obligation or preserve a publication hold only where that effect is explicit. No object acquires an undeclared effect merely because it leaves the Clifford graph unchanged.

## Publication may compress; it may not conceal the compression

Every Projection Manifest binds the candidate universe, its deterministic hash and count, inclusion and exclusion rules, order, truncation, missingness, counterevidence, null-result treatment, overrides, and a plain-language compression disclosure. Source lineage for included objects is necessary but no longer sufficient.

## Constitutional changes are transactions

Changes to governing contracts, object authority, schemas, or their validator require a durable constitutional change receipt. The receipt names affected invariants, prior and proposed behavior, migration, backward compatibility, adversarial fixtures, and any emergency status. Prior releases remain interpretable under the contracts that governed them.

## REAL STEEL inference firewall

R8 distinguishes documented acts, supported inferences, and interpretive models. The strongest alternative and disconfirming evidence must be stated. A causal model is not an observed internal state, personality score, clinical diagnosis, or proof of motive.

## Steel Mirror comparison firewall

R9 permits comparable-and-similar, comparable-but-asymmetric, partial, noncomparable, and insufficient-evidence outcomes. Formal remedies are kept distinct from remedies demonstrated in practice. Comparison never forces equivalence.
"""
(ROOT / "docs/methods/poof-operational-effect-and-amendment-law.md").write_text(method_doc)
append_once("docs/poof-clifford-ecology.md", "## Operational-effect and amendment hardening", """## Operational-effect and amendment hardening

The ecology now treats `graph_effect: none` as only one dimension of authority. Every cross-system transaction carries a seven-dimension operational-effect contract, and every projection declares how it compressed its candidate universe. Constitutional changes are themselves receipted repository transactions. R8 separates documented acts, supported inferences, and interpretive models; R9 permits asymmetric, null, and noncomparable outcomes.
""")
append_once("docs/methods/poof-projection-referral-law.md", "## Non-graph effects", """## Non-graph effects

Graph-inert referrals may open a bounded review queue and may require a separate publication decision. Those powers are declared in the transaction's operational-effect contract. Visibility and ranking effects remain prohibited.

## Compression custody

A projection manifest must disclose its candidate universe, selection and exclusion rules, ordering, truncation, missingness, counterevidence, null-result policy, and overrides. Included-source lineage alone is not a complete account of publication authority.
""")

print("apply-poof-constitutional-hardening: source hardening applied")
