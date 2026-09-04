#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { root } from './lib/ledger.mjs';
import { isDeepStrictEqual } from 'node:util';
import { loadCliffordCrossCorpusPublicInterestMap, validateCliffordCrossCorpusPublicInterestMap } from './lib/clifford-cross-corpus-public-interest-map.mjs';
import { MAP_SOURCE_PATH, MAP_VIEW_PATH } from './lib/crawl-health-map-projection.mjs';

const destination = path.join(root, 'dist');
const mapBundle = loadCliffordCrossCorpusPublicInterestMap();
const mapErrors = validateCliffordCrossCorpusPublicInterestMap(mapBundle);
if (mapErrors.length) throw new Error(`public map is stale or invalid: ${mapErrors.join('; ')}`);
for (const file of [MAP_SOURCE_PATH, MAP_VIEW_PATH]) {
  const published = JSON.parse(fs.readFileSync(path.join(destination, file), 'utf8'));
  if (!isDeepStrictEqual(published, mapBundle.map)) throw new Error(`published current map drift: ${file}`);
}
const required = [
  'index.html', 'Clifford-Number-standalone.html', 'Clifford-Estate-Aperture-standalone.html', 'Clifford-Game-Trail-Aperture-standalone.html', 'app.js', 'styles.css', '.nojekyll',
  'build/surface-graph.json', 'build/hop-graph.json', 'build/receipt-graph.json',
  'build/public-catalog.json', 'build/cases/index.json', 'build/cases/field-autopsy-03.json',
  'build/cases/uk-ai-policy.json',
  'build/cases/anduril-access-ownership.json',
  'briefs/anduril-access-ownership.html',
  'estates/index.html', 'estates/data.json', 'estates/trails.json', 'gametrails/index.html', 'gametrails/data.json',
  'build/estate-closures/manifest.json', 'build/estate-frontier/manifest.json', 'build/estate-game-trails/manifest.json',
  'build/estate-game-trails/overlap-matrix.json', 'build/estate-game-trails/exact-trail-pairs.json', 'build/estate-closures/us-defense-estate.json',
  'build/research/synthetic-population-vendor-denominator.json',
  'build/research/synthetic-population-vendor-denominator.md',
  'build/thesis/case-packet-index.json',
  'build/thesis/case-packet-index.md',
  'build/thesis/case-packets/state-market-no10-pandemic-data-diaspora.json',
  'build/thesis/case-packets/state-market-no10-pandemic-data-diaspora.md',
  'build/thesis/case-packets/state-market-central-government-ai-unit-succession.json',
  'build/thesis/case-packets/state-market-central-government-ai-unit-succession.md',
  'build/thesis/synthetic-population-infrastructure.json',
  'build/thesis/synthetic-population-infrastructure.md',
  'data/research/denominators/synthetic-population-vendors.json',
  'data/research/thesis-case-packets/state-market-no10-pandemic-data-diaspora.json',
  'data/research/thesis-case-packets/state-market-central-government-ai-unit-succession.json',
  'receipts/thesis-state-market/gov-acoba-samantha-jones-case-index-2024.md',
  'receipts/thesis-state-market/gov-acoba-samantha-jones-ceracare-2024.md',
  'receipts/thesis-state-market/civil-service-commission-samantha-harrison-breach-2026.md',
  'receipts/thesis-state-market/gov-no10ds-formation-mid-2020.md',
  'receipts/thesis-state-market/gov-iai-announcement-2023.md',
  'receipts/thesis-state-market/gov-dsit-digital-ai-transfer-2024.md',
  'receipts/thesis-state-market/gov-dsit-accounting-system-statement-2025.md',
  'receipts/thesis-state-market/gov-cddo-about-new-gds-2025.md',
  'receipts/thesis-state-market/gov-gds-about-new-gds-2025.md',
  'receipts/thesis-state-market/gov-ai-playbook-red-teaming-2025.md',
  'receipts/thesis-state-market/gsa-centers-of-excellence-2017.md',
  'data/research/theses/synthetic-population-infrastructure.json',
  'data/research/thesis-evidence/synthetic-population-infrastructure.json',
  'data/research/thesis-reviews/synthetic-population-infrastructure.json',
  'legacy/graph.edge-model.json', 'legacy/uk-ai-policy.edge-model.json',
  'src/ui-utils.js', 'src/i18n.js', 'src/aperture-bootstrap.js', 'src/visual-aperture-core.mjs',
  'src/visual-aperture-state.mjs', 'src/visual-aperture-workspace.mjs',
  'src/visual-aperture-export.mjs',
  'src/visual-aperture-workspace-runtime.js', 'src/visual-aperture-export-runtime.js', 'src/visual-aperture.js',
  ...Array.from({ length: 11 }, (_, index) => `src/visual-aperture-part-${index + 1}.js`),
  'src/visual-aperture.css', 'src/visual-aperture-layout.css', 'src/visual-aperture-svg.css',
  'src/estate-aperture-template.html', 'src/estate-aperture.css', 'src/estate-aperture-runtime.js',
  'src/gametrail-aperture-template.html', 'src/gametrail-aperture.css', 'src/gametrail-aperture-runtime.js',
  'src/visual-aperture-responsive.css', 'src/visual-aperture-workspace.css', 'src/visual-aperture-export.css',
  'assets/social-card.png', 'docs/methodology.md', 'docs/thesis-assembly.md',
  'docs/synthetic-population-vendor-denominator.md', 'docs/thesis-case-packets.md',
  'docs/thesis-state-market-receipt-custody.md',
  'docs/ssc-wave-01-second-party-review-intake.md',
  'cases/field-autopsy-03/case.json'
];
const missing = required.filter(file => !fs.existsSync(path.join(destination, file)));
if (missing.length) {
  console.error(`validate-pages failed: missing ${missing.join(', ')}`);
  process.exit(1);
}
for (const forbidden of [
  'data/crawl',
  'data/intake',
  'data/local',
  'receipts/crawl',
  'build/core-thesis/status-sovereignty',
  'reports/core-thesis/status-sovereignty',
  'data/project/status-sovereignty-compact.json',
  'data/project/status-sovereignty-fanout.json',
  'data/project/status-sovereignty-release-manifest.json',
  'data/project/status-sovereignty-source-registry.json',
  'data/project/status-sovereignty-wave-01-release-manifest.json',
  'data/project/status-sovereignty-wave-01-maintainer-review-release-manifest.json',
  'data/project/status-sovereignty-wave-01-targeted-acquisition-release-manifest.json',
  'data/research/status-sovereignty-wave-01-source-receipts.json',
  'data/research/status-sovereignty-wave-01.json',
  'data/research/status-sovereignty-wave-01-maintainer-review.json',
  'data/research/status-sovereignty-wave-01-targeted-acquisition-source-receipts.json',
  'data/research/status-sovereignty-wave-01-targeted-acquisition.json',
  'data/project/status-sovereignty-wave-01-second-party-review-campaign.json',
  'data/project/status-sovereignty-wave-01-second-party-review-packet-registry.json',
  'data/project/status-sovereignty-wave-01-second-party-review-release-manifest.json',
  'data/research/status-sovereignty-wave-01-second-party-review-candidates.json',
  'data/research/status-sovereignty-wave-01-second-party-review-responses.json',
  'data/project/status-sovereignty-wave-02-intake-release-manifest.json',
  'data/project/status-sovereignty-wave-02-maintainer-review-release-manifest.json',
  'data/research/status-sovereignty-wave-02.json',
  'data/research/status-sovereignty-wave-02-maintainer-review.json',
  'docs/methods/status-sovereignty-compact.md',
  'docs/milestones/m05-status-sovereignty-fanout.md',
  'docs/milestones/m05-status-sovereignty-wave-01.md',
  'docs/milestones/m05-status-sovereignty-wave-01-review.md',
  'docs/milestones/m05-status-sovereignty-wave-01-targeted-acquisition.md',
  'docs/milestones/m05-status-sovereignty-wave-01-second-party-review.md',
  'docs/milestones/m05-status-sovereignty-wave-02-intake.md',
  'docs/milestones/m05-status-sovereignty-wave-02-review.md',
]) {
  if (fs.existsSync(path.join(destination, forbidden))) {
    console.error(`validate-pages failed: intake path ${forbidden} must not be published`);
    process.exit(1);
  }
}
// SSC-H01 is canonical repository research but remains publication-blocked.
// The broad Pages builder must prove that none of its source, contracts,
// reports, or exact-byte custody products escaped into the public artifact.
for (const held of [
  'build/core-thesis/status-sovereignty',
  'reports/core-thesis/status-sovereignty',
  'data/project/status-sovereignty-compact.json',
  'data/project/status-sovereignty-fanout.json',
  'data/project/status-sovereignty-release-manifest.json',
  'data/project/status-sovereignty-source-registry.json',
  'data/project/status-sovereignty-wave-01-release-manifest.json',
  'data/project/status-sovereignty-wave-01-maintainer-review-release-manifest.json',
  'data/project/status-sovereignty-wave-01-targeted-acquisition-release-manifest.json',
  'data/research/status-sovereignty-wave-01-source-receipts.json',
  'data/research/status-sovereignty-wave-01.json',
  'data/research/status-sovereignty-wave-01-maintainer-review.json',
  'data/research/status-sovereignty-wave-01-targeted-acquisition-source-receipts.json',
  'data/research/status-sovereignty-wave-01-targeted-acquisition.json',
  'data/project/status-sovereignty-wave-01-second-party-review-campaign.json',
  'data/project/status-sovereignty-wave-01-second-party-review-packet-registry.json',
  'data/project/status-sovereignty-wave-01-second-party-review-release-manifest.json',
  'data/research/status-sovereignty-wave-01-second-party-review-candidates.json',
  'data/research/status-sovereignty-wave-01-second-party-review-responses.json',
  'data/project/status-sovereignty-wave-02-intake-release-manifest.json',
  'data/project/status-sovereignty-wave-02-maintainer-review-release-manifest.json',
  'data/research/status-sovereignty-wave-02.json',
  'data/research/status-sovereignty-wave-02-maintainer-review.json',
  'docs/methods/status-sovereignty-compact.md',
  'docs/milestones/m05-status-sovereignty-fanout.md',
  'docs/milestones/m05-status-sovereignty-wave-01.md',
  'docs/milestones/m05-status-sovereignty-wave-01-review.md',
  'docs/milestones/m05-status-sovereignty-wave-01-targeted-acquisition.md',
  'docs/milestones/m05-status-sovereignty-wave-01-second-party-review.md',
  'docs/milestones/m05-status-sovereignty-wave-02-intake.md',
  'docs/milestones/m05-status-sovereignty-wave-02-review.md',
]) {
  if (fs.existsSync(path.join(destination, held))) {
    console.error(`validate-pages failed: publication-blocked SSC path ${held} must not be published`);
    process.exit(1);
  }
}
const html = fs.readFileSync(path.join(destination, 'index.html'), 'utf8');
const app = fs.readFileSync(path.join(destination, 'app.js'), 'utf8');
const i18n = fs.readFileSync(path.join(destination, 'src', 'i18n.js'), 'utf8');
const apertureBootstrap = fs.readFileSync(path.join(destination, 'src', 'aperture-bootstrap.js'), 'utf8');
const apertureEntry = fs.readFileSync(path.join(destination, 'src', 'visual-aperture.js'), 'utf8');
const apertureState = fs.readFileSync(path.join(destination, 'src', 'visual-aperture-state.mjs'), 'utf8');
const apertureWorkspace = fs.readFileSync(path.join(destination, 'src', 'visual-aperture-workspace.mjs'), 'utf8');
const apertureExport = fs.readFileSync(path.join(destination, 'src', 'visual-aperture-export.mjs'), 'utf8');
const apertureWorkspaceRuntime = fs.readFileSync(path.join(destination, 'src', 'visual-aperture-workspace-runtime.js'), 'utf8');
const apertureExportRuntime = fs.readFileSync(path.join(destination, 'src', 'visual-aperture-export-runtime.js'), 'utf8');
const aperture = [
  apertureWorkspaceRuntime,
  apertureExportRuntime,
  ...Array.from({ length: 11 }, (_, index) => fs.readFileSync(path.join(destination, 'src', `visual-aperture-part-${index + 1}.js`), 'utf8'))
].join('\n');
const standalone = fs.readFileSync(path.join(destination, 'Clifford-Number-standalone.html'), 'utf8');

