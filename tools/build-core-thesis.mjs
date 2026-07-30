import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

const thesisPath = path.join(root, 'data', 'project', 'core-thesis.json');
const alignmentPath = path.join(root, 'data', 'project', 'estate-thesis-alignment.json');
const estateDefinitionsDir = path.join(root, 'data', 'estates', 'definitions');
const buildDir = path.join(root, 'build', 'core-thesis');
const publicDir = path.join(root, 'reports', 'core-thesis');

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const stable = (value) => JSON.stringify(value, null, 2) + '\n';
const unique = (values) => new Set(values).size === values.length;

const escapeHtml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function validateCore(thesis, alignment) {
  assert(thesis.schema_version === 'clifford-core-thesis@1', 'unexpected core-thesis schema');
  assert(thesis.status === 'working_thesis', 'core thesis must remain a working thesis');
  assert(thesis.graph_effect === 'none', 'core thesis graph effect must be none');
  assert(thesis.conclusion_generated === false, 'core thesis cannot generate a conclusion');
  assert(thesis.machine_synthesis_ceiling === 'eligible_for_human_synthesis', 'invalid synthesis ceiling');

  const phases = thesis.historical_phases ?? [];
  const stages = thesis.conversion_stages ?? [];
  const levels = thesis.intentionality_levels ?? [];
  const archetypes = thesis.archetypes ?? [];
  const reports = thesis.report_contracts ?? [];
  const visuals = thesis.visualization_contracts ?? [];
  const fieldHypotheses = thesis.field_hypothesis_bridges ?? [];

  assert(phases.length === 5, `expected 5 historical phases, saw ${phases.length}`);
  assert(stages.length === 7, `expected 7 conversion stages, saw ${stages.length}`);
  assert(levels.length === 6, `expected 6 intentionality levels, saw ${levels.length}`);
  assert(archetypes.length === 10, `expected 10 archetypes, saw ${archetypes.length}`);
  assert(reports.length === 9, `expected 9 report contracts, saw ${reports.length}`);
  assert(visuals.length === 7, `expected 7 visualization contracts, saw ${visuals.length}`);
  assert(fieldHypotheses.length === 2, `expected 2 field hypothesis bridges, saw ${fieldHypotheses.length}`);
  assert(unique(fieldHypotheses.map((row) => row.hypothesis_id)), 'duplicate field hypothesis bridge');
  for (const row of fieldHypotheses) {
    assert(row.hypothesis_id && row.label && row.path && row.question && row.authority_ceiling, 'incomplete field hypothesis bridge');
    assert(row.graph_effect === 'none', `${row.hypothesis_id}: graph effect must be none`);
    assert(fs.existsSync(path.join(root, row.path)), `${row.hypothesis_id}: missing field hypothesis source ${row.path}`);
  }

  for (const [label, rows, key] of [
    ['phase', phases, 'phase_id'],
    ['stage', stages, 'stage_id'],
    ['intentionality level', levels, 'level_id'],
    ['archetype', archetypes, 'archetype_id'],
    ['report contract', reports, 'report_type_id'],
    ['visualization contract', visuals, 'visualization_id']
  ]) {
    const ids = rows.map((row) => row[key]);
    assert(ids.every(Boolean), `${label} id missing`);
    assert(unique(ids), `duplicate ${label} id`);
  }

  assert(alignment.schema_version === 'clifford-estate-thesis-alignment@1', 'unexpected alignment schema');
  assert(alignment.thesis_id === thesis.thesis_id, 'alignment thesis id drifted');
  assert(alignment.graph_effect === 'none', 'alignment graph effect must be none');
  assert(alignment.conclusion_generated === false, 'alignment cannot generate a conclusion');
  assert(alignment.estate_completion_claimed === false, 'alignment cannot claim estate completion');

  const estateRows = alignment.estates ?? [];
  const alignedIds = estateRows.map((row) => row.estate_id).sort();
  assert(alignedIds.length === 24, `expected 24 aligned estates, saw ${alignedIds.length}`);
  assert(unique(alignedIds), 'duplicate estate alignment');

  const definitionIds = fs.readdirSync(estateDefinitionsDir)
    .filter((name) => name.endsWith('.json'))
    .map((name) => name.replace(/\.json$/, ''))
    .sort();
  assert(definitionIds.length === 24, `expected 24 estate definitions, saw ${definitionIds.length}`);
  assert(JSON.stringify(alignedIds) === JSON.stringify(definitionIds), 'estate alignment does not exactly cover definitions');

  const phaseIds = new Set(phases.map((row) => row.phase_id));
  const stageIds = new Set(stages.map((row) => row.stage_id));
  const archetypeIds = new Set(archetypes.map((row) => row.archetype_id));
  const reportIds = new Set(reports.map((row) => row.report_type_id));

  for (const row of estateRows) {
    assert(row.phase_ids?.length, `${row.estate_id}: phase ids required`);
    assert(row.primary_conversion_stages?.length, `${row.estate_id}: conversion stages required`);
    assert(row.archetype_ids?.length, `${row.estate_id}: archetypes required`);
    assert(row.priority_questions?.length, `${row.estate_id}: priority questions required`);
    assert(row.decisive_record_families?.length, `${row.estate_id}: decisive records required`);
    assert(row.report_type_ids?.length, `${row.estate_id}: report types required`);
    assert(row.falsification_question, `${row.estate_id}: falsification question required`);
    for (const id of row.phase_ids) assert(phaseIds.has(id), `${row.estate_id}: unknown phase ${id}`);
    for (const id of row.primary_conversion_stages) assert(stageIds.has(id), `${row.estate_id}: unknown stage ${id}`);
    for (const id of row.archetype_ids) assert(archetypeIds.has(id), `${row.estate_id}: unknown archetype ${id}`);
    for (const id of row.report_type_ids) assert(reportIds.has(id), `${row.estate_id}: unknown report type ${id}`);
  }

  const serialized = JSON.stringify({ thesis, alignment }).toLowerCase();
  const forbiddenKeys = ['risk_score', 'influence_score', 'capture_score', 'wrongdoing_score'];
  for (const key of forbiddenKeys) assert(!serialized.includes(`"${key}"`), `forbidden score key ${key}`);

  return {
    phases,
    stages,
    levels,
    archetypes,
    reports,
    visuals,
    fieldHypotheses,
    estateRows
  };
}

