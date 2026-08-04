#!/usr/bin/env python3
import datetime as dt
import hashlib
import html
import json
import os
import pathlib
import re
import subprocess
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from urllib.parse import urlparse

root = pathlib.Path(os.environ['CENSUS_ROOT'])
plan = json.loads((root / 'plan.json').read_text())
results = json.loads((root / 'route-results.json').read_text())
official_hosts = set(plan['protocol']['official_candidate_hosts'])
first_party_hosts = set(plan['protocol']['first_party_candidate_hosts'])
by_route = {row['route_id']: row for row in results['routes']}

class TextParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.text = []
        self.suppressed = 0
    def handle_starttag(self, tag, attrs):
        if tag.lower() in {'script', 'style', 'noscript', 'svg'}:
            self.suppressed += 1
    def handle_endtag(self, tag):
        if tag.lower() in {'script', 'style', 'noscript', 'svg'} and self.suppressed:
            self.suppressed -= 1
    def handle_data(self, data):
        if not self.suppressed:
            self.text.append(data)

def normalize(value):
    return re.sub(r'\s+', ' ', value).strip()

def selected_body(receipt):
    selected = receipt['attempts'][receipt['selected_attempt'] - 1]
    path = root / selected['body_path']
    return selected, path, path.read_bytes() if path.exists() else b''

def text_from_body(selected, path, raw):
    if not raw:
        return ''
    content_type = (selected.get('content_type') or '').lower()
    if 'pdf' in content_type or raw.startswith(b'%PDF'):
        out = path.with_suffix('.txt')
        proc = subprocess.run(['pdftotext', str(path), str(out)], stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False)
        if proc.returncode == 0 and out.exists():
            return normalize(out.read_text(errors='replace'))
    decoded = raw.decode('utf-8', errors='replace')
    if 'json' in content_type or decoded.lstrip().startswith(('{', '[')):
        try:
            return normalize(json.dumps(json.loads(decoded), sort_keys=True))
        except Exception:
            pass
    parser = TextParser()
    try:
        parser.feed(decoded)
        parsed = normalize(html.unescape(' '.join(parser.text)))
        if parsed:
            return parsed
    except Exception:
        pass
    return normalize(re.sub(r'<[^>]+>', ' ', decoded))

marker_patterns = {
    'amount_150m': [r'\$?\s*150\s+million', r'\$150,?000,?000'],
    'amount_620m': [r'\$?\s*620\s+million', r'\$620,?000,?000'],
    'amount_80m': [r'\$?\s*80\s+million', r'\$80,?000,?000'],
    'amount_500m': [r'\$?\s*500\s+million', r'\$500,?000,?000'],
    'amount_725m': [r'\$?\s*725\s+million', r'\$725,?000,?000'],
    'interest_5_38': [r'5\.38\s*(?:percent|%)'],
    'maturity_august_1_2037': [r'august\s+1,\s+2037'],
    'twenty_year_tenor': [r'20[- ]year', r'twenty[- ]year'],
    'unsecured_note': [r'unsecured\s+promissory\s+note', r'unsecured\s+note'],
    'quarterly_cash_interest': [r'interest.{0,80}quarterly', r'quarterly.{0,80}interest'],
    'conditional_commitment': [r'conditional\s+(?:loan\s+)?commitment'],
    'financial_close': [r'financial\s+close'],
    'due_diligence': [r'due[\s-]+diligence'],
    'no_disbursement_until_conditions': [r'no\s+.*funds?.{0,100}disburs', r'not\s+disburs.{0,100}conditions'],
    'warrant': [r'\bwarrant(?:s|ed)?\b'],
    'preferred_equity': [r'preferred\s+(?:stock|equity)'],
    'price_protection': [r'price\s+protection'],
    'offtake': [r'\bofftake\b'],
    'security_or_collateral': [r'\bcollateral\b', r'\bsecured\b', r'\bsecurity\s+interest\b'],
    'seniority_or_subordination': [r'\bsenior(?:ity)?\b', r'\bsubordinat(?:e|ed|ion)\b'],
    'covenant': [r'\bcovenant(?:s)?\b'],
    'milestone': [r'\bmilestone(?:s)?\b'],
    'reporting_or_inspection': [r'\breporting\b', r'\binspection\b', r'information\s+rights?'],
    'amendment_or_waiver': [r'\bamendment(?:s)?\b', r'\bwaiver(?:s)?\b'],
    'default_or_cure': [r'\bdefault\b', r'\bcure\b'],
    'acceleration_or_enforcement': [r'\bacceleration\b', r'\benforcement\b'],
    'fee_or_discount': [r'\bfee(?:s)?\b', r'\bdiscount\b'],
}

