#!/usr/bin/env node
import fs from 'node:fs';

const target = '.github/tmp/apply-no-human-gate-migration.mjs';
let source = fs.readFileSync(target, 'utf8');

const interpolationBefore = '${arcadiaCompilation.manifest.counts.unsequenced_claims}';
const interpolationAfter = '\\${arcadiaCompilation.manifest.counts.unsequenced_claims}';
const interpolationOccurrences = source.split(interpolationBefore).length - 1;
if (interpolationOccurrences !== 2) throw new Error(`expected two unescaped Arcadia interpolation tokens, found ${interpolationOccurrences}`);
source = source.replaceAll(interpolationBefore, interpolationAfter);

const reportRuleBefore = `  selectionRule.prefixes = [...new Set([
    ...selectionRule.prefixes,
    'data/research/government-to-property-manifest.json',
    'tools/validate-gov-property.mjs'
  ])];
});`;
const reportRuleAfter = `  selectionRule.prefixes = [...new Set([
    ...selectionRule.prefixes,
    'data/research/government-to-property-manifest.json',
    'tools/validate-gov-property.mjs'
  ])];
  const reportRule = value.domain_path_rules.find(rule => rule.domain === 'report');
  reportRule.prefixes = [...new Set([
    ...reportRule.prefixes,
    'build/briefings/',
    'build/review/reporter-briefing-queue.json',
    'docs/adr-reporter-briefing-platform.md',
    'docs/reporter-briefings.md',
    'reports/index.html',
    'test/report-frontier.test.js',
    'test/reporter-briefing.test.js',
    'tools/build-report-frontier.mjs',
    'tools/compile-reporter-briefings.mjs',
    'tools/lib/report-frontier-html.mjs',
    'tools/lib/reporter-briefing.mjs',
    'tools/lib/report-waterline.mjs'
  ])];
});`;
if (!source.includes(reportRuleBefore)) throw new Error('expected audit-policy migration block not found');
source = source.replace(reportRuleBefore, reportRuleAfter);

fs.writeFileSync(target, source);
console.log('fixed migration interpolation and bound the complete reporter surface to report judgments');
