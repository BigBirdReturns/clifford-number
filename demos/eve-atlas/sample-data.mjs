import { periodBounds } from './demo-core.mjs';

function actor(id, label) {
  return { id, label, type: 'person' };
}

function participant(actorId, role, participationType, evidenceClass, timeStart = '', timeEnd = '', receiptIds = []) {
  return {
    participant_type: 'actor',
    actor_id: actorId,
    role,
    participation_type: participationType,
    evidence_class: evidenceClass,
    time_start: timeStart,
    time_end: timeEnd,
    receipt_ids: receiptIds
  };
}

function surface({ id, label, type, clusterTypes = [], hopEligible = true, start = '', end = '', participants = [], receipts = [], notes = '' }) {
  return {
    surface_id: id,
    surface_label: label,
    surface_type: type,
    secondary_surface_types: clusterTypes,
    hop_eligible: hopEligible,
    scorable: true,
    time_start: start,
    time_end: end,
    receipt_ids: receipts,
    bounded_by: ['demo fixture'],
    notes,
    participants: participants.map(item => ({ ...item, surface_id: id }))
  };
}

function bounds(value, side) {
  const period = periodBounds(value);
  return period?.[side] ?? null;
}

function later(...values) {
  return values.filter(Boolean).sort().at(-1) ?? null;
}

function earlier(...values) {
  return values.filter(Boolean).sort()[0] ?? null;
}

function deriveHopGraph(surfaceGraph, anchorActorId) {
  const edgeMap = new Map();
  const rejected = [];
  for (const item of surfaceGraph.surfaces) {
    if (!item.hop_eligible) continue;
    const actors = item.participants.filter(row => row.participant_type === 'actor');
    for (let left = 0; left < actors.length; left += 1) {
      for (let right = left + 1; right < actors.length; right += 1) {
        const first = actors[left];
        const second = actors[right];
        const dated = Boolean(first.time_start && second.time_start && item.time_start);
        let validFrom = null;
        let validUntil = null;
        if (dated) {
          validFrom = later(bounds(item.time_start, 'start'), bounds(first.time_start, 'start'), bounds(second.time_start, 'start'));
          validUntil = earlier(bounds(item.time_end, 'end'), bounds(first.time_end, 'end'), bounds(second.time_end, 'end'));
          if (validFrom && validUntil && validFrom > validUntil) {
            rejected.push({
              actor_a: first.actor_id,
              actor_b: second.actor_id,
              surface_id: item.surface_id,
              surface_label: item.surface_label,
              reason: 'disjoint participation windows',
              publication_status: 'verified'
            });
            continue;
          }
        }
        const [actorA, actorB] = [first.actor_id, second.actor_id].sort();
        const key = `${actorA}||${actorB}`;
        if (!edgeMap.has(key)) edgeMap.set(key, { actor_a: actorA, actor_b: actorB, surfaces: [] });
        const roleA = actorA === first.actor_id ? first.role : second.role;
        const roleB = actorB === second.actor_id ? second.role : first.role;
        edgeMap.get(key).surfaces.push({
          surface_id: item.surface_id,
          surface_label: item.surface_label,
          surface_type: item.surface_type,
          secondary_surface_types: item.secondary_surface_types,
          actor_a_role: roleA,
          actor_b_role: roleB,
          evidence_class: [first.evidence_class, second.evidence_class].sort((a, b) => {
            const order = { official: 0, primary_public: 1, reported: 2, derived: 3, judgment: 4, open: 5 };
            return (order[b] ?? 5) - (order[a] ?? 5);
          })[0],
          receipt_ids: [...new Set([...item.receipt_ids, ...first.receipt_ids, ...second.receipt_ids])],
          valid_from: dated ? validFrom : null,
          valid_until: dated ? validUntil : null,
          temporal_status: dated ? 'dated' : 'undated'
        });
      }
    }
  }
  return {
    generated: new Date().toISOString(),
    anchor_actor_id: anchorActorId,
    rule: 'Demo fixture: actor hops derive from shared bounded surfaces.',
    edges: [...edgeMap.values()],
    rejected_hop_pairs: rejected,
    shortest_paths: {}
  };
}

