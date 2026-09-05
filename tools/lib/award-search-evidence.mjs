/**
 * Diagnostics for award-search responses, not a fiscal-obligation verifier.
 * A returned award amount is not, by itself, the sum of signed transactions
 * within the period, agency, recipient and programme named by a trade summary.
 */
const normalize = value => String(value ?? '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();

function numericAmount(value) {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : null;
}

/**
 * Preserve legacy diagnostic counts without allowing matches on different
 * rows, generic programme words, or an award total to become verification.
 * @param {Array<object>} rows Normalized rows emitted by the acquisition tool.
 * @param {{reported_amount: number, reported_program: string}} lead
 */
export function diagnoseAwardSearch(rows, lead) {
  if (!Array.isArray(rows) || rows.some(row => !row || typeof row !== 'object' || Array.isArray(row))) {
    throw new TypeError('award-search rows must be an array of objects');
  }
  if (!lead || typeof lead.reported_amount !== 'number' || !Number.isFinite(lead.reported_amount)
      || typeof lead.reported_program !== 'string' || !lead.reported_program.trim()) {
    throw new TypeError('award-search lead needs a finite reported amount and a programme description');
  }
  const programTokens = normalize(lead.reported_program).split(' ').filter(token => token.length >= 5);
  const amountMatches = row => numericAmount(row.award_amount) === lead.reported_amount;
  const tokenMatches = row => programTokens.some(token => normalize(row.description).includes(token));
  return {
    // Legacy field names are retained as search diagnostics, never proof.
    exact_reported_amount_rows: rows.filter(amountMatches).length,
    program_token_match_rows: rows.filter(tokenMatches).length,
    same_award_amount_and_program_token_rows: rows.filter(row => amountMatches(row) && tokenMatches(row)).length,
    trade_summary_exactly_verified: false,
    trade_summary_verification_status: 'not_verified_by_award_search',
    verification_limitations: [
      'An amount match and a programme-token match may refer to different awards.',
      'A shared generic programme word is only a discovery signal.',
      'An award total or performance-period overlap does not establish fiscal-year action obligations.',
      'Recipient identity, awarding agency, signed transaction dates and complete transaction coverage need separate evidence.',
      'Rounded published amounts require an explicit precision rule; exact equality is not a verification method.',
      'These counts describe returned rows, not a proven complete search or a cross-corpus identity join.',
    ],
  };
}
