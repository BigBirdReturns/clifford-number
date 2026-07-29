#!/usr/bin/env bash
set -euo pipefail

reconstruct_source() {
  mapfile -t parts < <(find .github/tmp -maxdepth 1 -name 'k0-wave07-blob-part-*.b64' -type f | sort)
  test "${#parts[@]}" -eq 45
  cat "${parts[@]}" > /tmp/k0-wave07-source.b64
  base64 -d /tmp/k0-wave07-source.b64 > /tmp/k0-wave07-source.tar.gz
  test "$(sha256sum /tmp/k0-wave07-source.tar.gz | awk '{print $1}')" = "d78f4feb967b94ed350e7c93547b4f782cfc9f9d6a1b0fd32daf095305e0c3e2"
  python - <<'PY'
import tarfile
expected = {
  '.github/workflows/k0-role-neutral-wave-07.yml',
  'data/project/k0-epistemic-admissibility-methodology.json',
  'data/research/corpus-coverage.json',
  'data/research/k0-role-neutral-denominator.json',
  'data/research/k0-role-neutral-wave-07.json',
  'data/research/selection-adversarial-reviews.json',
  'docs/milestones/m05-k0-role-neutral-wave-07.md',
  'test/k0-epistemic-admissibility.test.js',
 