export function sampleData() {
  const baseActors = [
    actor('matt-clifford', 'Matt Clifford'),
    actor('ben-warner', 'Ben Warner'),
    actor('alex-cooper', 'Alex Cooper'),
    actor('dominic-cummings', 'Dominic Cummings'),
    actor('laura-gilbert', 'Laura Gilbert'),
    actor('dan-rosenfield', 'Dan Rosenfield'),
    actor('marc-warner', 'Marc Warner'),
    actor('saul-klein', 'Saul Klein'),
    actor('keir-starmer', 'Keir Starmer'),
    actor('fiona-hill', 'Fiona Hill'),
    actor('peter-thiel', 'Peter Thiel'),
    actor('shmuel-abramzon', 'Shmuel Abramzon'),
    actor('dan-driscoll', 'Dan Driscoll'),
    actor('randy-kroszner', 'Randy Kroszner')
  ];
  const rosterActors = Array.from({ length: 28 }, (_, index) => actor(`directory-person-${index + 1}`, `Directory Person ${String(index + 1).padStart(2, '0')}`));
  const actors = [...baseActors, ...rosterActors];

  const surfaces = [
    surface({
      id: 'no10-digital-data-advisory-2019-2021',
      label: 'No. 10 digital and data advisory surface, 2019–2021',
      type: 'government_advisory_surface',
      clusterTypes: ['model_governance_surface'],
      start: '2019-12', end: '2021-05',
      receipts: ['official-no10-ben-warner', 'warner-surface-audit'],
      participants: [
        participant('ben-warner', 'Chief Adviser on Digital and Data', 'government_adviser', 'official', '2019-12', '2021-05', ['official-no10-ben-warner']),
        participant('dominic-cummings', 'Senior adviser', 'government_adviser', 'judgment', '2019', '2020', ['warner-surface-audit']),
        participant('laura-gilbert', 'Civil service data lead', 'government_data_lead', 'official', '2020', '2021', ['warner-surface-audit']),
        participant('dan-rosenfield', 'Chief of Staff context', 'government_official', 'judgment', '2021', '2021', ['warner-surface-audit'])
      ]
    }),
    surface({
      id: 'faculty-employment-investment-2015-2019',
      label: 'Faculty employment and investment surface, 2015–2019',
      type: 'employment_investment_surface',
      clusterTypes: ['public_private_ai_infrastructure'],
      start: '2015', end: '2019',
      receipts: ['faculty-record', 'guardian-faculty'],
      participants: [
        participant('ben-warner', 'Principal and data scientist', 'employee', 'official', '2015', '2019', ['faculty-record']),
        participant('marc-warner', 'CEO and co-founder', 'founder_officer', 'primary_public', '2014', '2026', ['faculty-record']),
        participant('saul-klein', 'Reported investor', 'investor', 'reported', '', '', ['guardian-faculty'])
      ]
    }),
    surface({
      id: 'vote-leave-data-science-2016',
      label: 'Vote Leave data science surface, 2016',
      type: 'campaign_surface',
      clusterTypes: ['model_governance_surface'],
      start: '2016', end: '2016',
      receipts: ['campaign-report'],
      participants: [
        participant('ben-warner', 'Data scientist', 'data_science_operator', 'reported', '2016', '2016', ['campaign-report']),
        participant('marc-warner', 'Vendor officer', 'vendor_officer', 'reported', '2016', '2016', ['campaign-report']),
        participant('dominic-cummings', 'Campaign director', 'campaign_director', 'official', '2016', '2016', ['campaign-report'])
      ]
    }),
    surface({
      id: 'electric-twin-founder-2023',
      label: 'Electric Twin founder and officer surface, 2023–present',
      type: 'founder_officer_surface',
      clusterTypes: ['model_governance_surface'],
      start: '2023-09', end: '',
      receipts: ['companies-house-electric-twin'],
      participants: [
        participant('ben-warner', 'Co-founder and Chief Data Scientist', 'founder_officer', 'primary_public', '2023-09', '', ['companies-house-electric-twin']),
        participant('alex-cooper', 'Co-founder and CEO', 'founder_officer', 'primary_public', '2023-09', '', ['companies-house-electric-twin'])
      ]
    }),
    surface({
      id: 'founders-policy-forum-2024',
      label: 'Founders policy forum working group, 2024',
      type: 'bounded_forum_surface',
      clusterTypes: ['policy_formation_surface'],
      start: '2024', end: '2024',
      receipts: ['forum-programme'],
      participants: [
        participant('alex-cooper', 'Founder participant', 'attendee', 'primary_public', '2024', '2024', ['forum-programme']),
        participant('matt-clifford', 'Working-group chair', 'chair', 'official', '2024', '2024', ['forum-programme']),
        participant('fiona-hill', 'Policy participant', 'attendee', 'reported', '2024', '2024', ['forum-programme'])
      ]
    }),
    surface({
      id: 'ai-opportunities-action-plan-2024-2025',
      label: 'AI Opportunities Action Plan authorship and adoption surface',
      type: 'policy_authorship_surface',
      clusterTypes: ['government_policy_surface'],
      start: '2024-07', end: '2025-01',
      receipts: ['gov-ai-action-plan', 'gov-clifford-commission'],
      participants: [
        participant('matt-clifford', 'Commissioned lead author', 'policy_author', 'official', '2024-07', '2025-01', ['gov-clifford-commission']),
        participant('keir-starmer', 'Prime Minister adopting the plan', 'government_principal', 'official', '2025-01', '2025-01', ['gov-ai-action-plan']),
        participant('shmuel-abramzon', 'Treasury policy official', 'government_official', 'primary_public', '2024', '2025', ['gov-ai-action-plan'])
      ]
    }),
    surface({
      id: 'defense-innovation-council-2025',
      label: 'Defence innovation council cohort, 2025',
      type: 'defense_advisory_surface',
      clusterTypes: ['procurement_surface'],
      start: '2025', end: '2025',
      receipts: ['defense-council-record'],
      participants: [
        participant('alex-cooper', 'Technology adviser', 'adviser', 'reported', '2025', '2025', ['defense-council-record']),
        participant('dan-driscoll', 'Public official', 'government_official', 'official', '2025', '2025', ['defense-council-record']),
        participant('peter-thiel', 'Investor participant', 'investor', 'reported', '2025', '2025', ['defense-council-record'])
      ]
    }),
    surface({
      id: 'dialog-public-directory-2026',
      label: 'Dialog public directory roster, 2026',
      type: 'public_directory_surface',
      clusterTypes: ['dense_roster_surface'],
      hopEligible: false,
      start: '2026', end: '2026',
      receipts: ['dialog-html-source'],
      notes: 'Dense roster fixture. It remains context-only and never manufactures pairwise actor hops.',
      participants: [
        participant('matt-clifford', 'Listed in public directory', 'listed', 'primary_public', '2026', '2026', ['dialog-html-source']),
        participant('peter-thiel', 'Listed in public directory', 'listed', 'primary_public', '2026', '2026', ['dialog-html-source']),
        participant('randy-kroszner', 'Listed in public directory', 'listed', 'primary_public', '2026', '2026', ['dialog-html-source']),
        ...rosterActors.map((item, index) => participant(
          item.id,
          index % 5 === 0 ? 'Public official listed in directory' : index % 3 === 0 ? 'Company leader listed in directory' : 'Listed in public directory',
          index % 5 === 0 ? 'government_official' : index % 3 === 0 ? 'founder_officer' : 'listed',
          index % 7 === 0 ? 'reported' : 'primary_public',
          '2026', '2026', ['dialog-html-source']
        ))
      ]
    }),
    surface({
      id: 'no10-chief-adviser-continuity-2019-2022',
      label: 'No. 10 chief-adviser continuity context, 2019–2022',
      type: 'government_continuity_surface',
      clusterTypes: ['context_only_surface'],
      start: '2019', end: '2022',
      receipts: ['continuity-record'],
      participants: [
        participant('dominic-cummings', 'Senior adviser', 'government_adviser', 'official', '2019', '2020', ['continuity-record']),
        participant('dan-rosenfield', 'Chief of Staff', 'government_official', 'official', '2021', '2022', ['continuity-record'])
      ]
    })
  ];

  const surfaceGraph = {
    generated: new Date().toISOString(),
    actors,
    organizations: [
      { id: 'no10', label: 'No. 10 Downing Street' },
      { id: 'faculty', label: 'Faculty' },
      { id: 'electric-twin', label: 'Electric Twin' },
      { id: 'dialog', label: 'Dialog' }
    ],
    aliases: [],
    candidates: [],
    surfaces
  };

  const hopGraph = deriveHopGraph(surfaceGraph, 'matt-clifford');
  const receipts = [...new Set(surfaces.flatMap(item => item.receipt_ids))].map((receiptId, index) => ({
    receipt_id: receiptId,
    label: receiptId.replace(/-/g, ' '),
    evidence_class: index % 4 === 0 ? 'official' : 'primary_public',
    archive: index % 5 === 0 ? {} : { ref: `archive-${receiptId}` }
  }));

  return {
    source: 'embedded fixture',
    surfaceGraph,
    hopGraph,
    receiptGraph: { receipts }
  };
}
