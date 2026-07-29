from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    target = Path(path)
    text = target.read_text()
    count = text.count(old)
    assert count == 1, f"{path}: anchor count={count}"
    target.write_text(text.replace(old, new))


replace_once(
    "tools/validate-k0-role-neutral-wave-04.mjs",
    """  if (!['execution_started_wave_04_discovery_only','execution_started_wave_04_field_complete'].includes(neutral.status)) fail('neutral status drift');
  if (neutral.execution?.searches_executed !== 16 || neutral.execution?.query_templates_executed !== 5 || neutral.execution?.raw_results_observed !== 68 || neutral.execution?.returned_records !== 32) fail('aggregate execution count drift');
  if (JSON.stringify(neutral.execution?.executed_wave_ids) !== JSON.stringify(['K0-W01','K0-W02','K0-W03','K0-W04'])) fail('aggregate wave linkage drift');""",
    """  const executedWaveIds = neutral.execution?.executed_wave_ids || [];
  if (typeof neutral.status !== 'string' || !neutral.status.startsWith('execution_started_wave_')) fail('neutral status drift');
  if (!Number.isInteger(neutral.execution?.searches_executed) || neutral.execution.searches_executed < 16 || !Number.isInteger(neutral.execution?.query_templates_executed) || neutral.execution.query_templates_executed < 5 || !Number.isInteger(neutral.execution?.raw_results_observed) || neutral.execution.raw_results_observed < 68 || !Number.isInteger(neutral.execution?.returned_records) || neutral.execution.returned_records < 32) fail('aggregate execution count drift');
  if (JSON.stringify(executedWaveIds.slice(0, 4)) !== JSON.stringify(['K0-W01','K0-W02','K0-W03','K0-W04'])) fail('aggregate wave linkage drift');""",
)

replace_once(
    "test/k0-role-neutral-wave-04.test.js",
    "const capture = structuredClone(wave);",
    """const missingWave04 = structuredClone(neutral);
missingWave04.execution.executed_wave_ids = missingWave04.execution.executed_wave_ids.filter(id => id !== 'K0-W04');
result = validateWave04({ root, neutralPath: write('missing-wave04.json', missingWave04) });
assert.equal(result.ok, false);
assert.ok(result.failures.some(row => row.includes('aggregate wave linkage drift')));

const undercount = structuredClone(neutral);
undercount.execution.searches_executed = 15;
result = validateWave04({ root, neutralPath: write('undercount.json', undercount) });
assert.equal(result.ok, false);
assert.ok(result.failures.some(row => row.includes('aggregate execution count drift')));

const capture = structuredClone(wave);""",
)

replace_once(
    "tools/validate-k0-wave04-field-adjudication.mjs",
    """export function validateWave04Field({
  root = defaultRoot,
  auditPath = 'data/research/k0-wave04-field-adjudication.json'
} = {}) {""",
    """export function validateWave04Field({
  root = defaultRoot,
  auditPath = 'data/research/k0-wave04-field-adjudication.json',
  neutralPath = 'data/research/k0-role-neutral-denominator.json',
  coveragePath = 'data/research/corpus-coverage.json',
  reviewsPath = 'data/research/selection-adversarial-reviews.json'
} = {}) {""",
)
replace_once(
    "tools/validate-k0-wave04-field-adjudication.mjs",
    """  const neutral = read('data/research/k0-role-neutral-denominator.json');
  const coverage = read('data/research/corpus-coverage.json');
  const reviews = read('data/research/selection-adversarial-reviews.json');""",
    """  const neutral = read(neutralPath);
  const coverage = read(coveragePath);
  const reviews = read(reviewsPath);""",
)
replace_once(
    "tools/validate-k0-wave04-field-adjudication.mjs",
    """  if (neutral.status !== 'execution_started_wave_04_field_complete' || wave04State?.status !== 'discovery_complete_field_adjudication_complete') fail('aggregate Wave 04 reconciliation drift');""",
    """  const executedWaveIds = neutral.execution?.executed_wave_ids || [];
  if (typeof neutral.status !== 'string' || !neutral.status.startsWith('execution_started_wave_') || JSON.stringify(executedWaveIds.slice(0, 4)) !== JSON.stringify(['K0-W01','K0-W02','K0-W03','K0-W04']) || wave04State?.status !== 'discovery_complete_field_adjudication_complete') fail('aggregate Wave 04 reconciliation drift');""",
)
replace_once(
    "tools/validate-k0-wave04-field-adjudication.mjs",
    """  if (pendingMetric?.observed !== 0 || pendingMetric?.source !== 'data/research/k0-wave04-field-adjudication.json') fail('coverage pending-field metric drift');""",
    """  if (!pendingMetric || !Number.isInteger(pendingMetric.observed) || pendingMetric.observed < 0 || typeof pendingMetric.source !== 'string') fail('coverage pending-field metric shape drift');""",
)

replace_once(
    "test/k0-wave04-field-adjudication.test.js",
    """const audit = JSON.parse(fs.readFileSync(path.join(root, 'data/research/k0-wave04-field-adjudication.json'), 'utf8'));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'k0-wave04-field-test-'));""",
    """const audit = JSON.parse(fs.readFileSync(path.join(root, 'data/research/k0-wave04-field-adjudication.json'), 'utf8'));
const neutral = JSON.parse(fs.readFileSync(path.join(root, 'data/research/k0-role-neutral-denominator.json'), 'utf8'));
const coverage = JSON.parse(fs.readFileSync(path.join(root, 'data/research/corpus-coverage.json'), 'utf8'));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'k0-wave04-field-test-'));""",
)
replace_once(
    "test/k0-wave04-field-adjudication.test.js",
    "const graph = structuredClone(audit);",
    """const missingWave04 = structuredClone(neutral);
missingWave04.execution.executed_wave_ids = missingWave04.execution.executed_wave_ids.filter(id => id !== 'K0-W04');
result = validateWave04Field({ root, neutralPath: write('missing-wave04.json', missingWave04) });
assert.equal(result.ok, false);
assert.ok(result.failures.some(row => row.includes('aggregate Wave 04 reconciliation drift')));

const malformedPending = structuredClone(coverage);
const coverageRow = malformedPending.lanes.find(row => row.lane_id === 'epistemic-admissibility-ceiling-events');
coverageRow.metrics.find(row => row.metric_id === 'candidate_records_pending_field_audit').observed = -1;
result = validateWave04Field({ root, coveragePath: write('malformed-pending.json', malformedPending) });
assert.equal(result.ok, false);
assert.ok(result.failures.some(row => row.includes('coverage pending-field metric shape drift')));

const graph = structuredClone(audit);""",
)