def markers(text):
    lower = text.lower()
    return {
        name: any(re.search(pattern, lower, flags=re.S) for pattern in patterns)
        for name, patterns in marker_patterns.items()
    }

candidates = []
route_index = []
exact_evidence = []
instrument_aggregate = {
    instrument_id: {
        'instrument_id': instrument_id,
        'fixed_route_ids': [],
        'exact_route_ids': [],
        'discovery_route_ids': [],
        'transport_terminal': True,
        'marker_routes': {name: [] for name in marker_patterns},
    }
    for instrument_id in plan['frozen_object_denominator']['instrument_ids']
}

for route in plan['routes']:
    receipt = by_route[route['route_id']]
    selected, body_path, raw = selected_body(receipt)
    for instrument_id in route['instrument_ids']:
        agg = instrument_aggregate[instrument_id]
        agg['fixed_route_ids'].append(route['route_id'])
        if route['route_kind'] == 'exact_get':
            agg['exact_route_ids'].append(route['route_id'])
        else:
            agg['discovery_route_ids'].append(route['route_id'])
        if not receipt['transport_terminal']:
            agg['transport_terminal'] = False

    if route['route_kind'] == 'bing_rss':
        items = []
        if raw:
            try:
                xml_root = ET.fromstring(raw)
                for position, item in enumerate(xml_root.findall('.//item')[:10], start=1):
                    title = normalize(item.findtext('title') or '')
                    link = normalize(item.findtext('link') or '')
                    description = normalize(item.findtext('description') or '')
                    host = (urlparse(link).hostname or '').lower()
                    official = host in official_hosts or host.endswith('.gov') or host.endswith('.mil')
                    first_party = host in first_party_hosts
                    row = {
                        'route_id': route['route_id'],
                        'position': position,
                        'title': title,
                        'url': link,
                        'description': description,
                        'normalized_host': host,
                        'official_host_candidate': official,
                        'first_party_candidate': first_party,
                        'instrument_ids': route['instrument_ids'],
                        'clusters': route['clusters'],
                        'term_adjudication': 'not_performed_by_transport_census',
                        'source_admitted': False,
                        'result_spawned_request': False,
                    }
                    items.append(row)
                    candidates.append(row)
            except ET.ParseError:
                pass
        route_index.append({
            'route_id': route['route_id'],
            'route_kind': route['route_kind'],
            'terminal_transport_state': receipt['terminal_transport_state'],
            'selected_http_status': selected['http_status'],
            'ordered_results': len(items),
            'official_host_candidates': sum(1 for row in items if row['official_host_candidate']),
            'first_party_candidates': sum(1 for row in items if row['first_party_candidate']),
            'result_spawned_requests': 0,
        })
        continue

    text = text_from_body(selected, body_path, raw)
    text_path = body_path.with_name('body.txt')
    text_path.write_text(text + ('\n' if text else ''))
    observed_markers = markers(text)
    for instrument_id in route['instrument_ids']:
        for name, value in observed_markers.items():
            if value:
                instrument_aggregate[instrument_id]['marker_routes'][name].append(route['route_id'])
    exact_evidence.append({
        'route_id': route['route_id'],
        'source_id': route.get('source_id'),
        'instrument_ids': route['instrument_ids'],
        'terminal_transport_state': receipt['terminal_transport_state'],
        'selected_http_status': selected['http_status'],
        'final_url': selected['final_url'],
        'content_type': selected['content_type'],
        'body_bytes': selected['body_bytes'],
        'body_sha256': selected['body_sha256'],
        'normalized_text_path': str(text_path.relative_to(root)),
        'normalized_text_characters': len(text),
        'markers': observed_markers,
        'substantive_term_adjudication': 'not_performed_by_transport_census',
    })
    route_index.append({
        'route_id': route['route_id'],
        'route_kind': route['route_kind'],
        'source_id': route.get('source_id'),
        'terminal_transport_state': receipt['terminal_transport_state'],
        'selected_http_status': selected['http_status'],
        'text_characters': len(text),
        'marker_count': sum(observed_markers.values()),
        'result_spawned_requests': 0,
    })

candidate_urls = sorted({row['url'] for row in candidates if row['url']})
official_candidate_urls = sorted({row['url'] for row in candidates if row['url'] and row['official_host_candidate']})
first_party_candidate_urls = sorted({row['url'] for row in candidates if row['url'] and row['first_party_candidate']})

for aggregate in instrument_aggregate.values():
    aggregate['marker_routes'] = {
        key: sorted(value) for key, value in aggregate['marker_routes'].items() if value
    }
    aggregate['fixed_protocol_complete'] = aggregate['transport_terminal']
    aggregate['substantive_negotiated_term_adjudication'] = 'pending'
    aggregate['instrument_closed_by_this_census'] = False

