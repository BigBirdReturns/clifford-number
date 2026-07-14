// Pure state helpers for the resumable source-acquisition coordinator, factored out so the
// resume and unavailable/zero-result behaviors are unit-testable without network.

// A restart must resume without re-downloading a valid, already-scanned artifact.
export function shouldResumeSkip(priorManifest) {
  return Boolean(priorManifest && priorManifest.terminal_state === 'scanned' && priorManifest.extracted_sha256);
}

// Classify an enumeration/HEAD result into a terminal-capable state. 404/403/410 are
// unavailable-after-search (recorded with the exact URL); other non-200s are transient.
export function classifyEnumeration(finalStatus) {
  if (finalStatus === 200) return 'available';
  if (finalStatus === 404 || finalStatus === 403 || finalStatus === 410) return 'unavailable_after_search';
  return 'transient_failure';
}

// A zero-result search is a preserved coverage state, never a "no record existed" finding.
export function classifySearchResult(resultCount) {
  if (!Number.isFinite(resultCount)) return 'transient_failure';
  return resultCount > 0 ? 'locators_found' : 'unavailable_after_search';
}