const gameTrailData = JSON.parse(fs.readFileSync(path.join(destination, 'gametrails', 'data.json'), 'utf8'));
const gameTrailPage = fs.readFileSync(path.join(destination, 'gametrails', 'index.html'), 'utf8');
const gameTrailStandalone = fs.readFileSync(path.join(destination, 'Clifford-Game-Trail-Aperture-standalone.html'), 'utf8');
const estateFrontierSurvey = JSON.parse(fs.readFileSync(path.join(destination, 'build', 'estate-frontier', 'manifest.json'), 'utf8'));
const estateGameTrailManifest = JSON.parse(fs.readFileSync(path.join(destination, 'build', 'estate-game-trails', 'manifest.json'), 'utf8'));
const denominatorBuild = JSON.parse(fs.readFileSync(path.join(destination, 'build', 'research', 'synthetic-population-vendor-denominator.json'), 'utf8'));
const denominatorMarkdown = fs.readFileSync(path.join(destination, 'build', 'research', 'synthetic-population-vendor-denominator.md'), 'utf8');
const casePacketIndex = JSON.parse(fs.readFileSync(path.join(destination, 'build', 'thesis', 'case-packet-index.json'), 'utf8'));
const jonesPacket = JSON.parse(fs.readFileSync(path.join(destination, 'build', 'thesis', 'case-packets', 'state-market-no10-pandemic-data-diaspora.json'), 'utf8'));
const successionPacket = JSON.parse(fs.readFileSync(path.join(destination, 'build', 'thesis', 'case-packets', 'state-market-central-government-ai-unit-succession.json'), 'utf8'));
const thesisBuild = JSON.parse(fs.readFileSync(path.join(destination, 'build', 'thesis', 'synthetic-population-infrastructure.json'), 'utf8'));
const thesisMarkdown = fs.readFileSync(path.join(destination, 'build', 'thesis', 'synthetic-population-infrastructure.md'), 'utf8');
const ukAiCase = JSON.parse(fs.readFileSync(path.join(destination, 'build', 'cases', 'uk-ai-policy.json'), 'utf8'));
const andurilCase = JSON.parse(fs.readFileSync(path.join(destination, 'build', 'cases', 'anduril-access-ownership.json'), 'utf8'));
const andurilBrief = fs.readFileSync(path.join(destination, 'briefs', 'anduril-access-ownership.html'), 'utf8');
const hopGraph = JSON.parse(fs.readFileSync(path.join(destination, 'build', 'hop-graph.json'), 'utf8'));
const legacyGraph = JSON.parse(fs.readFileSync(path.join(destination, 'graph.json'), 'utf8'));
const legacyEdgeModels = [
  JSON.parse(fs.readFileSync(path.join(destination, 'legacy', 'graph.edge-model.json'), 'utf8')),
  JSON.parse(fs.readFileSync(path.join(destination, 'legacy', 'uk-ai-policy.edge-model.json'), 'utf8')),
];

