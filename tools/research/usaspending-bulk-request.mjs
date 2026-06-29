#!/usr/bin/env node
const recipients = process.argv.slice(2).length ? process.argv.slice(2) : [
  'PALANTIR TECHNOLOGIES',
  'SPACEX',
  'GROQ',
  'PSIQUANTUM',
  'OKLO',
  'NEURALINK'
];

const body = {
  filters: {
    recipient_search_text: recipients,
    award_type_codes: ['A', 'B', 'C', 'D']
  },
  columns: [
    'award_id',
    'recipient_name',
    'award_amount',
    'funding_agency_name',
    'awarding_agency_name',
    'period_of_performance_start_date',
    'period_of_performance_current_end_date'
  ],
  file_format: 'csv'
};

const response = await fetch('https://api.usaspending.gov/api/v2/bulk_download/awards/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body)
});

if (!response.ok) {
  console.error(`${response.status} ${response.statusText}: ${await response.text()}`);
  process.exit(1);
}

console.log(JSON.stringify(await response.json(), null, 2));
