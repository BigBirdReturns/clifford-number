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
allowed_hosts = set(plan['protocol']['official_candidate_hosts'])
by_route = {row['route_id']: row for row in results['routes']}

class TextParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.text = []
        self.suppressed = 0
    def handle_starttag(self, tag, attrs):
        if tag.lower() in {'script', 'style', 'noscript'}:
            self.suppressed += 1
    def handle_endtag(self, tag):
        if tag.lower() in {'script', 'style', 'noscript'} and self.suppressed:
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
    parser = TextParser()
    try:
        parser.feed(decoded)
        return normalize(html.unescape(' '.join(parser.text)))
    except Exception:
        return normalize(re.sub(r'<[^>]+>', ' ', decoded))

candidates = []
route_index = []
exact_text = {}
for route in plan['routes']:
    receipt = by_route[route['route_id']]
    selected, body_path, raw = selected_body(receipt)
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
                    official = host in allowed_hosts or host.endswith('.gov') or host.endswith('.mil')
                    row = {
                        'route_id': route['route_id'],
                        'position': position,
                        'title': title,
                        'url': link,
                        'description': description,
                        'normalized_host': host,
                        'official_host_candidate': official,
                        'clusters': route['clusters'],
                        'identity_or_team_adjudication': 'not_performed_by_transport_census',
                        'denominator_admitted': False,
                    }
                    items.append(row)
                    candidates.append(row)
            except ET.ParseError:
                pass
        route_index.append({
            'route_id': route['route_id'],
            'route_kind': route['route_kind'],
            'terminal_transport_state': receipt['terminal_transport_state'],
            'ordered_results': len(items),
            'official_host_candidates': sum(1 for row in items if row['official_host_candidate']),
        })
    else:
        text = text_from_body(selected, body_path, raw)
        exact_text[route['route_id']] = text
        lower = text.lower()
        route_index.append({
            'route_id': route['route_id'],
            'route_kind': route['route_kind'],
            'terminal_transport_state': receipt['terminal_transport_state'],
            'text_characters': len(text),
            'contains_solicitation_number': 'w56kgy-17-r-0026' in lower or 'w56kgy17r0026' in lower,
            'contains_eight_proposal_or_bid_denominator': 'eight offerors' in lower or 'eight proposals' in lower or 'eight received' in lower or 'eight bids' in lower,
            'contains_protective_order': 'protective order' in lower,
            'contains_redacted_public_release': 'redacted version' in lower or 'approved for public release' in lower,
            'contains_source_selection_record_reference': 'source selection' in lower or 'source selection decision document' in lower,
            'contains_named_raytheon': 'raytheon' in lower,
            'contains_named_palantir': 'palantir' in lower,
            'contains_named_general_dynamics': 'general dynamics' in lower or 'gdms' in lower,
        })

candidate_urls = sorted({row['url'] for row in candidates if row['url']})
official_candidate_urls = sorted({row['url'] for row in candidates if row['url'] and row['official_host_candidate']})
known_names = ['raytheon', 'palantir', 'general dynamics', 'gdms', 'geosuite']
candidate_text = '\n'.join(f"{row['title']} {row['description']} {row['url']}" for row in candidates).lower()
candidate_name_mentions = {name: candidate_text.count(name) for name in known_names}

gao_text = exact_text.get('RD06-CENSUS-R001', '').lower()
restriction = {
    'schema_version': 'ssc-rd06-wave02-public-record-restriction-ledger@1',
    'gao_route_id': 'RD06-CENSUS-R001',
    'protective_order_observed': 'protective order' in gao_text,
    'redacted_public_release_observed': 'redacted version' in gao_text or 'approved for public release' in gao_text,
    'eight_proposals_observed': 'eight offerors' in gao_text or 'eight proposals' in gao_text,
    'three_named_offerors_observed': all(name in gao_text for name in ['raytheon', 'palantir', 'general dynamics']),
    'source_selection_materials_cited_but_not_attached': all(marker in gao_text for marker in ['source selection decision document', 'agency report']),
    'five_unnamed_slots_are_proven_nonexistent': False,
    'restriction_is_nonresponsiveness_or_withdrawal': False,
    'substantive_identity_adjudication_complete': False,
}
(root / 'restriction-ledger.json').write_text(json.dumps(restriction, indent=2) + '\n')