function renderHtml(data) {
  const { thesis, alignment, manifest } = data;
  const phaseCards = thesis.historical_phases.map((phase) => `
    <article class="card phase" id="${escapeHtml(phase.phase_id)}">
      <p class="eyebrow">${escapeHtml(phase.period)}</p>
      <h3>${escapeHtml(phase.label)}</h3>
      <p>${escapeHtml(phase.problem)}</p>
      <details><summary>Response and inherited fog</summary>
        <h4>Dominant response</h4><ul>${phase.dominant_response.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
        <h4>Inherited fog</h4><ul>${phase.inherited_fog.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
      </details>
    </article>`).join('');

  const stageRows = thesis.conversion_stages.map((stage, index) => `
    <article class="stage" data-stage="${escapeHtml(stage.stage_id)}">
      <span class="step">${index + 1}</span>
      <div><h3>${escapeHtml(stage.label)}</h3><p>${escapeHtml(stage.question)}</p>
      <p class="small"><strong>Required objects:</strong> ${stage.required_objects.map(escapeHtml).join(' · ')}</p></div>
    </article>`).join('');

  const intentRows = thesis.intentionality_levels.map((level) => `
    <tr><th>${escapeHtml(level.level_id)}</th><td><strong>${escapeHtml(level.label)}</strong><br>${escapeHtml(level.meaning)}</td><td>${level.minimum_evidence.map(escapeHtml).join(' · ')}</td><td>${escapeHtml(level.forbidden_shortcut)}</td></tr>`).join('');

  const estateRows = alignment.estates.map((estate) => `
    <tr data-estate-row data-search="${escapeHtml([estate.estate_id, ...estate.priority_questions, ...estate.decisive_record_families].join(' ').toLowerCase())}">
      <th><code>${escapeHtml(estate.estate_id)}</code></th>
      <td>${estate.phase_ids.map((id) => `<span class="pill">${escapeHtml(id)}</span>`).join(' ')}</td>
      <td>${estate.primary_conversion_stages.map((id) => `<span class="pill">${escapeHtml(id)}</span>`).join(' ')}</td>
      <td>${estate.priority_questions.map((item) => `<p>${escapeHtml(item)}</p>`).join('')}</td>
      <td>${estate.decisive_record_families.map((item) => `<span class="record">${escapeHtml(item)}</span>`).join(' ')}</td>
      <td>${escapeHtml(estate.falsification_question)}</td>
    </tr>`).join('');

  const archetypes = thesis.archetypes.map((row) => `<article class="card"><p class="eyebrow">${escapeHtml(row.archetype_id)}</p><h3>${escapeHtml(row.label)}</h3><p>${escapeHtml(row.function)}</p></article>`).join('');
  const reportCards = thesis.report_contracts.map((row) => `<article class="card"><p class="eyebrow">${escapeHtml(row.report_type_id)}</p><h3>${escapeHtml(row.label)}</h3><p>${escapeHtml(row.question)}</p><details><summary>Required panels</summary><ul>${row.required_panels.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul></details></article>`).join('');
  const visualCards = thesis.visualization_contracts.map((row) => `<article class="card"><p class="eyebrow">${escapeHtml(row.visualization_id)}</p><h3>${escapeHtml(row.label)}</h3><p>${escapeHtml(row.purpose)}</p></article>`).join('');
  const fieldHypothesisCards = thesis.field_hypothesis_bridges.map((row) => `<article class="card"><p class="eyebrow">${escapeHtml(row.hypothesis_id)} · ${escapeHtml(row.authority_ceiling)}</p><h3>${escapeHtml(row.label)}</h3><p>${escapeHtml(row.question)}</p><p><code>${escapeHtml(row.path)}</code></p></article>`).join('');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(thesis.title)} · Clifford Number</title>
  <meta name="description" content="The durable, falsifiable core thesis and twenty-four-estate realignment for Clifford Number.">
  <style>
    :root{color-scheme:dark;--bg:#070a10;--panel:#101722;--panel2:#151f2d;--text:#edf3f8;--muted:#9fb0c2;--line:#2b3a4d;--accent:#8fd3ff;--accent2:#f2cc60;--ok:#9ee6b4;--max:1480px}
    *{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:radial-gradient(circle at 15% 0,#172234 0,transparent 32%),var(--bg);color:var(--text);font:16px/1.55 ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
    a{color:var(--accent)}code{font-family:ui-monospace,SFMono-Regular,Consolas,monospace}.wrap{width:min(var(--max),calc(100% - 32px));margin:auto}.top{position:sticky;top:0;z-index:10;background:rgba(7,10,16,.92);backdrop-filter:blur(12px);border-bottom:1px solid var(--line)}.top .wrap{display:flex;gap:18px;align-items:center;justify-content:space-between;padding:12px 0}.top nav{display:flex;gap:14px;flex-wrap:wrap}.top a{text-decoration:none;color:var(--muted)}.top strong{color:var(--text)}
    header{padding:72px 0 44px}.eyebrow{text-transform:uppercase;letter-spacing:.14em;font-size:.76rem;color:var(--accent2);font-weight:700}.hero h1{font-size:clamp(2.6rem,7vw,6.8rem);line-height:.93;max-width:1100px;margin:.16em 0}.lede{font-size:clamp(1.12rem,2vw,1.45rem);max-width:920px;color:var(--muted)}.thesis{border-left:4px solid var(--accent);padding:18px 22px;background:rgba(16,23,34,.8);font-size:1.08rem;max-width:1180px}.metrics{display:grid;grid-template-columns:repeat(7,minmax(120px,1fr));gap:10px;margin-top:28px}.metric{padding:16px;background:var(--panel);border:1px solid var(--line);border-radius:12px}.metric b{display:block;font-size:1.8rem}.metric span{color:var(--muted);font-size:.82rem}
    section{padding:42px 0;border-top:1px solid var(--line)}h2{font-size:clamp(1.8rem,4vw,3.4rem);margin:.2em 0 .45em}h3{margin:.15em 0 .5em}h4{margin-bottom:.25em}.section-intro{color:var(--muted);max-width:900px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:14px}.card{background:linear-gradient(145deg,var(--panel),var(--panel2));border:1px solid var(--line);border-radius:14px;padding:18px}.card p{color:var(--muted)}details{border-top:1px solid var(--line);padding-top:10px}summary{cursor:pointer;color:var(--accent)}
    .pipeline{display:grid;gap:10px}.stage{display:grid;grid-template-columns:56px 1fr;gap:15px;align-items:start;padding:18px;background:var(--panel);border:1px solid var(--line);border-radius:12px}.step{display:grid;place-items:center;width:42px;height:42px;border-radius:50%;background:var(--accent);color:#04101a;font-weight:900}.small{font-size:.88rem;color:var(--muted)}
    .table-wrap{overflow:auto;border:1px solid var(--line);border-radius:12px}table{border-collapse:collapse;width:100%;min-width:1050px;background:var(--panel)}th,td{padding:12px;vertical-align:top;text-align:left;border-bottom:1px solid var(--line)}thead th{position:sticky;top:0;background:#111a27;z-index:2}.pill,.record{display:inline-block;padding:3px 7px;border:1px solid var(--line);border-radius:999px;margin:2px;font-size:.75rem;color:var(--muted)}.record{border-radius:5px}.search{width:100%;max-width:620px;padding:12px 14px;background:#0b111a;color:var(--text);border:1px solid var(--line);border-radius:9px;margin:8px 0 16px}
    .boundary{background:#0d1713;border:1px solid #2d5b42;border-radius:14px;padding:20px}.boundary code{color:var(--ok)}footer{padding:42px 0;color:var(--muted)}
    @media(max-width:850px){.metrics{grid-template-columns:repeat(2,1fr)}.top .wrap{align-items:flex-start;flex-direction:column}header{padding-top:40px}}@media print{.top{display:none}body{background:white;color:#111}.card,.metric,.stage,table{background:white;color:#111}.section-intro,.lede,.card p,.small,.metric span{color:#444}}
  </style>
</head>
<body>
  <div class="top"><div class="wrap"><strong>Clifford Number · Core thesis</strong><nav><a href="../../">Project</a><a href="../">Reports</a><a href="../../estates/">Estates</a><a href="../../gametrails/">Game trails</a></nav></div></div>
  <header class="hero"><div class="wrap">
    <p class="eyebrow">Working thesis · ${escapeHtml(thesis.as_of)}</p>
    <h1>${escapeHtml(thesis.short_form)}</h1>
    <p class="lede">${escapeHtml(thesis.project_question)}</p>
    <div class="thesis">${escapeHtml(thesis.working_thesis)}</div>
    <div class="metrics">
      <div class="metric"><b>${manifest.counts.phases}</b><span>historical phases</span></div>
      <div class="metric"><b>${manifest.counts.conversion_stages}</b><span>conversion stages</span></div>
      <div class="metric"><b>${manifest.counts.intentionality_levels}</b><span>intentionality levels</span></div>
      <div class="metric"><b>${manifest.counts.archetypes}</b><span>recurring archetypes</span></div>
      <div class="metric"><b>${manifest.counts.report_contracts}</b><span>report contracts</span></div>
      <div class="metric"><b>${manifest.counts.field_hypothesis_bridges}</b><span>field hypotheses</span></div>
      <div class="metric"><b>${manifest.counts.estates}</b><span>aligned estates</span></div>
    </div>
  </div></header>

  <main>
    <section id="phases"><div class="wrap"><p class="eyebrow">Timeline</p><h2>Five overlapping post-Cold War phases</h2><p class="section-intro">The phases organize context. Membership does not establish a common planner, intent, or causal relation.</p><div class="grid">${phaseCards}</div></div></section>
    <section id="conversion"><div class="wrap"><p class="eyebrow">Conversion architecture</p><h2>From problem framing to reversibility</h2><p class="section-intro">A complete chain requires an independently receipted transition at every stage. Missing transitions remain open joins.</p><div class="pipeline">${stageRows}</div></div></section>
    <section id="intent"><div class="wrap"><p class="eyebrow">Actor-specific review</p><h2>Intentionality ladder</h2><p class="section-intro">The levels are separate propositions, not a score or presumption of escalation.</p><div class="table-wrap"><table><thead><tr><th>Level</th><th>Meaning</th><th>Minimum evidence</th><th>Forbidden shortcut</th></tr></thead><tbody>${intentRows}</tbody></table></div></div></section>
    <section id="archetypes"><div class="wrap"><p class="eyebrow">Persistent functions</p><h2>Ten recurring archetypes</h2><p class="section-intro">The signal is role stacking and sequence, not the mere existence of a function.</p><div class="grid">${archetypes}</div></div></section>
    <section id="estates"><div class="wrap"><p class="eyebrow">Project realignment</p><h2>Twenty-four estates under one falsifiable grammar</h2><p class="section-intro">Alignment routes research. It does not merge estates or assign findings.</p><input class="search" id="estate-search" type="search" placeholder="Filter estates, records, or questions" aria-label="Filter estate alignment"><div class="table-wrap"><table><thead><tr><th>Estate</th><th>Phases</th><th>Stages</th><th>Priority questions</th><th>Decisive records</th><th>Falsification</th></tr></thead><tbody>${estateRows}</tbody></table></div></div></section>
    <section id="hypotheses"><div class="wrap"><p class="eyebrow">Cross-system field hypotheses</p><h2>Two graph-inert hypothesis bridges</h2><p class="section-intro">These objects organize bounded acquisition and falsification. They do not create prevalence, coordination, racial-order, or common-purpose findings.</p><div class="grid">${fieldHypothesisCards}</div></div></section>
    <section id="reports"><div class="wrap"><p class="eyebrow">Outputs</p><h2>Nine report contracts</h2><div class="grid">${reportCards}</div></div></section>
    <section id="visuals"><div class="wrap"><p class="eyebrow">Visual grammar</p><h2>Seven task-specific projections</h2><div class="grid">${visualCards}</div></div></section>
    <section id="boundary"><div class="wrap"><div class="boundary"><h2>Interpretation boundary</h2><p>${escapeHtml(thesis.interpretation_contract.copy_ready_caveat)}</p><p><code>graph_effect: none</code> · <code>conclusion_generated: false</code> · <code>machine_synthesis_ceiling: eligible_for_human_synthesis</code></p></div></div></section>
  </main>
  <footer><div class="wrap">Generated deterministically from <code>data/project/core-thesis.json</code> and <code>data/project/estate-thesis-alignment.json</code>. Fingerprint: <code>${escapeHtml(manifest.fingerprint)}</code>.</div></footer>
  <script>
    const search = document.getElementById('estate-search');
    const rows = [...document.querySelectorAll('[data-estate-row]')];
    search.addEventListener('input', () => {
      const q = search.value.trim().toLowerCase();
      for (const row of rows) row.hidden = q && !row.dataset.search.includes(q);
    });
  </script>
</body>
</html>`;
}

export function buildCoreThesis({ write = true } = {}) {
  const thesis = readJson(thesisPath);
  const alignment = readJson(alignmentPath);
  const validated = validateCore(thesis, alignment);

  const manifest = {
    schema_version: 'clifford-core-thesis-manifest@1',
    as_of: thesis.as_of,
    thesis_id: thesis.thesis_id,
    status: thesis.status,
    counts: {
      phases: validated.phases.length,
      conversion_stages: validated.stages.length,
      intentionality_levels: validated.levels.length,
      archetypes: validated.archetypes.length,
      report_contracts: validated.reports.length,
      visualization_contracts: validated.visuals.length,
      field_hypothesis_bridges: validated.fieldHypotheses.length,
      estates: validated.estateRows.length
    },
    waterline: {
      current: 'durable_core_thesis_and_estate_alignment',
      next: 'conversion_chain_ledgers_and_control_rights_atlas'
    },
    paths: {
      thesis: path.relative(root, thesisPath).replaceAll('\\', '/'),
      alignment: path.relative(root, alignmentPath).replaceAll('\\', '/'),
      public_data: 'reports/core-thesis/data.json',
      public_html: 'reports/core-thesis/index.html'
    },
    graph_effect: 'none',
    conclusion_generated: false,
    fingerprint: sha256(stable({ thesis, alignment })).slice(0, 20)
  };

  const data = { thesis, alignment, manifest };
  if (write) {
    fs.mkdirSync(buildDir, { recursive: true });
    fs.mkdirSync(publicDir, { recursive: true });
    fs.writeFileSync(path.join(buildDir, 'manifest.json'), stable(manifest));
    fs.writeFileSync(path.join(buildDir, 'data.json'), stable(data));
    fs.writeFileSync(path.join(publicDir, 'data.json'), stable(data));
    fs.writeFileSync(path.join(publicDir, 'index.html'), renderHtml(data));
  }
  return data;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const data = buildCoreThesis();
  console.log(JSON.stringify(data.manifest, null, 2));
}
