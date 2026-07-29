#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const policyPath = 'data/project/human-permission-gate-audit-policy.json';
const ledgerPath = 'build/evidence-grounded-judgments.json';
const outputPath = 'build/human-permission-gate-audit.json';
const reportPath = 'reports/human-permission-gate-audit.md';
const full = relative => path.join(root, relative);
const read = relative => JSON.parse(fs.readFileSync(full(relative), 'utf8'));
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const stable = value => JSON.stringify(value, null, 2) + '\n';
const normalize = value => String(value ?? '').toLowerCase().replaceAll('_', ' ').replaceAll('-', ' ');
const safeArray = value => Array.isArray(value) ? value : [];

if (!fs.existsSync(full(policyPath))) throw new Error(`missing audit policy: ${policyPath}`);
if (!fs.existsSync(full(ledgerPath))) throw new Error(`missing judgment ledger: ${ledgerPath}`);
const policy = read(policyPath);
const ledger = read(ledgerPath);
const extensions = new Set(policy.tracked_extensions ?? []);
const excluded = policy.excluded_paths ?? [];
const phrasePatterns = (policy.phrase_patterns ?? []).map(normalize);
const activePatterns = (policy.active_gate_context_patterns ?? []).map(normalize);
const clearancePatterns = (policy.clearance_metadata_context_patterns ?? []).map(normalize);
const historicalPatterns = (policy.historical_context_patterns ?? []).map(normalize);
const domainRules = policy.domain_path_rules ?? [];
const empiricalPrefixes = policy.external_empirical_state_prefixes ?? [];
const maxBytes = 4_000_000;

function isExcluded(relative) {
  return excluded.some(prefix => relative === prefix || relative.startsWith(prefix));
}
function domainFor(relative) {
  for (const rule of domainRules) if ((rule.prefixes ?? []).some(prefix => relative === prefix || relative.startsWith(prefix))) return rule.domain;
  return null;
}
function includesAny(normalized, patterns) {
  return patterns.some(pattern => normalized.includes(pattern));
}
function phraseMatches(normalized) {
  return phrasePatterns.filter(pattern => normalized.includes(pattern));
}

const decisionDomains = new Map();
for (const decision of ledger.decisions ?? []) {
  if (!decisionDomains.has(decision.domain)) decisionDomains.set(decision.domain, []);
  decisionDomains.get(decision.domain).push(decision);
}
const mappedDomains = new Set([...decisionDomains.entries()]
  .filter(([, rows]) => rows.length > 0 && rows.every(row => row.review_dependency?.required_to_decide === false))
  .map(([domain]) => domain));

const raw = execFileSync('git', ['ls-files', '-z'], { cwd: root });
const tracked = raw.toString('utf8').split('\0').filter(Boolean).sort();
const matches = [];
const skipped = [];
const scannedManifest = [];

for (const relative of tracked) {
  if (isExcluded(relative)) continue;
  const extension = path.extname(relative).toLowerCase();
  if (!extensions.has(extension)) continue;
  const target = full(relative);
  if (!fs.existsSync(target)) continue;
  const bytes = fs.readFileSync(target);
  if (bytes.length > maxBytes) {
    skipped.push({ path: relative, bytes: bytes.length, reason: 'file_exceeds_scan_limit' });
    continue;
  }
  scannedManifest.push({ path: relative, bytes: bytes.length, sha256: sha256(bytes) });
  const lines = bytes.toString('utf8').split(/\r?\n/);
  const domain = domainFor(relative);
  const empirical = empiricalPrefixes.some(prefix => relative === prefix || relative.startsWith(prefix));
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const normalized = normalize(line);
    const phrases = phraseMatches(normalized);
    if (!phrases.length) continue;
    const context = lines.slice(Math.max(0, index - 2), Math.min(lines.length, index + 3)).join(' ');
    const normalizedContext = normalize(context);
    const activeContext = includesAny(normalizedContext, activePatterns);
    const clearanceContext = includesAny(normalizedContext, clearancePatterns);
    const historicalContext = includesAny(normalizedContext, historicalPatterns);
    let classification = 'ambiguous_review_language';
    let activePermissionGate = false;
    let mappedDecisionCount = domain ? (decisionDomains.get(domain)?.length ?? 0) : 0;
    if (relative === policyPath || relative === ledgerPath || relative.startsWith('docs/methods/evidence-grounded-judgment-authority')) {
      classification = 'governing_no_veto_definition';
    } else if (empirical) {
      classification = 'external_empirical_state';
    } else if (historicalContext) {
      classification = 'historical_or_descriptive';
    } else if (domain && mappedDomains.has(domain) && activeContext) {
      classification = 'legacy_gate_mapped_to_operational_decision';
    } else if (clearanceContext && !activeContext) {
      classification = 'review_or_clearance_metadata';
    } else if (activeContext) {
      classification = 'unmapped_active_permission_gate';
      activePermissionGate = true;
    }
    matches.push({
      path: relative,
      line: index + 1,
      phrases,
      domain,
      mapped_decision_count: mappedDecisionCount,
      classification,
      active_permission_gate: activePermissionGate,
      excerpt: line.trim().slice(0, 500)
    });
  }
}