slot_rows = []
for slot_id in plan['frozen_object_denominator']['slot_ids']:
    named = slot_id.startswith('CD1-PROP-NAMED-')
    slot_rows.append({
        'slot_id': slot_id,
        'fixed_route_ids': [row['route_id'] for row in plan['routes'] if 'ALL_SLOTS' in row['clusters'] or ('UNRESOLVED_SLOTS' in row['clusters'] and not named)],
        'transport_protocol_terminal': True,
        'identity_and_disposition_previously_terminal': named,
        'fixed_public_record_census_complete': True,
        'substantive_identity_team_and_disposition_adjudication': 'pending',
        'terminal_slot_state': 'prior_named_state_preserved' if named else 'still_open_pending_adjudication',
        'candidate_hit_is_identity': False,
        'class_closed_by_this_census': False,
    })

(root / 'candidate-index.json').write_text(json.dumps({
    'schema_version': 'ssc-rd06-wave02-public-record-candidate-index@1',
    'candidate_rows': len(candidates),
    'unique_candidate_urls': len(candidate_urls),
    'official_candidate_urls': len(official_candidate_urls),
    'candidate_name_mentions': candidate_name_mentions,
    'rows': candidates,
    'authority': {
        'candidate_hit_is_offeror_identity': False,
        'search_result_is_denominator_admission': False,
        'result_spawned_requests': 0,
        'substantive_adjudication_complete': False,
    },
}, indent=2) + '\n')
(root / 'official-candidate-urls.json').write_text(json.dumps({
    'schema_version': 'ssc-rd06-wave02-official-candidate-url-ledger@1',
    'urls': official_candidate_urls,
    'count': len(official_candidate_urls),
    'admitted_into_offeror_denominator': 0,
    'followup_requests_executed': 0,
}, indent=2) + '\n')
(root / 'route-index.json').write_text(json.dumps({
    'schema_version': 'ssc-rd06-wave02-public-record-route-index@1',
    'routes': route_index,
}, indent=2) + '\n')
(root / 'slot-terminal-ledger.json').write_text(json.dumps({
    'schema_version': 'ssc-rd06-wave02-public-record-slot-ledger@1',
    'proposal_slots': 8,
    'named_slots': 3,
    'unresolved_slots': 5,
    'slots': slot_rows,
    'transport_census_complete': True,
    'substantive_adjudication_complete': False,
    'class_closed': False,
}, indent=2) + '\n')

states = {}
attempts = 0
for receipt in results['routes']:
    states[receipt['terminal_transport_state']] = states.get(receipt['terminal_transport_state'], 0) + 1
    attempts += len(receipt['attempts'])
summary = {
    'schema_version': 'ssc-rd06-wave02-public-record-census-summary@1',
    'as_of': dt.datetime.now(dt.timezone.utc).date().isoformat(),
    'research_head': plan['research_head'],
    'proposal_slots': 8,
    'named_offeror_slots': 3,
    'unresolved_identity_slots': 5,
    'fixed_routes': len(plan['routes']),
    'exact_get_routes': sum(row['route_kind'] == 'exact_get' for row in plan['routes']),
    'bing_rss_routes': sum(row['route_kind'] == 'bing_rss' for row in plan['routes']),
    'route_attempts': attempts,
    'terminal_transport_states': states,
    'candidate_rows': len(candidates),
    'unique_candidate_urls': len(candidate_urls),
    'official_candidate_urls': len(official_candidate_urls),
    'result_spawned_requests': 0,
    'transport_census_complete': True,
    'substantive_adjudication_complete': False,
    'unresolved_slots_terminally_classified': 0,
    'class_closed': False,
    'external_contacts': 0,
    'external_reviews': 0,
    'outside_human_dependency': False,
    'technical_superiority_finding': False,
    'favoritism_finding': False,
    'foreclosure_finding': False,
    'coordination_finding': False,
    'common_purpose_finding': False,
    'publication_effect': 'none',
    'adoption_effect': 'none',
    'graph_effect': 'none',
}
(root / 'summary.json').write_text(json.dumps(summary, indent=2) + '\n')

def digest(path):
    h = hashlib.sha256()
    with open(path, 'rb') as handle:
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
    'schema_version': 'ssc-rd06-wave02-public-record-census-manifest@1',
    'entries': entries,
    'entry_count': len(entries),
    'combined_sha256': combined,
}, indent=2) + '\n')
print(json.dumps(summary, indent=2))
