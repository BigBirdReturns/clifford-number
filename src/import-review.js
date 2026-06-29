export function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (inQuotes) {
      if (char === '"' && next === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(cell);
      cell = '';
    } else if (char === '\n') {
      row.push(cell);
      if (row.some((value) => value.trim() !== '')) rows.push(row);
      row = [];
      cell = '';
    } else if (char !== '\r') {
      cell += char;
    }
  }
  row.push(cell);
  if (row.some((value) => value.trim() !== '')) rows.push(row);
  return rows;
}

export function parseScheduleIReviewCsv(text) {
  const [header, ...records] = parseCsv(text.trim());
  if (!header) return [];
  const indexes = Object.fromEntries(header.map((name, index) => [name.trim(), index]));
  const required = ['graph_node_id', 'node_label', 'normalized_ein', 'amount', 'purpose'];
  for (const field of required) {
    if (!(field in indexes)) throw new Error(`Missing Schedule I CSV column: ${field}`);
  }
  const recipientIndex = indexes.recipient_name ?? indexes.recipient;
  if (recipientIndex === undefined) throw new Error('Missing Schedule I CSV column: recipient_name');
  return records.map((record) => ({
    graph_node_id: value(record, indexes.graph_node_id),
    node_label: value(record, indexes.node_label),
    normalized_ein: value(record, indexes.normalized_ein),
    recipient_name: value(record, recipientIndex),
    recipient_type: value(record, indexes.recipient_type) || 'organization',
    amount: value(record, indexes.amount),
    purpose: value(record, indexes.purpose),
    source_zip: value(record, indexes.source_zip),
    source_xml: value(record, indexes.source_xml)
  })).filter((record) => record.graph_node_id && record.recipient_name);
}

export function validateScheduleIRows(rows, graph) {
  const nodes = new Map((graph?.nodes ?? []).map((node) => [node.id, node]));
  return rows.map((row) => {
    const errors = [];
    const node = nodes.get(row.graph_node_id);
    if (!node) {
      errors.push(`Unknown graph_node_id: ${row.graph_node_id}`);
    }
    if (!/^\d{9}$/.test(row.normalized_ein)) {
      errors.push(`Invalid normalized_ein: ${row.normalized_ein}`);
    }
    const graphEin = String(node?.identifiers?.ein ?? '').replace(/\D/g, '');
    if (node && graphEin && graphEin !== row.normalized_ein) {
      errors.push(`EIN mismatch for ${row.graph_node_id}: CSV ${row.normalized_ein} vs graph ${graphEin}`);
    }
    return { ...row, valid: errors.length === 0, errors };
  });
}

export function scheduleIRowToAddEdgeCommand(row, options = {}) {
  const recipientId = options.recipientId ?? slugify(row.recipient_name);
  const sourceId = options.sourceId ?? 's-propublica';
  const amount = row.amount ? ` amount=${row.amount}` : '';
  const purpose = row.purpose ? ` purpose=${quote(row.purpose)}` : '';
  const provenance = [row.source_zip, row.source_xml].filter(Boolean).join('/');
  const notes = [`Schedule I review row.${amount}${purpose}`, provenance ? `source=${provenance}` : '']
    .filter(Boolean)
    .join(' ');
  return [
    'node tools/add-edge.mjs graph.json',
    `--from ${quote(row.graph_node_id)}`,
    `--to ${quote(recipientId)}`,
    `--to-label ${quote(row.recipient_name)}`,
    `--to-type ${quote(row.recipient_type || 'organization')}`,
    '--type granted-to',
    `--claim ${quote(`${row.node_label} reported a Schedule I grant to ${row.recipient_name}.`)}`,
    `--source ${quote(sourceId)}`,
    '--evidence primary_public',
    '--status reported',
    '--weight 2',
    `--notes ${quote(notes)}`
  ].join(' ');
}

export function slugify(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'schedule-i-recipient';
}

function value(record, index) {
  return index === undefined ? '' : String(record[index] ?? '').trim();
}

function quote(value) {
  return JSON.stringify(String(value ?? ''));
}
