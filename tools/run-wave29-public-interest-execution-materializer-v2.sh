#!/usr/bin/env bash
set -euo pipefail

python3 - <<'PY'
from pathlib import Path

path = Path('tools/validate-lake-allocator-war-public-interest-execution-wave-29.mjs')
text = path.read_text()
old = """  const expectedSourcePlan = buildSourcePlan(policy, inheritedRegistry);\n  if (!same(sourcePlan, expectedSourcePlan)) fail(errors, 'Wave 29 source plan differs from deterministic build');\n"""
new = """  let expectedSourcePlan = null;\n  try {\n    expectedSourcePlan = buildSourcePlan(policy, inheritedRegistry);\n  } catch (error) {\n    fail(errors, 'Wave 29 deterministic source-plan build failed: ' + error.message);\n  }\n  if (expectedSourcePlan && !same(sourcePlan, expectedSourcePlan)) fail(errors, 'Wave 29 source plan differs from deterministic build');\n"""
if old not in text:
    raise SystemExit('Wave 29 source-plan validator patch target absent')
path.write_text(text.replace(old, new, 1))
PY

node --check tools/validate-lake-allocator-war-public-interest-execution-wave-29.mjs
rm -f tools/run-wave29-public-interest-execution-materializer-v2.sh
exec bash tools/run-wave29-public-interest-execution-materializer.sh
