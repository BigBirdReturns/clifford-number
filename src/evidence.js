export const EVIDENCE_CLASSES = {
  official: 'Direct official sourcing: government, court, regulator, or primary institutional record (GOV.UK, US Army public affairs, SEC, IRS).',
  confirmed: 'Primary source or tier-one reporting supports the claim directly.',
  primary_public: 'Primary public material supports the claim directly, such as a public directory extract or source HTML.',
  reported: 'Credible reporting or public profile supports the claim, but not primary-source confirmed in this graph.',
  derived: 'Analytical inference from sourced structure. The receipts support the ingredients, not necessarily the frame.',
  judgment: 'Interpretive classification. Useful for navigation, not a factual assertion by itself.',
  open: 'Placeholder, disputed, incomplete, or not ready for publication.'
};

export const EDGE_STATUS = {
  published: 'The relationship appears in a public document or publication.',
  reported: 'The relationship is reported by a source and has not been independently reverified in this repo.',
  listed: 'The name appears on a list or directory. This does not prove attendance, agreement, or wrongdoing.',
  registered: 'The person or entity is reported as registered. This is distinct from attendance.',
  attended: 'The person or entity is reported as having attended.',
  appointed: 'The person was formally appointed or commissioned into a role.',
  contracted: 'The entity appears in a contract or procurement relationship.',
  'topology-membership': 'The entity is grouped under an umbrella context. This is a topology match, NOT a direct relationship claim between members.',
  derived: 'The status is analytic and must remain connected to its source notes.',
  'public-role': 'The relationship is limited to public professional role information.'
};

export const BANNED_PRIVATE_FIELDS = [
  'email',
  'phone',
  'birthdate',
  'mobile',
  'emergency',
  'dietary',
  'sex life',
  'matchmaking',
  'looking for love',
  'political leaning',
  'home city',
  'address',
  'token',
  'assistant email',
  'personal email',
  'private email',
  'whatsapp',
  'telegram',
  'medical',
  'mental health',
  'passport',
  'ssn',
  'national insurance',
  'bank account',
  'raw registrant',
  'questionnaire'
];

// Privacy guard scope (changed 2026-10-23, owner decision).
//
// Old behaviour: every word above was matched as a substring of the whole
// serialized record (assertPublicOnly) or of a surface's id, label, participation
// types and receipt ids (tools/build-graph.mjs). A label that merely DESCRIBED a
// document or named a company tripped it: "Ben Warner email to Imran Shafi and
// Dominic Cummings...", "Filing and Sorting Emails (Alpha)", "Medical IT",
// "Australian Medical Network", an "address-only link" role type, a procurement
// title containing "emergency". Eight public surfaces were held off the graph.
//
// New behaviour, scoped to the guard's original intent (keep contact details
// and private-field material out of the public record):
// 1. Contact-data PATTERNS (an email address, a phone number, a street address)
//    are matched in the values of every field, wherever they appear.
// 2. The bare WORD list above is matched only against field NAMES, that is in
//    fields that would hold participant contact or private data (an "email",
//    "personal_email", "phone" or "address" field, a "questionnaire" field),
//    never against descriptive values such as surface_label, notes or role.
// 3. A street address is contact data when it can locate a person. Callers
//    that know a record carries only an organization's published office or
//    registered address (an organization-only surface or an organization's
//    row) pass { streetAddress: false }; email and phone patterns still apply.
const EMAIL_PATTERN = /[a-z0-9._%+-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}/i;
const PHONE_PATTERNS = [
  // North American: (512) 555-0100, 512-555-0100, +1 512 555 0100
  /(?<![\w-])(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}(?![\w-])/,
  // International with a leading +: +44 20 7946 0000, +61 2 9999 9999
  /\+\d{1,3}[\s.-]?\(?\d{1,5}\)?(?:[\s.-]?\d{2,5}){2,4}(?![\w-])/,
  // UK national with spaces: 020 7946 0000, 01632 960 000
  /(?<![\w-])0\d{2,4}\s\d{3,4}\s?\d{3,4}(?![\w-])/
];
const STREET_ADDRESS_PATTERN = /\b\d{1,5}[a-z]?\s+(?:[A-Z][A-Za-z'.-]*\s+){1,4}(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Way|Court|Ct|Place|Pl|Square|Sq|Terrace|Parkway|Pkwy|Highway|Hwy|Crescent|Close|Row|Gardens|Embankment|Plaza)\b/;

// Returns 'email' | 'phone' | 'street_address' | null for one string value.
export function contactDataPatternHit(value, { streetAddress = true } = {}) {
  if (typeof value !== 'string' || !value) return null;
  if (EMAIL_PATTERN.test(value)) return 'email';
  if (PHONE_PATTERNS.some(pattern => pattern.test(value))) return 'phone';
  if (streetAddress && STREET_ADDRESS_PATTERN.test(value)) return 'street_address';
  return null;
}

// Returns the banned word a field name carries as a whole word, or null.
export function privateFieldNameHit(name) {
  const words = ` ${String(name ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()} `;
  return BANNED_PRIVATE_FIELDS.find(field => words.includes(` ${field} `)) ?? null;
}

// Walks a record: field names against the word list, string values against
// the contact-data patterns. Returns the first hit as { kind, path, match } or null.
export function privateDataHit(record, options = {}, path = '') {
  if (record == null) return null;
  if (typeof record === 'string') {
    const kind = contactDataPatternHit(record, options);
    return kind ? { kind, path } : null;
  }
  if (typeof record !== 'object') return null;
  for (const [key, value] of Object.entries(record)) {
    const childPath = Array.isArray(record) ? `${path}[${key}]` : (path ? `${path}.${key}` : key);
    if (!Array.isArray(record) && value != null && value !== '') {
      const word = privateFieldNameHit(key);
      if (word) return { kind: `field:${word}`, path: childPath };
    }
    const hit = privateDataHit(value, options, childPath);
    if (hit) return hit;
  }
  return null;
}

export function assertPublicOnly(record, options = {}) {
  const hit = privateDataHit(record, options);
  if (hit) throw new Error(`Private or sensitive field rejected: ${hit.kind} at ${hit.path}`);
  return true;
}
