export const PREFERENCE_CUSTODY_MANIFEST_SCHEMA_VERSION = 'preference-custody-control-manifest@1';
export const PREFERENCE_CUSTODY_MANIFEST_BUILD_SCHEMA_VERSION = 'preference-custody-control-manifest-build@1';

const REQUIRED_CONTROL_IDS = ['PC-01', 'PC-02', 'PC-03', 'PC-04', 'PC-05'];
const REQUIRED_FAILURE_CLASSES = ['attrition_and_refusal_censoring', 'exposure_policy_confounding', 'observational_equivalence', 'option_set_starvation', 'subgroup_response_capacity_and_burden'];
const REQUIRED_IDENTIFICATION_STAGES = ['attrition_and_refusal', 'exposure_policy', 'option_set', 'public_authorization', 'response_mechanism', 'subgroup_distribution'];

function object(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function array(value) {
  return Array.isArray(value) ? value : [];
}

function text(value) {
  return String(value ?? '').trim();
}

function unique(values) {
  return [...new Set(array(values).map(value => text(value)).filter(Boolean))];
}

function sorted(values) {
  return [...values].sort((left, right) => String(left).localeCompare(String(right)));
}

function sameMembers(left, right) {
  return JSON.stringify(sorted(unique(left))) === JSON.stringify(sorted(unique(right)));
}

function requireFalse(value, label, errors) {
  if (value !== false) errors.push(`${label} must remain false`);
}

function summarizeControl(control, build) {
  const common = {
    control_id: control.control_id,
    fixture_id: control.fixture_id,
    failure_class: control.failure_class,
    source_fixture_path: control.source_fixture_path,
    build_artifact_path: control.build_artifact_path,
    build_schema_version: build.schema_version,
    graph_effect: build.graph_effect,
    counts_toward_thesis_evidence: build.counts_toward_thesis_evidence,
    conclusion_generated: build.conclusion_generated,
    real_world_effect_claimed: build.classification?.real_world_effect_claimed,
    preference_change_present: build.classification?.preference_change_present,
    manipulative_intent_inferable: build.classification?.manipulative_intent_inferable,
    required_refusal_rules: control.required_refusal_rules,
    observed_refusal_rules: array(build.refusal_rules)
  };

  if (control.control_id === 'PC-01') {
    return {
      ...common,
      proof_summary: {
        maximum_naive_drift: build.metrics?.max_naive_absolute_drift_from_latent,
        maximum_corrected_drift: build.metrics?.max_propensity_corrected_absolute_drift_from_latent,
        exposure_confounding_supported: build.classification?.exposure_confounding_supported,
        preference_identification_without_propensity: build.classification?.preference_identification_without_propensity
      }
    };
  }
  if (control.control_id === 'PC-02') {
    return {
      ...common,
      proof_summary: {
        distinct_observation_signatures: build.metrics?.distinct_observation_signatures,
        same_population_distinct_observations: build.metrics?.same_population_distinct_observations,
        maximum_naive_full_vector_drift: build.metrics?.max_unsupported_naive_full_vector_absolute_drift,
        first_choice_identification: build.classification?.first_choice_identification_from_raw_choices
      }
    };
  }
  if (control.control_id === 'PC-03') {
    return {
      ...common,
      proof_summary: {
        distinct_latent_world_signatures: build.metrics?.distinct_latent_world_signatures,
        distinct_observation_signatures: build.metrics?.distinct_observation_signatures,
        maximum_pairwise_latent_total_variation: build.metrics?.maximum_pairwise_latent_total_variation,
        latent_first_choice_identification: build.classification?.latent_first_choice_identification,
        response_mechanism_identification: build.classification?.response_mechanism_identification
      }
    };
  }
  if (control.control_id === 'PC-04') {
    return {
      ...common,
      proof_summary: {
        distinct_headline_signatures: build.metrics?.distinct_headline_signatures,
        distinct_full_outcome_signatures: build.metrics?.distinct_full_outcome_signatures,
        distinct_mechanism_signatures: build.metrics?.distinct_mechanism_signatures,
        observed_total_range: build.metrics?.observed_total_range,
        exit_total_range: build.metrics?.exit_total_range,
        nonresponse_total_range: build.metrics?.nonresponse_total_range,
        preference_change_identification: build.classification?.preference_change_identification_from_headline,
        strategic_refusal_identification: build.classification?.strategic_refusal_identification_from_headline,
        population_support_identification: build.classification?.population_support_identification_from_headline
      }
    };
  }
  return {
    ...common,
    proof_summary: {
      distinct_aggregate_headline_signatures: build.metrics?.distinct_aggregate_headline_signatures,
      distinct_subgroup_outcome_signatures: build.metrics?.distinct_subgroup_outcome_signatures,
      distinct_burden_signatures: build.metrics?.distinct_burden_signatures,
      maximum_subgroup_success_rate_gap: build.metrics?.maximum_subgroup_success_rate_gap,
      maximum_adaptation_cost_ratio: build.metrics?.maximum_adaptation_cost_ratio,
      aggregate_success_rate: build.metrics?.aggregate_success_rate,
      subgroup_outcome_identification: build.classification?.subgroup_outcome_identification_from_aggregate,
      adaptation_burden_identification: build.classification?.adaptation_burden_identification_from_aggregate,
      willingness_identification: build.classification?.willingness_identification_from_adaptation
    }
  };
}

export function validatePreferenceCustodyManifest(manifest) {
  const errors = [];
  const controls = array(manifest?.controls);
  const requirements = array(manifest?.identification_requirements);

  if (manifest?.schema_version !== PREFERENCE_CUSTODY_MANIFEST_SCHEMA_VERSION) errors.push('preference custody manifest schema mismatch');
  if (!text(manifest?.manifest_id)) errors.push('manifest_id is required');
  if (manifest?.status !== 'synthetic_control_floor') errors.push('manifest status must remain synthetic_control_floor');
  if (manifest?.graph_effect !== 'none') errors.push('manifest graph_effect must remain none');
  requireFalse(manifest?.counts_toward_thesis_evidence, 'manifest counts_toward_thesis_evidence', errors);
  if (!sameMembers(controls.map(control => control.control_id), REQUIRED_CONTROL_IDS)) errors.push('manifest must contain exactly PC-01, PC-02, PC-03, PC-04, and PC-05');
  if (!sameMembers(controls.map(control => control.failure_class), REQUIRED_FAILURE_CLASSES)) errors.push('manifest failure-class coverage is incomplete');

  const fixtureIds = controls.map(control => text(control?.fixture_id));
  if (unique(fixtureIds).length !== controls.length) errors.push('control fixture IDs must be unique');
  for (const control of controls) {
    const id = text(control?.control_id) || '(missing control ID)';
    if (!text(control?.fixture_id) || !text(control?.failure_class)) errors.push(`control ${id} lacks fixture or failure-class identity`);
    if (!text(control?.source_fixture_path) || !text(control?.build_artifact_path)) errors.push(`control ${id} lacks source or build path`);
    if (!text(control?.expected_build_schema)) errors.push(`control ${id} lacks expected build schema`);
    if (!array(control?.required_refusal_rules).length) errors.push(`control ${id} requires refusal rules`);
  }

  if (!sameMembers(requirements.map(item => item.stage), REQUIRED_IDENTIFICATION_STAGES)) errors.push('identification requirement stages are incomplete');
  for (const requirement of requirements) {
    if (!text(requirement?.required_state) || !text(requirement?.refused_inference)) errors.push(`identification stage ${requirement?.stage} lacks state or refusal`);
  }
  if (unique(manifest?.open_frontiers).length < 5) errors.push('manifest must preserve at least five open frontiers');
  requireFalse(manifest?.promotion_boundary?.laboratory_controls_are_real_world_evidence, 'laboratory_controls_are_real_world_evidence', errors);
  if (unique(manifest?.promotion_boundary?.real_case_requires).length < 8) errors.push('real-case promotion requirements are incomplete');
  if (!text(manifest?.promotion_boundary?.promotion_authority)) errors.push('promotion authority is required');
  if (!array(manifest?.prohibited_inferences).length) errors.push('prohibited inferences are required');
  if (!text(manifest?.interpretation_contract?.contract_id)) errors.push('interpretation contract ID is required');
  if (!text(manifest?.interpretation_contract?.what_this_is)) errors.push('interpretation contract what_this_is is required');
  if (!text(manifest?.interpretation_contract?.what_this_is_not)) errors.push('interpretation contract what_this_is_not is required');
  if (!text(manifest?.interpretation_contract?.copy_ready_caveat)) errors.push('copy-ready caveat is required');
  return errors;
}

export function compilePreferenceCustodyManifest(manifest, buildsByPath) {
  const errors = validatePreferenceCustodyManifest(manifest);
  if (errors.length) throw new Error(`invalid preference custody manifest:\n- ${errors.join('\n- ')}`);

  const controls = manifest.controls.map(control => {
    const build = buildsByPath[control.build_artifact_path];
    if (!build) throw new Error(`missing build artifact for ${control.control_id}: ${control.build_artifact_path}`);
    if (build.schema_version !== control.expected_build_schema) throw new Error(`build schema mismatch for ${control.control_id}`);
    if (build.fixture_id !== control.fixture_id) throw new Error(`fixture identity mismatch for ${control.control_id}`);
    return summarizeControl(control, build);
  });

  const refusalRules = unique(controls.flatMap(control => control.observed_refusal_rules));
  const allRequiredRulesPresent = controls.every(control => control.required_refusal_rules.every(rule => control.observed_refusal_rules.includes(rule)));

  return {
    schema_version: PREFERENCE_CUSTODY_MANIFEST_BUILD_SCHEMA_VERSION,
    manifest_id: manifest.manifest_id,
    issue: manifest.issue,
    captured_at: manifest.captured_at,
    status: 'laboratory_floor_qualified',
    graph_effect: 'none',
    counts_toward_thesis_evidence: false,
    conclusion_generated: false,
    real_world_evidence_state: 'none',
    control_count: controls.length,
    failure_classes: sorted(controls.map(control => control.failure_class)),
    controls,
    control_integrity: {
      all_graph_effect_none: controls.every(control => control.graph_effect === 'none'),
      no_thesis_evidence_consumption: controls.every(control => control.counts_toward_thesis_evidence === false),
      no_real_world_conclusion: controls.every(control => control.conclusion_generated === false && control.real_world_effect_claimed === false),
      no_preference_change_claim: controls.every(control => control.preference_change_present === false),
      no_intent_inference: controls.every(control => control.manipulative_intent_inferable === false),
      all_required_refusal_rules_present: allRequiredRulesPresent
    },
    identification_requirements: manifest.identification_requirements,
    refusal_rule_union: refusalRules,
    open_frontiers: manifest.open_frontiers,
    promotion_boundary: manifest.promotion_boundary,
    prohibited_inferences: manifest.prohibited_inferences,
    interpretation_contract: manifest.interpretation_contract
  };
}

export function validatePreferenceCustodyManifestBuild(compiled) {
  const errors = [];
  if (compiled?.schema_version !== PREFERENCE_CUSTODY_MANIFEST_BUILD_SCHEMA_VERSION) errors.push('preference custody manifest build schema mismatch');
  if (compiled?.status !== 'laboratory_floor_qualified') errors.push('compiled manifest status must be laboratory_floor_qualified');
  if (compiled?.graph_effect !== 'none') errors.push('compiled manifest graph_effect must remain none');
  requireFalse(compiled?.counts_toward_thesis_evidence, 'compiled counts_toward_thesis_evidence', errors);
  requireFalse(compiled?.conclusion_generated, 'compiled conclusion_generated', errors);
  if (compiled?.real_world_evidence_state !== 'none') errors.push('compiled manifest must preserve real_world_evidence_state none');
  if (compiled?.control_count !== 5) errors.push('compiled manifest must contain five controls');
  if (!sameMembers(compiled?.failure_classes, REQUIRED_FAILURE_CLASSES)) errors.push('compiled failure-class coverage is incomplete');
  if (!sameMembers(array(compiled?.controls).map(control => control.control_id), REQUIRED_CONTROL_IDS)) errors.push('compiled control IDs are incomplete');

  const integrity = object(compiled?.control_integrity);
  for (const key of [
    'all_graph_effect_none',
    'no_thesis_evidence_consumption',
    'no_real_world_conclusion',
    'no_preference_change_claim',
    'no_intent_inference',
    'all_required_refusal_rules_present'
  ]) {
    if (integrity[key] !== true) errors.push(`control_integrity.${key} must be true`);
  }

  const pc1 = array(compiled?.controls).find(control => control.control_id === 'PC-01');
  const pc2 = array(compiled?.controls).find(control => control.control_id === 'PC-02');
  const pc3 = array(compiled?.controls).find(control => control.control_id === 'PC-03');
  const pc4 = array(compiled?.controls).find(control => control.control_id === 'PC-04');
  const pc5 = array(compiled?.controls).find(control => control.control_id === 'PC-05');
  if (!(pc1?.proof_summary?.maximum_naive_drift > 0.3)) errors.push('PC-01 must demonstrate material exposure drift');
  if (!(pc1?.proof_summary?.maximum_corrected_drift <= 1e-12)) errors.push('PC-01 corrected drift must recover the frozen distribution');
  if (!(pc2?.proof_summary?.distinct_observation_signatures >= 2)) errors.push('PC-02 must demonstrate distinct observations from one population');
  if (!(pc2?.proof_summary?.maximum_naive_full_vector_drift >= 0.3)) errors.push('PC-02 must demonstrate material option-set drift');
  if (!(pc3?.proof_summary?.distinct_latent_world_signatures >= 3)) errors.push('PC-03 must preserve at least three latent worlds');
  if (pc3?.proof_summary?.distinct_observation_signatures !== 1) errors.push('PC-03 must preserve one shared observation signature');
  if (!(pc3?.proof_summary?.maximum_pairwise_latent_total_variation >= 0.3)) errors.push('PC-03 must preserve material latent separation');
  if (pc4?.proof_summary?.distinct_headline_signatures !== 1) errors.push('PC-04 must preserve one shared normalized headline');
  if (!(pc4?.proof_summary?.distinct_full_outcome_signatures >= 3)) errors.push('PC-04 must preserve at least three distinct full outcomes');
  if (!(pc4?.proof_summary?.distinct_mechanism_signatures >= 3)) errors.push('PC-04 must preserve at least three distinct disposition mechanisms');
  if (!(pc4?.proof_summary?.observed_total_range >= 250)) errors.push('PC-04 must preserve material denominator variation');
  if (!(pc4?.proof_summary?.exit_total_range >= 250)) errors.push('PC-04 must preserve material exit variation');
  if (!(pc4?.proof_summary?.nonresponse_total_range >= 250)) errors.push('PC-04 must preserve material nonresponse variation');
  if (pc5?.proof_summary?.distinct_aggregate_headline_signatures !== 1) errors.push('PC-05 must preserve one shared aggregate headline');
  if (!(pc5?.proof_summary?.distinct_subgroup_outcome_signatures >= 3)) errors.push('PC-05 must preserve at least three subgroup outcomes');
  if (!(pc5?.proof_summary?.distinct_burden_signatures >= 3)) errors.push('PC-05 must preserve at least three burden distributions');
  if (!(pc5?.proof_summary?.maximum_subgroup_success_rate_gap >= 0.4)) errors.push('PC-05 must preserve a material subgroup success-rate gap');
  if (!(pc5?.proof_summary?.maximum_adaptation_cost_ratio >= 15)) errors.push('PC-05 must preserve material adaptation-cost inequality');
  if (!(pc5?.proof_summary?.aggregate_success_rate === 0.8)) errors.push('PC-05 must preserve the frozen 80 percent aggregate success rate');

  if (!sameMembers(array(compiled?.identification_requirements).map(item => item.stage), REQUIRED_IDENTIFICATION_STAGES)) errors.push('compiled identification stages are incomplete');
  if (unique(compiled?.open_frontiers).length < 5) errors.push('compiled manifest must preserve open frontiers');
  requireFalse(compiled?.promotion_boundary?.laboratory_controls_are_real_world_evidence, 'compiled laboratory_controls_are_real_world_evidence', errors);
  if (!text(compiled?.interpretation_contract?.copy_ready_caveat)) errors.push('compiled caveat is required');
  return errors;
}

function percentage(value) {
  return `${(Number(value) * 100).toFixed(2)}%`;
}

export function renderPreferenceCustodyManifestMarkdown(compiled) {
  const lines = [
    '# Preference custody laboratory floor v3',
    '',
    `**Status:** ${compiled.status}`,
    '',
    `**Controls:** ${compiled.control_count}`,
    '',
    `**Real-world evidence state:** ${compiled.real_world_evidence_state}`,
    '',
    '> ' + compiled.interpretation_contract.copy_ready_caveat,
    '',
    '## Control floor',
    ''
  ];

  for (const control of compiled.controls) {
    lines.push(`### ${control.control_id}: ${control.failure_class}`, '');
    lines.push(`- Fixture: ${control.fixture_id}`);
    if (control.control_id === 'PC-01') {
      lines.push(`- Maximum naive drift: ${percentage(control.proof_summary.maximum_naive_drift)}`);
      lines.push(`- Maximum corrected drift: ${percentage(control.proof_summary.maximum_corrected_drift)}`);
    } else if (control.control_id === 'PC-02') {
      lines.push(`- Distinct observations from one population: ${control.proof_summary.distinct_observation_signatures}`);
      lines.push(`- Maximum inadmissible full-vector drift: ${percentage(control.proof_summary.maximum_naive_full_vector_drift)}`);
    } else if (control.control_id === 'PC-03') {
      lines.push(`- Distinct latent worlds: ${control.proof_summary.distinct_latent_world_signatures}`);
      lines.push(`- Distinct observation signatures: ${control.proof_summary.distinct_observation_signatures}`);
      lines.push(`- Maximum pairwise latent total variation: ${percentage(control.proof_summary.maximum_pairwise_latent_total_variation)}`);
    } else if (control.control_id === 'PC-04') {
      lines.push(`- Distinct normalized headline signatures: ${control.proof_summary.distinct_headline_signatures}`);
      lines.push(`- Distinct full outcomes: ${control.proof_summary.distinct_full_outcome_signatures}`);
      lines.push(`- Observed denominator range: ${control.proof_summary.observed_total_range}`);
      lines.push(`- Exit range: ${control.proof_summary.exit_total_range}`);
      lines.push(`- Nonresponse range: ${control.proof_summary.nonresponse_total_range}`);
    } else {
      lines.push(`- Distinct aggregate headline signatures: ${control.proof_summary.distinct_aggregate_headline_signatures}`);
      lines.push(`- Distinct subgroup outcomes: ${control.proof_summary.distinct_subgroup_outcome_signatures}`);
      lines.push(`- Distinct burden distributions: ${control.proof_summary.distinct_burden_signatures}`);
      lines.push(`- Maximum subgroup success-rate gap: ${percentage(control.proof_summary.maximum_subgroup_success_rate_gap)}`);
      lines.push(`- Maximum adaptation-cost ratio: ${control.proof_summary.maximum_adaptation_cost_ratio.toFixed(2)}×`);
    }
    lines.push('');
  }

  lines.push('## Identification requirements', '');
  for (const requirement of compiled.identification_requirements) {
    lines.push(`- ${requirement.stage}: ${requirement.required_state}; refusal: ${requirement.refused_inference}`);
  }
  lines.push('', '## Open frontiers', '');
  for (const frontier of compiled.open_frontiers) lines.push(`- ${frontier}`);
  lines.push('', '## Promotion boundary', '');
  lines.push(`- Laboratory controls are real-world evidence: ${compiled.promotion_boundary.laboratory_controls_are_real_world_evidence}`);
  lines.push(`- Promotion authority: ${compiled.promotion_boundary.promotion_authority}`);
  lines.push('', '## Common refusal rules', '');
  for (const rule of compiled.refusal_rule_union) lines.push(`- ${rule}`);
  lines.push('');
  return lines.join('\n');
}
