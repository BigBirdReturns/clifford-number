import { readJson, readJsonl } from './ledger.mjs';

export function loadCliffordThielTrumpWrapUp() {
  return {
    wrap: readJson('data/research/clifford-thiel-trump-wrap-up.json'),
    surfaces: readJsonl('data/ledger/surfaces.jsonl'),
    participation: readJsonl('data/ledger/participation.jsonl'),
    receipts: readJsonl('data/ledger/receipts.jsonl'),
    hopGraph: readJson('build/hop-graph.json'),
    scores: readJson('build/scores.json'),
    cohort: readJson('data/canonical/us-presidential-officeholder-cohort.json'),
    coverage: readJson('data/research/presidential-disclosure-source-coverage.json'),
    dispositionMatrix: readJson('data/research/officeholder-predicate-disposition-matrix.json'),
    predicateRegistry: readJson('data/canonical/officeholder-crossing-predicates.json'),
    candidates: readJson('data/intake/thiel-palantir-dialog-candidates.json'),
  };
}

export function validateCliffordThielTrumpWrapUp(bundle) {
  const errors = [];
  const { wrap, surfaces, participation, receipts, hopGraph, scores, cohort, coverage, dispositionMatrix, predicateRegistry, candidates } = bundle;
  if (wrap.schema_version !== 'clifford-thiel-trump-wrap-up@1') errors.push('wrap-up schema mismatch');
  if (wrap.scope !== 'Repository evidence only; no new external acquisition.') errors.push('wrap-up must remain repository-only');
  if (wrap.discovery_contract?.mode !== 'discovery_not_adjudication' || wrap.discovery_contract?.conclusion_generated !== false) {
    errors.push('public-interest evidence trail must operate in discovery mode without generating a conclusion');
  }
  if (!/never makes the edge invisible/i.test(wrap.discovery_contract?.rule ?? '')) {
    errors.push('public-interest evidence trail must state that uncertainty cannot hide a signal');
  }
  if (wrap.cross_corpus_infrastructure?.path !== 'data/research/clifford-cross-corpus-public-interest-map.json') {
    errors.push('principal trail must link the cross-corpus public-interest infrastructure');
  }
  const requiredCrossCorpusLanes = [
    'clifford-policy-dialog-core',
    'natsec100-defense-companies',
    'austin-israel-defense-vc-corridor',
    'person-centered-defense-routers',
    'usaspending-defense-awards',
    'sam-gov-defense-opportunities',
    'linkedin-public-private-crossings',
    'trump-presidential-disclosures',
    'official-research-fanout',
  ];
  const linkedLanes = new Set(wrap.cross_corpus_infrastructure?.required_lane_ids ?? []);
  for (const laneId of requiredCrossCorpusLanes) {
    if (!linkedLanes.has(laneId)) errors.push(`principal trail must link cross-corpus lane ${laneId}`);
  }
  if (!/cannot disappear/i.test(wrap.cross_corpus_infrastructure?.visibility_rule ?? '')) {
    errors.push('principal trail must forbid cross-corpus lane erasure');
  }
  const legend = new Map((wrap.rendering_legend ?? []).map(row => [row.evidence_state, row]));
  for (const evidenceState of ['official', 'primary_public', 'reported', 'self_claimed', 'inferred', 'disputed_or_contradicted', 'unavailable_or_not_searched']) {
    if (legend.get(evidenceState)?.visible !== true) errors.push(`rendering legend must keep ${evidenceState} signals visible`);
  }

  const dialog = surfaces.find(row => row.surface_id === 'dialog-society-membership');
  if (!dialog) errors.push('Dialog surface missing');
  else if (dialog.hop_eligible !== false) errors.push('Dialog dense roster must remain non-hop context');
  for (const actorId of ['matt-clifford', 'peter-thiel']) {
    if (!participation.some(row => row.surface_id === 'dialog-society-membership' && row.actor_id === actorId)) {
      errors.push(`Dialog participation missing for ${actorId}`);
    }
  }
  if (participation.some(row => row.surface_id === 'faculty-science-officer-employee-overlap-2018-01-24' && row.actor_id === 'matt-clifford')) {
    errors.push('Matt Clifford Faculty participation cannot be backdated onto the 2018 role surface');
  }
  const facultyIdentityReceiptId = 'faculty-asi-data-science-legal-identity-08873131';
  const faculty2018 = surfaces.find(row => row.surface_id === 'faculty-science-officer-employee-overlap-2018-01-24');
  if (!faculty2018?.receipt_ids?.includes(facultyIdentityReceiptId)) {
    errors.push('2018 Faculty surface must carry the explicit ASI Data Science brand-to-company identity receipt');
  }
  const benFaculty2018 = participation.find(row =>
    row.surface_id === 'faculty-science-officer-employee-overlap-2018-01-24'
    && row.actor_id === 'ben-warner');
  if (!benFaculty2018?.receipt_ids?.includes(facultyIdentityReceiptId)) {
    errors.push('Ben Warner 2018 Faculty participation must carry the explicit brand-to-company identity receipt');
  }
  const facultyCompany2018 = participation.find(row =>
    row.surface_id === 'faculty-science-officer-employee-overlap-2018-01-24'
    && row.organization_id === 'faculty');
  if (!facultyCompany2018?.receipt_ids?.includes(facultyIdentityReceiptId)) {
    errors.push('Faculty 2018 company participation must carry the explicit brand-to-company identity receipt');
  }
  const facultyIdentityReceipt = receipts?.find(row => row.receipt_id === facultyIdentityReceiptId);
  if (facultyIdentityReceipt?.brand_name !== 'ASI Data Science'
      || facultyIdentityReceipt?.successor_brand !== 'Faculty'
      || facultyIdentityReceipt?.legal_entity !== 'Faculty Science Limited'
      || facultyIdentityReceipt?.company_number !== '08873131'
      || facultyIdentityReceipt?.previous_legal_name !== 'Advanced Skills Initiative Limited') {
    errors.push('ASI Data Science identity receipt must resolve the former brand to Faculty Science Limited company 08873131');
  }
  for (const actorId of ['marc-warner', 'saul-klein']) {
    const edge = (hopGraph.edges ?? []).find(row =>
      new Set([row.actor_a, row.actor_b]).has('ben-warner')
      && new Set([row.actor_a, row.actor_b]).has(actorId));
    const basis = edge?.surfaces?.find(row => row.surface_id === 'faculty-science-officer-employee-overlap-2018-01-24');
    if (!basis?.receipt_ids?.includes(facultyIdentityReceiptId)) {
      errors.push(`compiled Ben Warner-${actorId} Faculty hop must carry the explicit brand-to-company identity receipt`);
    }
  }
  for (const actorId of ['matt-clifford', 'marc-warner', 'saul-klein']) {
    if (!participation.some(row => row.surface_id === 'faculty-science-director-shareholder-overlap-2024-10-10' && row.actor_id === actorId)) {
      errors.push(`official Faculty bridge participation missing for ${actorId}`);
    }
  }
  for (const actorId of ['marc-warner', 'saul-klein']) {
    if (!(hopGraph.edges ?? []).some(edge =>
      new Set([edge.actor_a, edge.actor_b]).has('matt-clifford')
      && new Set([edge.actor_a, edge.actor_b]).has(actorId)
      && edge.surfaces?.some(surface => surface.surface_id === 'faculty-science-director-shareholder-overlap-2024-10-10')
    )) {
      errors.push(`compiled Clifford-${actorId} official Faculty hop is missing`);
    }
  }
  if (!participation.some(row => row.surface_id === 'ai-opportunities-action-plan-2025' && row.actor_id === 'matt-clifford')) {
    errors.push('official Matt Clifford Action Plan participation is missing');
  }
  if (!participation.some(row => row.surface_id === 'ai-opportunities-action-plan-2025' && row.actor_id === 'keir-starmer')) {
    errors.push('official Keir Starmer Action Plan participation is missing');
  }
  if (!(hopGraph.edges ?? []).some(edge =>
    new Set([edge.actor_a, edge.actor_b]).has('matt-clifford')
    && new Set([edge.actor_a, edge.actor_b]).has('keir-starmer')
    && edge.surfaces?.some(surface => surface.surface_id === 'ai-opportunities-action-plan-2025')
  )) {
    errors.push('compiled Clifford-Starmer Action Plan hop is missing');
  }

  const peterScore = scores.actors?.find(row => row.actor_id === 'peter-thiel');
  if (!peterScore) errors.push('Peter Thiel score missing');
  else if (peterScore.clifford_number !== null || peterScore.shortest_path?.number !== null) {
    errors.push('Peter Thiel must not be assigned a Clifford path without an eligible surface');
  }
  if ((hopGraph.edges ?? []).some(edge => [edge.actor_a, edge.actor_b].includes('peter-thiel'))) {
    errors.push('Peter Thiel unexpectedly appears on a compiled hop edge');
  }

  if (!cohort.members?.some(row => row.person_id === 'donald-trump')) errors.push('Donald Trump officeholder cohort row missing');
  if (participation.some(row => row.actor_id === 'donald-trump')) errors.push('Donald Trump cannot be claimed as a surface-ledger participant by this wrap-up');
  if (coverage.coverage?.resolved_cross_source_legal_entities !== 0) errors.push('wrap-up expects zero resolved cross-source legal entities');
  if (coverage.coverage?.crossing_matches !== 0) errors.push('wrap-up expects zero promoted office-business crossings');

  const cohortIds = new Set((cohort.members ?? []).map(row => row.person_id));
  const predicateIds = predicateRegistry.predicates?.map(row => row.predicate_id) ?? [];
  const matrixRows = dispositionMatrix.rows ?? [];
  const matrixCellCount = matrixRows.reduce((sum, row) => sum + (row.cells?.length ?? 0), 0);
  if (dispositionMatrix.schema_version !== 'officeholder-predicate-disposition-matrix@1') errors.push('officeholder disposition matrix schema mismatch');
  if (matrixRows.length !== cohortIds.size || matrixCellCount !== cohortIds.size * predicateIds.length || dispositionMatrix.cell_count !== matrixCellCount) {
    errors.push('officeholder disposition matrix must contain all 8 x 5 cells');
  }
  if (new Set(matrixRows.map(row => row.person_id)).size !== cohortIds.size || matrixRows.some(row => !cohortIds.has(row.person_id))) {
    errors.push('officeholder disposition matrix member set must match the canonical cohort');
  }
  if (JSON.stringify(dispositionMatrix.columns) !== JSON.stringify(predicateIds)) errors.push('officeholder disposition matrix columns must match the frozen predicate order');
  if (matrixRows.some(row => row.cells?.length !== predicateIds.length)) errors.push('each officeholder disposition matrix row must cover all five predicates');
  if (dispositionMatrix.positive_crossing_count !== 0 || dispositionMatrix.graph_effect !== 'none') errors.push('officeholder disposition matrix cannot promote a crossing under current evidence');
  if (!matrixRows.flatMap(row => row.cells ?? []).some(cell => cell.evidence_state === 'coverage_gap')) errors.push('officeholder disposition matrix must expose asymmetric coverage gaps');
  if (!matrixRows.flatMap(row => row.cells ?? []).some(cell => cell.evidence_state === 'not_executed')) errors.push('officeholder disposition matrix must expose unexecuted predicates');

  const dialogCandidate = candidates.candidates?.find(row => row.id === 'candidate-dialog-roster-hop-weighting-audit');
  if (!dialogCandidate) errors.push('Dialog topology-audit candidate missing');
  else {
    if (dialogCandidate.hop_eligible !== false) errors.push('Dialog topology-audit candidate contradicts the authoritative non-hop surface');
    if (dialogCandidate.status !== 'resolved_context_only') errors.push('Dialog topology-audit candidate must be resolved_context_only');
  }

  const dispositions = new Map((wrap.evaluated_paths ?? []).map(row => [row.path_id, row.disposition]));
  const outcomes = new Map((wrap.surviving_outcomes ?? []).map(row => [row.outcome_id, row]));
  for (const outcomeId of [
    'clifford-starmer-action-plan',
    'clifford-faculty-official-overlap',
    'action-plan-state-capacity-program',
    'thiel-palantir-governance',
    'palantir-state-procurement-footprint',
    'palantir-detachment-201',
    'palantir-electric-twin-capital',
    'clifford-thiel-dialog-context',
  ]) {
    if (!outcomes.has(outcomeId)) errors.push(`wrap-up must preserve surviving outcome ${outcomeId}`);
  }
  const cliffordStarmer = outcomes.get('clifford-starmer-action-plan');
  if (cliffordStarmer?.status !== 'official_direct_policy_hop') errors.push('Clifford-Starmer Action Plan outcome must remain an official direct policy hop');
  const cliffordFaculty = outcomes.get('clifford-faculty-official-overlap');
  if (cliffordFaculty?.status !== 'official_direct_company_hop') errors.push('Clifford-Faculty outcome must remain an official direct company hop');
  const compositeTrails = new Map((wrap.composite_trails ?? []).map(row => [row.trail_id, row]));
  if (compositeTrails.get('policy-to-state-capacity-to-procurement-market')?.status !== 'structural_corridor_with_open_join') {
    errors.push('policy-to-procurement trail must preserve both the structural corridor and its open join');
  }
  const discoverySignals = new Map((wrap.signals_outside_hop_graph ?? []).map(row => [row.signal_id, row]));
  for (const signalId of [
    'policy-market-convergence',
    'public-private-personnel-capital-relay',
    'sovereign-capital-defense-tech-loop',
    'dialog-convening-density',
    'trump-administration-adjacent-dialog-cluster',
  ]) {
    const signal = discoverySignals.get(signalId);
    if (!signal) errors.push(`public-interest evidence trail must preserve discovery signal ${signalId}`);
    else if (signal.visible !== true || signal.graph_effect !== 'none') errors.push(`discovery signal ${signalId} must stay visible and graph-inert`);
  }
  if (![...discoverySignals.values()].some(signal => signal.evidence_state === 'inferred')) errors.push('public-interest evidence trail must visibly preserve inferred structural signals');
  const required = {
    'clifford-faculty-investor': 'official_bounded_company_hop',
    'clifford-thiel-dialog-roster': 'context_only_no_hop',
    'clifford-thiel-capital-policy': 'not_established_in_existing_corpus',
    'thiel-trump-material-crossing': 'not_established_in_existing_corpus',
    'clifford-trump-material-crossing': 'not_established_in_existing_corpus',
    'clifford-thiel-trump-triple': 'no_material_three_person_path_in_existing_corpus',
  };
  for (const [id, disposition] of Object.entries(required)) {
    if (dispositions.get(id) !== disposition) errors.push(`wrap-up path ${id} must remain ${disposition}`);
  }
  if (wrap.bottom_line !== undefined) errors.push('public-interest evidence trail must not emit a bottom-line verdict');
  if (wrap.public_interpretation_contract?.conclusion_generated !== false || wrap.public_interpretation_contract?.graph_effect !== 'none') errors.push('public-interpretation contract must leave conclusions open to public evaluation and remain graph-inert');
  if (!/no final verdict/i.test(wrap.public_interpretation_contract?.instruction ?? '')) errors.push('public-interpretation contract must explicitly refuse a final verdict');
  return errors;
}
