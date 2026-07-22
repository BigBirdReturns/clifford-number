#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { readJson, root } from './lib/ledger.mjs';
import { renderReportFrontierHtml } from './lib/report-frontier-html.mjs';

export const REPORT_FRONTIER_HTML_PATH = 'reports/index.html';

export function renderReportFrontier() {
  const frontier = readJson('build/report-frontier.json');
  const html = renderReportFrontierHtml(frontier);
  const output = path.join(root, REPORT_FRONTIER_HTML_PATH);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, html);
  return { frontier, html, output_path: REPORT_FRONTIER_HTML_PATH };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const rendered = renderReportFrontier();
  console.log(`report frontier page: ${rendered.output_path} (${rendered.frontier.cases.length} cases, ${rendered.frontier.trail_programs.length} trail programs)`);
}