if (gameTrailData.schema_version !== 'estate-game-trail-public-data@2'
  || gameTrailData.manifest?.counts?.estates !== 24
  || gameTrailData.manifest?.counts?.frontier_estates !== 10
  || gameTrailData.manifest?.counts?.legacy_preserved_trails !== 35
  || gameTrailData.manifest?.counts?.total_compiled_trails !== 308
  || gameTrailData.manifest?.counts?.legacy_trail_estate_evaluations !== 840
  || gameTrailData.overlap_matrix?.directed_overlap_pairs?.length !== 302
  || gameTrailData.interpretation_contract?.graph_effect !== 'none'
  || gameTrailData.interpretation_contract?.conclusion_generated !== false
  || estateFrontierSurvey.counts?.estates !== 10
  || estateFrontierSurvey.counts?.raw_records_acquired !== 0
  || estateGameTrailManifest.counts?.legacy_preserved_trails !== 35
  || estateGameTrailManifest.counts?.total_compiled_trails !== 308
  || !gameTrailPage.includes('Game-Trail Aperture')
  || !gameTrailPage.includes('Cell counts are trail counts, not scores')
  || !gameTrailStandalone.includes('Game-Trail Aperture')
  || /<script[^>]+src=/.test(gameTrailStandalone)) {
  console.error('validate-pages failed: Game-Trail Aperture or frontier survey contract is missing, distorted, or promoted');
  process.exit(1);
}

