#!/usr/bin/env python3
"""Apply the four unresolved PR #410 review fixes to an exact checkout.

The script is deliberately fail-closed: it verifies the known Git blob identities
before editing. It appends a constitutional change receipt because three
protected paths change.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from typing import Callable

EXPECTED_GIT_BLOBS = {
    "tools/build-poof-clifford-ecology.mjs": "0a786d2fb68778cd9dad200f4c233010fde71dc3",
    "tools/validate-poof-clifford-ecology.mjs": "e98141145cb6e9ab90b97e7a1b76d75a5b094fcd",
    "test/poof-clifford-ecology.test.js": "4de113c77188e5e2adcda2c408489c13cea553c9",
    "test/poof-clifford-ecology-browser.test.js": "b9a8ddc96f9a410adcce40bc15a1773c77a0b30c",
    "data/project/poof-clifford-constitutional-change-log.json": "8611fbba7835ce36562cbc6dd10c95d40eb23680",
}


def git_blob_sha(data: bytes) -> str:
    return hashlib.sha1(b"blob " + str(len(data)).encode() + b"\0" + data).hexdigest()


def require_once(text: str, needle: str, label: str) -> None:
    count = text.count(needle)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly one match, observed {count}")


def replace_once(text: str, old: str, new: str, label: str) -> str:
    require_once(text, old, label)
    return text.replace(old, new, 1)


def patch_builder(text: str) -> str:
    old_actions = "const rootActions = data.aperture.entry_actions.map((label, index) => `<a class=\"button ${index === 0 ? 'primary' : ''}\" href=\"${escapeHtml([relHref('/', '/report/'), relHref('/', '/estate/'), relHref('/', '/newsroom/'), relHref('/', '/examination/'), relHref('/', '/methods/'), relHref('/', '/examination/'), relHref('/', '/machine/')][index])}\">${escapeHtml(label)}</a>`).join('');"
    new_actions = "const actionRoutes = { 'Read the argument':'/report/', 'Inspect a decision':'/estate/', 'Test a claim':'/examination/', 'Use the newsroom desk':'/newsroom/', 'Examine the evidence':'/examination/', 'Challenge the model':'/methods/', 'Query as an agent':'/machine/' };\n  const rootActions = data.aperture.entry_actions.map((label, index) => { const target = actionRoutes[label]; if (!target) throw new Error(`unmapped entry action: ${label}`); return `<a class=\"button ${index === 0 ? 'primary' : ''}\" href=\"${escapeHtml(relHref('/', target))}\">${escapeHtml(label)}</a>`; }).join('');"
    text = replace_once(text, old_actions, new_actions, "explicit entry-action routes")

    old_object_prefix = 'const objectCards = data.objects.objects.map((row) => `<article class="card object">'
    new_object_prefix = """const objectCards = data.objects.objects.map((row) => `<article class="card object" data-filter-item="${escapeHtml([row.object_id, row.schema_version, row.authority, String(row.canonical_write), row.graph_effect, ...Object.entries(row.effect_contract).flatMap(([key, value]) => [key, value])].join(' ').toLowerCase())}">"""
    text = replace_once(text, old_object_prefix, new_object_prefix, "object filter binding")

    old_ref_handler = (
        "const ref = q('#referral-form'); if (ref) q('#referral-export')?.addEventListener('click', () => { "
        "const val=id=>q(id)?.value.trim()||''; const packet={schema_version:'poof-referral-packet@1',"
    )
    new_ref_handler = (
        "const ref = q('#referral-form'); if (ref) q('#referral-export')?.addEventListener('click', () => { "
        "const result=q('#referral-result'); if(!ref.reportValidity()){ if(result){ result.hidden=false; "
        "result.textContent='Referral not exported. Complete every required field at the stated minimum length.'; } return; } "
        "const val=id=>q(id)?.value.trim()||''; const packet={schema_version:'poof-referral-packet@1',"
    )
    text = replace_once(text, old_ref_handler, new_ref_handler, "referral pre-export validation")

    old_download = "download('poof-referral-packet.json',packet); });\\n  const search=q('#site-search');"
    new_download = (
        "download('poof-referral-packet.json',packet); if(result){ result.hidden=false; "
        "result.textContent='Validated graph-inert referral exported locally.'; } });\\n  const search=q('#site-search');"
    )
    text = replace_once(text, old_download, new_download, "referral validation status")

    first_fields_old = (
        "[['ref-proposition','Exact proposition'],['ref-ceiling','Current evidence ceiling'],"
        "['ref-record','Required record or test'],['ref-route','Lawful acquisition route']]"
    )
    first_fields_new = (
        "[['ref-proposition','Exact proposition',15],['ref-ceiling','Current evidence ceiling',8],"
        "['ref-record','Required record or test',8],['ref-route','Lawful acquisition route',8]]"
    )
    text = replace_once(text, first_fields_old, first_fields_new, "first referral field constraints")

    second_fields_old = (
        "[['ref-custodian','Responsible custodian'],['ref-consequence','Consequence if unresolved'],"
        "['ref-privacy','Privacy boundary']]"
    )
    second_fields_new = (
        "[['ref-custodian','Responsible custodian',3],['ref-consequence','Consequence if unresolved',8],"
        "['ref-privacy','Privacy boundary',8]]"
    )
    text = replace_once(text, second_fields_old, second_fields_new, "second referral field constraints")

    textarea_old = "map(([id,label]) => `<div class=\"field\"><label for=\"${id}\">${label}</label><textarea id=\"${id}\"></textarea></div>`)"
    textarea_new = "map(([id,label,minLength]) => `<div class=\"field\"><label for=\"${id}\">${label}</label><textarea id=\"${id}\" required minlength=\"${minLength}\"></textarea></div>`)"
    count = text.count(textarea_old)
    if count != 2:
        raise RuntimeError(f"referral textarea renderer: expected 2 matches, observed {count}")
    text = text.replace(textarea_old, textarea_new)

    button_old = '<button class="button primary" type="button" id="referral-export">Export referral packet</button></div></form>'
    button_new = (
        '<button class="button primary" type="button" id="referral-export">Export referral packet</button>'
        '<p id="referral-result" class="result" role="status" aria-live="polite" hidden></p></div></form>'
    )
    text = replace_once(text, button_old, button_new, "referral status surface")
    return text


RFC3339_HELPER = r'''
const rfc3339DateTime = /^(\d{4})-(\d{2})-(\d{2})[Tt](\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?(?:[Zz]|([+-])(\d{2}):(\d{2}))$/;
function isRfc3339DateTime(value) {
  if (typeof value !== 'string') return false;
  const match = rfc3339DateTime.exec(value);
  if (!match) return false;
  const [, yearText, monthText, dayText, hourText, minuteText, secondText, , , offsetHourText, offsetMinuteText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  if (month < 1 || month > 12 || hour > 23 || minute > 59 || second > 60) return false;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (day < 1 || day > days[month - 1]) return false;
  if (offsetHourText !== undefined && (Number(offsetHourText) > 23 || Number(offsetMinuteText) > 59)) return false;
  return true;
}
'''.strip()


def patch_validator(text: str) -> str:
    insertion_point = "function matchesType(value, type) {"
    require_once(text, insertion_point, "RFC3339 helper insertion")
    text = text.replace(insertion_point, RFC3339_HELPER + "\n\n" + insertion_point, 1)
    text = replace_once(
        text,
        "if (schema.format === 'date-time' && Number.isNaN(Date.parse(value))) fail('invalid date-time');",
        "if (schema.format === 'date-time' && !isRfc3339DateTime(value)) fail('invalid RFC 3339 date-time');",
        "schema date-time validation",
    )
    text = replace_once(
        text,
        "if (change.emergency_override === true && (!change.expires_at || Number.isNaN(Date.parse(change.expires_at)) || Date.parse(change.expires_at) <= Date.parse(change.effective_at))) fail(`${change.change_id}: unconstitutional emergency override expiry`);",
        "if (change.emergency_override === true && (!isRfc3339DateTime(change.expires_at) || !isRfc3339DateTime(change.effective_at) || Date.parse(change.expires_at) <= Date.parse(change.effective_at))) fail(`${change.change_id}: unconstitutional emergency override expiry`);",
        "emergency override date-time validation",
    )
    return text


def patch_unit_test(text: str) -> str:
    anchor = "const objects = read('data/project/poof-clifford-object-registry.json');"
    require_once(text, anchor, "unit test insertion anchor")
    test_block = """
const comprehensionFixturePath = 'test/fixtures/poof-comprehension-receipt.fixture.json';
const comprehensionFixture = read(comprehensionFixturePath);
mutation = structuredClone(comprehensionFixture);
mutation.issued_at = '2026-07-29';
result = validatePoofCliffordEcology({ root, overrides: { fixtures: { [comprehensionFixturePath]: mutation } } });
assert.equal(result.ok, false);
assert.ok(result.failures.some((row) => row.includes('invalid RFC 3339 date-time')));

"""
    return text.replace(anchor, test_block + anchor, 1)


def patch_browser_test(text: str) -> str:
    old = """    await page.goto(`http://127.0.0.1:${port}/newsroom/`);
    for (const [name, value] of [['claim','bounded'],['receipt','limited'],['counterweight','preserve'],['candidate','candidate']]) await page.locator(`input[name="${name}"][value="${value}"]`).check();
    await page.locator('#prove').click();
    assert.match(await page.locator('#proof-result').textContent(), /transfer verified/i);
    await context.close();
"""
    new = """    await page.goto(`http://127.0.0.1:${port}/`);
    await page.locator('#site-search').fill('poof-o2');
    assert.equal(await page.locator('.object:visible').count(), 1);
    await page.locator('#site-search').fill('definitely-not-present');
    assert.equal(await page.locator('[data-filter-item]:visible').count(), 0);
    await page.locator('#site-search').fill('');
    await Promise.all([
      page.waitForURL(`http://127.0.0.1:${port}/newsroom/`),
      page.getByRole('link', { name: 'Use the newsroom desk' }).click()
    ]);
    for (const [name, value] of [['claim','bounded'],['receipt','limited'],['counterweight','preserve'],['candidate','candidate']]) await page.locator(`input[name="${name}"][value="${value}"]`).check();
    await page.locator('#prove').click();
    assert.match(await page.locator('#proof-result').textContent(), /transfer verified/i);
    await page.goto(`http://127.0.0.1:${port}/examination/`);
    await page.locator('#referral-export').click();
    assert.match(await page.locator('#referral-result').textContent(), /not exported/i);
    const validReferral = {
      '#ref-proposition': 'A bounded proposition requiring another record.',
      '#ref-ceiling': 'Candidate only.',
      '#ref-record': 'Acquire the exact decision record.',
      '#ref-route': 'Public-record request and lawful review.',
      '#ref-custodian': 'Evidence desk',
      '#ref-consequence': 'The proposition remains unresolved.',
      '#ref-privacy': 'Exclude personal data not required by the claim.'
    };
    for (const [selector, value] of Object.entries(validReferral)) await page.locator(selector).fill(value);
    const [download] = await Promise.all([page.waitForEvent('download'), page.locator('#referral-export').click()]);
    assert.equal(download.suggestedFilename(), 'poof-referral-packet.json');
    assert.match(await page.locator('#referral-result').textContent(), /validated graph-inert referral/i);
    await context.close();
"""
    return replace_once(text, old, new, "browser regression suite")


def append_change_receipt(path: Path) -> None:
    data = json.loads(path.read_text())
    change_id = "POOF-CONST-2026-07-29-005"
    if any(row.get("change_id") == change_id for row in data.get("changes", [])):
        raise RuntimeError(f"{change_id} already exists")
    data["changes"].append({
        "change_id": change_id,
        "effective_at": "2026-07-29T19:55:00-07:00",
        "protected_paths_touched": [
            "tools/build-poof-clifford-ecology.mjs",
            "tools/validate-poof-clifford-ecology.mjs",
            "test/poof-clifford-ecology.test.js"
        ],
        "affected_invariants": [
            "a typed referral exporter cannot emit an object rejected by its own schema",
            "the advertised jurisdiction-and-object filter covers both classes of card",
            "JSON Schema date-time fields are validated as RFC 3339 rather than host-parser dates",
            "primary entry actions route to their named jurisdictions"
        ],
        "reason": "Repository review found an incorrect positional newsroom route, a filter omission, a schema-invalid empty-form export path, and permissive Date.parse validation.",
        "previous_behavior": [
            "the newsroom action could route to Examination because action targets were positional",
            "object cards remained visible under every filter query",
            "blank and undersized referral fields could be exported as poof-referral-packet@1",
            "date-only values could pass a schema field declared format date-time"
        ],
        "proposed_behavior": [
            "entry actions resolve through explicit label-to-route bindings and fail closed when unmapped",
            "jurisdiction and object cards share the same data-filter-item contract",
            "the browser enforces the referral schema minimum lengths before local export",
            "the validator enforces RFC 3339 syntax and calendar ranges",
            "the browser harness proves newsroom routing, filtering, invalid refusal, and valid referral export"
        ],
        "migration": "Regenerate the staged aperture and release manifest; no stored referral, evidence object, graph edge, or prior release is rewritten.",
        "backward_compatibility": "The changes are predeployment and additive at the interface boundary. Existing valid typed fixtures remain valid; previously emitted invalid local packets receive no authority and are not migrated as evidence.",
        "adversarial_fixtures_added": [
            "date-only value in a date-time field",
            "empty referral export refusal",
            "minimum-length-valid referral export",
            "object-only search filter",
            "named newsroom entry-route navigation"
        ],
        "emergency_override": False,
        "expires_at": None,
        "authority": "repository_change_receipt_below_canonical_evidence",
        "graph_effect": "none"
    })
    path.write_text(json.dumps(data, indent=2) + "\n")


PATCHERS: dict[str, Callable[[str], str]] = {
    "tools/build-poof-clifford-ecology.mjs": patch_builder,
    "tools/validate-poof-clifford-ecology.mjs": patch_validator,
    "test/poof-clifford-ecology.test.js": patch_unit_test,
    "test/poof-clifford-ecology-browser.test.js": patch_browser_test,
}


def apply(root: Path) -> None:
    for relative, patcher in PATCHERS.items():
        path = root / relative
        data = path.read_bytes()
        observed = git_blob_sha(data)
        expected = EXPECTED_GIT_BLOBS[relative]
        if observed != expected:
            raise RuntimeError(f"{relative}: expected Git blob {expected}, observed {observed}")
        original = data.decode()
        patched = patcher(original)
        if patched == original:
            raise RuntimeError(f"{relative}: patch produced no change")
        path.write_text(patched)

    log_path = root / "data/project/poof-clifford-constitutional-change-log.json"
    observed = git_blob_sha(log_path.read_bytes())
    if observed != EXPECTED_GIT_BLOBS[str(log_path.relative_to(root))]:
        raise RuntimeError(f"change log: expected known review-head bytes, observed {observed}")
    append_change_receipt(log_path)


def self_test() -> None:
    sample_builder = """const rootActions = data.aperture.entry_actions.map((label, index) => `<a class=\"button ${index === 0 ? 'primary' : ''}\" href=\"${escapeHtml([relHref('/', '/report/'), relHref('/', '/estate/'), relHref('/', '/newsroom/'), relHref('/', '/examination/'), relHref('/', '/methods/'), relHref('/', '/examination/'), relHref('/', '/machine/')][index])}\">${escapeHtml(label)}</a>`).join('');
const objectCards = data.objects.objects.map((row) => `<article class=\"card object\"><p>${row.object_id}</p></article>`).join('');
const js = `const ref = q('#referral-form'); if (ref) q('#referral-export')?.addEventListener('click', () => { const val=id=>q(id)?.value.trim()||''; const packet={schema_version:'poof-referral-packet@1',x:1}; download('poof-referral-packet.json',packet); });\\n  const search=q('#site-search');`;
const examBody = `${[['ref-proposition','Exact proposition'],['ref-ceiling','Current evidence ceiling'],['ref-record','Required record or test'],['ref-route','Lawful acquisition route']].map(([id,label]) => `<div class=\"field\"><label for=\"${id}\">${label}</label><textarea id=\"${id}\"></textarea></div>`).join('')}${[['ref-custodian','Responsible custodian'],['ref-consequence','Consequence if unresolved'],['ref-privacy','Privacy boundary']].map(([id,label]) => `<div class=\"field\"><label for=\"${id}\">${label}</label><textarea id=\"${id}\"></textarea></div>`).join('')}<button class=\"button primary\" type=\"button\" id=\"referral-export\">Export referral packet</button></div></form>`;
"""
    patched = patch_builder(sample_builder)
    assert "actionRoutes" in patched
    assert "data-filter-item" in patched
    assert "reportValidity" in patched
    assert 'minlength="${minLength}"' in patched
    assert "referral-result" in patched

    sample_validator = """function matchesType(value, type) { return true; }
if (schema.format === 'date-time' && Number.isNaN(Date.parse(value))) fail('invalid date-time');
if (change.emergency_override === true && (!change.expires_at || Number.isNaN(Date.parse(change.expires_at)) || Date.parse(change.expires_at) <= Date.parse(change.effective_at))) fail(`${change.change_id}: unconstitutional emergency override expiry`);
"""
    patched_validator = patch_validator(sample_validator)
    assert "isRfc3339DateTime" in patched_validator
    assert "invalid RFC 3339 date-time" in patched_validator
    print("apply-pr410-review-fixes.py self-test: PASS")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("root", nargs="?", type=Path)
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        self_test()
        return 0
    if args.root is None:
        parser.error("root is required unless --self-test is used")
    apply(args.root.resolve())
    print("PR #410 review fixes applied; regenerate and run the full gates.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