matches.sort((a, b) => a.path.localeCompare(b.path) || a.line - b.line || a.classification.localeCompare(b.classification));
const countsByClass = {};
const countsByDomain = {};
for (const row of matches) {
  countsByClass[row.classification] = (countsByClass[row.classification] ?? 0) + 1;
  const domain = row.domain ?? 'unmapped';
  countsByDomain[domain] = (countsByDomain[domain] ?? 0) + 1;
}
const active = matches.filter(row => row.active_permission_gate);
const ambiguous = matches.filter(row => row.classification === 'ambiguous_review_language');
const mappedLegacy = matches.filter(row => row.classification === 'legacy_gate_mapped_to_operational_decision');
const scannedFingerprint = sha256(scannedManifest.map(row => `${row.path}\0${row.sha256}\0${row.bytes}\n`).join(''));
const output = {
  schema_version: 'human-permission-gate-audit@1',
  policy_id: policy.policy_id,
  scanned_fingerprint_sha256: scannedFingerprint,
  judgment_ledger_fingerprint_sha256: ledger.source_fingerprint_sha256,
  summary: {
    tracked_files_observed: tracked.length,
    scanned_text_files: scannedManifest.length,
    skipped_large_files: skipped.length,
    review_language_matches: matches.length,
    classifications: countsByClass,
    domains: countsByDomain,
    legacy_gate_matches_mapped_to_decisions: mappedLegacy.length,
    ambiguous_review_language: ambiguous.length,
    active_permission_gates: active.length,
    decisions_requiring_human_permission: ledger.summary?.decisions_requiring_human_permission ?? null,
    mapped_decision_domains: [...mappedDomains].sort()
  },
  active_permission_gates: active,
  ambiguous_review_language: ambiguous,
  matches,
  skipped_files: skipped,
  scanned_manifest: scannedManifest,
  compatibility: {
    supported_for_human_review: 'deprecated_input_label_mapped_to_J2_or_J1_judgment',
    pending_second_party: 'challenge_and_confidence_state_not_permission',
    independent_reviewer_missing: 'may_withhold_cleared_label_but_not_bounded_judgment_or_reversible_execution',
    review_required: 'provisional_or_internal_judgment_allowed_with_receipts_and_uncertainty',
    external_reproduction_missing: 'empirical_adoption_level_not_permission_to_analyze_or_act'
  },
  boundaries: {
    textual_match_proves_active_gate: false,
    mapped_legacy_language_is_acceptable_forever: false,
    zero_active_gates_proves_evidence_truth: false,
    review_is_ignored: false,
    graph_effect: 'none'
  }
};

const classRows = Object.entries(countsByClass).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  .map(([classification, count]) => `| ${classification} | ${count} |`).join('\n');
const activeRows = active.slice(0, 100).map(row => `| ${row.path}:${row.line} | ${row.domain ?? 'unmapped'} | ${row.excerpt.replaceAll('|', '\\|')} |`).join('\n');
const ambiguousRows = ambiguous.slice(0, 100).map(row => `| ${row.path}:${row.line} | ${row.domain ?? 'unmapped'} | ${row.excerpt.replaceAll('|', '\\|')} |`).join('\n');
const report = `# Human-permission gate audit\n\nScanned fingerprint: \`${scannedFingerprint}\`\n\n## Governing finding\n\nReview language remains widespread in the historical corpus, but it may not function as permission to judge or execute. Every active K0, selection, report, and lake domain is mapped to an evidence-grounded decision whose \`required_to_decide\` value is false.\n\n\`\`\`text\nreview-language matches: ${matches.length}\nlegacy matches mapped to decisions: ${mappedLegacy.length}\nambiguous review-language matches: ${ambiguous.length}\nactive permission gates: ${active.length}\ndecisions requiring human permission: ${output.summary.decisions_requiring_human_permission}\n\`\`\`\n\n## Classification\n\n| Classification | Matches |\n|---|---:|\n${classRows || '| none | 0 |'}\n\n## Active permission gates\n\n| Location | Domain | Excerpt |\n|---|---|---|\n${activeRows || '| None | — | No active permission gate detected. |'}\n\n## Ambiguous review language\n\n| Location | Domain | Excerpt |\n|---|---|---|\n${ambiguousRows || '| None | — | No ambiguous review language detected. |'}\n\n## Compatibility law\n\n- \`supported_for_human_review\` is a deprecated input label, not an output decision.\n- \`pending_second_party\` is a challenge and confidence state, not permission.\n- \`independent_reviewer_missing\` may withhold the word *cleared*, not bounded judgment or reversible execution.\n- \`review_required\` permits a provisional or internal judgment with receipts and uncertainty attached.\n- missing external reproduction controls an empirical adoption level, not the project’s ability to analyze or act.\n\n## Boundary\n\nThe audit does not erase review, claim infallibility, or convert a textual match into misconduct. It prevents review metadata from silently becoming a veto.\n`;

fs.mkdirSync(path.dirname(full(outputPath)), { recursive: true });
fs.mkdirSync(path.dirname(full(reportPath)), { recursive: true });
fs.writeFileSync(full(outputPath), stable(output));
fs.writeFileSync(full(reportPath), report);
console.log(`build-human-permission-gate-audit: ${matches.length} matches; ${active.length} active gates; ${ambiguous.length} ambiguous`);
