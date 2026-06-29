export const EVIDENCE_CLASSES = {
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
  'verified_contact',
  'verified contact',
  'leaked number',
  'voicemail'
];

export function assertPublicOnly(record) {
  const serialized = JSON.stringify(record).toLowerCase();
  const hit = BANNED_PRIVATE_FIELDS.find((field) => serialized.includes(field));
  if (hit) throw new Error(`Private or sensitive field rejected: ${hit}`);
  return true;
}