(root / 'candidate-index.json').write_text(json.dumps({
    'schema_version': 'ssc-rd03-wave02-public-record-candidate-index@1',
    'candidate_rows': len(candidates),
    'unique_candidate_urls': len(candidate_urls),
    'official_candidate_urls': len(official_candidate_urls),
    'first_party_candidate_urls': len(first_party_candidate_urls),
    'rows': candidates,
    'authority': {
        'candidate_hit_is_governing_instrument': False,
        'search_result_is_term_evidence': False,
        'result_spawned_requests': 0,
        'substantive_adjudication_complete': False,
    },
}, indent=2) + '\n')

(root / 'candidate-url-ledger.json').write_text(json.dumps({
    'schema_version': 'ssc-rd03-wave02-candidate-url-ledger@1',
    'official_urls': official_candidate_urls,
    'first_party_urls': first_party_candidate_urls,
    'official_count': len(official_candidate_urls),
    'first_party_count': len(first_party_candidate_urls),
    'admitted_sources': 0,
    'followup_requests_executed': 0,
}, indent=2) + '\n')

(root / 'route-index.json').write_text(json.dumps({
    'schema_version': 'ssc-rd03-wave02-public-record-route-index@1',
    'routes': route_index,
}, indent=2) + '\n')

(root / 'term-evidence-index.json').write_text(json.dumps({
    'schema_version': 'ssc-rd03-wave02-term-evidence-index@1',
    'exact_routes': exact_evidence,
    'marker_vocabulary': sorted(marker_patterns),
    'authority': {
        'marker_is_adjudicated_term': False,
        'text_match_is_complete_agreement': False,
        'announcement_is_executed_instrument': False,
        'substantive_adjudication_complete': False,
    },
}, indent=2) + '\n')

(root / 'instrument-protocol-ledger.json').write_text(json.dumps({
    'schema_version': 'ssc-rd03-wave02-instrument-protocol-ledger@1',
    'instruments': list(instrument_aggregate.values()),
    'instrument_count': len(instrument_aggregate),
    'transport_census_complete': all(row['transport_terminal'] for row in instrument_aggregate.values()),
    'substantive_adjudication_complete': False,
    'class_closed': False,
}, indent=2) + '\n')

states = {}
attempts = 0
for receipt in results['routes']:
    states[receipt['terminal_transport_state']] = states.get(receipt['terminal_transport_state'], 0) + 1
    attempts += len(receipt['attempts'])

summary = {
    'schema_version': 'ssc-rd03-wave02-public-record-census-summary@1',
    'as_of': dt.datetime.now(dt.timezone.utc).date().isoformat(),
    'research_head': plan['research_head'],
    'instruments': 5,
    'executed_and_disbursed_parent_states': 1,
    'conditional_pre_close_parent_states': 4,
    'fixed_routes': len(plan['routes']),
    'exact_get_routes': sum(row['route_kind'] == 'exact_get' for row in plan['routes']),
    'bing_rss_routes': sum(row['route_kind'] == 'bing_rss' for row in plan['routes']),
    'route_attempts': attempts,
    'terminal_transport_states': states,
    'candidate_rows': len(candidates),
    'unique_candidate_urls': len(candidate_urls),
    'official_candidate_urls': len(official_candidate_urls),
    'first_party_candidate_urls': len(first_party_candidate_urls),
    'result_spawned_requests': 0,
    'transport_census_complete': all(row['transport_terminal'] for row in instrument_aggregate.values()),
    'substantive_adjudication_complete': False,
    'terminally_classified_instruments': 0,
    'class_closed': False,
    'external_contacts': 0,
    'external_reviews': 0,
    'outside_human_dependency': False,
    'favoritism_finding': False,
    'extraction_finding': False,
    'public_recovery_finding': False,
    'coordination_finding': False,
    'common_purpose_finding': False,
    'publication_effect': 'none',
    'adoption_effect': 'none',
    'graph_effect': 'none',
}
(root / 'summary.json').write_text(json.dumps(summary, indent=2) + '\n')

def digest(path):
    h = hashlib.sha256()
    with path.open('rb') as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()

entries = []
for file_path in sorted(path for path in root.rglob('*') if path.is_file() and path.name != 'manifest.json'):
    entries.append({
        'path': str(file_path.relative_to(root)),
        'bytes': file_path.stat().st_size,
        'sha256': digest(file_path),
    })
combined = hashlib.sha256('\n'.join(f"{row['sha256']}  {row['path']}" for row in entries).encode()).hexdigest()
(root / 'manifest.json').write_text(json.dumps({
    'schema_version': 'ssc-rd03-wave02-public-record-census-manifest@1',
    'entries': entries,
    'entry_count': len(entries),
    'combined_sha256': combined,
}, indent=2) + '\n')
print(json.dumps(summary, indent=2))