if (!html.includes('id="main-content"') || !html.includes('href="estates/"') || !html.includes('href="gametrails/"') || !app.includes('build/public-catalog.json')) {
  console.error('validate-pages failed: public entrypoint does not expose the explorer and compiled cases');
  process.exit(1);
}
if (!apertureBootstrap.includes("import('./visual-aperture.js")
  || !html.includes('src="src/aperture-bootstrap.js')
  || !apertureEntry.includes("import * as addressState from './visual-aperture-state.mjs'")
  || !apertureEntry.includes("import * as workspaceModel from './visual-aperture-workspace.mjs'")
  || !apertureEntry.includes("import * as exportModel from './visual-aperture-export.mjs'")
  || !apertureEntry.includes('visual-aperture-workspace-runtime.js')
  || !apertureEntry.includes('visual-aperture-export-runtime.js')
  || !apertureEntry.includes('visual-aperture-part-${index + 1}.js')
  || !aperture.includes('Map the system. Keep the receipt attached.')) {
  console.error('validate-pages failed: integrated visual aperture is not wired into the public runtime');
  process.exit(1);
}
if (!apertureState.includes("APERTURE_STATE_VERSION = '1'")
  || !apertureState.includes('buildApertureUrl')
  || !aperture.includes('Copy exact view')
  || !aperture.includes("addEventListener('popstate'")) {
  console.error('validate-pages failed: aperture exact-view URL contract is missing');
  process.exit(1);
}
if (!apertureWorkspace.includes("APERTURE_WORKSPACE_VERSION = '1'")
  || !apertureWorkspace.includes("APERTURE_WORKSPACE_STORAGE_KEY = 'clifford-aperture-workspace'")
  || !apertureWorkspaceRuntime.includes('Save the view, not a new finding.')
  || !apertureWorkspaceRuntime.includes('Route results are always recomputed from the current compiled graph.')
  || !aperture.includes('Reset local workspace')) {
  console.error('validate-pages failed: local operator workspace contract is missing');
  process.exit(1);
}
if (!apertureExport.includes("APERTURE_EXPORT_SCHEMA_VERSION = 'clifford-aperture-export@1'")
  || !apertureExport.includes('buildApertureExportPacket')
  || !apertureExport.includes('graph_effect: \'none\'')
  || !apertureExportRuntime.includes('Export the view with its limits attached.')
  || !apertureExportRuntime.includes('Copy evidence JSON')
  || !apertureExportRuntime.includes('Print packet')
  || !apertureExportRuntime.includes('temporal_input_valid')) {
  console.error('validate-pages failed: caveated aperture publication export contract is missing');
  process.exit(1);
}
if (i18n.includes('visual-aperture')) {
  console.error('validate-pages failed: localization module must stay free of aperture bootstrap side effects');
  process.exit(1);
}
if (!standalone.includes('data-portable-release="true"') || !standalone.includes('const EMBEDDED_DATA =') || /src="app\.js(?:\?[^\"]*)?"/.test(standalone)) {
  console.error('validate-pages failed: standalone release is not self-contained');
  process.exit(1);
}
if (!standalone.includes('globalThis.__CLIFFORD_APERTURE_BUNDLED__ = true')
  || !standalone.includes('Map the system. Keep the receipt attached.')
  || !standalone.includes("APERTURE_STATE_VERSION = '1'")
  || !standalone.includes("APERTURE_WORKSPACE_VERSION = '1'")
  || !standalone.includes("APERTURE_EXPORT_SCHEMA_VERSION = 'clifford-aperture-export@1'")
  || !standalone.includes('Local operator workspace')
  || !standalone.includes('Export the view with its limits attached.')
  || !standalone.includes('Copy exact view')
  || /<(?:script|link)[^>]+(?:src|href)="[^"]*visual-aperture/.test(standalone)) {
  console.error('validate-pages failed: standalone release omits or externally references the operator aperture');
  process.exit(1);
}
if (denominatorBuild.schema_version !== 'synthetic-population-vendor-denominator-build@1'
  || denominatorBuild.denominator_id !== 'gartner-7718657-synthetic-population-vendors-2026'
  || denominatorBuild.status !== 'blocked_not_frozen'
  || denominatorBuild.usable_as_denominator !== false
  || denominatorBuild.counts_toward_thesis_evidence !== false
  || denominatorBuild.graph_effect !== 'none'
  || denominatorBuild.conclusion_generated !== false
  || denominatorBuild.counts?.public_recovery_candidates_transcribed !== 14
  || denominatorBuild.counts?.latest_issue_reported_recovery_count !== 15
  || denominatorBuild.counts?.public_recoveries_not_yet_transcribed !== 1
  || denominatorBuild.counts?.source_document_membership_confirmed !== 0
  || denominatorBuild.counts?.denominator_members_frozen !== 0
  || denominatorBuild.thesis_consumption?.evidence_bearing_relation_allowed !== false
  || !denominatorMarkdown.includes('biased public recovery set, not the denominator')) {
  console.error('validate-pages failed: vendor denominator recovery was promoted, distorted, or omitted');
  process.exit(1);
}
if (casePacketIndex.schema_version !== 'clifford-thesis-case-packet-index@1'
  || casePacketIndex.graph_effect !== 'none'
  || casePacketIndex.conclusion_generated !== false
  || casePacketIndex.totals?.cases !== 2
  || casePacketIndex.totals?.repository_receipts !== 11
  || casePacketIndex.totals?.receipt_complete_cases !== 2
  || casePacketIndex.totals?.human_review_complete_cases !== 0
  || casePacketIndex.totals?.denominator_complete_cases !== 0
  || casePacketIndex.totals?.eligible_for_promotion !== 0
  || casePacketIndex.totals?.emitted_thesis_evidence_packets !== 0
  || jonesPacket.receipt_custody_status !== 'complete'
  || jonesPacket.receipt_count !== 3
  || jonesPacket.promotion?.repository_receipts_complete !== true
  || jonesPacket.promotion?.human_review_complete !== false
  || jonesPacket.promotion?.eligible_for_thesis_evidence_promotion !== false
  || successionPacket.receipt_custody_status !== 'complete'
  || successionPacket.receipt_count !== 8
  || successionPacket.promotion?.repository_receipts_complete !== true
  || successionPacket.promotion?.human_review_complete !== false
  || successionPacket.promotion?.eligible_for_thesis_evidence_promotion !== false
  || !jonesPacket.observations?.some(item => item.predicate === 'business_appointment_rules_breach_recorded' && item.non_retroactive === true)
  || !jonesPacket.observations?.some(item => item.predicate === 'source_explicit_ordinary_explanation' && item.relation === 'weakens')
  || !successionPacket.observations?.some(item => item.predicate === 'institutional_succession_not_established_in_opened_sources' && item.relation === 'null_result')
  || !successionPacket.observations?.some(item => item.predicate === 'units_collaborated' && item.relation === 'context')) {
  console.error('validate-pages failed: thesis case-intake packets were promoted, flattened, or omitted');
  process.exit(1);
}
if (thesisBuild.schema_version !== 'clifford-thesis-build@1'
  || thesisBuild.thesis_id !== 'synthetic-population-infrastructure'
  || thesisBuild.graph_effect !== 'none'
  || thesisBuild.conclusion_generated !== false
  || thesisBuild.bottom_line_generated !== false
  || thesisBuild.machine_synthesis_ceiling !== 'eligible_for_human_synthesis'
  || thesisBuild.counts?.case_contracts !== 18
  || thesisBuild.counts?.propositions !== 6
  || thesisBuild.counts?.evidence_packets !== 0
  || thesisBuild.counts?.coverage_packets !== 3
  || thesisBuild.status !== 'collecting_evidence'
  || !thesisMarkdown.includes('Machine conclusion generated: false')) {
  console.error('validate-pages failed: compiled thesis dossier exceeds or omits its assembly contract');
  process.exit(1);
}
if (!standalone.includes('href="data:image/svg+xml;base64,') || standalone.includes('href="assets/favicon.svg"')) {
  console.error('validate-pages failed: standalone favicon is not embedded');
  process.exit(1);
}
if (!standalone.includes('legacy-uk-ai-policy@1') || !standalone.includes('all 50 recommendations')) {
  console.error('validate-pages failed: standalone release omits the public UK AI policy case');
  process.exit(1);
}
if (andurilCase.case_id !== 'anduril-access-ownership'
  || andurilCase.presentation !== 'reporter_briefing'
  || andurilCase.status !== 'review_required'
  || andurilCase.counts?.claims !== 24
  || andurilCase.counts?.receipts !== 22
  || andurilCase.claim_status_counts?.verified !== 15
  || andurilCase.claim_status_counts?.review_required !== 9
  || andurilCase.briefing?.href !== 'briefs/anduril-access-ownership.html'
  || !andurilBrief.includes('Anduril: access, ownership, and the government gate')
  || !andurilBrief.includes('../#case/anduril-access-ownership')
  || !app.includes('function caseBriefingHref')
  || !app.includes("item.briefing?.label || 'Open reporter brief'")) {
  console.error('validate-pages failed: Anduril reporter aperture or its evidence route is missing, distorted, or promoted');
  process.exit(1);
}
if (ukAiCase.subtitle !== 'Seven degrees of UK AI policy topology, with receipts.') {
  console.error('validate-pages failed: UK AI case framing exceeds the published evidence model');
  process.exit(1);
}
if (legacyGraph.subtitle !== 'Seven degrees of UK AI policy topology, with receipts.'
  || legacyEdgeModels.some(item => item.subtitle !== 'Seven degrees of UK AI policy topology, with receipts.')
  || standalone.includes('Seven degrees of UK AI state capture, with receipts.')) {
  console.error('validate-pages failed: stale state-capture framing remains in the public payload');
  process.exit(1);
}
const obsoleteNo10PairRefusal = (hopGraph.rejected_hop_pairs ?? []).find(item =>
  item.surface_id === 'no10-digital-data-advisory-2019-2021'
  && item.actor_a === 'dan-rosenfield'
  && item.actor_b === 'dominic-cummings');
const no10ContextRefusal = (hopGraph.rejected_hop_surfaces ?? []).find(item =>
  item.surface_id === 'ben-warner-no10-digital-data-role-observation-2020-2021');
const no10ContextPromoted = (hopGraph.edges ?? []).some(edge =>
  (edge.surfaces ?? []).some(surface =>
    surface.surface_id === 'ben-warner-no10-digital-data-role-observation-2020-2021'));
if (obsoleteNo10PairRefusal !== undefined
  || no10ContextRefusal?.reason !== 'broad_institution_context_only'
  || no10ContextPromoted) {
  console.error('validate-pages failed: No. 10 broad-office context is missing, misclassified, or still creating actor adjacency');
  process.exit(1);
}
console.log(`validate-pages: OK (${required.length} required artifacts)`);
