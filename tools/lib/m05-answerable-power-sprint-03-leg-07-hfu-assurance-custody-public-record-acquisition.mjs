export const HFU_ASSURANCE_FRONTIER_ID='M05-IF-EXIT-UK-HFU-ASSURANCE-CUSTODY';
export const HFU_ASSURANCE_RECEIPT_ID='M05-RC-EXIT-UK-HFU-SHARE';
export const HFU_ASSURANCE_DOMAIN_ID='APC-EXIT-01';
export const HFU_ASSURANCE_JURISDICTION='UK';

const clone=(value)=>JSON.parse(JSON.stringify(value));

export function summarizeHfuAssuranceCustodyAcquisition({
  frontier,
  hfuCandidate,
  foodinhoAcquisition,
  acquisition
}){
  const frontierRow=(frontier.frontiers||[]).find(
    (row)=>row.frontier_id===HFU_ASSURANCE_FRONTIER_ID
  );
  if(!frontierRow)throw new Error('missing HFU implementation frontier');
  const observation=hfuCandidate?.receipt?.observation;
  if(!observation)throw new Error('missing HFU source observation');

  const sourceRecords=Array.isArray(acquisition.source_records)
    ?acquisition.source_records
    :[];
  const routes=Array.isArray(acquisition.route_ledger)
    ?acquisition.route_ledger
    :[];
  const finding=acquisition.finding||{};
  const expectedFrontier=frontier.expected_result||{};
  const foodinhoExpected=foodinhoAcquisition.expected_result||{};

  return {
    source_records:sourceRecords.length,
    new_source_records:sourceRecords.filter((row)=>row.newly_acquired===true).length,
    qualifying_assurance_or_custody_receipts:sourceRecords.filter(
      (row)=>row.qualifies_as_assurance_or_custody_receipt===true
    ).length,
    routes_executed:routes.length,
    routes_with_substantive_content:routes.filter(
      (row)=>(row.observed_source_ids||[]).length>0
    ).length,
    routes_with_qualifying_receipt:routes.filter(
      (row)=>row.qualifying_receipt_found===true
    ).length,
    hfu_independent_authority:observation.answer.dimensions.independent_authority,
    hfu_effective_remedy:observation.answer.dimensions.effective_remedy,
    hfu_durability:observation.answer.dimensions.durability,
    hfu_practical_exit_or_governance:
      observation.answer.dimensions.practical_exit_or_governance,
    deficits_closed:(finding.deficits_closed||[]).length,
    deficits_preserved:(finding.deficits_preserved||[]).length,
    candidate_evidence_records:expectedFrontier.candidate_evidence_records,
    repository_promotion_allowed:expectedFrontier.repository_promotion_allowed,
    advanced_answer_dimensions:expectedFrontier.advanced_answer_dimensions,
    effective_answers:expectedFrontier.effective_answers,
    qualifying_jurisdictions:expectedFrontier.qualifying_jurisdictions,
    answer_effectiveness:expectedFrontier.answer_effectiveness,
    cross_domain_regression_completed:
      expectedFrontier.cross_domain_regression_completed,
    issue_345_may_close:false,
    frontier_row:clone(frontierRow),
    observation:clone(observation),
    transition_chain:clone(hfuCandidate.receipt.transition_chain||{}),
    foodinho_state:clone(foodinhoExpected),
    acquisition:clone(acquisition)
  };
}
